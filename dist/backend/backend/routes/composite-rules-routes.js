/**
 * Composite Rules Routes
 *
 * CRUD for custom composite rules per asset
 */
import express from 'express';
import { createCompositeRule, listCompositeRules, updateCompositeRule, deleteCompositeRule, } from '../services/composite-rules-service.js';
const router = express.Router();
/**
 * POST /composite-rules
 */
router.post('/', async (req, res) => {
    try {
        const { asset_id, name, description, operator, conditions, enabled } = req.body;
        if (!asset_id || !name || !operator || !conditions) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Missing required fields: asset_id, name, operator, conditions',
            });
            return;
        }
        if (!['AND', 'OR', 'NOT'].includes(operator)) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Operator must be AND, OR, or NOT',
            });
            return;
        }
        if (!Array.isArray(conditions) || conditions.length === 0) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Conditions must be a non-empty array',
            });
            return;
        }
        const rule = await createCompositeRule(asset_id, { name, description: description || '', operator, conditions, enabled }, req.user?.userId);
        res.status(201).json(rule);
    }
    catch (error) {
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /composite-rules?assetId=X
 */
router.get('/', async (req, res) => {
    try {
        const { assetId } = req.query;
        if (!assetId) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Required query parameter: assetId',
            });
            return;
        }
        const rules = await listCompositeRules(assetId);
        res.json(rules);
    }
    catch (error) {
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * PATCH /composite-rules/:id
 */
router.patch('/:id', async (req, res) => {
    try {
        const { name, description, operator, conditions, enabled } = req.body;
        await updateCompositeRule(req.params.id, {
            name,
            description,
            operator,
            conditions,
            enabled,
        });
        res.json({ status: 'updated' });
    }
    catch (error) {
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * DELETE /composite-rules/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        await deleteCompositeRule(req.params.id);
        res.json({ status: 'deleted' });
    }
    catch (error) {
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
//# sourceMappingURL=composite-rules-routes.js.map