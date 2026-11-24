'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { MARKETS, MARKET_LABELS, ROLES, type UserDTO } from '@dechub/shared';
import { UserOptions } from '@/components/crm/options';
import { Avatar, Empty, ErrorNote, Field, Loading, PageHeader, Tabs } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useUsers } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { dateTime, relative } from '@/lib/format';
import { useSession } from '@/lib/session';

type Tab = 'users' | 'organization' | 'forms' | 'audit';

function UsersTab() {
  const { user: me } = useSession();
  const { users, activeUsers, reload } = useUsers();
  const toast = useToast();
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'sales' });
  const [error, setError] = useState('');
  const [deactivating, setDeactivating] = useState<UserDTO | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  const send = async () => {
    setError('');
    try {
      await api('/users/invite', { method: 'POST', body: form });
      toast(`Invite sent to ${form.email}`);
      setInvite(false);
      setForm({ name: '', email: '', role: 'sales' });
      reload();
    } catch (e: any) {
      setError(e.fields ? (Object.values(e.fields).flat()[0] as string) : e.message);
    }
  };
  const update = async (u: UserDTO, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body });
      toast(msg);
      reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const online = (u: UserDTO) => u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60_000;

  return (
    <>
      <div className="mb-4 flex justify-end"><button className="btn-primary" onClick={() => setInvite(true)}><Icon name="plus" size={16} /> Invite teammate</button></div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/50">
            <tr><th className="table-head px-4 py-2.5">Name</th><th className="table-head px-4 py-2.5">Role</th><th className="table-head px-4 py-2.5">Status</th><th className="table-head px-4 py-2.5">Last active</th><th className="px-4" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="relative"><Avatar name={u.name} size={30} />{online(u) && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sage ring-2 ring-surface" title="Online" />}</span>
                    <span><span className="block font-medium">{u.name}{u.id === me.id && <span className="text-ink-muted"> (you)</span>}</span><span className="block text-[12px] text-ink-muted">{u.email}</span></span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select className="field h-8 w-auto capitalize" value={u.role} disabled={u.id === me.id} onChange={(e) => update(u, { role: e.target.value }, 'Role changed')}>
                    {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r === 'admin' ? 'Admin' : 'Sales'}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${u.status === 'active' ? 'bg-sage-soft text-sage' : u.status === 'invited' ? 'bg-amber-soft text-[#7A5013]' : 'bg-line text-ink-muted'}`}>
                    {u.status === 'active' ? 'Active' : u.status === 'invited' ? 'Invited' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{online(u) ? 'Online now' : u.lastSeenAt ? relative(u.lastSeenAt) : 'Never'}</td>
                <td className="px-4 py-3 text-right">
                  {u.status === 'invited' && <button className="btn-ghost btn-sm" onClick={async () => { await api(`/users/${u.id}/resend-invite`, { method: 'POST' }).catch((e) => toast(e.message, 'error')); toast('Invite sent again'); }}>Resend invite</button>}
                  {u.status !== 'deactivated' && u.id !== me.id && <button className="btn-ghost btn-sm text-rose" onClick={() => { setReassignTo(''); setDeactivating(u); }}>Deactivate</button>}
                  {u.status === 'deactivated' && <button className="btn-ghost btn-sm" onClick={() => update(u, { status: 'active' }, 'User reactivated')}>Reactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite a teammate"
        footer={<><button className="btn-secondary" onClick={() => setInvite(false)}>Cancel</button><button className="btn-primary" disabled={!form.name || !form.email} onClick={send}>Send invite</button></>}>
        <div className="space-y-4">
          {error && <ErrorNote message={error} />}
          <Field label="Name"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Work email"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role" hint="Admins also manage users, settings and deletions.">
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="sales">Sales</option><option value="admin">Admin</option></select>
          </Field>
          <p className="text-[12.5px] text-ink-muted">They get an email with a link to set their password. The link works for 48 hours.</p>
        </div>
      </Modal>

      <Modal open={!!deactivating} onClose={() => setDeactivating(null)} title={`Deactivate ${deactivating?.name ?? ''}`}
        footer={<><button className="btn-secondary" onClick={() => setDeactivating(null)}>Cancel</button>
          <button className="btn-danger" onClick={async () => { const u = deactivating!; setDeactivating(null); await update(u, { status: 'deactivated', reassignTo: reassignTo || undefined }, `${u.name} deactivated`); }}>Deactivate</button></>}>
        <p className="mb-4 text-[13.5px] text-ink-muted">They will be logged out and can't log in again. Their history stays.</p>
        <Field label="Give their open leads and follow-ups to">
          <select className="field" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
            <option value="">Keep them unassigned to anyone new</option>
            <UserOptions users={activeUsers.filter((u) => u.id !== deactivating?.id)} />
          </select>
        </Field>
      </Modal>
    </>
  );
}

function OrgTab() {
  const { org, refresh } = useSession();
  const { activeUsers } = useUsers();
  const toast = useToast();
  const [name, setName] = useState(org.name);
  const [owner, setOwner] = useState(org.defaultOwnerId ?? '');
  const [market, setMarket] = useState(org.defaultMarket);
  const save = async () => {
    try {
      await api('/org', { method: 'PATCH', body: { name, defaultOwnerId: owner || null, defaultMarket: market } });
      await refresh();
      toast('Settings saved');
    } catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <div className="panel max-w-xl space-y-5 p-6">
      <Field label="Organization name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Default owner for website leads" hint="Gets new form leads when nobody is online in the CRM.">
        <select className="field" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">First admin</option><UserOptions users={activeUsers} /></select>
      </Field>
      <Field label="Default market for website leads">
        <select className="field" value={market} onChange={(e) => setMarket(e.target.value as any)}>{MARKETS.map((m) => <option key={m} value={m}>{MARKET_LABELS[m]}</option>)}</select>
      </Field>
      <button className="btn-primary" onClick={save}>Save settings</button>
    </div>
  );
}

function FormsTab() {
  const { org, refresh } = useSession();
  const toast = useToast();
  const [key, setKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const generate = async () => {
    setConfirmOpen(false);
    const r = await api<{ apiKey: string }>('/org/api-key', { method: 'POST' });
    setKey(r.apiKey);
    refresh();
  };
  const snippet = `fetch('https://<your-api>.onrender.com/api/v1/inbound/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': '<YOUR_KEY>' },
  body: JSON.stringify({
    form: 'dechub',            // or 'bridge'
    name, email, services,      // dechub.in fields
    annualRevenue, challenge,
    website_url: honeypotValue  // hidden field, leave empty
  })
});`;
  return (
    <div className="max-w-3xl space-y-6">
      <section className="panel p-6">
        <h2 className="text-[17px] font-semibold">Website form key</h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">dechub.in and bridge.dechub.ai send each enquiry to the CRM with this key. New leads arrive in under a minute.</p>
        {key ? (
          <div className="mt-4 rounded-lg border border-brass/40 bg-brass-soft p-4">
            <p className="text-[13px] font-medium text-[#7C5A22]">Copy this key now. It won't be shown again.</p>
            <div className="mt-2 flex gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-surface px-3 py-2 text-[13px]">{key}</code>
              <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(key); toast('Key copied'); }}><Icon name="copy" size={15} /> Copy</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${org.hasApiKey ? 'bg-sage-soft text-sage' : 'bg-line text-ink-muted'}`}>{org.hasApiKey ? 'Key active' : 'No key yet'}</span>
            <button className="btn-primary" onClick={() => (org.hasApiKey ? setConfirmOpen(true) : generate())}><Icon name="key" size={16} /> {org.hasApiKey ? 'Replace key' : 'Generate key'}</button>
          </div>
        )}
      </section>
      <section className="panel p-6">
        <h2 className="text-[17px] font-semibold">Connect a form</h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">Add this call after the form's existing email step, so the team still gets the email if the CRM is unreachable. Bridge forms send <code>form: 'bridge'</code> with companyName, companyWebsite, contactName, workEmail, projectType, phone and projectDescription.</p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-aubergine-deep p-4 text-[12.5px] leading-relaxed text-[#E6E1F5]">{snippet}</pre>
      </section>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Replace the website form key?"
        footer={<><button className="btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button><button className="btn-danger" onClick={generate}>Replace key</button></>}>
        <p className="text-[13.5px] text-ink-soft">The current key stops working immediately. Update both websites with the new key at the same time, or form leads will be rejected.</p>
      </Modal>
    </div>
  );
}

function AuditTab() {
  const { users } = useUsers();
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi<{ items: any[]; total: number; pageSize: number }>('/org/audit-logs', { userId, page });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <div className="mb-4 flex gap-2">
        <select className="field w-auto" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} aria-label="User"><option value="">Everyone</option><UserOptions users={users} /></select>
      </div>
      {error && <ErrorNote message={error} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <div className="panel"><Empty icon="note" title="No activity recorded yet" /></div>}
      {data && data.items.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="border-b border-line bg-canvas/50"><tr><th className="table-head px-4 py-2.5">When</th><th className="table-head px-4 py-2.5">Who</th><th className="table-head px-4 py-2.5">Action</th><th className="table-head px-4 py-2.5">Changes</th><th className="table-head px-4 py-2.5">IP</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{dateTime(a.createdAt)}</td>
                  <td className="px-4 py-2.5">{a.user?.name ?? 'System'}</td>
                  <td className="px-4 py-2.5 font-medium">{a.action.replace(/_/g, ' ')}</td>
                  <td className="max-w-[360px] px-4 py-2.5 text-ink-muted"><code className="break-words text-[12px]">{a.changes ? JSON.stringify(a.changes).slice(0, 240) : '—'}</code></td>
                  <td className="px-4 py-2.5 text-ink-faint">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function SettingsInner() {
  const { isAdmin } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'users';
  if (!isAdmin) return <div className="panel"><Empty icon="settings" title="Settings are for admins" body="Ask an admin if you need a change to users or website forms." /></div>;
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs value={tab} onChange={(t) => router.replace(`/crm/settings?tab=${t}`)} items={[
        { value: 'users', label: 'Users' },
        { value: 'organization', label: 'Organization' },
        { value: 'forms', label: 'Website forms' },
        { value: 'audit', label: 'Audit log' },
      ]} />
      <div className="mt-6">
        {tab === 'users' && <UsersTab />}
        {tab === 'organization' && <OrgTab />}
        {tab === 'forms' && <FormsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<Loading />}><SettingsInner /></Suspense>;
}
