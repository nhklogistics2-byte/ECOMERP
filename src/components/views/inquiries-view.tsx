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
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
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
  Sales: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Pricing: 'bg-amber-100 text-amber-700 border-amber-200',
  Partnership: 'bg-purple-100 text-purple-700 border-purple-200',
  'Technical Support': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Onboarding: 'bg-teal-100 text-teal-700 border-teal-200',
  'Project Update': 'bg-sky-100 text-sky-700 border-sky-200',
  'Bug Report': 'bg-red-100 text-red-700 border-red-200',
  Billing: 'bg-orange-100 text-orange-700 border-orange-200',
  'Meeting Request': 'bg-pink-100 text-pink-700 border-pink-200',
  'General Inquiry': 'bg-slate-100 text-slate-700 border-slate-200',
  ' Spam / Junk': 'bg-zinc-200 text-zinc-500 border-zinc-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-emerald-500 text-white',
};

const STATUS_BY_PRIORITY: Record<string, { label: string; color: string }> = {
  urgent: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  medium: { label: 'Open', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  low: { label: 'On Hold', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

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

function formatRelative(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchEmails = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/emails?force=${force ? '1' : '0'}&limit=100`;
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selected = useMemo(
    () => inquiries.find((e) => e.id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  // Tab counts
  const tabCounts = useMemo(() => {
    const c = {
      all: inquiries.length,
      new: inquiries.filter((e) => e.priority === 'urgent' || e.priority === 'high').length,
      open: inquiries.filter((e) => e.priority === 'medium').length,
      onHold: inquiries.filter((e) => e.priority === 'low').length,
    };
    return c;
  }, [inquiries]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Inquiries</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {filtered.length} of {inquiries.length} shown · from{' '}
            <span className="font-medium text-indigo-700 dark:text-indigo-400">@techichamps.com</span>
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
            className="gap-2 h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>{loading ? 'Syncing…' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3 flex items-start gap-2 text-sm text-red-800">
          <XCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Connection error</p>
            <p className="text-red-700 mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchEmails(true)}>
            Retry
          </Button>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div
          className={cn(
            'rounded-lg border p-3 flex items-start gap-2 text-sm',
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

      {/* Status tabs (ERP-style) */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {[
            { key: 'all', label: 'All', count: tabCounts.all },
            { key: 'new', label: 'New', count: tabCounts.new },
            { key: 'open', label: 'Open', count: tabCounts.open },
            { key: 'onHold', label: 'On Hold', count: tabCounts.onHold },
          ].map((t) => {
            const isActive =
              (t.key === 'all' && priorityFilter === 'all') ||
              (t.key === 'new' && (priorityFilter === 'urgent' || priorityFilter === 'high')) ||
              (t.key === 'open' && priorityFilter === 'medium') ||
              (t.key === 'onHold' && priorityFilter === 'low');
            return (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === 'all') setPriorityFilter('all');
                  else if (t.key === 'new') setPriorityFilter('high');
                  else if (t.key === 'open') setPriorityFilter('medium');
                  else if (t.key === 'onHold') setPriorityFilter('low');
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Search ref, subject, sender, body…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 text-[13px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
        >
          <option value="all">All categories</option>
          {categories.map(([cat]) => (
            <option key={cat} value={cat}>
              {cat.trim()}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 text-[13px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* ERP-style Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[60px]">
                  Ref
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[100px]">
                  Date
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 min-w-[260px]">
                  Subject
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap min-w-[160px]">
                  Sender
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[130px]">
                  Category
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[90px]">
                  Priority
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[100px]">
                  Status
                </th>
                <th className="text-left font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[110px]">
                  AI Review
                </th>
                <th className="text-right font-semibold text-zinc-600 dark:text-zinc-300 px-3 py-2.5 whitespace-nowrap w-[90px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading && inquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-zinc-500">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading inquiries from IMAP…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-zinc-500">
                    <Inbox className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No inquiries found</p>
                    <p className="text-xs mt-1">Try adjusting filters or search.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((e, i) => {
                  const refNum = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const status = STATUS_BY_PRIORITY[e.priority];
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedInquiryId(e.id)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        #{String(refNum).padStart(3, '0')}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap text-[12px]">
                        {formatDate(e.receivedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-zinc-900 dark:text-white truncate max-w-[280px]">
                          {e.subject || '(no subject)'}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[280px] mt-0.5">
                          {e.summary}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                            {initials(e.fromName || e.from)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">
                              {e.fromName || e.from}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                              {e.from}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-5 font-medium border',
                            CATEGORY_COLORS[e.category]
                          )}
                        >
                          {e.category.trim()}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase',
                            PRIORITY_COLORS[e.priority]
                          )}
                        >
                          {e.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-5 font-medium border',
                            status.color
                          )}
                        >
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {e.keyPoints.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3" />
                            {e.keyPoints.length} points
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                        {e.hasAttachments && (
                          <Paperclip className="inline size-3 ml-1 text-zinc-400" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedInquiryId(e.id);
                          }}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-700 dark:text-indigo-400 hover:underline"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 flex items-center justify-between text-[12px]">
            <span className="text-zinc-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </Button>
              <span className="text-zinc-600 dark:text-zinc-300 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Detail Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSelectedInquiryId(null)}
      >
        <div
          className={cn(
            'absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-xl',
            'flex flex-col transition-transform duration-300',
            selected ? 'translate-x-0' : 'translate-x-full'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden -ml-2"
              onClick={() => setSelectedInquiryId(null)}
            >
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white hidden lg:block">
              Inquiry Detail
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSelectedInquiryId(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <Mail className="size-8 opacity-20" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-4">
                {/* Subject + badges */}
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

                {/* Sender card */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
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
                          className="text-indigo-700 dark:text-indigo-400 hover:underline truncate"
                        >
                          {selected.from}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="size-3.5 shrink-0" />
                        {formatDateTime(selected.receivedAt)}
                        <span className="text-zinc-300">·</span>
                        {formatRelative(selected.receivedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                      AI Analysis
                    </h3>
                  </div>
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
                            <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                            <span>{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      Suggested Action
                    </p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {selected.suggestedAction}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {selected.hasAttachments && selected.attachments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
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

                {/* Email body */}
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
                    Email Body
                  </p>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                    <pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin">
                      {selected.text || '(no text body — HTML-only email)'}
                    </pre>
                  </div>
                </div>

                {/* Metadata */}
                <details className="text-xs text-zinc-500 dark:text-zinc-400">
                  <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 font-medium">
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
        </div>
      </div>
    </div>
  );
}
