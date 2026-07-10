import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  email: 'info@ecomruns.com',
  address: 'E-Commerce Business Park, Karachi, Pakistan',
  phone: '+92 21 3456 7890',
  website: 'www.ecomruns.com',
};

/**
 * Generate a quotation PDF matching the format of typical defense procurement quotations.
 * Saves to /public/quotations/<quoteNumber>.pdf and returns the download URL.
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as QuotationPayload;

    if (!payload.lines || payload.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No line items provided' },
        { status: 400 }
      );
    }

    // Ensure the output directory exists
    const outDir = path.join(process.cwd(), 'public', 'quotations');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filename = `${payload.quoteNumber}.pdf`;
    const filepath = path.join(outDir, filename);
    const stream = fs.createWriteStream(filepath);

    // A4 page: 595 x 842 points
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
    });
    doc.pipe(stream);

    // ── HEADER ──
    // Company logo box (left)
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

    // Quotation title box (right)
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

    // ── CLIENT INFO ──
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

    // Inquiry reference (right side)
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

    y = y + 60;

    // ── LINE ITEMS TABLE ──
    // Column layout
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

    // Header row
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

    // Data rows
    doc.font('Helvetica').fontSize(8).fillColor('#1A1A1A');
    payload.lines.forEach((line, i) => {
      const rowHeight = 22;
      // Alternating row background
      if (i % 2 === 1) {
        doc.rect(40, y, 515, rowHeight).fillColor('#F5F5F5').fill();
        doc.fillColor('#1A1A1A');
      }
      // Sr
      doc.text(String(i + 1), cols[0].x + 2, y + 7, { width: cols[0].w - 4, align: 'left' });
      // Part Number
      doc.text(line.partNumber || '—', cols[1].x + 2, y + 7, { width: cols[1].w - 4 });
      // NSN
      doc.text(line.nsn || '—', cols[2].x + 2, y + 7, { width: cols[2].w - 4 });
      // Description (truncated to 2 lines)
      const descText = line.description || '—';
      doc.text(descText, cols[3].x + 2, y + 4, {
        width: cols[3].w - 4,
        height: rowHeight - 4,
        ellipsis: true,
      });
      // Qty
      doc.text(line.quantity || '—', cols[4].x + 2, y + 7, { width: cols[4].w - 4, align: 'right' });
      // UOM
      doc.text(line.uom || 'EA', cols[5].x + 2, y + 7, { width: cols[5].w - 4 });
      // Price per unit
      doc.text(line.pricePerUnit || '0.00', cols[6].x + 2, y + 7, { width: cols[6].w - 4, align: 'right' });
      // Total price
      doc.text(line.totalPrice || '0.00', cols[7].x + 2, y + 7, { width: cols[7].w - 4, align: 'right' });

      y += rowHeight;

      // Add a new page if we're near the bottom
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
    });

    // ── TOTALS SECTION ──
    y += 10;
    const totalsX = 380;
    const totalsW = 175;

    // Subtotal
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

    // Total GST
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

    // Grand Total
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

    // ── TERMS SECTION ──
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

    // ── SIGNATURE ──
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
    doc
      .text('CEO', 50, y + 48, { width: 230 });

    // ── FOOTER on every page ──
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

    // Wait for the stream to finish
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return NextResponse.json({
      ok: true,
      quoteNumber: payload.quoteNumber,
      filename,
      downloadUrl: `/quotations/${filename}`,
      path: filepath,
    });
  } catch (e) {
    console.error('Quotation generation error:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
