'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, ErrorNote, Loading, PageHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useApi } from '@/hooks/useApi';

interface Row { id: string; name: string; website?: string; leadCount: number }

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const { data, error, loading } = useApi<{ items: Row[] }>('/companies', { q, limit: 300 });

  return (
    <>
      <PageHeader title="Companies" subtitle="Created automatically when you add a company to a lead." />
      <div className="relative mb-4 max-w-md">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="field pl-9" placeholder="Search companies" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search companies" />
      </div>
      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <div className="panel"><Empty icon="companies" title={q ? 'No companies match' : 'No companies yet'} body="Add a company name on any lead and it will appear here." /></div>}
      {data && data.items.length > 0 && (
        <div className="panel overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="border-b border-line bg-canvas/50">
              <tr>
                <th className="table-head px-4 py-2.5">Company</th>
                <th className="table-head px-4 py-2.5">Website</th>
                <th className="table-head px-4 py-2.5 text-right">Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-3"><Link href={`/crm/companies/${c.id}`} className="font-medium hover:text-orchid">{c.name}</Link></td>
                  <td className="px-4 py-3 text-ink-muted">
                    {c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="hover:text-orchid">{c.website.replace(/^https?:\/\//, '')}</a> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{c.leadCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
