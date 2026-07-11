import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

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

// Colors matching the original Sea Keepers PDF
const TEAL_BLUE = '#0080A0';        // logo color (teal blue, matching original)
const DARK_BLUE = '#1e3a8a';       // company name + stamp border
const BLACK = '#000000';

/**
 * Draw a sailboat logo matching the Sea Keepers original.
 * Teal blue, curved hull with pointed bow, single triangular sail with a boom line.
 */
function drawSailboatLogo(doc: InstanceType<typeof PDFDocument>, x: number, y: number, size: number) {
  // Hull — curved boat shape with pointed bow (front) and rounded stern (back)
  // Using quadratic curves for a smooth, boat-like hull
  doc.save();
  doc.moveTo(x + size * 0.05, y + size * 0.62);            // left side (stern top)
  doc.quadraticCurveTo(x + size * 0.5, y + size * 0.95, x + size * 0.92, y + size * 0.65); // bottom curve to bow
  doc.lineTo(x + size * 0.98, y + size * 0.62);            // bow point
  doc.quadraticCurveTo(x + size * 0.5, y + size * 0.75, x + size * 0.05, y + size * 0.62); // back to stern
  doc.fill(TEAL_BLUE);
  doc.restore();

  // Mast (vertical line from top of sail to deck)
  doc.rect(x + size * 0.46, y + size * 0.05, size * 0.025, size * 0.58).fill(TEAL_BLUE);

  // Sail — triangular, filled, angled slightly to the right
  doc.save();
  doc.moveTo(x + size * 0.485, y + size * 0.05);           // top of sail (peak)
  doc.lineTo(x + size * 0.88, y + size * 0.55);            // right edge (down to boom)
  doc.lineTo(x + size * 0.485, y + size * 0.55);           // bottom-left of sail
  doc.fill(TEAL_BLUE);
  doc.restore();

  // Boom — horizontal line across the sail (thicker, ~1/3 down from top)
  doc.rect(x + size * 0.46, y + size * 0.2, size * 0.44, size * 0.04).fill(TEAL_BLUE);
}

/**
 * Draw a circular company stamp matching the Sea Keepers original.
 * Double border (outer + inner circle), "SEA KEEPERS" text at top,
 * "(Pvt.) Ltd" text at bottom, sailboat logo centered inside.
 */
function drawCompanyStamp(doc: InstanceType<typeof PDFDocument>, cx: number, cy: number, radius: number) {
  // Outer circle (black, thicker)
  doc
    .circle(cx, cy, radius)
    .strokeColor(BLACK)
    .lineWidth(1.5)
    .stroke();

  // Inner circle (black, thinner)
  doc
    .circle(cx, cy, radius - 4)
    .strokeColor(BLACK)
    .lineWidth(0.7)
    .stroke();

  // Sailboat logo in center (teal blue)
  const logoSize = radius * 0.8;
  drawSailboatLogo(doc, cx - logoSize / 2, cy - logoSize / 2 + 2, logoSize);

  // "SEA KEEPERS" text — top of circle (along the upper arc area)
  doc
    .fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(6)
    .text('SEA KEEPERS', cx - radius, cy - radius + 3, {
      width: radius * 2,
      align: 'center',
    });

  // "(Pvt.) Ltd" text — bottom of circle
  doc
    .fontSize(5)
    .text('(Pvt.) Ltd', cx - radius, cy + radius - 9, {
      width: radius * 2,
      align: 'center',
    });
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
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
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
      // Logo (top-left, light blue sailboat)
      drawSailboatLogo(doc, 50, 40, 40);

      // Company name (centered, dark blue)
      doc
        .fillColor(DARK_BLUE)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(COMPANY.name, 50, 50, { width: 495, align: 'center' });

      // Reference number (left)
      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(10)
        .text(`REF No: ${payload.quoteNumber}`, 50, 95);

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
        .strokeColor(BLACK)
        .lineWidth(1)
        .stroke();

      // ── TO SECTION ──
      let y = 160;
      doc
        .fillColor(BLACK)
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

      const tableTop = y;
      const tableLeft = 50;
      const tableWidth = 495;

      // Table header (no background fill — just bold text with border)
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(9);
      for (const c of cols) {
        doc.text(c.label, c.x + 2, y + 6, { width: c.w - 4, align: c.align });
      }
      // Header bottom border
      doc
        .moveTo(tableLeft, y + 20)
        .lineTo(tableLeft + tableWidth, y + 20)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      // Header top border
      doc
        .moveTo(tableLeft, y)
        .lineTo(tableLeft + tableWidth, y)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      y += 20;

      // Data rows
      doc.font('Helvetica').fontSize(9).fillColor(BLACK);
      if (pricedLines.length === 0) {
        doc
          .fillColor('#6b7280')
          .text('No items priced yet', 50, y + 8, { width: 495, align: 'center' });
        y += 25;
      } else {
        pricedLines.forEach((line, i) => {
          const rowHeight = 24;

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
          // Unit Price (with Rs. prefix)
          doc.text(`Rs. ${line.pricePerUnit}`, cols[5].x + 2, y + 8, { width: cols[5].w - 4, align: 'right' });
          // Total Price (with Rs. prefix)
          doc.text(`Rs. ${line.totalPrice}`, cols[6].x + 2, y + 8, { width: cols[6].w - 4, align: 'right' });

          // Row bottom border
          doc
            .moveTo(tableLeft, y + rowHeight)
            .lineTo(tableLeft + tableWidth, y + rowHeight)
            .strokeColor(BLACK)
            .lineWidth(0.3)
            .stroke();

          y += rowHeight;

          if (y > 700) {
            doc.addPage();
            y = 50;
          }
        });
      }

      // Table outer border + vertical column lines
      const tableBottom = y;
      const tableHeight = tableBottom - tableTop;
      // Outer rectangle
      doc
        .rect(tableLeft, tableTop, tableWidth, tableHeight)
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .stroke();
      // Vertical column dividers
      for (let ci = 1; ci < cols.length; ci++) {
        doc
          .moveTo(cols[ci].x, tableTop)
          .lineTo(cols[ci].x, tableBottom)
          .strokeColor(BLACK)
          .lineWidth(0.3)
          .stroke();
      }

      // ── TOTALS SECTION ──
      y += 15;
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

        // Total GST
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

      // ── TERMS AND CONDITIONS ──
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Terms and Condition:', 50, y);
      y += 18;

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
        y += 15;
      }

      // ── SIGNATURE BLOCK ──
      y += 20;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor(BLACK)
        .font('Helvetica')
        .fontSize(11)
        .text('BEST REGARDS,', 50, y);
      y += 16;
      doc
        .font('Helvetica-Bold')
        .text(COMPANY.name, 50, y);
      y += 30;

      // Circular stamp to the right of the signature
      drawCompanyStamp(doc, 110, y, 30);

      // ── FOOTER ──
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        // Footer line
        doc
          .moveTo(50, 785)
          .lineTo(545, 785)
          .strokeColor(BLACK)
          .lineWidth(0.5)
          .stroke();
        // Address
        doc
          .fillColor(BLACK)
          .font('Helvetica')
          .fontSize(8)
          .text(COMPANY.address, 50, 790, { width: 495, align: 'center' });
        // Website (blue)
        doc
          .fillColor(DARK_BLUE)
          .text(COMPANY.website, 50, 803, { width: 495, align: 'center' });
        // Email (blue)
        doc.text(COMPANY.email, 50, 813, { width: 495, align: 'center' });
        // Phone (black)
        doc
          .fillColor(BLACK)
          .text(COMPANY.phone, 50, 823, { width: 495, align: 'center' });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
