import { Router } from 'express';
import { z } from 'zod';
import { Lead, Task, User } from '../../../models';
import { tenant } from '../../../middleware/auth';
import { q, validate } from '../../../middleware/validate';
import { audit } from '../../../utils/audit';
import { ah, badRequest, forbidden, notFound } from '../../../utils/http';
import { serializeTask } from '../../../utils/serialize';
import { logActivity, syncNextFollowUp } from '../leads/leads.service';

const router = Router();

const listQuery = z.object({
  scope: z.enum(['mine', 'team']).default('mine'),
  window: z.enum(['today', 'overdue', 'upcoming', 'open', 'all']).default('open'),
  leadId: z.string().optional(),
  // End of "today" in the viewer's own time zone, sent by the browser.
  todayEnd: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const createSchema = z.object({
  leadId: z.string(),
  title: z.string().trim().min(1, 'Add a title.').max(200),
  dueAt: z.coerce.date(),
  assigneeId: z.string().optional(),
});

const updateSchema = z.object({
  action: z.enum(['complete', 'reschedule', 'cancel', 'reassign']),
  dueAt: z.coerce.date().optional(),
  assigneeId: z.string().optional(),
});

const populate = [
  { path: 'assigneeId', select: 'name' },
  { path: 'leadId', select: 'fullName' },
];

function endOfToday(todayEnd?: string) {
  if (todayEnd) {
    const d = new Date(todayEnd);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get(
  '/',
  validate(listQuery, 'query'),
  ah(async (req, res) => {
    const query = q<z.infer<typeof listQuery>>(req);
    if (query.scope === 'team' && req.auth!.role !== 'admin' && !query.leadId) {
      throw forbidden('Only admins can see the team view.');
    }
    const filter: Record<string, any> = { ...tenant(req) };
    if (query.leadId) filter.leadId = query.leadId;
    else if (query.scope === 'mine') filter.assigneeId = req.auth!.userId;

    const now = new Date();
    const eod = endOfToday(query.todayEnd);
    if (query.window !== 'all') filter.status = 'open';
    if (query.window === 'overdue') filter.dueAt = { $lt: now };
    if (query.window === 'today') filter.dueAt = { $gte: now, $lte: eod };
    if (query.window === 'upcoming') filter.dueAt = { $gt: eod };

    const items = await Task.find(filter)
      .sort(query.window === 'all' ? { status: 1, dueAt: 1 } : { dueAt: 1 })
      .limit(query.limit)
      .populate(populate)
      .lean();
    res.json({ items: items.map(serializeTask) });
  }),
);

/** Counts for the navigation badge, refreshed every minute by the web app. */
router.get(
  '/summary',
  ah(async (req, res) => {
    const now = new Date();
    const eod = endOfToday(req.query.todayEnd as string | undefined);
    const base = { ...tenant(req), assigneeId: req.auth!.userId, status: 'open' };
    const [overdue, today] = await Promise.all([
      Task.countDocuments({ ...base, dueAt: { $lt: now } }),
      Task.countDocuments({ ...base, dueAt: { $gte: now, $lte: eod } }),
    ]);
    res.json({ overdue, today });
  }),
);

router.post(
  '/',
  validate(createSchema),
  ah(async (req, res) => {
    const orgId = req.auth!.orgId;
    const lead = await Lead.findOne({ _id: req.body.leadId, orgId, deletedAt: null });
    if (!lead) throw notFound('Lead');
    if (lead.stage === 'won' || lead.stage === 'lost') {
      throw badRequest('This lead is closed. Reopen it before adding follow-ups.');
    }
    const assigneeId = req.body.assigneeId || lead.ownerId || req.auth!.userId;
    const assignee = await User.findOne({ _id: assigneeId, orgId, status: 'active' }).select('_id');
    if (!assignee) throw badRequest('Pick an active teammate for this follow-up.');
    const task = await Task.create({
      orgId,
      leadId: lead._id,
      title: req.body.title,
      dueAt: req.body.dueAt,
      assigneeId: assignee._id,
    });
    await syncNextFollowUp(orgId, lead._id);
    const full = await Task.findById(task._id).populate(populate).lean();
    res.status(201).json({ task: serializeTask(full) });
  }),
);

router.patch(
  '/:id',
  validate(updateSchema),
  ah(async (req, res) => {
    const orgId = req.auth!.orgId;
    const task = await Task.findOne({ _id: req.params.id, orgId });
    if (!task) throw notFound('Follow-up');
    const actor = req.auth!.userId;
    const { action } = req.body as z.infer<typeof updateSchema>;

    if (action === 'complete') {
      if (task.status !== 'open') throw badRequest('This follow-up is already closed.');
      task.status = 'done';
      task.completedAt = new Date();
      await logActivity(orgId, task.leadId, 'task_done', actor, task.title);
    } else if (action === 'reschedule') {
      if (!req.body.dueAt) throw badRequest('Pick a new date and time.');
      task.history.push({ dueAt: task.dueAt, changedAt: new Date(), changedBy: actor });
      task.dueAt = req.body.dueAt;
      task.status = 'open';
      await logActivity(orgId, task.leadId, 'task_rescheduled', actor, task.title, {
        dueAt: req.body.dueAt,
      });
    } else if (action === 'cancel') {
      task.status = 'cancelled';
      await logActivity(orgId, task.leadId, 'task_cancelled', actor, task.title);
    } else if (action === 'reassign') {
      const assignee = await User.findOne({ _id: req.body.assigneeId, orgId, status: 'active' }).select('_id');
      if (!assignee) throw badRequest('Pick an active teammate.');
      task.assigneeId = assignee._id;
    }
    await task.save();
    await syncNextFollowUp(orgId, task.leadId);
    await audit(req, `task_${action}`, 'task', task._id);
    const full = await Task.findById(task._id).populate(populate).lean();
    res.json({ task: serializeTask(full) });
  }),
);

export default router;
