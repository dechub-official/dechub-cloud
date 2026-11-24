# 0002 · One cloud app, products as sections

**Decision:** Dechub Cloud is one web app at cloud.dechub.ai. Each product lives at its own path (`/crm`, later `/hr` and others) and in its own folder under `products/`.

**Why:** one login, one deploy, shared customer data, one design system.

**When to split:** move a product into its own app only when it has its own team, its own release schedule or very different load. Login and design stay shared through `packages/`.
