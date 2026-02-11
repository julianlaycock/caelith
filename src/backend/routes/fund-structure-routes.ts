import { Router, Request, Response } from 'express';
import {
  createFundStructure,
  findFundStructureById,
  findAllFundStructures,
  updateFundStructure,
} from '../repositories/fund-structure-repository.js';
import { query, execute } from '../db.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, legal_form, domicile, regulatory_framework } = req.body;
    if (!name || !legal_form || !domicile || !regulatory_framework) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'name, legal_form, domicile, and regulatory_framework are required',
      });
    }
    const fund = await createFundStructure(req.body);
    return res.status(201).json(fund);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Create fund structure error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const funds = await findAllFundStructures();
    return res.json(funds);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await findFundStructureById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'NOT_FOUND', message: `Fund structure not found: ${req.params.id}` });
    return res.json(fund);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await updateFundStructure(req.params.id, req.body);
    if (!fund) return res.status(404).json({ error: 'NOT_FOUND', message: `Fund structure not found: ${req.params.id}` });
    return res.json(fund);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Check for linked assets
    const assets = await query<{ count: number }>('SELECT COUNT(*)::int as count FROM assets WHERE fund_structure_id = $1', [req.params.id]);
    if (assets.length > 0 && assets[0].count > 0) {
      return res.status(422).json({
        error: 'DEPENDENCY_ERROR',
        message: `Cannot delete: this fund structure has ${assets[0].count} linked asset(s). Remove or reassign them first.`,
      });
    }

    // Delete eligibility criteria (configuration, not audit data)
    await execute('DELETE FROM eligibility_criteria WHERE fund_structure_id = ?', [req.params.id]);

    // Delete the fund structure
    const result = await query<{ id: string }>('DELETE FROM fund_structures WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Fund structure not found: ${req.params.id}` });
    }

    return res.json({ deleted: true, id: result[0].id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

export default router;
