'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SessionProvider } from '@/lib/session';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
