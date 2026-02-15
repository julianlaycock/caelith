import { describe, expect, it } from 'vitest';
import { isResetEndpointEnabled, shouldBootstrapAdmin } from './security-config.js';

describe('security config guards', () => {
  it('enables reset endpoint only in test mode with explicit flag', () => {
    expect(isResetEndpointEnabled('test', '1')).toBe(true);
    expect(isResetEndpointEnabled('test', '0')).toBe(false);
    expect(isResetEndpointEnabled('development', '1')).toBe(false);
    expect(isResetEndpointEnabled('production', '1')).toBe(false);
  });

  it('fails admin bootstrap in production without password', () => {
    expect(shouldBootstrapAdmin(undefined, 'production')).toEqual({ allowed: false, fatal: true });
  });

  it('skips admin bootstrap in non-production without password', () => {
    expect(shouldBootstrapAdmin(undefined, 'development')).toEqual({ allowed: false, fatal: false });
    expect(shouldBootstrapAdmin('', 'test')).toEqual({ allowed: false, fatal: false });
  });

  it('allows admin bootstrap when password exists', () => {
    expect(shouldBootstrapAdmin('secure-password', 'production')).toEqual({ allowed: true, fatal: false });
  });
});
