import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface EmailInquiry {
  id: string;
  uid: number;
  from: string;
  fromName: string;
  fromDomain: string;
  to: string;
  subject: string;
  text: string;
  html: string | null;
  date: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachments: Array<{ filename: string; contentType: string; size: number }>;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
}

const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'imap.hostinger.com',
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: {
    user: process.env.IMAP_USER || 'info@ecomruns.com',
    pass: process.env.IMAP_PASSWORD || '',
  },
  logger: false,
  // Timeouts — keep tight for fast failure
  emitLogs: false,
};

const INQUIRY_DOMAIN = (process.env.INQUIRY_DOMAIN || 'techichamps.com').toLowerCase();

/**
 * Extracts the domain part from an email address.
 */
function extractDomain(email: string): string {
  const match = email.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Lists all mailboxes/folders available in the account.
 */
export async function listMailboxes(): Promise<string[]> {
  const client = new ImapFlow(IMAP_CONFIG);
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailboxes = await client.list();
      return mailboxes.map((m) => m.path);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * FAST PATH: Fetch only envelopes first (no source), filter by sender domain,
 * then fetch full source ONLY for the matching messages.
 *
 * @param limit - Maximum number of recent emails to scan (default 100 for speed)
 * @param mailbox - Mailbox to read from (default INBOX)
 */
export async function fetchInquiryEmails(
  limit: number = 100,
  mailbox: string = 'INBOX'
): Promise<EmailInquiry[]> {
  const client = new ImapFlow(IMAP_CONFIG);
  await client.connect();

  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const status = await client.status(mailbox, { messages: true });
      const total = status.messages || 0;
      if (total === 0) return [];

      // Scan only the most recent `limit` messages
      const startSeq = Math.max(1, total - limit + 1);
      const range = `${startSeq}:*`;

      // ── PASS 1: fetch envelopes only (fast, no source) ──
      const matchingUids: number[] = [];
      const envelopeCache = new Map<number, {
        from: string;
        fromName: string;
        subject: string;
        date: string;
        to: string;
        messageId: string;
        inReplyTo: string | null;
        references: string | null;
        internalDate: Date;
      }>();

      for await (const msg of client.fetch(range, {
        envelope: true,
        uid: true,
        internalDate: true,
      })) {
        const env = msg.envelope as {
          from?: Array<{ address?: string; name?: string }>;
          to?: Array<{ address?: string }>;
          subject?: string;
          date?: Date;
          messageId?: string;
          inReplyTo?: string | null;
          references?: string | null;
        } | undefined;

        const fromAddr = env?.from?.[0]?.address?.toLowerCase() || '';
        const fromDomain = extractDomain(fromAddr);

        if (!fromDomain || fromDomain !== INQUIRY_DOMAIN) continue;

        const uid = msg.uid as number;
        matchingUids.push(uid);
        envelopeCache.set(uid, {
          from: fromAddr,
          fromName: env?.from?.[0]?.name || fromAddr,
          subject: env?.subject || '(no subject)',
          date: env?.date?.toISOString() || new Date().toISOString(),
          to: env?.to?.map((t) => t.address).filter(Boolean).join(', ') || '',
          messageId: env?.messageId || '',
          inReplyTo: env?.inReplyTo || null,
          references: env?.references || null,
          internalDate: (msg.internalDate as Date) || new Date(),
        });
      }

      if (matchingUids.length === 0) return [];

      // ── PASS 2: fetch full source ONLY for matching uids ──
      const messages: EmailInquiry[] = [];
      const uidRange = matchingUids.join(',');

      for await (const msg of client.fetch(`${uidRange}`, {
        source: true,
        uid: true,
      }, { uid: true })) {
        const uid = msg.uid as number;
        const meta = envelopeCache.get(uid);
        if (!meta) continue;

        try {
          const parsed = await simpleParser(msg.source);

          const attachments = (parsed.attachments || []).map((a) => ({
            filename: a.filename || 'unnamed',
            contentType: a.contentType || 'application/octet-stream',
            size: a.size || 0,
          }));

          messages.push({
            id: parsed.messageId || `uid-${uid}`,
            uid,
            from: meta.from,
            fromName: meta.fromName,
            fromDomain: INQUIRY_DOMAIN,
            to: meta.to,
            subject: meta.subject,
            text: parsed.text || '',
            html: parsed.html || null,
            date: meta.date,
            receivedAt: meta.internalDate.toISOString(),
            hasAttachments: attachments.length > 0,
            attachments,
            messageId: meta.messageId,
            inReplyTo: meta.inReplyTo,
            references: meta.references,
          });
        } catch (err) {
          console.error(`Failed to parse uid=${uid}:`, err);
          // Still include with empty body so it shows up
          messages.push({
            id: meta.messageId || `uid-${uid}`,
            uid,
            from: meta.from,
            fromName: meta.fromName,
            fromDomain: INQUIRY_DOMAIN,
            to: meta.to,
            subject: meta.subject,
            text: '',
            html: null,
            date: meta.date,
            receivedAt: meta.internalDate.toISOString(),
            hasAttachments: false,
            attachments: [],
            messageId: meta.messageId,
            inReplyTo: meta.inReplyTo,
            references: meta.references,
          });
        }
      }

      // Sort newest first
      messages.sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Tests IMAP connectivity. Returns status object.
 */
export async function testImapConnection(): Promise<{
  ok: boolean;
  message: string;
  mailboxCount?: number;
}> {
  try {
    const client = new ImapFlow(IMAP_CONFIG);
    await client.connect();
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const status = await client.status('INBOX', { messages: true });
        return {
          ok: true,
          message: `Connected to ${IMAP_CONFIG.host}. INBOX has ${status.messages} messages.`,
          mailboxCount: status.messages,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  } catch (e) {
    const err = e as Error;
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}
