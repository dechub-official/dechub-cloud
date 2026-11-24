'use client';

import Link from 'next/link';
import type { CompanyDTO, LeadDTO } from '@dechub/shared';
import { Avatar, ErrorNote, Loading, StagePill } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useApi } from '@/hooks/useApi';
import { money, relative } from '@/lib/format';

export default function CompanyPage({ params }: { params: { id: string } }) {
  const { data, error } = useApi<{ company: CompanyDTO; leads: LeadDTO[] }>(`/companies/${params.id}`);
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const { company, leads } = data;
  return (
    <>
      <Link href="/crm/companies" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink"><Icon name="chevronLeft" size={15} /> Companies</Link>
      <h1 className="text-[30px] font-semibold">{company.name}</h1>
      {company.website && (
        <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13.5px] text-orchid hover:underline">
          {company.website.replace(/^https?:\/\//, '')} <Icon name="external" size={13} />
        </a>
      )}
      <section className="panel mt-6 overflow-hidden">
        <h2 className="px-4 pt-4 text-[16px] font-semibold">{leads.length} lead{leads.length === 1 ? '' : 's'}</h2>
        <table className="mt-2 w-full text-[13.5px]">
          <tbody className="divide-y divide-line">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-canvas/60">
                <td className="px-4 py-3"><Link href={`/crm/leads/${l.id}`} className="font-medium hover:text-orchid">{l.fullName}</Link><span className="block text-[12px] text-ink-muted">{l.jobTitle}</span></td>
                <td className="px-4 py-3"><StagePill stage={l.stage} /></td>
                <td className="px-4 py-3">{l.owner && <span className="flex items-center gap-2"><Avatar name={l.owner.name} size={22} />{l.owner.name}</span>}</td>
                <td className="px-4 py-3 text-right">{l.dealValue ? money(l.dealValue, l.currency) : '—'}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{relative(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
