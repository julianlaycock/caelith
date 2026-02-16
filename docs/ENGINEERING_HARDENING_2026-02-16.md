# Engineering Hardening Assessment (2026-02-16)

## Scope
- Runtime safety
- Developer workflow reliability
- Test orchestration correctness
- Core transfer-path performance and determinism
- High-signal code quality issues in backend core paths

## Snapshot Findings
- TypeScript compilation is clean (`npx tsc --noEmit`).
- E2E stability depends on running backend with `NODE_ENV=test` and `ENABLE_TEST_RESET=1`.
- Prior test runner script was stale against current Vitest config and produced false negatives.
- Transfer validation had duplicate rule-name checks (`minimum_investment`) with ambiguous ordering.
- Local frontend startup could collide with backend when port `3000` was occupied (frontend auto-shifted to `3001`).
- Backend core had avoidable slop: `any` in compliance/transfer models and several unused imports/vars.

## Recommendation List (Executed)

1. Fix test orchestration to match current config and environment requirements.
- Why: Prevent false failures and reduce debugging waste.
- Execution:
  - Replaced `scripts/run-tests.ps1` with a reliable flow:
    - clear backend port
    - start backend in test-reset mode
    - health-check gate
    - run unit+validator tests
    - run full e2e suite
    - deterministic cleanup
  - Updated reset error guidance in `tests/fixtures/api-helper.ts` to use `ENABLE_TEST_RESET=1`.

2. Harden local dev startup and prevent backend/frontend port collisions.
- Why: Ensure predictable local execution and avoid hidden startup races.
- Execution:
  - `package.json`
    - `predev:frontend` now frees port `3000` before launch.
    - `dev:frontend` now pins Next.js to `--port 3000`.

3. Optimize transfer validation hot path and enforce stronger correctness.
- Why: Remove redundant DB reads and make validation output deterministic and auditable.
- Execution:
  - `src/backend/services/transfer-service.ts`
    - Reused `context.asset` instead of refetching asset in simulate/execute.
    - Enforced explicit `Asset` existence in validation context construction.
    - Added typed JSON parsing for fund context (`lmt_types`), removed `any`.
    - Preserved `0` leverage values correctly (`!= null` checks).
    - Kept deterministic de-duplication by rule name (failure-first semantics).
  - `src/rules-engine/types.ts`
    - Added `asset` to `ValidationContext`.
    - Replaced `FundContext.lmt_types: any[]` with typed `LiquidityManagementTool[]`.

4. Remove high-signal backend slop and strengthen typing in core compliance paths.
- Why: Improve maintainability and reduce hidden runtime risks.
- Execution:
  - Removed explicit `any` from:
    - `src/backend/services/eligibility-check-helper.ts`
    - `src/backend/repositories/fund-structure-repository.ts`
    - `src/backend/services/annex-iv-service.ts`
  - Removed unused imports/vars in core backend files:
    - repositories (`asset`, `decision-record`, `eligibility-criteria`, `event`, `investor`, `rules`)
    - `src/backend/services/scenario-service.ts`
    - `src/backend/server.ts`
    - `src/backend/db-context.test.ts`
    - `tests/unit/repositories.test.ts`
  - Added explicit namespace-rule scoping in `src/backend/middleware/auth.ts` for Express request augmentation.
  - Cleaned `any`-based e2e error handling in:
    - `tests/e2e/compliance-report.test.ts`
    - `tests/e2e/eligibility.test.ts`
    - `tests/e2e/onboarding.test.ts`
    - `tests/e2e/transfer-eligibility.test.ts`

5. Add a single-command quality gate.
- Why: Standardize high-confidence validation before shipping.
- Execution:
  - Added `quality:check` script in `package.json`:
    - sync check
    - type-check
    - full test runner script

## Residual Backlog (Not Executed in This Pass)
- Full lint cleanup across frontend/experimental scripts (large pre-existing warning/error surface).
- Optional: split lint profiles (runtime-critical vs scripts/experiments) to keep strict gates where highest ROI.
- Optional: replace remaining regex-control and misc lint issues in non-critical services.
