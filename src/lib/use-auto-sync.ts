'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

/**
 * Auto-sync hook: fetches inquiries ONCE on mount only.
 *
 * No background intervals, no focus listeners — nothing runs while you use
 * the project. Use the Refresh button in the Inquiries view to sync manually.
 */
export function useAutoSync() {
  const { inquiries, setInquiries, addAuditEntry } = useAppStore();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Initial fetch only — no interval, no focus listener
    (async () => {
      try {
        const res = await fetch('/api/emails?force=0&limit=100', { cache: 'no-store' });
        const data = await res.json();
        if (!data.ok) return;
        setInquiries(data.emails || []);
        addAuditEntry({
          actor: 'system',
          action: 'imap.fetch',
          entity: 'inquiry',
          entityId: `auto-${Date.now()}`,
          note: `Loaded ${data.count} inquiries from techichamps.com`,
        });
      } catch (e) {
        console.error('Initial fetch failed:', (e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiries.length]);
}
