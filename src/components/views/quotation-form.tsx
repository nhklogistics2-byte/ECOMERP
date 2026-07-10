'use client';

import { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Send,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Percent,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { CategorizedInquiry, ExtractedItem } from '@/lib/types';

interface QuotationLine extends ExtractedItem {
  uid: number;
  pricePerUnit: string;
  totalPrice: string;
  gstRate: string;
  gstAmount: string;
  totalWithGst: string;
}

interface QuotationFormProps {
  inquiry: CategorizedInquiry;
  items: Array<ExtractedItem & { source: string }>;
  onClose: () => void;
}

const DEFAULT_GST_RATE = '18'; // 18% standard GST

function parseQty(q: string): number {
  const n = parseFloat(q.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function QuotationForm({ inquiry, items, onClose }: QuotationFormProps) {
  const { addAuditEntry, addNotification } = useAppStore();

  // Initialize line items with price fields
  const [lines, setLines] = useState<QuotationLine[]>(
    items.map((item) => {
      const qty = parseQty(item.quantity);
      return {
        ...item,
        uid: inquiry.uid,
        pricePerUnit: '',
        totalPrice: '0',
        gstRate: DEFAULT_GST_RATE,
        gstAmount: '0',
        totalWithGst: '0',
      };
    })
  );

  // Quotation-level fields
  const [quoteNumber, setQuoteNumber] = useState(
    `QTN-${Date.now().toString().slice(-8)}`
  );
  const [quoteDate, setQuoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validity, setValidity] = useState('30 days');
  const [paymentTerms, setPaymentTerms] = useState(
    '50% advance with PO, 50% before dispatch'
  );
  const [delivery, setDelivery] = useState('4-6 weeks after receipt of PO');
  const [notes, setNotes] = useState(
    'Prices are in USD and ex-warehouse. Subject to final confirmation.'
  );

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Update a line's price and recalculate
  const updateLine = (index: number, field: keyof QuotationLine, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Recalculate totals
      const qty = parseQty(next[index].quantity);
      const unit = parseFloat(next[index].pricePerUnit.replace(/[^0-9.]/g, '')) || 0;
      const total = qty * unit;
      const gstRate = parseFloat(next[index].gstRate.replace(/[^0-9.]/g, '')) || 0;
      const gstAmount = (total * gstRate) / 100;
      next[index].totalPrice = formatMoney(total);
      next[index].gstAmount = formatMoney(gstAmount);
      next[index].totalWithGst = formatMoney(total + gstAmount);
      return next;
    });
  };

  // Calculate grand totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;
    for (const line of lines) {
      const qty = parseQty(line.quantity);
      const unit = parseFloat(line.pricePerUnit.replace(/[^0-9.]/g, '')) || 0;
      const total = qty * unit;
      const gstRate = parseFloat(line.gstRate.replace(/[^0-9.]/g, '')) || 0;
      const gstAmount = (total * gstRate) / 100;
      subtotal += total;
      totalGst += gstAmount;
      grandTotal += total + gstAmount;
    }
    return {
      subtotal: formatMoney(subtotal),
      totalGst: formatMoney(totalGst),
      grandTotal: formatMoney(grandTotal),
      itemCount: lines.length,
    };
  }, [lines]);

  const buildPayload = () => ({
    inquiryUid: inquiry.uid,
    inquiryId: inquiry.id,
    client: {
      name: inquiry.fromName || inquiry.from,
      email: inquiry.from,
      subject: inquiry.subject,
    },
    quoteNumber,
    quoteDate,
    validity,
    paymentTerms,
    delivery,
    notes,
    lines: lines.map((l) => ({
      partNumber: l.partNumber,
      nsn: l.nsn,
      description: l.description,
      quantity: l.quantity,
      uom: l.uom,
      serialNumber: l.serialNumber,
      pricePerUnit: l.pricePerUnit,
      totalPrice: l.totalPrice,
      gstRate: l.gstRate,
      gstAmount: l.gstAmount,
      totalWithGst: l.totalWithGst,
    })),
    totals,
  });

  const generatePdf = async () => {
    setGenerating(true);
    setGeneratedPdfUrl(null);
    try {
      const res = await fetch('/api/generate-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'PDF generation failed');
      setGeneratedPdfUrl(data.downloadUrl);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'quotation.generate',
        entity: 'quotation',
        entityId: quoteNumber,
        note: `Generated quotation ${quoteNumber} for ${inquiry.from}`,
      });
      toast.success('Quotation PDF generated');
    } catch (e) {
      toast.error('Generation failed', { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const sendQuotation = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/send-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Send failed');
      setSent(true);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'quotation.send',
        entity: 'quotation',
        entityId: quoteNumber,
        note: `Sent quotation ${quoteNumber} to ${inquiry.from}`,
      });
      addNotification({
        type: 'inquiry',
        title: 'Quotation sent',
        message: `${quoteNumber} sent to ${inquiry.from}`,
      });
      toast.success(`Quotation sent to ${inquiry.from}`);
    } catch (e) {
      toast.error('Send failed', { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e7eb] shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-gray-900" />
            <h2 className="text-base font-bold text-gray-900">
              Build Quotation
            </h2>
            <Badge variant="secondary" className="text-[11px]">
              {inquiry.fromName || inquiry.from}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded hover:bg-gray-50 flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 scrollbar-visible-y" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="p-5 space-y-4">
            {/* Quotation meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Quotation No.
                </label>
                <Input
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="h-8 text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Date
                </label>
                <Input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Validity
                </label>
                <Input
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Delivery
                </label>
                <Input
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  className="h-8 text-[13px]"
                />
              </div>
            </div>

            {/* Client info banner */}
            <div className="rounded-md border border-[#e5e7eb] bg-gray-50 p-3 text-[12px]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <span className="text-gray-500">To:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {inquiry.fromName || inquiry.from}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{' '}
                  <span className="font-mono text-gray-500">
                    {inquiry.from}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Ref inquiry:</span>{' '}
                  <span className="font-mono text-gray-500">
                    #{inquiry.uid}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Subject:</span>{' '}
                  <span className="text-gray-500 truncate">
                    {inquiry.subject}
                  </span>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-[#e5e7eb]">
                <h3 className="text-[13px] font-semibold text-gray-500 flex items-center gap-2">
                  <Calculator className="size-3.5" />
                  Line Items ({lines.length})
                  <span className="text-[11px] text-gray-500 font-normal ml-2">
                    Top half: extracted from attachment · Bottom half: fill the price fields
                  </span>
                </h3>
              </div>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-[#e5e7eb] text-[10px] text-gray-500 flex items-center gap-1.5">
                <ChevronRight className="size-3" />
                Use the scrollbar arrows below (← →) to see all columns including Price, GST, and Totals
              </div>
              <div className="scrollbar-visible">
                <table className="text-[12px]" style={{ minWidth: '1100px' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide">
                      <th className="text-left font-semibold text-gray-500 px-2 py-2" style={{ width: '30px' }}>#</th>
                      <th className="text-left font-semibold text-gray-500 px-2 py-2" style={{ width: '120px' }}>Part No.</th>
                      <th className="text-left font-semibold text-gray-500 px-2 py-2" style={{ width: '120px' }}>NSN</th>
                      <th className="text-left font-semibold text-gray-500 px-2 py-2" style={{ width: '200px' }}>Description</th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2" style={{ width: '50px' }}>Qty</th>
                      <th className="text-left font-semibold text-gray-500 px-2 py-2" style={{ width: '60px' }}>UOM</th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2 bg-gray-50" style={{ width: '90px' }}>
                        <DollarSign className="size-2.5 inline" /> Price/Unit
                      </th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2 bg-gray-50" style={{ width: '90px' }}>
                        Total Price
                      </th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2 bg-gray-50" style={{ width: '60px' }}>
                        <Percent className="size-2.5 inline" /> GST%
                      </th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2 bg-gray-50" style={{ width: '80px' }}>
                        GST Amt
                      </th>
                      <th className="text-right font-semibold text-gray-500 px-2 py-2 bg-gray-50" style={{ width: '100px' }}>
                        Total w/ GST
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-[10px] text-gray-500 font-mono">{i + 1}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-gray-900 whitespace-nowrap">
                          {line.partNumber || '—'}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {line.nsn || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-gray-900">
                          {line.description || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] font-bold text-gray-900 whitespace-nowrap">
                          {line.quantity || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-500 uppercase whitespace-nowrap">
                          {line.uom || '—'}
                        </td>
                        {/* Editable: Price per unit */}
                        <td className="px-2 py-1.5 bg-gray-50">
                          <Input
                            type="number"
                            value={line.pricePerUnit}
                            onChange={(e) => updateLine(i, 'pricePerUnit', e.target.value)}
                            placeholder="0.00"
                            className="h-7 text-[12px] text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] text-gray-500 bg-gray-50 whitespace-nowrap">
                          {line.totalPrice}
                        </td>
                        <td className="px-2 py-1.5 bg-gray-50">
                          <Input
                            type="number"
                            value={line.gstRate}
                            onChange={(e) => updateLine(i, 'gstRate', e.target.value)}
                            className="h-7 text-[12px] text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] text-gray-500 bg-gray-50 whitespace-nowrap">
                          {line.gstAmount}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[11px] font-bold text-gray-900 bg-blue-50 whitespace-nowrap">
                          {line.totalWithGst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-900 text-white">
                      <td colSpan={7} className="px-2 py-2 text-right text-[11px] font-medium uppercase tracking-wide">
                        Subtotal
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[12px] font-bold">
                        {totals.subtotal}
                      </td>
                      <td className="px-2 py-2 text-right text-[11px]">Total GST</td>
                      <td className="px-2 py-2 text-right font-mono text-[12px] font-bold">
                        {totals.totalGst}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[12px] font-bold bg-gray-800">
                        {totals.grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Payment Terms
                </label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-[12px]"
                />
              </div>
            </div>

            {/* Generated PDF preview */}
            {generatedPdfUrl && (
              <div className="rounded-md border border-[#e5e7eb] bg-gray-50 p-3 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-gray-900" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">
                    Quotation PDF generated
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {quoteNumber} · {totals.grandTotal} USD · {totals.itemCount} items
                  </p>
                </div>
                <a
                  href={generatedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-900 hover:underline"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              </div>
            )}

            {/* Sent confirmation */}
            {sent && (
              <div className="rounded-md border border-gray-300 bg-gray-50 text-gray-700 p-3 flex items-center gap-3">
                <CheckCircle2 className="size-5" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium">
                    Quotation sent to {inquiry.from}
                  </p>
                  <p className="text-[11px] text-gray-300">
                    The PDF has been emailed as an attachment from info@ecomruns.com
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[#e5e7eb] shrink-0">
          <div className="text-[11px] text-gray-500">
            Grand Total: <span className="font-mono font-bold text-gray-900">{totals.grandTotal} USD</span>
            <span className="mx-2">·</span>
            GST: <span className="font-mono">{totals.totalGst}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8">
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generatePdf}
              disabled={generating}
              className="h-8 gap-1.5"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              {generating ? 'Generating…' : 'Generate PDF'}
            </Button>
            <Button
              size="sm"
              onClick={sendQuotation}
              disabled={sending || sent}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-gray-800 text-white"
            >
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {sending ? 'Sending…' : sent ? 'Sent' : 'Send to Client'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
