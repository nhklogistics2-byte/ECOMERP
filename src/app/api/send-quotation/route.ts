import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateQuotationPdfBuffer, type QuotationPayload } from '@/lib/quotation-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const COMPANY = {
  name: 'SEA KEEPERS (Pvt) Ltd',
  email: process.env.SMTP_USER || 'admin@seakeepers.co',
  phone: '+92-21 36453214',
};

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || process.env.IMAP_USER || 'info@ecomruns.com',
    pass: process.env.SMTP_PASS || process.env.IMAP_PASSWORD || '',
  },
};

/**
 * Get a writable directory for storing generated PDFs.
 * On Vercel serverless, use /tmp (only writable directory).
 */
function getQuotationDir(): string {
  const isVercel = process.env.VERCEL || process.cwd().startsWith('/var/task') || !fs.existsSync(path.join(process.cwd(), 'public'));

  if (isVercel) {
    const tmpDir = path.join(os.tmpdir(), 'quotations');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }

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

    if (!SMTP_CONFIG.auth.pass) {
      return NextResponse.json(
        { ok: false, error: 'SMTP password not configured (set SMTP_PASS in .env)' },
        { status: 500 }
      );
    }

    // 1. Generate PDF in memory (only includes lines with a price)
    const pdfBuffer = await generateQuotationPdfBuffer(payload);

    // 2. Archive a copy to writable directory (uses /tmp on Vercel)
    try {
      const outDir = getQuotationDir();
      fs.writeFileSync(path.join(outDir, `${payload.quoteNumber}.pdf`), pdfBuffer);
    } catch (e) {
      console.warn('Failed to archive PDF:', e);
    }

    // 3. Send email via SMTP
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const subject = `Quotation ${payload.quoteNumber} from Sea Keepers — ${payload.client.subject || 'Your Inquiry'}`;
    const textBody = `Dear ${payload.client.name},

Thank you for your inquiry. Please find attached our Commercial Quotation ${payload.quoteNumber} dated ${payload.quoteDate}.

Quotation Summary:
- Number of items: ${payload.totals.itemCount}
- Subtotal: ${payload.totals.subtotal}
- Total GST: ${payload.totals.totalGst}
- Grand Total: ${payload.totals.grandTotal}

Terms:
- Payment: ${payload.paymentTerms}
- Delivery: ${payload.delivery}
- Validity: ${payload.validity}

${payload.notes}

Please review the attached PDF for the complete quotation with line-item details. Should you have any questions or require clarification, please do not hesitate to contact us.

BEST REGARDS,
${COMPANY.name}
${COMPANY.email}
${COMPANY.phone}`;

    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a;">
<p>Dear ${payload.client.name},</p>
<p>Thank you for your inquiry. Please find attached our Commercial Quotation <strong>${payload.quoteNumber}</strong> dated ${payload.quoteDate}.</p>
<p><strong>Quotation Summary:</strong></p>
<table style="border-collapse: collapse; margin: 8px 0;">
<tr><td style="padding: 4px 12px 4px 0;">Number of items:</td><td><strong>${payload.totals.itemCount}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0;">Subtotal:</td><td><strong>${payload.totals.subtotal}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0;">Total GST:</td><td><strong>${payload.totals.totalGst}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0; border-top: 1px solid #ddd;">Grand Total:</td><td style="border-top: 1px solid #ddd;"><strong>${payload.totals.grandTotal}</strong></td></tr>
</table>
<p><strong>Terms:</strong></p>
<ul>
<li><strong>Payment:</strong> ${payload.paymentTerms}</li>
<li><strong>Delivery:</strong> ${payload.delivery}</li>
<li><strong>Validity:</strong> ${payload.validity}</li>
</ul>
<p>${payload.notes}</p>
<p>Please review the attached PDF for the complete quotation with line-item details. Should you have any questions or require clarification, please do not hesitate to contact us.</p>
<p>BEST REGARDS,<br/><strong>${COMPANY.name}</strong><br/>${COMPANY.email}<br/>${COMPANY.phone}</p>
</div>`;

    const info = await transporter.sendMail({
      from: `"${COMPANY.name}" <${COMPANY.email}>`,
      to: payload.client.email,
      cc: COMPANY.email,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: [
        {
          filename: `${payload.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      quoteNumber: payload.quoteNumber,
      sentTo: payload.client.email,
      downloadUrl: `/api/generate-quotation?download=${encodeURIComponent(payload.quoteNumber)}`,
    });
  } catch (e) {
    console.error('Send quotation error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
