'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { SessionProvider, useSession } from '@/lib/session';

// Dechub Cloud launcher. New products are added to this list as they ship.
const PRODUCTS = [
  { key: 'crm', name: 'Dechub CRM', body: 'Leads, pipeline and follow-ups for the sales team.', href: '/crm', icon: 'pipeline' },
];

function Launcher() {
  const { user, org } = useSession();
  const enabled = org.enabledProducts ?? ['crm'];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-[#E0B0FF]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark product="Cloud" />
        <button
          className="btn h-9 text-ink-soft hover:bg-ink/5 hover:text-ink"
          onClick={async () => {
            await api('/auth/logout', { method: 'POST' }).catch(() => {});
            window.location.href = '/login';
          }}
        >
          <Icon name="logout" size={16} /> Log out
        </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-14">
        <p className="text-[14px] text-orchid-hover">{org.name}</p>
        <h1 className="mt-2 font-display text-[44px] font-semibold leading-tight text-ink">
          {greet}, {user.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">Choose where to work.</p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.filter((p) => enabled.includes(p.key)).map((p) => (
            <li key={p.key}>
              <Link
                href={p.href}
                className="group flex h-full flex-col rounded-xl border border-line bg-canvas p-6 transition-colors hover:border-orchid hover:bg-surface"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-brass/15 text-orchid-hover">
                  <Icon name={p.icon} size={22} />
                </span>
                <span className="mt-6 font-display text-[21px] font-semibold">{p.name}</span>
                <span className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{p.body}</span>
                <span className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-orchid-hover">
                  Open <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-xl border border-dashed border-line p-6 text-[13.5px] text-ink-soft">
            More Dechub apps will appear here as they launch.
          </li>
        </ul>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <Launcher />
    </SessionProvider>
  );
}
