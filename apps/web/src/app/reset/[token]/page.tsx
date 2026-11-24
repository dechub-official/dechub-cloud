'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { ErrorNote, Field } from '@/components/ui/bits';
import { api } from '@/lib/api';

export default function ResetPage({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError('');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token: params.token, password }, redirectOn401: false });
      setDone(true);
    } catch (err: any) {
      setError(err.fields?.password?.[0] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-sage/30 bg-sage-soft px-4 py-3 text-[13.5px] text-sage">Password changed. Log in with your new password.</p>
          <Link href="/login" className="btn-primary h-10 w-full">Log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorNote message={error} />}
          <Field label="New password" hint="At least 10 characters.">
            <input className="field h-10" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <input className="field h-10" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <button className="btn-primary h-10 w-full" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </AuthFrame>
  );
}
