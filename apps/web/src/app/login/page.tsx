'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { ErrorNote, Field } from '@/components/ui/bits';
import { api } from '@/lib/api';

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: { email, password }, redirectOn401: false });
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') ? next : '/crm';
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Log in" subtitle="Use the email your admin invited.">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Work email">
          <input className="field h-10" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="field h-10" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn-primary h-10 w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="text-center text-[13px]">
          <Link href="/forgot" className="text-orchid hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
