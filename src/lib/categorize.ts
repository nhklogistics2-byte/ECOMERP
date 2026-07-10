import type { EmailInquiry } from './imap';

export interface CategorizedInquiry extends EmailInquiry {
  category: InquiryCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  keyPoints: string[];
  suggestedAction: string;
  language: string;
}

export type InquiryCategory =
  | 'Sales'
  | 'Pricing'
  | 'Partnership'
  | 'Technical Support'
  | 'Onboarding'
  | 'Project Update'
  | 'Bug Report'
  | 'Billing'
  | 'Meeting Request'
  | 'General Inquiry'
  | 'Spam / Junk';

const VALID_CATEGORIES: InquiryCategory[] = [
  'Sales',
  'Pricing',
  'Partnership',
  'Technical Support',
  'Onboarding',
  'Project Update',
  'Bug Report',
  'Billing',
  'Meeting Request',
  'General Inquiry',
  'Spam / Junk',
];

interface LLMCategorizationResult {
  category: InquiryCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  keyPoints: string[];
  suggestedAction: string;
  language: string;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

/**
 * Calls the OpenRouter Chat Completions API (OpenAI-compatible).
 * Returns the raw text content from the model.
 */
async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env to enable AI categorization.'
    );
  }

  const url = `${OPENROUTER_BASE_URL}/chat/completions`;

  // Retry with exponential backoff for 429 / 5xx responses
  const MAX_RETRIES = 4;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          // Optional headers OpenRouter uses for ranking/attributing
          'HTTP-Referer': 'https://ecomruns.com',
          'X-Title': 'EcomRuns Inquiry Dashboard',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 700,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        const msg = `OpenRouter ${res.status}: ${body.slice(0, 300)}`;
        if (
          (res.status === 429 || res.status >= 500) &&
          attempt < MAX_RETRIES
        ) {
          console.warn(
            `OpenRouter attempt ${attempt}/${MAX_RETRIES} failed (${res.status}), retrying…`
          );
          lastError = new Error(msg);
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';
      return content;
    } catch (e) {
      lastError = e as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error('OpenRouter call failed');
}

/**
 * Use OpenRouter LLM to categorize a single email inquiry.
 * Returns a structured object with category, priority, summary, etc.
 */
export async function categorizeEmail(
  email: EmailInquiry
): Promise<LLMCategorizationResult> {
  const emailContent = (email.text || '').slice(0, 4000);
  const subject = email.subject || '(no subject)';
  const senderName = email.fromName || email.from;

  const systemPrompt = `You are an email classification assistant for ecomruns.com (an e-commerce services company that works with techichamps.com).
Your job is to analyze an inquiry email and return a JSON object with the following fields:
{
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "priority": "low" | "medium" | "high" | "urgent",
  "summary": "a 1-2 sentence summary of what the sender wants",
  "keyPoints": ["bullet point 1", "bullet point 2", ...] (max 5 short points),
  "suggestedAction": "one short sentence describing the recommended next step for the ecomruns.com team",
  "language": "the detected language of the email (e.g. English, Spanish, French, etc.)"
}

Classification guidelines:
- "Sales": asking about services, products, plans, or wanting to buy something
- "Pricing": specifically asking about prices, quotes, costs, or invoices
- "Partnership": proposing collaboration, partnership, or affiliate arrangements
- "Technical Support": requesting help with an existing service, integration, or technical issue
- "Onboarding": about getting started, kickoff, account setup, or onboarding process
- "Project Update": requesting or providing status updates on an ongoing project
- "Bug Report": reporting an issue, error, or unexpected behavior
- "Billing": questions about payments, invoices, refunds, or subscription status
- "Meeting Request": asking to schedule a call or meeting
- "General Inquiry": anything else that does not fit the above
- "Spam / Junk": marketing newsletters, promotional spam, or unrelated mass email

Priority guidelines:
- "urgent": time-sensitive, blocking, or escalated
- "high": important business inquiry needing a reply within 24h
- "medium": normal inquiry
- "low": FYI, newsletters, low-urgency items

Return ONLY a valid JSON object, no extra commentary, no markdown fences.`;

  const userPrompt = `From: ${senderName} <${email.from}>
To: ${email.to}
Date: ${email.date}
Subject: ${subject}

Body:
${emailContent}`;

  const raw = await callOpenRouter(systemPrompt, userPrompt);

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as LLMCategorizationResult;

    // Validate category
    if (!VALID_CATEGORIES.includes(parsed.category)) {
      parsed.category = 'General Inquiry';
    }
    if (!['low', 'medium', 'high', 'urgent'].includes(parsed.priority)) {
      parsed.priority = 'medium';
    }
    if (!Array.isArray(parsed.keyPoints)) {
      parsed.keyPoints = [];
    }
    if (!parsed.summary) parsed.summary = '(no summary)';
    if (!parsed.suggestedAction)
      parsed.suggestedAction = 'Review and reply as appropriate.';
    if (!parsed.language) parsed.language = 'English';

    return parsed;
  } catch (err) {
    console.error('Failed to parse LLM categorization:', err, '\nRaw:', cleaned);
    return {
      category: 'General Inquiry',
      priority: 'medium',
      summary: 'Unable to auto-summarize this email.',
      keyPoints: [],
      suggestedAction: 'Manually review and reply.',
      language: 'Unknown',
    };
  }
}

/**
 * Categorizes a batch of emails with limited concurrency (3 parallel)
 * for fast turnaround while respecting OpenRouter rate limits.
 */
export async function categorizeBatch(
  emails: EmailInquiry[],
  concurrency = 3
): Promise<CategorizedInquiry[]> {
  const results: CategorizedInquiry[] = new Array(emails.length);
  let index = 0;

  async function worker() {
    while (index < emails.length) {
      const i = index++;
      const email = emails[i];
      try {
        const cat = await categorizeEmail(email);
        results[i] = { ...email, ...cat };
      } catch (err) {
        console.error(`Failed to categorize email uid=${email.uid}:`, err);
        results[i] = {
          ...email,
          category: 'General Inquiry',
          priority: 'medium',
          summary: '(categorization failed — LLM rate-limited or errored)',
          keyPoints: [],
          suggestedAction: 'Manually review.',
          language: 'Unknown',
        };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, emails.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
