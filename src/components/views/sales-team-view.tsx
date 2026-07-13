'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Mail, Phone, Trophy, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  'on-leave': 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-200 text-gray-500',
};

function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export function SalesTeamView() {
  const { employees, fetchEmployees, salesLeads, fetchSalesLeads } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchSalesLeads()]);
      setLoading(false);
    })();
  }, [fetchEmployees, fetchSalesLeads]);

  const salesTeam = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => e.department.toLowerCase() === 'sales')
      .filter((e) => (q ? `${e.name} ${e.email} ${e.role}`.toLowerCase().includes(q) : true));
  }, [employees, search]);

  const stats = useMemo(() => {
    const total = salesTeam.length;
    const active = salesTeam.filter((e) => e.status === 'active').length;
    const onLeave = salesTeam.filter((e) => e.status === 'on-leave').length;
    const avgSalary =
      salesTeam.length > 0
        ? Math.round(salesTeam.reduce((s, e) => s + e.salary, 0) / salesTeam.length)
        : 0;
    return { total, active, onLeave, avgSalary };
  }, [salesTeam]);

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="size-6 text-blue-600" />
          Sales Team
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {stats.total} members · {stats.active} active · {stats.onLeave} on leave · Avg salary{' '}
          {formatPKR(stats.avgSalary)}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search sales reps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-[13px]"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-500">Loading team…</p>
        </div>
      ) : salesTeam.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <TrendingUp className="size-8 mx-auto mb-2 opacity-30 text-blue-400" />
          <p className="font-medium text-gray-700">No sales reps yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Add employees from HR → Employees with the “Sales” department.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {salesTeam.map((m) => {
            const repLeads = salesLeads.filter((l) => l.ownerName === m.name);
            const repWon = repLeads.filter((l) => l.stage === 'won').length;
            const repPipeline = repLeads
              .filter((l) => !['won', 'lost'].includes(l.stage))
              .reduce((s, l) => s + (l.value || 0), 0);
            const repWonValue = repLeads
              .filter((l) => l.stage === 'won')
              .reduce((s, l) => s + (l.value || 0), 0);

            return (
              <div key={m.id} className="bg-white border border-[#e5e7eb] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                    {m.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-gray-900 truncate">{m.name}</h3>
                    <p className="text-[12px] text-gray-500 truncate">{m.role}</p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0',
                      STATUS_COLORS[m.status]
                    )}
                  >
                    {m.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="space-y-1 text-[12px] text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3 text-gray-400" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3 text-gray-400" />
                    <span>{m.phone || '—'}</span>
                  </div>
                </div>
                {/* Sales stats */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-md p-2 text-center">
                  <div>
                    <div className="text-[15px] font-bold text-blue-700">{repLeads.length}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Leads</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-green-700">{repWon}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Won</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-amber-700 flex items-center justify-center gap-0.5">
                      <Trophy className="size-3" />
                      {repWonValue >= 1000000
                        ? `${(repWonValue / 1000000).toFixed(1)}M`
                        : repWonValue >= 1000
                        ? `${(repWonValue / 1000).toFixed(0)}K`
                        : repWonValue}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase">Won (PKR)</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[11px]">
                  <span className="text-gray-500">
                    Pipeline: <span className="font-mono font-semibold text-blue-700">{formatPKR(repPipeline)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
