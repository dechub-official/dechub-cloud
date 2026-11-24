'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BUSINESS_LINES,
  BUSINESS_LINE_LABELS,
  CURRENCIES,
  MARKETS,
  MARKET_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  type Source,
  type Stage,
  type TaskDTO,
} from '@dechub/shared';
import { NewLeadPanel } from '@/components/crm/NewLeadPanel';
import { Avatar, ErrorNote, Loading, PageHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useApi } from '@/hooks/useApi';
import { money, relative } from '@/lib/format';
import { useSession } from '@/lib/session';
import { STAGE_STYLE } from '@/lib/stages';

interface Dashboard {
  numbers: { newThisWeek: number; openLeads: number; overdueTasks: number; wonThisMonth: number };
  wonValue: Record<string, number>;
  byStage: { stage: Stage; count: number }[];
  bySource: { source: Source; count: number }[];
  pipelineValue: { stage: Stage; totals: Record<string, number> }[];
  myOverdue: TaskDTO[];
  leaderboard?: { id: string; name: string; openLeads: number; overdueTasks: number; wonThisMonth: number }[];
}

export default function DashboardPage() {
  const { user, isAdmin } = useSession();
  const [market, setMarket] = useState('');
  const [line, setLine] = useState('');
  const [days, setDays] = useState('30');
  const [newOpen, setNewOpen] = useState(false);
  const from = new Date(Date.now() - Number(days) * 86400000).toISOString();
  const { data, error, loading, reload } = useApi<Dashboard>('/dashboard', { market, businessLine: line, from });

  const openTotal = data?.byStage.reduce((s, b) => s + b.count, 0) ?? 0;
  const maxSource = Math.max(1, ...(data?.bySource.map((s) => s.count) ?? [1]));
  const filterQs = (extra: string) => `/crm/leads?${extra}${market ? `&market=${market}` : ''}${line ? `&businessLine=${line}` : ''}`;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle="Where every lead stands today."
        actions={
          <>
            <select className="field h-9 w-auto" value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Market">
              <option value="">All markets</option>
              {MARKETS.map((m) => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}
            </select>
            <select className="field h-9 w-auto" value={line} onChange={(e) => setLine(e.target.value)} aria-label="Business line">
              <option value="">Agency and Bridge</option>
              {BUSINESS_LINES.map((b) => <option key={b} value={b}>{BUSINESS_LINE_LABELS[b]}</option>)}
            </select>
            <button className="btn-primary" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New lead</button>
          </>
        }
      />
      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-6">
          {/* Key numbers: one strip, read left to right like a sales day. */}
          <section className="panel grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            {[
              { label: 'New leads this week', value: data.numbers.newThisWeek, href: filterQs(`from=${new Date(Date.now() - 7 * 86400000).toISOString()}`) },
              { label: 'Open leads', value: data.numbers.openLeads, href: filterQs('stage=new,contacted,follow_up,qualified,meeting,proposal') },
              { label: isAdmin ? 'Overdue follow-ups (team)' : 'Your overdue follow-ups', value: data.numbers.overdueTasks, href: '/crm/tasks?tab=overdue', alert: data.numbers.overdueTasks > 0 },
              { label: 'Won this month', value: data.numbers.wonThisMonth, href: filterQs('stage=won'), won: true },
            ].map((n) => (
              <Link key={n.label} href={n.href} className="group px-6 py-5 hover:bg-canvas/60">
                <span className="text-[12.5px] text-ink-muted">{n.label}</span>
                <span className={`mt-1 block font-display text-[40px] font-semibold leading-none ${n.alert ? 'text-rose' : n.won ? 'text-brass' : 'text-ink'}`}>
                  {n.value}
                </span>
                {n.won && Object.keys(data.wonValue).length > 0 && (
                  <span className="mt-2 block text-[12.5px] text-ink-muted">
                    {Object.entries(data.wonValue).map(([c, v]) => money(v, c, true)).join(' + ')}
                  </span>
                )}
              </Link>
            ))}
          </section>

          {/* Pipeline ribbon: the share of open leads in each stage. */}
          <section className="panel p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[18px] font-semibold">Open pipeline</h2>
              <Link href="/crm/pipeline" className="text-[13px] font-medium text-orchid hover:underline">Open the board</Link>
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-canvas" role="img" aria-label="Open leads by stage">
              {data.byStage.filter((b) => b.count).map((b) => (
                <div key={b.stage} style={{ width: `${(b.count / Math.max(openTotal, 1)) * 100}%`, background: STAGE_STYLE[b.stage].bar }} title={`${STAGE_LABELS[b.stage]}: ${b.count}`} />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
              {data.pipelineValue.map((pv) => {
                const count = data.byStage.find((b) => b.stage === pv.stage)?.count ?? 0;
                const totals = CURRENCIES.filter((c) => pv.totals[c]);
                return (
                  <Link key={pv.stage} href={filterQs(`stage=${pv.stage}`)} className="rounded-md p-1 -m-1 hover:bg-canvas">
                    <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                      <span className={`h-2 w-2 rounded-full ${STAGE_STYLE[pv.stage].dot}`} />
                      {STAGE_LABELS[pv.stage]}
                    </span>
                    <span className="mt-1 block font-display text-[24px] font-semibold">{count}</span>
                    <span className="block text-[12px] text-ink-muted">
                      {totals.length ? totals.map((c) => money(pv.totals[c], c, true)).join(' · ') : 'No value set'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="panel p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[18px] font-semibold">Where leads came from</h2>
                <select className="field h-8 w-auto text-[12.5px]" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period">
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                </select>
              </div>
              {data.bySource.length === 0 ? (
                <p className="mt-6 text-[13.5px] text-ink-muted">No new leads in this period.</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {data.bySource.map((s) => (
                    <li key={s.source}>
                      <Link href={filterQs(`source=${s.source}&from=${from}`)} className="group block">
                        <span className="flex justify-between text-[13px]">
                          <span className="group-hover:text-orchid">{SOURCE_LABELS[s.source] ?? s.source}</span>
                          <span className="font-medium">{s.count}</span>
                        </span>
                        <span className="mt-1.5 block h-2 rounded-full bg-canvas">
                          <span className="block h-2 rounded-full bg-orchid" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[18px] font-semibold">Your overdue follow-ups</h2>
                <Link href="/crm/tasks?tab=overdue" className="text-[13px] font-medium text-orchid hover:underline">All tasks</Link>
              </div>
              {data.myOverdue.length === 0 ? (
                <div className="mt-6 flex items-center gap-3 rounded-lg bg-sage-soft px-4 py-3 text-[13.5px] text-sage">
                  <Icon name="check" /> Nothing overdue. Nice work.
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {data.myOverdue.map((t) => (
                    <li key={t.id}>
                      <Link href={`/crm/leads/${t.lead?.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-orchid">
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium">{t.lead?.fullName}</span>
                          <span className="block truncate text-[12.5px] text-ink-muted">{t.title}</span>
                        </span>
                        <span className="shrink-0 text-[12.5px] font-medium text-rose">{relative(t.dueAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {isAdmin && data.leaderboard && (
            <section className="panel overflow-hidden">
              <h2 className="px-6 pt-6 text-[18px] font-semibold">Team</h2>
              <div className="overflow-x-auto">
                <table className="mt-3 w-full text-[13.5px]">
                  <thead className="border-b border-line">
                    <tr>
                      <th className="table-head px-6 py-2.5">Owner</th>
                      <th className="table-head px-4 py-2.5 text-right">Open leads</th>
                      <th className="table-head px-4 py-2.5 text-right">Overdue follow-ups</th>
                      <th className="table-head px-6 py-2.5 text-right">Won this month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.leaderboard.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-3"><span className="flex items-center gap-2.5"><Avatar name={r.name} size={26} />{r.name}</span></td>
                        <td className="px-4 py-3 text-right">
                          <Link className="hover:text-orchid" href={`/crm/leads?owner=${r.id}&stage=new,contacted,follow_up,qualified,meeting,proposal`}>{r.openLeads}</Link>
                        </td>
                        <td className={`px-4 py-3 text-right ${r.overdueTasks ? 'font-semibold text-rose' : ''}`}>{r.overdueTasks}</td>
                        <td className="px-6 py-3 text-right font-semibold text-brass">{r.wonThisMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
      <NewLeadPanel open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => reload()} />
    </>
  );
}
