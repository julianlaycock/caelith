import express, { Request, Response } from 'express';
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

router.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const rows = await query<TenantRow>(
      `SELECT id, name, slug, domain, settings, max_funds, max_investors, status, created_at
       FROM tenants
       WHERE id = $1`,
      [tenantId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
      return;
    }

    res.json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.get('/', authorize('admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<TenantRow>(
      `SELECT id, name, slug, domain, settings, max_funds, max_investors, status, created_at
       FROM tenants
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
