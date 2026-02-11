/**
 * Auth Service
 *
 * Handles user registration, login, and JWT token management.
 */
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'compliance_officer' | 'viewer';
    active: boolean;
    created_at: string;
    updated_at: string;
}
export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
export interface AuthResult {
    user: User;
    token: string;
}
/**
 * Register a new user
 */
export declare function registerUser(email: string, password: string, name: string, role?: 'admin' | 'compliance_officer' | 'viewer'): Promise<AuthResult>;
/**
 * Login with email and password
 */
export declare function loginUser(email: string, password: string): Promise<AuthResult>;
/**
 * Verify a JWT token and return the payload
 */
export declare function verifyToken(token: string): TokenPayload;
/**
 * Get user by ID (without password)
 */
export declare function getUserById(id: string): Promise<User | null>;
//# sourceMappingURL=auth-service.d.ts.map