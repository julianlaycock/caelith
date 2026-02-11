/**
 * Natural Language Rules Routes — Slice 3
 */
import { Router } from 'express';
import { compileNaturalLanguageRule } from '../services/nl-rule-compiler.js';
const router = Router();
router.post('/from-natural-language', async (req, res) => {
    try {
        const { description, asset_id, context } = req.body;
        if (!description || typeof description !== 'string') {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Missing or invalid "description" (must be a non-empty string)',
            });
            return;
        }
        if (!asset_id || typeof asset_id !== 'string') {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Missing or invalid "asset_id" (must be a non-empty string)',
            });
            return;
        }
        if (!process.env.ANTHROPIC_API_KEY) {
            res.status(503).json({
                error: 'SERVICE_UNAVAILABLE',
                message: 'AI rule compiler is not configured. Set ANTHROPIC_API_KEY.',
            });
            return;
        }
        const request = { description, asset_id, context };
        const result = await compileNaturalLanguageRule(request);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('NL rule compilation error:', error);
        res.status(500).json({
            error: 'COMPILATION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error during rule compilation',
        });
    }
});
export default router;
//# sourceMappingURL=nl-rules-routes.js.map