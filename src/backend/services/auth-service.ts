/**
 * Auth Service
 *
 * Handles user registration, login, JWT token management,
 * refresh tokens, login attempt tracking, and account lockout.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'crypto';
import { query, execute, DEFAULT_TENANT_ID } from '../db.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

// Short-lived access token (30 minutes) + long-lived refresh token (7 days)
const JWT_EXPIRES_IN = '30m';
const REFRESH_TOKEN_EXPIRES_HOURS = 168; // 7 days
const SALT_ROUNDS = 10;

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'compliance_officer' | 'viewer';
  tenant_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRow extends User {
  password_hash: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

// ─── Password Complexity ─────────────────────────────────────

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, message: 'Password must be at least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'Password must contain at least one uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), message: 'Password must contain at least one lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), message: 'Password must contain at least one digit' },
];

export function validatePasswordComplexity(password: string): string[] {
  return PASSWORD_RULES.filter(rule => !rule.test(password)).map(rule => rule.message);
}

// ─── Login Attempt Tracking ──────────────────────────────────

async function recordLoginAttempt(email: string, success: boolean, ipAddress: string): Promise<void> {
  try {
    await execute(
      `INSERT INTO login_attempts (id, email, success, ip_address, attempted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), email, success, ipAddress, new Date().toISOString()]
    );
  } catch {
    // Non-critical — don't fail login if audit insert fails (table may not exist yet)
  }
}

async function isAccountLocked(email: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
    const rows = await query<{ attempt_count: number }>(
      `SELECT COUNT(*) as attempt_count FROM login_attempts
       WHERE email = ? AND success = false AND attempted_at > ?`,
      [email, cutoff]
    );
    return rows.length > 0 && rows[0].attempt_count >= MAX_LOGIN_ATTEMPTS;
  } catch {
    return false; // Fail open if table doesn't exist yet
  }
}

// ─── Refresh Tokens ──────────────────────────────────────────

async function createRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();
  try {
    await execute(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), userId, token, expiresAt, new Date().toISOString()]
    );
  } catch {
    // Table may not exist yet — return token anyway for backward compat
  }
  return token;
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthResult | null> {
  try {
    const rows = await query<{ user_id: string; expires_at: string }>(
      `SELECT user_id, expires_at FROM refresh_tokens WHERE token = ?`,
      [refreshToken]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await execute(`DELETE FROM refresh_tokens WHERE token = ?`, [refreshToken]);
      return null;
    }

    const user = await getUserById(row.user_id);
    if (!user || !user.active) return null;

    // Rotate: delete old, create new
    await execute(`DELETE FROM refresh_tokens WHERE token = ?`, [refreshToken]);
    const newRefreshToken = await createRefreshToken(user.id);
    const accessToken = generateToken(user);

    return { user, token: accessToken, refreshToken: newRefreshToken, expiresIn: 1800 };
  } catch {
    return null;
  }
}

export async function revokeRefreshTokens(userId: string): Promise<void> {
  try {
    await execute(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
  } catch {
    // Non-critical
  }
}

// ─── Core Auth Functions ─────────────────────────────────────

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'compliance_officer' | 'viewer' = 'viewer'
): Promise<AuthResult> {
  const existing = await query<UserRow>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existing.length > 0) {
    throw new Error('Email already registered');
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await execute(
    `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, passwordHash, name, role, true, now, now]
  );

  const user: User = {
    id, email, name, role,
    tenant_id: DEFAULT_TENANT_ID,
    active: true,
    created_at: now,
    updated_at: now,
  };
  const token = generateToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return { user, token, refreshToken, expiresIn: 1800 };
}

/**
 * Login with email and password
 */
export async function loginUser(
  email: string,
  password: string,
  ipAddress: string = 'unknown'
): Promise<AuthResult> {
  // Check account lockout
  if (await isAccountLocked(email)) {
    throw new Error(`Account temporarily locked. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`);
  }

  const rows = await query<UserRow>(
    'SELECT * FROM users WHERE email = ? AND active = ?',
    [email, true]
  );

  if (rows.length === 0) {
    await recordLoginAttempt(email, false, ipAddress);
    throw new Error('Invalid email or password');
  }

  const row = rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    await recordLoginAttempt(email, false, ipAddress);
    throw new Error('Invalid email or password');
  }

  await recordLoginAttempt(email, true, ipAddress);

  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const token = generateToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return { user, token, refreshToken, expiresIn: 1800 };
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id || DEFAULT_TENANT_ID,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Get user by ID (without password)
 */
export async function getUserById(id: string): Promise<User | null> {
  const rows = await query<UserRow>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
