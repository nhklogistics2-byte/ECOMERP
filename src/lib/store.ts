'use client';

import { create } from 'zustand';
import type { AppNotification, AuditEntry, AttendanceRecord, CategorizedInquiry, DesignProject, Employee, LeaveRequest, SalesLead, Shipment, ViewKey } from './types';

interface OpenTab {
  id: string;          // unique tab id
  type: 'inquiry';
  inquiryId: string;   // the inquiry's message-id
  uid: number;         // IMAP uid (for URL-based access)
  title: string;       // tab label (subject)
}

interface AppState {
  // Navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Sidebar (mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // In-app tabs (like browser tabs inside the ERP)
  openTabs: OpenTab[];
  activeTabId: string | null;
  openInquiryTab: (inquiryId: string, uid: number, title: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  navigateInquiry: (direction: 'next' | 'prev') => void;

  // Inquiries
  inquiries: CategorizedInquiry[];
  setInquiries: (list: CategorizedInquiry[]) => void;
  selectedInquiryId: string | null;
  setSelectedInquiryId: (id: string | null) => void;

  // Full-page inquiry detail (opens in new tab)
  detailInquiryId: string | null;
  setDetailInquiryId: (id: string | null) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;

  // Audit log
  auditLog: AuditEntry[];
  addAuditEntry: (e: Omit<AuditEntry, 'id' | 'timestamp'>) => void;

  // HR — Employees
  employees: Employee[];
  fetchEmployees: () => Promise<void>;
  addEmployee: (e: Omit<Employee, 'id' | 'avatar'>) => Promise<void>;
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;

  // HR — Leave Requests
  leaveRequests: LeaveRequest[];
  fetchLeaves: () => Promise<void>;
  addLeaveRequest: (r: Omit<LeaveRequest, 'id' | 'appliedAt' | 'status' | 'employeeName'>) => Promise<void>;
  reviewLeaveRequest: (id: string, status: 'approved' | 'rejected', reviewer: string) => Promise<void>;

  // HR — Attendance
  attendance: AttendanceRecord[];
  fetchAttendance: () => Promise<void>;
  checkIn: (employeeId: string) => Promise<void>;
  checkOut: (employeeId: string) => Promise<void>;

  // ── Design Department ──
  designProjects: DesignProject[];
  fetchDesignProjects: () => Promise<void>;
  addDesignProject: (p: Omit<DesignProject, 'id' | 'createdAt'>) => Promise<void>;
  updateDesignProject: (id: string, patch: Partial<DesignProject>) => Promise<void>;
  removeDesignProject: (id: string) => Promise<void>;

  // ── Sales Department ──
  salesLeads: SalesLead[];
  fetchSalesLeads: () => Promise<void>;
  addSalesLead: (l: Omit<SalesLead, 'id' | 'createdAt'>) => Promise<void>;
  updateSalesLead: (id: string, patch: Partial<SalesLead>) => Promise<void>;
  removeSalesLead: (id: string) => Promise<void>;

  // ── Operations Department ──
  shipments: Shipment[];
  fetchShipments: () => Promise<void>;
  addShipment: (s: Omit<Shipment, 'id' | 'createdAt'>) => Promise<void>;
  updateShipment: (id: string, patch: Partial<Shipment>) => Promise<void>;
  removeShipment: (id: string) => Promise<void>;
}

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'inquiry',
    title: 'New Pricing inquiry',
    message: 'info@techichamps.com sent a high-priority pricing inquiry',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
  },
  {
    id: 'n2',
    type: 'ai',
    title: 'AI categorization complete',
    message: '7 inquiries categorized via DeepSeek V3.1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: false,
  },
  {
    id: 'n3',
    type: 'system',
    title: 'IMAP sync successful',
    message: 'Connected to imap.hostinger.com · 365 messages scanned',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: true,
  },
  {
    id: 'n4',
    type: 'warning',
    title: 'Rate limit warning',
    message: 'OpenRouter returned 429 — automatic retry engaged',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
  },
];

const SEED_AUDIT: AuditEntry[] = [
  {
    id: 'a1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actor: 'ceo@ecomruns.com',
    action: 'imap.fetch',
    entity: 'inquiry',
    entityId: 'batch-001',
    note: 'Fetched 7 inquiries from techichamps.com',
  },
  {
    id: 'a2',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    actor: 'ceo@ecomruns.com',
    action: 'ai.categorize',
    entity: 'inquiry',
    entityId: 'uid-376',
    note: 'Categorized as Pricing / high',
  },
  {
    id: 'a3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actor: 'ceo@ecomruns.com',
    action: 'auth.login',
    entity: 'user',
    entityId: 'ceo@ecomruns.com',
    note: '-',
  },
  {
    id: 'a4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    actor: 'system',
    action: 'notification.dispatch',
    entity: 'notification',
    entityId: 'n1',
    note: 'New pricing inquiry alert sent',
  },
  {
    id: 'a5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    actor: 'ceo@ecomruns.com',
    action: 'ai.eval_run',
    entity: 'eval',
    entityId: 'eval-001',
    note: 'Evaluated 2 models on 1 inquiry',
  },
];

// ── HR helpers ──

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function mapEmployee(e: Record<string, unknown>): Employee {
  return {
    id: String(e.id),
    name: String(e.name || ''),
    email: String(e.email || ''),
    phone: String(e.phone || ''),
    role: String(e.role || ''),
    department: String(e.department || ''),
    status: (e.status as Employee['status']) || 'active',
    joinDate: String(e.joinDate || ''),
    salary: Number(e.salary || 0),
    leaveBalance: Number(e.leaveBalance || 0),
    avatar: initials(String(e.name || '')),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v, selectedInquiryId: null }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ── In-app tabs ──
  openTabs: [],
  activeTabId: null,

  openInquiryTab: (inquiryId, uid, title) => {
    const state = get();
    // If a tab for this inquiry already exists, just activate it
    const existing = state.openTabs.find((t) => t.inquiryId === inquiryId);
    if (existing) {
      set({ activeTabId: existing.id, view: 'inquiry-detail', detailInquiryId: inquiryId });
      return;
    }
    // Otherwise create a new tab
    const newTab: OpenTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'inquiry',
      inquiryId,
      uid,
      title: title || '(no subject)',
    };
    set({
      openTabs: [...state.openTabs, newTab],
      activeTabId: newTab.id,
      view: 'inquiry-detail',
      detailInquiryId: inquiryId,
    });
  },

  closeTab: (tabId) => {
    const state = get();
    const newTabs = state.openTabs.filter((t) => t.id !== tabId);
    let newActiveId = state.activeTabId;
    let newView = state.view;
    let newDetailId = state.detailInquiryId;
    if (state.activeTabId === tabId) {
      // Activate the next available tab, or fall back to inquiries view
      const closedIndex = state.openTabs.findIndex((t) => t.id === tabId);
      const nextTab = newTabs[closedIndex] || newTabs[closedIndex - 1] || null;
      if (nextTab) {
        newActiveId = nextTab.id;
        newDetailId = nextTab.inquiryId;
        newView = 'inquiry-detail';
      } else {
        newActiveId = null;
        newDetailId = null;
        newView = 'inquiries';
      }
    }
    set({
      openTabs: newTabs,
      activeTabId: newActiveId,
      view: newView,
      detailInquiryId: newDetailId,
    });
  },

  setActiveTab: (tabId) => {
    const state = get();
    const tab = state.openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    set({
      activeTabId: tabId,
      view: 'inquiry-detail',
      detailInquiryId: tab.inquiryId,
    });
  },

  navigateInquiry: (direction) => {
    const state = get();
    if (state.openTabs.length === 0) return;
    // Find the current active tab's position in openTabs
    const currentIdx = state.openTabs.findIndex((t) => t.id === state.activeTabId);
    if (currentIdx === -1) return;
    let nextIdx: number;
    if (direction === 'next') {
      nextIdx = currentIdx + 1;
      if (nextIdx >= state.openTabs.length) return; // already at last
    } else {
      nextIdx = currentIdx - 1;
      if (nextIdx < 0) return; // already at first
    }
    const nextTab = state.openTabs[nextIdx];
    set({
      activeTabId: nextTab.id,
      detailInquiryId: nextTab.inquiryId,
    });
  },

  inquiries: [],
  setInquiries: (list) => set({ inquiries: list }),
  selectedInquiryId: null,
  setSelectedInquiryId: (id) => set({ selectedInquiryId: id }),

  detailInquiryId: null,
  setDetailInquiryId: (id) => set({ detailInquiryId: id }),

  notifications: SEED_NOTIFICATIONS,
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          id: `n${Date.now()}`,
          timestamp: new Date().toISOString(),
          read: false,
          ...n,
        },
        ...s.notifications,
      ],
    })),

  auditLog: SEED_AUDIT,
  addAuditEntry: (e) =>
    set((s) => ({
      auditLog: [
        {
          id: `a${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...e,
        },
        ...s.auditLog,
      ],
    })),

  // ── HR — Employees ──
  // ── HR — Employees (real database via API) ──
  employees: [],
  fetchEmployees: async () => {
    try {
      const res = await fetch('/api/hr/employees', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.employees) {
        set({ employees: data.employees.map(mapEmployee) });
      }
    } catch (e) {
      console.error('fetchEmployees failed:', e);
    }
  },
  addEmployee: async (e) => {
    const res = await fetch('/api/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    await get().fetchEmployees();
  },
  updateEmployee: async (id, patch) => {
    await fetch('/api/hr/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await get().fetchEmployees();
  },
  removeEmployee: async (id) => {
    await fetch(`/api/hr/employees?id=${id}`, { method: 'DELETE' });
    await get().fetchEmployees();
  },

  // ── HR — Leave Requests (real database via API) ──
  leaveRequests: [],
  fetchLeaves: async () => {
    try {
      const res = await fetch('/api/hr/leaves', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.leaves) {
        set({ leaveRequests: data.leaves });
      }
    } catch (e) {
      console.error('fetchLeaves failed:', e);
    }
  },
  addLeaveRequest: async (r) => {
    await fetch('/api/hr/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r),
    });
    await get().fetchLeaves();
  },
  reviewLeaveRequest: async (id, status, reviewer) => {
    await fetch('/api/hr/leaves', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, reviewedBy: reviewer }),
    });
    await get().fetchLeaves();
    await get().fetchEmployees(); // refresh leave balances
  },

  // ── HR — Attendance (real database via API) ──
  attendance: [],
  fetchAttendance: async () => {
    try {
      const res = await fetch('/api/hr/attendance', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.attendance) {
        set({ attendance: data.attendance });
      }
    } catch (e) {
      console.error('fetchAttendance failed:', e);
    }
  },
  checkIn: async (employeeId) => {
    await fetch('/api/hr/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action: 'checkIn' }),
    });
    await get().fetchAttendance();
  },
  checkOut: async (employeeId) => {
    await fetch('/api/hr/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action: 'checkOut' }),
    });
    await get().fetchAttendance();
  },

  // ── Design Department ──
  designProjects: [],
  fetchDesignProjects: async () => {
    try {
      const res = await fetch('/api/design/projects', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.projects) {
        set({ designProjects: data.projects });
      }
    } catch (e) {
      console.error('fetchDesignProjects failed:', e);
    }
  },
  addDesignProject: async (p) => {
    const res = await fetch('/api/design/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    await get().fetchDesignProjects();
  },
  updateDesignProject: async (id, patch) => {
    await fetch('/api/design/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await get().fetchDesignProjects();
  },
  removeDesignProject: async (id) => {
    await fetch(`/api/design/projects?id=${id}`, { method: 'DELETE' });
    await get().fetchDesignProjects();
  },

  // ── Sales Department ──
  salesLeads: [],
  fetchSalesLeads: async () => {
    try {
      const res = await fetch('/api/sales/leads', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.leads) {
        set({ salesLeads: data.leads });
      }
    } catch (e) {
      console.error('fetchSalesLeads failed:', e);
    }
  },
  addSalesLead: async (l) => {
    const res = await fetch('/api/sales/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(l),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    await get().fetchSalesLeads();
  },
  updateSalesLead: async (id, patch) => {
    await fetch('/api/sales/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await get().fetchSalesLeads();
  },
  removeSalesLead: async (id) => {
    await fetch(`/api/sales/leads?id=${id}`, { method: 'DELETE' });
    await get().fetchSalesLeads();
  },

  // ── Operations Department ──
  shipments: [],
  fetchShipments: async () => {
    try {
      const res = await fetch('/api/ops/shipments', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.shipments) {
        set({ shipments: data.shipments });
      }
    } catch (e) {
      console.error('fetchShipments failed:', e);
    }
  },
  addShipment: async (s) => {
    const res = await fetch('/api/ops/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    await get().fetchShipments();
  },
  updateShipment: async (id, patch) => {
    await fetch('/api/ops/shipments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await get().fetchShipments();
  },
  removeShipment: async (id) => {
    await fetch(`/api/ops/shipments?id=${id}`, { method: 'DELETE' });
    await get().fetchShipments();
  },
}));
