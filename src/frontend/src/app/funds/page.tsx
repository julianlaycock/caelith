'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import type { ApiError } from '../../lib/types';

const LEGAL_FORMS = [
  { value: '', label: 'Select...' },
  { value: 'SICAV', label: 'SICAV' },
  { value: 'SIF', label: 'SIF' },
  { value: 'RAIF', label: 'RAIF' },
  { value: 'SCSp', label: 'SCSp' },
  { value: 'SCA', label: 'SCA' },
  { value: 'ELTIF', label: 'ELTIF' },
  { value: 'Spezial_AIF', label: 'Spezial-AIF' },
  { value: 'Publikums_AIF', label: 'Publikums-AIF' },
  { value: 'QIAIF', label: 'QIAIF' },
  { value: 'RIAIF', label: 'RIAIF' },
  { value: 'LP', label: 'LP' },
  { value: 'other', label: 'Other' },
];

const DOMICILES = [
  { value: '', label: 'Select...' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'IE', label: 'Ireland' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'SG', label: 'Singapore' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'NL', label: 'Netherlands' },
];

const FRAMEWORKS = [
  { value: '', label: 'Select...' },
  { value: 'AIFMD', label: 'AIFMD' },
  { value: 'UCITS', label: 'UCITS' },
  { value: 'ELTIF', label: 'ELTIF' },
  { value: 'national', label: 'National' },
];

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  closing: 'yellow',
  closed: 'gray',
  liquidating: 'red',
};

export default function FundsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const funds = useAsync(() => api.getFundStructures());

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const legal_form = form.get('legal_form') as string;
    const domicile = form.get('domicile') as string;
    const regulatory_framework = form.get('regulatory_framework') as string;
    const aifm_name = form.get('aifm_name') as string;

    if (!name || !legal_form || !domicile || !regulatory_framework) {
      setFormError('Name, legal form, domicile, and regulatory framework are required.');
      return;
    }

    try {
      await api.createFundStructure({
        name,
        legal_form,
        domicile,
        regulatory_framework,
        aifm_name: aifm_name || undefined,
      });
      setFormSuccess(true);
      setShowForm(false);
      funds.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to create fund structure');
    }
  };

  return (
    <div>
      <PageHeader
        title="Fund Structures"
        description="Manage fund structures and view compliance reports"
        action={
          <Button onClick={() => setShowForm(true)}>+ New Fund</Button>
        }
      />

      {formSuccess && (
        <div className="mb-4">
          <Alert variant="success">Fund structure created successfully.</Alert>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Create Fund Structure"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label="Fund Name" name="name" required placeholder="e.g., European Growth Fund I" />
          <Select label="Legal Form" name="legal_form" options={LEGAL_FORMS} required />
          <Select label="Domicile" name="domicile" options={DOMICILES} required />
          <Select label="Regulatory Framework" name="regulatory_framework" options={FRAMEWORKS} required />
          <Input label="AIFM Name" name="aifm_name" placeholder="Optional — managing entity name" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {funds.loading ? (
        <LoadingSpinner />
      ) : funds.error ? (
        <ErrorMessage message={funds.error} onRetry={funds.refetch} />
      ) : funds.data && funds.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {funds.data.map((fund) => (
            <Card key={fund.id} className="transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{fund.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="gray">{fund.legal_form}</Badge>
                    <Badge variant="gray">{fund.domicile}</Badge>
                    {fund.regulatory_framework && (
                      <Badge variant="green">{fund.regulatory_framework}</Badge>
                    )}
                    <Badge variant={STATUS_COLORS[fund.status] || 'gray'}>{fund.status}</Badge>
                  </div>
                </div>
              </div>

              {fund.aifm_name && (
                <p className="mb-2 text-xs text-ink-secondary">
                  <span className="font-medium text-ink-tertiary">AIFM:</span> {fund.aifm_name}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-edge-subtle">
                <p className="text-xs text-ink-tertiary">
                  Created {formatDate(fund.created_at)}
                </p>
                <Link
                  href={`/funds/${fund.id}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  View Compliance Report &rarr;
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No fund structures yet"
          description="Create your first fund structure to get started with compliance reporting."
          action={<Button onClick={() => setShowForm(true)}>+ New Fund</Button>}
        />
      )}
    </div>
  );
}
