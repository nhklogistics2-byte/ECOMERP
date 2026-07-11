import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1';

const COMPANY_NAME = process.env.COMPANY_NAME || 'ecomruns.com';
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'info@ecomruns.com';

interface ReplyRequest {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  category?: string;
  priority?: string;
  tone?: 'professional' | 'friendly' | 'concise' | 'formal';
  language?: string;
}

interface ReplyResult {
  ok: boolean;
  replySubject?: string;
  replyBody?: string;
  tone?: string;
  latencyMs: number;
  error?: string;
}

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = (await req.json()) as ReplyRequest;

    if (!body.body || !body.from) {
      return NextResponse.json(
        { ok: false, error: 'from and body are required' },
        { status: 400 }
      );
    }
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'OPENROUTER_API_KEY not set' },
        { status: 500 }
      );
    }

    const tone = body.tone || 'professional';
    const language = body.language || 'English';

    const systemPrompt = `You are a senior customer success assistant at ${COMPANY_NAME} (email: ${COMPANY_EMAIL}), an e-commerce services company that works with techichamps.com.

Write a reply email to the inquiry below. Requirements:
- Tone: ${tone}
- Language: ${language}
- Address the sender by name if known
- Be helpful, specific, and action-oriented
- Reference the inquiry's key points
- If pricing is requested and you don't have actual prices, acknowledge the request and commit to sending a detailed quote within 24 hours
- If the inquiry is empty or vague, politely ask for clarification
- Keep the reply concise (3-6 short paragraphs max)
- Sign off as: "Best regards,\nThe ${COMPANY_NAME} Team\n${COMPANY_EMAIL}"

Return a JSON object with this exact shape:
{
  "replySubject": "Re: <original subject>",
  "replyBody": "the full email reply body as plain text"
}

Return ONLY valid JSON, no markdown fences, no commentary.`;

    const userPrompt = `INCOMING INQUIRY
From: ${body.fromName} <${body.from}>
Subject: ${body.subject}
Category: ${body.category || 'General Inquiry'}
Priority: ${body.priority || 'medium'}

Body:
${(body.body || '').slice(0, 4000)}`;

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ecomruns.com',
        'X-Title': 'EcomRuns AI Replay',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          ok: false,
          error: `OpenRouter ${res.status}: ${text.slice(0, 300)}`,
        } as ReplyResult,
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: { replySubject?: string; replyBody?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, treat the whole thing as the reply body
      parsed = {
        replySubject: `Re: ${body.subject || ''}`,
        replyBody: cleaned,
      };
    }

    const result: ReplyResult = {
      ok: true,
      replySubject: parsed.replySubject || `Re: ${body.subject || ''}`,
      replyBody: parsed.replyBody || '',
      tone,
      latencyMs: Date.now() - start,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: (e as Error).message,
        latencyMs: Date.now() - start,
      } as ReplyResult,
      { status: 500 }
    );
  }
}
