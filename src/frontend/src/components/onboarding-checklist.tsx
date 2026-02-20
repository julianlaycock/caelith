'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './ui';
import { classNames } from '../lib/utils';
import { useI18n } from '../lib/i18n';

const SETUP_COMPLETE_KEY = 'caelith_setup_complete_dismissed';

interface OnboardingChecklistProps {
  hasFunds: boolean;
  hasInvestors: boolean;
  hasRules: boolean;
  hasDecisions: boolean;
}

export function OnboardingChecklist({ hasFunds, hasInvestors, hasRules, hasDecisions }: OnboardingChecklistProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const steps = [
    { label: t('checklist.createFund'), done: hasFunds, href: '/funds' },
    { label: t('checklist.addInvestors'), done: hasInvestors, href: '/investors' },
    { label: t('checklist.configureRules'), done: hasRules, href: '/rules' },
    { label: t('checklist.runCompliance'), done: hasDecisions, href: '/onboarding' },
  ];
  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  // Check localStorage on mount
  useEffect(() => {
    if (allDone && typeof window !== 'undefined' && localStorage.getItem(SETUP_COMPLETE_KEY)) {
      setDismissed(true);
    }
  }, [allDone]);

  // Auto-dismiss after 5s when all complete
  useEffect(() => {
    if (allDone && !dismissed) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setDismissed(true);
          if (typeof window !== 'undefined') localStorage.setItem(SETUP_COMPLETE_KEY, '1');
        }, 500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed]);

  if (allDone && dismissed) return null;

  if (allDone) {
    return (
      <div className={classNames('mb-4 transition-opacity duration-500', fadeOut ? 'opacity-0' : 'opacity-100')}>
        <div className="rounded-xl border border-semantic-success/20 bg-semantic-success-bg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-semantic-success" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-semantic-success">{t('dashboard.setupComplete')}</p>
            </div>
            <button
              onClick={() => { setDismissed(true); if (typeof window !== 'undefined') localStorage.setItem(SETUP_COMPLETE_KEY, '1'); }}
              className="text-semantic-success/60 hover:text-semantic-success transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasFunds && !hasInvestors) return null;

  return (
    <div className="mb-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t('dashboard.gettingStarted')}</p>
            <p className="text-xs text-ink-secondary">{completed} {t('checklist.stepsOf')} {steps.length} {t('checklist.stepsComplete')}</p>
          </div>
          <div className="h-2 w-24 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          {steps.map((step) => (
            <div
              key={step.label}
              className={classNames(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                step.done ? 'text-ink-tertiary' : 'text-ink cursor-pointer hover:bg-bg-tertiary'
              )}
              onClick={!step.done ? () => router.push(step.href) : undefined}
            >
              {step.done ? (
                <svg className="h-4 w-4 text-semantic-success flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-edge" />
              )}
              <span className={step.done ? 'line-through' : 'font-medium'}>{step.label}</span>
              {!step.done && (
                <svg className="h-3.5 w-3.5 ml-auto text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
