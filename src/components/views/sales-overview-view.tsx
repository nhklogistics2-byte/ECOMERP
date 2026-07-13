'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, Trophy, DollarSign, Loader2, Target, Award } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal: 'bg-amber-100 text-amber-700',
  negotiation: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export function SalesOverviewView() {
  const { salesLeads, fetchSalesLeads, employees, fetchEmployees } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchSalesLeads(), fetchEmployees()]);
      setLoading(false);
    })();
  }, [fetchSalesLeads, fetchEmployees]);

  const salesTeam = useMemo(
    () => employees.filter((e) => e.department.toLowerCase() === 'sales'),
    [employees]
  );

  const stats = useMemo(() => {
    const total = salesLeads.length;
    const won = salesLeads.filter((l) => l.stage === 'won').length;
    const lost = salesLeads.filter((l) => l.stage === 'lost').length;
    const open = total - won - lost;
    const pipelineValue = salesLeads
      .filter((l) => !['won', 'lost'].includes(l.stage))
      .reduce((sum, l) => sum + (l.value || 0), 0);
    const wonValue = salesLeads.filter((l) => l.stage === 'won').reduce((sum, l) => sum + (l.value || 0), 0);
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    return { total, won, lost, open, pipelineValue, wonValue, conversionRate };
  }, [salesLeads]);

  const byStage = useMemo(() => {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    return stages.map((stage) => ({
      stage,
      count: salesLeads.filter((l) => l.stage === stage).length,
      value: salesLeads
        .filter((l) => l.stage === stage)
        .reduce((sum, l) => sum + (l.value || 0), 0),
    }));
  }, [salesLeads]);

  const topLeads = useMemo(
    () => [...salesLeads].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5),
    [salesLeads]
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="size-6 text-blue-600" />
          Sales Department
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pipeline overview · {salesTeam.length} sales reps · {stats.total} leads · {stats.open} open
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Open Leads" value={String(stats.open)} color="blue" />
        <StatCard icon={DollarSign} label="Pipeline Value" value={formatPKR(stats.pipelineValue)} color="amber" />
        <StatCard icon={Trophy} label="Won (PKR)" value={formatPKR(stats.wonValue)} color="green" />
        <StatCard icon={Target} label="Conversion" value={`${stats.conversionRate}%`} color="purple" />
      </div>

      {/* Pipeline stages */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline by Stage</h3>
        <div className="grid grid-cols-7 gap-2">
          {byStage.map((s) => (
            <div key={s.stage} className="text-center">
              <div className="bg-gray-50 rounded-md p-2 mb-1">
                <div
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mb-1',
                    STAGE_COLORS[s.stage]
                  )}
                >
                  {STAGE_LABELS[s.stage]}
                </div>
                <div className="text-[18px] font-bold text-gray-900">{s.count}</div>
                <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                  {s.value >= 1000000
                    ? `${(s.value / 1000000).toFixed(1)}M`
                    : s.value >= 1000
                    ? `${(s.value / 1000).toFixed(0)}K`
                    : s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top leads + Sales team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Award className="size-3.5 text-amber-500" />
            Top 5 Leads by Value
          </h3>
          {topLeads.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No leads yet</p>
          ) : (
            <div className="space-y-2">
              {topLeads.map((l, i) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate">{l.company}</div>
                      <div className="text-[11px] text-gray-500">
                        {l.contact || '—'} · {STAGE_LABELS[l.stage]}
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-mono font-semibold text-gray-900 shrink-0">
                    {formatPKR(l.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sales Team</h3>
          {salesTeam.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No sales reps yet — add employees with the “Sales” department.
            </p>
          ) : (
            <div className="space-y-2">
              {salesTeam.map((m) => {
                const repLeads = salesLeads.filter((l) => l.ownerName === m.name);
                const repWon = repLeads.filter((l) => l.stage === 'won').length;
                const repPipeline = repLeads
                  .filter((l) => !['won', 'lost'].includes(l.stage))
                  .reduce((s, l) => s + (l.value || 0), 0);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {m.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-900 truncate">{m.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {repLeads.length} leads · {repWon} won · {formatPKR(repPipeline)} pipeline
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
      <div className={cn('size-8 rounded-md flex items-center justify-center', colorMap[color])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase truncate">{label}</p>
        <p className="text-[14px] font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
