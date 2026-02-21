'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  ErrorMessage,
} from '../../components/ui';
import { classNames } from '../../lib/utils';
import type { ReadinessQuestion, ReadinessAnswer, ReadinessCategory } from '../../lib/types';

// ─── Category config ─────────────────────────────────────────────────

const CATEGORY_META: Record<ReadinessCategory, { icon: string; order: number }> = {
  delegation:       { icon: '🤝', order: 1 },
  liquidity:        { icon: '📉', order: 2 },
  reporting:        { icon: '📊', order: 3 },
  disclosure:       { icon: '🛡️', order: 4 },
  loan_origination: { icon: '💳', order: 5 },
  governance:       { icon: '⚙️', order: 6 },
};

const STATUS_CONFIG = {
  yes:        { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label_de: 'Ja', label_en: 'Yes', ring: 'ring-emerald-500/30' },
  partial:    { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label_de: 'Teilweise', label_en: 'Partial', ring: 'ring-amber-500/30' },
  no:         { color: 'bg-red-500/20 text-red-400 border-red-500/30', label_de: 'Nein', label_en: 'No', ring: 'ring-red-500/30' },
  na:         { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label_de: 'N/A', label_en: 'N/A', ring: 'ring-gray-500/30' },
  unanswered: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label_de: 'Offen', label_en: 'Open', ring: '' },
};

// ─── Score Ring (compact, reused from dashboard pattern) ─────────────

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#6ee7b7' : score >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-edge" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold tabular-nums text-ink">{score}%</span>
      </div>
      <span className="text-xs font-medium text-ink-tertiary mt-1">{label}</span>
    </div>
  );
}

// ─── Question Row ────────────────────────────────────────────────────

function QuestionRow({ 
  question, answer, lang, onAnswer, saving
}: { 
  question: ReadinessQuestion; 
  answer: ReadinessAnswer; 
  lang: 'de' | 'en';
  onAnswer: (key: string, status: string) => void;
  saving: string | null;
}) {
  const questionText = lang === 'de' ? question.question_de : question.question_en;
  const hintText = lang === 'de' ? question.hint_de : question.hint_en;
  const isSaving = saving === question.key;
  const statuses = ['yes', 'partial', 'no', 'na'] as const;

  return (
    <div className={classNames(
      'group rounded-xl border p-4 transition-all',
      answer.status === 'unanswered' ? 'border-edge bg-bg-secondary opacity-80 hover:opacity-100' :
      answer.status === 'yes' ? 'border-emerald-500/20 bg-emerald-500/5' :
      answer.status === 'no' ? 'border-red-500/20 bg-red-500/5' :
      answer.status === 'partial' ? 'border-amber-500/20 bg-amber-500/5' :
      'border-edge bg-bg-secondary'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink">{questionText}</p>
            {answer.auto && (
              <span className="inline-flex items-center rounded-full bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-400">
                Auto
              </span>
            )}
            {Array.from({ length: question.weight }).map((_, i) => (
              <span key={i} className="text-[10px] text-amber-400">●</span>
            ))}
          </div>
          {hintText && (
            <p className="mt-1 text-xs text-ink-tertiary">{hintText}</p>
          )}
          {answer.notes && (
            <p className="mt-1.5 text-xs text-ink-secondary italic">{answer.notes}</p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5">
          {statuses.map(s => {
            const cfg = STATUS_CONFIG[s];
            const isActive = answer.status === s;
            const label = lang === 'de' ? cfg.label_de : cfg.label_en;
            return (
              <button
                key={s}
                onClick={() => onAnswer(question.key, s)}
                disabled={isSaving}
                className={classNames(
                  'rounded-lg px-2.5 py-1 text-xs font-medium border transition-all',
                  isActive ? `${cfg.color} ${cfg.ring} ring-1` : 'border-transparent text-ink-tertiary hover:text-ink hover:bg-bg-tertiary'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ────────────────────────────────────────────────

function CategorySection({
  category, questions, answers, lang, score, onAnswer, saving
}: {
  category: ReadinessCategory;
  questions: ReadinessQuestion[];
  answers: Record<string, ReadinessAnswer>;
  lang: 'de' | 'en';
  score: number;
  onAnswer: (key: string, status: string) => void;
  saving: string | null;
}) {
  const { t } = useI18n();
  const meta = CATEGORY_META[category];
  const catLabel = t(`readiness.cat.${category}`);
  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <h2 className="text-sm font-semibold text-ink">{catLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-edge overflow-hidden">
            <div
              className={classNames('h-full rounded-full transition-all duration-500',
                score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={classNames('text-xs font-bold tabular-nums', scoreColor)}>{score}%</span>
        </div>
      </div>
      <div className="space-y-2">
        {questions.map(q => (
          <QuestionRow
            key={q.key}
            question={q}
            answer={answers[q.key] || { status: 'unanswered' }}
            lang={lang}
            onAnswer={onAnswer}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function ReadinessPage() {
  const { t, locale } = useI18n();
  const lang = (locale === 'de' ? 'de' : 'en') as 'de' | 'en';
  const [saving, setSaving] = useState<string | null>(null);

  const assessmentData = useAsync(() => api.getReadinessAssessment(), []);

  const handleAnswer = useCallback(async (questionKey: string, status: AnswerStatus, notes?: string) => {
    setSaving(questionKey);
    try {
      const updated = await api.saveReadinessAnswer(questionKey, status, notes);
      assessmentData.setData(updated);
    } catch (err) {
      console.error('Failed to save answer', err);
    } finally {
      setSaving(null);
    }
  }, [assessmentData]);

  const categories = useMemo(() => {
    return (Object.keys(CATEGORY_META) as ReadinessCategory[])
      .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);
  }, []);

  if (assessmentData.loading) return <LoadingSpinner />;
  if (assessmentData.error) return <ErrorMessage message={assessmentData.error} onRetry={assessmentData.refetch} />;

  const data = assessmentData.data;
  if (!data) return null;

  const { questions, answers, score } = data;
  const categoryScoreMap = new Map(score.categories.map(c => [c.category, c]));

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{t('readiness.title')}</h1>
        <p className="text-sm text-ink-secondary">{t('readiness.subtitle')}</p>
      </div>

      {/* Score Overview */}
      <Card className="!p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <ScoreRing score={score.overall} size={130} label={t('readiness.overall')} />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className={classNames(
                'text-3xl font-bold tabular-nums',
                score.daysUntilDeadline <= 30 ? 'text-red-400' :
                score.daysUntilDeadline <= 90 ? 'text-amber-400' : 'text-ink'
              )}>
                {score.daysUntilDeadline}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{t('readiness.daysLeft')}</p>
                <p className="text-xs text-ink-tertiary">16. April 2026 — {t('readiness.transposition')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-ink-tertiary">
              <span>{score.answeredCount}/{score.totalCount} {t('readiness.answered')}</span>
              <span>●●● = {t('readiness.highWeight')}</span>
            </div>

            {/* Mini category bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(cat => {
                const catScore = categoryScoreMap.get(cat);
                const s = catScore?.score ?? 0;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs">{CATEGORY_META[cat].icon}</span>
                    <div className="flex-1 h-1 rounded-full bg-edge overflow-hidden">
                      <div
                        className={classNames('h-full rounded-full',
                          s >= 70 ? 'bg-emerald-400' : s >= 40 ? 'bg-amber-400' : 'bg-red-400'
                        )}
                        style={{ width: `${s}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-ink-tertiary w-7 text-right">{s}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Questions by category */}
      <div className="space-y-8">
        {categories.map(cat => {
          const catQuestions = questions.filter((q: ReadinessQuestion) => q.category === cat);
          const catScore = categoryScoreMap.get(cat)?.score ?? 0;
          return (
            <CategorySection
              key={cat}
              category={cat}
              questions={catQuestions}
              answers={answers}
              lang={lang}
              score={catScore}
              onAnswer={handleAnswer}
              saving={saving}
            />
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-8 rounded-xl border border-edge bg-bg-secondary p-4">
        <p className="text-xs text-ink-tertiary leading-relaxed">
          {t('readiness.footer')}
        </p>
      </div>
    </div>
  );
}
