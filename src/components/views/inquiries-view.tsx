'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Inbox,
  RefreshCw,
  Search,
  Mail,
  AlertCircle,
  Tag,
  Flag,
  Clock,
  User,
  Sparkles,
  XCircle,
  Paperclip,
  Wifi,
  Loader2,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  Pricing: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  Partnership: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900',
  'Technical Support': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-900',
  Onboarding: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900',
  'Project Update': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  'Bug Report': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
  Billing: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
  'Meeting Request': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-900',
  'General Inquiry': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  ' Spam / Junk': 'bg-zinc-200 text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-emerald-500 text-white',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
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

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(iso);
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

export function InquiriesView() {
  const {
    inquiries,
    setInquiries,
    selectedInquiryId,
    setSelectedInquiryId,
    addAuditEntry,
    addNotification,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const fetchEmails = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/emails?force=${force ? '1' : '0'}&limit=200`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Failed to fetch emails');
        setInquiries(data.emails || []);
        addAuditEntry({
          actor: 'ceo@ecomruns.com',
          action: 'imap.fetch',
          entity: 'inquiry',
          entityId: `batch-${Date.now()}`,
          note: `Fetched ${data.count} inquiries from techichamps.com`,
        });
        if (force) {
          toast.success(`Loaded ${data.count} inquiries from ${data.rawCount} scanned emails`);
        }
      } catch (e) {
        setError((e as Error).message);
        toast.error('Failed to fetch emails', { description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    },
    [setInquiries, addAuditEntry]
  );

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/emails?test=1', { cache: 'no-store' });
      const data = await res.json();
      setTestResult({ ok: data.ok, message: data.message || '' });
      if (data.ok) {
        toast.success('IMAP connection OK', { description: data.message });
      } else {
        toast.error('IMAP connection failed', { description: data.message });
      }
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    if (inquiries.length === 0) fetchEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of inquiries) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [inquiries]);

  const priorities = useMemo(() => {
    const counts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const e of inquiries) {
      counts[e.priority] = (counts[e.priority] || 0) + 1;
    }
    return counts;
  }, [inquiries]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return inquiries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;
      if (s) {
        const hay = `${e.subject} ${e.from} ${e.fromName} ${e.text} ${e.summary}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [inquiries, search, categoryFilter, priorityFilter]);

  const selected = useMemo(
    () => inquiries.find((e) => e.id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Inquiries</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {filtered.length} of {inquiries.length} shown · from{' '}
            <span className="font-medium text-emerald-700 dark:text-emerald-400">@techichamps.com</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={testing}
            className="gap-2 h-8"
          >
            {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Wifi className="size-3.5" />}
            <span className="hidden sm:inline">Test IMAP</span>
          </Button>
          <Button
            size="sm"
            onClick={() => fetchEmails(true)}
            disabled={loading}
            className="gap-2 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>{loading ? 'Syncing…' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-4 flex items-start gap-3">
          <XCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-800 dark:text-red-300">Connection error</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1 break-words">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchEmails(true)} className="shrink-0">
            Retry
          </Button>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div
          className={cn(
            'rounded-xl border p-3 flex items-start gap-3 text-sm',
            testResult.ok
              ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-800 dark:text-red-300'
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="size-4 shrink-0 mt-0.5" />
          )}
          <span className="break-words">{testResult.message}</span>
        </div>
      )}

      {/* Main grid: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        {/* Left: filters + list */}
        <div className="flex flex-col gap-4 min-w-0">
          <Card className="border-emerald-100/80 dark:border-zinc-800">
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  placeholder="Search subject, sender, body, summary…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-zinc-900"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                  <Tag className="size-3" /> Category:
                </span>
                <FilterChip
                  active={categoryFilter === 'all'}
                  onClick={() => setCategoryFilter('all')}
                  label="All"
                />
                {categories.map(([cat, n]) => (
                  <FilterChip
                    key={cat}
                    active={categoryFilter === cat}
                    onClick={() => setCategoryFilter(cat)}
                    label={`${cat.trim()} (${n})`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                  <Flag className="size-3" /> Priority:
                </span>
                {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
                  <FilterChip
                    key={p}
                    active={priorityFilter === p}
                    onClick={() => setPriorityFilter(p)}
                    label={p === 'all' ? 'All' : `${p[0].toUpperCase()}${p.slice(1)}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-[400px] flex flex-col border-emerald-100/80 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Mail className="size-4 text-emerald-600" />
                Inquiries from techichamps.com
                <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
              </CardTitle>
              {loading && <Loader2 className="size-4 animate-spin text-emerald-600" />}
            </CardHeader>
            <ScrollArea className="flex-1 max-h-[70vh]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                  <Inbox className="size-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No inquiries found</p>
                  <p className="text-sm mt-1">
                    {inquiries.length === 0
                      ? 'No emails from techichamps.com in the scanned range.'
                      : 'Try adjusting filters or search.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filtered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedInquiryId(e.id)}
                      className={cn(
                        'w-full text-left p-4 hover:bg-emerald-50/50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3',
                        selectedInquiryId === e.id && 'bg-emerald-50 dark:bg-zinc-800/70 border-l-2 border-emerald-600'
                      )}
                    >
                      <div className="size-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials(e.fromName || e.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {e.fromName || e.from}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0',
                              PRIORITY_COLORS[e.priority]
                            )}
                          >
                            {e.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {e.subject || '(no subject)'}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {e.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0 h-5 font-medium', CATEGORY_COLORS[e.category])}
                          >
                            {e.category.trim()}
                          </Badge>
                          {e.hasAttachments && (
                            <span className="text-zinc-400 flex items-center gap-0.5 text-[10px]">
                              <Paperclip className="size-3" />
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400 ml-auto flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatRelative(e.receivedAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right: detail panel */}
        <Card className="min-h-[400px] flex flex-col border-emerald-100/80 dark:border-zinc-800">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
              <div>
                <Mail className="size-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select an inquiry to view details</p>
                <p className="text-sm mt-1">
                  AI-generated category, priority, summary and suggested action will appear here.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[calc(100vh-180px)]">
              <div className="p-5 space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2"
                  onClick={() => setSelectedInquiryId(null)}
                >
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>

                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                    {selected.subject || '(no subject)'}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-medium', CATEGORY_COLORS[selected.category])}
                    >
                      <Tag className="size-3 mr-1" />
                      {selected.category.trim()}
                    </Badge>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        PRIORITY_COLORS[selected.priority]
                      )}
                    >
                      {selected.priority} priority
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {selected.language}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                      {initials(selected.fromName || selected.from)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
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
                          className="text-emerald-700 dark:text-emerald-400 hover:underline truncate"
                        >
                          {selected.from}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="size-3.5 shrink-0" />
                        {formatDate(selected.receivedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      AI Analysis
                    </h3>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                      Summary
                    </p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {selected.summary}
                    </p>
                  </div>
                  {selected.keyPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Key Points
                      </p>
                      <ul className="space-y-1">
                        {selected.keyPoints.map((kp, i) => (
                          <li key={i} className="text-sm text-zinc-800 dark:text-zinc-200 flex items-start gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                            <span>{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      Suggested Action
                    </p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {selected.suggestedAction}
                    </p>
                  </div>
                </div>

                {selected.hasAttachments && selected.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                      Attachments ({selected.attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.attachments.map((a, i) => (
                        <Badge key={i} variant="secondary" className="gap-1.5 py-1.5">
                          <Paperclip className="size-3" />
                          <span className="truncate max-w-[160px]">{a.filename}</span>
                          <span className="text-zinc-400 text-[10px]">
                            {a.size > 1024 ? `${Math.round(a.size / 1024)} KB` : `${a.size} B`}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Email Body
                  </p>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                    <pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-[400px] overflow-y-auto">
                      {selected.text || '(no text body — HTML-only email)'}
                    </pre>
                  </div>
                </div>

                <details className="text-xs text-zinc-500 dark:text-zinc-400">
                  <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                    Technical metadata
                  </summary>
                  <div className="mt-2 space-y-1 font-mono text-[11px]">
                    <div>UID: {selected.uid}</div>
                    <div className="break-all">Message-ID: {selected.messageId}</div>
                    {selected.inReplyTo && (
                      <div className="break-all">In-Reply-To: {selected.inReplyTo}</div>
                    )}
                    <div>To: {selected.to}</div>
                    <div>Domain: {selected.fromDomain}</div>
                  </div>
                </details>
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border transition-colors',
        active
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-700'
      )}
    >
      {label}
    </button>
  );
}
