'use client';

import React, { useState, useEffect } from 'react';
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
  SkeletonCards,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatDate } from '../../lib/utils';
import { LEGAL_FORMS, DOMICILES, FRAMEWORKS, SFDR_CLASSIFICATIONS, STATUSES } from '../../lib/constants';
import type { ApiError, FundStructure, CreateFundStructureRequest, LegalForm, RegulatoryFramework, SfdrClassification, FundStatus } from '../../lib/types';
import { CsvUploadWizard } from '../../components/csv-upload-wizard';
import { useI18n } from '../../lib/i18n';

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  closing: 'yellow',
  closed: 'gray',
  liquidating: 'red',
};

interface FundChecklist {
  assetsConfigured: boolean;
  criteriaConfigured: boolean;
  investorsOnboarded: boolean;
  noCriticalFlags: boolean;
  // Compliance score data
  totalInvestors: number;
  expiredKyc: number;
  expiringKyc: number;
  highFlags: number;
  mediumFlags: number;
}

function ComplianceScore({ checklist }: { checklist: FundChecklist }) {
  // Synthesize a verdict from checklist data
  const hasHighFlags = checklist.highFlags > 0;
  const hasExpiredKyc = checklist.expiredKyc > 0;
  const hasExpiringKyc = checklist.expiringKyc > 0;
  const isSetupComplete = checklist.assetsConfigured && checklist.criteriaConfigured;

  let status: 'compliant' | 'warning' | 'critical' | 'setup';
  let label: string;
  let detail: string;

  if (!isSetupComplete) {
    status = 'setup';
    label = 'Setup Required';
    detail = 'Complete fund configuration';
  } else if (hasHighFlags || hasExpiredKyc) {
    status = 'critical';
    const issues: string[] = [];
    if (hasExpiredKyc) issues.push(`${checklist.expiredKyc} expired KYC`);
    if (hasHighFlags) issues.push(`${checklist.highFlags} critical flag${checklist.highFlags !== 1 ? 's' : ''}`);
    label = 'Action Required';
    detail = issues.join(' · ');
  } else if (hasExpiringKyc || checklist.mediumFlags > 0) {
    status = 'warning';
    const issues: string[] = [];
    if (hasExpiringKyc) issues.push(`${checklist.expiringKyc} KYC expiring`);
    if (checklist.mediumFlags > 0) issues.push(`${checklist.mediumFlags} flag${checklist.mediumFlags !== 1 ? 's' : ''}`);
    label = 'Review Needed';
    detail = issues.join(' · ');
  } else {
    status = 'compliant';
    label = 'Compliant';
    detail = checklist.totalInvestors > 0 ? `${checklist.totalInvestors} investors verified` : 'All checks passing';
  }

  const styles = {
    compliant: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 ring-amber-500/20',
    critical: 'bg-red-500/10 text-red-600 ring-red-500/20',
    setup: 'bg-bg-tertiary text-ink-tertiary ring-edge',
  };

  const dots = {
    compliant: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    setup: 'bg-ink-muted',
  };

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ${styles[status]}`}>
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dots[status]}`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] opacity-70">{detail}</p>
      </div>
    </div>
  );
}

export default function FundsPage() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editFund, setEditFund] = useState<FundStructure | null>(null);
  const [deleteFund, setDeleteFund] = useState<FundStructure | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [checklists, setChecklists] = useState<Record<string, FundChecklist>>({});

  const funds = useAsync(() => api.getFundStructures());

  useEffect(() => {
    const loadChecklists = async () => {
      if (!funds.data || funds.data.length === 0) {
        setChecklists({});
        return;
      }

      const results = await Promise.allSettled(
        funds.data.map(async (fund) => {
          const report = await api.getComplianceReport(fund.id);
          const checklist: FundChecklist = {
            assetsConfigured: report.fund.assets.length > 0,
            criteriaConfigured: report.eligibility_criteria.length > 0,
            investorsOnboarded: report.fund.total_investors > 0,
            noCriticalFlags: !report.risk_flags.some((flag) => flag.severity === 'high'),
            totalInvestors: report.fund.total_investors,
            expiredKyc: report.investor_breakdown.by_kyc_status.find(s => s.status === 'expired')?.count ?? 0,
            expiringKyc: report.investor_breakdown.kyc_expiring_within_90_days.length,
            highFlags: report.risk_flags.filter(f => f.severity === 'high').length,
            mediumFlags: report.risk_flags.filter(f => f.severity === 'medium').length,
          };
          return { fundId: fund.id, checklist };
        })
      );

      const next: Record<string, FundChecklist> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          next[result.value.fundId] = result.value.checklist;
        }
      }
      setChecklists(next);
    };

    loadChecklists().catch(() => setChecklists({}));
  }, [funds.data]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const legal_form = form.get('legal_form') as LegalForm;
    const domicile = form.get('domicile') as string;
    const regulatory_framework = form.get('regulatory_framework') as RegulatoryFramework;
    const sfdr_classification = form.get('sfdr_classification') as SfdrClassification;
    const aifm_name = form.get('aifm_name') as string;

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Fund name is required.';
    if (!legal_form) errors.legal_form = 'Legal form is required.';
    if (!domicile) errors.domicile = 'Domicile is required.';
    if (!regulatory_framework) errors.regulatory_framework = 'Regulatory framework is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await api.createFundStructure({
        name,
        legal_form,
        domicile,
        regulatory_framework,
        sfdr_classification: sfdr_classification || undefined,
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
    const data: Partial<CreateFundStructureRequest> & { aifm_name?: string } = {};
    const name = form.get('name') as string;
    const legal_form = form.get('legal_form') as LegalForm;
    const domicile = form.get('domicile') as string;
    const regulatory_framework = form.get('regulatory_framework') as RegulatoryFramework;
    const sfdr_classification = form.get('sfdr_classification') as SfdrClassification;
    const status = form.get('status') as FundStatus;
    const aifm_name = form.get('aifm_name') as string;

    if (name) data.name = name;
    if (legal_form) data.legal_form = legal_form;
    if (domicile) data.domicile = domicile;
    if (regulatory_framework) data.regulatory_framework = regulatory_framework;
    if (sfdr_classification) (data as Record<string, unknown>).sfdr_classification = sfdr_classification;
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
        title={t('funds.title')}
        description={t('funds.description')}
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              onExportCSV={() => {
                if (!funds.data) return;
                exportCSV('caelith-funds.csv',
                  ['Name', 'Legal Form', 'Domicile', 'Framework', 'Status', 'Created'],
                  funds.data.map(f => [
                    f.name, f.legal_form, f.domicile,
                    f.regulatory_framework || '', f.status,
                    f.created_at
                  ])
                );
              }}
            />
            <Button variant="secondary" onClick={() => setShowCsvImport(true)}>{t('funds.importCsv')}</Button>
            <Button onClick={() => setShowForm(true)}>+ {t('funds.addFund')}</Button>
          </div>
        }
      />

      {actionMsg && (
        <div className="mb-4">
          <Alert variant={actionMsg.type === 'success' ? 'success' : 'error'}>{actionMsg.text}</Alert>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null); setFieldErrors({}); }} title={t('funds.createFundStructure')}>
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label={t('funds.form.fundName')} name="name" placeholder={t('funds.form.fundNamePlaceholder')} error={fieldErrors.name} />
          <Select label={t('funds.form.legalForm')} name="legal_form" options={LEGAL_FORMS} error={fieldErrors.legal_form} />
          <Select label={t('funds.form.domicile')} name="domicile" options={DOMICILES} error={fieldErrors.domicile} />
          <Select label={t('funds.form.regulatoryFramework')} name="regulatory_framework" options={FRAMEWORKS} error={fieldErrors.regulatory_framework} />
          <Select label="SFDR Classification" name="sfdr_classification" options={SFDR_CLASSIFICATIONS} />
          <Input label={t('funds.form.aifmName')} name="aifm_name" placeholder={t('funds.form.aifmPlaceholder')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.create')}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editFund !== null} onClose={() => { setEditFund(null); setFormError(null); }} title={t('funds.editFundStructure')}>
        {editFund && (
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <Input label={t('funds.form.fundName')} name="name" defaultValue={editFund.name} required />
            <Select label={t('funds.form.legalForm')} name="legal_form" options={LEGAL_FORMS} defaultValue={editFund.legal_form} required />
            <Select label={t('funds.form.domicile')} name="domicile" options={DOMICILES} defaultValue={editFund.domicile} required />
            <Select label={t('funds.form.regulatoryFramework')} name="regulatory_framework" options={FRAMEWORKS} defaultValue={editFund.regulatory_framework} required />
            <Select label="SFDR Classification" name="sfdr_classification" options={SFDR_CLASSIFICATIONS} defaultValue={editFund.sfdr_classification} />
            <Select label={t('investors.col.status')} name="status" options={STATUSES} defaultValue={editFund.status} required />
            <Input label={t('funds.form.aifmName')} name="aifm_name" defaultValue={editFund.aifm_name || ''} placeholder={t('funds.form.aifmPlaceholder')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditFund(null)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={actionLoading}>{actionLoading ? t('common.saving') : t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteFund !== null} onClose={() => { setDeleteFund(null); setFormError(null); }} title={t('funds.deleteFundStructure')}>
        {deleteFund && (
          <div className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <p className="text-sm text-ink-secondary">
              {t('funds.deleteConfirmation')} <span className="font-semibold text-ink">{deleteFund.name}</span>. {t('funds.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteFund(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" disabled={actionLoading} onClick={handleDelete}>
                {actionLoading ? t('common.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={showCsvImport} onClose={() => setShowCsvImport(false)} title={t('funds.importTitle')} size="lg">
        <CsvUploadWizard
          entityType="fund_structures"
          onComplete={() => { setShowCsvImport(false); funds.refetch(); }}
          onCancel={() => setShowCsvImport(false)}
        />
      </Modal>

      {funds.loading ? (
        <SkeletonCards count={4} />
      ) : funds.error ? (
        <ErrorMessage message={funds.error} onRetry={funds.refetch} />
      ) : funds.data && funds.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {funds.data.map((fund) => (
            <Card key={fund.id} className="transition-colors hover:border-edge">
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
                    {fund.sfdr_classification && fund.sfdr_classification !== 'not_classified' && (
                      <Badge variant={fund.sfdr_classification === 'article_9' ? 'green' : fund.sfdr_classification === 'article_8' ? 'yellow' : 'gray'}>
                        SFDR {fund.sfdr_classification.replace('article_', 'Art. ')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditFund(fund)}
                    className="rounded-md p-1.5 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors"
                    title={t('common.edit')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteFund(fund)}
                    className="rounded-md p-1.5 text-ink-tertiary hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title={t('common.delete')}
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

              {checklists[fund.id] && (
                <div className="mt-3 mb-3">
                  <ComplianceScore checklist={checklists[fund.id]} />
                </div>
              )}

              {checklists[fund.id] && (
                <div className="rounded-lg border border-edge-subtle bg-bg-tertiary p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">{t('funds.setupChecklist')}</p>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { label: t('funds.assetConfigured'), done: checklists[fund.id].assetsConfigured },
                      { label: t('funds.criteriaConfigured'), done: checklists[fund.id].criteriaConfigured },
                      { label: t('funds.investorOnboarded'), done: checklists[fund.id].investorsOnboarded },
                      { label: t('funds.noCriticalFlags'), done: checklists[fund.id].noCriticalFlags },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">{item.label}</span>
                        <span className={item.done ? 'text-emerald-600' : 'text-amber-700'}>
                          {item.done ? t('funds.ready') : t('funds.pendingSetup')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-edge-subtle">
                <p className="text-xs text-ink-tertiary">
                  {t('funds.created')} {formatDate(fund.created_at)}
                </p>
                <Link
                  href={`/funds/${fund.id}`}
                  className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
                >
                  {t('funds.viewReport')} &rarr;
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('funds.noFunds')}
          description={t('funds.noFundsDesc')}
          action={<Button onClick={() => setShowForm(true)}>+ {t('funds.addFund')}</Button>}
        />
      )}
    </div>
  );
}
