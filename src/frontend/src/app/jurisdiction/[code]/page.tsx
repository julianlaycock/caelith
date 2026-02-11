'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { PageHeader, Card, Badge, Button, LoadingSpinner, ErrorMessage, EmptyState } from '../../../components/ui';
import { formatDate } from '../../../lib/utils';
import type { Investor } from '../../../lib/types';

// ── Hardcoded jurisdiction reference data ─────────────────

interface JurisdictionInfo {
  name: string;
  flag: string;
  regulator: string;
  framework: string;
  key_legislation: string[];
}

const JURISDICTION_INFO: Record<string, JurisdictionInfo> = {
  LU: {
    name: 'Luxembourg',
    flag: '\u{1F1F1}\u{1F1FA}',
    regulator: 'CSSF',
    framework: 'AIFMD',
    key_legislation: [
      'SIF Law 13 Feb 2007, Art. 2',
      'RAIF Law 23 Jul 2016, Art. 2(1)',
      'Law of 12 Jul 2013 on AIFMs',
    ],
  },
  DE: {
    name: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    regulator: 'BaFin',
    framework: 'AIFMD',
    key_legislation: [
      'KAGB \u00A71(19) Nr. 33',
      'KAGB \u00A71(6)',
      'KAGB \u00A7307',
    ],
  },
  FR: {
    name: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    regulator: 'AMF',
    framework: 'AIFMD',
    key_legislation: [
      'CMF Art. L214-24',
      'AMF Instruction 2014-03',
    ],
  },
  IE: {
    name: 'Ireland',
    flag: '\u{1F1EE}\u{1F1EA}',
    regulator: 'CBI',
    framework: 'AIFMD',
    key_legislation: [
      'AIF Rulebook Ch. 2 (QIAIF)',
      'Ch. 3 (RIAIF)',
      'S.I. No. 257/2013',
    ],
  },
  CH: {
    name: 'Switzerland',
    flag: '\u{1F1E8}\u{1F1ED}',
    regulator: 'FINMA',
    framework: 'CISA',
    key_legislation: [
      'CISA Art. 10',
      'FinSA Art. 4',
    ],
  },
  SG: {
    name: 'Singapore',
    flag: '\u{1F1F8}\u{1F1EC}',
    regulator: 'MAS',
    framework: 'SFA',
    key_legislation: [
      'SFA \u00A74A',
      'SFA \u00A7305',
    ],
  },
  NO: {
    name: 'Norway',
    flag: '\u{1F1F3}\u{1F1F4}',
    regulator: 'Finanstilsynet',
    framework: 'AIFMD',
    key_legislation: [
      'AIF Act \u00A71-2',
      'Securities Trading Act \u00A710-6',
    ],
  },
  NL: {
    name: 'Netherlands',
    flag: '\u{1F1F3}\u{1F1F1}',
    regulator: 'AFM',
    framework: 'AIFMD',
    key_legislation: [
      'Wft \u00A72:65',
      'Wft \u00A71:1',
    ],
  },
  IT: {
    name: 'Italy',
    flag: '\u{1F1EE}\u{1F1F9}',
    regulator: 'CONSOB',
    framework: 'AIFMD',
    key_legislation: [
      'TUF Art. 1(1)(m-quater)',
      'D.Lgs. 44/2014',
    ],
  },
  GB: {
    name: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    regulator: 'FCA',
    framework: 'UK AIFMD',
    key_legislation: [
      'UK AIFMD',
      'FCA FUND 3.11',
    ],
  },
  US: {
    name: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    regulator: 'SEC',
    framework: 'Reg D',
    key_legislation: [
      'Securities Act \u00A74(a)(2)',
      'Reg D Rule 506',
    ],
  },
  PL: {
    name: 'Poland',
    flag: '\u{1F1F5}\u{1F1F1}',
    regulator: 'KNF',
    framework: 'AIFMD',
    key_legislation: [
      'Investment Funds Act',
    ],
  },
  PT: {
    name: 'Portugal',
    flag: '\u{1F1F5}\u{1F1F9}',
    regulator: 'CMVM',
    framework: 'AIFMD',
    key_legislation: [
      'RGOIC',
    ],
  },
};

// ── Helper: KYC badge variant ────────────────────────────

function kycBadgeVariant(status: string): 'green' | 'red' | 'yellow' {
  if (status === 'verified') return 'green';
  if (status === 'expired') return 'red';
  return 'yellow';
}

// ── Book icon SVG ────────────────────────────────────────

function BookIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

// ── Page Component ───────────────────────────────────────

export default function JurisdictionPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getInvestors()
      .then((all) => {
        if (!cancelled) {
          const filtered = all.filter(
            (inv) => inv.jurisdiction.toUpperCase() === code
          );
          setInvestors(filtered);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || err?.error || 'Failed to load investors');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const info = JURISDICTION_INFO[code] ?? null;
  const countryName = info?.name ?? 'Unknown Jurisdiction';
  const regulator = info?.regulator ?? null;
  const framework = info?.framework ?? null;
  const legislation = info?.key_legislation ?? [];

  return (
    <div>
      {/* ── Header ─────────────────────────────────── */}
      <PageHeader
        title={`${countryName} (${code})`}
        description={regulator ? `Regulator: ${regulator}` : `Jurisdiction code: ${code}`}
        action={
          <div className="flex items-center gap-3">
            {framework && (
              <Badge variant="green">{framework}</Badge>
            )}
            <Button variant="secondary" size="sm" onClick={() => router.back()}>
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back
            </Button>
          </div>
        }
      />

      {/* ── Regulatory Context Card ────────────────── */}
      {info ? (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Regulatory Context</h2>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#000042] px-2.5 py-1 text-xs font-medium text-white">
              {info.regulator}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                Framework
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{info.framework}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                Regulator
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{info.regulator}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                Jurisdiction
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {info.name} ({code})
              </p>
            </div>
          </div>

          {legislation.length > 0 && (
            <div className="mt-5 border-t border-edge-subtle pt-4">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                Key Legislation
              </p>
              <ul className="space-y-2">
                {legislation.map((ref, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <BookIcon />
                    <span className="text-sm text-ink font-mono">{ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-ink">
              No regulatory data available for jurisdiction code{' '}
              <span className="font-mono font-semibold">{code}</span>.
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              This jurisdiction is not yet covered in the reference database.
            </p>
          </div>
        </Card>
      )}

      {/* ── Investors Card ─────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setLoading(true);
            setError(null);
            api
              .getInvestors()
              .then((all) => {
                setInvestors(
                  all.filter((inv) => inv.jurisdiction.toUpperCase() === code)
                );
                setLoading(false);
              })
              .catch((err) => {
                setError(
                  err?.message || err?.error || 'Failed to load investors'
                );
                setLoading(false);
              });
          }}
        />
      ) : investors.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          }
          title={`No investors in ${countryName}`}
          description={`There are no registered investors with jurisdiction ${code}.`}
        />
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Investors
              <span className="ml-2 inline-flex items-center rounded-md bg-surface-subtle px-2 py-0.5 text-xs font-medium text-ink-secondary ring-1 ring-edge/50">
                {investors.length}
              </span>
            </h2>
          </div>
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-edge">
                  <tr>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                      Name
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                      Type
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                      KYC Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                      KYC Expiry
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                      Accredited
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {investors.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-surface-subtle"
                    >
                      <td className="px-5 py-3 font-medium text-ink">
                        {inv.name}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="gray">
                          {inv.investor_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={kycBadgeVariant(inv.kyc_status)}>
                          {inv.kyc_status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-ink-secondary">
                        {inv.kyc_expiry ? formatDate(inv.kyc_expiry) : '\u2014'}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={inv.accredited ? 'green' : 'yellow'}>
                          {inv.accredited ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
