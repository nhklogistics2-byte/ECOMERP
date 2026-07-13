'use client';

import { useEffect, useMemo, useState } from 'react';
import { Palette, FolderKanban, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  brief: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  revision: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  'on-hold': 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

export function DesignOverviewView() {
  const { designProjects, fetchDesignProjects, employees, fetchEmployees } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDesignProjects(), fetchEmployees()]);
      setLoading(false);
    })();
  }, [fetchDesignProjects, fetchEmployees]);

  const designTeam = useMemo(
    () => employees.filter((e) => e.department.toLowerCase() === 'design'),
    [employees]
  );

  const stats = useMemo(() => {
    const total = designProjects.length;
    const inProgress = designProjects.filter((p) => p.status === 'in-progress').length;
    const delivered = designProjects.filter((p) => p.status === 'delivered').length;
    const overdue = designProjects.filter(
      (p) => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'delivered'
    ).length;
    const avgProgress =
      total > 0 ? Math.round(designProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / total) : 0;
    return { total, inProgress, delivered, overdue, avgProgress };
  }, [designProjects]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    designProjects.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [designProjects]);

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
          <Palette className="size-6 text-purple-600" />
          Design Department
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Creative projects overview · {designTeam.length} team members · {stats.total} active projects
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.total} color="purple" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="blue" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} color="green" />
        <StatCard icon={AlertCircle} label="Overdue" value={stats.overdue} color="red" />
      </div>

      {/* Avg progress bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Average Project Progress</h3>
          <span className="text-sm font-bold text-purple-600">{stats.avgProgress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${stats.avgProgress}%` }}
          />
        </div>
      </div>

      {/* Projects by category + recent projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Projects by Category</h3>
          <div className="space-y-2">
            {byCategory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No projects yet</p>
            ) : (
              byCategory.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-[13px]">
                  <span className="capitalize text-gray-700">{cat.replace('-', ' ')}</span>
                  <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-500 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Projects</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {designProjects.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No projects yet</p>
            ) : (
              designProjects.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-gray-900 truncate">{p.title}</div>
                    <div className="text-[11px] text-gray-500">
                      {p.client || '—'} · {p.assigneeName || 'Unassigned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-[11px] font-mono text-gray-500">{p.progress}%</span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize',
                        STATUS_COLORS[p.status]
                      )}
                    >
                      {p.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Design team preview */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Design Team</h3>
        {designTeam.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            No designers yet — add employees with the “Design” department.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {designTeam.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 bg-gray-50 rounded-md px-3 py-2 border border-gray-100"
              >
                <div className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {m.avatar}
                </div>
                <div>
                  <div className="text-[12px] font-medium text-gray-900">{m.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {m.role} ·{' '}
                    <span className={cn('font-medium', PRIORITY_COLORS.medium)}>{m.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
  value: number;
  color: 'purple' | 'blue' | 'green' | 'red';
}) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
      <div className={cn('size-8 rounded-md flex items-center justify-center', colorMap[color])}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase">{label}</p>
        <p className="text-[15px] font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
