import { Router } from 'express';
import { OPEN_STAGES } from '@dechub/shared';
import { Lead, Task, User } from '../../../models';
import { tenant } from '../../../middleware/auth';
import { ah } from '../../../utils/http';
import { serializeTask } from '../../../utils/serialize';

const router = Router();

router.get(
  '/',
  ah(async (req, res) => {
    const orgId = req.auth!.orgId;
    const isAdmin = req.auth!.role === 'admin';
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(String(req.query.to)) : now;

    const base: Record<string, any> = { orgId, deletedAt: null };
    if (req.query.market) base.market = String(req.query.market);
    if (req.query.businessLine) base.businessLine = String(req.query.businessLine);

    const [newThisWeek, openLeads, wonThisMonth, byStage, bySource, pipelineValue, overdueTasks, myOverdue] =
      await Promise.all([
        Lead.countDocuments({ ...base, createdAt: { $gte: weekAgo } }),
        Lead.countDocuments({ ...base, stage: { $in: OPEN_STAGES } }),
        Lead.countDocuments({ ...base, stage: 'won', closedAt: { $gte: monthStart } }),
        Lead.aggregate([
          { $match: { ...base, stage: { $in: OPEN_STAGES } } },
          { $group: { _id: '$stage', count: { $sum: 1 } } },
        ]),
        Lead.aggregate([
          { $match: { ...base, createdAt: { $gte: from, $lte: to } } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Lead.aggregate([
          { $match: { ...base, stage: { $in: OPEN_STAGES } } },
          { $group: { _id: { stage: '$stage', currency: '$currency' }, total: { $sum: { $ifNull: ['$dealValue', 0] } } } },
        ]),
        Task.countDocuments(
          isAdmin
            ? { ...tenant(req), status: 'open', dueAt: { $lt: now } }
            : { ...tenant(req), status: 'open', dueAt: { $lt: now }, assigneeId: req.auth!.userId },
        ),
        Task.find({ ...tenant(req), status: 'open', dueAt: { $lt: now }, assigneeId: req.auth!.userId })
          .sort({ dueAt: 1 })
          .limit(8)
          .populate([{ path: 'leadId', select: 'fullName' }, { path: 'assigneeId', select: 'name' }])
          .lean(),
      ]);

    const wonValue = await Lead.aggregate([
      { $match: { ...base, stage: 'won', closedAt: { $gte: monthStart } } },
      { $group: { _id: '$currency', total: { $sum: { $ifNull: ['$dealValue', 0] } } } },
    ]);

    let leaderboard: any[] | undefined;
    if (isAdmin) {
      const users = await User.find({ orgId, status: 'active' }).select('name').lean();
      const [open, overdue, won] = await Promise.all([
        Lead.aggregate([
          { $match: { ...base, stage: { $in: OPEN_STAGES } } },
          { $group: { _id: '$ownerId', n: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { orgId, status: 'open', dueAt: { $lt: now } } },
          { $group: { _id: '$assigneeId', n: { $sum: 1 } } },
        ]),
        Lead.aggregate([
          { $match: { ...base, stage: 'won', closedAt: { $gte: monthStart } } },
          { $group: { _id: '$ownerId', n: { $sum: 1 } } },
        ]),
      ]);
      const m = (arr: any[]) => new Map(arr.map((x) => [String(x._id), x.n]));
      const o = m(open), od = m(overdue), w = m(won);
      leaderboard = users
        .map((u) => ({
          id: String(u._id),
          name: u.name,
          openLeads: o.get(String(u._id)) ?? 0,
          overdueTasks: od.get(String(u._id)) ?? 0,
          wonThisMonth: w.get(String(u._id)) ?? 0,
        }))
        .sort((a, b) => b.wonThisMonth - a.wonThisMonth || b.openLeads - a.openLeads);
    }

    const pv: Record<string, Record<string, number>> = {};
    for (const row of pipelineValue) {
      pv[row._id.stage] ??= {};
      pv[row._id.stage][row._id.currency] = row.total;
    }

    res.json({
      numbers: { newThisWeek, openLeads, overdueTasks, wonThisMonth },
      wonValue: Object.fromEntries(wonValue.map((r) => [r._id, r.total])),
      byStage: OPEN_STAGES.map((s) => ({ stage: s, count: byStage.find((b) => b._id === s)?.count ?? 0 })),
      bySource: bySource.map((s) => ({ source: s._id, count: s.count })),
      pipelineValue: OPEN_STAGES.map((s) => ({ stage: s, totals: pv[s] ?? {} })),
      myOverdue: myOverdue.map(serializeTask),
      leaderboard,
      range: { from, to },
    });
  }),
);

export default router;
