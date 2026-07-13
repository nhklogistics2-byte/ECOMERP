'use client';

import { Users, Check, X, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  requestedAt: string;
}

const PENDING: PendingUser[] = [
  { id: 'u1', name: 'Bilal Ahmed', email: 'bilal@ecomruns.com', role: 'Sales Agent', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'u2', name: 'Ahsan Iqbal', email: 'ahsan@ecomruns.com', role: 'Sales Agent', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: 'u3', name: 'Moizuddin', email: 'moiz@ecomruns.com', role: 'Manager', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

function formatRelative(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return iso;
  }
}

export function PendingUsersView() {
  const { addAuditEntry } = useAppStore();

  const approve = (u: PendingUser) => {
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'user.approve',
      entity: 'user',
      entityId: u.id,
      note: `Approved ${u.email} as ${u.role}`,
    });
    toast.success(`Approved ${u.name}`);
  };

  const reject = (u: PendingUser) => {
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'user.reject',
      entity: 'user',
      entityId: u.id,
      note: `Rejected ${u.email}`,
    });
    toast.info(`Rejected ${u.name}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Approve or reject new account requests.</p>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                <th className="text-left font-semibold px-3 py-2.5">Name</th>
                <th className="text-left font-semibold px-3 py-2.5">Email</th>
                <th className="text-left font-semibold px-3 py-2.5">Role</th>
                <th className="text-left font-semibold px-3 py-2.5">Requested</th>
                <th className="text-right font-semibold px-3 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PENDING.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/40">
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 text-blue-600 text-[12px]">
                      <Mail className="size-3" />
                      {u.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary" className="text-[11px]">{u.role}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-[12px] whitespace-nowrap">
                    <Clock className="inline size-3 mr-1" />
                    {formatRelative(u.requestedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-7 text-[12px] gap-1 mr-1 text-green-600 border-green-300 hover:bg-green-50" onClick={() => approve(u)}>
                      <Check className="size-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[12px] gap-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => reject(u)}>
                      <X className="size-3" /> Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
