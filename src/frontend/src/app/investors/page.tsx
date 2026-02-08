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
  { value: 'JP', label: 'Japan (JP)' },
  { value: 'SG', label: 'Singapore (SG)' },
  { value: 'HK', label: 'Hong Kong (HK)' },
  { value: 'CH', label: 'Switzerland (CH)' },
  { value: 'AU', label: 'Australia (AU)' },
  { value: 'KR', label: 'South Korea (KR)' },
  { value: 'BR', label: 'Brazil (BR)' },
  { value: 'IN', label: 'India (IN)' },
  { value: 'CN', label: 'China (CN)' },
  { value: 'RU', label: 'Russia (RU)' },
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
      await api.updateInvestor(editInvestor.id, {
        name,
        jurisdiction,
        accredited,
      });
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
        action={
          <Button onClick={() => setShowForm(true)}>+ Add Investor</Button>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError(null);
        }}
        title="Add Investor"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label="Name" name="name" required placeholder="e.g., Jane Smith" />
          <Select
            label="Jurisdiction"
            name="jurisdiction"
            options={JURISDICTIONS}
            required
          />
          <Checkbox label="Accredited Investor" name="accredited" />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editInvestor !== null}
        onClose={() => {
          setEditInvestor(null);
          setFormError(null);
        }}
        title="Edit Investor"
      >
        {editInvestor && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <Input
              label="Name"
              name="name"
              required
              defaultValue={editInvestor.name}
            />
            <Select
              label="Jurisdiction"
              name="jurisdiction"
              options={JURISDICTIONS}
              defaultValue={editInvestor.jurisdiction}
              required
            />
            <Checkbox
              label="Accredited Investor"
              name="accredited"
              defaultChecked={editInvestor.accredited}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditInvestor(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Investor Table */}
      {investors.loading ? (
        <LoadingSpinner />
      ) : investors.error ? (
        <ErrorMessage message={investors.error} onRetry={investors.refetch} />
      ) : investors.data && investors.data.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Jurisdiction</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {investors.data.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {inv.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {inv.jurisdiction}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={inv.accredited ? 'green' : 'yellow'}>
                      {inv.accredited ? 'Accredited' : 'Non-Accredited'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditInvestor(inv)}
                    >
                      Edit
                    </Button>
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
          action={
            <Button onClick={() => setShowForm(true)}>+ Add Investor</Button>
          }
        />
      )}
    </div>
  );
}