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
    <div className="border-b border-[#e5e7eb] bg-background px-2 pt-1.5 flex items-end gap-1 overflow-x-auto scrollbar-thin">
      {openTabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer min-w-[140px] max-w-[240px] border border-b-0 transition-colors',
              active
                ? 'bg-white border-[#e5e7eb] text-gray-900'
                : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
            )}
          >
            <Inbox className="size-3.5 shrink-0 text-gray-500" />
            <span className="text-[12px] font-medium truncate flex-1" title={tab.title}>
              {tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="size-4 rounded flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 shrink-0"
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
        className="px-2.5 py-1.5 text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0"
        title="Back to Inquiries list"
      >
        +
      </button>
    </div>
  );
}
