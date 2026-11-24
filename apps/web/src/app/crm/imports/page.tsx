'use client';

import Link from 'next/link';
import { Empty, ErrorNote, Loading, PageHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useApi } from '@/hooks/useApi';
import { dateTime } from '@/lib/format';

interface Row { id: string; fileName?: string; rowCount: number; created: number; skipped: number; failed: number; user?: { name: string } | null; createdAt: string }

export default function ImportsPage() {
  const { data, error, loading } = useApi<{ items: Row[] }>('/imports');
  return (
    <>
      <PageHeader
        title="Imports"
        subtitle="Bring in lists from Apify, Oppora, Meta Ads Manager, newsletters and spreadsheets."
        actions={<Link href="/crm/imports/new" className="btn-primary"><Icon name="upload" size={16} /> Import a CSV</Link>}
      />
      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && (
        <div className="panel"><Empty icon="imports" title="No imports yet" body="Export your list as CSV, then map its columns to lead fields." action={<Link href="/crm/imports/new" className="btn-primary">Import a CSV</Link>} /></div>
      )}
      {data && data.items.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[700px] text-[13.5px]">
            <thead className="border-b border-line bg-canvas/50">
              <tr>
                <th className="table-head px-4 py-2.5">File</th>
                <th className="table-head px-4 py-2.5">By</th>
                <th className="table-head px-4 py-2.5">When</th>
                <th className="table-head px-4 py-2.5 text-right">Rows</th>
                <th className="table-head px-4 py-2.5 text-right">Created</th>
                <th className="table-head px-4 py-2.5 text-right">Skipped</th>
                <th className="table-head px-4 py-2.5 text-right">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.fileName ?? 'Untitled'}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">{r.rowCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-sage">{r.created}</td>
                  <td className="px-4 py-3 text-right text-ink-muted">{r.skipped}</td>
                  <td className={`px-4 py-3 text-right ${r.failed ? 'font-medium text-rose' : 'text-ink-muted'}`}>{r.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
