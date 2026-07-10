'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/sidebar/topbar';
import { DashboardView } from '@/components/views/dashboard-view';
import { InquiriesView } from '@/components/views/inquiries-view';
import { NotificationsView } from '@/components/views/notifications-view';
import { AiReplayView } from '@/components/views/ai-replay-view';
import { AiEvalView } from '@/components/views/ai-eval-view';
import { AuditLogView } from '@/components/views/audit-log-view';
import { InquiryDetailView } from '@/components/views/inquiry-detail-view';
import { useAppStore } from '@/lib/store';
import { useAutoSync } from '@/lib/use-auto-sync';
import type { ViewKey } from '@/lib/types';

export default function Page() {
  const { view, setView, setDetailInquiryId, setSelectedInquiryId } = useAppStore();
  useAutoSync();

  // Handle URL params for opening inquiry detail in a new tab.
  // URL format: /?view=inquiry-detail&uid=<message-uid>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    const uid = params.get('uid');
    if (v === 'inquiry-detail' && uid) {
      // Wait for inquiries to load, then set detail by uid
      const tryFind = () => {
        const { inquiries } = useAppStore.getState();
        const found = inquiries.find((e) => String(e.uid) === uid);
        if (found) {
          setDetailInquiryId(found.id);
          setView('inquiry-detail');
        } else {
          // Retry after auto-sync
          setTimeout(tryFind, 1500);
        }
      };
      tryFind();
    }
  }, [setView, setDetailInquiryId]);

  // Hide sidebar + topbar when in full-page inquiry detail (for new-tab experience)
  const isFullPage = view === 'inquiry-detail';

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {!isFullPage && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {!isFullPage && <Topbar />}
        <main className="flex-1 overflow-x-hidden">
          {view === 'dashboard' && <DashboardView />}
          {view === 'inquiries' && <InquiriesView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'ai-replay' && <AiReplayView />}
          {view === 'ai-eval' && <AiEvalView />}
          {view === 'audit-log' && <AuditLogView />}
          {view === 'inquiry-detail' && <InquiryDetailView />}
        </main>
        {!isFullPage && (
          <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 py-3 px-4 sm:px-6 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between flex-wrap gap-2">
            <span>
              IMAP:{' '}
              <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                imap.hostinger.com:993
              </code>{' '}
              · Filtering:{' '}
              <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                @techichamps.com
              </code>
            </span>
            <span>Powered by OpenRouter · DeepSeek V3.1</span>
          </footer>
        )}
      </div>
    </div>
  );
}
