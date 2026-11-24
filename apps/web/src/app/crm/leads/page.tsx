'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  MARKET_LABELS,
  SERVICES,
  SOURCE_LABELS,
  type LeadDTO,
  type Paginated,
} from '@dechub/shared';
import { LostReasonDialog } from '@/components/crm/LostReasonDialog';
import { NewLeadPanel } from '@/components/crm/NewLeadPanel';
import { LineOptions, MarketOptions, SourceOptions, StageOptions, UserOptions } from '@/components/crm/options';
import { Avatar, Empty, ErrorNote, Loading, PageHeader, StagePill } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useUsers } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { isOverdue, money, relative } from '@/lib/format';
import { useSession } from '@/lib/session';

const FILTER_KEYS = ['q', 'stage', 'source', 'owner', 'market', 'businessLine', 'service', 'from', 'to', 'sort', 'dir', 'page'] as const;

function LeadsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isAdmin } = useSession();
  const { users, activeUsers } = useUsers();
  const toast = useToast();

  // Filters live in the URL, so a filtered view can be bookmarked or shared (LEAD-06).
  const query = useMemo(() => {
    const q: Record<string, string> = {};
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) q[k] = v;
    }
    return q;
  }, [params]);

  const setParam = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  };

  const { data, error, loading, reload } = useApi<Paginated<LeadDTO>>('/leads', { ...query, pageSize: 50 });
  const [search, setSearch] = useState(query.q ?? '');
  useEffect(() => setSearch(query.q ?? ''), [query.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((query.q ?? '') !== search) setParam({ q: search || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set()), [data]);
  const [newOpen, setNewOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  const filterCount = ['stage', 'source', 'owner', 'market', 'businessLine', 'service', 'from'].filter((k) => query[k as keyof typeof query]).length;
  const page = Number(query.page ?? 1);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const sortBy = (field: string) => {
    const dir = query.sort === field && query.dir !== 'asc' ? 'asc' : 'desc';
    setParam({ sort: field, dir });
  };
  const SortHead = ({ field, children, className = '' }: { field: string; children: React.ReactNode; className?: string }) => (
    <th className={`table-head px-3 py-2.5 ${className}`}>
      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => sortBy(field)}>
        {children}
        {query.sort === field && <span aria-hidden>{query.dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  const bulk = async (body: Record<string, unknown>, label: string) => {
    try {
      const r = await api<{ updated: number }>('/leads/bulk', { method: 'POST', body: { ids: [...selected], ...body } });
      toast(`${r.updated} lead${r.updated === 1 ? '' : 's'} ${label}`);
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const allSelected = !!data?.items.length && data.items.every((l) => selected.has(l.id));

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={data ? `${data.total.toLocaleString()} lead${data.total === 1 ? '' : 's'}${filterCount ? ' match these filters' : ''}` : ' '}
        actions={<button className="btn-primary" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New lead</button>}
      />

      <div className="panel mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="field pl-9" placeholder="Name, email, phone or company" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search leads" />
          </div>
          <select className="field w-auto" value={query.stage?.includes(',') ? '' : query.stage ?? ''} onChange={(e) => setParam({ stage: e.target.value || undefined })} aria-label="Stage">
            <option value="">{query.stage?.includes(',') ? 'Open stages' : 'All stages'}</option>
            <StageOptions />
          </select>
          <select className="field w-auto" value={query.source ?? ''} onChange={(e) => setParam({ source: e.target.value || undefined })} aria-label="Source">
            <option value="">All sources</option>
            <SourceOptions />
          </select>
          <select className="field w-auto" value={query.owner ?? ''} onChange={(e) => setParam({ owner: e.target.value || undefined })} aria-label="Owner">
            <option value="">All owners</option>
            <option value="me">Me</option>
            <UserOptions users={users} />
          </select>
          <select className="field w-auto" value={query.market ?? ''} onChange={(e) => setParam({ market: e.target.value || undefined })} aria-label="Market">
            <option value="">All markets</option>
            <MarketOptions />
          </select>
          <select className="field w-auto" value={query.businessLine ?? ''} onChange={(e) => setParam({ businessLine: e.target.value || undefined })} aria-label="Business line">
            <option value="">Both lines</option>
            <LineOptions />
          </select>
          <select className="field w-auto" value={query.service ?? ''} onChange={(e) => setParam({ service: e.target.value || undefined })} aria-label="Service">
            <option value="">Any service</option>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input
            type="date"
            className="field w-auto"
            aria-label="Created from"
            value={query.from ? query.from.slice(0, 10) : ''}
            onChange={(e) => setParam({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
          {(filterCount > 0 || query.q) && (
            <button className="btn-ghost" onClick={() => router.replace(pathname)}>Clear filters</button>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-[68px] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-aubergine px-4 py-2.5 text-[13px] text-white shadow-lift">
          <span className="mr-2 font-medium">{selected.size} selected</span>
          <select className="field h-8 w-auto text-ink" defaultValue="" onChange={(e) => { if (e.target.value) bulk({ action: 'owner', ownerId: e.target.value }, 'reassigned'); e.target.value = ''; }} aria-label="Change owner">
            <option value="" disabled>Change owner</option>
            <UserOptions users={activeUsers} />
          </select>
          <select className="field h-8 w-auto text-ink" defaultValue="" onChange={(e) => {
            const v = e.target.value; e.target.value = '';
            if (v === 'lost') setLostOpen(true);
            else if (v) bulk({ action: 'stage', stage: v }, 'moved');
          }} aria-label="Change stage">
            <option value="" disabled>Move to stage</option>
            <StageOptions />
          </select>
          {isAdmin && (
            <button className="btn-sm btn bg-rose text-white hover:bg-rose/90" onClick={() => {
              if (confirm(`Delete ${selected.size} lead(s)? They will be hidden everywhere.`)) bulk({ action: 'delete' }, 'deleted');
            }}>
              <Icon name="trash" size={15} /> Delete
            </button>
          )}
          <button className="btn-sm btn ml-auto text-[#BDB5D3] hover:text-white" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && (
        <div className="panel">
          {filterCount || query.q ? (
            <Empty icon="filter" title="No leads match" body="Try removing a filter or searching for part of a name." action={<button className="btn-secondary" onClick={() => router.replace(pathname)}>Clear filters</button>} />
          ) : (
            <Empty icon="leads" title="No leads yet" body="Add one by hand, import a CSV, or connect your website forms in Settings."
              action={<div className="flex gap-2"><button className="btn-primary" onClick={() => setNewOpen(true)}>New lead</button><Link href="/crm/imports/new" className="btn-secondary">Import a CSV</Link></div>} />
          )}
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className={`panel overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[13.5px]">
              <thead className="border-b border-line bg-canvas/50">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" className="accent-[#5B3CC4]" aria-label="Select all" checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(data.items.map((l) => l.id)))} />
                  </th>
                  <SortHead field="fullName">Name</SortHead>
                  <th className="table-head px-3 py-2.5">Company</th>
                  <SortHead field="stage">Stage</SortHead>
                  <th className="table-head px-3 py-2.5">Source</th>
                  <th className="table-head px-3 py-2.5">Owner</th>
                  <th className="table-head px-3 py-2.5">Market</th>
                  <SortHead field="dealValue" className="text-right">Value</SortHead>
                  <SortHead field="nextFollowUpAt">Next follow-up</SortHead>
                  <SortHead field="createdAt">Added</SortHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((l) => (
                  <tr key={l.id} className={`group hover:bg-canvas/60 ${selected.has(l.id) ? 'bg-orchid-soft/50' : ''}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" className="accent-[#5B3CC4]" aria-label={`Select ${l.fullName}`} checked={selected.has(l.id)}
                        onChange={() => setSelected((s) => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/crm/leads/${l.id}`} className="font-medium text-ink hover:text-orchid">{l.fullName}</Link>
                      <span className="block truncate text-[12px] text-ink-muted">{l.email ?? l.phone}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{l.company?.name ?? '—'}</td>
                    <td className="px-3 py-2.5"><StagePill stage={l.stage} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{SOURCE_LABELS[l.source]}</td>
                    <td className="px-3 py-2.5">{l.owner ? <span className="flex items-center gap-2"><Avatar name={l.owner.name} size={22} /><span className="truncate">{l.owner.name}</span></span> : '—'}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{MARKET_LABELS[l.market]}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">{l.dealValue ? money(l.dealValue, l.currency) : '—'}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 ${isOverdue(l.nextFollowUpAt) ? 'font-medium text-rose' : 'text-ink-soft'}`}>{l.nextFollowUpAt ? relative(l.nextFollowUpAt) : '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{relative(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted">
              <span>Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}><Icon name="chevronLeft" size={15} /> Previous</button>
                <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setParam({ page: String(page + 1) })}>Next <Icon name="chevronRight" size={15} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <NewLeadPanel open={newOpen} onClose={() => setNewOpen(false)} onCreated={(id) => router.push(`/crm/leads/${id}`)} />
      <LostReasonDialog open={lostOpen} onCancel={() => setLostOpen(false)} onConfirm={(reason) => { setLostOpen(false); bulk({ action: 'stage', stage: 'lost', lostReason: reason }, 'marked lost'); }} />
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeadsInner />
    </Suspense>
  );
}
