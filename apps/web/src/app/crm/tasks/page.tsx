'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { TaskDTO } from '@dechub/shared';
import { FollowUpDialog } from '@/components/crm/FollowUpDialog';
import { Avatar, Empty, ErrorNote, Loading, PageHeader, Tabs } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, todayEnd } from '@/lib/api';
import { dateTime, isOverdue, relative } from '@/lib/format';
import { useSession } from '@/lib/session';

type Tab = 'today' | 'overdue' | 'upcoming' | 'team';

function TasksInner() {
  const { isAdmin } = useSession();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const tab = ((params.get('tab') as Tab) || 'today') as Tab;
  const setTab = (t: Tab) => router.replace(`/crm/tasks?tab=${t}`);

  const end = todayEnd();
  const summary = useApi<{ overdue: number; today: number }>('/tasks/summary', { todayEnd: end });
  const list = useApi<{ items: TaskDTO[] }>('/tasks', tab === 'team'
    ? { scope: 'team', window: 'overdue', todayEnd: end }
    : { scope: 'mine', window: tab, todayEnd: end });
  const [reschedule, setReschedule] = useState<TaskDTO | null>(null);

  const refresh = () => { list.reload(); summary.reload(); window.dispatchEvent(new Event('dechub:tasks-changed')); };
  const complete = async (t: TaskDTO) => {
    try {
      await api(`/tasks/${t.id}`, { method: 'PATCH', body: { action: 'complete' } });
      toast('Follow-up done');
      refresh();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const tabs: { value: Tab; label: string; count?: number; tone?: 'alert' }[] = [
    { value: 'today', label: 'Today', count: summary.data?.today },
    { value: 'overdue', label: 'Overdue', count: summary.data?.overdue, tone: 'alert' },
    { value: 'upcoming', label: 'Upcoming' },
  ];
  if (isAdmin) tabs.push({ value: 'team', label: 'Team overdue' });

  const emptyCopy: Record<Tab, { title: string; body: string }> = {
    today: { title: 'Nothing due today', body: 'Follow-ups you schedule for today will show here.' },
    overdue: { title: 'Nothing overdue', body: 'Every follow-up is on time.' },
    upcoming: { title: 'No upcoming follow-ups', body: 'Open a lead and add a follow-up so it does not go cold.' },
    team: { title: 'The team is on time', body: 'No one has an overdue follow-up.' },
  };

  return (
    <>
      <PageHeader title={tab === 'team' ? 'Team follow-ups' : 'My tasks'} subtitle="Follow-ups by due time. Overdue ones are shown oldest first." />
      <Tabs value={tab} onChange={setTab} items={tabs} />
      <div className="mt-4">
        {list.error && <ErrorNote message={list.error} />}
        {list.loading && !list.data && <Loading />}
        {list.data && list.data.items.length === 0 && (
          <div className="panel"><Empty icon="check" title={emptyCopy[tab].title} body={emptyCopy[tab].body} /></div>
        )}
        {list.data && list.data.items.length > 0 && (
          <ul className="panel divide-y divide-line">
            {list.data.items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <button aria-label={`Mark "${t.title}" done`} title="Mark done" onClick={() => complete(t)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line-strong text-transparent hover:border-sage hover:text-sage">
                  <Icon name="check" size={13} />
                </button>
                <div className="min-w-0 flex-1">
                  <Link href={`/crm/leads/${t.lead?.id}`} className="text-[14px] font-medium hover:text-orchid">{t.lead?.fullName}</Link>
                  <p className="truncate text-[13px] text-ink-muted">{t.title}</p>
                </div>
                {tab === 'team' && t.assignee && <span className="flex items-center gap-2 text-[13px]"><Avatar name={t.assignee.name} size={22} />{t.assignee.name}</span>}
                <span className={`w-36 text-right text-[13px] ${isOverdue(t.dueAt) ? 'font-medium text-rose' : 'text-ink-soft'}`} title={dateTime(t.dueAt)}>
                  {tab === 'upcoming' ? dateTime(t.dueAt) : relative(t.dueAt)}
                </span>
                <button className="btn-ghost btn-sm" onClick={() => setReschedule(t)}><Icon name="clock" size={15} /> Reschedule</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FollowUpDialog open={!!reschedule} mode="reschedule" onClose={() => setReschedule(null)}
        onSave={async (v) => {
          await api(`/tasks/${reschedule!.id}`, { method: 'PATCH', body: { action: 'reschedule', dueAt: v.dueAt } });
          setReschedule(null);
          toast('Follow-up rescheduled');
          refresh();
        }} />
    </>
  );
}

export default function TasksPage() {
  return <Suspense fallback={<Loading />}><TasksInner /></Suspense>;
}
