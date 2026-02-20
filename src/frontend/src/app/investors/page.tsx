'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useFormAction } from '../../lib/use-form-action';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
  SortableHeader,
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatDate, classNames } from '../../lib/utils';
import { JURISDICTIONS } from '../../lib/constants';
import type { Investor, InvestorType, KycStatus } from '../../lib/types';
import { BackLink } from '../../components/back-link';
import { CsvUploadWizard } from '../../components/csv-upload-wizard';
import { useI18n } from '../../lib/i18n';
import { useAutoDismiss } from '../../lib/use-auto-dismiss';
import { Pagination, usePagination } from '../../components/pagination';

function daysUntilExpiry(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days, label: `${Math.abs(days)}d overdue`, urgency: 'expired' as const };
  if (days <= 30) return { days, label: `${days}d`, urgency: 'critical' as const };
  if (days <= 90) return { days, label: `${days}d`, urgency: 'warning' as const };
  return { days, label: `${days}d`, urgency: 'ok' as const };
}

function useInvestorTypeOptions() {
  const { t } = useI18n();
  return [
    { value: 'institutional' as InvestorType, label: t('investors.type.institutional') },
    { value: 'professional' as InvestorType, label: t('investors.type.professional') },
    { value: 'semi_professional' as InvestorType, label: t('investors.type.semiProfessional') },
    { value: 'well_informed' as InvestorType, label: t('investors.type.wellInformed') },
    { value: 'retail' as InvestorType, label: t('investors.type.retail') },
  ];
}

function useKycStatusOptions() {
  const { t } = useI18n();
  return [
    { value: 'pending' as KycStatus, label: t('investors.pending') },
    { value: 'verified' as KycStatus, label: t('investors.verified') },
    { value: 'expired' as KycStatus, label: t('investors.expired') },
    { value: 'rejected' as KycStatus, label: t('investors.rejected') },
  ];
}

const INVESTOR_SORT_KEYS = new Set<keyof Investor>([
  'name',
  'jurisdiction',
  'investor_type',
  'kyc_status',
  'created_at',
]);

type InvestorSortDirection = 'asc' | 'desc' | null;
type InvestorSortState = { key: keyof Investor | null; direction: InvestorSortDirection };

function parseSort(searchParams: URLSearchParams): InvestorSortState {
  const key = searchParams.get('sort');
  const direction = searchParams.get('dir');
  const parsedKey = key && INVESTOR_SORT_KEYS.has(key as keyof Investor) ? (key as keyof Investor) : null;
  const parsedDirection = direction === 'asc' || direction === 'desc' ? direction : null;
  return {
    key: parsedKey && parsedDirection ? parsedKey : null,
    direction: parsedKey && parsedDirection ? parsedDirection : null,
  };
}

function InvestorsContent() {
  const router = useRouter();
  const { t } = useI18n();
  const INVESTOR_TYPE_OPTIONS = useInvestorTypeOptions();
  const KYC_STATUS_OPTIONS = useKycStatusOptions();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type');
  const kycFilter = searchParams.get('kyc');

  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const formAction = useFormAction();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  useAutoDismiss(successMsg, setSuccessMsg);
  const [sort, setSort] = useState<InvestorSortState>(() => parseSort(searchParams));

  // Local filters (stack on top of URL-based filters)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJurisdiction, setFilterJurisdiction] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterKyc, setFilterKyc] = useState('');
  const hasLocalFilters = searchQuery || filterJurisdiction || filterType || filterKyc;
  const clearLocalFilters = () => { setSearchQuery(''); setFilterJurisdiction(''); setFilterType(''); setFilterKyc(''); };

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

  useEffect(() => {
    setSort(parseSort(searchParams));
  }, [searchParams]);

  const toggle = (key: keyof Investor) => {
    setSort((prev) => {
      const next: InvestorSortState =
        prev.key !== key
          ? { key, direction: 'asc' }
          : prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : { key: null, direction: null };

      const params = new URLSearchParams(searchParams.toString());
      if (next.key && next.direction) {
        params.set('sort', String(next.key));
        params.set('dir', next.direction);
      } else {
        params.delete('sort');
        params.delete('dir');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
      return next;
    });
  };

  // Apply local filters on top of URL-based filteredInvestors
  const locallyFiltered = useMemo(() => {
    let result = filteredInvestors;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv => inv.name.toLowerCase().includes(q));
    }
    if (filterJurisdiction) {
      result = result.filter(inv => inv.jurisdiction === filterJurisdiction);
    }
    if (filterType) {
      result = result.filter(inv => inv.investor_type === filterType);
    }
    if (filterKyc) {
      result = result.filter(inv => inv.kyc_status === filterKyc);
    }
    return result;
  }, [filteredInvestors, searchQuery, filterJurisdiction, filterType, filterKyc]);

  const sortedInvestors = useMemo(() => {
    const key = sort.key;
    if (!key || !sort.direction) return locallyFiltered;
    return [...locallyFiltered].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(String(bVal))
        : Number(aVal) - Number(bVal);
      return sort.direction === 'desc' ? -cmp : cmp;
    });
  }, [locallyFiltered, sort]);

  const { page, setPage, paginated: paginatedInvestors, total: paginatedTotal, perPage } = usePagination(sortedInvestors, 20);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('type');
    params.delete('kyc');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
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
    const email = (form.get('email') as string) || undefined;
    const jurisdiction = form.get('jurisdiction') as string;
    const investor_type = form.get('investor_type') as InvestorType;
    const kyc_status = form.get('kyc_status') as KycStatus;
    const kyc_expiry_value = (form.get('kyc_expiry') as string) || '';
    const status = form.get('status') as string;
    const accredited = status === 'accredited';
    const kyc_expiry = kyc_expiry_value ? new Date(kyc_expiry_value).toISOString() : undefined;
    if (!name || !jurisdiction) { formAction.setError('Name and jurisdiction are required.'); return; }
    const ok = await formAction.execute(
      () => api.createInvestor({ name, email, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry }),
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
    const email = (form.get('email') as string) || undefined;
    const jurisdiction = form.get('jurisdiction') as string;
    const investor_type = form.get('investor_type') as InvestorType;
    const kyc_status = form.get('kyc_status') as KycStatus;
    const kyc_expiry_value = (form.get('kyc_expiry') as string) || '';
    const status = form.get('status') as string;
    const accredited = status === 'accredited';
    const kyc_expiry = kyc_expiry_value ? new Date(kyc_expiry_value).toISOString() : undefined;
    const ok = await formAction.execute(
      () => api.updateInvestor(editInvestor.id, { name, email, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry }),
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
        title={t('investors.title')}
        description={t('investors.description')}
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              onExportCSV={() => {
                if (!investors.data) return;
                exportCSV('caelith-investors.csv',
                  ['Name', 'Jurisdiction', 'Type', 'KYC Status', 'Accredited', 'Created'],
                  investors.data.map(inv => [
                    inv.name, inv.jurisdiction, inv.investor_type,
                    inv.kyc_status, inv.accredited ? 'Yes' : 'No',
                    inv.created_at
                  ])
                );
              }}
            />
            <Button variant="secondary" onClick={() => setShowCsvImport(true)}>{t('investors.importCsv')}</Button>
            <Button onClick={() => setShowForm(true)}>+ {t('investors.addInvestor')}</Button>
          </div>
        }
      />

      {activeFilter && (
        <div className="mb-4">
          <BackLink href="/" label={t('investors.backToDashboard')} />
        </div>
      )}

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-ink-tertiary">{t('investors.filteredBy')}:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-700 ring-1 ring-accent-500/20">
            {activeFilter}
            <button onClick={clearFilters} className="ml-0.5 text-accent-600 hover:text-accent-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span className="text-xs text-ink-tertiary">
            {filteredInvestors.length} {t('investors.of')} {investors.data?.length ?? 0} {t('investors.investors')}
          </span>
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <Input
              label={t('investors.search')}
              placeholder={t('investors.searchPlaceholder')}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-[160px]">
            <Select
              label={t('investors.col.jurisdiction')}
              value={filterJurisdiction}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterJurisdiction(e.target.value)}
              options={[{ value: '', label: t('investors.all') }, ...JURISDICTIONS]}
            />
          </div>
          <div className="w-[180px]">
            <Select
              label={t('investors.investorType')}
              value={filterType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
              options={[{ value: '', label: t('investors.all') }, ...INVESTOR_TYPE_OPTIONS]}
            />
          </div>
          <div className="w-[140px]">
            <Select
              label={t('investors.kycStatus')}
              value={filterKyc}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterKyc(e.target.value)}
              options={[{ value: '', label: t('investors.all') }, ...KYC_STATUS_OPTIONS]}
            />
          </div>
          {hasLocalFilters && (
            <Button variant="secondary" size="sm" onClick={clearLocalFilters}>{t('common.clear')}</Button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-tertiary">
          {t('investors.showing')} {sortedInvestors.length} {t('investors.of')} {investors.data?.length ?? 0} {t('investors.investors')}
        </p>
      </Card>

      <div className="h-4" />

      <Modal open={showForm} onClose={() => { setShowForm(false); formAction.setError(null); }} title={t('investors.newInvestor')}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formAction.error && <Alert variant="error">{formAction.error}</Alert>}
          <Input label={t('form.name')} name="name" required placeholder={t('form.namePlaceholder')} />
          <Input label={t('form.email')} name="email" type="email" placeholder={t('form.emailPlaceholder')} />
          <Select label={t('investors.col.jurisdiction')} name="jurisdiction" options={JURISDICTIONS} required />
          <Select label={t('investors.investorType')} name="investor_type" options={INVESTOR_TYPE_OPTIONS} defaultValue="professional" required />
          <Select label={t('investors.kycStatus')} name="kyc_status" options={KYC_STATUS_OPTIONS} defaultValue="pending" required />
          <Input label={t('investors.col.kycExpiry')} name="kyc_expiry" type="date" />
          <Select
            label={t('investors.col.status')}
            name="status"
            options={[
              { value: 'accredited', label: t('investors.accredited') },
              { value: 'non_accredited', label: t('investors.nonAccredited') },
            ]}
            defaultValue="accredited"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={formAction.loading}>{formAction.loading ? '...' : t('common.create')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editInvestor !== null} onClose={() => { setEditInvestor(null); formAction.setError(null); }} title={t('investors.editInvestor')}>
        {editInvestor && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {formAction.error && <Alert variant="error">{formAction.error}</Alert>}
            <Input label={t('form.name')} name="name" required defaultValue={editInvestor.name} />
            <Input label={t('form.email')} name="email" type="email" defaultValue={editInvestor.email || ''} />
            <Select label={t('investors.col.jurisdiction')} name="jurisdiction" options={JURISDICTIONS} defaultValue={editInvestor.jurisdiction} required />
            <Select label={t('investors.investorType')} name="investor_type" options={INVESTOR_TYPE_OPTIONS} defaultValue={editInvestor.investor_type} required />
            <Select label={t('investors.kycStatus')} name="kyc_status" options={KYC_STATUS_OPTIONS} defaultValue={editInvestor.kyc_status} required />
            <Input label={t('investors.col.kycExpiry')} name="kyc_expiry" type="date" defaultValue={editInvestor.kyc_expiry ? editInvestor.kyc_expiry.substring(0, 10) : ''} />
            <Select
              label={t('investors.col.status')}
              name="status"
              options={[
                { value: 'accredited', label: t('investors.accredited') },
                { value: 'non_accredited', label: t('investors.nonAccredited') },
              ]}
              defaultValue={editInvestor.accredited ? 'accredited' : 'non_accredited'}
              required
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditInvestor(null)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={formAction.loading}>{formAction.loading ? '...' : t('common.update')}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={showCsvImport} onClose={() => setShowCsvImport(false)} title={t('investors.importTitle')} size="lg">
        <CsvUploadWizard
          entityType="investors"
          onComplete={() => { setShowCsvImport(false); investors.refetch(); }}
          onCancel={() => setShowCsvImport(false)}
        />
      </Modal>

      {investors.loading ? (
        <SkeletonTable rows={8} />
      ) : investors.error ? (
        <ErrorMessage message={investors.error} onRetry={investors.refetch} />
      ) : filteredInvestors.length > 0 ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead className="border-b border-edge">
              <tr>
                <SortableHeader<Investor> label={t('investors.col.name')} sortKey="name" sort={sort} onToggle={toggle} />
                <SortableHeader<Investor> label={t('investors.col.jurisdiction')} sortKey="jurisdiction" sort={sort} onToggle={toggle} />
                <SortableHeader<Investor> label={t('investors.col.type')} sortKey="investor_type" sort={sort} onToggle={toggle} />
                <SortableHeader<Investor> label={t('investors.col.kyc')} sortKey="kyc_status" sort={sort} onToggle={toggle} />
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('investors.col.kycExpiry')}</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('investors.col.daysLeft')}</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('investors.col.status')}</th>
                <SortableHeader<Investor> label={t('investors.col.created')} sortKey="created_at" sort={sort} onToggle={toggle} />
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">{t('investors.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {paginatedInvestors.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-bg-tertiary">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/investors/${inv.id}`} className="text-ink hover:text-brand-accent transition-colors">
                      {inv.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{inv.jurisdiction}</td>
                  <td className="px-5 py-3">
                    <Badge variant={
                      inv.investor_type === 'institutional' ? 'blue' :
                      inv.investor_type === 'professional' ? 'green' :
                      inv.investor_type === 'semi_professional' ? 'yellow' :
                      'gray'
                    }>{inv.investor_type.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={inv.kyc_status === 'verified' ? 'green' : inv.kyc_status === 'expired' ? 'red' : 'yellow'}>
                      {inv.kyc_status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-ink-secondary">
                    {inv.kyc_expiry ? formatDate(inv.kyc_expiry) : '-'}
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const expiry = daysUntilExpiry(inv.kyc_expiry);
                      if (!expiry) return <span className="text-xs text-ink-tertiary">-</span>;
                      const colors = {
                        expired: 'text-[var(--danger)] bg-[var(--danger-bg)]',
                        critical: 'text-[var(--danger)] bg-[var(--danger-bg)]',
                        warning: 'text-[var(--warning)] bg-[var(--warning-bg)]',
                        ok: 'text-[var(--success)] bg-[var(--success-bg)]',
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
                      {inv.accredited ? t('investors.accredited') : t('investors.nonAccredited')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-secondary">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditInvestor(inv)}>{t('common.edit')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-4">
            <Pagination total={paginatedTotal} page={page} perPage={perPage} onPageChange={setPage} />
          </div>
        </Card>
      ) : investors.data && investors.data.length > 0 && activeFilter ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">{t('investors.noMatchFilter')}</p>
            <p className="mt-1 text-sm text-ink-secondary">{t('investors.clearFilterHint')}</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={clearFilters}>{t('common.clear')}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          title={t('investors.noInvestors')}
          description={t('investors.noInvestorsDesc')}
          action={<Button onClick={() => setShowForm(true)}>+ {t('investors.addInvestor')}</Button>}
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

