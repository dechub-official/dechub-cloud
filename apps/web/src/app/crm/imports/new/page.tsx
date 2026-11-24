'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { IMPORT_FIELDS, type ImportField } from '@dechub/shared';
import { LineOptions, MarketOptions, SourceOptions, UserOptions } from '@/components/crm/options';
import { ErrorNote, Field, PageHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useUsers } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

const FIELD_LABEL: Record<ImportField, string> = {
  fullName: 'Full name', email: 'Email', phone: 'Phone', company: 'Company', website: 'Company website',
  jobTitle: 'Job title', location: 'Location', linkedinUrl: 'LinkedIn URL', message: 'Notes',
  dealValue: 'Deal value', source: 'Source', market: 'Market', businessLine: 'Business line', services: 'Services',
};

interface Preview { headers: string[]; rows: Record<string, string>[]; rowCount: number; suggestedMapping: Record<string, ImportField | ''> }
interface Result { rowCount: number; created: number; skipped: number; failed: number; errors: { row: number; reason: string }[] }

const STEPS = ['Upload', 'Map columns', 'Check and import'];

export default function NewImportPage() {
  const { user, org } = useSession();
  const { activeUsers } = useUsers();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField | ''>>({});
  const [defaults, setDefaults] = useState({ source: 'linkedin_scrape', market: org.defaultMarket, businessLine: 'agency', ownerId: user.id });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (f: File) => {
    setFile(f);
    setError('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const p = await api<Preview>('/imports/preview', { method: 'POST', form });
      setPreview(p);
      setMapping(p.suggestedMapping);
      setStep(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const mapped = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const mappingOk = mapped.has('fullName') && (mapped.has('email') || mapped.has('phone'));
  const valueOf = (row: Record<string, string>, f: ImportField) => {
    const h = Object.keys(mapping).find((k) => mapping[k] === f);
    return h ? row[h] : '';
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(mapping));
      form.append('defaults', JSON.stringify(defaults));
      setResult(await api<Result>('/imports', { method: 'POST', form }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <>
        <PageHeader title="Import finished" subtitle={`${file?.name} · ${result.rowCount} rows`} />
        <div className="panel grid max-w-2xl grid-cols-3 divide-x divide-line">
          {[{ l: 'Leads created', v: result.created, c: 'text-sage' }, { l: 'Already in CRM, skipped', v: result.skipped, c: 'text-ink' }, { l: 'Rows with problems', v: result.failed, c: result.failed ? 'text-rose' : 'text-ink' }].map((x) => (
            <div key={x.l} className="px-6 py-5">
              <span className="text-[12.5px] text-ink-muted">{x.l}</span>
              <span className={`mt-1 block font-display text-[36px] font-semibold ${x.c}`}>{x.v}</span>
            </div>
          ))}
        </div>
        {result.errors.length > 0 && (
          <section className="panel mt-6 max-w-2xl p-4">
            <h2 className="text-[16px] font-semibold">Fix these rows and import them again</h2>
            <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto text-[13px]">
              {result.errors.map((e) => <li key={e.row} className="flex gap-4 py-2"><span className="w-16 text-ink-muted">Row {e.row}</span>{e.reason}</li>)}
            </ul>
          </section>
        )}
        <div className="mt-6 flex gap-2">
          <Link href="/crm/leads?sort=createdAt" className="btn-primary">View leads</Link>
          <button className="btn-secondary" onClick={() => { setResult(null); setPreview(null); setFile(null); setStep(0); }}>Import another file</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/crm/imports" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink"><Icon name="chevronLeft" size={15} /> Imports</Link>
      <PageHeader title="Import a CSV" subtitle="The file is read once and never stored." />

      <ol className="mb-6 flex flex-wrap gap-6 text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${i === step ? 'font-medium text-ink' : i < step ? 'text-sage' : 'text-ink-faint'}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] ${i === step ? 'bg-aubergine text-brass-light' : i < step ? 'bg-sage-soft text-sage' : 'bg-line text-ink-muted'}`}>
              {i < step ? <Icon name="check" size={13} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {error && <div className="mb-4 max-w-3xl"><ErrorNote message={error} /></div>}

      {step === 0 && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          className={`flex max-w-3xl cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${drag ? 'border-orchid bg-orchid-soft' : 'border-line-strong bg-surface hover:border-orchid'}`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-orchid-soft text-orchid"><Icon name="upload" size={22} /></span>
          <span className="mt-4 text-[16px] font-semibold">{busy ? 'Reading the file…' : 'Drop a CSV here, or choose a file'}</span>
          <span className="mt-1 text-[13px] text-ink-muted">Up to 5 MB or 10,000 rows. Export from Google Sheets with File, Download, CSV.</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </label>
      )}

      {step === 1 && preview && (
        <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
          <section className="panel overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-[13px] text-ink-muted">{file?.name} · {preview.rowCount} rows · {preview.headers.length} columns</div>
            <table className="w-full text-[13.5px]">
              <thead className="bg-canvas/50">
                <tr><th className="table-head px-4 py-2.5">Column in your file</th><th className="table-head px-4 py-2.5">Example</th><th className="table-head px-4 py-2.5">Save as</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.headers.map((h) => (
                  <tr key={h}>
                    <td className="px-4 py-2.5 font-medium">{h}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-ink-muted">{preview.rows.find((r) => r[h])?.[h] ?? '—'}</td>
                    <td className="px-4 py-2">
                      <select className="field" value={mapping[h] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ImportField | '' }))}>
                        <option value="">Don't import</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f} value={f} disabled={mapped.has(f) && mapping[h] !== f}>{FIELD_LABEL[f]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <aside className="space-y-4">
            <div className="panel space-y-4 p-4">
              <h2 className="text-[15px] font-semibold">For every row</h2>
              <p className="-mt-2 text-[12.5px] text-ink-muted">Used when a row has no value of its own.</p>
              <Field label="Source"><select className="field" value={defaults.source} onChange={(e) => setDefaults({ ...defaults, source: e.target.value })}><SourceOptions /></select></Field>
              <Field label="Market"><select className="field" value={defaults.market} onChange={(e) => setDefaults({ ...defaults, market: e.target.value as any })}><MarketOptions /></select></Field>
              <Field label="Business line"><select className="field" value={defaults.businessLine} onChange={(e) => setDefaults({ ...defaults, businessLine: e.target.value })}><LineOptions /></select></Field>
              <Field label="Owner"><select className="field" value={defaults.ownerId} onChange={(e) => setDefaults({ ...defaults, ownerId: e.target.value })}><UserOptions users={activeUsers} /></select></Field>
            </div>
            {!mappingOk && <p className="text-[12.5px] text-rose">Map one column to Full name, and one to Email or Phone.</p>}
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button className="btn-primary flex-1" disabled={!mappingOk} onClick={() => setStep(2)}>Continue</button>
            </div>
          </aside>
        </div>
      )}

      {step === 2 && preview && (
        <div className="max-w-5xl">
          <section className="panel overflow-x-auto">
            <div className="border-b border-line px-4 py-3 text-[13px] text-ink-muted">The first {Math.min(10, preview.rows.length)} rows, as they will be saved</div>
            <table className="w-full min-w-[700px] text-[13.5px]">
              <thead className="bg-canvas/50">
                <tr>{(['fullName', 'email', 'phone', 'company', 'jobTitle'] as ImportField[]).map((f) => <th key={f} className="table-head px-4 py-2.5">{FIELD_LABEL[f]}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r, i) => (
                  <tr key={i}>{(['fullName', 'email', 'phone', 'company', 'jobTitle'] as ImportField[]).map((f) => <td key={f} className="px-4 py-2.5">{valueOf(r, f) || <span className="text-ink-faint">—</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="mt-4 text-[13px] text-ink-muted">Rows whose email or phone already exists in the CRM are skipped, never merged.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" disabled={busy} onClick={run}>{busy ? `Importing ${preview.rowCount} rows…` : `Import ${preview.rowCount} rows`}</button>
          </div>
        </div>
      )}
    </>
  );
}
