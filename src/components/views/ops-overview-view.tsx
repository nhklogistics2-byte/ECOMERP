'use client';

import { useEffect, useMemo, useState } from 'react';
import { Truck, Package, CheckCircle2, AlertTriangle, Loader2, Ship, Plane, TrainFront } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  'picked-up': 'bg-blue-100 text-blue-700',
  'in-transit': 'bg-indigo-100 text-indigo-700',
  customs: 'bg-amber-100 text-amber-700',
  'out-for-delivery': 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sea: Ship,
  air: Plane,
  road: Truck,
  rail: TrainFront,
};

export function OpsOverviewView() {
  const { shipments, fetchShipments, employees, fetchEmployees } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchShipments(), fetchEmployees()]);
      setLoading(false);
    })();
  }, [fetchShipments, fetchEmployees]);

  const opsTeam = useMemo(
    () => employees.filter((e) => e.department.toLowerCase() === 'operations'),
    [employees]
  );

  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter((s) =>
      ['picked-up', 'in-transit', 'customs', 'out-for-delivery'].includes(s.status)
    ).length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;
    const delayed = shipments.filter((s) => s.status === 'delayed').length;
    const totalWeight = shipments.reduce((sum, s) => sum + (s.weightKg || 0), 0);
    const totalPackages = shipments.reduce((sum, s) => sum + (s.packages || 0), 0);
    return { total, inTransit, delivered, delayed, totalWeight, totalPackages };
  }, [shipments]);

  const byMode = useMemo(() => {
    const map: Record<string, number> = { sea: 0, air: 0, road: 0, rail: 0 };
    shipments.forEach((s) => {
      if (map[s.mode] !== undefined) map[s.mode]++;
    });
    return Object.entries(map);
  }, [shipments]);

  const recent = useMemo(() => shipments.slice(0, 8), [shipments]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="size-6 text-orange-600" />
          Operations Department
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Shipment tracking overview · {opsTeam.length} team members · {stats.total} shipments
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Total Shipments" value={stats.total} color="orange" />
        <StatCard icon={Truck} label="In Transit" value={stats.inTransit} color="blue" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} color="green" />
        <StatCard icon={AlertTriangle} label="Delayed" value={stats.delayed} color="red" />
      </div>

      {/* Mode + weight stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Mode</h3>
          <div className="grid grid-cols-4 gap-2">
            {byMode.map(([mode, count]) => {
              const Icon = MODE_ICONS[mode] || Truck;
              return (
                <div key={mode} className="bg-gray-50 rounded-md p-3 text-center">
                  <Icon className="size-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-[18px] font-bold text-gray-900">{count}</div>
                  <div className="text-[10px] text-gray-500 uppercase">{mode}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Volume Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-500">Total Weight</span>
              <span className="text-[14px] font-mono font-semibold text-gray-900">
                {stats.totalWeight.toLocaleString('en-PK')} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-500">Total Packages</span>
              <span className="text-[14px] font-mono font-semibold text-gray-900">
                {stats.totalPackages.toLocaleString('en-PK')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-500">Delivery Rate</span>
              <span className="text-[14px] font-mono font-semibold text-green-700">
                {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-500">Delay Rate</span>
              <span className="text-[14px] font-mono font-semibold text-red-700">
                {stats.total > 0 ? Math.round((stats.delayed / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent shipments */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Shipments</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No shipments yet</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => {
              const ModeIcon = MODE_ICONS[s.mode] || Truck;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="size-8 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <ModeIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-gray-900 truncate">
                      {s.trackingNumber}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {s.origin || '—'} → {s.destination || '—'} · {s.customer || '—'}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0',
                      STATUS_COLORS[s.status]
                    )}
                  >
                    {s.status.replace('-', ' ')}
                  </span>
                  {s.eta && (
                    <span className="text-[11px] text-gray-500 shrink-0 hidden sm:block">
                      ETA: {s.eta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ops team */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Operations Team</h3>
        {opsTeam.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            No ops staff yet — add employees with the “Operations” department.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {opsTeam.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 bg-gray-50 rounded-md px-3 py-2 border border-gray-100"
              >
                <div className="size-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {m.avatar}
                </div>
                <div>
                  <div className="text-[12px] font-medium text-gray-900">{m.name}</div>
                  <div className="text-[10px] text-gray-500">{m.role}</div>
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
  color: 'orange' | 'blue' | 'green' | 'red';
}) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-600',
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
