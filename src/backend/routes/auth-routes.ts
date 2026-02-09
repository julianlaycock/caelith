/**
 * Auth Routes
 *
 * POST /auth/register - Create new user
 * POST /auth/login    - Login and get token
 * GET  /auth/me       - Get current user info
 */

import express from 'express';
import { registerUser, loginUser } from '../services/auth-service.js';
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

    if (password.length < 8) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
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

    const result = await loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
  }
});

/**
 * GET /auth/me
 */
router.get('/me', authenticate, async (req, res): Promise<void> => {
  res.json({ user: req.user });
});

export default router;