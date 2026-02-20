'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { BackLink } from '../../../components/back-link';
import { DetailBreadcrumb } from '../../../components/breadcrumb';
import { useAsync } from '../../../lib/hooks';
import {
  Card,
  MetricCard,
  Badge,
  Button,
  Select,
  Modal,
  Alert,
  SectionHeader,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
} from '../../../components/ui';
import { formatNumber, formatDate, formatDateTime, classNames, titleCase } from '../../../lib/utils';
import type { Holding, Asset, DecisionRecord, OnboardingRecord, FundStructure, EligibilityResult, InvestorDocument } from '../../../lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function daysUntilExpiry(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days, label: `${Math.abs(days)}d overdue`, urgency: 'expired' as const };
  if (days <= 30) return { days, label: `${days}d`, urgency: 'critical' as const };
  if (days <= 90) return { days, label: `${days}d`, urgency: 'warning' as const };
  return { days, label: `${days}d`, urgency: 'ok' as const };
}

export default function InvestorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isValid = UUID_RE.test(id);

  const investor = useAsync(
    () => (isValid ? api.getInvestor(id) : Promise.reject(new Error('INVALID_ID'))),
    [id, isValid]
  );
  const holdings = useAsync(
    () => (isValid ? api.getHoldingsByInvestor(id) : Promise.resolve([] as Holding[])),
    [id, isValid]
  );
  const assets = useAsync(
    () => (isValid ? api.getAssets() : Promise.resolve([] as Asset[])),
    [id, isValid]
  );
  const fundStructures = useAsync(
    () => (isValid ? api.getFundStructures() : Promise.resolve([] as FundStructure[])),
    [id, isValid]
  );
  const decisions = useAsync(
    () => (isValid ? api.getDecisionsByInvestor(id) : Promise.resolve([] as DecisionRecord[])),
    [id, isValid]
  );
  const onboarding = useAsync(
    () => (isValid ? api.getOnboardingRecords({ investor_id: id }) : Promise.resolve([] as OnboardingRecord[])),
    [id, isValid]
  );

  // KYC Documents
  const documents = useAsync(
    () => (isValid ? api.getInvestorDocuments(id) : Promise.resolve([] as InvestorDocument[])),
    [id, isValid]
  );
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('passport');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [docMsg, setDocMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUploadDocument = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setDocMsg(null);
    try {
      await api.uploadInvestorDocument(id, uploadFile, uploadDocType, {
        expiry_date: uploadExpiry || undefined,
        notes: uploadNotes || undefined,
      });
      setDocMsg({ type: 'success', text: 'Document uploaded successfully.' });
      setShowUpload(false);
      setUploadFile(null);
      setUploadDocType('passport');
      setUploadExpiry('');
      setUploadNotes('');
      documents.refetch();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Upload failed';
      setDocMsg({ type: 'error', text: msg });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    try {
      await api.verifyInvestorDocument(docId);
      documents.refetch();
    } catch { /* silent */ }
  };

  const handleRejectDocument = async (docId: string) => {
    try {
      await api.rejectInvestorDocument(docId);
      documents.refetch();
    } catch { /* silent */ }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.deleteInvestorDocument(docId);
      documents.refetch();
    } catch { /* silent */ }
  };

  // Eligibility check state
  const [showEligibility, setShowEligibility] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const handleEligibilityCheck = async () => {
    if (!selectedFundId) return;
    setEligibilityLoading(true);
    setEligibilityError(null);
    setEligibilityResult(null);
    try {
      const result = await api.checkEligibility({
        investor_id: id,
        fund_structure_id: selectedFundId,
      });
      setEligibilityResult(result);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Eligibility check failed';
      setEligibilityError(msg);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const resetEligibility = () => {
    setShowEligibility(false);
    setSelectedFundId('');
    setEligibilityResult(null);
    setEligibilityError(null);
  };

  const backLink = (
    <div className="mb-6">
      <BackLink href="/investors" label="Back to Investors" />
    </div>
  );

  const notFound =
    !isValid ||
    (!!investor.error &&
      (investor.error.toLowerCase().includes('not found') || investor.error.includes('INVALID_ID')));

  if (notFound) {
    return (
      <div>
        {backLink}
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">Investor not found</p>
            <p className="mt-1 text-sm text-ink-secondary">
              The investor id <span className="font-mono">{id}</span> does not exist.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (investor.loading) {
    return (
      <div>
        {backLink}
        <LoadingSpinner />
      </div>
    );
  }

  if (investor.error) {
    return (
      <div>
        {backLink}
        <ErrorMessage message={investor.error} onRetry={investor.refetch} />
      </div>
    );
  }

  if (!investor.data) return null;

  const inv = investor.data;
  const expiry = daysUntilExpiry(inv.kyc_expiry);

  // Build asset lookup map
  const assetMap = new Map((assets.data ?? []).map(a => [a.id, a]));

  const kycVariant = inv.kyc_status === 'verified' ? 'green' : inv.kyc_status === 'expired' ? 'red' : 'yellow';
  const kycAccent = inv.kyc_status === 'verified' ? 'success' : inv.kyc_status === 'expired' ? 'danger' : 'warning';

  const expiryAccent = !expiry ? 'default'
    : expiry.urgency === 'ok' ? 'success'
    : expiry.urgency === 'warning' ? 'warning'
    : 'danger';

  return (
    <div>
      <DetailBreadcrumb items={[{ label: 'Investors', href: '/investors' }, { label: inv.name }]} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{inv.name}</h1>
          <Button onClick={() => setShowEligibility(true)}>Check Eligibility</Button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <Badge variant="gray">{inv.jurisdiction}</Badge>
          <Badge variant="gray">{inv.investor_type.replace(/_/g, ' ')}</Badge>
          <Badge variant={kycVariant}>{inv.kyc_status}</Badge>
          <Badge variant={inv.accredited ? 'green' : 'yellow'}>
            {inv.accredited ? 'Accredited' : 'Non-Accredited'}
          </Badge>
        </div>
        {(inv.email || inv.lei || inv.tax_id) && (
          <div className="mt-2 flex items-center gap-4 text-xs text-ink-tertiary">
            {inv.email && <span>{inv.email}</span>}
            {inv.lei && <span className="font-mono">LEI: {inv.lei}</span>}
            {inv.tax_id && <span className="font-mono">Tax ID: {inv.tax_id}</span>}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="KYC Status"
          value={inv.kyc_status}
          sub={inv.kyc_status === 'verified' ? 'Identity verified' : inv.kyc_status === 'expired' ? 'Renewal required' : 'Awaiting verification'}
          accent={kycAccent}
        />
        <MetricCard
          label="KYC Expiry"
          value={expiry ? expiry.label : '-'}
          sub={inv.kyc_expiry ? formatDate(inv.kyc_expiry) : '-'}
          accent={expiryAccent}
        />
        <MetricCard
          label="Holdings"
          value={holdings.data?.length ?? '-'}
          sub={holdings.loading ? 'Loading...' : `${holdings.data?.length ?? 0} position${(holdings.data?.length ?? 0) !== 1 ? 's' : ''}`}
          accent="default"
        />
        <MetricCard
          label="Accreditation"
          value={inv.accredited ? 'Yes' : 'No'}
          sub={inv.accredited ? 'Accredited investor' : 'Non-accredited'}
          accent={inv.accredited ? 'success' : 'warning'}
        />
      </div>

      {/* Eligibility Check Modal */}
      <Modal open={showEligibility} onClose={resetEligibility} title="Check Fund Eligibility">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Verify if <span className="font-medium text-ink">{inv.name}</span> ({inv.investor_type.replace(/_/g, ' ')}, {inv.jurisdiction}) is eligible to invest in a specific fund.
          </p>

          <Select
            label="Select Fund"
            value={selectedFundId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setSelectedFundId(e.target.value);
              setEligibilityResult(null);
              setEligibilityError(null);
            }}
            options={[
              { value: '', label: 'Choose a fund...' },
              ...(fundStructures.data ?? []).map(f => ({
                value: f.id,
                label: `${f.name} (${f.legal_form}, ${f.domicile})`,
              })),
            ]}
          />

          {!eligibilityResult && (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={resetEligibility}>Cancel</Button>
              <Button
                onClick={handleEligibilityCheck}
                disabled={!selectedFundId || eligibilityLoading}
              >
                {eligibilityLoading ? 'Checking...' : 'Run Check'}
              </Button>
            </div>
          )}

          {eligibilityError && (
            <Alert variant="error">{eligibilityError}</Alert>
          )}

          {eligibilityResult && (
            <div className="space-y-4">
              {/* Verdict */}
              <div className={classNames(
                'rounded-xl border p-4 text-center',
                eligibilityResult.eligible
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              )}>
                <p className={classNames(
                  'text-lg font-semibold',
                  eligibilityResult.eligible ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {eligibilityResult.eligible ? '✓ Eligible' : '✗ Not Eligible'}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {inv.investor_type.replace(/_/g, ' ')} investor → {eligibilityResult.fund_legal_form} fund
                </p>
              </div>

              {/* Per-rule checks */}
              {eligibilityResult.checks.length > 0 && (
                <div className="space-y-1.5">
                  {eligibilityResult.checks.map((check, i) => (
                    <div
                      key={i}
                      className={classNames(
                        'flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
                        check.passed
                          ? 'bg-emerald-500/5 border border-emerald-500/10'
                          : 'bg-red-500/5 border border-red-500/10'
                      )}
                    >
                      <span className="mt-0.5 flex-shrink-0">
                        {check.passed ? (
                          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0">
                        <span className={classNames('font-semibold', check.passed ? 'text-emerald-600' : 'text-red-500')}>
                          {check.rule.replace(/_/g, ' ')}
                        </span>
                        <span className="text-ink-secondary ml-1.5">{check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Criteria applied */}
              {eligibilityResult.criteria_applied && (
                <div className="rounded-lg border border-edge-subtle bg-bg-tertiary px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-2">Criteria Applied</p>
                  <div className="space-y-1 text-xs text-ink-secondary">
                    <p>Min. Investment: <span className="font-mono font-medium text-ink">€{(eligibilityResult.criteria_applied.minimum_investment / 100).toLocaleString()}</span></p>
                    {eligibilityResult.criteria_applied.suitability_required && (
                      <p>Suitability assessment: <span className="font-medium text-amber-600">Required</span></p>
                    )}
                    {eligibilityResult.criteria_applied.source_reference && (
                      <p className="mt-2 text-[11px] font-mono text-ink-muted">{eligibilityResult.criteria_applied.source_reference}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={resetEligibility}>Close</Button>
                <Button onClick={() => {
                  setEligibilityResult(null);
                  setSelectedFundId('');
                }}>Check Another Fund</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Holdings Table */}
      <div className="mb-6">
        <SectionHeader title="Holdings" description={holdings.data ? `${holdings.data.length} holding${holdings.data.length !== 1 ? 's' : ''}` : undefined} />
        {holdings.loading ? (
          <LoadingSpinner />
        ) : holdings.error ? (
          <ErrorMessage message={holdings.error} onRetry={holdings.refetch} />
        ) : holdings.data && holdings.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-edge">
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Fund</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Acquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {holdings.data.map((h) => {
                    const asset = assetMap.get(h.asset_id);
                    return (
                      <tr key={h.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          {asset?.name ?? <span className="font-mono text-ink-tertiary">{h.asset_id.substring(0, 8)}</span>}
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums font-mono text-ink-secondary">
                          {formatNumber(h.units)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {asset?.fund_structure_id ? (
                            <Link href={`/funds/${asset.fund_structure_id}`} className="text-accent-600 hover:text-accent-700">
                              View Fund
                            </Link>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {formatDate(h.acquired_at || h.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No holdings" description="This investor has no holdings yet." />
          </Card>
        )}
      </div>

      {/* Onboarding Status */}
      {onboarding.data && onboarding.data.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Onboarding Status" description={`${onboarding.data.length} record${onboarding.data.length !== 1 ? 's' : ''}`} />
            <Link href="/onboarding" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
              View all onboarding →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {onboarding.data.map((rec) => {
              const statusVariant =
                rec.status === 'approved' || rec.status === 'allocated' ? 'green'
                : rec.status === 'rejected' || rec.status === 'ineligible' ? 'red'
                : rec.status === 'applied' || rec.status === 'eligible' ? 'yellow'
                : 'gray';
              const asset = assetMap.get(rec.asset_id);
              return (
                <div key={rec.id} className="flex items-center gap-2 rounded-lg border border-edge-subtle bg-bg-secondary px-3 py-2">
                  <span className="text-xs font-medium text-ink">{asset?.name ?? rec.asset_id.substring(0, 8)}</span>
                  <Badge variant={statusVariant}>{rec.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision History */}
      <div className="mb-6">
        <SectionHeader title="Decision History" description={decisions.data ? `${decisions.data.length} decision${decisions.data.length !== 1 ? 's' : ''}` : undefined} />
        {decisions.loading ? (
          <LoadingSpinner />
        ) : decisions.error ? (
          <ErrorMessage message={decisions.error} onRetry={decisions.refetch} />
        ) : decisions.data && decisions.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-edge">
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Violations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {decisions.data.slice(0, 20).map((d) => {
                    const resultVariant = d.result === 'approved' ? 'green' : d.result === 'rejected' ? 'red' : 'gray';
                    const violationCount = d.result_details?.violation_count ?? 0;
                    return (
                      <tr key={d.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                          {formatDateTime(d.decided_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink">
                          {titleCase(d.decision_type)}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={resultVariant}>{d.result}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                          {violationCount === 0 ? 'All passed' : `${violationCount} violation${violationCount !== 1 ? 's' : ''}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No decisions" description="No decision records found for this investor." />
          </Card>
        )}
      </div>

      {/* KYC Documents */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="KYC Documents" description={documents.data ? `${documents.data.length} document${documents.data.length !== 1 ? 's' : ''}` : undefined} />
          <Button size="sm" onClick={() => { setShowUpload(true); setDocMsg(null); }}>Upload Document</Button>
        </div>

        {docMsg && (
          <div className="mb-3">
            <Alert variant={docMsg.type === 'success' ? 'success' : 'error'}>{docMsg.text}</Alert>
          </div>
        )}

        {documents.loading ? (
          <LoadingSpinner />
        ) : documents.error ? (
          <ErrorMessage message={documents.error} onRetry={documents.refetch} />
        ) : documents.data && documents.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-edge">
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Document</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Expiry</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Uploaded</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {documents.data.map((doc) => {
                    const statusVariant = doc.status === 'verified' ? 'green' : doc.status === 'rejected' || doc.status === 'expired' ? 'red' : 'yellow';
                    return (
                      <tr key={doc.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          <button
                            className="text-accent-600 hover:text-accent-700 hover:underline text-left"
                            onClick={async () => { try { await api.downloadInvestorDocument(doc.id, doc.filename); } catch { /* silent */ } }}
                          >
                            {doc.filename}
                          </button>
                        </td>
                        <td className="px-6 py-3"><Badge variant="gray">{doc.document_type.replace(/_/g, ' ')}</Badge></td>
                        <td className="px-6 py-3"><Badge variant={statusVariant}>{doc.status}</Badge></td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">{doc.expiry_date ? formatDate(doc.expiry_date) : '-'}</td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">{formatDate(doc.created_at)}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5">
                            {doc.status === 'uploaded' && (
                              <>
                                <button onClick={() => handleVerifyDocument(doc.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Verify</button>
                                <span className="text-ink-muted">|</span>
                                <button onClick={() => handleRejectDocument(doc.id)} className="text-xs font-medium text-red-500 hover:text-red-600">Reject</button>
                              </>
                            )}
                            <button onClick={() => handleDeleteDocument(doc.id)} className="text-xs font-medium text-ink-tertiary hover:text-red-500 ml-1">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No KYC documents" description="Upload identity documents to complete KYC verification." />
          </Card>
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload KYC Document">
        <div className="space-y-4">
          <Select
            label="Document Type"
            value={uploadDocType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadDocType(e.target.value)}
            options={[
              { value: 'passport', label: 'Passport' },
              { value: 'national_id', label: 'National ID' },
              { value: 'proof_of_address', label: 'Proof of Address' },
              { value: 'certificate_of_incorporation', label: 'Certificate of Incorporation' },
              { value: 'beneficial_ownership', label: 'Beneficial Ownership Declaration' },
              { value: 'tax_certificate', label: 'Tax Certificate' },
              { value: 'bank_reference', label: 'Bank Reference' },
              { value: 'accreditation_letter', label: 'Accreditation Letter' },
              { value: 'aml_declaration', label: 'AML Declaration' },
              { value: 'source_of_funds', label: 'Source of Funds' },
              { value: 'power_of_attorney', label: 'Power of Attorney' },
              { value: 'board_resolution', label: 'Board Resolution' },
              { value: 'financial_statement', label: 'Financial Statement' },
              { value: 'subscription_agreement', label: 'Subscription Agreement' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">File (PDF, JPEG, PNG, max 10MB)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.doc,.docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-bg-tertiary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-secondary hover:file:bg-bg-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Expiry Date (optional)</label>
            <input
              type="date"
              value={uploadExpiry}
              onChange={(e) => setUploadExpiry(e.target.value)}
              className="w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Notes (optional)</label>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUploadDocument} disabled={!uploadFile || uploadLoading}>
              {uploadLoading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Onboarding Records */}
      <div className="mb-6">
        <SectionHeader title="Onboarding Records" description={onboarding.data ? `${onboarding.data.length} record${onboarding.data.length !== 1 ? 's' : ''}` : undefined} />
        {onboarding.loading ? (
          <LoadingSpinner />
        ) : onboarding.error ? (
          <ErrorMessage message={onboarding.error} onRetry={onboarding.refetch} />
        ) : onboarding.data && onboarding.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-edge">
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Applied</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {onboarding.data.map((rec) => {
                    const asset = assetMap.get(rec.asset_id);
                    const statusVariant =
                      rec.status === 'approved' || rec.status === 'allocated' ? 'green'
                      : rec.status === 'rejected' || rec.status === 'ineligible' ? 'red'
                      : rec.status === 'applied' || rec.status === 'eligible' ? 'yellow'
                      : 'gray';
                    return (
                      <tr key={rec.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          {asset?.name ?? <span className="font-mono text-ink-tertiary">{rec.asset_id.substring(0, 8)}</span>}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={statusVariant}>{rec.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums font-mono text-ink-secondary">
                          {formatNumber(rec.requested_units)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {formatDate(rec.applied_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {rec.reviewed_at ? formatDate(rec.reviewed_at) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No onboarding records" description="No onboarding applications found for this investor." />
          </Card>
        )}
      </div>
    </div>
  );
}

