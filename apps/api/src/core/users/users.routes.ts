import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '@dechub/shared';
import { env } from '../../config/env';
import { Lead, Organization, Task, User } from '../../models';
import { requireRole, tenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { audit } from '../../utils/audit';
import { inviteEmail } from '../../utils/email';
import { ah, badRequest, conflict, notFound } from '../../utils/http';
import { serializeUser } from '../../utils/serialize';
import { randomToken, sha256 } from '../../utils/tokens';

const router = Router();
const INVITE_MS = 48 * 60 * 60 * 1000;

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  role: z.enum(ROLES),
});

const updateSchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
  reassignTo: z.string().optional(),
});

/** Everyone can list teammates (needed for owner pickers); only admins see email and status detail. */
router.get(
  '/',
  ah(async (req, res) => {
    const users = await User.find(tenant(req)).sort({ name: 1 }).lean();
    res.json({ items: users.map(serializeUser) });
  }),
);

async function sendInvite(req: any, user: any) {
  const token = randomToken();
  user.inviteTokenHash = sha256(token);
  user.inviteExpiresAt = new Date(Date.now() + INVITE_MS);
  await user.save();
  const org = await Organization.findById(user.orgId);
  await inviteEmail(user.email, req.auth.name, org?.name ?? 'Dechub', `${env.WEB_URL}/invite/${token}`);
}

router.post(
  '/invite',
  requireRole('admin'),
  validate(inviteSchema),
  ah(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) throw conflict('Someone with this email already has an account.');
    const user = await User.create({ ...tenant(req), email, name: req.body.name, role: req.body.role, status: 'invited' });
    await sendInvite(req, user);
    await audit(req, 'user_invited', 'user', user._id, { email, role: user.role });
    res.status(201).json({ user: serializeUser(user) });
  }),
);

router.post(
  '/:id/resend-invite',
  requireRole('admin'),
  ah(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, ...tenant(req) });
    if (!user) throw notFound('User');
    if (user.status !== 'invited') throw badRequest('This user has already set a password.');
    await sendInvite(req, user);
    await audit(req, 'invite_resent', 'user', user._id);
    res.json({ ok: true });
  }),
);

router.patch(
  '/:id',
  requireRole('admin'),
  validate(updateSchema),
  ah(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, ...tenant(req) });
    if (!user) throw notFound('User');
    const isSelf = String(user._id) === String(req.auth!.userId);
    const changes: Record<string, unknown> = {};

    if (req.body.role && req.body.role !== user.role) {
      if (isSelf) throw badRequest("You can't change your own role.");
      changes.role = { from: user.role, to: req.body.role };
      user.role = req.body.role;
    }

    if (req.body.status === 'deactivated' && user.status !== 'deactivated') {
      if (isSelf) throw badRequest("You can't deactivate yourself.");
      if (req.body.reassignTo) {
        const target = await User.findOne({ _id: req.body.reassignTo, ...tenant(req), status: 'active' });
        if (!target) throw badRequest('Pick an active user to take over the leads.');
        const leadRes = await Lead.updateMany(
          { ...tenant(req), ownerId: user._id, deletedAt: null, stage: { $nin: ['won', 'lost'] } },
          { ownerId: target._id },
        );
        const taskRes = await Task.updateMany(
          { ...tenant(req), assigneeId: user._id, status: 'open' },
          { assigneeId: target._id },
        );
        changes.reassigned = { to: String(target._id), leads: leadRes.modifiedCount, tasks: taskRes.modifiedCount };
      }
      changes.status = { from: user.status, to: 'deactivated' };
      user.status = 'deactivated';
    } else if (req.body.status === 'active' && user.status === 'deactivated') {
      changes.status = { from: 'deactivated', to: user.passwordHash ? 'active' : 'invited' };
      user.status = user.passwordHash ? 'active' : 'invited';
    }

    await user.save();
    await audit(req, 'user_updated', 'user', user._id, changes);
    res.json({ user: serializeUser(user) });
  }),
);

export default router;
