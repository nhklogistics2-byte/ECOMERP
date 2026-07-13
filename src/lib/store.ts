'use client';

import { create } from 'zustand';
import type { AppNotification, AuditEntry, AttendanceRecord, CategorizedInquiry, Employee, LeaveRequest, ViewKey } from './types';

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
  addEmployee: (e: Omit<Employee, 'id' | 'avatar'>) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;

  // HR — Leave Requests
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (r: Omit<LeaveRequest, 'id' | 'appliedAt' | 'status'>) => void;
  reviewLeaveRequest: (id: string, status: 'approved' | 'rejected', reviewer: string) => void;

  // HR — Attendance
  attendance: AttendanceRecord[];
  checkIn: (employeeId: string, employeeName: string) => void;
  checkOut: (employeeId: string, employeeName: string) => void;
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

// ── HR Seed Data ──

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SEED_EMPLOYEES: Employee[] = [
  { id: 'emp-001', name: 'Ahsan Iqbal', email: 'ahsan@ecomruns.com', phone: '+92-300-1111111', role: 'CEO', department: 'Management', status: 'active', joinDate: '2020-01-15', salary: 500000, leaveBalance: 18, avatar: 'AI' },
  { id: 'emp-002', name: 'Bilal Ahmed', email: 'bilal@ecomruns.com', phone: '+92-300-2222222', role: 'Sales Manager', department: 'Sales', status: 'active', joinDate: '2021-03-10', salary: 250000, leaveBalance: 14, avatar: 'BA' },
  { id: 'emp-003', name: 'Muhammad Moizuddin', email: 'moiz@ecomruns.com', phone: '+92-300-3333333', role: 'Sales Agent', department: 'Sales', status: 'active', joinDate: '2022-06-01', salary: 120000, leaveBalance: 20, avatar: 'MM' },
  { id: 'emp-004', name: 'Naveed Syed', email: 'naveed@ecomruns.com', phone: '+92-300-4444444', role: 'Sales Agent', department: 'Sales', status: 'on-leave', joinDate: '2022-08-15', salary: 115000, leaveBalance: 5, avatar: 'NS' },
  { id: 'emp-005', name: 'Zargham Khan', email: 'zargham@ecomruns.com', phone: '+92-300-5555555', role: 'Operations Manager', department: 'Operations', status: 'active', joinDate: '2021-01-20', salary: 220000, leaveBalance: 16, avatar: 'ZK' },
  { id: 'emp-006', name: 'Fatima Zahra', email: 'fatima@ecomruns.com', phone: '+92-300-6666666', role: 'HR Manager', department: 'HR', status: 'active', joinDate: '2021-09-05', salary: 180000, leaveBalance: 19, avatar: 'FZ' },
  { id: 'emp-007', name: 'Hassan Raza', email: 'hassan@ecomruns.com', phone: '+92-300-7777777', role: 'Finance Officer', department: 'Finance', status: 'active', joinDate: '2022-02-14', salary: 160000, leaveBalance: 21, avatar: 'HR' },
  { id: 'emp-008', name: 'Ayesha Malik', email: 'ayesha@ecomruns.com', phone: '+92-300-8888888', role: 'Design Lead', department: 'Design', status: 'active', joinDate: '2022-04-10', salary: 150000, leaveBalance: 17, avatar: 'AM' },
  { id: 'emp-009', name: 'Usman Tariq', email: 'usman@ecomruns.com', phone: '+92-300-9999999', role: 'IT Support', department: 'IT', status: 'active', joinDate: '2023-01-05', salary: 130000, leaveBalance: 22, avatar: 'UT' },
  { id: 'emp-010', name: 'Sana Bibi', email: 'sana@ecomruns.com', phone: '+92-301-1111111', role: 'Procurement Officer', department: 'Operations', status: 'inactive', joinDate: '2021-11-20', salary: 140000, leaveBalance: 0, avatar: 'SB' },
  { id: 'emp-011', name: 'Kamran Akmal', email: 'kamran@ecomruns.com', phone: '+92-301-2222222', role: 'Warehouse Supervisor', department: 'Operations', status: 'active', joinDate: '2022-07-01', salary: 125000, leaveBalance: 15, avatar: 'KA' },
  { id: 'emp-012', name: 'Rabia Anwar', email: 'rabia@ecomruns.com', phone: '+92-301-3333333', role: 'Customer Support', department: 'Sales', status: 'active', joinDate: '2023-03-15', salary: 100000, leaveBalance: 23, avatar: 'RA' },
];

const SEED_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lv-001', employeeId: 'emp-004', employeeName: 'Naveed Syed', type: 'annual', fromDate: '2026-07-08', toDate: '2026-07-14', days: 7, reason: 'Family vacation — pre-planned trip to northern areas', status: 'approved', appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), reviewedBy: 'Ahsan Iqbal' },
  { id: 'lv-002', employeeId: 'emp-003', employeeName: 'Muhammad Moizuddin', type: 'sick', fromDate: '2026-07-12', toDate: '2026-07-13', days: 2, reason: 'Fever and flu — medical rest advised', status: 'pending', appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'lv-003', employeeId: 'emp-008', employeeName: 'Ayesha Malik', type: 'casual', fromDate: '2026-07-15', toDate: '2026-07-15', days: 1, reason: 'Personal errand — bank and passport renewal', status: 'pending', appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() },
  { id: 'lv-004', employeeId: 'emp-007', employeeName: 'Hassan Raza', type: 'annual', fromDate: '2026-08-01', toDate: '2026-08-10', days: 10, reason: 'Eid holidays extended leave', status: 'pending', appliedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'lv-005', employeeId: 'emp-012', employeeName: 'Rabia Anwar', type: 'sick', fromDate: '2026-07-05', toDate: '2026-07-06', days: 2, reason: 'Migraine — unable to work', status: 'rejected', appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), reviewedBy: 'Fatima Zahra' },
];

const today = new Date().toISOString().slice(0, 10);
const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-001', employeeId: 'emp-001', employeeName: 'Ahsan Iqbal', date: today, checkIn: '08:45', checkOut: '17:30', status: 'present', workHours: 8.75 },
  { id: 'att-002', employeeId: 'emp-002', employeeName: 'Bilal Ahmed', date: today, checkIn: '09:05', checkOut: null, status: 'late', workHours: 0 },
  { id: 'att-003', employeeId: 'emp-003', employeeName: 'Muhammad Moizuddin', date: today, checkIn: '08:50', checkOut: null, status: 'present', workHours: 0 },
  { id: 'att-004', employeeId: 'emp-005', employeeName: 'Zargham Khan', date: today, checkIn: '08:30', checkOut: '17:15', status: 'present', workHours: 8.75 },
  { id: 'att-005', employeeId: 'emp-006', employeeName: 'Fatima Zahra', date: today, checkIn: '08:40', checkOut: null, status: 'present', workHours: 0 },
  { id: 'att-006', employeeId: 'emp-007', employeeName: 'Hassan Raza', date: today, checkIn: '09:15', checkOut: null, status: 'late', workHours: 0 },
  { id: 'att-007', employeeId: 'emp-008', employeeName: 'Ayesha Malik', date: today, checkIn: '08:55', checkOut: null, status: 'present', workHours: 0 },
  { id: 'att-008', employeeId: 'emp-009', employeeName: 'Usman Tariq', date: today, checkIn: null, checkOut: null, status: 'remote', workHours: 0 },
  { id: 'att-009', employeeId: 'emp-011', employeeName: 'Kamran Akmal', date: today, checkIn: '08:35', checkOut: null, status: 'present', workHours: 0 },
  { id: 'att-010', employeeId: 'emp-012', employeeName: 'Rabia Anwar', date: today, checkIn: '09:20', checkOut: null, status: 'late', workHours: 0 },
];

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
  employees: SEED_EMPLOYEES,
  addEmployee: (e) =>
    set((s) => ({
      employees: [
        ...s.employees,
        {
          id: `emp-${Date.now()}`,
          avatar: initials(e.name),
          ...e,
        },
      ],
    })),
  updateEmployee: (id, patch) =>
    set((s) => ({
      employees: s.employees.map((emp) =>
        emp.id === id ? { ...emp, ...patch } : emp
      ),
    })),
  removeEmployee: (id) =>
    set((s) => ({
      employees: s.employees.filter((emp) => emp.id !== id),
    })),

  // ── HR — Leave Requests ──
  leaveRequests: SEED_LEAVE_REQUESTS,
  addLeaveRequest: (r) =>
    set((s) => ({
      leaveRequests: [
        {
          id: `lv-${Date.now()}`,
          appliedAt: new Date().toISOString(),
          status: 'pending',
          ...r,
        },
        ...s.leaveRequests,
      ],
    })),
  reviewLeaveRequest: (id, status, reviewer) =>
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) =>
        r.id === id ? { ...r, status, reviewedBy: reviewer } : r
      ),
    })),

  // ── HR — Attendance ──
  attendance: SEED_ATTENDANCE,
  checkIn: (employeeId, employeeName) =>
    set((s) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const existing = s.attendance.find(
        (a) => a.employeeId === employeeId && a.date === todayStr
      );
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
      if (existing) {
        return {
          attendance: s.attendance.map((a) =>
            a.employeeId === employeeId && a.date === todayStr
              ? { ...a, checkIn: timeStr, status: isLate ? 'late' as const : 'present' as const }
              : a
          ),
        };
      }
      return {
        attendance: [
          ...s.attendance,
          {
            id: `att-${Date.now()}`,
            employeeId,
            employeeName,
            date: todayStr,
            checkIn: timeStr,
            checkOut: null,
            status: isLate ? 'late' as const : 'present' as const,
            workHours: 0,
          },
        ],
      };
    }),
  checkOut: (employeeId, employeeName) =>
    set((s) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const existing = s.attendance.find(
        (a) => a.employeeId === employeeId && a.date === todayStr
      );
      if (!existing || !existing.checkIn) return {};
      // Calculate work hours
      const [inH, inM] = existing.checkIn.split(':').map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = now.getHours() * 60 + now.getMinutes();
      const workHours = Math.round(((outMinutes - inMinutes) / 60) * 100) / 100;
      return {
        attendance: s.attendance.map((a) =>
          a.employeeId === employeeId && a.date === todayStr
            ? { ...a, checkOut: timeStr, workHours }
            : a
        ),
      };
    }),
}));
