'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { OrgDTO, UserDTO } from '@dechub/shared';
import { api } from './api';

interface Session {
  user: UserDTO;
  org: OrgDTO & { enabledProducts?: string[] };
}

const Ctx = createContext<{ session: Session | null; refresh: () => Promise<void> }>({
  session: null,
  refresh: async () => {},
});

const HEARTBEAT_MS = 60_000;

/**
 * Loads the current user and pings /auth/me every minute while the tab is open.
 * That ping is what marks the user as "online" for inbound lead assignment.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await api<Session>('/auth/me', { signal: AbortSignal.timeout(30_000) });
      setSession(data);
    } catch (error) {
      setLoadError(true);
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const beat = () => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    };
    const t = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [refresh]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6 text-ink">
        {loadError ? (
          <div role="alert" className="max-w-sm text-center">
            <h1 className="text-xl font-semibold">Unable to connect to the CRM</h1>
            <p className="mt-2 text-ink-soft">The server may be starting or temporarily unavailable. Please try again.</p>
            <button className="btn-primary mt-5" onClick={() => { void refresh().catch(() => {}); }}>Try again</button>
          </div>
        ) : (
          <div role="status" aria-label="Loading your session" className="h-8 w-8 animate-spin rounded-full border-2 border-orchid border-t-transparent" />
        )}
      </div>
    );
  }
  return <Ctx.Provider value={{ session, refresh }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx.session) throw new Error('useSession must be used inside SessionProvider');
  return { ...ctx.session, refresh: ctx.refresh, isAdmin: ctx.session.user.role === 'admin' };
}
