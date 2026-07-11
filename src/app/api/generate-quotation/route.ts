import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateQuotationPdfBuffer, type QuotationPayload } from '@/lib/quotation-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Get a writable directory for storing generated PDFs.
 * On Vercel serverless, use /tmp (the only writable directory).
 * In local dev, use public/quotations.
 */
function getQuotationDir(): string {
  // On Vercel, use /tmp (read-only filesystem elsewhere)
  if (process.env.VERCEL || process.cwd().startsWith('/var/task')) {
    const tmpDir = path.join(os.tmpdir(), 'quotations');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }

  // Local dev — use public/quotations
  const publicDir = path.join(process.cwd(), 'public', 'quotations');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  return publicDir;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as QuotationPayload;

    if (!payload.lines || payload.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No line items provided' },
        { status: 400 }
      );
    }

    // Generate PDF (only includes lines with a price)
    const pdfBuffer = await generateQuotationPdfBuffer(payload);

    // Save to writable directory
    const dir = getQuotationDir();
    const filename = `${payload.quoteNumber}.pdf`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    // Always use the API endpoint to serve the PDF (works on both local + Vercel)
    const downloadUrl = `/api/generate-quotation?download=${encodeURIComponent(payload.quoteNumber)}`;

    return NextResponse.json({
      ok: true,
      quoteNumber: payload.quoteNumber,
      filename,
      downloadUrl,
      path: filepath,
    });
  } catch (e) {
    console.error('Quotation generation error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET handler — serves the PDF file from either /tmp or public/quotations.
 * Route: /api/generate-quotation?download=<quoteNumber>
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quoteNumber = url.searchParams.get('download');

    if (!quoteNumber) {
      return NextResponse.json(
        { ok: false, error: 'download query param required' },
        { status: 400 }
      );
    }

    // Check both possible locations
    const tmpPath = path.join(os.tmpdir(), 'quotations', `${quoteNumber}.pdf`);
    const publicPath = path.join(process.cwd(), 'public', 'quotations', `${quoteNumber}.pdf`);

    let filepath: string | null = null;
    if (fs.existsSync(tmpPath)) filepath = tmpPath;
    else if (fs.existsSync(publicPath)) filepath = publicPath;

    if (!filepath) {
      return NextResponse.json(
        { ok: false, error: `PDF "${quoteNumber}.pdf" not found` },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filepath);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      `inline; filename="${quoteNumber}.pdf"`
    );
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Content-Length', String(buffer.length));

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch (e) {
    console.error('PDF download error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
