/**
 * Auth Service
 *
 * Handles user registration, login, and JWT token management.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'codex-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'compliance_officer' | 'viewer';
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
}

export interface AuthResult {
  user: User;
  token: string;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'compliance_officer' | 'viewer' = 'viewer'
): Promise<AuthResult> {
  // Check if email already exists
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

  const user: User = { id, email, name, role, active: true, created_at: now, updated_at: now };
  const token = generateToken(user);

  return { user, token };
}

/**
 * Login with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const rows = await query<UserRow>(
    'SELECT * FROM users WHERE email = ? AND active = ?',
    [email, true]
  );

  if (rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const row = rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const token = generateToken(user);

  return { user, token };
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}