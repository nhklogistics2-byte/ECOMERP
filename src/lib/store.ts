'use client';

import { create } from 'zustand';
import type { AppNotification, AuditEntry, CategorizedInquiry, ViewKey } from './types';

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
}));
