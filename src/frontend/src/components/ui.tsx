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
    <div className="mb-6 flex items-end justify-between">
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
        'rounded-xl border border-edge bg-white shadow-sm',
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
    success: 'border-l-brand-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    default: 'border-l-brand-500',
  };
  return (
    <div
      className={classNames(
        'rounded-xl border border-edge bg-white shadow-sm border-l-[3px]',
        compact ? 'px-4 py-3' : 'p-6',
        accentColors[accent || 'default'],
        onClick && 'cursor-pointer transition-shadow hover:shadow-md'
      )}
      onClick={onClick}
    >
      <p className={classNames(
        'font-medium uppercase tracking-wide text-ink-tertiary',
        compact ? 'text-[10px]' : 'text-xs'
      )}>{label}</p>
      <p className={classNames(
        'font-semibold tabular-nums text-ink',
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
    positive: 'text-brand-600',
    negative: 'text-red-600',
    neutral: 'text-ink-tertiary',
  };
  return (
    <div className="rounded-xl border border-edge bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {change && (
        <p className={classNames('mt-1 text-xs font-medium', changeColors[changeType || 'neutral'])}>
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
    'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#000042] text-white hover:bg-[#000033] focus:ring-[#000042] shadow-sm rounded-lg',
    secondary:
      'bg-white text-ink border border-edge hover:bg-surface-subtle focus:ring-[#000042] rounded-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm rounded-lg',
    ghost: 'text-ink-secondary hover:text-ink hover:bg-surface-subtle focus:ring-[#000042] rounded-lg',
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
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-edge focus:border-[#000042] focus:ring-[#000042] bg-white'
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-edge focus:border-[#000042] focus:ring-[#000042] bg-white'
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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
        className="h-4 w-4 rounded border-edge text-[#000042] focus:ring-[#000042]"
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
    green: 'bg-brand-100 text-brand-700 ring-1 ring-brand-600/20',
    red: 'bg-red-100 text-red-700 ring-1 ring-red-600/20',
    yellow: 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20',
    blue: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20',
    gray: 'bg-surface-subtle text-ink-secondary ring-1 ring-edge/50',
  };
  return (
    <span className={classNames(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
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
  // red: ineligible, rejected, expired
  // gray: inactive

  let dotColor = 'bg-red-500';
  if (greenStatuses.has(status)) dotColor = 'bg-brand-500';
  else if (amberStatuses.has(status)) dotColor = 'bg-amber-500';
  else if (status === 'inactive') dotColor = 'bg-edge-strong';

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
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-brand-400 bg-brand-50',
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
      <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-ink-secondary">{pct}%</span>
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
    <div className="py-10 text-center">
      {icon && <div className="mb-3 flex justify-center text-ink-tertiary">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Loading / Error States ────────────────────────────

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge border-t-brand-500" />
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800">
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-edge bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-tertiary hover:bg-surface-subtle hover:text-ink transition-colors">
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
    success: 'border-brand-200 bg-brand-50 text-brand-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={classNames('rounded-xl border p-3', styles[variant])}>
      {title && <p className="mb-0.5 text-sm font-medium">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
