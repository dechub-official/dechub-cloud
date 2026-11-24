import { Router } from 'express';
import { z } from 'zod';
import { CONTACT_TYPES } from '@dechub/shared';
import { Activity, Lead } from '../../../models';
import { tenant } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { ah, notFound } from '../../../utils/http';
import { serializeActivity } from '../../../utils/serialize';

// Mounted at /leads/:leadId/activities
const router = Router({ mergeParams: true });

const createSchema = z.object({
  type: z.enum(['note', ...CONTACT_TYPES]),
  body: z.string().trim().min(1, 'Write something before saving.').max(5000),
  occurredAt: z.coerce.date().optional(),
});

async function assertLead(req: any) {
  const lead = await Lead.findOne({ _id: req.params.leadId, ...tenant(req), deletedAt: null }).select('_id');
  if (!lead) throw notFound('Lead');
  return lead;
}

router.get(
  '/',
  ah(async (req, res) => {
    await assertLead(req);
    const items = await Activity.find({ ...tenant(req), leadId: req.params.leadId })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(500)
      .populate('authorId', 'name')
      .lean();
    res.json({ items: items.map(serializeActivity) });
  }),
);

router.post(
  '/',
  validate(createSchema),
  ah(async (req, res) => {
    const lead = await assertLead(req);
    const activity = await Activity.create({
      ...tenant(req),
      leadId: lead._id,
      type: req.body.type,
      body: req.body.body,
      occurredAt: req.body.occurredAt ?? new Date(),
      authorId: req.auth!.userId,
    });
    await Lead.updateOne({ _id: lead._id }, { $currentDate: { updatedAt: true } });
    const full = await Activity.findById(activity._id).populate('authorId', 'name').lean();
    res.status(201).json({ activity: serializeActivity(full) });
  }),
);

export default router;
