'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, X, Loader2, TrendingUp, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { SalesLead, LeadSource, LeadStage } from '@/lib/types';

const STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const SOURCES: LeadSource[] = ['website', 'email', 'referral', 'cold-call', 'event', 'other'];

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  proposal: 'bg-amber-100 text-amber-700 border-amber-200',
  negotiation: 'bg-purple-100 text-purple-700 border-purple-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export function SalesLeadsView() {
  const { salesLeads, fetchSalesLeads, addSalesLead, updateSalesLead, removeSalesLead, addAuditEntry } =
    useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | LeadStage>('all');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    source: 'website' as LeadSource,
    stage: 'new' as LeadStage,
    value: 0,
    probability: 10,
    ownerName: '',
    notes: '',
    expectedCloseDate: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSalesLeads();
      setLoading(false);
    })();
  }, [fetchSalesLeads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salesLeads.filter((l) => {
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
      if (q) {
        const hay = `${l.company} ${l.contact} ${l.email} ${l.ownerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [salesLeads, search, stageFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, SalesLead[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    filtered.forEach((l) => {
      if (map[l.stage]) map[l.stage].push(l);
    });
    return map;
  }, [filtered]);

  const handleAdd = async () => {
    if (!newLead.company) {
      toast.warning('Company name is required');
      return;
    }
    try {
      await addSalesLead({
        ...newLead,
        ownerId: null,
        value: Number(newLead.value) || 0,
        probability: Number(newLead.probability) || 0,
      });
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'sales.lead_add',
        entity: 'sales_lead',
        entityId: `sl-${Date.now()}`,
        note: `Added lead "${newLead.company}" (${formatPKR(Number(newLead.value) || 0)})`,
      });
      toast.success(`Lead for ${newLead.company} created`);
      setNewLead({
        company: '',
        contact: '',
        email: '',
        phone: '',
        source: 'website',
        stage: 'new',
        value: 0,
        probability: 10,
        ownerName: '',
        notes: '',
        expectedCloseDate: '',
      });
      setShowForm(false);
    } catch (e) {
      toast.error('Failed to create lead', { description: (e as Error).message });
    }
  };

  const handleStageChange = async (id: string, company: string, stage: LeadStage) => {
    try {
      const patch: Partial<SalesLead> = { stage };
      // auto-adjust probability based on stage
      const probMap: Record<LeadStage, number> = {
        new: 10,
        contacted: 20,
        qualified: 40,
        proposal: 60,
        negotiation: 80,
        won: 100,
        lost: 0,
      };
      patch.probability = probMap[stage];
      await updateSalesLead(id, patch);
      addAuditEntry({
        actor: 'ceo@ecomruns.com',
        action: 'sales.lead_stage',
        entity: 'sales_lead',
        entityId: id,
        note: `Moved "${company}" to ${stage}`,
      });
      toast.success(`"${company}" → ${stage}`);
    } catch (e) {
      toast.error('Failed to update stage', { description: (e as Error).message });
    }
  };

  const handleDelete = async (id: string, company: string) => {
    if (!confirm(`Delete lead "${company}"?`)) return;
    try {
      await removeSalesLead(id);
      toast.success(`Lead "${company}" deleted`);
    } catch (e) {
      toast.error('Failed to delete', { description: (e as Error).message });
    }
  };

  const totalPipeline = filtered
    .filter((l) => !['won', 'lost'].includes(l.stage))
    .reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="size-6 text-blue-600" />
            Sales Leads
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} leads · Pipeline value: <span className="font-semibold text-blue-700">{formatPKR(totalPipeline)}</span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-2 h-8 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="size-3.5" />
          New Lead
        </Button>
      </div>

      {/* Filters + view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search company, contact, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as 'all' | LeadStage)}
          className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-700"
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <div className="flex rounded-md border border-[#e5e7eb] overflow-hidden">
          <button
            onClick={() => setView('board')}
            className={cn(
              'px-3 h-9 text-[12px] font-medium',
              view === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            )}
          >
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-3 h-9 text-[12px] font-medium',
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            )}
          >
            List
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-12 text-center">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-500">Loading leads…</p>
        </div>
      ) : view === 'board' ? (
        // Kanban board
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const leads = grouped[stage] || [];
            const stageValue = leads.reduce((s, l) => s + (l.value || 0), 0);
            return (
              <div key={stage} className="w-[260px] shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize',
                        STAGE_COLORS[stage]
                      )}
                    >
                      {stage}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">{leads.length}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {stageValue >= 1000000
                      ? `${(stageValue / 1000000).toFixed(1)}M`
                      : stageValue >= 1000
                      ? `${(stageValue / 1000).toFixed(0)}K`
                      : stageValue}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {leads.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-md p-4 text-center text-[11px] text-gray-400">
                      Empty
                    </div>
                  ) : (
                    leads.map((l) => (
                      <div
                        key={l.id}
                        className="bg-white border border-[#e5e7eb] rounded-md p-2.5 space-y-1.5 hover:shadow-sm transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-[12px] font-semibold text-gray-900 truncate">{l.company}</h4>
                          <button
                            onClick={() => handleDelete(l.id, l.company)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{l.contact || '—'}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-semibold text-gray-900">
                            {formatPKR(l.value)}
                          </span>
                          <span className="text-[10px] text-gray-500">{l.probability}%</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {l.ownerName ? `@${l.ownerName}` : 'Unassigned'}
                        </div>
                        {/* Move-to-stage selector */}
                        <select
                          value={l.stage}
                          onChange={(e) => handleStageChange(l.id, l.company, e.target.value as LeadStage)}
                          className="w-full text-[10px] rounded border border-gray-200 bg-white px-1.5 py-0.5"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              → {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List view
        <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="text-left font-semibold px-3 py-2.5">Company</th>
                  <th className="text-left font-semibold px-3 py-2.5">Contact</th>
                  <th className="text-left font-semibold px-3 py-2.5">Source</th>
                  <th className="text-left font-semibold px-3 py-2.5">Stage</th>
                  <th className="text-right font-semibold px-3 py-2.5">Value</th>
                  <th className="text-center font-semibold px-3 py-2.5">Prob.</th>
                  <th className="text-left font-semibold px-3 py-2.5">Owner</th>
                  <th className="text-left font-semibold px-3 py-2.5">Close Date</th>
                  <th className="text-right font-semibold px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      <TrendingUp className="size-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No leads found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-blue-50/40">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{l.company}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] text-gray-700">{l.contact || '—'}</div>
                        <div className="text-[11px] text-gray-500">{l.email || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-gray-600">{l.source.replace('-', ' ')}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                            STAGE_COLORS[l.stage]
                          )}
                        >
                          {l.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-gray-900">
                        {formatPKR(l.value)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[12px] text-gray-700">
                        {l.probability}%
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{l.ownerName || '—'}</td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600">{l.expectedCloseDate || '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => handleDelete(l.id, l.company)}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">New Sales Lead</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Company *</label>
                <Input
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  placeholder="Acme Corp"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Contact</label>
                <Input
                  value={newLead.contact}
                  onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })}
                  placeholder="John Doe"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Email</label>
                <Input
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="john@acme.com"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Phone</label>
                <Input
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+92-300-XXXXXXX"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value as LeadSource })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Owner</label>
                <Input
                  value={newLead.ownerName}
                  onChange={(e) => setNewLead({ ...newLead, ownerName: e.target.value })}
                  placeholder="Sales rep name"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Value (PKR)</label>
                <Input
                  type="number"
                  value={newLead.value || ''}
                  onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })}
                  placeholder="0"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Probability (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newLead.probability}
                  onChange={(e) => setNewLead({ ...newLead, probability: Number(e.target.value) })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Expected close date</label>
                <Input
                  type="date"
                  value={newLead.expectedCloseDate}
                  onChange={(e) => setNewLead({ ...newLead, expectedCloseDate: e.target.value })}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase">Notes</label>
                <Input
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
