const configuredApiUrl = process.env.API_URL?.trim();
if (process.env.VERCEL && !configuredApiUrl) {
  throw new Error('Set API_URL in the Vercel environment for this deployment, then rebuild.');
}

const apiTarget = new URL(configuredApiUrl || 'http://localhost:4000');
if (process.env.VERCEL && (
  apiTarget.protocol !== 'https:' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(apiTarget.hostname) ||
  apiTarget.hostname.endsWith('.internal')
)) {
  throw new Error('API_URL must be the public HTTPS URL of your Render API.');
}
if (apiTarget.pathname !== '/' || apiTarget.search || apiTarget.hash || apiTarget.username || apiTarget.password) {
  throw new Error('API_URL must be a base URL without a path, query, or credentials.');
}
const API_URL = apiTarget.origin;
if (process.env.VERCEL) console.info(`API proxy target: ${API_URL}`);

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dechub/shared'],
  // The browser always talks to /api on the same domain. Next.js forwards it to the
  // Express API, so the session cookie stays first-party and no CORS is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
