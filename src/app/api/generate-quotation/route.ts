import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateQuotationPdfBuffer, type QuotationPayload } from '@/lib/quotation-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as QuotationPayload;

    if (!payload.lines || payload.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No line items provided' },
        { status: 400 }
      );
    }

    // Generate PDF (only includes lines with a price)
    const pdfBuffer = await generateQuotationPdfBuffer(payload);

    // Ensure the output directory exists
    const outDir = path.join(process.cwd(), 'public', 'quotations');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filename = `${payload.quoteNumber}.pdf`;
    const filepath = path.join(outDir, filename);
    fs.writeFileSync(filepath, pdfBuffer);

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
