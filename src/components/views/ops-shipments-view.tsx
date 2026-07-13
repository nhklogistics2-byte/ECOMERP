'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, X, Loader2, Truck, Trash2, Ship, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Shipment, ShipmentMode, ShipmentStatus } from '@/lib/types';

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

const STATUSES: ShipmentStatus[] = [
  'pending',
  'picked-up',
  'in-transit',
  'customs',
  'out-for-delivery',
  'delivered',
  'delayed',
  'cancelled',
];

const MODES: ShipmentMode[] = ['sea', 'air', 'road', 'rail'];
const CARRIERS = ['DHL', 'FedEx', 'Aramex', 'UPS', 'TCS', 'Local', 'Other'];

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sea: Ship,
  air: Plane,
  road: Truck,
  rail: Truck,
};

function genTracking(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `TRK${out}`;
}

export function OpsShipmentsView() {
  const { shipments, fetchShipments, addShipment, updateShipment, removeShipment, addAuditEntry } =
    useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newShip, setNewShip] = useState({
    trackingNumber: '',
    shipmentNumber: '',
    origin: '',
    destination: '',
    customer: '',
    carrier: 'DHL',
    mode: 'sea' as ShipmentMode,
    status: 'pending' as ShipmentStatus,
    weightKg: 0,
    packages: 1,
    eta: '',
    shippedAt: '',
    notes: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchShipments();
      setLoading(false);
    })();
  }, [fetchShipments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q) {
        const hay = `${s.trackingNumber} ${s.shipmentNumber} ${s.customer} ${s.origin} ${s.destination} ${s.carrier}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shipments, search, statusFilter]);

  const handleAdd = async () => {
    if (!newShip.trackingNumber) {
      toast.warning('Tracking number is required');
      return;
    }
    try {
      await addShipment({
        ...newShip,
        deliveredAt: '',
        weightKg: Number(newShip.weightKg) || 0,
        packages: Number(newShip.packages) || 1,
      });
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'ops.shipment_add',
        entity: 'shipment',
        entityId: `sh-${Date.now()}`,
        note: `Created shipment ${newShip.trackingNumber} → ${newShip.destination}`,
      });
      toast.success(`Shipment ${newShip.trackingNumber} created`);
      setNewShip({
        trackingNumber: '',
        shipmentNumber: '',
        origin: '',
        destination: '',
        customer: '',
        carrier: 'DHL',
        mode: 'sea',
        status: 'pending',
        weightKg: 0,
        packages: 1,
        eta: '',
        shippedAt: '',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      toast.error('Failed to create shipment', { description: (e as Error).message });
    }
  };

  const handleStatusChange = async (id: string, tracking: string, status: ShipmentStatus) => {
    try {
      const patch: Partial<Shipment> = { status };
      if (status === 'delivered') {
        patch.deliveredAt = new Date().toISOString().slice(0, 10);
      }
      await updateShipment(id, patch);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'ops.shipment_status',
        entity: 'shipment',
        entityId: id,
        note: `Shipment ${tracking} → ${status}`,
      });
      toast.success(`Shipment ${tracking} marked as ${status}`);
    } catch (e) {
      toast.error('Failed to update status', { description: (e as Error).message });
    }
  };

  const handleDelete = async (id: string, tracking: string) => {
    if (!confirm(`Delete shipment ${tracking}?`)) return;
    try {
      await removeShipment(id);
      toast.success(`Shipment ${tracking} deleted`);
    } catch (e) {
      toast.error('Failed to delete', { description: (e as Error).message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="size-6 text-orange-600" />
            Shipments
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {shipments.length} shipments
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-2 h-8 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus className="size-3.5" />
          New Shipment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search tracking #, customer, origin, destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-700"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                <th className="text-left font-semibold px-3 py-2.5">Tracking #</th>
                <th className="text-left font-semibold px-3 py-2.5">Route</th>
                <th className="text-left font-semibold px-3 py-2.5">Customer</th>
                <th className="text-left font-semibold px-3 py-2.5">Carrier</th>
                <th className="text-center font-semibold px-3 py-2.5">Mode</th>
                <th className="text-right font-semibold px-3 py-2.5">Weight</th>
                <th className="text-center font-semibold px-3 py-2.5">Pkgs</th>
                <th className="text-left font-semibold px-3 py-2.5">ETA</th>
                <th className="text-left font-semibold px-3 py-2.5">Status</th>
                <th className="text-right font-semibold px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading shipments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    <Truck className="size-8 mx-auto mb-2 opacity-30 text-orange-400" />
                    <p className="font-medium">No shipments found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const ModeIcon = MODE_ICONS[s.mode] || Truck;
                  return (
                    <tr key={s.id} className="hover:bg-orange-50/40 transition-colors group">
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-[12px] font-semibold text-gray-900">
                          {s.trackingNumber}
                        </div>
                        {s.shipmentNumber && (
                          <div className="font-mono text-[10px] text-gray-500">{s.shipmentNumber}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] text-gray-700">{s.origin || '—'}</div>
                        <div className="text-[11px] text-gray-500">→ {s.destination || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{s.customer || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{s.carrier || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <ModeIcon className="size-4 text-orange-500 mx-auto" />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-gray-700">
                        {s.weightKg} kg
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[12px] text-gray-700">
                        {s.packages}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                        {s.eta || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                              STATUS_COLORS[s.status]
                            )}
                          >
                            {s.status.replace('-', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={s.status}
                            onChange={(e) =>
                              handleStatusChange(s.id, s.trackingNumber, e.target.value as ShipmentStatus)
                            }
                            className="text-[10px] rounded border border-gray-200 bg-white px-1 py-0.5"
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>
                                → {st.replace('-', ' ')}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDelete(s.id, s.trackingNumber)}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shipment Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">New Shipment</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Tracking # *</label>
                <div className="flex gap-1">
                  <Input
                    value={newShip.trackingNumber}
                    onChange={(e) => setNewShip({ ...newShip, trackingNumber: e.target.value })}
                    placeholder="TRK…"
                    className="h-8 text-[13px] font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setNewShip({ ...newShip, trackingNumber: genTracking() })}
                  >
                    Gen
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Internal ref #</label>
                <Input
                  value={newShip.shipmentNumber}
                  onChange={(e) => setNewShip({ ...newShip, shipmentNumber: e.target.value })}
                  placeholder="SHP-001"
                  className="h-8 text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Origin</label>
                <Input
                  value={newShip.origin}
                  onChange={(e) => setNewShip({ ...newShip, origin: e.target.value })}
                  placeholder="Karachi, PK"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Destination</label>
                <Input
                  value={newShip.destination}
                  onChange={(e) => setNewShip({ ...newShip, destination: e.target.value })}
                  placeholder="Dubai, UAE"
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Customer</label>
                <Input
                  value={newShip.customer}
                  onChange={(e) => setNewShip({ ...newShip, customer: e.target.value })}
                  placeholder="Customer name"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Carrier</label>
                <select
                  value={newShip.carrier}
                  onChange={(e) => setNewShip({ ...newShip, carrier: e.target.value })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Mode</label>
                <select
                  value={newShip.mode}
                  onChange={(e) => setNewShip({ ...newShip, mode: e.target.value as ShipmentMode })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newShip.weightKg || ''}
                  onChange={(e) => setNewShip({ ...newShip, weightKg: Number(e.target.value) })}
                  placeholder="0"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Packages</label>
                <Input
                  type="number"
                  min={1}
                  value={newShip.packages}
                  onChange={(e) => setNewShip({ ...newShip, packages: Number(e.target.value) })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Shipped at</label>
                <Input
                  type="date"
                  value={newShip.shippedAt}
                  onChange={(e) => setNewShip({ ...newShip, shippedAt: e.target.value })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">ETA</label>
                <Input
                  type="date"
                  value={newShip.eta}
                  onChange={(e) => setNewShip({ ...newShip, eta: e.target.value })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Notes</label>
                <Input
                  value={newShip.notes}
                  onChange={(e) => setNewShip({ ...newShip, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 text-white">
                Create Shipment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
