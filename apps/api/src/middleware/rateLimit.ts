import rateLimit from 'express-rate-limit';

const message = (text: string) => ({ error: { code: 'rate_limited', message: text } });

/** Check 1: general limit for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Wait a minute and try again.'),
});

/** Login: 5 attempts per 15 minutes per IP and email. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  message: message('Too many failed attempts. Try again in 15 minutes.'),
});

/** Website forms: 10 per minute per IP. */
export const inboundLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many submissions. Try again in a minute.'),
});
