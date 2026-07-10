'use client';

import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/sidebar/topbar';
import { DashboardView } from '@/components/views/dashboard-view';
import { InquiriesView } from '@/components/views/inquiries-view';
import { NotificationsView } from '@/components/views/notifications-view';
import { AiReplyView } from '@/components/views/ai-reply-view';
import { AiEvalView } from '@/components/views/ai-eval-view';
import { AuditLogView } from '@/components/views/audit-log-view';
import { useAppStore } from '@/lib/store';

export default function Page() {
  const { view } = useAppStore();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-x-hidden">
          {view === 'dashboard' && <DashboardView />}
          {view === 'inquiries' && <InquiriesView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'ai-reply' && <AiReplyView />}
          {view === 'ai-eval' && <AiEvalView />}
          {view === 'audit-log' && <AuditLogView />}
        </main>
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
      </div>
    </div>
  );
}
