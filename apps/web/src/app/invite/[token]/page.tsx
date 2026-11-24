'use client';

import { useEffect, useState } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { ErrorNote, Field, Loading } from '@/components/ui/bits';
import { api } from '@/lib/api';

export default function InvitePage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<{ email: string; name: string; orgName: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/auth/invite/${params.token}`, { redirectOn401: false })
      .then((r) => {
        setInfo(r);
        setName(r.name);
      })
      .catch((e) => setLoadError(e.message));
  }, [params.token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError('');
    try {
      await api('/auth/accept-invite', { method: 'POST', body: { token: params.token, password, name }, redirectOn401: false });
      window.location.href = '/crm';
    } catch (err: any) {
      setError(err.fields?.password?.[0] ?? err.message);
      setBusy(false);
    }
  };

  if (loadError) return <AuthFrame title="Invite link expired"><ErrorNote message={loadError} /></AuthFrame>;
  if (!info) return <AuthFrame title="Join Dechub CRM"><Loading /></AuthFrame>;

  return (
    <AuthFrame title={`Join ${info.orgName}`} subtitle={`Set a password for ${info.email}.`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Your name"><input className="field h-10" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Password" hint="At least 10 characters.">
          <input className="field h-10" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <input className="field h-10" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button className="btn-primary h-10 w-full" disabled={busy}>{busy ? 'Setting up…' : 'Set password and continue'}</button>
      </form>
    </AuthFrame>
  );
}
