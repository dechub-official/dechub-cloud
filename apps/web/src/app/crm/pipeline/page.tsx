'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CURRENCIES, STAGE_LABELS, type LeadDTO, type Stage } from '@dechub/shared';
import { FollowUpDialog } from '@/components/crm/FollowUpDialog';
import { LostReasonDialog } from '@/components/crm/LostReasonDialog';
import { NewLeadPanel } from '@/components/crm/NewLeadPanel';
import { LineOptions, MarketOptions, UserOptions } from '@/components/crm/options';
import { Avatar, ErrorNote, Field, Loading, PageHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useUsers } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { isOverdue, money, relative } from '@/lib/format';
import { STAGE_STYLE } from '@/lib/stages';

interface Column {
  stage: Stage;
  count: number;
  totals: Record<string, number>;
  leads: LeadDTO[];
}

export default function PipelinePage() {
  const toast = useToast();
  const { users, activeUsers } = useUsers();
  const [owner, setOwner] = useState('');
  const [market, setMarket] = useState('');
  const [line, setLine] = useState('');
  const { data, error, loading, reload, setData } = useApi<{ columns: Column[] }>('/pipeline', { owner, market, businessLine: line });

  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [pending, setPending] = useState<{ lead: LeadDTO; to: Stage } | null>(null);
  const [wonValue, setWonValue] = useState('');
  const [wonCurrency, setWonCurrency] = useState('INR');
  const [followUpFor, setFollowUpFor] = useState<LeadDTO | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const findLead = (id: string) => data?.columns.flatMap((c) => c.leads).find((l) => l.id === id);

  // Move the card right away, then save; put it back if the save fails.
  const move = async (lead: LeadDTO, to: Stage, extra: Record<string, unknown> = {}) => {
    const prev = data;
    setData((d) => d && {
      columns: d.columns.map((c) => {
        if (c.stage === lead.stage) return { ...c, count: c.count - 1, leads: c.leads.filter((l) => l.id !== lead.id) };
        if (c.stage === to) return { ...c, count: c.count + 1, leads: [{ ...lead, stage: to }, ...c.leads] };
        return c;
      }),
    });
    try {
      await api(`/leads/${lead.id}`, { method: 'PATCH', body: { stage: to, ...extra } });
      toast(`${lead.fullName} moved to ${STAGE_LABELS[to]}`);
      reload();
      if (to === 'contacted' || to === 'follow_up') setFollowUpFor(lead);
    } catch (e: any) {
      setData(prev);
      toast(e.message, 'error');
    }
  };

  const onDrop = (to: Stage) => {
    setOver(null);
    const lead = dragId ? findLead(dragId) : undefined;
    setDragId(null);
    if (!lead || lead.stage === to) return;
    if (to === 'lost' || to === 'won') {
      setWonValue(lead.dealValue ? String(lead.dealValue) : '');
      setWonCurrency(lead.currency);
      return setPending({ lead, to });
    }
    move(lead, to);
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Drag a lead to another stage. Won and Lost show the last 90 days."
        actions={
          <>
            <select className="field w-auto" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
              <option value="">All owners</option>
              <option value="me">Me</option>
              <UserOptions users={users} />
            </select>
            <select className="field w-auto" value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Market">
              <option value="">All markets</option>
              <MarketOptions />
            </select>
            <select className="field w-auto" value={line} onChange={(e) => setLine(e.target.value)} aria-label="Business line">
              <option value="">Both lines</option>
              <LineOptions />
            </select>
            <button className="btn-primary" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New lead</button>
          </>
        }
      />
      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
          <div className="flex min-w-max gap-3">
            {data.columns.map((col) => {
              const style = STAGE_STYLE[col.stage];
              const totals = CURRENCIES.filter((c) => col.totals[c]);
              return (
                <section
                  key={col.stage}
                  aria-label={`${STAGE_LABELS[col.stage]}, ${col.count} leads`}
                  onDragOver={(e) => { e.preventDefault(); setOver(col.stage); }}
                  onDragLeave={() => setOver((s) => (s === col.stage ? null : s))}
                  onDrop={() => onDrop(col.stage)}
                  className={`flex w-[268px] flex-col rounded-lg border bg-[#EDEBF3] transition-colors ${over === col.stage ? 'border-orchid bg-orchid-soft' : 'border-transparent'}`}
                >
                  <header className="px-3 pb-2 pt-3">
                    <div className="h-1 rounded-full" style={{ background: style.bar }} />
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <h2 className="font-display text-[15px] font-semibold">{STAGE_LABELS[col.stage]}</h2>
                      <span className="text-[12.5px] font-medium text-ink-muted">{col.count}</span>
                    </div>
                    <p className="text-[12px] text-ink-muted">{totals.length ? totals.map((c) => money(col.totals[c], c, true)).join(' · ') : 'No value'}</p>
                  </header>
                  <div className="flex max-h-[calc(100vh-260px)] min-h-[120px] flex-col gap-2 overflow-y-auto px-2 pb-2">
                    {col.leads.map((l) => (
                      <article
                        key={l.id}
                        draggable
                        onDragStart={() => setDragId(l.id)}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        className={`cursor-grab rounded-md border border-line bg-surface p-3 shadow-[0_1px_0_rgba(26,22,38,0.04)] active:cursor-grabbing ${dragId === l.id ? 'opacity-40' : ''}`}
                      >
                        <Link href={`/crm/leads/${l.id}`} className="block text-[13.5px] font-medium leading-snug hover:text-orchid">{l.fullName}</Link>
                        {l.company && <p className="truncate text-[12.5px] text-ink-muted">{l.company.name}</p>}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-medium">{l.dealValue ? money(l.dealValue, l.currency, true) : <span className="font-normal text-ink-faint">No value</span>}</span>
                          {l.owner && <Avatar name={l.owner.name} size={22} />}
                        </div>
                        {l.nextFollowUpAt && (
                          <p className={`mt-2 flex items-center gap-1 text-[12px] ${isOverdue(l.nextFollowUpAt) ? 'font-medium text-rose' : 'text-ink-muted'}`}>
                            <Icon name="clock" size={13} /> {relative(l.nextFollowUpAt)}
                          </p>
                        )}
                      </article>
                    ))}
                    {col.leads.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-ink-faint">Drop a lead here</p>}
                    {col.count > col.leads.length && (
                      <Link href={`/crm/leads?stage=${col.stage}`} className="py-2 text-center text-[12.5px] text-orchid hover:underline">
                        See all {col.count}
                      </Link>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <LostReasonDialog open={pending?.to === 'lost'} onCancel={() => setPending(null)}
        onConfirm={(reason) => { const p = pending!; setPending(null); move(p.lead, 'lost', { lostReason: reason }); }} />
      <Modal open={pending?.to === 'won'} onClose={() => setPending(null)} title={`Mark ${pending?.lead.fullName ?? ''} as won`}
        footer={<>
          <button className="btn-secondary" onClick={() => setPending(null)}>Cancel</button>
          <button className="btn bg-brass text-white hover:bg-brass/90" onClick={() => {
            const p = pending!; setPending(null);
            move(p.lead, 'won', { dealValue: wonValue ? Number(wonValue) : null, currency: wonCurrency });
          }}>Mark as won</button>
        </>}>
        <p className="mb-4 text-[13.5px] text-ink-muted">Confirm the deal value. Open follow-ups on this lead will be closed.</p>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Deal value"><input className="field" inputMode="numeric" value={wonValue} onChange={(e) => setWonValue(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus /></Field>
          <Field label="Currency"><select className="field" value={wonCurrency} onChange={(e) => setWonCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
      </Modal>
      <FollowUpDialog open={!!followUpFor} users={activeUsers} defaultAssigneeId={followUpFor?.owner?.id}
        heading={`When is the next follow-up with ${followUpFor?.fullName.split(' ')[0] ?? ''}?`} skipLabel="Skip for now"
        initialTitle={`Follow up with ${followUpFor?.fullName.split(' ')[0] ?? ''}`}
        onClose={() => setFollowUpFor(null)}
        onSave={async (v) => {
          try {
            await api('/tasks', { method: 'POST', body: { leadId: followUpFor!.id, ...v } });
            setFollowUpFor(null);
            toast('Follow-up scheduled');
            window.dispatchEvent(new Event('dechub:tasks-changed'));
            reload();
          } catch (e: any) { toast(e.message, 'error'); }
        }} />
      <NewLeadPanel open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => reload()} />
    </>
  );
}
