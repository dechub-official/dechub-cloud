import type { Request } from 'express';
import { Types } from 'mongoose';
import { MARKET_CURRENCY, ONLINE_WINDOW_MS, type Market, type Stage } from '@dechub/shared';
import { Activity, Company, Lead, Organization, Task, User } from '../../../models';
import { audit, diff } from '../../../utils/audit';
import { badRequest, notFound } from '../../../utils/http';
import { escapeRegex, normalizeEmail, normalizePhone } from '../../../utils/normalize';

type Id = Types.ObjectId | string;

export async function findOrCreateCompany(orgId: Id, name?: string, website?: string) {
  if (!name) return undefined;
  const nameLower = name.trim().toLowerCase();
  let company = await Company.findOne({ orgId, nameLower, deletedAt: null });
  if (!company) {
    company = await Company.create({ orgId, name: name.trim(), nameLower, website });
  } else if (website && !company.website) {
    company.website = website;
    await company.save();
  }
  return company._id;
}

/** Finds an existing lead in the organization with the same email or phone. */
export async function findDuplicate(orgId: Id, email?: string, phone?: string, excludeId?: Id) {
  const or: Record<string, string>[] = [];
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  if (e) or.push({ emailLower: e });
  if (p) or.push({ phoneNormalized: p });
  if (!or.length) return null;
  const filter: Record<string, any> = { orgId, deletedAt: null, $or: or };
  if (excludeId) filter._id = { $ne: excludeId };
  return Lead.findOne(filter).select('fullName email phone stage ownerId').populate('ownerId', 'name').lean();
}

/**
 * Online-user assignment (IN-05): a user is online if their CRM tab sent a heartbeat
 * within the last 5 minutes. One online user gets the lead; several take turns
 * (the one assigned longest ago goes next); nobody online means the default owner.
 */
export async function pickInboundOwner(orgId: Id): Promise<{ ownerId?: Types.ObjectId; reason: 'online' | 'default' }> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const online = await User.find({ orgId, status: 'active', lastSeenAt: { $gte: since } })
    .select('_id lastAssignedAt')
    .lean();

  let chosen: Types.ObjectId | undefined;
  let reason: 'online' | 'default' = 'online';

  if (online.length) {
    online.sort((a, b) => (a.lastAssignedAt?.getTime() ?? 0) - (b.lastAssignedAt?.getTime() ?? 0));
    chosen = online[0]._id;
  } else {
    reason = 'default';
    const org = await Organization.findById(orgId).select('defaultOwnerId').lean();
    if (org?.defaultOwnerId) {
      const def = await User.findOne({ _id: org.defaultOwnerId, status: 'active' }).select('_id').lean();
      chosen = def?._id;
    }
    if (!chosen) {
      const admin = await User.findOne({ orgId, role: 'admin', status: 'active' }).sort({ createdAt: 1 }).select('_id').lean();
      chosen = admin?._id;
    }
  }

  if (chosen) await User.updateOne({ _id: chosen }, { lastAssignedAt: new Date() });
  return { ownerId: chosen, reason };
}

/** Keeps lead.nextFollowUpAt equal to its earliest open task, so lists sort without joins. */
export async function syncNextFollowUp(orgId: Id, leadId: Id) {
  const next = await Task.findOne({ orgId, leadId, status: 'open' }).sort({ dueAt: 1 }).select('dueAt').lean();
  await Lead.updateOne({ _id: leadId, orgId }, { nextFollowUpAt: next?.dueAt ?? null });
}

export async function logActivity(
  orgId: Id,
  leadId: Id,
  type: string,
  authorId?: Id,
  body?: string,
  meta?: Record<string, unknown>,
) {
  return Activity.create({ orgId, leadId, type, authorId, body, meta });
}

interface CreateInput {
  fullName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  companyWebsite?: string;
  jobTitle?: string;
  location?: string;
  market: Market;
  businessLine: 'agency' | 'bridge';
  source: string;
  services?: string[];
  projectType?: string;
  revenueBand?: string;
  message?: string;
  dealValue?: number | null;
  currency?: string;
  linkedinUrl?: string;
  ownerId?: Id;
  importId?: Id;
}

export async function createLead(orgId: Id, input: CreateInput) {
  const companyId = await findOrCreateCompany(orgId, input.companyName, input.companyWebsite);
  return Lead.create({
    orgId,
    fullName: input.fullName,
    email: input.email,
    emailLower: normalizeEmail(input.email),
    phone: input.phone,
    phoneNormalized: normalizePhone(input.phone),
    companyId,
    jobTitle: input.jobTitle,
    location: input.location,
    market: input.market,
    businessLine: input.businessLine,
    source: input.source,
    services: input.services ?? [],
    projectType: input.projectType,
    revenueBand: input.revenueBand,
    message: input.message,
    dealValue: input.dealValue ?? undefined,
    currency: input.currency ?? MARKET_CURRENCY[input.market],
    stage: 'new',
    ownerId: input.ownerId,
    linkedinUrl: input.linkedinUrl,
    importId: input.importId,
  });
}

const EDITABLE = [
  'fullName',
  'email',
  'phone',
  'jobTitle',
  'location',
  'market',
  'businessLine',
  'source',
  'services',
  'projectType',
  'revenueBand',
  'message',
  'dealValue',
  'currency',
  'linkedinUrl',
  'stage',
  'lostReason',
  'ownerId',
  'companyId',
];

/**
 * Applies an update to one lead with all the side effects from the flows guide:
 * stage rules, owner timeline entries, closing tasks on Won/Lost, and audit logging.
 */
export async function updateLead(req: Request, leadId: Id, body: Record<string, any>) {
  const orgId = req.auth!.orgId;
  const lead = await Lead.findOne({ _id: leadId, orgId, deletedAt: null });
  if (!lead) throw notFound('Lead');
  const before = lead.toObject();

  if (body.ownerId !== undefined && body.ownerId) {
    const owner = await User.findOne({ _id: body.ownerId, orgId, status: { $ne: 'deactivated' } }).select('_id name');
    if (!owner) throw badRequest('Pick an active teammate as the owner.');
  }

  if (body.companyName !== undefined) {
    (lead as any).companyId = (await findOrCreateCompany(orgId, body.companyName, body.companyWebsite)) ?? undefined;
  }

  const simple = [
    'fullName', 'jobTitle', 'location', 'market', 'businessLine', 'source', 'services',
    'projectType', 'revenueBand', 'message', 'currency', 'linkedinUrl',
  ];
  for (const f of simple) if (body[f] !== undefined) (lead as any)[f] = body[f];
  if (body.dealValue !== undefined) (lead as any).dealValue = body.dealValue ?? undefined;
  if (body.email !== undefined) {
    lead.email = body.email;
    lead.emailLower = normalizeEmail(body.email);
  }
  if (body.phone !== undefined) {
    lead.phone = body.phone;
    lead.phoneNormalized = normalizePhone(body.phone);
  }
  if (body.email !== undefined || body.phone !== undefined) {
    if (!lead.emailLower && !lead.phoneNormalized) throw badRequest('A lead needs an email or a phone number.');
  }

  const prevStage = lead.stage as Stage;
  const nextStage = body.stage as Stage | undefined;
  if (nextStage && nextStage !== prevStage) {
    if (nextStage === 'lost') {
      if (!body.lostReason) throw badRequest('Choose a reason before moving this lead to Lost.');
      lead.lostReason = body.lostReason;
    } else {
      lead.lostReason = undefined;
    }
    lead.stage = nextStage;
    lead.closedAt = nextStage === 'won' || nextStage === 'lost' ? new Date() : undefined;
  }

  const prevOwner = lead.ownerId ? String(lead.ownerId) : undefined;
  if (body.ownerId !== undefined) (lead as any).ownerId = body.ownerId || undefined;

  await lead.save();

  const actor = req.auth!.userId;
  if (nextStage && nextStage !== prevStage) {
    await logActivity(orgId, lead._id, 'stage_change', actor, undefined, {
      from: prevStage,
      to: nextStage,
      lostReason: nextStage === 'lost' ? lead.lostReason : undefined,
    });
    if (nextStage === 'won' || nextStage === 'lost') {
      const res = await Task.updateMany({ orgId, leadId: lead._id, status: 'open' }, { status: 'cancelled' });
      if (res.modifiedCount) {
        await logActivity(orgId, lead._id, 'task_cancelled', actor, `${res.modifiedCount} open follow-up(s) cancelled because the lead was closed.`);
      }
      await syncNextFollowUp(orgId, lead._id);
    }
  }
  const newOwner = lead.ownerId ? String(lead.ownerId) : undefined;
  if (body.ownerId !== undefined && newOwner !== prevOwner) {
    const owner = newOwner ? await User.findById(newOwner).select('name').lean() : null;
    await logActivity(orgId, lead._id, 'owner_change', actor, undefined, {
      to: owner?.name ?? 'Unassigned',
      reason: 'manual',
    });
  }

  await audit(req, 'lead_updated', 'lead', lead._id, diff(before, lead.toObject(), EDITABLE));
  return lead;
}

/** Builds the Mongo filter for the leads list from query parameters. */
export async function buildLeadFilter(req: Request, query: Record<string, any>) {
  const orgId = req.auth!.orgId;
  const filter: Record<string, any> = { orgId, deletedAt: null };
  const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

  const stages = list(query.stage);
  if (stages.length) filter.stage = { $in: stages };
  const sources = list(query.source);
  if (sources.length) filter.source = { $in: sources };
  const markets = list(query.market);
  if (markets.length) filter.market = { $in: markets };
  const lines = list(query.businessLine);
  if (lines.length) filter.businessLine = { $in: lines };
  if (query.service) filter.services = query.service;
  if (query.companyId) filter.companyId = query.companyId;
  if (query.owner) {
    if (query.owner === 'me') filter.ownerId = req.auth!.userId;
    else if (query.owner === 'none') filter.ownerId = { $exists: false };
    else filter.ownerId = query.owner;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    const digits = query.q.replace(/\D/g, '');
    const companies = await Company.find({ orgId, name: rx }).select('_id').limit(200).lean();
    const or: Record<string, any>[] = [{ fullName: rx }, { emailLower: rx }];
    if (digits.length >= 4) or.push({ phoneNormalized: new RegExp(digits) });
    if (companies.length) or.push({ companyId: { $in: companies.map((c) => c._id) } });
    filter.$or = or;
  }
  return filter;
}
