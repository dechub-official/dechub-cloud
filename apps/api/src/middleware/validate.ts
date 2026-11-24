import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Check 5: validates and replaces req.body / req.query with the parsed value. */
export const validate =
  (schema: ZodSchema, where: 'body' | 'query' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) return next(result.error);
    if (where === 'body') req.body = result.data;
    else (req as any).validQuery = result.data;
    next();
  };

export function q<T>(req: Request): T {
  return (req as any).validQuery as T;
}
