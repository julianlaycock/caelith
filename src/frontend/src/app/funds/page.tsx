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
import type { ApiError, FundStructure } from '../../lib/types';

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

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' },
  { value: 'liquidating', label: 'Liquidating' },
];

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  closing: 'yellow',
  closed: 'gray',
  liquidating: 'red',
};

export default function FundsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editFund, setEditFund] = useState<FundStructure | null>(null);
  const [deleteFund, setDeleteFund] = useState<FundStructure | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const funds = useAsync(() => api.getFundStructures());

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

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
      setShowForm(false);
      setActionMsg({ type: 'success', text: 'Fund structure created successfully.' });
      funds.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to create fund structure');
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFund || actionLoading) return;
    setFormError(null);
    setActionLoading(true);

    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    const name = form.get('name') as string;
    const legal_form = form.get('legal_form') as string;
    const domicile = form.get('domicile') as string;
    const regulatory_framework = form.get('regulatory_framework') as string;
    const status = form.get('status') as string;
    const aifm_name = form.get('aifm_name') as string;

    if (name) data.name = name;
    if (legal_form) data.legal_form = legal_form;
    if (domicile) data.domicile = domicile;
    if (regulatory_framework) data.regulatory_framework = regulatory_framework;
    if (status) data.status = status;
    data.aifm_name = aifm_name || '';

    try {
      await api.updateFundStructure(editFund.id, data);
      setEditFund(null);
      setActionMsg({ type: 'success', text: 'Fund structure updated.' });
      funds.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to update fund structure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFund || actionLoading) return;
    setActionLoading(true);
    setFormError(null);

    try {
      await api.deleteFundStructure(deleteFund.id);
      setDeleteFund(null);
      setActionMsg({ type: 'success', text: 'Fund structure deleted.' });
      funds.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to delete fund structure');
    } finally {
      setActionLoading(false);
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

      {actionMsg && (
        <div className="mb-4">
          <Alert variant={actionMsg.type === 'success' ? 'success' : 'error'}>{actionMsg.text}</Alert>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null); }} title="Create Fund Structure">
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

      {/* Edit Modal */}
      <Modal open={editFund !== null} onClose={() => { setEditFund(null); setFormError(null); }} title="Edit Fund Structure">
        {editFund && (
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <Input label="Fund Name" name="name" defaultValue={editFund.name} required />
            <Select label="Legal Form" name="legal_form" options={LEGAL_FORMS} defaultValue={editFund.legal_form} required />
            <Select label="Domicile" name="domicile" options={DOMICILES} defaultValue={editFund.domicile} required />
            <Select label="Regulatory Framework" name="regulatory_framework" options={FRAMEWORKS} defaultValue={editFund.regulatory_framework} required />
            <Select label="Status" name="status" options={STATUSES} defaultValue={editFund.status} required />
            <Input label="AIFM Name" name="aifm_name" defaultValue={editFund.aifm_name || ''} placeholder="Optional" />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditFund(null)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteFund !== null} onClose={() => { setDeleteFund(null); setFormError(null); }} title="Delete Fund Structure">
        {deleteFund && (
          <div className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <p className="text-sm text-ink-secondary">
              Are you sure you want to delete <span className="font-semibold text-ink">{deleteFund.name}</span>? This action cannot be undone. Linked eligibility criteria will also be removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteFund(null)}>Cancel</Button>
              <Button variant="danger" disabled={actionLoading} onClick={handleDelete}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditFund(fund)}
                    className="rounded-md p-1.5 text-ink-tertiary hover:bg-surface-subtle hover:text-ink transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteFund(fund)}
                    className="rounded-md p-1.5 text-ink-tertiary hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
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
