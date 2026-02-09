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
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
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
        'rounded-lg border border-slate-200 bg-white shadow-sm',
        padding && 'p-5',
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
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'success' | 'warning' | 'danger' | 'default';
}) {
  const accentColors = {
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    default: 'border-l-blue-600',
  };
  return (
    <div className={classNames(
      'rounded-lg border border-slate-200 bg-white p-5 shadow-sm border-l-[3px]',
      accentColors[accent || 'default']
    )}>
      <p className="metric-label">{label}</p>
      <p className="metric-value mt-1">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
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
    'inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-800 text-white hover:bg-blue-900 focus:ring-blue-700 shadow-sm',
    secondary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-400',
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
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        className={classNames(
          'block w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
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
      <label htmlFor={selectId} className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <select
        id={selectId}
        className={classNames(
          'block w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
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
        className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-700"
        {...props}
      />
      <label htmlFor={checkboxId} className="text-sm text-slate-700">{label}</label>
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
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
    yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    gray: 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/10',
  };
  return (
    <span className={classNames(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      colors[variant]
    )}>
      {children}
    </span>
  );
}

// ── Status Dot ────────────────────────────────────────

export function StatusDot({ status }: { status: 'active' | 'inactive' | 'warning' }) {
  const colors = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-300',
    warning: 'bg-amber-500',
  };
  return (
    <span className={classNames('inline-block h-2 w-2 rounded-full', colors[status])} />
  );
}

// ── Loading / Error / Empty States ────────────────────

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-800" />
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
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
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
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
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={classNames('rounded-lg border p-3', styles[variant])}>
      {title && <p className="mb-0.5 text-sm font-medium">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}