'use client';

import React from 'react';
import { classNames } from '../lib/utils';

// ── Page Shell ────────────────────────────────────────

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={classNames(
        'rounded-xl border border-edge-subtle bg-bg-secondary transition-colors hover:border-edge',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  accent,
  compact,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'success' | 'warning' | 'danger' | 'default';
  compact?: boolean;
  onClick?: () => void;
}) {
  const accentColors = {
    success: 'border-l-semantic-success',
    warning: 'border-l-semantic-warning',
    danger: 'border-l-semantic-danger',
    default: 'border-l-accent-400',
  };
  return (
    <div
      className={classNames(
        'rounded-xl border border-edge-subtle bg-bg-secondary border-l-[3px] transition-all',
        compact ? 'px-4 py-3' : 'p-6',
        accentColors[accent || 'default'],
        onClick && 'cursor-pointer hover:border-edge hover:-translate-y-px'
      )}
      onClick={onClick}
    >
      <p className={classNames(
        'font-medium uppercase tracking-wide text-ink-tertiary',
        compact ? 'text-[10px]' : 'text-xs'
      )}>{label}</p>
      <p className={classNames(
        'font-semibold tabular-nums text-ink font-mono',
        compact ? 'text-lg' : 'mt-1 text-2xl'
      )}>{value}</p>
      {sub && <p className={classNames(
        'text-ink-secondary',
        compact ? 'text-[10px] leading-tight' : 'mt-1 text-xs'
      )}>{sub}</p>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────

export function StatCard({
  label,
  value,
  change,
  changeType,
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}) {
  const changeColors = {
    positive: 'text-semantic-success',
    negative: 'text-semantic-danger',
    neutral: 'text-ink-tertiary',
  };
  return (
    <div className="rounded-xl border border-edge-subtle bg-bg-secondary p-4 transition-colors hover:border-edge">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink font-mono">{value}</p>
      {change && (
        <p className={classNames('mt-1 text-xs font-medium font-mono', changeColors[changeType || 'neutral'])}>
          {change}
        </p>
      )}
    </div>
  );
}

// ── Button ────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const variants = {
    primary: 'bg-accent-500 text-white hover:bg-accent-400 focus:ring-accent-400/30 rounded-lg',
    secondary:
      'bg-transparent text-ink-secondary border border-edge hover:text-ink hover:border-edge-strong focus:ring-accent-400/30 rounded-lg',
    danger: 'bg-red-500/100/100/10 text-red-400 hover:bg-red-500/100/100/100/100/20 focus:ring-red-500/30 rounded-lg',
    ghost: 'text-ink-secondary hover:text-ink hover:bg-bg-tertiary focus:ring-accent-400/30 rounded-lg',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={classNames(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        className={classNames(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 bg-bg-primary text-ink placeholder:text-ink-muted',
          error
            ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/30'
            : 'border-edge focus:border-accent-400 focus:ring-accent-400/30'
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-semantic-danger">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, error, id, ...props }: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={selectId} className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">
        {label}
      </label>
      <select
        id={selectId}
        className={classNames(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 bg-bg-primary text-ink',
          error
            ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/30'
            : 'border-edge focus:border-accent-400 focus:ring-accent-400/30'
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-semantic-danger">{error}</p>}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={checkboxId}
        className="h-4 w-4 rounded border-edge bg-bg-primary text-accent-500 focus:ring-accent-400/30"
        {...props}
      />
      <label htmlFor={checkboxId} className="text-sm text-ink">{label}</label>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────

export function Badge({
  children,
  variant = 'gray',
}: {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}) {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    red: 'bg-red-500/100/100/10 text-red-400 ring-1 ring-red-500/20',
    yellow: 'bg-amber-500/100/100/10 text-amber-400 ring-1 ring-amber-500/20',
    blue: 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20',
    gray: 'bg-bg-secondary/5 text-ink-secondary ring-1 ring-white/10',
  };
  return (
    <span className={classNames(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono',
      colors[variant]
    )}>
      {children}
    </span>
  );
}

// ── Status Dot ────────────────────────────────────────

export function StatusDot({
  status,
  label,
}: {
  status: 'active' | 'eligible' | 'approved' | 'allocated' | 'applied' | 'ineligible' | 'rejected' | 'warning' | 'expired' | 'inactive';
  label?: string;
}) {
  const greenStatuses = new Set(['active', 'eligible', 'approved', 'allocated']);
  const amberStatuses = new Set(['applied', 'warning']);

  let dotColor = 'bg-red-400';
  if (greenStatuses.has(status)) dotColor = 'bg-emerald-400';
  else if (amberStatuses.has(status)) dotColor = 'bg-amber-400';
  else if (status === 'inactive') dotColor = 'bg-ink-muted';

  return (
    <span className="flex items-center gap-1.5">
      <span className={classNames('h-2 w-2 rounded-full', dotColor)} />
      {label && <span className="text-sm text-ink">{label}</span>}
    </span>
  );
}

// ── Risk Flag Card ────────────────────────────────────

export function RiskFlagCard({
  severity,
  category,
  message,
}: {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
}) {
  const styles = {
    high: 'border-l-red-400 bg-red-500/100/100/5',
    medium: 'border-l-amber-400 bg-amber-500/100/100/5',
    low: 'border-l-emerald-400 bg-emerald-500/5',
  };
  const badgeVariant = {
    high: 'red' as const,
    medium: 'yellow' as const,
    low: 'green' as const,
  };
  return (
    <div className={classNames('rounded-lg border border-edge-subtle border-l-[3px] p-4', styles[severity])}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={badgeVariant[severity]}>{severity.toUpperCase()}</Badge>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{category}</span>
      </div>
      <p className="text-sm text-ink">{message}</p>
    </div>
  );
}

// ── Utilization Bar ───────────────────────────────────

export function UtilizationBar({
  allocated,
  total,
  className,
}: {
  allocated: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0;
  return (
    <div className={classNames('flex items-center gap-3', className)}>
      <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-ink-secondary font-mono">{pct}%</span>
    </div>
  );
}

// ── Section Header ────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-ink-secondary">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center animate-fade-in">
      {icon && <div className="mb-3 flex justify-center text-ink-tertiary">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Skeleton Loader ───────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={classNames('skeleton rounded-lg', className)} />;
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex gap-4 px-4 py-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-edge-subtle">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-edge-subtle bg-bg-secondary p-6">
          <Skeleton className="h-5 w-48 mb-3" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Loading / Error States ────────────────────────────

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge-subtle border-t-accent-400" />
    </div>
  );
}

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/100/100/5 p-4 animate-fade-in">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-red-400 underline hover:text-red-300">
          Try again
        </button>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] animate-fade-in">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-edge-subtle bg-bg-secondary p-6 shadow-2xl shadow-black/20 border-t-accent-400/20">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────

export function Alert({
  variant,
  title,
  children,
}: {
  variant: 'success' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    error: 'border-red-500/20 bg-red-500/100/100/5 text-red-400',
    info: 'border-accent-500/20 bg-accent-500/5 text-accent-400',
  };
  return (
    <div className={classNames('rounded-xl border p-3', styles[variant])}>
      {title && <p className="mb-0.5 text-sm font-medium">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
