import { Router } from 'express';
import { z } from 'zod';
import { Company, Lead } from '../../../models';
import { tenant } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { ah, conflict, notFound } from '../../../utils/http';
import { escapeRegex } from '../../../utils/normalize';
import { serializeCompany, serializeLead } from '../../../utils/serialize';

const router = Router();

router.get(
  '/',
  ah(async (req, res) => {
    const filter: Record<string, any> = { ...tenant(req), deletedAt: null };
    const qs = String(req.query.q ?? '').trim();
    if (qs) filter.name = new RegExp(escapeRegex(qs), 'i');
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const companies = await Company.find(filter).sort({ name: 1 }).limit(limit).lean();
    const counts = await Lead.aggregate([
      { $match: { ...tenant(req), deletedAt: null, companyId: { $in: companies.map((c) => c._id) } } },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({
      items: companies.map((c) => ({ ...serializeCompany(c), leadCount: byId.get(String(c._id)) ?? 0 })),
    });
  }),
);

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().trim().max(300).optional(),
});

router.post(
  '/',
  validate(createSchema),
  ah(async (req, res) => {
    const nameLower = req.body.name.toLowerCase();
    const exists = await Company.findOne({ ...tenant(req), nameLower, deletedAt: null });
    if (exists) throw conflict('A company with this name already exists.');
    const c = await Company.create({ ...tenant(req), name: req.body.name, nameLower, website: req.body.website });
    res.status(201).json({ company: serializeCompany(c) });
  }),
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const company = await Company.findOne({ _id: req.params.id, ...tenant(req), deletedAt: null }).lean();
    if (!company) throw notFound('Company');
    const leads = await Lead.find({ ...tenant(req), companyId: company._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .populate([{ path: 'ownerId', select: 'name' }])
      .lean();
    res.json({ company: serializeCompany(company), leads: leads.map(serializeLead) });
  }),
);

export default router;
