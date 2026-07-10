'use client';

import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Search, Mail, Sparkles, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { AppNotification } from '@/lib/types';

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TYPE_META: Record<
  AppNotification['type'],
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  inquiry: { icon: Mail, color: 'text-zinc-900', bg: 'bg-zinc-100 dark:bg-zinc-800/60', label: 'Inquiry' },
  ai: { icon: Sparkles, color: 'text-zinc-700', bg: 'bg-zinc-100 dark:bg-zinc-800/40', label: 'AI' },
  system: { icon: Server, color: 'text-zinc-600', bg: 'bg-zinc-100 dark:bg-zinc-800/40', label: 'System' },
  warning: { icon: AlertTriangle, color: 'text-zinc-700', bg: 'bg-zinc-100 dark:bg-zinc-800/40', label: 'Warning' },
};

export function NotificationsView() {
  const { notifications, markNotificationRead, markAllNotificationsRead, addAuditEntry } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | AppNotification['type']>('all');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === 'unread' && n.read) return false;
      if (filter !== 'all' && filter !== 'unread' && n.type !== filter) return false;
      if (s) {
        const hay = `${n.title} ${n.message}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [notifications, search, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAll = () => {
    markAllNotificationsRead();
    addAuditEntry({
      actor: 'ceo@ecomruns.com',
      action: 'notification.mark_all_read',
      entity: 'notification',
      entityId: 'batch',
      note: `Marked ${unreadCount} notifications as read`,
    });
    toast.success(`Marked ${unreadCount} as read`);
  };

  const handleMarkOne = (id: string) => {
    markNotificationRead(id);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Bell className="size-6 text-zinc-900" />
            Notifications
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount} unread of {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            className="gap-2 h-8 border-zinc-300 text-zinc-900 hover:bg-zinc-100"
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(['all', 'unread', 'inquiry', 'ai', 'system', 'warning'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
                  filter === f
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 hover:text-zinc-900'
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="py-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <Bell className="size-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleMarkOne(n.id)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 flex gap-3 transition-colors',
                      !n.read && 'bg-zinc-100/50 dark:bg-zinc-800/20'
                    )}
                  >
                    <div
                      className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        meta.bg
                      )}
                    >
                      <Icon className={cn('size-4', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                          {n.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0 h-4 capitalize', meta.bg, meta.color, 'border-transparent')}
                        >
                          {meta.label}
                        </Badge>
                        {!n.read && (
                          <span className="size-2 rounded-full bg-zinc-900 shrink-0 ml-auto" />
                        )}
                      </div>
                      <p className="text-[13px] text-zinc-600 dark:text-zinc-300">{n.message}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">{formatTimestamp(n.timestamp)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
