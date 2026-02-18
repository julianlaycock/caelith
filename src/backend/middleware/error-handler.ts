import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = res.getHeader('X-Request-Id') as string | undefined;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { requestId, method: req.method, path: req.path, statusCode: err.statusCode, error: err });
    }
    res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  logger.error('Unhandled error', { requestId, method: req.method, path: req.path, statusCode: 500, error: err });
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { debug: err.message }),
  });
}
