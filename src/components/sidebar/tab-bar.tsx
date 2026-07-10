'use client';

import { X, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

/**
 * In-app tab bar — like browser tabs but inside the ERP.
 * Shows all open inquiry tabs with close buttons.
 * Only visible when there are open tabs.
 */
export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab, setView } = useAppStore();

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 pt-1.5 flex items-end gap-1 overflow-x-auto scrollbar-thin">
      {openTabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer min-w-[140px] max-w-[240px] border border-b-0 transition-colors',
              active
                ? 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white'
                : 'bg-zinc-100 dark:bg-zinc-800/50 border-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            )}
          >
            <Inbox className="size-3.5 shrink-0 text-zinc-500" />
            <span className="text-[12px] font-medium truncate flex-1" title={tab.title}>
              {tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="size-4 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white shrink-0"
              aria-label="Close tab"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
      {/* "New tab" / back to inquiries button */}
      <button
        onClick={() => setView('inquiries')}
        className="px-2.5 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white shrink-0"
        title="Back to Inquiries list"
      >
        +
      </button>
    </div>
  );
}
