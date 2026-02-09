/**
 * Authentication & Authorization Middleware
 *
 * - authenticate: verifies JWT token, attaches user to request
 * - authorize: checks user role against allowed roles
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/auth-service.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Verify JWT token from Authorization header
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Check if authenticated user has one of the allowed roles
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${req.user.role}' does not have access. Required: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}