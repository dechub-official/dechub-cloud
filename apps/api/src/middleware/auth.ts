import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import type { Role } from '@dechub/shared';
import { env, isProd } from '../config/env';
import { User } from '../models';
import { forbidden, unauthorized } from '../utils/http';

export const SESSION_COOKIE = 'dch_session';
const SESSION_DAYS = 7;

export interface AuthContext {
  userId: Types.ObjectId;
  orgId: Types.ObjectId;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function setSessionCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { domain: env.COOKIE_DOMAIN || undefined, path: '/' });
}

/**
 * Check 2 of the request pipeline: the session must be signed, unexpired and belong
 * to an active user. Sets req.auth, including the tenant (orgId) taken from the user
 * record, never from the request.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthorized();
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    } catch {
      throw unauthorized('Your session has expired. Please log in again.');
    }
    const user = await User.findById(payload.sub).select('orgId role status name').lean();
    if (!user || user.status !== 'active') throw unauthorized();
    req.auth = {
      userId: user._id,
      orgId: user.orgId,
      role: user.role as Role,
      name: user.name,
    };
    next();
  } catch (e) {
    next(e);
  }
}

/** Check 4: role-based permission. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(forbidden());
    next();
  };

/** Returns the tenant filter every query must include. */
export function tenant(req: Request) {
  if (!req.auth) throw unauthorized();
  return { orgId: req.auth.orgId };
}
