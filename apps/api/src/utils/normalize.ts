/** Lower-cases and trims an email so the same address always matches. */
export function normalizeEmail(email?: string | null): string | undefined {
  const v = email?.trim().toLowerCase();
  return v ? v : undefined;
}

/**
 * Reduces a phone number to "+<digits>" so "+971 50 123 4567", "00971501234567"
 * and "+971-50-1234567" are treated as the same number.
 */
export function normalizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let v = phone.trim();
  if (v.startsWith('00')) v = '+' + v.slice(2);
  const hasPlus = v.startsWith('+');
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return undefined;
  return hasPlus ? `+${digits}` : digits;
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
