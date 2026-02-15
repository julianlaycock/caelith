export function isResetEndpointEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  enableTestReset: string | undefined = process.env.ENABLE_TEST_RESET
): boolean {
  return nodeEnv === 'test' && enableTestReset === '1';
}

export function shouldBootstrapAdmin(
  adminPassword: string | undefined = process.env.ADMIN_PASSWORD,
  nodeEnv: string | undefined = process.env.NODE_ENV
): { allowed: boolean; fatal: boolean } {
  if (adminPassword && adminPassword.trim()) {
    return { allowed: true, fatal: false };
  }

  if (nodeEnv === 'production') {
    return { allowed: false, fatal: true };
  }

  return { allowed: false, fatal: false };
}
