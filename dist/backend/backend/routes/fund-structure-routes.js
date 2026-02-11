import { Router } from 'express';
import { createFundStructure, findFundStructureById, findAllFundStructures, updateFundStructure, } from '../repositories/fund-structure-repository.js';
const router = Router();
router.post('/', async (req, res) => {
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Create fund structure error:', err);
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
router.get('/', async (_req, res) => {
    try {
        const funds = await findAllFundStructures();
        return res.json(funds);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const fund = await findFundStructureById(req.params.id);
        if (!fund)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.json(fund);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
router.patch('/:id', async (req, res) => {
    try {
        const fund = await updateFundStructure(req.params.id, req.body);
        if (!fund)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.json(fund);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
export default router;
//# sourceMappingURL=fund-structure-routes.js.map