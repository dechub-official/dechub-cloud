# 0001 · Stack for Dechub CRM v0.1

**Decision:** Next.js on Vercel, Node.js + Express on Render, MongoDB Atlas.

**Why:** the team already knows Node and MongoDB, all three have free tiers that cover internal use, and the MVP had to ship in two days with one developer.

**Trade-offs we accept**
- Login, roles and tenant isolation are built in-house instead of coming from a backend service. They live in `apps/api/src/core` and `apps/api/src/middleware`, with tests.
- Render's free tier sleeps after 15 minutes. An uptime ping every 10 minutes keeps it awake.

**Exit path:** business logic stays behind the REST API described in `docs/api/openapi.yaml`, so Express can be replaced by Spring Boot later without touching the web app.
