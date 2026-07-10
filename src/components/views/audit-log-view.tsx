'use client';

import { useMemo, useState } from 'react';
import { ScrollText, Search, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function actionColor(action: string): string {
  if (action.startsWith('ai.')) return 'bg-zinc-700/50 text-gray-300 border-[#e5e7eb]';
  if (action.startsWith('imap.')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (action.startsWith('auth.')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (action.startsWith('notification.')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (action.startsWith('routing.')) return 'bg-zinc-700/50 text-gray-300 border-[#e5e7eb]';
  return 'bg-gray-50 text-gray-500 border-[#e5e7eb]';
}

export function AuditLogView() {
  const { auditLog } = useAppStore();
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('all');

  const entityTypes = useMemo(() => {
    const s = new Set(auditLog.map((e) => e.entity));
    return ['all', ...Array.from(s).sort()];
  }, [auditLog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLog.filter((e) => {
      if (entityType !== 'all' && e.entity !== entityType) return false;
      if (q) {
        const hay = `${e.actor} ${e.action} ${e.entity} ${e.entityId} ${e.note}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditLog, search, entityType]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="size-6 text-gray-900" />
          Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Complete record of significant system events. CEO and Manager access only.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-[#e5e7eb]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search actor, action, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-[13px]"
              />
            </div>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-500"
            >
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All entity types' : t}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-500"
            />
            <input
              type="date"
              className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Count */}
      <div className="text-[13px] text-gray-500 flex items-center gap-2">
        <Clock className="size-3.5" />
        {filtered.length} / {auditLog.length} entries
      </div>

      {/* Table */}
      <Card className="border-[#e5e7eb] overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-[#e5e7eb]">
          <CardTitle className="text-sm font-semibold text-gray-500">
            System Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e7eb]">
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap">
                    Actor
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap">
                    Action
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap">
                    Entity
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap">
                    Entity ID
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-3 py-2.5">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      <ScrollText className="size-8 mx-auto mb-2 opacity-30" />
                      No entries match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap font-mono text-[12px]">
                        {formatTimestamp(e.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        {e.actor}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-mono ${actionColor(e.action)}`}
                        >
                          {e.action}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {e.entity}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-[12px] whitespace-nowrap">
                        {e.entityId}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{e.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
