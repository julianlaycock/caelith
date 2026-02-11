/**
 * Authentication & Authorization Middleware
 *
 * - authenticate: verifies JWT token, attaches user to request
 * - authorize: checks user role against allowed roles
 */
import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../services/auth-service.js';
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
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Check if authenticated user has one of the allowed roles
 */
export declare function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map