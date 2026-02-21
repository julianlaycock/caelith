import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { getCalendarEvents, getUpcomingAlerts } from '../services/calendar-service.js';

export function createCalendarRoutes(): Router {
  const router = Router();

  // GET /api/calendar — all events with optional filters
  router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const { from, to, category, severity } = req.query;

    const events = await getCalendarEvents(tenantId, {
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      category: typeof category === 'string' ? category : undefined,
      severity: typeof severity === 'string' ? severity : undefined,
    });

    res.json({ events, count: events.length });
  }));

  // GET /api/calendar/alerts — upcoming + overdue items (dashboard widget)
  router.get('/alerts', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const days = parseInt(req.query.days as string) || 30;

    const alerts = await getUpcomingAlerts(tenantId, Math.min(days, 365));

    const critical = alerts.filter(a => a.severity === 'critical');
    const warning = alerts.filter(a => a.severity === 'warning');
    const overdue = alerts.filter(a => a.daysUntil < 0);

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: critical.length,
        warning: warning.length,
        overdue: overdue.length,
      },
    });
  }));

  return router;
}
