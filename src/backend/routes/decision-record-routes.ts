import { Router, Request, Response } from 'express';
import {
  findDecisionRecordById,
  findDecisionsByAsset,
  findDecisionsBySubject,
} from '../repositories/decision-record-repository.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await findDecisionRecordById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not Found' });
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.get('/asset/:assetId', async (req: Request, res: Response) => {
  try {
    const records = await findDecisionsByAsset(req.params.assetId);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.get('/investor/:investorId', async (req: Request, res: Response) => {
  try {
    const records = await findDecisionsBySubject(req.params.investorId);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default router;
