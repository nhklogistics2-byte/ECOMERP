import ZAI from 'z-ai-web-dev-sdk';
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
  | ' Spam / Junk';

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
  ' Spam / Junk',
];

interface LLMCategorizationResult {
  category: InquiryCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  keyPoints: string[];
  suggestedAction: string;
  language: string;
}

/**
 * Use the LLM to categorize a single email inquiry.
 * Returns a structured object with category, priority, summary, etc.
 */
export async function categorizeEmail(
  email: EmailInquiry
): Promise<LLMCategorizationResult> {
  const zai = await ZAI.create();

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
- " Spam / Junk": marketing newsletters, promotional spam, or unrelated mass email

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

  // Retry with exponential backoff to handle 429 rate-limit responses
  const MAX_RETRIES = 4;
  let lastError: Error | null = null;
  let raw = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      });
      raw = completion.choices[0]?.message?.content || '';
      lastError = null;
      break;
    } catch (e) {
      lastError = e as Error;
      const msg = (e as Error).message || '';
      const is429 = msg.includes('429') || msg.includes('Too many requests');
      if (!is429 || attempt === MAX_RETRIES) {
        throw e;
      }
      // Exponential backoff: 2s, 4s, 8s
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`LLM 429 on attempt ${attempt}/${MAX_RETRIES}, waiting ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  if (lastError) throw lastError;
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
    if (!parsed.suggestedAction) parsed.suggestedAction = 'Review and reply as appropriate.';
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
 * Categorizes a batch of emails. Processes SEQUENTIALLY with a small delay
 * between each LLM call to avoid hitting the 429 rate-limit on the LLM API.
 */
export async function categorizeBatch(
  emails: EmailInquiry[],
  _concurrency = 1
): Promise<CategorizedInquiry[]> {
  const results: CategorizedInquiry[] = new Array(emails.length);

  for (let i = 0; i < emails.length; i++) {
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
    // Small delay between calls to avoid rate-limit (skip after the last one)
    if (i < emails.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return results;
}
