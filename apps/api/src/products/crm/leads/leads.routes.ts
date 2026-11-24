import { Router } from 'express';
import { z } from 'zod';
import { Lead, User } from '../../../models';
import { requireRole, tenant } from '../../../middleware/auth';
import { q, validate } from '../../../middleware/validate';
import { audit } from '../../../utils/audit';
import { ah, badRequest, conflict, forbidden, notFound } from '../../../utils/http';
import { serializeLead } from '../../../utils/serialize';
import { bulkSchema, createLeadSchema, listLeadsQuery, updateLeadSchema } from './leads.schema';
import {
  buildLeadFilter,
  createLead,
  findDuplicate,
  logActivity,
  updateLead,
} from './leads.service';

const router = Router();
const populate = [
  { path: 'companyId', select: 'name website' },
  { path: 'ownerId', select: 'name' },
];

router.get(
  '/',
  validate(listLeadsQuery, 'query'),
  ah(async (req, res) => {
    const query = q<z.infer<typeof listLeadsQuery>>(req);
    const filter = await buildLeadFilter(req, query);
    const sort: Record<string, 1 | -1> = { [query.sort]: query.dir === 'asc' ? 1 : -1 };
    if (query.sort !== 'createdAt') sort.createdAt = -1;
    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort(sort)
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .populate(populate)
        .lean(),
      Lead.countDocuments(filter),
    ]);
    res.json({ items: items.map(serializeLead), total, page: query.page, pageSize: query.pageSize });
  }),
);

router.get(
  '/check-duplicate',
  ah(async (req, res) => {
    const dup = await findDuplicate(
      req.auth!.orgId,
      req.query.email as string | undefined,
      req.query.phone as string | undefined,
      req.query.excludeId as string | undefined,
    );
    res.json({
      duplicate: dup
        ? { id: String(dup._id), fullName: dup.fullName, stage: dup.stage, owner: (dup as any).ownerId?.name ?? null }
        : null,
    });
  }),
);

router.post(
  '/',
  validate(createLeadSchema),
  ah(async (req, res) => {
    const orgId = req.auth!.orgId;
    const body = req.body;
    if (!body.allowDuplicate) {
      const dup = await findDuplicate(orgId, body.email, body.phone);
      if (dup) {
        throw conflict(`${dup.fullName} already has this email or phone.`);
      }
    }
    let ownerId = req.auth!.userId as any;
    if (body.ownerId) {
      const owner = await User.findOne({ _id: body.ownerId, orgId, status: 'active' }).select('_id');
      if (!owner) throw badRequest('Pick an active teammate as the owner.');
      ownerId = owner._id;
    }
    const lead = await createLead(orgId, { ...body, ownerId });
    await logActivity(orgId, lead._id, 'created', req.auth!.userId, undefined, {
      source: lead.source,
      via: 'manual',
    });
    await audit(req, 'lead_created', 'lead', lead._id, { fullName: lead.fullName, source: lead.source });
    const full = await Lead.findById(lead._id).populate(populate).lean();
    res.status(201).json({ lead: serializeLead(full) });
  }),
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params.id, ...tenant(req), deletedAt: null })
      .populate(populate)
      .lean();
    if (!lead) throw notFound('Lead');
    res.json({ lead: serializeLead(lead) });
  }),
);

router.patch(
  '/:id',
  validate(updateLeadSchema),
  ah(async (req, res) => {
    const lead = await updateLead(req, req.params.id, req.body);
    const full = await Lead.findById(lead._id).populate(populate).lean();
    res.json({ lead: serializeLead(full) });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, ...tenant(req), deletedAt: null },
      { deletedAt: new Date() },
    );
    if (!lead) throw notFound('Lead');
    await audit(req, 'lead_deleted', 'lead', lead._id, { fullName: lead.fullName });
    res.json({ ok: true });
  }),
);

router.post(
  '/bulk',
  validate(bulkSchema),
  ah(async (req, res) => {
    const { ids, action, ownerId, stage, lostReason } = req.body as z.infer<typeof bulkSchema>;
    if (action === 'delete') {
      if (req.auth!.role !== 'admin') throw forbidden('Only admins can delete leads.');
      const r = await Lead.updateMany({ _id: { $in: ids }, ...tenant(req), deletedAt: null }, { deletedAt: new Date() });
      await audit(req, 'leads_bulk_deleted', 'lead', undefined, { count: r.modifiedCount, ids });
      return res.json({ updated: r.modifiedCount });
    }
    if (action === 'owner' && !ownerId) throw badRequest('Pick an owner.');
    if (action === 'stage' && !stage) throw badRequest('Pick a stage.');
    let updated = 0;
    for (const id of ids) {
      try {
        await updateLead(req, id, action === 'owner' ? { ownerId } : { stage, lostReason });
        updated++;
      } catch {
        // Skip leads that fail validation (for example, Lost without a reason).
      }
    }
    res.json({ updated });
  }),
);

export default router;
