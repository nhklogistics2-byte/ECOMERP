'use client';

import {
  LayoutDashboard,
  Inbox,
  Bell,
  Reply,
  Sparkles,
  ScrollText,
  Ship,
  LogOut,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';
import { useState } from 'react';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen, inquiries, notifications } = useAppStore();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['INQUIRIES', 'AI & ADMIN'])
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NAV_SECTIONS: NavSection[] = [
    {
      title: '',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INQUIRIES',
      items: [
        { key: 'inquiries', label: 'Inquiries', icon: Inbox, badge: inquiries.length },
        { key: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ],
    },
    {
      title: 'AI & ADMIN',
      items: [
        { key: 'ai-reply', label: 'AI Reply', icon: Reply },
        { key: 'ai-eval', label: 'AI Eval', icon: Sparkles },
        { key: 'audit-log', label: 'Audit Log', icon: ScrollText },
      ],
    },
  ];

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleNav = (key: ViewKey) => {
    setView(key);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-[240px] shrink-0',
          'bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800',
          'flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Ship className="size-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] tracking-tight text-zinc-900 dark:text-white leading-tight">
              ECOMRUNS
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-tight font-medium">
              Inquiry & AI System
            </div>
          </div>
          <button
            className="lg:hidden text-zinc-500 hover:text-zinc-900"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {NAV_SECTIONS.map((section, si) => {
            const isOpen = !section.title || openSections.has(section.title);
            return (
              <div key={si} className="mb-2">
                {section.title && (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-indigo-700 dark:hover:text-indigo-400"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={cn(
                        'size-3 transition-transform',
                        isOpen ? '' : '-rotate-90'
                      )}
                    />
                  </button>
                )}
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = view === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleNav(item.key)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors group',
                            active
                              ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60'
                              : 'text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 hover:text-indigo-700 dark:hover:text-indigo-300'
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              active
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600'
                            )}
                          />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                active
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 cursor-pointer group">
            <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              CE
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                CEO
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                ceo@ecomruns.com
              </div>
            </div>
            <LogOut className="size-4 text-zinc-400 group-hover:text-red-500 transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}
