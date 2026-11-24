import type { Currency } from '@dechub/shared';

const LOCALE: Record<Currency, string> = { INR: 'en-IN', AED: 'en-AE', USD: 'en-US' };

export function money(value?: number | null, currency: Currency | string = 'INR', compact = false) {
  if (value === undefined || value === null) return '—';
  const c = (currency as Currency) ?? 'INR';
  return new Intl.NumberFormat(LOCALE[c] ?? 'en-US', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
}

export function dateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function date(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relative(iso?: string | null) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const min = 60_000, hour = 60 * min, day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
  return date(iso);
}

export function isOverdue(iso?: string | null) {
  return !!iso && new Date(iso).getTime() < Date.now();
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function tomorrowAt(hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
