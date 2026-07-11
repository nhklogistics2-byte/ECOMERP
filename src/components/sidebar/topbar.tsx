'use client';

import { Search, Menu, Bell, ChevronRight, RefreshCw, Loader2, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const VIEW_LABELS: Record<ViewKey, { label: string; sub: string }> = {
  dashboard: { label: 'Command Center', sub: 'Home' },
  inquiries: { label: 'Inquiries', sub: 'Home' },
  notifications: { label: 'Notifications', sub: 'Home' },
  'ai-replay': { label: 'AI Replay', sub: 'Home' },
  'ai-eval': { label: 'AI Evaluation', sub: 'Home' },
  'audit-log': { label: 'Audit Log', sub: 'Home' },
  'inquiry-detail': { label: 'Inquiry Detail', sub: 'Home' },
  'pending-users': { label: 'Pending Users', sub: 'Home' },
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

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-xl border-b border-[#e5e7eb] flex items-center gap-3 px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden size-9 shrink-0"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Title section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span>{meta.sub}</span>
          <ChevronRight className="size-3" />
          <span className="font-medium text-gray-700">{meta.label}</span>
        </div>
        {view === 'dashboard' && (
          <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
            Executive overview of AI email inquiries and system performance
          </p>
        )}
      </div>

      {/* Date/time */}
      <div className="hidden md:flex flex-col items-end text-[11px] text-gray-500 shrink-0">
        <span className="font-medium">{dateStr}</span>
        <span className="text-gray-400">{timeStr} PKT</span>
      </div>

      {/* Search */}
      <div className="relative hidden lg:block w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search…"
          className="pl-9 h-8 text-[13px] bg-gray-50 border-[#e5e7eb]"
        />
      </div>

      {/* Auto refresh indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 border border-green-200 shrink-0">
        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[11px] font-medium text-green-700">Auto</span>
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
            <Loader2 className="size-4 animate-spin text-blue-600" />
          ) : (
            <RefreshCw className="size-4 text-gray-500" />
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
        <Bell className="size-4 text-gray-500" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {/* User avatar */}
      <div className="size-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 cursor-pointer">
        C
      </div>
    </header>
  );
}
