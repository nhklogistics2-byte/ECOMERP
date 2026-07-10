import { NextResponse } from 'next/server';
import { fetchAttachment } from '@/lib/imap';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1';

export interface ExtractedItem {
  partNumber: string;
  nsn: string;
  description: string;
  quantity: string;
  serialNumber: string;
  uom: string;
  notes: string;
}

interface ExtractResponse {
  ok: boolean;
  filename?: string;
  contentType?: string;
  size?: number;
  textLength?: number;
  items?: ExtractedItem[];
  rawText?: string;
  latencyMs?: number;
  error?: string;
}

const SYSTEM_PROMPT = `You are a defense/aerospace procurement data extractor for ecomruns.com.
You receive the text content of an inquiry attachment (PDF or Excel) that contains a list of items requested by a client (techichamps.com).

Your job: extract EVERY line item from the document and return them as a JSON array.

Each item MUST have these fields (use empty string "" if a field is not present for that item):
{
  "partNumber": "the manufacturer part number, e.g. 474158-0001, E2187-01, MS21025-01",
  "nsn": "NATO Stock Number if present, 13 digits e.g. 5306-01-234-5678",
  "description": "full item description / nomenclature",
  "quantity": "the requested quantity as a string e.g. '5', '10 EA', '2 LOT'",
  "serialNumber": "serial number if present, else empty string",
  "uom": "unit of measure if present e.g. EA, LOT, SET, IN, FT",
  "notes": "any additional notes for this line, else empty string"
}

Rules:
- Extract EVERY item row, even if there are 50+ rows
- Preserve exact part numbers and NSNs as written (do not reformat)
- If the document has no recognizable items, return an empty array []
- Return ONLY a JSON object: { "items": [...] }
- No markdown fences, no commentary, just valid JSON`;

/**
 * Extract text content from a PDF buffer using pdf-parse v2 API.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (e) {
    console.error('PDF parse failed:', e);
    return '';
  }
}

/**
 * Extract text content from an Excel buffer (xlsx/xls/csv).
 */
function extractExcelText(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert to CSV-like text for the AI
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
    }
    return sheets.join('\n\n');
  } catch (e) {
    console.error('Excel parse failed:', e);
    return '';
  }
}

/**
 * Call OpenRouter to extract structured items from text.
 */
async function extractItemsWithAI(text: string): Promise<ExtractedItem[]> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  // Truncate to ~12000 chars to stay within model limits
  const truncated = text.slice(0, 12000);

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ecomruns.com',
      'X-Title': 'EcomRuns Item Extractor',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: truncated },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content || '';
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { items?: ExtractedItem[] };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    console.error('Failed to parse AI response:', cleaned.slice(0, 500));
    return [];
  }
}

// In-memory cache: key = `${uid}:${filename}`, value = extraction result
// TTL: 30 minutes (attachments don't change)
interface CacheEntry {
  result: ExtractResponse;
  fetchedAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = (await req.json()) as {
      uid: number;
      filename: string;
      force?: boolean;
    };

    if (!body.uid || !body.filename) {
      return NextResponse.json(
        { ok: false, error: 'uid and filename are required' },
        { status: 400 }
      );
    }

    const cacheKey = `${body.uid}:${body.filename}`;
    const cached = cache.get(cacheKey);
    if (cached && !body.force && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.result,
        cached: true,
        latencyMs: Date.now() - start,
      });
    }

    // 1. Fetch the attachment from IMAP
    const attachment = await fetchAttachment(body.uid, body.filename);
    if (!attachment) {
      return NextResponse.json(
        {
          ok: false,
          error: `Attachment "${body.filename}" not found in uid=${body.uid}`,
        } as ExtractResponse,
        { status: 404 }
      );
    }

    // 2. Extract text based on content-type
    let text = '';
    const ct = attachment.contentType.toLowerCase();
    if (ct === 'application/pdf' || ct.endsWith('pdf')) {
      text = await extractPdfText(attachment.buffer);
    } else if (
      ct.includes('sheet') ||
      ct.includes('excel') ||
      ct.includes('csv') ||
      attachment.filename.toLowerCase().endsWith('.xlsx') ||
      attachment.filename.toLowerCase().endsWith('.xls') ||
      attachment.filename.toLowerCase().endsWith('.csv')
    ) {
      text = extractExcelText(attachment.buffer);
    } else if (ct.startsWith('text/') || ct.includes('json') || ct.includes('xml')) {
      text = attachment.buffer.toString('utf-8');
    } else {
      // Unknown type — try as text
      text = attachment.buffer.toString('utf-8');
    }

    if (!text.trim()) {
      const result: ExtractResponse = {
        ok: true,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        textLength: 0,
        items: [],
        rawText: '',
        latencyMs: Date.now() - start,
        error: 'No text could be extracted from this attachment',
      };
      cache.set(cacheKey, { result, fetchedAt: Date.now() });
      return NextResponse.json(result);
    }

    // 3. Send to OpenRouter for structured extraction
    const items = await extractItemsWithAI(text);

    const result: ExtractResponse = {
      ok: true,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      textLength: text.length,
      items,
      rawText: text.slice(0, 5000), // include first 5K chars for preview
      latencyMs: Date.now() - start,
    };

    cache.set(cacheKey, { result, fetchedAt: Date.now() });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: (e as Error).message,
        latencyMs: Date.now() - start,
      } as ExtractResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'POST to /api/extract-items with { uid, filename }',
  });
}
