'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MARKET_CURRENCY, REVENUE_BANDS, SERVICES, type Market } from '@dechub/shared';
import { useUsers } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ErrorNote, Field } from '../ui/bits';
import { Drawer } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { LineOptions, MarketOptions, SourceOptions, UserOptions } from './options';

const empty = (market: Market, ownerId: string) => ({
  fullName: '',
  email: '',
  phone: '',
  companyName: '',
  companyWebsite: '',
  jobTitle: '',
  location: '',
  market,
  businessLine: 'agency',
  source: 'linkedin_outreach',
  services: [] as string[],
  revenueBand: '',
  dealValue: '',
  linkedinUrl: '',
  message: '',
  ownerId,
});

/** LEAD-01 and LEAD-03: create a lead, warning about duplicates while typing. */
export function NewLeadPanel({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { user, org } = useSession();
  const { activeUsers } = useUsers();
  const toast = useToast();
  const [form, setForm] = useState(empty(org.defaultMarket, user.id));
  const [dup, setDup] = useState<{ id: string; fullName: string; owner: string | null } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(empty(org.defaultMarket, user.id));
      setDup(null);
      setErrors({});
      setError('');
    }
  }, [open, org.defaultMarket, user.id]);

  // Duplicate check, debounced while the user types.
  useEffect(() => {
    if (!open || (!form.email && form.phone.replace(/\D/g, '').length < 6)) {
      setDup(null);
      return;
    }
    const t = setTimeout(() => {
      api<{ duplicate: any }>('/leads/check-duplicate', { query: { email: form.email, phone: form.phone } })
        .then((r) => setDup(r.duplicate))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [form.email, form.phone, open]);

  const set = (k: keyof ReturnType<typeof empty>, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleService = (s: string) =>
    set('services', form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s]);

  const save = async () => {
    setBusy(true);
    setError('');
    setErrors({});
    try {
      const res = await api<{ lead: { id: string } }>('/leads', {
        method: 'POST',
        body: {
          ...form,
          dealValue: form.dealValue ? Number(form.dealValue) : undefined,
          currency: MARKET_CURRENCY[form.market as Market],
          allowDuplicate: !!dup,
        },
      });
      toast(`${form.fullName} added`);
      onCreated?.(res.lead.id);
      onClose();
    } catch (e: any) {
      if (e.fields) setErrors(e.fields);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k]?.[0];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New lead"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy || !form.fullName}>
            {busy ? 'Saving…' : dup ? 'Save anyway' : 'Save lead'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && !Object.keys(errors).length && <ErrorNote message={error} />}
        {dup && (
          <div className="rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-[13px] text-[#7A5013]">
            <b>{dup.fullName}</b> already has this email or phone{dup.owner ? ` (owner: ${dup.owner})` : ''}.{' '}
            <Link href={`/crm/leads/${dup.id}`} className="font-medium underline" onClick={onClose}>
              Open that lead
            </Link>{' '}
            or save this one anyway.
          </div>
        )}
        <Field label="Full name" error={err('fullName')}>
          <input className="field" autoFocus value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={err('email')}>
            <input className="field" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone" hint="Include the country code">
            <input className="field" value={form.phone} placeholder="+971 50 123 4567" onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Company">
            <input className="field" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
          </Field>
          <Field label="Job title">
            <input className="field" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
          </Field>
          <Field label="Source">
            <select className="field" value={form.source} onChange={(e) => set('source', e.target.value)}><SourceOptions /></select>
          </Field>
          <Field label="Owner">
            <select className="field" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}><UserOptions users={activeUsers} /></select>
          </Field>
          <Field label="Market">
            <select className="field" value={form.market} onChange={(e) => set('market', e.target.value)}><MarketOptions /></select>
          </Field>
          <Field label="Business line">
            <select className="field" value={form.businessLine} onChange={(e) => set('businessLine', e.target.value)}><LineOptions /></select>
          </Field>
          <Field label={`Deal value (${MARKET_CURRENCY[form.market as Market]})`}>
            <input className="field" inputMode="numeric" value={form.dealValue} onChange={(e) => set('dealValue', e.target.value.replace(/[^0-9.]/g, ''))} />
          </Field>
          <Field label="Annual revenue">
            <select className="field" value={form.revenueBand} onChange={(e) => set('revenueBand', e.target.value)}>
              <option value="">Not known</option>
              {REVENUE_BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="label">Services interested in</span>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((s) => {
              const on = form.services.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleService(s)} aria-pressed={on}
                  className={`rounded-full border px-2.5 py-1 text-[12.5px] ${on ? 'border-orchid bg-orchid text-white' : 'border-line hover:border-orchid'}`}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="LinkedIn URL">
          <input className="field" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className="field" rows={3} value={form.message} onChange={(e) => set('message', e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}
