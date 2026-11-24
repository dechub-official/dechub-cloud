import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'This endpoint does not exist.' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Some fields need attention.',
        fields: err.flatten().fieldErrors,
      },
    });
  }
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err?.code === 11000) {
    return res
      .status(409)
      .json({ error: { code: 'conflict', message: 'A record with these details already exists.' } });
  }
  if (err?.name === 'CastError') {
    return res.status(404).json({ error: { code: 'not_found', message: 'Record not found.' } });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: { code: 'file_too_large', message: 'The file is larger than 5 MB.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side.' } });
}
