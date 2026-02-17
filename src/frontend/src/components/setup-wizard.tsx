'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { Card, Button, Badge, Alert } from './ui';
import { CsvUploadWizard } from './csv-upload-wizard';
import type {
  LegalForm,
  RegulatoryFramework,
  ImportEntityType,
  BulkImportPayload,
  BulkImportResult,
  ApiError,
} from '../lib/types';

type WizardStep = 'welcome' | 'csv-pick-type' | 'csv-import' | 'fund' | 'investors' | 'review' | 'complete';

interface FundInput {
  name: string;
  legal_form: LegalForm;
  domicile: string;
  regulatory_framework: RegulatoryFramework;
  total_units: number;
}

interface InvestorInput {
  name: string;
  jurisdiction: string;
  investor_type: string;
  accredited: boolean;
}

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string }[] = [
  { value: 'SIF', label: 'SIF', desc: 'Specialised Investment Fund (Luxembourg)' },
  { value: 'RAIF', label: 'RAIF', desc: 'Reserved Alternative Investment Fund (Luxembourg)' },
  { value: 'SICAV', label: 'SICAV', desc: 'Open-ended investment company' },
  { value: 'SCSp', label: 'SCSp', desc: 'Special Limited Partnership (Luxembourg)' },
  { value: 'ELTIF', label: 'ELTIF', desc: 'European Long-Term Investment Fund' },
  { value: 'Spezial_AIF', label: 'Spezial-AIF', desc: 'Special AIF (Germany, KAGB)' },
  { value: 'QIAIF', label: 'QIAIF', desc: 'Qualifying Investor AIF (Ireland)' },
  { value: 'other', label: 'Other', desc: 'Custom legal form' },
];

const FRAMEWORKS: { value: RegulatoryFramework; label: string }[] = [
  { value: 'AIFMD', label: 'AIFMD' },
  { value: 'UCITS', label: 'UCITS' },
  { value: 'ELTIF', label: 'ELTIF' },
  { value: 'national', label: 'National' },
];

const DOMICILES: { code: string; label: string }[] = [
  { code: 'LU', label: 'LU (Luxembourg)' },
  { code: 'DE', label: 'DE (Germany)' },
  { code: 'IE', label: 'IE (Ireland)' },
  { code: 'FR', label: 'FR (France)' },
  { code: 'NL', label: 'NL (Netherlands)' },
  { code: 'AT', label: 'AT (Austria)' },
  { code: 'CH', label: 'CH (Switzerland)' },
  { code: 'LI', label: 'LI (Liechtenstein)' },
  { code: 'GB', label: 'GB (United Kingdom)' },
];

const STEPS: { key: WizardStep; label: string; num: number }[] = [
  { key: 'fund', label: 'Create Fund', num: 1 },
  { key: 'investors', label: 'Add Investors', num: 2 },
  { key: 'review', label: 'Review & Import', num: 3 },
];

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('welcome');
  const [fund, setFund] = useState<FundInput>({
    name: '',
    legal_form: 'SIF',
    domicile: 'LU',
    regulatory_framework: 'AIFMD',
    total_units: 10000,
  });
  const [investors, setInvestors] = useState<InvestorInput[]>([
    { name: '', jurisdiction: 'DE', investor_type: 'professional', accredited: true },
  ]);
  const [csvEntityType, setCsvEntityType] = useState<ImportEntityType>('investors');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addInvestor = () => {
    setInvestors([...investors, { name: '', jurisdiction: 'DE', investor_type: 'professional', accredited: true }]);
  };

  const removeInvestor = (idx: number) => {
    if (investors.length > 1) {
      setInvestors(investors.filter((_, i) => i !== idx));
    }
  };

  const updateInvestor = (idx: number, field: keyof InvestorInput, value: string | boolean) => {
    setInvestors(investors.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv));
  };

  const canProceedFund = fund.name.trim().length > 0 && fund.total_units > 0;
  const canProceedInvestors = investors.every((inv) => inv.name.trim().length > 0);

  const handleImport = async () => {
    setImporting(true);
    setError(null);

    const payload: BulkImportPayload = {
      fundStructures: [{
        ref: 'fund-1',
        name: fund.name,
        legal_form: fund.legal_form,
        domicile: fund.domicile,
        regulatory_framework: fund.regulatory_framework,
        asset_name: `${fund.name} — Share Class A`,
        asset_type: 'fund_share',
        total_units: fund.total_units,
      }],
      investors: investors.filter((inv) => inv.name.trim()).map((inv, i) => ({
        ref: `inv-${i}`,
        name: inv.name,
        jurisdiction: inv.jurisdiction,
        investor_type: inv.investor_type as 'institutional' | 'professional' | 'semi_professional' | 'well_informed' | 'retail',
        accredited: inv.accredited,
        kyc_status: 'verified' as const,
      })),
      eligibilityCriteria: [{
        fund_ref: 'fund-1',
        jurisdiction: fund.domicile,
        investor_type: 'professional',
        minimum_investment: fund.legal_form === 'SIF' ? 125000 : 100000,
        effective_date: new Date().toISOString().split('T')[0],
        source_reference: fund.legal_form === 'SIF' ? 'CSSF SIF Law Art. 2' : 'AIFMD Art. 4',
      }],
    };

    try {
      const result = await api.bulkImport(payload);
      setImportResult(result);
      setStep('complete');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Import failed. Please check your data and try again.');
    } finally {
      setImporting(false);
    }
  };

  // Welcome screen
  if (step === 'welcome') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/10">
            <svg className="h-8 w-8 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-ink mb-2">Welcome to Caelith</h2>
          <p className="text-sm text-ink-secondary mb-8 leading-relaxed">
            Import your investor register or create a fund structure to get started.
          </p>

          <div className="mx-auto max-w-md space-y-3 mb-6">
            {/* Primary: CSV Import */}
            <button
              onClick={() => setStep('csv-pick-type')}
              className="w-full flex items-center gap-4 rounded-xl border border-accent-400/30 bg-accent-500/5 p-4 text-left transition-all hover:border-accent-400 hover:bg-accent-500/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10 flex-shrink-0">
                <svg className="h-5 w-5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Import from Spreadsheet</p>
                <p className="text-xs text-ink-secondary">Upload a CSV with your investors, funds, or holdings</p>
              </div>
              <Badge variant="green">Recommended</Badge>
            </button>

            {/* Secondary: Manual Setup */}
            <button
              onClick={() => setStep('fund')}
              className="w-full flex items-center gap-4 rounded-xl border border-edge p-4 text-left transition-all hover:border-edge-strong hover:bg-bg-tertiary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary flex-shrink-0">
                <svg className="h-5 w-5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Create Manually</p>
                <p className="text-xs text-ink-secondary">Set up a fund and add investors step by step</p>
              </div>
            </button>
          </div>

          <Button variant="ghost" onClick={onComplete}>
            Explore the dashboard first
          </Button>
        </div>
      </div>
    );
  }

  // CSV Entity Type picker
  if (step === 'csv-pick-type') {
    const entityOptions: { value: ImportEntityType; label: string; desc: string; icon: string }[] = [
      { value: 'investors', label: 'Investors', desc: 'Import your investor register', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
      { value: 'fund_structures', label: 'Fund Structures', desc: 'Import fund vehicles and legal structures', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21' },
      { value: 'holdings', label: 'Holdings', desc: 'Import investor positions and allocations', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
      { value: 'eligibility_criteria', label: 'Eligibility Criteria', desc: 'Import fund eligibility rules', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
    ];

    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <h3 className="text-base font-semibold text-ink mb-1">What would you like to import?</h3>
          <p className="text-xs text-ink-secondary mb-5">Select the type of data in your CSV file.</p>

          <div className="space-y-2">
            {entityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setCsvEntityType(opt.value); setStep('csv-import'); }}
                className="w-full flex items-center gap-4 rounded-xl border border-edge p-4 text-left transition-all hover:border-accent-400 hover:bg-accent-500/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary flex-shrink-0">
                  <svg className="h-5 w-5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{opt.label}</p>
                  <p className="text-xs text-ink-secondary">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-start">
            <Button variant="ghost" onClick={() => setStep('welcome')}>Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  // CSV Import flow
  if (step === 'csv-import') {
    return (
      <div className="mx-auto max-w-2xl">
        <CsvUploadWizard
          key={csvEntityType}
          entityType={csvEntityType}
          onComplete={() => onComplete()}
          onCancel={() => setStep('csv-pick-type')}
          onStartEligibility={csvEntityType === 'investors' ? () => {
            onComplete();
            router.push('/onboarding');
          } : undefined}
        />
      </div>
    );
  }

  // Complete screen
  if (step === 'complete' && importResult) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-ink mb-2">Setup Complete</h2>
          <p className="text-sm text-ink-secondary mb-4">
            Your fund is ready. Here&apos;s what was created:
          </p>
          <div className="mx-auto max-w-xs space-y-2 mb-8">
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-4 py-2">
              <span className="text-xs text-ink-secondary">Fund structures</span>
              <Badge variant="green">{importResult.summary.fund_structures}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-4 py-2">
              <span className="text-xs text-ink-secondary">Assets</span>
              <Badge variant="green">{importResult.summary.assets}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-4 py-2">
              <span className="text-xs text-ink-secondary">Investors</span>
              <Badge variant="green">{importResult.summary.investors}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-4 py-2">
              <span className="text-xs text-ink-secondary">Eligibility criteria</span>
              <Badge variant="green">{importResult.summary.eligibility_criteria}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => { onComplete(); router.push('/funds'); }}>
              View Fund
            </Button>
            <Button variant="secondary" onClick={() => { onComplete(); }}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Stepper header
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicators */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isComplete = i < currentStepIndex;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`h-px w-8 ${isComplete ? 'bg-accent-400' : 'bg-edge'}`} />}
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive ? 'bg-accent-500 text-white' :
                  isComplete ? 'bg-accent-500/20 text-accent-400' :
                  'bg-bg-tertiary text-ink-tertiary'
                }`}>
                  {isComplete ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.num}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-ink' : 'text-ink-tertiary'}`}>{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <Alert variant="error" title="Import Error">
          {error}
        </Alert>
      )}

      {/* Step: Fund */}
      {step === 'fund' && (
        <Card>
          <h3 className="text-base font-semibold text-ink mb-1">Create Your First Fund</h3>
          <p className="text-xs text-ink-secondary mb-6">Define the legal structure and regulatory framework for your fund.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Fund Name</label>
              <input
                value={fund.name}
                onChange={(e) => setFund({ ...fund, name: e.target.value })}
                placeholder="e.g., Luxembourg Growth Fund I"
                className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Legal Form</label>
                <select
                  value={fund.legal_form}
                  onChange={(e) => setFund({ ...fund, legal_form: e.target.value as LegalForm })}
                  className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                >
                  {LEGAL_FORMS.map((lf) => (
                    <option key={lf.value} value={lf.value}>{lf.label} — {lf.desc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Domicile</label>
                <select
                  value={fund.domicile}
                  onChange={(e) => setFund({ ...fund, domicile: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                >
                  {DOMICILES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Regulatory Framework</label>
                <select
                  value={fund.regulatory_framework}
                  onChange={(e) => setFund({ ...fund, regulatory_framework: e.target.value as RegulatoryFramework })}
                  className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                >
                  {FRAMEWORKS.map((fw) => (
                    <option key={fw.value} value={fw.value}>{fw.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">Share Class Units (authorized)</label>
                <input
                  type="number"
                  value={fund.total_units}
                  onChange={(e) => setFund({ ...fund, total_units: Number(e.target.value) })}
                  min={1}
                  className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep('investors')} disabled={!canProceedFund}>
              Next: Add Investors
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Investors */}
      {step === 'investors' && (
        <Card>
          <h3 className="text-base font-semibold text-ink mb-1">Add Investors</h3>
          <p className="text-xs text-ink-secondary mb-6">Add the investors who will subscribe to your fund. You can add more later.</p>

          <div className="space-y-3">
            {investors.map((inv, idx) => (
              <div key={idx} className="rounded-lg border border-edge-subtle p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-ink-tertiary">Investor {idx + 1}</span>
                  {investors.length > 1 && (
                    <button onClick={() => removeInvestor(idx)} className="text-xs text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input
                      value={inv.name}
                      onChange={(e) => updateInvestor(idx, 'name', e.target.value)}
                      placeholder="Investor name"
                      className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                    />
                  </div>
                  <select
                    value={inv.jurisdiction}
                    onChange={(e) => updateInvestor(idx, 'jurisdiction', e.target.value)}
                    className="rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                  >
                    {DOMICILES.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                  </select>
                  <select
                    value={inv.investor_type}
                    onChange={(e) => updateInvestor(idx, 'investor_type', e.target.value)}
                    className="rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                  >
                    <option value="institutional">Institutional</option>
                    <option value="professional">Professional</option>
                    <option value="semi_professional">Semi-professional</option>
                    <option value="well_informed">Well-informed</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addInvestor}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-edge py-2 text-xs font-medium text-ink-secondary hover:border-edge-strong hover:text-ink transition-colors"
          >
            <span>+</span> Add Another Investor
          </button>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep('fund')}>Back</Button>
            <Button onClick={() => setStep('review')} disabled={!canProceedInvestors}>
              Next: Review
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <Card>
          <h3 className="text-base font-semibold text-ink mb-1">Review & Import</h3>
          <p className="text-xs text-ink-secondary mb-6">
            Everything below will be created in a single transaction. If anything fails, nothing is saved.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg bg-bg-tertiary p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-2">Fund Structure</p>
              <p className="text-sm font-semibold text-ink">{fund.name}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="gray">{fund.legal_form}</Badge>
                <Badge variant="gray">{fund.domicile}</Badge>
                <Badge variant="green">{fund.regulatory_framework}</Badge>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                {fund.total_units.toLocaleString()} units · Auto-creates share class asset + eligibility criteria
              </p>
            </div>

            <div className="rounded-lg bg-bg-tertiary p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-2">
                Investors ({investors.filter((i) => i.name.trim()).length})
              </p>
              <div className="space-y-1.5">
                {investors.filter((i) => i.name.trim()).map((inv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{inv.name}</span>
                    <div className="flex gap-1.5">
                      <Badge variant="gray">{inv.jurisdiction}</Badge>
                      <Badge variant="gray">{inv.investor_type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep('investors')}>Back</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </span>
              ) : (
`Create Fund & Import ${investors.filter((i) => i.name.trim()).length} Investor${investors.filter((i) => i.name.trim()).length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
