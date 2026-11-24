import { Wordmark } from '../layout/Logo';

/** Two-panel frame for login, invite and reset screens. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#E0B0FF] p-12 text-ink lg:flex lg:flex-col">
        <Wordmark product="Cloud" />
        <div className="mt-auto max-w-lg">
          <p className="font-display text-[56px] font-semibold leading-[1.02] tracking-tight">
            Every lead.
            <br />
            One owner.
            <br />
            <span className="text-orchid-hover">No follow-up missed.</span>
          </p>
          <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-ink-soft">
            Dechub CRM brings website enquiries, LinkedIn lists and Meta ads into one pipeline for the team in India, the UAE and the USA.
          </p>
        </div>
        <svg className="pointer-events-none absolute -right-24 top-16 h-[420px] w-[420px] opacity-[0.18]" viewBox="0 0 200 200" aria-hidden="true">
          <path d="M40 20h55a80 80 0 0 1 0 160H40z" fill="none" stroke="#E3C68E" strokeWidth="10" />
          <circle cx="95" cy="100" r="22" fill="#B8A8F0" />
        </svg>
      </section>
      <section className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <div className="inline-block rounded-lg bg-[#E0B0FF] p-3"><Wordmark product="Cloud" /></div>
          </div>
          <h1 className="text-[30px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
