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
  urgent: 'bg-teal-600 text-white',
  high: 'bg-amber-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-teal-600 text-white',
};

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-teal-600 text-white border-zinc-900',
  Pricing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Partnership: 'bg-zinc-700/50 text-muted-foreground/50 border-border',
  'Technical Support': 'bg-zinc-700/50 text-muted-foreground/50 border-border',
  Onboarding: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Project Update': 'bg-zinc-700/50 text-muted-foreground/50 border-border',
  'Bug Report': 'bg-teal-600 text-white border-zinc-900',
  Billing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Meeting Request': 'bg-zinc-700/50 text-muted-foreground/50 border-border',
  'General Inquiry': 'bg-zinc-700/50 text-muted-foreground/50 border-border',
  ' Spam / Junk': 'bg-zinc-700 text-muted-foreground/70 border-border',
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
    openInquiryTab,
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
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Building2 className="size-3.5" />
            <span className="font-medium text-teal-400">ecomruns.com</span>
            <span className="text-muted-foreground/70">↔</span>
            <span className="font-medium text-teal-400">techichamps.com</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEmails(true)}
          disabled={loading}
          className="gap-2 h-8 border-border text-foreground hover:bg-muted"
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
          tone="black"
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
          tone="gray"
          sub={stats.topCat ? `Top: ${stats.topCat[0].trim()}` : '—'}
          onClick={() => setView('inquiries')}
        />
        <StatCard
          label="AI Model"
          value="DeepSeek V3.1"
          icon={<Sparkles className="size-5" />}
          tone="darkgray"
          sub="via OpenRouter"
          onClick={() => setView('ai-eval')}
        />
      </div>

      {/* Two-column: recent inquiries + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent inquiries */}
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader className="py-3 px-4 border-b border-border/50 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Mail className="size-4 text-foreground" />
                Recent Inquiries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-foreground gap-1 h-7"
                onClick={() => setView('inquiries')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading && inquiries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                  Loading…
                </div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Inbox className="size-8 mx-auto mb-2 opacity-30" />
                  No inquiries yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        openInquiryTab(e.id, e.uid, e.subject || '(no subject)');
                      }}
                      className="w-full text-left p-3 hover:bg-muted/50 flex gap-3"
                    >
                      <div className="size-9 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {(e.fromName || e.from)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground truncate">
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
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{e.summary}</p>
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
                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
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
          <Card className="border-border mt-4">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-foreground" />
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
                        <span className="text-muted-foreground">{cat.trim()}</span>
                        <span className="text-muted-foreground font-mono">{n}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-teal-700 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(stats.catCounts).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel: notifications + audit */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card className="border-border">
            <CardHeader className="py-3 px-4 border-b border-border/50 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Bell className="size-4 text-foreground" />
                Notifications
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-foreground gap-1 h-7"
                onClick={() => setView('notifications')}
              >
                All <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {unreadNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">All caught up!</p>
              ) : (
                <div className="divide-y divide-border">
                  {unreadNotifications.map((n) => (
                    <div key={n.id} className="p-3 flex gap-2.5">
                      <div
                        className={cn(
                          'size-2 rounded-full mt-1.5 shrink-0',
                          n.type === 'warning' ? 'bg-muted/500' : n.type === 'ai' ? 'bg-zinc-900' : n.type === 'system' ? 'bg-zinc-600' : 'bg-zinc-400'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{formatRelative(n.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit log */}
          <Card className="border-border">
            <CardHeader className="py-3 px-4 border-b border-border/50 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ScrollText className="size-4 text-foreground" />
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-foreground gap-1 h-7"
                onClick={() => setView('audit-log')}
              >
                All <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentAudit.map((e) => (
                  <div key={e.id} className="p-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-mono text-teal-400">
                        {e.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 ml-auto">
                        {formatRelative(e.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{e.note}</p>
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
  tone: 'black' | 'red' | 'gray' | 'darkgray';
  sub?: string;
  onClick?: () => void;
}) {
  const toneMap = {
    black: 'from-teal-600 to-teal-700',
    red: 'from-red-500 to-rose-600',
    gray: 'from-amber-500 to-orange-600',
    darkgray: 'from-violet-500 to-purple-600',
  };
  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-xl p-4 hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/10 transition-all"
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
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground leading-tight truncate">
            {value}
          </p>
          {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
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
      className="text-left bg-card border border-border rounded-xl p-3 hover:border-teal-500/50 hover:bg-muted/40 transition-all flex items-center gap-2.5"
    >
      <div className="size-8 rounded-md bg-muted/60 text-teal-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
    </button>
  );
}
