'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useFormAction } from '../../lib/use-form-action';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Checkbox,
  Modal,
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
} from '../../components/ui';
import { formatDate, classNames } from '../../lib/utils';
import { JURISDICTIONS } from '../../lib/constants';
import type { Investor } from '../../lib/types';

function daysUntilExpiry(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days, label: `${Math.abs(days)}d overdue`, urgency: 'expired' as const };
  if (days <= 30) return { days, label: `${days}d`, urgency: 'critical' as const };
  if (days <= 90) return { days, label: `${days}d`, urgency: 'warning' as const };
  return { days, label: `${days}d`, urgency: 'ok' as const };
}

function InvestorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type');
  const kycFilter = searchParams.get('kyc');

  const [showForm, setShowForm] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const formAction = useFormAction();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const investors = useAsync(() => api.getInvestors());

  const filteredInvestors = useMemo(() => {
    if (!investors.data) return [];
    let filtered = investors.data;

    if (typeFilter) {
      const normalizedType = typeFilter.toLowerCase().replace(/\s+/g, '_');
      filtered = filtered.filter(inv => inv.investor_type === normalizedType);
    }

    if (kycFilter) {
      const now = new Date();
      const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      if (kycFilter === 'verified') {
        filtered = filtered.filter(inv =>
          inv.kyc_status === 'verified' && (!inv.kyc_expiry || new Date(inv.kyc_expiry) > in90Days)
        );
      } else if (kycFilter === 'expiring' || kycFilter === 'expiring_soon') {
        filtered = filtered.filter(inv =>
          inv.kyc_status === 'verified' && inv.kyc_expiry && new Date(inv.kyc_expiry) <= in90Days && new Date(inv.kyc_expiry) > now
        );
      } else if (kycFilter === 'expired') {
        filtered = filtered.filter(inv => inv.kyc_status === 'expired');
      } else if (kycFilter === 'pending') {
        filtered = filtered.filter(inv => inv.kyc_status === 'pending');
      }
    }

    return filtered;
  }, [investors.data, typeFilter, kycFilter]);

  const clearFilters = () => {
    router.push('/investors');
  };

  const activeFilter = typeFilter
    ? `Type: ${typeFilter.replace(/_/g, ' ')}`
    : kycFilter
    ? `KYC: ${kycFilter.replace(/_/g, ' ')}`
    : null;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const jurisdiction = form.get('jurisdiction') as string;
    const accredited = form.get('accredited') === 'on';
    if (!name || !jurisdiction) { formAction.setError('Name and jurisdiction are required.'); return; }
    const ok = await formAction.execute(
      () => api.createInvestor({ name, jurisdiction, accredited }),
      'Failed to create investor',
    );
    if (ok) {
      setShowForm(false);
      setSuccessMsg('Investor created successfully.');
      investors.refetch();
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editInvestor) return;
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const jurisdiction = form.get('jurisdiction') as string;
    const accredited = form.get('accredited') === 'on';
    const ok = await formAction.execute(
      () => api.updateInvestor(editInvestor.id, { name, jurisdiction, accredited }),
      'Failed to update investor',
    );
    if (ok) {
      setEditInvestor(null);
      setSuccessMsg('Investor updated successfully.');
      investors.refetch();
    }
  };

  return (
    <div>
      <PageHeader
        title="Investors"
        description="Manage investor registry"
        action={<Button onClick={() => setShowForm(true)}>+ Add Investor</Button>}
      />

      {activeFilter && (
        <button
          onClick={() => router.push('/')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </button>
      )}

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-ink-tertiary">Filtered by:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-300 ring-1 ring-accent-500/20">
            {activeFilter}
            <button onClick={clearFilters} className="ml-0.5 text-accent-400 hover:text-accent-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span className="text-xs text-ink-tertiary">
            {filteredInvestors.length} of {investors.data?.length ?? 0} investors
          </span>
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); formAction.setError(null); }} title="Add Investor">
        <form onSubmit={handleCreate} className="space-y-4">
          {formAction.error && <Alert variant="error">{formAction.error}</Alert>}
          <Input label="Name" name="name" required placeholder="e.g., Jane Smith" />
          <Select label="Jurisdiction" name="jurisdiction" options={JURISDICTIONS} required />
          <Checkbox label="Accredited Investor" name="accredited" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editInvestor !== null} onClose={() => { setEditInvestor(null); formAction.setError(null); }} title="Edit Investor">
        {editInvestor && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {formAction.error && <Alert variant="error">{formAction.error}</Alert>}
            <Input label="Name" name="name" required defaultValue={editInvestor.name} />
            <Select label="Jurisdiction" name="jurisdiction" options={JURISDICTIONS} defaultValue={editInvestor.jurisdiction} required />
            <Checkbox label="Accredited Investor" name="accredited" defaultChecked={editInvestor.accredited} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditInvestor(null)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>

      {investors.loading ? (
        <SkeletonTable rows={8} />
      ) : investors.error ? (
        <ErrorMessage message={investors.error} onRetry={investors.refetch} />
      ) : filteredInvestors.length > 0 ? (
        <Card padding={false}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Jurisdiction</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Type</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">KYC</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">KYC Expiry</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Days Left</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Created</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {filteredInvestors.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-bg-tertiary">
                  <td className="px-5 py-3 font-medium text-ink">{inv.name}</td>
                  <td className="px-5 py-3 text-ink-secondary">{inv.jurisdiction}</td>
                  <td className="px-5 py-3">
                    <Badge variant="gray">{inv.investor_type.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={inv.kyc_status === 'verified' ? 'green' : inv.kyc_status === 'expired' ? 'red' : 'yellow'}>
                      {inv.kyc_status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-ink-secondary">
                    {inv.kyc_expiry ? formatDate(inv.kyc_expiry) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const expiry = daysUntilExpiry(inv.kyc_expiry);
                      if (!expiry) return <span className="text-xs text-ink-tertiary">—</span>;
                      const colors = {
                        expired: 'text-red-400 bg-red-500/10',
                        critical: 'text-red-400 bg-red-500/10',
                        warning: 'text-amber-400 bg-amber-500/10',
                        ok: 'text-accent-300 bg-accent-500/10',
                      };
                      return (
                        <span className={classNames('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', colors[expiry.urgency])}>
                          {expiry.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={inv.accredited ? 'green' : 'yellow'}>
                      {inv.accredited ? 'Accredited' : 'Non-Accredited'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditInvestor(inv)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : investors.data && investors.data.length > 0 && activeFilter ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">No investors match this filter</p>
            <p className="mt-1 text-sm text-ink-secondary">Try clearing the filter to see all investors.</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={clearFilters}>Clear Filter</Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No investors yet"
          description="Add your first investor to get started."
          action={<Button onClick={() => setShowForm(true)}>+ Add Investor</Button>}
        />
      )}
    </div>
  );
}

export default function InvestorsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} />}>
      <InvestorsContent />
    </Suspense>
  );
}
