/**
 * Express Server
 *
 * Main API server for Private Asset Registry
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { closeDb, execute as dbExecute, DEFAULT_TENANT_ID, query as dbQuery } from './db.js';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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
import templateRoutes from './routes/template-routes.js';
import { securityHeaders, apiRateLimit, authRateLimit, sanitizeInput, clearRateLimits } from './middleware/security.js';
import fundStructureRoutes from './routes/fund-structure-routes.js';
import eligibilityRoutes from './routes/eligibility-routes.js';
import decisionRecordRoutes from './routes/decision-record-routes.js';
import nlRulesRoutes from './routes/nl-rules-routes.js';
import onboardingRoutes from './routes/onboarding-routes.js';
import complianceReportRoutes from './routes/compliance-report-routes.js';
import tenantRoutes from './routes/tenant-routes.js';
import { createRegulatoryRoutes } from './routes/regulatory-routes.js';
import { createCopilotRoutes } from './routes/copilot-routes.js';
import scenarioRoutes from './routes/scenario-routes.js';
import { isResetEndpointEnabled, shouldBootstrapAdmin } from './config/security-config.js';

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'] as const;
for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate JWT_SECRET strength (HS256 requires >= 256 bits = 32 bytes)
if ((process.env.JWT_SECRET as string).length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters for HS256 security');
  process.exit(1);
}

// Validate conditional API keys
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';
if (EMBEDDING_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set but EMBEDDING_PROVIDER=openai — embeddings will fail');
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY not set — copilot and NL compiler will be unavailable');
}

/**
 * Ensure the default admin user exists in the database.
 * Idempotent — safe to call on every startup.
 */
async function ensureAdminUser(): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@caelith.com';
  const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

  const bootstrap = shouldBootstrapAdmin(process.env.ADMIN_PASSWORD, process.env.NODE_ENV);
  if (!bootstrap.allowed) {
    if (bootstrap.fatal) {
      console.error('FATAL: ADMIN_PASSWORD must be set in production.');
      process.exit(1);
    }
    console.warn('WARNING: ADMIN_PASSWORD not set; skipping automatic admin bootstrap.');
    return;
  }
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD || !ADMIN_PASSWORD.trim()) {
    console.warn('WARNING: ADMIN_PASSWORD not set; skipping automatic admin bootstrap.');
    return;
  }

  try {
    const existing = await dbQuery<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log(`✅ Admin user (${ADMIN_EMAIL}) already exists.`);
      return;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await dbExecute(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'admin', true, now, now]
    );

    console.log(`🔑 Admin user created: ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('⚠️  Failed to ensure admin user:', error);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(securityHeaders);
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

// Handle preflight OPTIONS requests quickly before any async middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);

// Request ID middleware — attach unique ID to every request for tracing
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as express.Request & { requestId?: string }).requestId = requestId;
  next();
});

// Health check endpoints
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Deep health check — verifies database connectivity
app.get('/api/health/ready', async (_req: express.Request, res: express.Response) => {
  try {
    await dbQuery('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected', timestamp: new Date().toISOString() });
  }
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

// Apply general API rate limit (200 req / 15 min per IP)
app.use('/api', apiRateLimit);

// Register API routes
// Public routes (no auth required)
app.use('/api/auth', authRateLimit, authRoutes);

// API Documentation
const openapiDoc = parse(readFileSync('./openapi.yml', 'utf-8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Caelith API Documentation',
}));

// Protected routes (auth required)
app.use('/api/assets', authenticate, assetRoutes);
app.use('/api/investors', authenticate, investorRoutes);
app.use('/api/holdings', authenticate, holdingRoutes);
app.use('/api/rules', authenticate, authorize('admin', 'compliance_officer'), rulesRoutes);
app.use('/api/transfers', authenticate, transferRoutes);
app.use('/api/events', authenticate, eventRoutes);
app.use('/api/webhooks', authenticate, authorize('admin'), webhookRoutes);
app.use('/api/composite-rules', authenticate, authorize('admin', 'compliance_officer'), compositeRulesRoutes);
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/fund-structures', authenticate, fundStructureRoutes);
app.use('/api/onboarding', authenticate, onboardingRoutes);
app.use('/api/eligibility', authenticate, eligibilityRoutes);
app.use('/api/decisions', authenticate, decisionRecordRoutes);
app.use('/api/nl-rules', authenticate, authorize('admin', 'compliance_officer'), nlRulesRoutes);
app.use('/api/reports', authenticate, complianceReportRoutes);
app.use('/api/tenants', authenticate, tenantRoutes);
app.use('/api/regulatory', authenticate, createRegulatoryRoutes());
app.use('/api/copilot', authenticate, createCopilotRoutes());
app.use('/api/scenarios', authenticate, scenarioRoutes);

// Test-only: reset database
app.post('/api/reset', authenticate, authorize('admin'), async (_req, res): Promise<void> => {
  if (!isResetEndpointEnabled(process.env.NODE_ENV, process.env.ENABLE_TEST_RESET)) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Reset endpoint is disabled outside test mode' });
    return;
  }
  try {
    // Delete in FK-safe order (children before parents)
    const tables = [
      'webhook_deliveries', 'webhooks', 'composite_rules', 'rule_versions',
      'onboarding_records', 'transfers', 'decision_records', 'eligibility_criteria',
      'events', 'holdings', 'rules', 'assets', 'fund_structures',
      'regulatory_documents', 'investors',
    ];
    for (const table of tables) {
      await dbExecute(`DELETE FROM ${table}`).catch(() => {});
    }
    await dbExecute('DELETE FROM tenants WHERE id <> ?', [DEFAULT_TENANT_ID]).catch(() => {});
    clearRateLimits();
    res.json({ status: 'reset' });
  } catch (error) {
    res.status(500).json({ error: 'RESET_FAILED', message: 'Database reset failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

import { errorHandler } from './middleware/error-handler.js';
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  await closeDb();
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
async function startServer() {
  await ensureAdminUser();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log(`📖 Docs: http://localhost:${PORT}/api/docs`);
    console.log('\n📋 Available endpoints:');
    console.log('  POST /api/assets');
    console.log('  GET  /api/assets');
    console.log('  POST /api/investors');
    console.log('  GET  /api/investors');
    console.log('  POST /api/holdings');
    console.log('  POST /api/rules');
    console.log('  POST /api/transfers');
    console.log('  POST /api/transfers/simulate');
    console.log('  GET  /api/events');
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});


export default app;
