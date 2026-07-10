import { NextResponse } from 'next/server';
import { fetchAttachment } from '@/lib/imap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/attachment?uid=123&filename=quote.pdf
 *
 * Streams the binary content of a specific attachment from an email.
 * Used by the inquiry detail drawer to make attachments clickable/openable.
 *
 * Query params:
 *   - uid: number (required) — IMAP UID of the message
 *   - filename: string (required) — attachment filename to fetch
 *   - download: '1' to force download, otherwise inline (for viewable types)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uidRaw = url.searchParams.get('uid');
    const filename = url.searchParams.get('filename');
    const download = url.searchParams.get('download') === '1';

    if (!uidRaw || !filename) {
      return NextResponse.json(
        { ok: false, error: 'uid and filename query params are required' },
        { status: 400 }
      );
    }

    const uid = Number(uidRaw);
    if (!Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json(
        { ok: false, error: 'uid must be a positive number' },
        { status: 400 }
      );
    }

    const result = await fetchAttachment(uid, filename);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: `Attachment "${filename}" not found in message uid=${uid}`,
        },
        { status: 404 }
      );
    }

    // Always use 'inline' so attachments open in the browser tab instead of
    // auto-downloading (which can disrupt the preview environment).
    // Users can right-click → Save As if they want to download.
    const disposition = 'inline';
    const safeFilename = encodeURIComponent(result.filename).replace(/'/g, '%27');

    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Content-Length', String(result.size));
    headers.set(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${safeFilename}; filename="${safeFilename}"`
    );
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('X-Content-Type-Options', 'nosniff');

    // Convert Buffer to Uint8Array for NextResponse
    const uint8 = new Uint8Array(result.buffer);

    return new NextResponse(uint8, { status: 200, headers });
  } catch (e) {
    console.error('Attachment fetch error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
