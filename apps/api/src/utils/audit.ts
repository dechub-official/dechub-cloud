import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models';

export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: Types.ObjectId | string,
  changes?: Record<string, unknown>,
  orgIdOverride?: Types.ObjectId | string,
) {
  const orgId = orgIdOverride ?? req.auth?.orgId;
  if (!orgId) return;
  try {
    await AuditLog.create({
      orgId,
      userId: req.auth?.userId,
      action,
      entity,
      entityId,
      changes,
      ip: req.ip,
    });
  } catch (e) {
    console.error('[audit] failed', e);
  }
}

/** Returns {field: {from, to}} for fields that changed. */
export function diff(before: Record<string, any>, after: Record<string, any>, fields: string[]) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of fields) {
    const a = before[f];
    const b = after[f];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) changes[f] = { from: a, to: b };
  }
  return changes;
}
