import { Router, Request, Response } from 'express';
import {
  createFundStructure,
  findFundStructureById,
  findAllFundStructures,
  updateFundStructure,
} from '../repositories/fund-structure-repository.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, legal_form, domicile, regulatory_framework } = req.body;
    if (!name || !legal_form || !domicile || !regulatory_framework) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'name, legal_form, domicile, and regulatory_framework are required',
      });
    }
    const fund = await createFundStructure(req.body);
    return res.status(201).json(fund);
  } catch (err: any) {
    console.error('Create fund structure error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const funds = await findAllFundStructures();
    return res.json(funds);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await findFundStructureById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Not Found' });
    return res.json(fund);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await updateFundStructure(req.params.id, req.body);
    if (!fund) return res.status(404).json({ error: 'Not Found' });
    return res.json(fund);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default router;
