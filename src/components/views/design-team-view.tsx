'use client';

import { useEffect, useMemo, useState } from 'react';
import { Palette, Mail, Phone, Calendar, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  'on-leave': 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-200 text-gray-500',
};

function formatSalary(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export function DesignTeamView() {
  const { employees, fetchEmployees } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchEmployees();
      setLoading(false);
    })();
  }, [fetchEmployees]);

  const designTeam = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => e.department.toLowerCase() === 'design')
      .filter((e) => (q ? `${e.name} ${e.email} ${e.role}`.toLowerCase().includes(q) : true));
  }, [employees, search]);

  const stats = useMemo(
    () => ({
      total: designTeam.length,
      active: designTeam.filter((e) => e.status === 'active').length,
      onLeave: designTeam.filter((e) => e.status === 'on-leave').length,
      avgSalary:
        designTeam.length > 0
          ? Math.round(designTeam.reduce((s, e) => s + e.salary, 0) / designTeam.length)
          : 0,
    }),
    [designTeam]
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Palette className="size-6 text-purple-600" />
          Design Team
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {stats.total} members · {stats.active} active · {stats.onLeave} on leave · Avg salary{' '}
          {formatSalary(stats.avgSalary)}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search designers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-[13px]"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-purple-500" />
          <p className="text-sm text-gray-500">Loading team…</p>
        </div>
      ) : designTeam.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Palette className="size-8 mx-auto mb-2 opacity-30 text-purple-400" />
          <p className="font-medium text-gray-700">No designers yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Add employees from HR → Employees with the “Design” department.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {designTeam.map((m) => (
            <div key={m.id} className="bg-white border border-[#e5e7eb] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center shrink-0">
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
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3 text-gray-400" />
                  <span>Joined {m.joinDate || '—'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[11px]">
                <span className="text-gray-500">
                  Leaves: <span className="font-mono font-semibold text-gray-900">{m.leaveBalance}</span>
                </span>
                <span className="font-mono text-gray-700">{formatSalary(m.salary)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
