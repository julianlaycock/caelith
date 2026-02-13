import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { ValidationError, UnauthorizedError } from '../errors.js';
import { registerUser, loginUser, validatePasswordComplexity, refreshAccessToken, revokeRefreshTokens } from '../services/auth-service.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', asyncHandler(async (req, res): Promise<void> => {
  const { email, password, name } = req.body;
  // SECURITY: role is never accepted from public registration — always defaults to 'viewer'
  requireFields(req.body, ['email', 'password', 'name']);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  const passwordErrors = validatePasswordComplexity(password);
  if (passwordErrors.length > 0) {
    throw new ValidationError(passwordErrors.join('; '));
  }

  const result = await registerUser(email, password, name, 'viewer');
  res.status(201).json(result);
}));

router.post('/login', asyncHandler(async (req, res): Promise<void> => {
  const { email, password } = req.body;
  requireFields(req.body, ['email', 'password']);

  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await loginUser(email, password, ipAddress);
  res.json(result);
}));

router.post('/refresh', asyncHandler(async (req, res): Promise<void> => {
  const { refreshToken } = req.body;
  requireFields(req.body, ['refreshToken']);

  const result = await refreshAccessToken(refreshToken);
  if (!result) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  res.json(result);
}));

router.post('/logout', authenticate, asyncHandler(async (req, res): Promise<void> => {
  if (req.user) {
    await revokeRefreshTokens(req.user.userId);
  }
  res.json({ message: 'Logged out' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res): Promise<void> => {
  res.json({ user: req.user });
}));

export default router;
