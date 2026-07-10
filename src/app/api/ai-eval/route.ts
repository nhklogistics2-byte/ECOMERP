import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

interface EvalRequest {
  subject?: string;
  body?: string;
  models: string[];
}

interface EvalResult {
  model: string;
  ok: boolean;
  category?: string;
  priority?: string;
  summary?: string;
  suggestedAction?: string;
  keyPoints?: string[];
  language?: string;
  latencyMs: number;
  error?: string;
}

const SYSTEM_PROMPT = `You are an email classification assistant for ecomruns.com (an e-commerce services company that works with techichamps.com).
Analyze the inquiry email and return a JSON object with these fields:
{
  "category": one of ["Sales","Pricing","Partnership","Technical Support","Onboarding","Project Update","Bug Report","Billing","Meeting Request","General Inquiry","Spam / Junk"],
  "priority": "low" | "medium" | "high" | "urgent",
  "summary": "1-2 sentence summary",
  "keyPoints": ["short bullet", ...],
  "suggestedAction": "one short sentence",
  "language": "detected language"
}
Return ONLY valid JSON, no markdown fences, no commentary.`;

async function evaluateOne(
  model: string,
  subject: string,
  body: string
): Promise<EvalResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ecomruns.com',
        'X-Title': 'EcomRuns AI Eval',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Subject: ${subject}\n\nBody:\n${body.slice(0, 4000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        model,
        ok: false,
        latencyMs: Date.now() - start,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        model,
        ok: false,
        latencyMs: Date.now() - start,
        error: `Non-JSON response: ${cleaned.slice(0, 200)}`,
      };
    }

    return {
      model,
      ok: true,
      category: String(parsed.category || 'General Inquiry'),
      priority: String(parsed.priority || 'medium'),
      summary: String(parsed.summary || ''),
      suggestedAction: String(parsed.suggestedAction || ''),
      keyPoints: Array.isArray(parsed.keyPoints) ? (parsed.keyPoints as string[]) : [],
      language: String(parsed.language || 'English'),
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      model,
      ok: false,
      latencyMs: Date.now() - start,
      error: (e as Error).message,
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvalRequest;
    if (!body.models || !Array.isArray(body.models) || body.models.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'At least one model is required' },
        { status: 400 }
      );
    }
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'OPENROUTER_API_KEY not set' },
        { status: 500 }
      );
    }

    const subject = body.subject || '(no subject)';
    const emailBody = body.body || '';

    // Run all models in parallel
    const results = await Promise.all(
      body.models.map((m) => evaluateOne(m, subject, emailBody))
    );

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
