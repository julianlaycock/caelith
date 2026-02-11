import { Router } from 'express';
import { findDecisionRecordById, findDecisionsByAsset, findDecisionsBySubject, } from '../repositories/decision-record-repository.js';
const router = Router();
router.get('/asset/:assetId', async (req, res) => {
    try {
        const records = await findDecisionsByAsset(req.params.assetId);
        return res.json(records);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
router.get('/investor/:investorId', async (req, res) => {
    try {
        const records = await findDecisionsBySubject(req.params.investorId);
        return res.json(records);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const record = await findDecisionRecordById(req.params.id);
        if (!record)
            return res.status(404).json({ error: 'NOT_FOUND', message: `Decision record not found: ${req.params.id}` });
        return res.json(record);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
export default router;
//# sourceMappingURL=decision-record-routes.js.map