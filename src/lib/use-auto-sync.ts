'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Auto-sync hook: fetches inquiries on mount and every 5 minutes.
 * Uses force=false so it hits the 90s server cache (fast) — the server
 * will re-fetch from IMAP only when the cache expires.
 *
 * Also runs once on mount to populate the dashboard immediately.
 */
export function useAutoSync() {
  const { inquiries, setInquiries, addAuditEntry, addNotification } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);

  const sync = useCallback(
    async (silent: boolean = true) => {
      try {
        const res = await fetch('/api/emails?force=0&limit=100', { cache: 'no-store' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Sync failed');

        const newCount = data.emails?.length || 0;
        const prevCount = inquiries.length;
        setInquiries(data.emails || []);

        if (!silent) {
          addAuditEntry({
            actor: 'system',
            action: 'imap.auto_sync',
            entity: 'inquiry',
            entityId: `auto-${Date.now()}`,
            note: `Auto-synced ${newCount} inquiries from techichamps.com`,
          });
        }

        // Fire notification if new inquiries appeared
        if (newCount > prevCount && prevCount > 0) {
          const diff = newCount - prevCount;
          addNotification({
            type: 'inquiry',
            title: `${diff} new inquir${diff === 1 ? 'y' : 'ies'}`,
            message: `Auto-sync found ${diff} new inquir${diff === 1 ? 'y' : 'ies'} from techichamps.com`,
          });
          if (!silent) {
            toast.success(`Auto-sync: ${diff} new inquir${diff === 1 ? 'y' : 'ies'}`);
          }
        }
      } catch (e) {
        // Silent failure for background syncs
        console.error('Auto-sync failed:', (e as Error).message);
      }
    },
    [inquiries.length, setInquiries, addAuditEntry, addNotification]
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Initial fetch
    sync(false);

    // Background interval
    intervalRef.current = setInterval(() => sync(true), AUTO_SYNC_INTERVAL_MS);

    // Also sync when the tab regains focus
    const onFocus = () => sync(true);
    window.addEventListener('focus', onFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
