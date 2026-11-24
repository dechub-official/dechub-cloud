import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { Organization, User } from '../../models';
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from '../../middleware/auth';
import { loginLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { audit } from '../../utils/audit';
import { resetEmail } from '../../utils/email';
import { ah, badRequest, HttpError } from '../../utils/http';
import { serializeOrg, serializeUser } from '../../utils/serialize';
import { randomToken, sha256 } from '../../utils/tokens';
import { acceptInviteSchema, forgotSchema, loginSchema, resetSchema } from './auth.schema';

const router = Router();
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const GENERIC = 'That email and password combination is not right.';

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  ah(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash || user.status !== 'active') {
      throw new HttpError(401, 'invalid_credentials', GENERIC);
    }
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new HttpError(429, 'locked', 'Too many failed attempts. Try again in 15 minutes.');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.failedLogins = (user.failedLogins ?? 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.failedLogins = 0;
      }
      await user.save();
      throw new HttpError(401, 'invalid_credentials', GENERIC);
    }
    user.failedLogins = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();
    await user.save();
    setSessionCookie(res, String(user._id));
    await audit(req, 'login', 'user', user._id, undefined, user.orgId);
    const org = await Organization.findById(user.orgId);
    res.json({ user: serializeUser(user), org: org ? serializeOrg(org) : null });
  }),
);

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/**
 * Returns the current user and organization. The CRM calls this every minute while
 * a tab is open; that call doubles as the presence heartbeat used for lead assignment.
 */
router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { lastSeenAt: new Date() },
      { new: true },
    );
    const org = await Organization.findById(req.auth!.orgId);
    res.json({ user: serializeUser(user), org: org ? serializeOrg(org) : null });
  }),
);

router.get(
  '/invite/:token',
  ah(async (req, res) => {
    const user = await User.findOne({ inviteTokenHash: sha256(req.params.token) });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw badRequest('This invite link has expired. Ask your admin to send a new one.');
    }
    const org = await Organization.findById(user.orgId);
    res.json({ email: user.email, name: user.name, orgName: org?.name });
  }),
);

router.post(
  '/accept-invite',
  validate(acceptInviteSchema),
  ah(async (req, res) => {
    const { token, password, name } = req.body;
    const user = await User.findOne({ inviteTokenHash: sha256(token) });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw badRequest('This invite link has expired. Ask your admin to send a new one.');
    }
    user.passwordHash = await bcrypt.hash(password, 12);
    if (name) user.name = name;
    user.status = 'active';
    user.inviteTokenHash = undefined;
    user.inviteExpiresAt = undefined;
    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();
    await user.save();
    setSessionCookie(res, String(user._id));
    await audit(req, 'invite_accepted', 'user', user._id, undefined, user.orgId);
    res.json({ user: serializeUser(user) });
  }),
);

router.post(
  '/forgot-password',
  loginLimiter,
  validate(forgotSchema),
  ah(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase(), status: 'active' });
    if (user) {
      const token = randomToken();
      user.resetTokenHash = sha256(token);
      user.resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await resetEmail(user.email, `${env.WEB_URL}/reset/${token}`);
    }
    // Same answer whether or not the email exists, so accounts can't be discovered.
    res.json({ ok: true });
  }),
);

router.post(
  '/reset-password',
  validate(resetSchema),
  ah(async (req, res) => {
    const user = await User.findOne({ resetTokenHash: sha256(req.body.token) });
    if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      throw badRequest('This reset link has expired. Request a new one.');
    }
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetTokenHash = undefined;
    user.resetExpiresAt = undefined;
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
    await audit(req, 'password_reset', 'user', user._id, undefined, user.orgId);
    res.json({ ok: true });
  }),
);

export default router;
