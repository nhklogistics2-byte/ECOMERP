'use client';

import { Search, Menu, Bell, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const VIEW_LABELS: Record<ViewKey, { label: string; sub: string }> = {
  dashboard: { label: 'Dashboard', sub: 'Home' },
  inquiries: { label: 'Inquiries', sub: 'Home' },
  notifications: { label: 'Notifications', sub: 'Home' },
  'ai-reply': { label: 'AI Reply', sub: 'Home' },
  'ai-eval': { label: 'AI Eval', sub: 'Home' },
  'audit-log': { label: 'Audit Log', sub: 'Home' },
};

export function Topbar({
  loading,
  onRefresh,
}: {
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const { view, setSidebarOpen, notifications, setView } = useAppStore();
  const meta = VIEW_LABELS[view];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 h-14 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden size-9 shrink-0"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">{meta.sub}</span>
        <ChevronRight className="size-3.5 text-zinc-300 hidden sm:inline" />
        <span className="font-semibold text-zinc-900 dark:text-white truncate">{meta.label}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto relative hidden sm:block">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Jump to a page..."
          className="pl-9 h-8 text-[13px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
        />
      </div>

      <div className="flex-1 sm:flex-none" />

      {/* AI Model badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
        <div className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 hidden sm:inline">
          DeepSeek V3.1
        </span>
        <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 sm:hidden">
          AI
        </span>
      </div>

      {/* Refresh */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-indigo-600" />
          ) : (
            <RefreshCw className="size-4 text-zinc-500" />
          )}
        </Button>
      )}

      {/* Notifications bell */}
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 relative"
        onClick={() => setView('notifications')}
      >
        <Bell className="size-4 text-zinc-500" />
        {unread > 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full',
              'bg-red-500 text-white text-[9px] font-bold flex items-center justify-center'
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
    </header>
  );
}
