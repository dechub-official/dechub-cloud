import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="font-display text-[64px] font-semibold text-orchid">404</p>
        <h1 className="text-[22px] font-semibold">This page doesn't exist</h1>
        <p className="mt-2 text-[14px] text-ink-muted">Check the link, or go back to the CRM.</p>
        <Link href="/crm" className="btn-primary mt-6">Open Dechub CRM</Link>
      </div>
    </div>
  );
}
