'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Check,
  X,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { LeaveStatus, LeaveType } from '@/lib/types';

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  unpaid: 'Unpaid Leave',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

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

export function HrLeavesView() {
  const { leaveRequests, reviewLeaveRequest, addAuditEntry, addNotification } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leaveRequests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q) {
        const hay = `${r.employeeName} ${r.reason} ${r.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leaveRequests, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: leaveRequests.length,
      pending: leaveRequests.filter((r) => r.status === 'pending').length,
      approved: leaveRequests.filter((r) => r.status === 'approved').length,
      rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
    };
  }, [leaveRequests]);

  const handleReview = (id: string, status: 'approved' | 'rejected', name: string) => {
    reviewLeaveRequest(id, status, 'CEO');
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'hr.leave_review',
      entity: 'leave_request',
      entityId: id,
      note: `${status === 'approved' ? 'Approved' : 'Rejected'} leave for ${name}`,
    });
    addNotification({
      type: 'system',
      title: `Leave ${status}`,
      message: `${name}'s leave request has been ${status}`,
    });
    toast.success(`Leave ${status} for ${name}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {stats.pending} pending · {stats.approved} approved · {stats.rejected} rejected · {stats.total} total
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Total</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Pending</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
              <Check className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Approved</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
              <X className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Rejected</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search employee, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
                statusFilter === s
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Leave requests list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-[#e5e7eb]">
            <CardContent className="p-8 text-center text-gray-500">
              <CalendarDays className="size-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No leave requests found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.id} className="border-[#e5e7eb] shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                {/* Avatar */}
                <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {r.employeeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-gray-900">{r.employeeName}</span>
                    <span className="text-[11px] text-gray-500">·</span>
                    <span className="text-[11px] text-gray-600">{TYPE_LABELS[r.type]}</span>
                    <span className="text-[11px] text-gray-500">·</span>
                    <span className="text-[11px] text-gray-600">{r.days} day{r.days !== 1 ? 's' : ''}</span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto',
                        STATUS_STYLES[r.status]
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-600 mt-1">
                    {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                  </div>
                  <p className="text-[12px] text-gray-700 mt-1">{r.reason}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Applied {formatRelative(r.appliedAt)}
                    {r.reviewedBy && ` · Reviewed by ${r.reviewedBy}`}
                  </p>
                </div>
                {/* Actions for pending */}
                {r.status === 'pending' && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => handleReview(r.id, 'approved', r.employeeName)}
                    >
                      <Check className="size-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleReview(r.id, 'rejected', r.employeeName)}
                    >
                      <X className="size-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
