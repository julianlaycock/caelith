/**
 * EU Jurisdiction Rule Templates
 *
 * Pre-built compliance rule templates for EU regulatory frameworks.
 */
declare const router: import("express-serve-static-core").Router;
export interface RuleTemplate {
    id: string;
    name: string;
    description: string;
    framework: string;
    jurisdiction: string[];
    rules: {
        qualification_required: boolean;
        lockup_days: number;
        jurisdiction_whitelist: string[];
    };
    composite_rules: Array<{
        name: string;
        description: string;
        operator: 'AND' | 'OR' | 'NOT';
        conditions: Array<{
            field: string;
            operator: string;
            value: unknown;
        }>;
    }>;
}
export default router;
//# sourceMappingURL=template-routes.d.ts.map