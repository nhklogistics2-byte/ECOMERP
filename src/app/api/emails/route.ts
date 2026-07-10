import { NextResponse } from 'next/server';
import { fetchInquiryEmails, testImapConnection, type EmailInquiry } from '@/lib/imap';
import { categorizeBatch, type CategorizedInquiry } from '@/lib/categorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// In-memory cache to avoid re-fetching + re-categorizing on every page reload.
// TTL: 2 minutes. Refresh button forces a fresh fetch.
type CacheEntry = {
  data: CategorizedInquiry[];
  fetchedAt: number;
  rawCount: number;
};
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const limit = Number(url.searchParams.get('limit') || 200);
  const nocategorize = url.searchParams.get('nocategorize') === '1';
  const testonly = url.searchParams.get('test') === '1';

  if (testonly) {
    const result = await testImapConnection();
    return NextResponse.json(result);
  }

  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ok: true,
      cached: true,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      rawCount: cache.rawCount,
      count: cache.data.length,
      emails: cache.data,
    });
  }

  try {
    const raw: EmailInquiry[] = await fetchInquiryEmails(limit);

    if (nocategorize) {
      return NextResponse.json({
        ok: true,
        cached: false,
        fetchedAt: new Date().toISOString(),
        rawCount: raw.length,
        count: raw.length,
        emails: raw,
      });
    }

    const categorized = await categorizeBatch(raw, 4);

    cache = {
      data: categorized,
      fetchedAt: now,
      rawCount: raw.length,
    };

    return NextResponse.json({
      ok: true,
      cached: false,
      fetchedAt: new Date(now).toISOString(),
      rawCount: raw.length,
      count: categorized.length,
      emails: categorized,
    });
  } catch (e) {
    const err = e as Error;
    console.error('Email fetch/categorize error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
