/**
 * Onboarding Routes — Slice 5
 *
 * POST   /api/onboarding                     — Apply (investor submits application)
 * POST   /api/onboarding/:id/check-eligibility — Run automated eligibility check
 * POST   /api/onboarding/:id/review          — Approve/reject (compliance officer)
 * POST   /api/onboarding/:id/allocate        — Allocate units (after approval)
 * GET    /api/onboarding/:id                  — Get onboarding record
 * GET    /api/onboarding?asset_id=X           — List by asset
 * GET    /api/onboarding?investor_id=X        — List by investor
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=onboarding-routes.d.ts.map