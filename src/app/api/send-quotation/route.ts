import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface QuotationLine {
  partNumber: string;
  nsn: string;
  description: string;
  quantity: string;
  uom: string;
  serialNumber: string;
  pricePerUnit: string;
  totalPrice: string;
  gstRate: string;
  gstAmount: string;
  totalWithGst: string;
}

interface QuotationPayload {
  inquiryUid: number;
  inquiryId: string;
  client: { name: string; email: string; subject: string };
  quoteNumber: string;
  quoteDate: string;
  validity: string;
  paymentTerms: string;
  delivery: string;
  notes: string;
  lines: QuotationLine[];
  totals: { subtotal: string; totalGst: string; grandTotal: string; itemCount: number };
}

const COMPANY = {
  name: 'ECOMRUNS (PVT) LTD',
  email: process.env.IMAP_USER || 'info@ecomruns.com',
  address: 'E-Commerce Business Park, Karachi, Pakistan',
  phone: '+92 21 3456 7890',
  website: 'www.ecomruns.com',
};

// SMTP config from env (Hostinger)
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
 * Generate the quotation PDF in-memory (returns a Buffer).
 */
function generateQuotationPdfBuffer(payload: QuotationPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── HEADER ──
      doc
        .rect(40, 40, 280, 70)
        .fillColor('#0A0A0A')
        .fill();
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(COMPANY.name, 50, 60, { width: 260 });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#D4D4D4')
        .text(COMPANY.address, 50, 82, { width: 260 });
      doc.text(`${COMPANY.phone}  ·  ${COMPANY.website}`, 50, 96, { width: 260 });

      doc
        .rect(340, 40, 215, 70)
        .fillColor('#FAFAFA')
        .strokeColor('#0A0A0A')
        .lineWidth(1)
        .fillAndStroke();
      doc
        .fillColor('#0A0A0A')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('QUOTATION', 340, 50, { width: 215, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(`No: ${payload.quoteNumber}`, 350, 70, { width: 195, align: 'center' });
      doc.text(`Date: ${payload.quoteDate}`, 350, 82, { width: 195, align: 'center' });
      doc.text(`Validity: ${payload.validity}`, 350, 94, { width: 195, align: 'center' });

      let y = 130;
      doc
        .fillColor('#0A0A0A')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('QUOTATION TO:', 40, y);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#333333')
        .text(payload.client.name, 40, y + 14);
      doc.text(`Email: ${payload.client.email}`, 40, y + 26);
      if (payload.client.subject) {
        doc.text(`Ref Subject: ${payload.client.subject}`, 40, y + 38, { width: 280 });
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0A0A0A')
        .text('REFERENCE:', 340, y);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#333333')
        .text(`Inquiry UID: #${payload.inquiryUid}`, 340, y + 14);
      doc.text(`From: ${payload.client.email}`, 340, y + 26, { width: 215 });
      doc.text(`Items: ${payload.totals.itemCount}`, 340, y + 38);

      y += 60;

      const cols = [
        { key: 'sr', label: 'Sr.', x: 40, w: 25, align: 'left' as const },
        { key: 'partNumber', label: 'Part Number', x: 65, w: 80, align: 'left' as const },
        { key: 'nsn', label: 'NSN', x: 145, w: 75, align: 'left' as const },
        { key: 'description', label: 'Description', x: 220, w: 165, align: 'left' as const },
        { key: 'quantity', label: 'Qty', x: 385, w: 35, align: 'right' as const },
        { key: 'uom', label: 'UOM', x: 420, w: 35, align: 'left' as const },
        { key: 'pricePerUnit', label: 'Unit Price', x: 455, w: 60, align: 'right' as const },
        { key: 'totalPrice', label: 'Total Price', x: 515, w: 70, align: 'right' as const },
      ];

      doc
        .rect(40, y, 515, 18)
        .fillColor('#0A0A0A')
        .fill();
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(8);
      for (const c of cols) {
        doc.text(c.label, c.x + 2, y + 5, { width: c.w - 4, align: c.align });
      }
      y += 18;

      doc.font('Helvetica').fontSize(8).fillColor('#1A1A1A');
      payload.lines.forEach((line, i) => {
        const rowHeight = 22;
        if (i % 2 === 1) {
          doc.rect(40, y, 515, rowHeight).fillColor('#F5F5F5').fill();
          doc.fillColor('#1A1A1A');
        }
        doc.text(String(i + 1), cols[0].x + 2, y + 7, { width: cols[0].w - 4, align: 'left' });
        doc.text(line.partNumber || '—', cols[1].x + 2, y + 7, { width: cols[1].w - 4 });
        doc.text(line.nsn || '—', cols[2].x + 2, y + 7, { width: cols[2].w - 4 });
        doc.text(line.description || '—', cols[3].x + 2, y + 4, {
          width: cols[3].w - 4,
          height: rowHeight - 4,
          ellipsis: true,
        });
        doc.text(line.quantity || '—', cols[4].x + 2, y + 7, { width: cols[4].w - 4, align: 'right' });
        doc.text(line.uom || 'EA', cols[5].x + 2, y + 7, { width: cols[5].w - 4 });
        doc.text(line.pricePerUnit || '0.00', cols[6].x + 2, y + 7, { width: cols[6].w - 4, align: 'right' });
        doc.text(line.totalPrice || '0.00', cols[7].x + 2, y + 7, { width: cols[7].w - 4, align: 'right' });
        y += rowHeight;
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
      });

      y += 10;
      const totalsX = 380;
      const totalsW = 175;

      doc
        .rect(totalsX, y, totalsW, 16)
        .fillColor('#FAFAFA')
        .strokeColor('#E5E5E5')
        .lineWidth(0.5)
        .fillAndStroke();
      doc
        .fillColor('#0A0A0A')
        .font('Helvetica')
        .fontSize(9)
        .text('Subtotal:', totalsX + 5, y + 4, { width: 100 });
      doc
        .font('Helvetica-Bold')
        .text(payload.totals.subtotal, totalsX + 105, y + 4, { width: totalsW - 110, align: 'right' });
      y += 16;

      doc
        .rect(totalsX, y, totalsW, 16)
        .fillColor('#FAFAFA')
        .strokeColor('#E5E5E5')
        .lineWidth(0.5)
        .fillAndStroke();
      doc
        .fillColor('#0A0A0A')
        .font('Helvetica')
        .fontSize(9)
        .text('Total GST:', totalsX + 5, y + 4, { width: 100 });
      doc
        .font('Helvetica-Bold')
        .text(payload.totals.totalGst, totalsX + 105, y + 4, { width: totalsW - 110, align: 'right' });
      y += 16;

      doc
        .rect(totalsX, y, totalsW, 22)
        .fillColor('#0A0A0A')
        .fill();
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('GRAND TOTAL (USD):', totalsX + 5, y + 6, { width: 100 });
      doc
        .fontSize(12)
        .text(payload.totals.grandTotal, totalsX + 105, y + 6, { width: totalsW - 110, align: 'right' });
      y += 30;

      if (y > 700) {
        doc.addPage();
        y = 40;
      }

      doc
        .fillColor('#0A0A0A')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('TERMS & CONDITIONS', 40, y);
      y += 14;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#333333');
      const terms = [
        `Payment Terms: ${payload.paymentTerms}`,
        `Delivery: ${payload.delivery}`,
        `Validity: This quotation is valid for ${payload.validity} from the date of issue.`,
        `Notes: ${payload.notes}`,
        `Prices are quoted in USD and are ex-warehouse unless otherwise stated.`,
        `All taxes, duties, and freight charges (if applicable) are extra unless explicitly included.`,
      ];
      for (const t of terms) {
        doc.text(`•  ${t}`, 40, y, { width: 515 });
        y += 12;
      }

      y += 20;
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      doc
        .rect(40, y, 250, 60)
        .strokeColor('#0A0A0A')
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor('#0A0A0A')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('For ECOMRUNS (PVT) LTD', 50, y + 8, { width: 230 });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#666666')
        .text('Authorized Signature', 50, y + 38, { width: 230 });
      doc.text('CEO', 50, y + 48, { width: 230 });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#999999')
          .font('Helvetica')
          .fontSize(7)
          .text(
            `${COMPANY.name}  ·  ${COMPANY.email}  ·  ${COMPANY.phone}  ·  Page ${i + 1} of ${pages.count}`,
            40,
            800,
            { width: 515, align: 'center' }
          );
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
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

    // 1. Generate PDF in memory
    const pdfBuffer = await generateQuotationPdfBuffer(payload);

    // 2. Save a copy to /public/quotations for archive
    try {
      const outDir = path.join(process.cwd(), 'public', 'quotations');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `${payload.quoteNumber}.pdf`), pdfBuffer);
    } catch (e) {
      console.warn('Failed to archive PDF:', e);
    }

    // 3. Send email via SMTP
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const subject = `Quotation ${payload.quoteNumber} from EcomRuns — ${payload.client.subject || 'Your Inquiry'}`;
    const textBody = `Dear ${payload.client.name},

Thank you for your inquiry. Please find attached our quotation ${payload.quoteNumber} dated ${payload.quoteDate}.

Quotation Summary:
- Number of items: ${payload.totals.itemCount}
- Subtotal: USD ${payload.totals.subtotal}
- Total GST: USD ${payload.totals.totalGst}
- Grand Total: USD ${payload.totals.grandTotal}

Terms:
- Payment: ${payload.paymentTerms}
- Delivery: ${payload.delivery}
- Validity: ${payload.validity}

${payload.notes}

Please review the attached PDF for the complete quotation with line-item details. Should you have any questions or require clarification, please do not hesitate to contact us.

Best regards,
The EcomRuns Team
${COMPANY.email}
${COMPANY.phone}`;

    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a;">
<p>Dear ${payload.client.name},</p>
<p>Thank you for your inquiry. Please find attached our quotation <strong>${payload.quoteNumber}</strong> dated ${payload.quoteDate}.</p>
<p><strong>Quotation Summary:</strong></p>
<table style="border-collapse: collapse; margin: 8px 0;">
<tr><td style="padding: 4px 12px 4px 0;">Number of items:</td><td><strong>${payload.totals.itemCount}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0;">Subtotal:</td><td><strong>USD ${payload.totals.subtotal}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0;">Total GST:</td><td><strong>USD ${payload.totals.totalGst}</strong></td></tr>
<tr><td style="padding: 4px 12px 4px 0; border-top: 1px solid #ddd;">Grand Total:</td><td style="border-top: 1px solid #ddd;"><strong>USD ${payload.totals.grandTotal}</strong></td></tr>
</table>
<p><strong>Terms:</strong></p>
<ul>
<li><strong>Payment:</strong> ${payload.paymentTerms}</li>
<li><strong>Delivery:</strong> ${payload.delivery}</li>
<li><strong>Validity:</strong> ${payload.validity}</li>
</ul>
<p>${payload.notes}</p>
<p>Please review the attached PDF for the complete quotation with line-item details. Should you have any questions or require clarification, please do not hesitate to contact us.</p>
<p>Best regards,<br/><strong>The EcomRuns Team</strong><br/>${COMPANY.email}<br/>${COMPANY.phone}</p>
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
      downloadUrl: `/quotations/${payload.quoteNumber}.pdf`,
    });
  } catch (e) {
    console.error('Send quotation error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
