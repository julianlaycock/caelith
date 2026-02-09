'use client';

import React, { useState } from 'react';
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
  { value: 'KR', label: 'South Korea (KR)' },
  { value: 'BR', label: 'Brazil (BR)' },
  { value: 'IN', label: 'India (IN)' },
  { value: 'CN', label: 'China (CN)' },
];

export default function InvestorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const investors = useAsync(() => api.getInvestors());

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const jurisdiction = form.get('jurisdiction') as string;
    const accredited = form.get('accredited') === 'on';

    if (!name || !jurisdiction) {
      setFormError('Name and jurisdiction are required.');
      return;
    }

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
      ) : investors.data && investors.data.length > 0 ? (
        <Card padding={false}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Jurisdiction</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investors.data.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{inv.name}</td>
                  <td className="px-5 py-3 text-slate-600">{inv.jurisdiction}</td>
                  <td className="px-5 py-3">
                    <Badge variant={inv.accredited ? 'green' : 'yellow'}>
                      {inv.accredited ? 'Accredited' : 'Non-Accredited'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditInvestor(inv)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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