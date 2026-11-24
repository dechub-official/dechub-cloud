// Converts Mongo documents into the API's JSON shapes (see packages/shared/src/types.ts).

const id = (v: any) => (v ? String(v._id ?? v) : undefined);
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : undefined);
const person = (u: any) => (u && u._id ? { id: String(u._id), name: u.name } : null);

export function serializeUser(u: any) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    lastLoginAt: iso(u.lastLoginAt),
    lastSeenAt: iso(u.lastSeenAt),
  };
}

export function serializeOrg(o: any) {
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    defaultOwnerId: id(o.defaultOwnerId),
    defaultMarket: o.defaultMarket,
    hasApiKey: Boolean(o.inboundApiKeyHash),
    enabledProducts: o.enabledProducts ?? ['crm'],
  };
}

export function serializeCompany(c: any) {
  if (!c || !c._id) return null;
  return { id: String(c._id), name: c.name, website: c.website };
}

export function serializeLead(l: any) {
  return {
    id: String(l._id),
    fullName: l.fullName,
    email: l.email,
    phone: l.phone,
    company: serializeCompany(l.companyId),
    jobTitle: l.jobTitle,
    location: l.location,
    market: l.market,
    businessLine: l.businessLine,
    source: l.source,
    services: l.services ?? [],
    projectType: l.projectType,
    revenueBand: l.revenueBand,
    message: l.message,
    dealValue: l.dealValue,
    currency: l.currency,
    stage: l.stage,
    lostReason: l.lostReason,
    owner: person(l.ownerId),
    nextFollowUpAt: l.nextFollowUpAt ? iso(l.nextFollowUpAt) : null,
    linkedinUrl: l.linkedinUrl,
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
  };
}

export function serializeActivity(a: any) {
  return {
    id: String(a._id),
    type: a.type,
    body: a.body,
    meta: a.meta,
    author: person(a.authorId),
    createdAt: iso(a.occurredAt ?? a.createdAt),
  };
}

export function serializeTask(t: any) {
  return {
    id: String(t._id),
    title: t.title,
    dueAt: iso(t.dueAt),
    status: t.status,
    assignee: person(t.assigneeId),
    lead: t.leadId && t.leadId._id ? { id: String(t.leadId._id), fullName: t.leadId.fullName } : null,
    completedAt: iso(t.completedAt),
  };
}
