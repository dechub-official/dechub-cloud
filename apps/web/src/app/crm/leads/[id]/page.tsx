'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BUSINESS_LINE_LABELS,
  CONTACT_TYPES,
  CURRENCIES,
  MARKET_LABELS,
  REVENUE_BANDS,
  SERVICES,
  SOURCE_LABELS,
  STAGES,
  STAGE_LABELS,
  type ActivityDTO,
  type LeadDTO,
  type Stage,
  type TaskDTO,
} from '@dechub/shared';
import { FollowUpDialog } from '@/components/crm/FollowUpDialog';
import { LostReasonDialog } from '@/components/crm/LostReasonDialog';
import { LineOptions, MarketOptions, SourceOptions, UserOptions } from '@/components/crm/options';
import { Avatar, ErrorNote, Loading, StagePill } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useUsers } from '@/hooks/useUsers';
import { api, todayEnd } from '@/lib/api';
import { dateTime, isOverdue, money, relative } from '@/lib/format';
import { useSession } from '@/lib/session';
import { STAGE_STYLE } from '@/lib/stages';

const ACTIVITY_ICON: Record<string, string> = {
  note: 'note', call: 'phone', email: 'mail', whatsapp: 'chat', linkedin: 'linkedin', meeting: 'calendar',
  stage_change: 'pipeline', owner_change: 'user', created: 'sparkle', form_resubmitted: 'mail',
  task_done: 'check', task_rescheduled: 'clock', task_cancelled: 'close',
};
const CONTACT_LABEL: Record<string, string> = { note: 'Note', call: 'Call', email: 'Email', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', meeting: 'Meeting' };

function describe(a: ActivityDTO) {
  const m = (a.meta ?? {}) as Record<string, any>;
  switch (a.type) {
    case 'created':
      return m.via === 'website_form' ? `Lead arrived from the ${m.form === 'bridge' ? 'Bridge' : 'dechub.in'} form` : m.via === 'import' ? 'Lead imported from CSV' : 'Lead created';
    case 'form_resubmitted':
      return 'Submitted the website form again';
    case 'stage_change':
      return `Moved from ${STAGE_LABELS[m.from as Stage] ?? m.from} to ${STAGE_LABELS[m.to as Stage] ?? m.to}${m.lostReason ? `. Reason: ${m.lostReason}` : ''}`;
    case 'owner_change': {
      const why = m.reason === 'online' ? ' (online when the lead arrived)' : m.reason === 'default' ? ' (default owner, nobody was online)' : '';
      return `Owner set to ${m.to}${why}`;
    }
    case 'task_done':
      return 'Follow-up done';
    case 'task_rescheduled':
      return `Follow-up rescheduled to ${dateTime(m.dueAt)}`;
    case 'task_cancelled':
      return 'Follow-up cancelled';
    default:
      return CONTACT_LABEL[a.type] ?? a.type;
  }
}

/** A value that turns into an input when clicked and saves when you leave it (LEAD-02). */
function Editable({
  label, value, display, onSave, type = 'text', options,
}: {
  label: string;
  value?: string | number | null;
  display?: React.ReactNode;
  onSave: (v: string) => Promise<void>;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select';
  options?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? '');
  const ref = useRef<any>(null);
  useEffect(() => setV(value ?? ''), [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = async () => {
    setEditing(false);
    if (String(v) !== String(value ?? '')) await onSave(String(v)).catch(() => setV(value ?? ''));
  };
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3 py-1">
      <span className="pt-1.5 text-[12.5px] text-ink-muted">{label}</span>
      {editing ? (
        type === 'textarea' ? (
          <textarea ref={ref} className="field" rows={4} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} />
        ) : type === 'select' ? (
          <select ref={ref} className="field" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}>{options}</select>
        ) : (
          <input ref={ref} className="field" type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setV(value ?? ''); setEditing(false); } }} />
        )
      ) : (
        <button className="min-h-[36px] rounded-md px-2 py-1.5 text-left text-[13.5px] hover:bg-canvas" onClick={() => setEditing(true)} title={`Edit ${label.toLowerCase()}`}>
          {display ?? (value || value === 0 ? <span className="whitespace-pre-wrap break-words">{value}</span> : <span className="text-ink-faint">Add</span>)}
        </button>
      )}
    </div>
  );
}

export default function LeadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useSession();
  const { activeUsers } = useUsers();
  const { data, error, setData } = useApi<{ lead: LeadDTO }>(`/leads/${params.id}`);
  const timeline = useApi<{ items: ActivityDTO[] }>(`/leads/${params.id}/activities`);
  const tasks = useApi<{ items: TaskDTO[] }>('/tasks', { leadId: params.id, window: 'open', todayEnd: todayEnd() });

  const [noteType, setNoteType] = useState<string>('note');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [followUp, setFollowUp] = useState<{ open: boolean; heading?: string; skip?: string }>({ open: false });
  const [reschedule, setReschedule] = useState<TaskDTO | null>(null);

  const lead = data?.lead;
  const refreshSide = () => { timeline.reload(); tasks.reload(); window.dispatchEvent(new Event('dechub:tasks-changed')); };

  const patch = async (body: Record<string, unknown>) => {
    try {
      const r = await api<{ lead: LeadDTO }>(`/leads/${params.id}`, { method: 'PATCH', body });
      setData(r);
      timeline.reload();
      return r.lead;
    } catch (e: any) {
      toast(e.fields ? Object.values(e.fields).flat()[0] as string : e.message, 'error');
      throw e;
    }
  };

  const moveTo = async (stage: Stage) => {
    if (!lead || stage === lead.stage) return;
    if (stage === 'lost') return setLostOpen(true);
    await patch({ stage });
    toast(`Moved to ${STAGE_LABELS[stage]}`);
    if (stage === 'contacted' || stage === 'follow_up') {
      setFollowUp({ open: true, heading: 'When is the next follow-up?', skip: 'Skip for now' });
    }
    if (stage === 'won') tasks.reload();
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await api(`/leads/${params.id}/activities`, { method: 'POST', body: { type: noteType, body: note } });
      setNote('');
      timeline.reload();
      if (noteType !== 'note' && lead && lead.stage !== 'won' && lead.stage !== 'lost') {
        setFollowUp({ open: true, heading: 'Logged. Set the next follow-up?', skip: 'Not now' });
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSavingNote(false);
    }
  };

  if (error) return <ErrorNote message={error} />;
  if (!lead) return <Loading />;

  const closed = lead.stage === 'won' || lead.stage === 'lost';
  const stageIndex = STAGES.indexOf(lead.stage);

  return (
    <>
      <Link href="/crm/leads" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink"><Icon name="chevronLeft" size={15} /> Leads</Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-semibold leading-tight">{lead.fullName}</h1>
            <StagePill stage={lead.stage} />
          </div>
          <p className="mt-1 text-[14px] text-ink-muted">
            {[lead.jobTitle, lead.company?.name].filter(Boolean).join(' at ') || 'No company yet'}
            {' · '}{SOURCE_LABELS[lead.source]} · added {relative(lead.createdAt)}
          </p>
          {lead.stage === 'lost' && lead.lostReason && <p className="mt-1 text-[13px] text-rose">Lost: {lead.lostReason}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.email && <a className="btn-secondary" href={`mailto:${lead.email}`}><Icon name="mail" size={16} /> Email</a>}
          {lead.phone && <a className="btn-secondary" href={`tel:${lead.phone}`}><Icon name="phone" size={16} /> Call</a>}
          {lead.phone && <a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}><Icon name="chat" size={16} /> WhatsApp</a>}
          {isAdmin && (
            <button className="btn-ghost text-rose" onClick={async () => {
              if (!confirm(`Delete ${lead.fullName}? The lead will be hidden everywhere.`)) return;
              try { await api(`/leads/${lead.id}`, { method: 'DELETE' }); toast('Lead deleted'); router.push('/crm/leads'); } catch (e: any) { toast(e.message, 'error'); }
            }}><Icon name="trash" size={16} /> Delete</button>
          )}
        </div>
      </header>

      {/* Stage bar: click any stage to move the lead there. */}
      <nav className="mb-6 flex overflow-x-auto rounded-lg border border-line bg-surface p-1" aria-label="Stage">
        {STAGES.map((s, i) => {
          const active = s === lead.stage;
          const passed = !closed && i < stageIndex;
          return (
            <button key={s} onClick={() => moveTo(s)} aria-current={active ? 'step' : undefined}
              className={`flex min-w-[96px] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[12.5px] font-medium transition-colors ${
                active ? 'text-white' : passed ? 'text-ink-soft hover:bg-canvas' : 'text-ink-muted hover:bg-canvas'
              }`}
              style={active ? { background: STAGE_STYLE[s].bar } : undefined}>
              {passed && <Icon name="check" size={13} />}
              {STAGE_LABELS[s]}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="panel h-fit px-4 py-3">
          <h2 className="px-2 pb-1 pt-2 text-[16px] font-semibold">Details</h2>
          <div className="divide-y divide-line/70">
            <Editable label="Full name" value={lead.fullName} onSave={(v) => patch({ fullName: v }).then(() => {})} />
            <Editable label="Email" type="email" value={lead.email} onSave={(v) => patch({ email: v }).then(() => {})} />
            <Editable label="Phone" value={lead.phone} onSave={(v) => patch({ phone: v }).then(() => {})} />
            <Editable label="Company" value={lead.company?.name}
              display={lead.company ? <Link href={`/crm/companies/${lead.company.id}`} onClick={(e) => e.stopPropagation()} className="text-orchid hover:underline">{lead.company.name}</Link> : undefined}
              onSave={(v) => patch({ companyName: v }).then(() => {})} />
            <Editable label="Job title" value={lead.jobTitle} onSave={(v) => patch({ jobTitle: v }).then(() => {})} />
            <Editable label="Location" value={lead.location} onSave={(v) => patch({ location: v }).then(() => {})} />
            <Editable label="Owner" type="select" value={lead.owner?.id}
              display={lead.owner ? <span className="flex items-center gap-2"><Avatar name={lead.owner.name} size={22} />{lead.owner.name}</span> : undefined}
              options={<><option value="">Unassigned</option><UserOptions users={activeUsers} /></>}
              onSave={(v) => patch({ ownerId: v }).then(() => toast('Owner changed'))} />
            <Editable label="Deal value" type="number" value={lead.dealValue}
              display={lead.dealValue ? money(lead.dealValue, lead.currency) : undefined}
              onSave={(v) => patch({ dealValue: v === '' ? null : Number(v) }).then(() => {})} />
            <Editable label="Currency" type="select" value={lead.currency} options={CURRENCIES.map((c) => <option key={c}>{c}</option>)} onSave={(v) => patch({ currency: v }).then(() => {})} />
            <Editable label="Market" type="select" value={lead.market} display={MARKET_LABELS[lead.market]} options={<MarketOptions />} onSave={(v) => patch({ market: v }).then(() => {})} />
            <Editable label="Business line" type="select" value={lead.businessLine} display={BUSINESS_LINE_LABELS[lead.businessLine]} options={<LineOptions />} onSave={(v) => patch({ businessLine: v }).then(() => {})} />
            <Editable label="Source" type="select" value={lead.source} display={SOURCE_LABELS[lead.source]} options={<SourceOptions />} onSave={(v) => patch({ source: v }).then(() => {})} />
            <Editable label="Revenue" type="select" value={lead.revenueBand} options={<><option value="">Not known</option>{REVENUE_BANDS.map((b) => <option key={b}>{b}</option>)}</>} onSave={(v) => patch({ revenueBand: v }).then(() => {})} />
            <Editable label="Project type" value={lead.projectType} onSave={(v) => patch({ projectType: v }).then(() => {})} />
            <div className="grid grid-cols-[110px_1fr] gap-3 py-2">
              <span className="pt-1.5 text-[12.5px] text-ink-muted">Services</span>
              <div className="flex flex-wrap gap-1.5 py-1">
                {SERVICES.map((s) => {
                  const on = lead.services.includes(s);
                  return (
                    <button key={s} aria-pressed={on} onClick={() => patch({ services: on ? lead.services.filter((x) => x !== s) : [...lead.services, s] })}
                      className={`rounded-full border px-2 py-0.5 text-[12px] ${on ? 'border-orchid bg-orchid-soft text-orchid-hover' : 'border-line text-ink-faint hover:text-ink'}`}>{s}</button>
                  );
                })}
              </div>
            </div>
            <Editable label="LinkedIn" value={lead.linkedinUrl}
              display={lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-orchid hover:underline">Profile <Icon name="external" size={13} /></a> : undefined}
              onSave={(v) => patch({ linkedinUrl: v }).then(() => {})} />
            <Editable label="Message" type="textarea" value={lead.message} onSave={(v) => patch({ message: v }).then(() => {})} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-4">
            <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="What are you logging">
              {(['note', ...CONTACT_TYPES] as string[]).map((t) => (
                <button key={t} role="radio" aria-checked={noteType === t} onClick={() => setNoteType(t)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium ${noteType === t ? 'border-aubergine bg-aubergine text-white' : 'border-line text-ink-soft hover:border-ink-faint'}`}>
                  <Icon name={ACTIVITY_ICON[t]} size={14} /> {CONTACT_LABEL[t]}
                </button>
              ))}
            </div>
            <textarea className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={noteType === 'note' ? 'Write a note…' : `What happened on the ${CONTACT_LABEL[noteType].toLowerCase()}?`}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }} />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-ink-faint">Ctrl + Enter to save</span>
              <button className="btn-primary" disabled={!note.trim() || savingNote} onClick={saveNote}>
                {noteType === 'note' ? 'Save note' : `Log ${CONTACT_LABEL[noteType].toLowerCase()}`}
              </button>
            </div>
          </section>

          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Follow-ups</h2>
              {!closed && <button className="btn-secondary btn-sm" onClick={() => setFollowUp({ open: true })}><Icon name="plus" size={15} /> Add follow-up</button>}
            </div>
            {tasks.data?.items.length ? (
              <ul className="mt-3 divide-y divide-line">
                {tasks.data.items.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <button aria-label={`Mark "${t.title}" done`} title="Mark done"
                      className="grid h-6 w-6 place-items-center rounded-full border-2 border-line-strong text-transparent hover:border-sage hover:text-sage"
                      onClick={async () => { await api(`/tasks/${t.id}`, { method: 'PATCH', body: { action: 'complete' } }); toast('Follow-up done'); refreshSide(); }}>
                      <Icon name="check" size={13} />
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{t.title}</span>
                      <span className={`block text-[12.5px] ${isOverdue(t.dueAt) ? 'font-medium text-rose' : 'text-ink-muted'}`}>
                        {isOverdue(t.dueAt) ? 'Overdue · ' : ''}{dateTime(t.dueAt)} · {t.assignee?.name}
                      </span>
                    </span>
                    <button className="btn-ghost btn-sm" onClick={() => setReschedule(t)}><Icon name="clock" size={15} /> Reschedule</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-ink-muted">{closed ? 'This lead is closed.' : 'No follow-up scheduled. Every open lead should have one.'}</p>
            )}
          </section>

          <section className="panel p-4">
            <h2 className="mb-3 text-[16px] font-semibold">Timeline</h2>
            {!timeline.data ? <Loading /> : (
              <ol className="relative ml-3 border-l border-line">
                {timeline.data.items.map((a) => {
                  const contact = ['note', ...CONTACT_TYPES].includes(a.type as any);
                  return (
                    <li key={a.id} className="relative mb-5 pl-6 last:mb-0">
                      <span className={`absolute -left-3 top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface ${contact ? 'bg-aubergine text-brass-light' : 'bg-canvas text-ink-muted'}`}>
                        <Icon name={ACTIVITY_ICON[a.type] ?? 'note'} size={13} />
                      </span>
                      <p className="text-[13px]">
                        <span className="font-medium">{describe(a)}</span>
                        <span className="text-ink-muted"> · {a.author?.name ?? 'System'} · {dateTime(a.createdAt)}</span>
                      </p>
                      {a.body && <p className="mt-1 whitespace-pre-wrap rounded-md bg-canvas px-3 py-2 text-[13.5px] leading-relaxed text-ink-soft">{a.body}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <LostReasonDialog open={lostOpen} onCancel={() => setLostOpen(false)}
        onConfirm={async (reason) => { setLostOpen(false); await patch({ stage: 'lost', lostReason: reason }); toast('Marked as lost'); refreshSide(); }} />
      <FollowUpDialog open={followUp.open} heading={followUp.heading} skipLabel={followUp.skip} users={activeUsers}
        defaultAssigneeId={lead.owner?.id} initialTitle={`Follow up with ${lead.fullName.split(' ')[0]}`}
        onClose={() => setFollowUp({ open: false })}
        onSave={async (v) => {
          try {
            await api('/tasks', { method: 'POST', body: { leadId: lead.id, ...v } });
            setFollowUp({ open: false });
            toast('Follow-up scheduled');
            refreshSide();
            const r = await api<{ lead: LeadDTO }>(`/leads/${lead.id}`); setData(r);
          } catch (e: any) { toast(e.message, 'error'); }
        }} />
      <FollowUpDialog open={!!reschedule} mode="reschedule" onClose={() => setReschedule(null)}
        onSave={async (v) => {
          if (!reschedule) return;
          await api(`/tasks/${reschedule.id}`, { method: 'PATCH', body: { action: 'reschedule', dueAt: v.dueAt } });
          setReschedule(null);
          toast('Follow-up rescheduled');
          refreshSide();
        }} />
    </>
  );
}
