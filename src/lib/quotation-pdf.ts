import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

export interface PdfImages {
  logo: Buffer | null;
  stamp: Buffer | null;
}

const COMPANY = {
  name: 'SEA KEEPERS (Pvt) Ltd',
  address: 'OFFICE #102, GROUND FLOOR, BAHRIA COMPLEX-1, MT KHAN ROAD, KARACHI 74000',
  website: 'www.seakeepers.co',
  email: 'admin@seakeepers.co',
  phone: '+92-21 36453214',
};

const DARK_BLUE = '#1e3a8a';
const BLACK = '#000000';

// Page dimensions (A4 portrait)
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;

/**
 * Load the logo image as a base64 data URL.
 * Using data URL bypasses pdfkit's broken fs.readFileSync in standalone build.
 */
function getLogoDataUrl(): string | null {
  const paths = [
    join(process.cwd(), 'public', 'assets', 'sea-keepers-logo.jpg'),
    join(process.cwd(), 'public', 'assets', 'sea-keepers-logo.png'),
    join(process.cwd(), 'assets', 'sea-keepers-logo.jpg'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      const buf = readFileSync(p);
      const ext = p.endsWith('.png') ? 'png' : 'jpeg';
      return `data:image/${ext};base64,${buf.toString('base64')}`;
    }
  }
  return null;
}

/**
 * Load the stamp image as a base64 data URL.
 */
function getStampDataUrl(): string | null {
  const paths = [
    join(process.cwd(), 'public', 'assets', 'sea-keepers-stamp.jpg'),
    join(process.cwd(), 'public', 'assets', 'sea-keepers-stamp.png'),
    join(process.cwd(), 'assets', 'sea-keepers-stamp.jpg'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      const buf = readFileSync(p);
      const ext = p.endsWith('.png') ? 'png' : 'jpeg';
      return `data:image/${ext};base64,${buf.toString('base64')}`;
    }
  }
  return null;
}

/**
 * Generate the quotation PDF matching the Sea Keepers format.
 * Uses actual logo and stamp images extracted from the original PDF.
 * Only includes lines that have a non-empty pricePerUnit.
 */
export function generateQuotationPdfBuffer(payload: QuotationPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: false,
      });
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Filter: only include lines with a price ──
      const pricedLines = payload.lines.filter(
        (l) => l.pricePerUnit && parseFloat(l.pricePerUnit.replace(/[^0-9.]/g, '')) > 0
      );

      // Load image assets as data URLs (bypasses pdfkit's broken fs in standalone)
      const logoDataUrl = getLogoDataUrl();
      const stampDataUrl = getStampDataUrl();

      // ═══════════════════════════════════════════════
      // HEADER
      // ═══════════════════════════════════════════════

      // Logo at top-left (x=50, y=35, width=50px)
      if (logoDataUrl) {
        doc.image(logoDataUrl, 50, 35, { width: 50 });
      }

      // Company name (centered, dark blue)
      doc
        .fillColor(DARK_BLUE)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(COMPANY.name, 50, 50, { width: PAGE_WIDTH - 100, align: 'center' });

      // Ref number (left)
      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(10)
        .text(`REF No: ${payload.quoteNumber}`, 50, 100);

      // Date (right)
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
      doc.text(formattedDate, 300, 100, { width: 245, align: 'right' });

      // ═══════════════════════════════════════════════
      // TITLE
      // ═══════════════════════════════════════════════
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('COMMERCIAL QUOTATION', 50, 125, { width: PAGE_WIDTH - 100, align: 'center' });
      // Underline
      doc
        .moveTo(175, 147)
        .lineTo(420, 147)
        .strokeColor(BLACK)
        .lineWidth(1)
        .stroke();

      // ═══════════════════════════════════════════════
      // TO SECTION
      // ═══════════════════════════════════════════════
      let y = 165;
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('To,', 50, y);
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(payload.client.name, 50, y + 15);
      doc.text(payload.client.email, 50, y + 29);
      if (payload.client.subject) {
        doc.text(`Ref: ${payload.client.subject}`, 50, y + 43, { width: 300 });
      }

      y = y + 65;

      // ═══════════════════════════════════════════════
      // TABLE
      // ═══════════════════════════════════════════════
      // Fixed column widths matching the original
      const cols = [
        { label: 'S.N#', x: 50, w: 30, align: 'center' as const },
        { label: 'NSN', x: 80, w: 70, align: 'center' as const },
        { label: 'PART NO', x: 150, w: 60, align: 'center' as const },
        { label: 'DESCRIPTION', x: 210, w: 175, align: 'left' as const },
        { label: 'QTY', x: 385, w: 35, align: 'center' as const },
        { label: 'Unit Price', x: 420, w: 60, align: 'right' as const },
        { label: 'Total Price', x: 480, w: 65, align: 'right' as const },
      ];

      const tableLeft = 50;
      const tableWidth = 495;
      const tableTop = y;

      // Table header (bold text, black borders)
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(9);
      for (const c of cols) {
        doc.text(c.label, c.x + 2, y + 6, { width: c.w - 4, align: c.align });
      }
      // Header borders
      doc
        .rect(tableLeft, y, tableWidth, 20)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      // Header bottom line (separates header from data)
      doc
        .moveTo(tableLeft, y + 20)
        .lineTo(tableLeft + tableWidth, y + 20)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      y += 20;

      // Data rows
      doc.font('Helvetica').fontSize(9).fillColor(BLACK);
      if (pricedLines.length === 0) {
        doc
          .fillColor('#6b7280')
          .text('No items priced yet', 50, y + 8, { width: tableWidth, align: 'center' });
        y += 25;
      } else {
        pricedLines.forEach((line, i) => {
          const rowHeight = 22;

          // Sr
          doc.text(String(i + 1), cols[0].x + 2, y + 7, { width: cols[0].w - 4, align: 'center' });
          // NSN
          doc.text(line.nsn || '—', cols[1].x + 2, y + 7, { width: cols[1].w - 4, align: 'center' });
          // Part Number
          doc.text(line.partNumber || '—', cols[2].x + 2, y + 7, { width: cols[2].w - 4, align: 'center' });
          // Description
          doc.text(line.description || '—', cols[3].x + 2, y + 4, {
            width: cols[3].w - 4,
            height: rowHeight - 6,
            ellipsis: true,
          });
          // Qty
          doc.text(line.quantity || '—', cols[4].x + 2, y + 7, { width: cols[4].w - 4, align: 'center' });
          // Unit Price
          doc.text(`Rs. ${line.pricePerUnit}`, cols[5].x + 2, y + 7, { width: cols[5].w - 4, align: 'right' });
          // Total Price
          doc.text(`Rs. ${line.totalPrice}`, cols[6].x + 2, y + 7, { width: cols[6].w - 4, align: 'right' });

          // Row bottom border
          doc
            .moveTo(tableLeft, y + rowHeight)
            .lineTo(tableLeft + tableWidth, y + rowHeight)
            .strokeColor(BLACK)
            .lineWidth(0.3)
            .stroke();

          y += rowHeight;
        });
      }

      // Table outer border + vertical column dividers
      const tableBottom = y;
      const tableHeight = tableBottom - tableTop;
      doc
        .rect(tableLeft, tableTop, tableWidth, tableHeight)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      for (let ci = 1; ci < cols.length; ci++) {
        doc
          .moveTo(cols[ci].x, tableTop)
          .lineTo(cols[ci].x, tableBottom)
          .strokeColor(BLACK)
          .lineWidth(0.3)
          .stroke();
      }

      // ═══════════════════════════════════════════════
      // TOTALS (right side, below table)
      // ═══════════════════════════════════════════════
      y += 10;
      const totalsX = 320;
      const totalsW = 225;

      if (pricedLines.length > 0) {
        // Subtotal
        doc
          .rect(totalsX, y, totalsW, 18)
          .strokeColor(BLACK)
          .lineWidth(0.3)
          .stroke();
        doc
          .fillColor(BLACK)
          .font('Helvetica')
          .fontSize(10)
          .text('Subtotal:', totalsX + 5, y + 4, { width: 120 });
        doc
          .font('Helvetica-Bold')
          .text(`Rs. ${payload.totals.subtotal}`, totalsX + 125, y + 4, { width: totalsW - 130, align: 'right' });
        y += 18;

        // GST
        doc
          .rect(totalsX, y, totalsW, 18)
          .strokeColor(BLACK)
          .lineWidth(0.3)
          .stroke();
        doc
          .fillColor(BLACK)
          .font('Helvetica')
          .fontSize(10)
          .text('GST (18%):', totalsX + 5, y + 4, { width: 120 });
        doc
          .font('Helvetica-Bold')
          .text(`Rs. ${payload.totals.totalGst}`, totalsX + 125, y + 4, { width: totalsW - 130, align: 'right' });
        y += 18;

        // Grand Total (dark blue box)
        doc
          .rect(totalsX, y, totalsW, 22)
          .fillColor(DARK_BLUE)
          .fill();
        doc
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('GRAND TOTAL:', totalsX + 5, y + 6, { width: 120 });
        doc
          .fontSize(12)
          .text(`Rs. ${payload.totals.grandTotal}`, totalsX + 125, y + 6, { width: totalsW - 130, align: 'right' });
        y += 30;
      }

      // ═══════════════════════════════════════════════
      // TERMS AND CONDITIONS
      // ═══════════════════════════════════════════════
      y += 5;
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Terms and Condition:', 50, y);
      y += 16;

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(BLACK);
      const terms = [
        `Offer valid for ${payload.validity || '01 month'} only with effect from quotation date.`,
        `Item will be delivered within ${payload.delivery || '12-14 weeks'} of issuance of purchase order.`,
        `Price is exclusive of 18% GST.`,
        `Payment: ${payload.paymentTerms || '50% advance with PO, 50% before dispatch'}`,
      ];
      for (const t of terms) {
        doc.text(`•  ${t}`, 60, y, { width: 485 });
        y += 14;
      }

      // ═══════════════════════════════════════════════
      // SIGNATURE + STAMP
      // ═══════════════════════════════════════════════
      y += 15;
      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(11)
        .text('BEST REGARDS,', 50, y);
      y += 15;
      doc
        .font('Helvetica-Bold')
        .text(COMPANY.name, 50, y);

      // Stamp image — placed to the right of the signature, not overlapping text
      if (stampDataUrl) {
        const stampSize = 60;
        const stampX = 200;
        const stampY = y - 5;
        doc.image(stampDataUrl, stampX, stampY, { width: stampSize, height: stampSize });
      }

      // ═══════════════════════════════════════════════
      // FOOTER (fixed at bottom of same page — never split)
      // ═══════════════════════════════════════════════
      const footerY = PAGE_HEIGHT - 65;

      // Footer line
      doc
        .moveTo(50, footerY)
        .lineTo(PAGE_WIDTH - 50, footerY)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();

      // Address
      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(8)
        .text(COMPANY.address, 50, footerY + 5, { width: PAGE_WIDTH - 100, align: 'center' });
      // Website (blue)
      doc
        .fillColor(DARK_BLUE)
        .text(COMPANY.website, 50, footerY + 16, { width: PAGE_WIDTH - 100, align: 'center' });
      // Email (blue)
      doc.text(COMPANY.email, 50, footerY + 26, { width: PAGE_WIDTH - 100, align: 'center' });
      // Phone (black)
      doc
        .fillColor(BLACK)
        .text(COMPANY.phone, 50, footerY + 36, { width: PAGE_WIDTH - 100, align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
