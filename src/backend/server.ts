/**
 * Express Server
 * 
 * Main API server for Private Asset Registry
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { closeDb } from './db.js';

// Import routes
import assetRoutes from './routes/asset-routes.js';
import investorRoutes from './routes/investor-routes.js';
import holdingRoutes from './routes/holding-routes.js';
import rulesRoutes from './routes/rules-routes.js';
import transferRoutes from './routes/transfer-routes.js';
import eventRoutes from './routes/event-routes.js';
import authRoutes from './routes/auth-routes.js';
import { authenticate, authorize } from './middleware/auth.js';
import webhookRoutes from './routes/webhook-routes.js';
import compositeRulesRoutes from './routes/composite-rules-routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Private Asset Registry API',
    version: '1.0.0',
    endpoints: {
      assets: '/api/assets',
      investors: '/api/investors',
      holdings: '/api/holdings',
      rules: '/api/rules',
      transfers: '/api/transfers',
      events: '/api/events',
    },
  });
});

// Register API routes
// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/assets', authenticate, assetRoutes);
app.use('/api/investors', authenticate, investorRoutes);
app.use('/api/holdings', authenticate, holdingRoutes);
app.use('/api/rules', authenticate, authorize('admin', 'compliance_officer'), rulesRoutes);
app.use('/api/transfers', authenticate, transferRoutes);
app.use('/api/events', authenticate, eventRoutes);
app.use('/api/webhooks', authenticate, authorize('admin'), webhookRoutes);
app.use('/api/composite-rules', authenticate, authorize('admin', 'compliance_officer'), compositeRulesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message,
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDb();
  process.exit(0);
});

import { execute as dbExecute } from './db.js';

// Test-only: reset database
app.post('/api/reset', async (_req, res): Promise<void> => {
  try {
    await dbExecute('DELETE FROM events');
    await dbExecute('DELETE FROM transfers');
    await dbExecute('DELETE FROM holdings');
    await dbExecute('DELETE FROM rules');
    await dbExecute('DELETE FROM investors');
    await dbExecute('DELETE FROM assets');
    res.json({ status: 'reset' });
  } catch (error) {
    res.status(500).json({ error: 'RESET_FAILED' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('\n📋 Available endpoints:');
  console.log(`   POST   /api/assets`);
  console.log(`   GET    /api/assets`);
  console.log(`   POST   /api/investors`);
  console.log(`   GET    /api/investors`);
  console.log(`   POST   /api/holdings`);
  console.log(`   POST   /api/rules`);
  console.log(`   POST   /api/transfers`);
  console.log(`   POST   /api/transfers/simulate`);
  console.log(`   GET    /api/events`);
});

export default app;