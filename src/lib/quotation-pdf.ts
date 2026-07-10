import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import type { Response } from 'express';

export interface QuotationLine {
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

export interface QuotationPayload {
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
  name: 'SEA KEEPERS (Pvt) Ltd',
  address: 'OFFICE #102, GROUND FLOOR, BAHRIA COMPLEX-1, MT KHAN ROAD, KARACHI 74000',
  website: 'www.seakeepers.co',
  email: 'admin@seakeepers.co',
  phone: '+92-21 36453214',
};

/**
 * Draw a sailboat logo (Sea Keepers style) at the given position.
 * Simple vector drawing using rects and triangles — compatible with pdfkit standalone.
 */
function drawSailboatLogo(doc: InstanceType<typeof PDFDocument>, x: number, y: number, size: number) {
  const blue = '#1e40af';
  const lightBlue = '#3b82f6';

  // Hull (trapezoid using two rects)
  doc.rect(x, y + size * 0.7, size, size * 0.15).fill(blue);
  doc.rect(x + size * 0.2, y + size * 0.85, size * 0.6, size * 0.15).fill(blue);

  // Mast (vertical rect)
  doc.rect(x + size * 0.48, y, size * 0.04, size * 0.7).fill(blue);

  // Main sail (right triangle — use path with stroke + fill workaround)
  // Draw as a filled triangle using a small rect + rotation alternative
  // Simpler: draw a triangle using moveTo/lineTo
  doc.save();
  doc.moveTo(x + size * 0.5, y);
  doc.lineTo(x + size * 0.85, y + size * 0.65);
  doc.lineTo(x + size * 0.5, y + size * 0.65);
  doc.fill(blue);
  doc.restore();

  // Front sail (left triangle)
  doc.save();
  doc.moveTo(x + size * 0.5, y + size * 0.1);
  doc.lineTo(x + size * 0.5, y + size * 0.65);
  doc.lineTo(x + size * 0.15, y + size * 0.65);
  doc.fill(lightBlue);
  doc.restore();
}

/**
 * Generate the quotation PDF matching the Sea Keepers format.
 * Only includes lines that have a non-empty pricePerUnit.
 * Returns a Promise<Buffer>.
 */
export function generateQuotationPdfBuffer(payload: QuotationPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Filter: only include lines with a price ──
      const pricedLines = payload.lines.filter(
        (l) => l.pricePerUnit && parseFloat(l.pricePerUnit.replace(/[^0-9.]/g, '')) > 0
      );

      // ── HEADER ──
      // Logo (top-left)
      drawSailboatLogo(doc, 50, 45, 36);

      // Company name (centered, blue)
      doc
        .fillColor('#1e40af')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(COMPANY.name, 50, 55, { width: 495, align: 'center' });

      // Reference number (left, below logo)
      doc
        .fillColor('#000000')
        .font('Helvetica')
        .fontSize(10)
        .text(`REF No: ${payload.quoteNumber}`, 50, 95);

      // Date (right, same level as ref)
      const formattedDate = payload.quoteDate
        ? new Date(payload.quoteDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
      doc.text(formattedDate, 350, 95, { width: 195, align: 'right' });

      // ── TITLE ──
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('COMMERCIAL QUOTATION', 50, 120, { width: 495, align: 'center' });
      // Underline
      doc
        .moveTo(180, 142)
        .lineTo(415, 142)
        .strokeColor('#000000')
        .lineWidth(1)
        .stroke();

      // ── TO SECTION ──
      let y = 160;
      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('To,', 50, y);
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(payload.client.name, 50, y + 16);
      doc.text(payload.client.email, 50, y + 30);
      if (payload.client.subject) {
        doc.text(`Ref: ${payload.client.subject}`, 50, y + 44, { width: 300 });
      }

      y = y + 70;

      // ── TABLE ──
      // Column layout matching Sea Keepers format
      const cols = [
        { key: 'sr', label: 'S.N#', x: 50, w: 30, align: 'center' as const },
        { key: 'nsn', label: 'NSN', x: 80, w: 70, align: 'center' as const },
        { key: 'partNumber', label: 'PART NO', x: 150, w: 60, align: 'center' as const },
        { key: 'description', label: 'DESCRIPTION', x: 210, w: 175, align: 'left' as const },
        { key: 'quantity', label: 'QTY', x: 385, w: 35, align: 'center' as const },
        { key: 'pricePerUnit', label: 'Unit Price', x: 420, w: 60, align: 'right' as const },
        { key: 'totalPrice', label: 'Total Price', x: 480, w: 65, align: 'right' as const },
      ];

      // Table header
      doc
        .rect(50, y, 495, 20)
        .fillColor('#1e40af')
        .fill();
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9);
      for (const c of cols) {
        doc.text(c.label, c.x + 2, y + 6, { width: c.w - 4, align: c.align });
      }
      y += 20;

      // Data rows
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      if (pricedLines.length === 0) {
        // No priced items — show a placeholder row
        doc
          .rect(50, y, 495, 25)
          .fillColor('#f9fafb')
          .fill();
        doc
          .fillColor('#6b7280')
          .text('No items priced yet', 50, y + 8, { width: 495, align: 'center' });
        y += 25;
      } else {
        pricedLines.forEach((line, i) => {
          const rowHeight = 24;
          // Alternating row background
          if (i % 2 === 1) {
            doc.rect(50, y, 495, rowHeight).fillColor('#f3f4f6').fill();
            doc.fillColor('#000000');
          }
          // Sr
          doc.text(String(i + 1), cols[0].x + 2, y + 8, { width: cols[0].w - 4, align: 'center' });
          // NSN
          doc.text(line.nsn || '—', cols[1].x + 2, y + 8, { width: cols[1].w - 4, align: 'center' });
          // Part Number
          doc.text(line.partNumber || '—', cols[2].x + 2, y + 8, { width: cols[2].w - 4, align: 'center' });
          // Description
          doc.text(line.description || '—', cols[3].x + 2, y + 5, {
            width: cols[3].w - 4,
            height: rowHeight - 6,
            ellipsis: true,
          });
          // Qty
          doc.text(line.quantity || '—', cols[4].x + 2, y + 8, { width: cols[4].w - 4, align: 'center' });
          // Unit Price
          doc.text(line.pricePerUnit || '0', cols[5].x + 2, y + 8, { width: cols[5].w - 4, align: 'right' });
          // Total Price
          doc.text(line.totalPrice || '0', cols[6].x + 2, y + 8, { width: cols[6].w - 4, align: 'right' });

          y += rowHeight;

          // Add a new page if we're near the bottom
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
        });
      }

      // ── TOTALS SECTION ──
      y += 15;
      const totalsX = 350;
      const totalsW = 195;

      if (pricedLines.length > 0) {
        // Subtotal
        doc
          .rect(totalsX, y, totalsW, 18)
          .fillColor('#f9fafb')
          .strokeColor('#000000')
          .lineWidth(0.5)
          .fillAndStroke();
        doc
          .fillColor('#000000')
          .font('Helvetica')
          .fontSize(10)
          .text('Subtotal:', totalsX + 5, y + 4, { width: 100 });
        doc
          .font('Helvetica-Bold')
          .text(payload.totals.subtotal, totalsX + 105, y + 4, { width: totalsW - 110, align: 'right' });
        y += 18;

        // Total GST
        doc
          .rect(totalsX, y, totalsW, 18)
          .fillColor('#f9fafb')
          .strokeColor('#000000')
          .lineWidth(0.5)
          .fillAndStroke();
        doc
          .fillColor('#000000')
          .font('Helvetica')
          .fontSize(10)
          .text('GST (18%):', totalsX + 5, y + 4, { width: 100 });
        doc
          .font('Helvetica-Bold')
          .text(payload.totals.totalGst, totalsX + 105, y + 4, { width: totalsW - 110, align: 'right' });
        y += 18;

        // Grand Total
        doc
          .rect(totalsX, y, totalsW, 22)
          .fillColor('#1e40af')
          .fill();
        doc
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('GRAND TOTAL:', totalsX + 5, y + 6, { width: 100 });
        doc
          .fontSize(12)
          .text(payload.totals.grandTotal, totalsX + 105, y + 6, { width: totalsW - 110, align: 'right' });
        y += 30;
      }

      // ── TERMS AND CONDITIONS ──
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Terms and Condition:', 50, y);
      y += 18;

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#000000');
      const terms = [
        `Offer valid for ${payload.validity || '01 month'} only with effect from quotation date.`,
        `Item will be delivered within ${payload.delivery || '12-14 weeks'} of issuance of purchase order.`,
        `Price is exclusive of 18% GST.`,
        `Payment: ${payload.paymentTerms || '50% advance with PO, 50% before dispatch'}`,
      ];
      for (const t of terms) {
        doc.text(`•  ${t}`, 60, y, { width: 485 });
        y += 15;
      }

      // ── SIGNATURE BLOCK ──
      y += 20;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor('#000000')
        .font('Helvetica')
        .fontSize(11)
        .text('BEST REGARDS,', 50, y);
      y += 16;
      doc
        .font('Helvetica-Bold')
        .text(COMPANY.name, 50, y);
      y += 14;

      // Draw a circular seal/stamp to the right
      const sealX = 90;
      const sealY = y + 10;
      const sealR = 28;
      doc
        .circle(sealX, sealY, sealR)
        .strokeColor('#1e40af')
        .lineWidth(1.5)
        .stroke();
      // Inner circle
      doc
        .circle(sealX, sealY, sealR - 4)
        .strokeColor('#1e40af')
        .lineWidth(0.5)
        .stroke();
      // Mini sailboat in seal
      drawSailboatLogo(doc, sealX - 8, sealY - 10, 16);
      // Company name text around seal (simplified)
      doc
        .fillColor('#1e40af')
        .font('Helvetica-Bold')
        .fontSize(5)
        .text('SEA KEEPERS', sealX - 20, sealY + 8, { width: 40, align: 'center' });

      // ── FOOTER ──
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        // Footer line
        doc
          .moveTo(50, 785)
          .lineTo(545, 785)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();
        // Address
        doc
          .fillColor('#000000')
          .font('Helvetica')
          .fontSize(8)
          .text(COMPANY.address, 50, 790, { width: 495, align: 'center' });
        // Website (blue)
        doc
          .fillColor('#1e40af')
          .text(COMPANY.website, 50, 803, { width: 495, align: 'center' });
        // Email (blue)
        doc.text(COMPANY.email, 50, 813, { width: 495, align: 'center' });
        // Phone (black)
        doc
          .fillColor('#000000')
          .text(COMPANY.phone, 50, 823, { width: 495, align: 'center' });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
