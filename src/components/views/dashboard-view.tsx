'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Inbox,
  AlertCircle,
  Tag,
  Sparkles,
  TrendingUp,
  Loader2,
  RefreshCw,
  Mail,
  Building2,
  Clock,
  ArrowRight,
  Bell,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-indigo-500 text-white',
};

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-emerald-100 text-indigo-700 border-emerald-200',
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

export function DashboardView() {
  const {
    inquiries,
    setInquiries,
    setView,
    setSelectedInquiryId,
    addAuditEntry,
    addNotification,
    notifications,
    auditLog,
  } = useAppStore();
  const [loading, setLoading] = useState(false);

  const fetchEmails = useCallback(
    async (force: boolean) => {
      setLoading(true);
      try {
        const url = `/api/emails?force=${force ? '1' : '0'}&limit=200`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Failed');
        const list = data.emails || [];
        setInquiries(list);
        addAuditEntry({
          actor: 'ceo@ecomruns.com',
          action: 'imap.fetch',
          entity: 'inquiry',
          entityId: `batch-${Date.now()}`,
          note: `Fetched ${data.count} inquiries from techichamps.com`,
        });
        if (force && list.length > 0) {
          const urgent = list.filter(
            (e: { priority: string }) => e.priority === 'urgent' || e.priority === 'high'
          ).length;
          if (urgent > 0) {
            addNotification({
              type: 'inquiry',
              title: `${urgent} urgent/high inquiry${urgent > 1 ? 'ies' : ''} need attention`,
              message: `Synced ${list.length} inquiries from techichamps.com`,
            });
          }
          toast.success(`Synced ${list.length} inquiries`);
        }
      } catch (e) {
        toast.error('Fetch failed', { description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    },
    [setInquiries, addAuditEntry, addNotification]
  );

  useEffect(() => {
    if (inquiries.length === 0) fetchEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = inquiries.length;
    const urgentHigh = inquiries.filter(
      (e) => e.priority === 'urgent' || e.priority === 'high'
    ).length;
    const catCounts: Record<string, number> = {};
    for (const e of inquiries) {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, urgentHigh, topCat, catCounts };
  }, [inquiries]);

  const recent = useMemo(() => inquiries.slice(0, 5), [inquiries]);
  const recentAudit = useMemo(() => auditLog.slice(0, 4), [auditLog]);
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).slice(0, 3),
    [notifications]
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Building2 className="size-3.5" />
            <span className="font-medium text-indigo-700 dark:text-indigo-400">ecomruns.com</span>
            <span className="text-zinc-400">↔</span>
            <span className="font-medium text-indigo-700 dark:text-indigo-400">techichamps.com</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEmails(true)}
          disabled={loading}
          className="gap-2 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Sync Now
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Inquiries"
          value={stats.total}
          icon={<Inbox className="size-5" />}
          tone="indigo"
          sub="from @techichamps.com"
          onClick={() => setView('inquiries')}
        />
        <StatCard
          label="Urgent / High"
          value={stats.urgentHigh}
          icon={<AlertCircle className="size-5" />}
          tone="red"
          sub="need attention"
          onClick={() => setView('inquiries')}
        />
        <StatCard
          label="Categories"
          value={Object.keys(stats.catCounts).length}
          icon={<Tag className="size-5" />}
          tone="purple"
          sub={stats.topCat ? `Top: ${stats.topCat[0].trim()}` : '—'}
          onClick={() => setView('inquiries')}
        />
        <StatCard
          label="AI Model"
          value="DeepSeek V3.1"
          icon={<Sparkles className="size-5" />}
          tone="violet"
          sub="via OpenRouter"
          onClick={() => setView('ai-eval')}
        />
      </div>

      {/* Two-column: recent inquiries + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent inquiries */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Mail className="size-4 text-indigo-600" />
                Recent Inquiries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-indigo-700 gap-1 h-7"
                onClick={() => setView('inquiries')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading && inquiries.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading…
                </div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Inbox className="size-8 mx-auto mb-2 opacity-30" />
                  No inquiries yet
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recent.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelectedInquiryId(e.id);
                        setView('inquiries');
                      }}
                      className="w-full text-left p-3 hover:bg-indigo-50/40 dark:hover:bg-zinc-800/40 flex gap-3"
                    >
                      <div className="size-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {(e.fromName || e.from)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                            {e.fromName || e.from}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0',
                              PRIORITY_COLORS[e.priority]
                            )}
                          >
                            {e.priority}
                          </span>
                        </div>
                        <p className="text-[13px] text-zinc-800 dark:text-zinc-200 truncate">
                          {e.subject || '(no subject)'}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{e.summary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-5 font-medium',
                            CATEGORY_COLORS[e.category]
                          )}
                        >
                          {e.category.trim()}
                        </Badge>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                          <Clock className="size-2.5" />
                          {formatRelative(e.receivedAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card className="border-zinc-200 dark:border-zinc-800 mt-4">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-600" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {Object.entries(stats.catCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, n]) => {
                  const pct = stats.total > 0 ? (n / stats.total) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-zinc-700 dark:text-zinc-300">{cat.trim()}</span>
                        <span className="text-zinc-500 font-mono">{n}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(stats.catCounts).length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel: notifications + audit */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Bell className="size-4 text-indigo-600" />
                Notifications
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-indigo-700 gap-1 h-7"
                onClick={() => setView('notifications')}
              >
                All <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {unreadNotifications.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">All caught up!</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {unreadNotifications.map((n) => (
                    <div key={n.id} className="p-3 flex gap-2.5">
                      <div
                        className={cn(
                          'size-2 rounded-full mt-1.5 shrink-0',
                          n.type === 'warning' ? 'bg-amber-500' : n.type === 'ai' ? 'bg-purple-500' : n.type === 'system' ? 'bg-blue-500' : 'bg-indigo-500'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 dark:text-white">{n.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{formatRelative(n.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit log */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <ScrollText className="size-4 text-indigo-600" />
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-indigo-700 gap-1 h-7"
                onClick={() => setView('audit-log')}
              >
                All <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentAudit.map((e) => (
                  <div key={e.id} className="p-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-mono text-indigo-700 dark:text-indigo-400">
                        {e.action}
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-auto">
                        {formatRelative(e.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">{e.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          icon={<Inbox className="size-5" />}
          label="View Inquiries"
          desc={`${stats.total} total`}
          onClick={() => setView('inquiries')}
        />
        <QuickAction
          icon={<Bell className="size-5" />}
          label="Notifications"
          desc={`${notifications.filter((n) => !n.read).length} unread`}
          onClick={() => setView('notifications')}
        />
        <QuickAction
          icon={<Sparkles className="size-5" />}
          label="AI Replay"
          desc="Draft replies"
          onClick={() => setView('ai-replay')}
        />
        <QuickAction
          icon={<ScrollText className="size-5" />}
          label="Audit Log"
          desc={`${auditLog.length} events`}
          onClick={() => setView('audit-log')}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  sub,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: 'indigo' | 'red' | 'purple' | 'violet';
  sub?: string;
  onClick?: () => void;
}) {
  const toneMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    purple: 'from-violet-500 to-fuchsia-600',
    violet: 'from-indigo-500 to-violet-600',
  };
  return (
    <button
      onClick={onClick}
      className="text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/10 transition-all"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'size-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0',
            toneMap[tone]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500 truncate">{label}</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
            {value}
          </p>
          {sub && <p className="text-[10px] text-zinc-400 truncate">{sub}</p>}
        </div>
      </div>
    </button>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center gap-2.5"
    >
      <div className="size-8 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">{label}</div>
        <div className="text-[11px] text-zinc-500 truncate">{desc}</div>
      </div>
    </button>
  );
}
