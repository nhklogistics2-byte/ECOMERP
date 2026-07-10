'use client';

import { create } from 'zustand';
import type { AppNotification, AuditEntry, CategorizedInquiry, ViewKey } from './types';

interface AppState {
  // Navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Sidebar (mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

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

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v, selectedInquiryId: null }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

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
}));
