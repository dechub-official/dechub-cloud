'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { ErrorNote, Field } from '@/components/ui/bits';
import { api } from '@/lib/api';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email }, redirectOn401: false });
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Reset your password" subtitle="We'll email you a link that works for one hour.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-sage/30 bg-sage-soft px-4 py-3 text-[13.5px] text-sage">
            If {email} has an account, a reset link is on its way.
          </p>
          <Link href="/login" className="btn-secondary w-full">Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorNote message={error} />}
          <Field label="Work email">
            <input className="field h-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn-primary h-10 w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="text-center text-[13px]"><Link href="/login" className="text-orchid hover:underline">Back to log in</Link></p>
        </form>
      )}
    </AuthFrame>
  );
}
