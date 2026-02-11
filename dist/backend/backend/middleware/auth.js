/**
 * Authentication & Authorization Middleware
 *
 * - authenticate: verifies JWT token, attaches user to request
 * - authorize: checks user role against allowed roles
 */
import { verifyToken } from '../services/auth-service.js';
/**
 * Verify JWT token from Authorization header
 */
export function authenticate(req, res, next) {
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
    }
    catch {
        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
        });
    }
}
/**
 * Check if authenticated user has one of the allowed roles
 */
export function authorize(...roles) {
    return (req, res, next) => {
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
//# sourceMappingURL=auth.js.map