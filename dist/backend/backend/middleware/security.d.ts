/**
 * Security Middleware
 *
 * Rate limiting, security headers, and input sanitization.
 */
import { Request, Response, NextFunction } from 'express';
export declare function securityHeaders(_req: Request, res: Response, next: NextFunction): void;
/**
 * Clear all rate limit entries (used by test reset endpoint)
 */
export declare function clearRateLimits(): void;
interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
}
export declare function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const exportRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare function sanitizeInput(req: Request, _res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=security.d.ts.map