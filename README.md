# Dechub Cloud

Dechub Cloud is the home for Dechub's own products. The first product is **Dechub CRM**: one place where every lead is captured, owned and followed up.

```
apps/web        Next.js 14 frontend (deploy to Vercel)      → cloud.dechub.ai
apps/api        Express + MongoDB REST API (deploy to Render)
packages/shared Constants and types used by both apps
docs/           API contract, decisions, CRM notes
```

## What's in v0.1

- Email and password login, invites, Admin and Sales roles, password reset
- Leads with duplicate detection by email and phone (phones match across formats)
- Eight-stage drag-and-drop pipeline with required lost reasons and a won-value prompt
- Lead page with inline editing, notes, call/email/WhatsApp/LinkedIn/meeting logs and a timeline
- Follow-ups with My tasks, overdue badge, team overdue view, auto-cancel on Won or Lost
- Website form capture for dechub.in and bridge.dechub.ai, with spam protection
- **Online-user assignment:** a new form lead goes to whoever has the CRM open (taking turns if several do), otherwise to the default owner
- CSV import with column mapping, batch defaults, preview and a summary of created, skipped and failed rows
- Dashboard: key numbers, open pipeline by stage, leads by source, overdue list, team table
- India, UAE and USA markets with INR, AED and USD kept separate
- Settings: users, organization defaults, website form key, audit log
- Multi-tenant from day one: every record carries `orgId`, and every query is filtered by it

## Run it on your computer

You need Node.js 20 or newer and a MongoDB Atlas cluster (the free M0 tier is enough).

```bash
npm install

# 1. API settings
cp apps/api/.env.example apps/api/.env
#    Fill in MONGODB_URI, JWT_SECRET and the SEED_* values

# 2. Web settings
cp apps/web/.env.example apps/web/.env.local

# 3. Create the Dechub organization and your admin account
npm run seed

# 4. Start both apps
npm run dev
```

Open http://localhost:3000 and log in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

In development, invite and password-reset emails are printed in the API terminal instead of being sent. Copy the link from there.

### Other commands

```bash
npm run typecheck   # TypeScript checks for every package
npm run build       # production build of the web app
npm test            # API integration tests (downloads a temporary MongoDB the first time)
```

## Deploy

### 1. Database: MongoDB Atlas
1. Create a free M0 cluster.
2. Create a database user and copy the connection string into `MONGODB_URI`.
3. Network access: allow Render's outbound IPs (Render dashboard → your service → Connect → Outbound). On the free tier you may need `0.0.0.0/0`; keep a strong password.
4. Turn on backups. The free tier has no automatic backups, so schedule a daily `mongodump` (see "Backups" below) until you move to a paid tier.

### 2. API: Render
The repo includes `render.yaml`. In Render choose **New → Blueprint** and pick this repository, or create a Web Service by hand:

| Setting | Value |
|---|---|
| Root directory | (repo root) |
| Build command | `npm install` |
| Start command | `npm run start -w @dechub/api` |
| Health check path | `/health` |

Environment variables: everything in `apps/api/.env.example`, with `NODE_ENV=production` and `WEB_URL=https://cloud.dechub.ai`.

**Keep it awake.** Render's free tier sleeps after 15 minutes without traffic, and waking takes about a minute. Create a free monitor at UptimeRobot (or similar) that calls `https://<your-api>.onrender.com/health` every 10 minutes. If a form lead is ever delayed, move to Render's Starter plan.

### 3. Web: Vercel
1. Import the repository in Vercel and set **Root Directory** to `apps/web`.
2. Add the environment variable `API_URL=https://<your-api>.onrender.com`. It is read at build time, so redeploy after changing it.
3. Add the domain `cloud.dechub.ai` and point a CNAME to Vercel.

The browser only ever talks to `cloud.dechub.ai/api/...`; Vercel forwards those calls to Render. The session cookie therefore stays on your own domain and no CORS setup is needed for the app.

### 4. First login
Run `npm run seed` once against the production database (locally, with the production `MONGODB_URI` in `apps/api/.env`). Then log in and invite the team from **Settings → Users**.

## Connect the website forms

1. In the CRM go to **Settings → Website forms → Generate key** and copy the key.
2. In each website's form handler, after the existing email step, send:

```js
// dechub.in contact form
await fetch('https://<your-api>.onrender.com/api/v1/inbound/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.DECHUB_CRM_KEY },
  body: JSON.stringify({
    form: 'dechub',
    name, email,
    services,          // e.g. ["Brand Identity", "Digital Marketing"]
    annualRevenue,     // e.g. "Rs200Cr+"
    challenge,
    website_url: '',   // hidden honeypot field; bots fill it, people don't
  }),
});

// bridge.dechub.ai Book a Demo
body: JSON.stringify({
  form: 'bridge',
  companyName, companyWebsite, contactName, workEmail,
  projectType, phone, projectDescription,
  website_url: '',
})
```

Responses: `201` new lead, `200` existing lead updated (same email or phone), `400` missing name or contact, `401` wrong key, `429` more than 10 submissions a minute from one IP.

**Keep the key on the server.** Call this from the website's backend or a serverless function so the key is not visible in the browser. If a site is fully static, the key can only create leads, and rate limiting plus the honeypot limit abuse, but rotate it if you see spam.

Post to the API's own URL (your Render address, or a domain like `api.dechub.ai` pointed at it) rather than through cloud.dechub.ai, so the visitor's IP is read correctly for rate limiting. Add your website domains to `INBOUND_ALLOWED_ORIGINS` on the API.

## Backups

Atlas M0 has no automatic backups. Until you upgrade, run this daily (for example as a scheduled job) and keep 14 days:

```bash
mongodump --uri "$MONGODB_URI" --gzip --archive="backup-$(date +%F).gz"
```

Test a restore into a separate database before go-live:

```bash
mongorestore --uri "<test-database-uri>" --gzip --archive=backup-YYYY-MM-DD.gz
```

## Security notes

- Passwords hashed with bcrypt (cost 12); minimum 10 characters
- Session is a signed token in an httpOnly, Secure, SameSite=Lax cookie, valid 7 days
- 5 failed logins lock the account for 15 minutes
- Every request: rate limit → session check → tenant from the session (never from the request) → role check → input validation → query filtered by `orgId` → audit log
- The website form key is stored only as a SHA-256 hash and shown once
- Helmet security headers on the API; frame and sniffing protections on the web app
- Audit log entries expire after one year

## Adding the next Dechub product

1. Web: add `src/app/<product>/` with its own layout using `SessionProvider` and a shell.
2. API: add `src/products/<product>/` and mount its routes in `src/app.ts`.
3. Shared: add `packages/shared/src/<product>` for constants and types.
4. Add the product key to `organization.enabledProducts` and to the launcher list in `apps/web/src/app/page.tsx`.

Login, users, organizations, roles and the audit log are shared (`apps/api/src/core`). Products never import from each other.

## Moving the API to Spring Boot later

All business rules live in the API, and the contract is in `docs/api/openapi.yaml`. A Spring Boot service can implement the same endpoints against the same MongoDB collections (Spring Data MongoDB), one route at a time, with no change to the web app.
