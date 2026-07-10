'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Mail,
  User,
  Clock,
  Tag,
  Sparkles,
  TrendingUp,
  Paperclip,
  ImageIcon,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  Boxes,
  Hash,
  Barcode,
  Package,
  Hash as HashIcon,
  FileSearch,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { CategorizedInquiry, ExtractResult, ExtractedItem } from '@/lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-zinc-900 text-white',
  high: 'bg-zinc-700 text-white',
  medium: 'bg-zinc-500 text-white',
  low: 'bg-zinc-300 text-zinc-800',
};

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-zinc-900 text-white border-zinc-900',
  Pricing: 'bg-zinc-200 text-zinc-800 border-zinc-300',
  Partnership: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  'Technical Support': 'bg-zinc-100 text-zinc-700 border-zinc-300',
  Onboarding: 'bg-zinc-200 text-zinc-800 border-zinc-300',
  'Project Update': 'bg-zinc-100 text-zinc-700 border-zinc-300',
  'Bug Report': 'bg-zinc-900 text-white border-zinc-900',
  Billing: 'bg-zinc-200 text-zinc-800 border-zinc-300',
  'Meeting Request': 'bg-zinc-100 text-zinc-700 border-zinc-300',
  'General Inquiry': 'bg-zinc-100 text-zinc-700 border-zinc-300',
  'Spam / Junk': 'bg-zinc-300 text-zinc-600 border-zinc-400',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function InquiryDetailView() {
  const { inquiries, detailInquiryId, setDetailInquiryId, setView, addAuditEntry, addNotification } = useAppStore();

  const selected = useMemo(
    () => inquiries.find((e) => e.id === detailInquiryId) || null,
    [inquiries, detailInquiryId]
  );

  // Per-attachment extraction state
  const [extractions, setExtractions] = useState<Record<string, ExtractResult>>({});
  const [extractingKey, setExtractingKey] = useState<string | null>(null);

  const extract = useCallback(
    async (uid: number, filename: string) => {
      const key = `${uid}:${filename}`;
      setExtractingKey(key);
      try {
        const res = await fetch('/api/extract-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, filename }),
        });
        const data: ExtractResult = await res.json();
        if (!data.ok) throw new Error(data.error || 'Extraction failed');
        setExtractions((prev) => ({ ...prev, [key]: data }));
        addAuditEntry({
          actor: 'ceo@ecomruns.com',
          action: 'ai.extract_items',
          entity: 'attachment',
          entityId: key,
          note: `Extracted ${data.items?.length || 0} items from ${filename}`,
        });
        addNotification({
          type: 'ai',
          title: 'Items extracted',
          message: `${data.items?.length || 0} line items found in ${filename}`,
        });
        toast.success(`Extracted ${data.items?.length || 0} items from ${filename}`);
      } catch (e) {
        toast.error('Extraction failed', { description: (e as Error).message });
      } finally {
        setExtractingKey(null);
      }
    },
    [addAuditEntry, addNotification]
  );

  // Auto-extract first attachment on load if inquiry has attachments
  useEffect(() => {
    if (!selected || !selected.hasAttachments) return;
    if (selected.attachments.length === 0) return;
    const first = selected.attachments[0];
    const key = `${selected.uid}:${first.filename}`;
    if (extractions[key] || extractingKey) return;
    // Auto-trigger extraction for the first attachment
    extract(selected.uid, first.filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  if (!selected) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <Mail className="size-10 mx-auto mb-3 opacity-20" />
        <p className="font-medium">Inquiry not found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setView('inquiries')}
        >
          <ArrowLeft className="size-4 mr-1" /> Back to Inquiries
        </Button>
      </div>
    );
  }

  // Aggregate all extracted items across attachments
  const allItems: Array<ExtractedItem & { source: string }> = [];
  for (const a of selected.attachments) {
    const key = `${selected.uid}:${a.filename}`;
    const ext = extractions[key];
    if (ext?.items) {
      for (const item of ext.items) {
        allItems.push({ ...item, source: a.filename });
      }
    }
  }

  const totalItems = allItems.length;
  const attachmentsExtracted = Object.keys(extractions).length;
  const totalAttachments = selected.attachments.length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('inquiries')}
            className="gap-1.5 shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
              {selected.subject || '(no subject)'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono">#{selected.uid}</span>
              <span>·</span>
              <span>{formatDateTime(selected.receivedAt)}</span>
              <span>·</span>
              <span className="font-medium">{selected.from}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn('text-xs font-medium', CATEGORY_COLORS[selected.category])}>
            <Tag className="size-3 mr-1" />
            {selected.category.trim()}
          </Badge>
          <span className={cn('text-[10px] font-bold px-2 py-1 rounded uppercase', PRIORITY_COLORS[selected.priority])}>
            {selected.priority}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip
          icon={<Paperclip className="size-4" />}
          label="Attachments"
          value={`${totalAttachments}`}
          sub={totalAttachments > 0 ? 'in this inquiry' : 'none'}
        />
        <StatChip
          icon={<FileSearch className="size-4" />}
          label="Processed"
          value={`${attachmentsExtracted}/${totalAttachments}`}
          sub={attachmentsExtracted === totalAttachments ? 'all done' : 'in progress'}
        />
        <StatChip
          icon={<Boxes className="size-4" />}
          label="Line Items"
          value={String(totalItems)}
          sub={totalItems > 0 ? 'extracted by AI' : '—'}
        />
        <StatChip
          icon={<Globe className="size-4" />}
          label="Language"
          value={selected.language}
          sub="detected"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">
        {/* Left: Inquiry context + AI Analysis */}
        <div className="space-y-4">
          {/* Sender card */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Sender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                  {initials(selected.fromName || selected.from)}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {selected.fromName || '(no name)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`mailto:${selected.from}`}
                      className="text-zinc-900 dark:text-zinc-100 hover:underline truncate"
                    >
                      {selected.from}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="size-3.5 shrink-0" />
                    {formatDateTime(selected.receivedAt)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Building2 className="size-3.5 shrink-0" />
                    {selected.fromDomain}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                  Summary
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {selected.summary}
                </p>
              </div>
              {selected.keyPoints.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                    Key Points
                  </p>
                  <ul className="space-y-1">
                    {selected.keyPoints.map((kp, i) => (
                      <li
                        key={i}
                        className="text-sm text-zinc-800 dark:text-zinc-200 flex items-start gap-2"
                      >
                        <span className="text-zinc-900 dark:text-zinc-100 mt-1">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  Suggested Action
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {selected.suggestedAction}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Paperclip className="size-4" />
                Attachments ({selected.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {selected.attachments.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">No attachments</p>
              ) : (
                selected.attachments.map((a, i) => {
                  const key = `${selected.uid}:${a.filename}`;
                  const ext = extractions[key];
                  const isExtracting = extractingKey === key;
                  const isImage = a.contentType.startsWith('image/');
                  const isPdf = a.contentType === 'application/pdf';
                  const isText = a.contentType.startsWith('text/');
                  const isViewable = isImage || isPdf || isText;
                  const url = `/api/attachment?uid=${selected.uid}&filename=${encodeURIComponent(a.filename)}${isViewable ? '' : '&download=1'}`;
                  return (
                    <div
                      key={i}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        {isImage ? (
                          <ImageIcon className="size-4 text-zinc-600 shrink-0" />
                        ) : isPdf ? (
                          <FileText className="size-4 text-zinc-600 shrink-0" />
                        ) : (
                          <Download className="size-4 text-zinc-600 shrink-0" />
                        )}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 hover:underline truncate flex-1 min-w-0"
                          title={a.filename}
                        >
                          {a.filename}
                        </a>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {a.size > 1024 ? `${Math.round(a.size / 1024)} KB` : `${a.size} B`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => extract(selected.uid, a.filename)}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <FileSearch className="size-3" />
                          )}
                          {isExtracting ? 'Extracting…' : ext ? 'Re-extract' : 'Extract Items'}
                        </Button>
                        {ext && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-zinc-700" />
                            {ext.items?.length || 0} items
                            {ext.cached && <span className="text-zinc-400">(cached)</span>}
                          </span>
                        )}
                      </div>
                      {ext?.error && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="size-3" />
                          {ext.error}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Extracted Line Items Table */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <Boxes className="size-4" />
              Extracted Line Items
              <Badge variant="secondary" className="ml-1 text-[11px]">{allItems.length}</Badge>
            </CardTitle>
            {extractingKey && (
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Processing…
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {allItems.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                {extractingKey ? (
                  <>
                    <Loader2 className="size-8 mx-auto mb-3 animate-spin text-zinc-400" />
                    <p className="font-medium text-zinc-700">Extracting items with AI…</p>
                    <p className="text-xs mt-1">
                      Fetching attachment → parsing content → OpenRouter AI extraction
                    </p>
                  </>
                ) : (
                  <>
                    <Boxes className="size-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No items extracted yet</p>
                    <p className="text-xs mt-1">
                      {selected.attachments.length > 0
                        ? 'Click "Extract Items" on an attachment above.'
                        : 'This inquiry has no attachments.'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[40px]">
                        #
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap min-w-[140px]">
                        <Hash className="size-3 inline mr-1" />
                        Part Number
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap min-w-[130px]">
                        <Barcode className="size-3 inline mr-1" />
                        NSN
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 min-w-[200px]">
                        <Package className="size-3 inline mr-1" />
                        Description
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[80px]">
                        Qty
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[80px]">
                        UOM
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap min-w-[120px]">
                        <HashIcon className="size-3 inline mr-1" />
                        Serial No
                      </th>
                      <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 min-w-[120px]">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {allItems.map((item, i) => (
                      <tr
                        key={i}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-[11px] text-zinc-500 font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] font-medium text-zinc-900 dark:text-zinc-100">
                            {item.partNumber || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] text-zinc-700 dark:text-zinc-300">
                            {item.nsn || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] text-zinc-800 dark:text-zinc-200">
                            {item.description || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] font-medium text-zinc-900 dark:text-zinc-100">
                            {item.quantity || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 uppercase">
                            {item.uom || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] text-zinc-600 dark:text-zinc-400">
                            {item.serialNumber || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] text-zinc-500 truncate max-w-[120px] block" title={item.source}>
                            {item.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email body */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Email Body
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-[300px] overflow-y-auto scrollbar-thin">
            {selected.text || '(no text body — HTML-only email)'}
          </pre>
        </CardContent>
      </Card>

      {/* Technical metadata */}
      <details className="text-xs text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 font-medium">
          Technical metadata
        </summary>
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          <div>UID: {selected.uid}</div>
          <div className="break-all">Message-ID: {selected.messageId}</div>
          <div>To: {selected.to}</div>
          <div>Domain: {selected.fromDomain}</div>
          {selected.inReplyTo && (
            <div className="break-all">In-Reply-To: {selected.inReplyTo}</div>
          )}
        </div>
      </details>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex items-center gap-2.5">
      <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wide">{label}</p>
        <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight truncate">
          {value}
        </p>
        {sub && <p className="text-[10px] text-zinc-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}
