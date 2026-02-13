import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFound } from '../middleware/validate.js';
import { query, DEFAULT_TENANT_ID } from '../db.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  max_funds: number;
  max_investors: number;
  status: string;
  created_at: string;
}

router.get('/current', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
  const rows = await query<TenantRow>(
    `SELECT id, name, slug, domain, settings, max_funds, max_investors, status, created_at
     FROM tenants
     WHERE id = $1`,
    [tenantId]
  );

  const tenant = rows.length > 0 ? rows[0] : null;
  requireFound(tenant, 'Tenant', tenantId);

  res.json(tenant);
}));

router.get('/', authorize('admin'), asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const rows = await query<TenantRow>(
    `SELECT id, name, slug, domain, settings, max_funds, max_investors, status, created_at
     FROM tenants
     ORDER BY created_at ASC`
  );
  res.json(rows);
}));

export default router;
