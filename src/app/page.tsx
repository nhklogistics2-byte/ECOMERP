'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/sidebar/topbar';
import { TabBar } from '@/components/sidebar/tab-bar';
import { DashboardView } from '@/components/views/dashboard-view';
import { InquiriesView } from '@/components/views/inquiries-view';
import { NotificationsView } from '@/components/views/notifications-view';
import { AiReplayView } from '@/components/views/ai-replay-view';
import { AiEvalView } from '@/components/views/ai-eval-view';
import { AuditLogView } from '@/components/views/audit-log-view';
import { InquiryDetailView } from '@/components/views/inquiry-detail-view';
import { PendingUsersView } from '@/components/views/pending-users-view';
import { HrEmployeesView } from '@/components/views/hr-employees-view';
import { HrLeavesView } from '@/components/views/hr-leaves-view';
import { HrAttendanceView } from '@/components/views/hr-attendance-view';
import { useAppStore } from '@/lib/store';
import { useAutoSync } from '@/lib/use-auto-sync';

export default function Page() {
  const { view, setView, setDetailInquiryId, openInquiryTab, openTabs } = useAppStore();
  useAutoSync();

  // Handle URL params for opening inquiry detail (deep-link support).
  // URL format: /?view=inquiry-detail&uid=<message-uid>
  // This opens the inquiry as an in-app tab (not a new browser window).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    const uid = params.get('uid');
    if (v === 'inquiry-detail' && uid) {
      // Wait for inquiries to load, then open as an in-app tab
      const tryFind = () => {
        const { inquiries } = useAppStore.getState();
        const found = inquiries.find((e) => String(e.uid) === uid);
        if (found) {
          openInquiryTab(found.id, found.uid, found.subject || '(no subject)');
          // Clean the URL so refreshes don't re-trigger
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setTimeout(tryFind, 1500);
        }
      };
      tryFind();
    }
  }, [openInquiryTab]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        {/* In-app tab bar (only shows when there are open tabs) */}
        <TabBar />
        <main className="flex-1 overflow-x-hidden">
          {view === 'dashboard' && <DashboardView />}
          {view === 'inquiries' && <InquiriesView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'ai-replay' && <AiReplayView />}
          {view === 'ai-eval' && <AiEvalView />}
          {view === 'audit-log' && <AuditLogView />}
          {view === 'inquiry-detail' && <InquiryDetailView />}
          {view === 'pending-users' && <PendingUsersView />}
          {view === 'hr-employees' && <HrEmployeesView />}
          {view === 'hr-leaves' && <HrLeavesView />}
          {view === 'hr-attendance' && <HrAttendanceView />}
        </main>
        <footer className="mt-auto border-t border-[#e5e7eb] bg-gray-50/60 py-3 px-4 sm:px-6 text-xs text-gray-500 flex items-center justify-between flex-wrap gap-2">
          <span>
            IMAP:{' '}
            <code className="px-1 py-0.5 bg-gray-50 rounded">
              imap.hostinger.com:993
            </code>{' '}
            · Filtering:{' '}
            <code className="px-1 py-0.5 bg-gray-50 rounded">
              @techichamps.com
            </code>
          </span>
          <span>
            Powered by OpenRouter · DeepSeek V3.1
            {openTabs.length > 0 && (
              <span className="ml-2 text-gray-500">· {openTabs.length} tab{openTabs.length !== 1 ? 's' : ''} open</span>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
