import type { Stage } from '@dechub/shared';
import { STAGE_LABELS } from '@dechub/shared';
import { initials } from '@/lib/format';
import { STAGE_STYLE } from '@/lib/stages';
import { Icon } from './Icon';

export function Spinner({ className = '' }: { className?: string }) {
  return <div className={`h-5 w-5 animate-spin rounded-full border-2 border-orchid border-t-transparent ${className}`} />;
}

export function Loading() {
  return (
    <div className="grid place-items-center py-24">
      <Spinner />
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose/30 bg-rose-soft px-4 py-3 text-[13px] text-rose">{message}</div>;
}

export function StagePill({ stage }: { stage: Stage }) {
  const s = STAGE_STYLE[stage];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function Avatar({ name, size = 28 }: { name?: string; size?: number }) {
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="inline-grid shrink-0 place-items-center rounded-full bg-aubergine font-semibold text-brass-light"
    >
      {initials(name)}
    </span>
  );
}

export function Empty({
  icon = 'sparkle',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-orchid-soft text-orchid">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-rose">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number; tone?: 'alert' }[];
}) {
  return (
    <div className="flex gap-1 border-b border-line" role="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
              active ? 'border-orchid text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11.5px] ${
                  it.tone === 'alert' && it.count > 0 ? 'bg-rose text-white' : 'bg-line text-ink-soft'
                }`}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
