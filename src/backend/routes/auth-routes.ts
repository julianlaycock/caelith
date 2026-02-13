/**
 * Auth Routes
 *
 * POST /auth/register  - Create new user (with password complexity)
 * POST /auth/login     - Login and get token + refresh token
 * POST /auth/refresh   - Refresh access token
 * POST /auth/logout    - Revoke refresh tokens
 * GET  /auth/me        - Get current user info
 */

import express from 'express';
import { registerUser, loginUser, validatePasswordComplexity, refreshAccessToken, revokeRefreshTokens } from '../services/auth-service.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /auth/register
 */
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: email, password, name',
      });
      return;
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      });
      return;
    }

    // Password complexity validation
    const passwordErrors = validatePasswordComplexity(password);
    if (passwordErrors.length > 0) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: passwordErrors.join('; '),
        details: { passwordErrors },
      });
      return;
    }

    const result = await registerUser(email, password, name, role);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Email already registered' ? 409 : 500;
    res.status(status).json({
      error: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR',
      message,
    });
  }
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: email, password',
      });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await loginUser(email, password, ipAddress);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid email or password';
    const isLocked = message.includes('temporarily locked');
    res.status(isLocked ? 429 : 401).json({
      error: isLocked ? 'ACCOUNT_LOCKED' : 'UNAUTHORIZED',
      message,
    });
  }
});

/**
 * POST /auth/refresh — exchange refresh token for new access + refresh token pair
 */
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing refreshToken',
      });
      return;
    }

    const result = await refreshAccessToken(refreshToken);
    if (!result) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    res.json(result);
  } catch {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token refresh failed',
    });
  }
});

/**
 * POST /auth/logout — revoke all refresh tokens for the authenticated user
 */
router.post('/logout', authenticate, async (req, res): Promise<void> => {
  if (req.user) {
    await revokeRefreshTokens(req.user.userId);
  }
  res.json({ message: 'Logged out' });
});

/**
 * GET /auth/me
 */
router.get('/me', authenticate, async (req, res): Promise<void> => {
  res.json({ user: req.user });
});

export default router;
