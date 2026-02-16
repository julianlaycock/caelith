import { describe, expect, it } from 'vitest';

/**
 * Multi-tenant context tests — DEFERRED
 *
 * These tests target `resolveTenantId` and `runWithDbRequestContext` which are
 * planned for the multi-tenancy milestone (post-pilot). The functions are not
 * yet exported from db.ts.
 *
 * Re-enable when multi-tenant isolation is implemented (see PRD: "Explicitly Out of Scope").
 */
describe('DB tenant context', () => {
  it.skip('falls back to default tenant when context is not enforced', () => {
    // Requires: resolveTenantId export from db.ts
  });

  it.skip('fails closed when tenant context is enforced but missing', () => {
    // Requires: runWithDbRequestContext export from db.ts
  });

  it.skip('uses request tenant when context is set', () => {
    // Requires: runWithDbRequestContext export from db.ts
  });
});
