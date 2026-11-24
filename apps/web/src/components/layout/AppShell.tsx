'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, todayEnd } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Avatar } from '../ui/bits';
import { Icon } from '../ui/Icon';
import { Wordmark } from './Logo';

const NAV = [
  { href: '/crm', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/crm/leads', label: 'Leads', icon: 'leads' },
  { href: '/crm/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { href: '/crm/tasks', label: 'My tasks', icon: 'tasks', badge: true },
  { href: '/crm/companies', label: 'Companies', icon: 'companies' },
  { href: '/crm/imports', label: 'Imports', icon: 'imports' },
];

function useOverdueCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ overdue: number }>('/tasks/summary', { query: { todayEnd: todayEnd() } })
        .then((r) => alive && setCount(r.overdue))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener('dechub:tasks-changed', load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('dechub:tasks-changed', load);
    };
  }, []);
  return count;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, org, isAdmin } = useSession();
  const overdue = useOverdueCount();
  const [menu, setMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMobileNav(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav = isAdmin ? [...NAV, { href: '/crm/settings', label: 'Settings', icon: 'settings' }] : NAV;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };

  const sidebar = (
    <nav className="flex h-full flex-col bg-[#E0B0FF] px-3 py-5 text-[13.5px]">
      <Link href="/" className="mb-7 px-2" aria-label="Dechub Cloud home">
        <Wordmark product="CRM" />
      </Link>
      <ul className="space-y-0.5">
        {nav.map((item) => {
          const active = item.exact ? path === item.href : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  active ? 'bg-[#ECD0FF] text-ink' : 'text-ink-soft hover:bg-[#ECD0FF]/60 hover:text-ink'
                }`}
              >
                {active && <span className="absolute -left-3 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r bg-brass" />}
                <Icon name={item.icon} size={18} className={active ? 'text-orchid-hover' : ''} />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge && overdue > 0 && (
                  <span className="rounded-full bg-rose px-1.5 text-[11px] font-semibold text-white" title={`${overdue} overdue`}>
                    {overdue}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto rounded-lg border border-[#B982D6] px-3 py-3 text-[12px] text-ink-soft">
        <span className="block font-medium text-ink">{org.name}</span>
        Dechub Cloud
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 lg:block">{sidebar}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-40 bg-aubergine-deep/50 lg:hidden" onClick={() => setMobileNav(false)}>
          <aside className="h-full w-[240px]" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-8">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/crm/leads?q=${encodeURIComponent(q)}`);
            }}
          >
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="field h-9 bg-surface pl-9 pr-10"
              placeholder="Search leads by name, email, phone or company"
              aria-label="Search leads"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[11px] text-ink-faint sm:block">/</kbd>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/crm/tasks?tab=overdue"
              className="btn-ghost relative h-9 w-9 px-0"
              aria-label={overdue ? `${overdue} overdue follow-ups` : 'No overdue follow-ups'}
            >
              <Icon name="bell" />
              {overdue > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose" />}
            </Link>
            <Link href="/" className="btn-ghost h-9 w-9 px-0" aria-label="Dechub Cloud apps">
              <Icon name="grid" />
            </Link>
            <div className="relative">
              <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-ink/5" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
                <Avatar name={user.name} />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[13px] font-medium">{user.name}</span>
                  <span className="block text-[11.5px] capitalize text-ink-muted">{user.role}</span>
                </span>
                <Icon name="chevronDown" size={14} className="text-ink-muted" />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-1 w-56 rounded-lg border border-line bg-surface p-1 shadow-lift" onMouseLeave={() => setMenu(false)}>
                  <div className="border-b border-line px-3 py-2 text-[12.5px] text-ink-muted">{user.email}</div>
                  <button role="menuitem" onClick={logout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] hover:bg-canvas">
                    <Icon name="logout" size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
