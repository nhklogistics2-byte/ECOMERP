'use client';

import { useState, useMemo } from 'react';
import {
  UserCircle,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Employee } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  'on-leave': 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-200 text-gray-500',
};

function formatSalary(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

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

export function HrEmployeesView() {
  const { employees, addEmployee, updateEmployee, removeEmployee, addAuditEntry } = useAppStore();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: 'Sales',
    salary: 0,
    leaveBalance: 20,
  });

  const departments = useMemo(() => {
    const s = new Set(employees.map((e) => e.department));
    return ['all', ...Array.from(s).sort()];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter !== 'all' && e.department !== deptFilter) return false;
      if (q) {
        const hay = `${e.name} ${e.email} ${e.role} ${e.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, search, deptFilter]);

  const stats = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      onLeave: employees.filter((e) => e.status === 'on-leave').length,
      inactive: employees.filter((e) => e.status === 'inactive').length,
    };
  }, [employees]);

  const handleAdd = () => {
    if (!newEmp.name || !newEmp.email) {
      toast.warning('Name and email are required');
      return;
    }
    addEmployee({
      ...newEmp,
      phone: newEmp.phone || '',
      status: 'active',
      joinDate: new Date().toISOString().slice(0, 10),
    });
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'hr.employee_add',
      entity: 'employee',
      entityId: `emp-${Date.now()}`,
      note: `Added employee ${newEmp.name} as ${newEmp.role}`,
    });
    toast.success(`Employee ${newEmp.name} added`);
    setNewEmp({ name: '', email: '', phone: '', role: '', department: 'Sales', salary: 0, leaveBalance: 20 });
    setShowAddForm(false);
  };

  const handleStatusChange = (id: string, name: string, status: Employee['status']) => {
    updateEmployee(id, { status });
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'hr.employee_status',
      entity: 'employee',
      entityId: id,
      note: `Changed ${name} status to ${status}`,
    });
    toast.success(`${name} status updated to ${status}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {employees.length} employees · {stats.active} active · {stats.onLeave} on leave
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="gap-2 h-8 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="size-3.5" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
            <UserCircle className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
            <p className="text-[15px] font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Active</p>
            <p className="text-[15px] font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
            <Calendar className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">On Leave</p>
            <p className="text-[15px] font-bold text-gray-900">{stats.onLeave}</p>
          </div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gray-200 text-gray-500 flex items-center justify-center">
            <X className="size-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Inactive</p>
            <p className="text-[15px] font-bold text-gray-900">{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 px-3 text-[13px] rounded-md border border-[#e5e7eb] bg-white text-gray-700"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All departments' : d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e5e7eb] text-[10px] uppercase tracking-wide text-gray-500">
                <th className="text-left font-semibold px-3 py-2.5">Employee</th>
                <th className="text-left font-semibold px-3 py-2.5">Role</th>
                <th className="text-left font-semibold px-3 py-2.5">Department</th>
                <th className="text-left font-semibold px-3 py-2.5">Contact</th>
                <th className="text-left font-semibold px-3 py-2.5">Join Date</th>
                <th className="text-right font-semibold px-3 py-2.5">Salary</th>
                <th className="text-center font-semibold px-3 py-2.5">Leaves</th>
                <th className="text-left font-semibold px-3 py-2.5">Status</th>
                <th className="text-right font-semibold px-3 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <UserCircle className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No employees found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {e.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{e.name}</div>
                          <div className="text-[11px] text-gray-500">{e.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{e.role}</td>
                    <td className="px-3 py-2.5 text-gray-700">{e.department}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-[11px] text-gray-600 flex items-center gap-1">
                        <Mail className="size-3 text-gray-400" />
                        {e.email}
                      </div>
                      <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Phone className="size-3 text-gray-400" />
                        {e.phone}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                      {formatDate(e.joinDate)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-gray-700 whitespace-nowrap">
                      {formatSalary(e.salary)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[12px] font-bold text-gray-900">
                      {e.leaveBalance}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                          STATUS_COLORS[e.status]
                        )}
                      >
                        {e.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <select
                        value={e.status}
                        onChange={(ev) => handleStatusChange(e.id, e.name, ev.target.value as Employee['status'])}
                        className="text-[11px] rounded border border-gray-200 bg-white px-1.5 py-0.5"
                      >
                        <option value="active">Active</option>
                        <option value="on-leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Add Employee</h2>
              <button onClick={() => setShowAddForm(false)}>
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Name</label>
                <Input
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="Full name"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Email</label>
                <Input
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  placeholder="email@ecomruns.com"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Phone</label>
                <Input
                  value={newEmp.phone}
                  onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                  placeholder="+92-300-XXXXXXX"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Role</label>
                <Input
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  placeholder="e.g. Sales Agent"
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Department</label>
                <select
                  value={newEmp.department}
                  onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  className="w-full h-8 text-[13px] rounded-md border border-[#e5e7eb] bg-white px-2"
                >
                  <option>Sales</option>
                  <option>Operations</option>
                  <option>HR</option>
                  <option>Finance</option>
                  <option>Design</option>
                  <option>IT</option>
                  <option>Management</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase">Salary (PKR)</label>
                <Input
                  type="number"
                  value={newEmp.salary || ''}
                  onChange={(e) => setNewEmp({ ...newEmp, salary: Number(e.target.value) })}
                  placeholder="0"
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
