import { Router } from 'express';
import { STAGES } from '@dechub/shared';
import { Lead } from '../../../models';
import { ah } from '../../../utils/http';
import { serializeLead } from '../../../utils/serialize';
import { buildLeadFilter } from '../leads/leads.service';

const router = Router();
const PER_COLUMN = 150;

/** Leads grouped by stage, with a count and open value per currency for each column. */
router.get(
  '/',
  ah(async (req, res) => {
    const filter = await buildLeadFilter(req, req.query as Record<string, any>);
    // Closed columns show recent leads only, so the board stays fast.
    const closedSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const columns = await Promise.all(
      STAGES.map(async (stage) => {
        const f: Record<string, any> = { ...filter, stage };
        if (stage === 'won' || stage === 'lost') f.updatedAt = { $gte: closedSince };
        const [leads, count, totals] = await Promise.all([
          Lead.find(f)
            .sort({ nextFollowUpAt: 1, updatedAt: -1 })
            .limit(PER_COLUMN)
            .populate([{ path: 'companyId', select: 'name' }, { path: 'ownerId', select: 'name' }])
            .lean(),
          Lead.countDocuments(f),
          Lead.aggregate([
            { $match: f },
            { $group: { _id: '$currency', total: { $sum: { $ifNull: ['$dealValue', 0] } } } },
          ]),
        ]);
        return {
          stage,
          count,
          totals: Object.fromEntries(totals.map((t) => [t._id, t.total])),
          leads: leads.map(serializeLead),
        };
      }),
    );
    res.json({ columns });
  }),
);

export default router;
