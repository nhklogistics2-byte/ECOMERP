'use client';

import {
  LayoutDashboard,
  Inbox,
  Route,
  Sparkles,
  Repeat2,
  ScrollText,
  Users,
  Building2,
  User,
  Cpu,
  Settings,
  Ship,
  LogOut,
  X,
  ChevronDown,
  CalendarCheck,
  CalendarDays,
  UserCircle,
  Palette,
  FolderKanban,
  TrendingUp,
  Truck,
  Package,
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
    new Set(['OVERVIEW', 'AI & ADMIN', 'MANAGEMENT', 'HR', 'DESIGN', 'SALES', 'OPERATIONS'])
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingLeaves = useAppStore((s) => s.leaveRequests.filter((r) => r.status === 'pending').length);

  const NAV_SECTIONS: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INQUIRIES',
      items: [
        { key: 'inquiries', label: 'Inquiries', icon: Inbox, badge: inquiries.length },
        { key: 'notifications', label: 'Notifications', icon: ScrollText, badge: unreadCount },
      ],
    },
    {
      title: 'AI & ADMIN',
      items: [
        { key: 'ai-replay', label: 'AI Replay', icon: Repeat2 },
        { key: 'ai-eval', label: 'AI Evaluation', icon: Sparkles },
        { key: 'audit-log', label: 'Audit Log', icon: ScrollText },
      ],
    },
    {
      title: 'HR',
      items: [
        { key: 'hr-employees', label: 'Employees', icon: UserCircle },
        { key: 'hr-leaves', label: 'Leave Requests', icon: CalendarDays, badge: pendingLeaves },
        { key: 'hr-attendance', label: 'Attendance', icon: CalendarCheck },
      ],
    },
    {
      title: 'DESIGN',
      items: [
        { key: 'design-overview', label: 'Overview', icon: Palette },
        { key: 'design-projects', label: 'Projects', icon: FolderKanban },
        { key: 'design-team', label: 'Team', icon: Users },
      ],
    },
    {
      title: 'SALES',
      items: [
        { key: 'sales-overview', label: 'Overview', icon: TrendingUp },
        { key: 'sales-leads', label: 'Leads Pipeline', icon: TrendingUp },
        { key: 'sales-team', label: 'Team', icon: Users },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { key: 'ops-overview', label: 'Overview', icon: Truck },
        { key: 'ops-shipments', label: 'Shipments', icon: Package },
        { key: 'ops-team', label: 'Team', icon: Users },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { key: 'pending-users', label: 'Pending Users', icon: Users },
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
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-[220px] shrink-0',
          'bg-[#f8f9fa] border-r border-[#e5e7eb]',
          'flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-[#e5e7eb] shrink-0">
          <div className="size-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Ship className="size-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] tracking-tight text-[#111827] leading-tight">
              ECOMRUNS
            </div>
            <div className="text-[10px] text-blue-600 leading-tight font-medium">
              (PRIVATE) LTD
            </div>
          </div>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
          {NAV_SECTIONS.map((section, si) => {
            const isOpen = openSections.has(section.title);
            return (
              <div key={si} className="mb-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold tracking-wider text-gray-400 hover:text-blue-600"
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform',
                      isOpen ? '' : '-rotate-90'
                    )}
                  />
                </button>
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
                              ? 'bg-[#e0e7ff] text-blue-700'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                            )}
                          />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                active
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
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
        <div className="border-t border-[#e5e7eb] p-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-blue-50 cursor-pointer group">
            <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              C
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#111827] truncate">CEO</div>
              <div className="text-[10px] text-gray-500 truncate">ceo@ecomruns.com</div>
            </div>
            <LogOut className="size-4 text-gray-400 group-hover:text-red-500 transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}
