'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Checkbox,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import type { Investor, ApiError } from '../../lib/types';

const JURISDICTIONS = [
  { value: '', label: 'Select jurisdiction...' },
  { value: 'US', label: 'United States (US)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'CA', label: 'Canada (CA)' },
  { value: 'DE', label: 'Germany (DE)' },
  { value: 'FR', label: 'France (FR)' },
  { value: 'ES', label: 'Spain (ES)' },
  { value: 'IT', label: 'Italy (IT)' },
  { value: 'NL', label: 'Netherlands (NL)' },
  { value: 'IE', label: 'Ireland (IE)' },
  { value: 'LU', label: 'Luxembourg (LU)' },
  { value: 'JP', label: 'Japan (JP)' },
  { value: 'SG', label: 'Singapore (SG)' },
  { value: 'HK', label: 'Hong Kong (HK)' },
  { value: 'CH', label: 'Switzerland (CH)' },
  { value: 'AU', label: 'Australia (AU)' },
  { value: 'NO', label: 'Norway (NO)' },
];

function InvestorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type');
  const kycFilter = searchParams.get('kyc');

  const [showForm, setShowForm] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const jurisdiction = form.get('jurisdiction') as string;
    const accredited = form.get('accredited') === 'on';
    if (!name || !jurisdiction) { setFormError('Name and jurisdiction are required.'); return; }
    try {
      await api.createInvestor({ name, jurisdiction, accredited });
      setShowForm(false);
      setSuccessMsg('Investor created successfully.');
      investors.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to create investor');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editInvestor) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const jurisdiction = form.get('jurisdiction') as string;
    const accredited = form.get('accredited') === 'on';
    try {
      await api.updateInvestor(editInvestor.id, { name, jurisdiction, accredited });
      setEditInvestor(null);
      setSuccessMsg('Investor updated successfully.');
      investors.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to update investor');
    }
  };

  return (
    <div>
      <PageHeader
        title="Investors"
        description="Manage investor registry"
        action={<Button onClick={() => setShowForm(true)}>+ Add Investor</Button>}
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-ink-tertiary">Filtered by:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-600/20">
            {activeFilter}
            <button onClick={clearFilters} className="ml-0.5 text-brand-500 hover:text-brand-700">
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null); }} title="Add Investor">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label="Name" name="name" required placeholder="e.g., Jane Smith" />
          <Select label="Jurisdiction" name="jurisdiction" options={JURISDICTIONS} required />
          <Checkbox label="Accredited Investor" name="accredited" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editInvestor !== null} onClose={() => { setEditInvestor(null); setFormError(null); }} title="Edit Investor">
        {editInvestor && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
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
        <LoadingSpinner />
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
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Created</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {filteredInvestors.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-surface-subtle">
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
    <Suspense fallback={<LoadingSpinner />}>
      <InvestorsContent />
    </Suspense>
  );
}
