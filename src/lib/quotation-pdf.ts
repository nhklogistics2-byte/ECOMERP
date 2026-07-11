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

const COMPANY = {
  name: 'SEA KEEPERS (Pvt) Ltd',
  address: 'OFFICE #102, GROUND FLOOR, BAHRIA COMPLEX-1, MT KHAN ROAD, KARACHI 74000',
  website: 'www.seakeepers.co',
  email: 'admin@seakeepers.co',
  phone: '+92-21 36453214',
};

const DARK_BLUE = '#1e3a8a';
const BLACK = '#000000';

// A4 portrait dimensions
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 495

/**
 * Load the logo image as a base64 data URL.
 * Uses JPEG (white background) because pdfkit standalone doesn't handle PNG alpha.
 */
function getLogoDataUrl(): string | null {
  const paths = [
    join(process.cwd(), 'public', 'assets', 'sea-keepers-logo.jpg'),
    join(process.cwd(), 'public', 'assets', 'sea-keepers-logo.png'),
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
 * Uses JPEG (white background) to avoid black background behind stamp.
 */
function getStampDataUrl(): string | null {
  const paths = [
    join(process.cwd(), 'public', 'assets', 'sea-keepers-stamp.jpg'),
    join(process.cwd(), 'public', 'assets', 'sea-keepers-stamp.png'),
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
 * Draw the footer (address + contact info) at a fixed Y position.
 * Combines all contact info on a single line to avoid page breaks.
 */
function drawFooter(doc: InstanceType<typeof PDFDocument>, y: number) {
  // Footer line
  doc
    .moveTo(MARGIN_LEFT, y)
    .lineTo(PAGE_WIDTH - MARGIN_RIGHT, y)
    .strokeColor(BLACK)
    .lineWidth(0.5)
    .stroke();

  // Address (centered)
  doc
    .fillColor(BLACK)
    .font('Helvetica')
    .fontSize(8)
    .text(COMPANY.address, MARGIN_LEFT, y + 5, { width: CONTENT_WIDTH, align: 'center' });

  // Contact info on a SINGLE line (website | email | phone)
  doc
    .fillColor(DARK_BLUE)
    .fontSize(8)
    .text(
      `${COMPANY.website}  |  ${COMPANY.email}  |  ${COMPANY.phone}`,
      MARGIN_LEFT,
      y + 16,
      { width: CONTENT_WIDTH, align: 'center' }
    );
}

/**
 * Draw the header (logo + company name + ref + date + title).
 */
function drawHeader(doc: InstanceType<typeof PDFDocument>, logoDataUrl: string | null, payload: QuotationPayload): number {
  // Logo at top-left
  if (logoDataUrl) {
    doc.image(logoDataUrl, MARGIN_LEFT, 35, { width: 45 });
  }

  // Company name (centered, dark blue)
  doc
    .fillColor(DARK_BLUE)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(COMPANY.name, MARGIN_LEFT, 50, { width: CONTENT_WIDTH, align: 'center' });

  // Ref number (left) and Date (right) on the same line
  doc
    .fillColor(BLACK)
    .font('Helvetica')
    .fontSize(10)
    .text(`REF No: ${payload.quoteNumber}`, MARGIN_LEFT, 95);

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
  doc.text(formattedDate, 300, 95, { width: CONTENT_WIDTH - 250, align: 'right' });

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('COMMERCIAL QUOTATION', MARGIN_LEFT, 118, { width: CONTENT_WIDTH, align: 'center' });
  // Underline
  doc
    .moveTo(180, 138)
    .lineTo(415, 138)
    .strokeColor(BLACK)
    .lineWidth(1)
    .stroke();

  return 150; // Y position after header
}

/**
 * Generate the quotation PDF.
 * - Uses actual logo and stamp images (transparent PNGs as data URLs)
 * - Single page if content fits
 * - Footer on same page (no separate pages for contact info)
 * - Repeats header/footer on additional pages if needed
 */
export function generateQuotationPdfBuffer(payload: QuotationPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margins: { top: 50, bottom: 30, left: MARGIN_LEFT, right: MARGIN_RIGHT },
        bufferPages: true,
      });
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Filter: only include lines with a price
      const pricedLines = payload.lines.filter(
        (l) => l.pricePerUnit && parseFloat(l.pricePerUnit.replace(/[^0-9.]/g, '')) > 0
      );

      const logoDataUrl = getLogoDataUrl();
      const stampDataUrl = getStampDataUrl();

      // ─── PAGE 1: HEADER ───
      let y = drawHeader(doc, logoDataUrl, payload);

      // ─── TO SECTION (no duplicate emails) ───
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('To,', MARGIN_LEFT, y);
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(payload.client.name, MARGIN_LEFT, y + 15);
      // Only show email once (no duplicates)
      if (payload.client.email && payload.client.email !== payload.client.name) {
        doc.text(payload.client.email, MARGIN_LEFT, y + 29);
      }
      if (payload.client.subject) {
        doc.text(`Ref: ${payload.client.subject}`, MARGIN_LEFT, y + 43, { width: 300 });
      }
      y += 55;

      // ─── TABLE ───
      // Fixed column widths — PART NO wide enough to avoid wrapping
      const cols = [
        { label: 'S.N#', x: MARGIN_LEFT, w: 30, align: 'center' as const },
        { label: 'NSN', x: MARGIN_LEFT + 30, w: 75, align: 'center' as const },
        { label: 'PART NO', x: MARGIN_LEFT + 105, w: 70, align: 'center' as const },
        { label: 'DESCRIPTION', x: MARGIN_LEFT + 175, w: 170, align: 'left' as const },
        { label: 'QTY', x: MARGIN_LEFT + 345, w: 35, align: 'center' as const },
        { label: 'Unit Price', x: MARGIN_LEFT + 380, w: 55, align: 'right' as const },
        { label: 'Total Price', x: MARGIN_LEFT + 435, w: 60, align: 'right' as const },
      ];
      const tableLeft = MARGIN_LEFT;
      const tableWidth = CONTENT_WIDTH;
      const tableTop = y;

      // Table header
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9);
      for (const c of cols) {
        doc.text(c.label, c.x + 2, y + 6, { width: c.w - 4, align: c.align });
      }
      doc
        .rect(tableLeft, y, tableWidth, 20)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      y += 20;

      // Data rows
      doc.font('Helvetica').fontSize(8).fillColor(BLACK);
      const rowHeight = 22;
      const maxTableY = PAGE_HEIGHT - 200; // Reserve space for totals + terms + signature + footer

      pricedLines.forEach((line, i) => {
        // Check if we need a new page
        if (y > maxTableY) {
          // Close current table border
          const tableBottom = y;
          doc
            .rect(tableLeft, tableTop, tableWidth, tableBottom - tableTop)
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

          // Draw footer on current page
          drawFooter(doc, PAGE_HEIGHT - 65);

          // Start new page
          doc.addPage();
          // Repeat header on new page
          y = drawHeader(doc, logoDataUrl, payload);
          y += 10;
          // No "To" section on continuation pages
        }

        // Sr
        doc.text(String(i + 1), cols[0].x + 2, y + 7, { width: cols[0].w - 4, align: 'center' });
        // NSN
        doc.text(line.nsn || '—', cols[1].x + 2, y + 7, { width: cols[1].w - 4, align: 'center' });
        // Part Number (wider column, no wrapping)
        doc.text(line.partNumber || '—', cols[2].x + 2, y + 7, {
          width: cols[2].w - 4,
          align: 'center',
          ellipsis: true, // Truncate instead of wrapping
        });
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

      // Close table border + vertical dividers
      const tableBottom = y;
      doc
        .rect(tableLeft, tableTop, tableWidth, tableBottom - tableTop)
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

      // ─── TOTALS ───
      y += 8;
      const totalsX = 320;
      const totalsW = 225;

      if (pricedLines.length > 0) {
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

      // ─── TERMS ───
      y += 3;
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Terms and Condition:', MARGIN_LEFT, y);
      y += 16;

      doc.font('Helvetica').fontSize(10).fillColor(BLACK);
      const terms = [
        `Offer valid for ${payload.validity || '01 month'} only with effect from quotation date.`,
        `Item will be delivered within ${payload.delivery || '12-14 weeks'} of issuance of purchase order.`,
        `Price is exclusive of 18% GST.`,
        `Payment: ${payload.paymentTerms || '50% advance with PO, 50% before dispatch'}`,
      ];
      for (const t of terms) {
        doc.text(`•  ${t}`, MARGIN_LEFT + 10, y, { width: CONTENT_WIDTH - 10 });
        y += 13;
      }

      // ─── SIGNATURE + STAMP ───
      y += 10;
      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(11)
        .text('BEST REGARDS,', MARGIN_LEFT, y);
      y += 14;
      doc.font('Helvetica-Bold').text(COMPANY.name, MARGIN_LEFT, y);

      // Stamp image — transparent PNG, placed to the right of signature
      if (stampDataUrl) {
        doc.image(stampDataUrl, 200, y - 10, { width: 55, height: 55 });
      }

      // ─── FOOTER (on EVERY page) ───
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, PAGE_HEIGHT - 65);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
