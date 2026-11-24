// Small fetch wrapper. The browser calls /api/v1/... on its own domain; next.config.mjs
// forwards those requests to the Express API.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function qs(query?: Query) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; query?: Query; redirectOn401?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = 'GET', body, form, query, redirectOn401 = true } = opts;
  const res = await fetch(`/api/v1${path}${qs(query)}`, {
    method,
    credentials: 'include',
    signal: opts.signal,
    headers: form ? undefined : body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401 && redirectOn401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'error',
      err?.message ?? (res.status >= 500 ? 'The server could not be reached. Try again in a moment.' : 'Request failed.'),
      err?.fields,
    );
  }
  return data as T;
}

/** End of today in the viewer's own time zone, so "today" means their day. */
export function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
