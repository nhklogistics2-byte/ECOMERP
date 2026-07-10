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
 * Fetches the latest N emails and returns only those whose sender domain
 * matches the configured INQUIRY_DOMAIN (default: techichamps.com).
 *
 * @param limit - Maximum number of recent emails to scan (default 200)
 * @param mailbox - Mailbox to read from (default INBOX)
 */
export async function fetchInquiryEmails(
  limit: number = 200,
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

      const startSeq = Math.max(1, total - limit + 1);
      const range = `${startSeq}:*`;

      const messages: EmailInquiry[] = [];

      for await (const msg of client.fetch(range, {
        envelope: true,
        source: true,
        internalDate: true,
        uid: true,
        flags: true,
      })) {
        try {
          const parsed = await simpleParser(msg.source);

          const fromAddr =
            parsed.from?.value?.[0]?.address?.toLowerCase() || '';
          const fromName = parsed.from?.value?.[0]?.name || fromAddr;
          const fromDomain = extractDomain(fromAddr);

          // Filter: only inquiries from the configured partner domain
          if (!fromDomain || fromDomain !== INQUIRY_DOMAIN) continue;

          const attachments = (parsed.attachments || []).map((a) => ({
            filename: a.filename || 'unnamed',
            contentType: a.contentType || 'application/octet-stream',
            size: a.size || 0,
          }));

          messages.push({
            id: parsed.messageId || `uid-${msg.uid}`,
            uid: msg.uid as number,
            from: fromAddr,
            fromName,
            fromDomain,
            to:
              parsed.to?.value
                ?.map((t: { address?: string }) => t.address)
                .filter(Boolean)
                .join(', ') || '',
            subject: parsed.subject || '(no subject)',
            text: parsed.text || '',
            html: parsed.html || null,
            date: parsed.date?.toISOString() || new Date().toISOString(),
            receivedAt:
              (msg.internalDate as Date)?.toISOString() ||
              parsed.date?.toISOString() ||
              new Date().toISOString(),
            hasAttachments: attachments.length > 0,
            attachments,
            messageId: parsed.messageId || '',
            inReplyTo: parsed.inReplyTo || null,
            references: parsed.references || null,
          });
        } catch (err) {
          console.error('Failed to parse a message:', err);
          continue;
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
