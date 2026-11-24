import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  WEB_URL: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),
  INBOUND_ALLOWED_ORIGINS: z.string().default('*'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Dechub Cloud <no-reply@dechub.ai>'),
  // Proxies in front of the API: Vercel (web app rewrite) + Render = 2.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(2),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
