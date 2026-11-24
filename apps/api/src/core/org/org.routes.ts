import { Router } from 'express';
import { z } from 'zod';
import { MARKETS } from '@dechub/shared';
import { AuditLog, Organization, User } from '../../models';
import { requireRole, tenant } from '../../middleware/auth';
import { q, validate } from '../../middleware/validate';
import { audit, diff } from '../../utils/audit';
import { ah, badRequest, notFound } from '../../utils/http';
import { serializeOrg } from '../../utils/serialize';
import { generateApiKey, sha256 } from '../../utils/tokens';

const router = Router();

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  defaultOwnerId: z.string().nullable().optional(),
  defaultMarket: z.enum(MARKETS).optional(),
});

router.get(
  '/',
  ah(async (req, res) => {
    const org = await Organization.findById(req.auth!.orgId);
    if (!org) throw notFound('Organization');
    res.json({ org: serializeOrg(org) });
  }),
);

router.patch(
  '/',
  requireRole('admin'),
  validate(updateSchema),
  ah(async (req, res) => {
    const org = await Organization.findById(req.auth!.orgId);
    if (!org) throw notFound('Organization');
    const before = org.toObject();
    if (req.body.defaultOwnerId) {
      const owner = await User.findOne({ _id: req.body.defaultOwnerId, ...tenant(req), status: 'active' });
      if (!owner) throw badRequest('The default owner must be an active user.');
    }
    if (req.body.name !== undefined) org.name = req.body.name;
    if (req.body.defaultMarket !== undefined) org.defaultMarket = req.body.defaultMarket;
    if (req.body.defaultOwnerId !== undefined) (org as any).defaultOwnerId = req.body.defaultOwnerId || undefined;
    await org.save();
    await audit(req, 'org_updated', 'organization', org._id, diff(before, org.toObject(), ['name', 'defaultMarket', 'defaultOwnerId']));
    res.json({ org: serializeOrg(org) });
  }),
);

/** Generates a new inbound API key. The plain key is returned once; only its hash is stored. */
router.post(
  '/api-key',
  requireRole('admin'),
  ah(async (req, res) => {
    const key = generateApiKey();
    await Organization.updateOne({ _id: req.auth!.orgId }, { inboundApiKeyHash: sha256(key) });
    await audit(req, 'api_key_generated', 'organization', req.auth!.orgId);
    res.json({ apiKey: key });
  }),
);

const auditQuery = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.get(
  '/audit-logs',
  requireRole('admin'),
  validate(auditQuery, 'query'),
  ah(async (req, res) => {
    const { userId, action, from, to, page, pageSize } = q<z.infer<typeof auditQuery>>(req);
    const filter: Record<string, any> = { ...tenant(req) };
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('userId', 'name')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({
      items: items.map((a: any) => ({
        id: String(a._id),
        action: a.action,
        entity: a.entity,
        entityId: a.entityId ? String(a.entityId) : undefined,
        changes: a.changes,
        ip: a.ip,
        user: a.userId ? { id: String(a.userId._id), name: a.userId.name } : null,
        createdAt: a.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  }),
);

export default router;
