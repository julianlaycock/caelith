'use client';

import React, { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import {
  Card,
  Badge,
  LoadingSpinner,
  ErrorMessage,
} from '../../components/ui';
import { classNames } from '../../lib/utils';
import type {
  ReadinessAssessment,
  ReadinessQuestion,
  ReadinessAnswer,
  ReadinessCategory,
  AnswerStatus,
  CategoryScore,
} from '../../lib/types';

// ── Category config ──

const CATEGORY_META: Record<ReadinessCategory, { icon: string; order: number }> = {
  delegation:       { icon: '🤝', order: 1 },
  liquidity:        { icon: '📉', order: 2 },
  reporting:        { icon: '📊', order: 3 },
  disclosure:       { icon: '🛡️', order: 4 },
  loan_origination: { icon: '💳', order: 5 },
  governance:       { icon: '⚙️', order: 6 },
};

const STATUS_OPTIONS: { value: AnswerStatus; labelDe: string; labelEn: string; color: string }[] = [
  { value: 'yes',     labelDe: 'Ja',        labelEn: 'Yes',     color: 'bg-emerald-500' },
  { value: 'partial', labelDe: 'Teilweise',  labelEn: 'Partial', color: 'bg-amber-500' },
  { value: 'no',      labelDe: 'Nein',       labelEn: 'No',      color: 'bg-red-500' },
  { value: 'na',      labelDe: 'N/A',        labelEn: 'N/A',     color: 'bg-gray-500' },
];

// ── Score Ring ──

function ScoreRing({ score, size = 160, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#6ee7b7' : score >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative flex flex-col items-center gap-2" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-edge" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-ink">{score}%</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-tertiary">{label}</span>
      </div>
    </div>
  );
}

// ── Category Bar ──

function CategoryBar({ catScore, meta, label, isActive, onClick, lang }: {
  catScore: CategoryScore;
  meta: { icon: string };
  label: string;
  isActive: boolean;
  onClick: () => void;
  lang: 'de' | 'en';
}) {
  const color = catScore.score >= 70 ? 'bg-emerald-500' : catScore.score >= 40 ? 'bg-amber-500' : catScore.score === 0 && catScore.applicable > 0 ? 'bg-red-500/60' : 'bg-red-500';
  const unanswered = catScore.applicable - catScore.answered;

  return (
    <button
      onClick={onClick}
      className={classNames(
        'w-full rounded-xl border p-4 text-left transition-all',
        isActive
          ? 'border-accent-500/40 bg-accent-500/5 ring-1 ring-accent-500/20'
          : 'border-edge bg-bg-secondary hover:bg-bg-tertiary'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-sm font-medium text-ink">{label}</span>
          {unanswered > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 tabular-nums">
              {unanswered} {lang === 'de' ? 'offen' : 'open'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-ink-tertiary">{catScore.answered}/{catScore.applicable}</span>
          <Badge variant={catScore.score >= 70 ? 'green' : catScore.score >= 40 ? 'yellow' : 'red'}>
            {catScore.score}%
          </Badge>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div className={classNames('h-full rounded-full transition-all duration-500', color)} style={{ width: `${catScore.score}%` }} />
      </div>
    </button>
  );
}

// ── Saved Toast ──

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div className={classNames(
      'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
    )}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      Gespeichert
    </div>
  );
}

// ── Question Row ──

function QuestionRow({ question, answer, lang, onAnswer, saving, loanSkipped }: {
  question: ReadinessQuestion;
  answer: ReadinessAnswer;
  lang: 'de' | 'en';
  onAnswer: (key: string, status: AnswerStatus, notes?: string) => void;
  saving: string | null;
  loanSkipped: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(answer.notes || '');
  const questionText = lang === 'de' ? question.question_de : question.question_en;
  const hintText = lang === 'de' ? question.hint_de : question.hint_en;
  const isSaving = saving === question.key;
  const isSkipped = question.dependsOn === 'loan_applicable' && loanSkipped;

  if (isSkipped) {
    return (
      <div className="rounded-xl border border-edge bg-bg-secondary/50 p-4 opacity-50">
        <div className="flex items-center gap-2">
          <p className="text-sm text-ink-tertiary line-through">{questionText}</p>
          <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-medium text-gray-400">
            {lang === 'de' ? 'Übersprungen' : 'Skipped'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames(
      'rounded-xl border p-4 transition-colors',
      answer.needsVerification ? 'border-amber-500/30 bg-amber-500/5' :
      answer.auto ? 'border-accent-500/20 bg-accent-500/5' :
      'border-edge bg-bg-secondary'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink">{questionText}</p>
            {answer.needsVerification && (
              <span className="flex-shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 cursor-help"
                title={lang === 'de' ? 'Automatisch erkannt — bitte manuell bestätigen' : 'Auto-detected — please verify manually'}>
                ⚠ {lang === 'de' ? 'Prüfen' : 'Verify'}
              </span>
            )}
            {answer.auto && !answer.needsVerification && (
              <span className="flex-shrink-0 rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-medium text-accent-300 cursor-help"
                title={lang === 'de' ? 'Automatisch aus Plattformdaten erkannt' : 'Auto-detected from platform data'}>
                AUTO
              </span>
            )}
            {question.weight === 3 && (
              <span className="flex-shrink-0 text-[10px] text-amber-400 cursor-help"
                title={lang === 'de' ? 'Hohe Priorität' : 'High priority'}>●●●</span>
            )}
            {question.weight === 2 && (
              <span className="flex-shrink-0 text-[10px] text-ink-tertiary cursor-help"
                title={lang === 'de' ? 'Mittlere Priorität' : 'Medium priority'}>●●</span>
            )}
          </div>
          {hintText && <p className="mt-1 text-xs text-ink-tertiary">{hintText}</p>}
          {answer.auto && answer.notes && (
            <p className="mt-1 text-xs text-accent-400 italic">{answer.notes}</p>
          )}
          {/* Source reference */}
          <p className="mt-1.5 text-[10px] font-mono text-ink-tertiary/60">
            📖 {question.source}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onAnswer(question.key, opt.value, notes || undefined)}
              disabled={isSaving}
              className={classNames(
                'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                answer.status === opt.value
                  ? `${opt.color} text-white shadow-sm`
                  : 'bg-bg-tertiary text-ink-tertiary hover:text-ink hover:bg-bg-primary'
              )}
            >
              {lang === 'de' ? opt.labelDe : opt.labelEn}
            </button>
          ))}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={classNames(
              'ml-1 rounded-lg p-1 transition-colors',
              showNotes || notes ? 'text-accent-400 bg-accent-500/10' : 'text-ink-tertiary hover:text-ink hover:bg-bg-tertiary'
            )}
            title={lang === 'de' ? 'Anmerkung' : 'Notes'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (answer.notes || '') && answer.status !== 'unanswered') onAnswer(question.key, answer.status, notes); }}
            onKeyDown={e => { if (e.key === 'Enter' && answer.status !== 'unanswered') onAnswer(question.key, answer.status, notes); }}
            placeholder={lang === 'de' ? 'Anmerkung hinzufügen...' : 'Add a note...'}
            className="flex-1 rounded-lg border border-edge bg-bg-primary px-3 py-1.5 text-xs text-ink placeholder:text-ink-tertiary focus:border-accent-500/50 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

// ── Legal Disclaimer ──

function Disclaimer({ lang }: { lang: 'de' | 'en' }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
      <div className="flex gap-3">
        <span className="text-lg flex-shrink-0">⚖️</span>
        <div>
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">
            {lang === 'de' ? 'Rechtlicher Hinweis' : 'Legal Notice'}
          </p>
          <p className="text-xs text-ink-secondary leading-relaxed">
            {lang === 'de'
              ? 'Dieses Assessment dient als Orientierungshilfe und ersetzt keine rechtliche Beratung. Die Ergebnisse sind nicht rechtsverbindlich und stellen keine Garantie für die AIFMD-II-Konformität dar. Automatisch erkannte Antworten basieren auf Plattformdaten und müssen manuell verifiziert werden. Konsultieren Sie Ihren Compliance-Beauftragten oder Rechtsberater für eine vollständige regulatorische Analyse.'
              : 'This assessment serves as an orientation tool and does not constitute legal advice. Results are non-binding and do not guarantee AIFMD II compliance. Auto-detected answers are based on platform data and must be manually verified. Consult your compliance officer or legal counsel for a complete regulatory analysis.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Deadline Banner ──

function DeadlineBanner({ days, lang }: { days: number; lang: 'de' | 'en' }) {
  const urgent = days <= 30;
  const critical = days <= 14;

  return (
    <div className={classNames(
      'rounded-xl border px-5 py-3 flex items-center justify-between',
      critical ? 'border-red-500/30 bg-red-500/10' :
      urgent ? 'border-amber-500/30 bg-amber-500/10' :
      'border-accent-500/20 bg-accent-500/5'
    )}>
      <div className="flex items-center gap-3">
        <span className="text-xl">📅</span>
        <div>
          <p className="text-sm font-medium text-ink">
            {lang === 'de' ? 'AIFMD II Umsetzungsfrist' : 'AIFMD II Transposition Deadline'}
          </p>
          <p className="text-xs text-ink-secondary">16. April 2026 · FoMaStG (Fondsmarktstärkungsgesetz)</p>
        </div>
      </div>
      <div className="text-right">
        <p className={classNames(
          'text-2xl font-bold tabular-nums',
          critical ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-ink'
        )}>
          {days}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-ink-tertiary">
          {lang === 'de' ? 'Tage verbleibend' : 'Days remaining'}
        </p>
      </div>
    </div>
  );
}

// ── Methodology Section ──

function Methodology({ lang, collapsed, onToggle }: { lang: 'de' | 'en'; collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm">📐</span>
          <span className="text-xs font-medium text-ink-secondary">
            {lang === 'de' ? 'Methodik & Bewertungslogik' : 'Methodology & Scoring Logic'}
          </span>
        </div>
        <svg className={classNames('w-4 h-4 text-ink-tertiary transition-transform', collapsed ? '' : 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-5 pb-4 text-xs text-ink-secondary leading-relaxed space-y-2 border-t border-edge pt-3">
          <p>
            {lang === 'de'
              ? '• 24 Fragen in 6 Kategorien, abgeleitet aus AIFMD II (Richtlinie 2024/927/EU) und dem Referentenentwurf des FoMaStG.'
              : '• 24 questions across 6 categories, derived from AIFMD II (Directive 2024/927/EU) and the FoMaStG draft bill.'}
          </p>
          <p>
            {lang === 'de'
              ? '• Gewichtung: ●●● = hohe Priorität (3x), ●● = mittel (2x), ● = niedrig (1x). Höhere Gewichtung für Kernpflichten.'
              : '• Weighting: ●●● = high priority (3x), ●● = medium (2x), ● = low (1x). Higher weight for core obligations.'}
          </p>
          <p>
            {lang === 'de'
              ? '• Bewertung: Ja = 100%, Teilweise = 50%, Nein = 0%, N/A = aus Berechnung ausgeschlossen.'
              : '• Scoring: Yes = 100%, Partial = 50%, No = 0%, N/A = excluded from calculation.'}
          </p>
          <p>
            {lang === 'de'
              ? '• Automatische Erkennung (⚠ Prüfen): Basiert auf Plattformdaten. Maximal "Teilweise" bis zur manuellen Bestätigung.'
              : '• Auto-detection (⚠ Verify): Based on platform data. Capped at "Partial" until manually confirmed.'}
          </p>
          <p>
            {lang === 'de'
              ? '• Kreditvergabe: Wird bei "Nein" oder "N/A" automatisch aus der Gesamtbewertung ausgeschlossen.'
              : '• Loan origination: Automatically excluded from overall scoring when answered "No" or "N/A".'}
          </p>
          <p className="text-amber-400">
            {lang === 'de'
              ? '• Dieses Tool ist eine Orientierungshilfe. Es ersetzt nicht die Beratung durch qualifizierte Rechts- und Compliance-Experten.'
              : '• This tool is an orientation aid. It does not replace advice from qualified legal and compliance professionals.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function ReadinessPage() {
  const { locale } = useI18n();
  const lang = (locale?.startsWith('de') ? 'de' : 'en') as 'de' | 'en';
  const [activeCategory, setActiveCategory] = useState<ReadinessCategory>('delegation');
  const [saving, setSaving] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [methodologyCollapsed, setMethodologyCollapsed] = useState(true);

  const assessmentData = useAsync(() => api.getReadinessAssessment(), []);

  const handleAnswer = useCallback(async (questionKey: string, status: AnswerStatus, notes?: string) => {
    setSaving(questionKey);
    try {
      const updated = await api.saveReadinessAnswer(questionKey, status, notes);
      assessmentData.setData(updated);
      // Show saved toast
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (err) {
      console.error('Failed to save answer', err);
    } finally {
      setSaving(null);
    }
  }, [assessmentData]);

  if (assessmentData.loading) return <LoadingSpinner />;
  if (assessmentData.error) return <ErrorMessage message={assessmentData.error} onRetry={assessmentData.refetch} />;

  const data = assessmentData.data as ReadinessAssessment;
  if (!data) return null;

  const { questions, answers, score } = data;

  // Check if loan origination should be skipped
  const loanAnswer = answers['loan_applicable'];
  const loanSkipped = loanAnswer && (loanAnswer.status === 'na' || loanAnswer.status === 'no');

  const sortedCategories = Object.entries(CATEGORY_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as ReadinessCategory);

  const categoryLabels: Record<ReadinessCategory, string> = {
    delegation: lang === 'de' ? 'Delegation & Auslagerung' : 'Delegation & Outsourcing',
    liquidity: lang === 'de' ? 'Liquiditätssteuerung' : 'Liquidity Management',
    reporting: lang === 'de' ? 'Reporting & Meldewesen' : 'Reporting & Disclosure',
    disclosure: lang === 'de' ? 'Anlegerinformation' : 'Investor Disclosure',
    loan_origination: lang === 'de' ? 'Kreditvergabe' : 'Loan Origination',
    governance: lang === 'de' ? 'Governance & Umsetzung' : 'Governance & Implementation',
  };

  const activeQuestions = questions.filter(q => q.category === activeCategory);
  const activeCatScore = score.categories.find(c => c.category === activeCategory);

  return (
    <div>
      {/* Saved Toast */}
      <SavedToast visible={showSaved} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">
            AIFMD II Readiness Assessment
          </h1>
          <p className="text-sm text-ink-secondary">
            {lang === 'de'
              ? 'Strukturierte Gap-Analyse gemäß Richtlinie 2024/927/EU und FoMaStG-Referentenentwurf.'
              : 'Structured gap analysis based on Directive 2024/927/EU and the FoMaStG draft bill.'}
          </p>
        </div>
        <a
          href={api.getReadinessExportUrl(lang)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-edge bg-bg-secondary px-4 py-2 text-xs font-medium text-ink hover:bg-bg-tertiary transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {lang === 'de' ? 'PDF exportieren' : 'Export PDF'}
        </a>
      </div>

      {/* Legal Disclaimer */}
      <div className="mb-4">
        <Disclaimer lang={lang} />
      </div>

      {/* Deadline Banner */}
      <div className="mb-4">
        <DeadlineBanner days={score.daysUntilDeadline} lang={lang} />
      </div>

      {/* Methodology */}
      <div className="mb-6">
        <Methodology lang={lang} collapsed={methodologyCollapsed} onToggle={() => setMethodologyCollapsed(!methodologyCollapsed)} />
      </div>

      {/* Score Overview */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Score Ring */}
        <Card className="!p-6 flex flex-col items-center justify-center">
          <ScoreRing score={score.overall} label={lang === 'de' ? 'Bereitschaft' : 'Readiness'} />
          <p className="mt-4 text-xs text-ink-tertiary text-center tabular-nums">
            {score.answeredCount}/{score.totalCount} {lang === 'de' ? 'beantwortet' : 'answered'}
          </p>
          <p className="text-[10px] text-ink-tertiary/60 text-center mt-1">
            {lang === 'de' ? '(N/A-Fragen ausgeschlossen)' : '(N/A questions excluded)'}
          </p>
        </Card>

        {/* Category bars */}
        <div className="space-y-2">
          {sortedCategories.map(cat => {
            const catScore = score.categories.find(c => c.category === cat);
            if (!catScore) return null;
            return (
              <CategoryBar
                key={cat}
                catScore={catScore}
                meta={CATEGORY_META[cat]}
                label={categoryLabels[cat]}
                isActive={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                lang={lang}
              />
            );
          })}
        </div>
      </div>

      {/* Active Category Questions */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xl">{CATEGORY_META[activeCategory].icon}</span>
        <h2 className="text-base font-semibold text-ink">{categoryLabels[activeCategory]}</h2>
        {activeCatScore && (
          <Badge variant={activeCatScore.score >= 70 ? 'green' : activeCatScore.score >= 40 ? 'yellow' : 'red'}>
            {activeCatScore.score}%
          </Badge>
        )}
        {activeCatScore && activeCatScore.applicable - activeCatScore.answered > 0 && (
          <span className="text-xs text-amber-400">
            {activeCatScore.applicable - activeCatScore.answered} {lang === 'de' ? 'offen' : 'open'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {activeQuestions.map(q => (
          <QuestionRow
            key={q.key}
            question={q}
            answer={answers[q.key] || { status: 'unanswered' }}
            lang={lang}
            onAnswer={handleAnswer}
            saving={saving}
            loanSkipped={!!loanSkipped}
          />
        ))}
      </div>
    </div>
  );
}
