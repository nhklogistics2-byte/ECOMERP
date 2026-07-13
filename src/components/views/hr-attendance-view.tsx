'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Search,
  Clock,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { AttendanceStatus } from '@/lib/types';

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  'half-day': 'bg-blue-100 text-blue-700',
  remote: 'bg-violet-100 text-violet-700',
};

function todayStr(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function HrAttendanceView() {
  const { employees, attendance, fetchEmployees, fetchAttendance, checkIn, checkOut, addAuditEntry } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch real data from database on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchAttendance()]);
      setLoading(false);
    })();
  }, [fetchEmployees, fetchAttendance]);

  const today = new Date().toISOString().slice(0, 10);

  // Today's attendance records
  const todayRecords = useMemo(() => {
    return attendance.filter((a) => a.date === today);
  }, [attendance, today]);

  // Map employee ID → today's record
  const todayMap = useMemo(() => {
    const m = new Map<string, (typeof todayRecords)[0]>();
    for (const r of todayRecords) m.set(r.employeeId, r);
    return m;
  }, [todayRecords]);

  const activeEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => e.status !== 'inactive')
      .filter((e) => {
        if (!q) return true;
        return `${e.name} ${e.role} ${e.department}`.toLowerCase().includes(q);
      });
  }, [employees, search]);

  const stats = useMemo(() => {
    const present = todayRecords.filter((a) => a.status === 'present').length;
    const late = todayRecords.filter((a) => a.status === 'late').length;
    const remote = todayRecords.filter((a) => a.status === 'remote').length;
    const absent = employees.filter((e) => e.status === 'active' && !todayMap.has(e.id)).length;
    return { present, late, remote, absent, total: employees.filter((e) => e.status !== 'inactive').length };
  }, [todayRecords, employees, todayMap]);

  const handleCheckIn = async (employeeId: string, name: string) => {
    try {
      await checkIn(employeeId);
      addAuditEntry({
        actor: name,
        action: 'hr.check_in',
        entity: 'attendance',
        entityId: employeeId,
        note: `${name} checked in`,
      });
      toast.success(`${name} checked in`);
    } catch (e) {
      toast.error('Check-in failed', { description: (e as Error).message });
    }
  };

  const handleCheckOut = async (employeeId: string, name: string) => {
    try {
      await checkOut(employeeId);
      addAuditEntry({
        actor: name,
        action: 'hr.check_out',
        entity: 'attendance',
        entityId: employeeId,
        note: `${name} checked out`,
      });
      toast.success(`${name} checked out`);
    } catch (e) {
      toast.error('Check-out failed', { description: (e as Error).message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayStr()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Total</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
              <CalendarCheck className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Present</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Late</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.late}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center">
              <CalendarCheck className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Remote</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.remote}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#e5e7eb] shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Absent</p>
              <p className="text-[15px] font-bold text-gray-900">{stats.absent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
      </div>

      {/* Attendance table */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                <th className="text-left font-semibold px-3 py-2.5">Employee</th>
                <th className="text-left font-semibold px-3 py-2.5">Department</th>
                <th className="text-center font-semibold px-3 py-2.5">Check In</th>
                <th className="text-center font-semibold px-3 py-2.5">Check Out</th>
                <th className="text-center font-semibold px-3 py-2.5">Hours</th>
                <th className="text-center font-semibold px-3 py-2.5">Status</th>
                <th className="text-right font-semibold px-3 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading attendance…
                  </td>
                </tr>
              ) : activeEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <CalendarCheck className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No employees found</p>
                  </td>
                </tr>
              ) : (
                activeEmployees.map((emp) => {
                  const record = todayMap.get(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                            {emp.avatar}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{emp.name}</div>
                            <div className="text-[11px] text-gray-500">{emp.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{emp.department}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-[12px] text-gray-700">
                        {record?.checkIn || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[12px] text-gray-700">
                        {record?.checkOut || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[12px] font-bold text-gray-900">
                        {record?.workHours ? `${record.workHours}h` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {record ? (
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                              STATUS_STYLES[record.status]
                            )}
                          >
                            {record.status.replace('-', ' ')}
                          </span>
                        ) : emp.status === 'on-leave' ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                            On Leave
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {emp.status === 'on-leave' ? (
                          <span className="text-[11px] text-gray-400">On leave</span>
                        ) : !record?.checkIn ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleCheckIn(emp.id, emp.name)}
                          >
                            <LogIn className="size-3" />
                            Check In
                          </Button>
                        ) : !record?.checkOut ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleCheckOut(emp.id, emp.name)}
                          >
                            <LogOut className="size-3" />
                            Check Out
                          </Button>
                        ) : (
                          <span className="text-[11px] text-gray-400">Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
