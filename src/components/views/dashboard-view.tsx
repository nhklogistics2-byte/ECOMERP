'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Inbox,
  Activity,
  ArrowRight,
  Bell,
  ScrollText,
  Sparkles,
  Repeat2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Mail,
  Building2,
  Zap,
  Server,
  Timer,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-amber-500 text-white',
  medium: 'bg-blue-500 text-white',
  low: 'bg-gray-400 text-white',
};

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-blue-100 text-blue-700 border-blue-200',
  Pricing: 'bg-amber-100 text-amber-700 border-amber-200',
  Partnership: 'bg-violet-100 text-violet-700 border-violet-200',
  'Technical Support': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Onboarding: 'bg-green-100 text-green-700 border-green-200',
  'Project Update': 'bg-sky-100 text-sky-700 border-sky-200',
  'Bug Report': 'bg-red-100 text-red-700 border-red-200',
  Billing: 'bg-orange-100 text-orange-700 border-orange-200',
  'Meeting Request': 'bg-pink-100 text-pink-700 border-pink-200',
  'General Inquiry': 'bg-gray-100 text-gray-700 border-gray-200',
  'Spam / Junk': 'bg-gray-200 text-gray-500 border-gray-300',
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

function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Circular progress chart component
function CircularProgress({
  value,
  max,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-20">
        <svg className="size-20 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[16px] font-bold text-gray-900">{pct}%</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-gray-700 mt-1.5">{label}</p>
      <p className="text-[10px] text-gray-500">{sublabel}</p>
    </div>
  );
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
        const url = `/api/emails?force=${force ? '1' : '0'}&limit=100`;
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
    const pendingReview = inquiries.filter(
      (e) => e.priority === 'urgent' || e.priority === 'high'
    ).length;
    const catCounts: Record<string, number> = {};
    for (const e of inquiries) {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    }
    return { total, pendingReview, catCounts };
  }, [inquiries]);

  const recent = useMemo(() => inquiries.slice(0, 5), [inquiries]);
  const recentAudit = useMemo(() => auditLog.slice(0, 5), [auditLog]);
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).slice(0, 3),
    [notifications]
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-gray-50 min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Executive overview of AI email inquiries and system performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEmails(true)}
          disabled={loading}
          className="gap-2 h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Sync Now
        </Button>
      </div>

      {/* Stats cards row — with line graphs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total Inquiries"
          value={stats.total}
          graphData={[12, 18, 15, 22, 28, 25, 32, 35, 30, 38, 42, stats.total || 44]}
          graphColor="#8b5cf6"
          trend="+18%"
          trendUp
        />
        <StatCard
          label="Pending Review"
          value={stats.pendingReview}
          graphData={[5, 8, 6, 10, 12, 9, 14, 11, 16, 13, 15, stats.pendingReview || 18]}
          graphColor="#f59e0b"
          trend="+7%"
          trendUp
        />
        <StatCard
          label="Routing Health"
          value="98.6%"
          graphData={[94, 95, 96, 97, 96, 98, 97, 98, 99, 98, 98.6, 98.6]}
          graphColor="#10b981"
          trend="+2.4%"
          trendUp
        />
        <StatCard
          label="Active AI Models"
          value={8}
          graphData={[3, 4, 5, 6, 6, 7, 7, 8, 8, 8, 8, 8]}
          graphColor="#3b82f6"
          trend="0%"
        />
        <StatCard
          label="System Health"
          value="Healthy"
          graphData={[99, 99, 98, 99, 100, 99, 100, 99, 100, 100, 99, 100]}
          graphColor="#22c55e"
          trend="Operational"
          isText
        />
      </div>

      {/* Two-column: recent inquiries + audit log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Inquiries */}
        <div className="lg:col-span-2">
          <Card className="border-[#e5e7eb] shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-[#e5e7eb] flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="size-4 text-blue-600" />
                Recent Inquiries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-blue-600 gap-1 h-7"
                onClick={() => setView('inquiries')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading && inquiries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading…
                </div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Inbox className="size-8 mx-auto mb-2 opacity-30" />
                  No inquiries yet
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                        <th className="text-left font-semibold px-3 py-2 w-[60px]">Ref</th>
                        <th className="text-left font-semibold px-3 py-2">Subject</th>
                        <th className="text-left font-semibold px-3 py-2 w-[120px]">Department</th>
                        <th className="text-left font-semibold px-3 py-2 w-[80px]">Status</th>
                        <th className="text-left font-semibold px-3 py-2 w-[100px]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recent.map((e, i) => (
                        <tr
                          key={e.id}
                          onClick={() => openInquiryTab(e.id, e.uid, e.subject || '(no subject)')}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-[11px] text-gray-500">
                            #{String(i + 1).padStart(3, '0')}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-900 truncate max-w-[200px]">
                              {e.subject || '(no subject)'}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate max-w-[200px]">
                              {e.from}
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
                          <td className="px-3 py-2.5 text-[11px] text-gray-500 whitespace-nowrap">
                            {formatRelative(e.receivedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-3 py-2 border-t border-[#e5e7eb] text-[11px] text-gray-500 flex items-center justify-between">
                <span>Showing {Math.min(5, inquiries.length)} of {inquiries.length}</span>
                <button
                  onClick={() => setView('inquiries')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  View all →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Audit Log */}
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[#e5e7eb] flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="size-4 text-blue-600" />
              Live Audit Log
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[12px] text-blue-600 gap-1 h-7"
              onClick={() => setView('audit-log')}
            >
              All <ArrowRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {recentAudit.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentAudit.map((e) => (
                  <div key={e.id} className="flex gap-2.5">
                    <div className="size-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <ScrollText className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-900 truncate">
                        {e.action}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{e.note}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatRelative(e.timestamp)} · {e.actor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Circular progress charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[#e5e7eb] flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">
              Routing Rules Overview
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[12px] text-blue-600 h-7"
              onClick={() => setView('audit-log')}
            >
              View all →
            </Button>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-around">
            <CircularProgress
              value={4}
              max={5}
              color="#10b981"
              label="Active Rules"
              sublabel="4 of 5 active"
            />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">1</p>
              <p className="text-[11px] text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
              <p className="text-[11px] text-gray-500">Errors</p>
            </div>
          </CardContent>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 text-[11px] text-green-600">
              <CheckCircle2 className="size-3" />
              All routing rules are active and healthy
            </div>
          </div>
        </Card>

        <Card className="border-[#e5e7eb] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[#e5e7eb] flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">
              AI Evaluation Summary
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[12px] text-blue-600 h-7"
              onClick={() => setView('ai-eval')}
            >
              Run evaluation →
            </Button>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-around">
            <CircularProgress
              value={92}
              max={100}
              color="#3b82f6"
              label="Quality"
              sublabel="Extraction accuracy"
            />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">1.8s</p>
              <p className="text-[11px] text-gray-500">Latency</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">$0.02</p>
              <p className="text-[11px] text-gray-500">Cost/req</p>
            </div>
          </CardContent>
          <div className="px-4 pb-3">
            <p className="text-[11px] text-gray-500">
              Last run: Today, 09:58 PM · 2 models evaluated
            </p>
          </div>
        </Card>

        <Card className="border-[#e5e7eb] shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-[#e5e7eb] flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">
              AI Replay Summary
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[12px] text-blue-600 h-7"
              onClick={() => setView('ai-replay')}
            >
              Start replay →
            </Button>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-around">
            <CircularProgress
              value={18}
              max={20}
              color="#10b981"
              label="Completed"
              sublabel="18 of 20 runs"
            />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">2</p>
              <p className="text-[11px] text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
              <p className="text-[11px] text-gray-500">Failed</p>
            </div>
          </CardContent>
          <div className="px-4 pb-3">
            <p className="text-[11px] text-gray-500">
              Last replay: Today, 10:00 PM · 2 models
            </p>
          </div>
        </Card>
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FooterStat
          icon={<Server className="size-4" />}
          label="IMAP Polling"
          value="Active"
          sub="Last poll: 10:12 PM"
          color="green"
        />
        <FooterStat
          icon={<Zap className="size-4" />}
          label="Queue Depth"
          value="12"
          sub="pending items"
          color="blue"
        />
        <FooterStat
          icon={<Timer className="size-4" />}
          label="Avg Response"
          value="1.8s"
          sub="last 5 min"
          color="violet"
        />
        <FooterStat
          icon={<Gauge className="size-4" />}
          label="Uptime"
          value="99.98%"
          sub="last 30 days"
          color="teal"
        />
        <FooterStat
          icon={<CheckCircle2 className="size-4" />}
          label="System Status"
          value="Operational"
          sub="all systems"
          color="green"
        />
      </div>
    </div>
  );
}

// Mini SVG line graph (sparkline) component
function Sparkline({
  data,
  color,
  width = 100,
  height = 36,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  const gradId = `spark-grad-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  graphData,
  graphColor,
  trend,
  trendUp,
  isText,
}: {
  label: string;
  value: number | string;
  graphData: number[];
  graphColor: string;
  trend: string;
  trendUp?: boolean;
  isText?: boolean;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Top: label + trend */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        {trend && (
          <span
            className={cn(
              'text-[10px] font-medium flex items-center gap-0.5',
              isText ? 'text-green-600' : trendUp ? 'text-green-600' : 'text-gray-400'
            )}
          >
            {trendUp && <TrendingUp className="size-3" />}
            {trend}
          </span>
        )}
      </div>
      {/* Value */}
      <p className={cn('font-bold text-gray-900 leading-tight', isText ? 'text-[15px]' : 'text-2xl')}>
        {value}
      </p>
      {/* Line graph */}
      <div className="mt-2 flex items-end justify-end">
        <Sparkline data={graphData} color={graphColor} width={100} height={32} />
      </div>
    </div>
  );
}

function FooterStat({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'green' | 'blue' | 'violet' | 'teal';
}) {
  const colorMap = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
    teal: 'bg-teal-100 text-blue-600',
  };
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
      <div className={cn('size-8 rounded-md flex items-center justify-center shrink-0', colorMap[color])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-[14px] font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-[10px] text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  );
}
