import { EligibilityCheckRequest, EligibilityCheckResult } from '../models/index.js';
/**
 * Check whether an investor is eligible to invest in a fund.
 * Writes a decision record for every check (approved or rejected).
 *
 * Checks performed:
 *   1. Investor exists and is active
 *   2. Fund structure exists and is active
 *   3. KYC status is verified (if fund requires it)
 *   4. Investor type is permitted for this fund structure
 *   5. Minimum investment threshold met (if applicable)
 *   6. Suitability assessment completed (if required)
 */
export declare function checkEligibility(request: EligibilityCheckRequest): Promise<EligibilityCheckResult>;
//# sourceMappingURL=eligibility-service.d.ts.map