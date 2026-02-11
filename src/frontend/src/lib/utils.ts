export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(n: number): string {
  if (n == null) return '0';
  return n.toLocaleString('en-US');
}

export function formatPercentage(n: number): string {
  if (n == null) return '0';
  return `${n.toFixed(2)}%`;
}

export function classNames(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** Extract a human-readable message from an unknown catch error. */
export function getErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as Record<string, unknown>).message) || fallback;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  institutional: 'Institutional',
  professional: 'Professional',
  semi_professional: 'Semi-Professional',
  well_informed: 'Well-Informed',
  retail: 'Retail',
};

export function formatInvestorType(type: string): string {
  return INVESTOR_TYPE_LABELS[type] || type;
}
