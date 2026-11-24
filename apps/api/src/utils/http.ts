import type { NextFunction, Request, Response, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please log in to continue.') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Your role does not allow this action.') =>
  new HttpError(403, 'forbidden', message);
export const notFound = (what = 'Record') => new HttpError(404, 'not_found', `${what} not found.`);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);

/** Wraps an async route handler so thrown errors reach the error middleware. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
