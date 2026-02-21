/**
 * AIFMD II Readiness Assessment Service
 * 
 * Manages the structured readiness checklist, auto-populates answers
 * from existing platform data, and computes readiness scores.
 */

import { query, execute, queryInTenantContext } from '../db.js';
import { logger } from '../lib/logger.js';

// ─── Question Definitions ────────────────────────────────────────────

export interface ReadinessQuestion {
  key: string;
  category: ReadinessCategory;
  question_de: string;
  question_en: string;
  hint_de?: string;
  hint_en?: string;
  weight: number;        // 1-3, higher = more important
  autoCheck?: string;    // function name for auto-population
}

export type ReadinessCategory = 'delegation' | 'liquidity' | 'reporting' | 'disclosure' | 'loan_origination' | 'governance';

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  // ── Delegation & Outsourcing ──
  {
    key: 'del_register',
    category: 'delegation',
    question_de: 'Führen Sie ein vollständiges Auslagerungsregister?',
    question_en: 'Do you maintain a complete outsourcing/delegation register?',
    hint_de: 'AIFMD II verlangt lückenlose Dokumentation aller ausgelagerten Funktionen.',
    hint_en: 'AIFMD II requires complete documentation of all delegated functions.',
    weight: 3,
  },
  {
    key: 'del_due_diligence',
    category: 'delegation',
    question_de: 'Haben Sie Due-Diligence-Prozesse für Auslagerungspartner definiert?',
    question_en: 'Do you have due diligence processes defined for outsourcing partners?',
    weight: 2,
  },
  {
    key: 'del_eu_substance',
    category: 'delegation',
    question_de: 'Sind mindestens zwei leitende Personen mit Sitz in der EU für Tagesgeschäftsentscheidungen verantwortlich?',
    question_en: 'Are at least two senior persons resident in the EU responsible for day-to-day decisions?',
    hint_de: 'Neue Substanzanforderung der AIFMD II.',
    hint_en: 'New substance requirement under AIFMD II.',
    weight: 3,
  },
  {
    key: 'del_subdelegation',
    category: 'delegation',
    question_de: 'Sind Weiterdelegationen (Subdelegation) dokumentiert und der Aufsicht meldbar?',
    question_en: 'Are sub-delegations documented and reportable to supervisory authorities?',
    weight: 2,
  },
  {
    key: 'del_review_cycle',
    category: 'delegation',
    question_de: 'Gibt es regelmäßige Überprüfungszyklen für Auslagerungsvereinbarungen?',
    question_en: 'Do you have regular review cycles for outsourcing agreements?',
    weight: 2,
  },

  // ── Liquidity Management ──
  {
    key: 'lmt_selected',
    category: 'liquidity',
    question_de: 'Haben Sie mindestens zwei Liquiditätsmanagement-Tools (LMTs) ausgewählt?',
    question_en: 'Have you selected at least two Liquidity Management Tools (LMTs)?',
    hint_de: 'Pflicht für offene AIFs unter AIFMD II.',
    hint_en: 'Mandatory for open-ended AIFs under AIFMD II.',
    weight: 3,
    autoCheck: 'checkLmtCount',
  },
  {
    key: 'lmt_activation_rules',
    category: 'liquidity',
    question_de: 'Sind Aktivierungsregeln und Schwellenwerte für Ihre LMTs definiert?',
    question_en: 'Are activation rules and thresholds defined for your LMTs?',
    weight: 3,
  },
  {
    key: 'lmt_investor_communication',
    category: 'liquidity',
    question_de: 'Haben Sie einen Kommunikationsprozess für LMT-Aktivierungen gegenüber Anlegern definiert?',
    question_en: 'Do you have a communication process for LMT activations towards investors?',
    weight: 2,
  },
  {
    key: 'lmt_stress_testing',
    category: 'liquidity',
    question_de: 'Führen Sie regelmäßige Liquiditäts-Stresstests durch?',
    question_en: 'Do you conduct regular liquidity stress tests?',
    weight: 2,
  },

  // ── Reporting ──
  {
    key: 'rep_annex_iv',
    category: 'reporting',
    question_de: 'Können Sie Annex IV Reports fristgerecht generieren?',
    question_en: 'Can you generate Annex IV reports on time?',
    weight: 3,
    autoCheck: 'checkAnnexIv',
  },
  {
    key: 'rep_bafin_annual',
    category: 'reporting',
    question_de: 'Ist Ihr BaFin-Jahresberichtsprozess dokumentiert?',
    question_en: 'Is your BaFin annual reporting process documented?',
    weight: 2,
  },
  {
    key: 'rep_data_quality',
    category: 'reporting',
    question_de: 'Haben Sie klare Verantwortlichkeiten für Datenlieferung und -qualität?',
    question_en: 'Do you have clear responsibilities for data delivery and quality?',
    hint_de: 'Wer liefert welche Daten, wie oft, in welchem Format?',
    hint_en: 'Who delivers which data, how often, in which format?',
    weight: 2,
  },
  {
    key: 'rep_esma_readiness',
    category: 'reporting',
    question_de: 'Bereiten Sie sich auf die neuen ESMA-Reportingstandards (ITS/RTS) vor?',
    question_en: 'Are you preparing for the new ESMA reporting standards (ITS/RTS)?',
    hint_de: 'Finalisierung erwartet bis April 2027.',
    hint_en: 'Expected to be finalized by April 2027.',
    weight: 1,
  },

  // ── Investor Disclosure ──
  {
    key: 'dis_cost_transparency',
    category: 'disclosure',
    question_de: 'Legen Sie alle Gebühren, Kosten und deren Empfänger detailliert offen?',
    question_en: 'Do you disclose all fees, costs, and their recipients in detail?',
    weight: 3,
  },
  {
    key: 'dis_precontractual',
    category: 'disclosure',
    question_de: 'Sind Ihre vorvertraglichen Anlegerinformationen AIFMD-II-konform?',
    question_en: 'Are your pre-contractual investor disclosures AIFMD II compliant?',
    weight: 2,
  },
  {
    key: 'dis_lmt_info',
    category: 'disclosure',
    question_de: 'Informieren Sie Anleger über verfügbare Liquiditätsmanagement-Tools?',
    question_en: 'Do you inform investors about available Liquidity Management Tools?',
    weight: 2,
  },
  {
    key: 'dis_fund_structure',
    category: 'disclosure',
    question_de: 'Ist die vollständige Fondsstruktur (auch bei komplexen Vehikeln) offengelegt?',
    question_en: 'Is the complete fund structure disclosed (including complex vehicles)?',
    weight: 2,
  },

  // ── Loan Origination ──
  {
    key: 'loan_applicable',
    category: 'loan_origination',
    question_de: 'Vergeben Ihre AIFs direkt Kredite?',
    question_en: 'Do your AIFs directly originate loans?',
    hint_de: 'Falls nein, ist dieser Bereich nicht relevant für Sie.',
    hint_en: 'If no, this area is not relevant for you.',
    weight: 1,
  },
  {
    key: 'loan_retention',
    category: 'loan_origination',
    question_de: 'Halten Sie 5% des Kreditvolumens im Fonds (Skin in the Game)?',
    question_en: 'Do you retain 5% of loan volume in the fund (skin in the game)?',
    weight: 2,
  },
  {
    key: 'loan_concentration',
    category: 'loan_origination',
    question_de: 'Ist die Kreditvergabe an einzelne Kreditnehmer auf 20% des Fondsvermögens begrenzt?',
    question_en: 'Is lending to individual borrowers limited to 20% of fund assets?',
    weight: 2,
  },

  // ── Governance & Implementation ──
  {
    key: 'gov_gap_analysis',
    category: 'governance',
    question_de: 'Haben Sie eine AIFMD II Gap-Analyse durchgeführt?',
    question_en: 'Have you conducted an AIFMD II gap analysis?',
    hint_de: 'Sie tun es gerade — gut gemacht.',
    hint_en: 'You\'re doing it right now — well done.',
    weight: 3,
    autoCheck: 'checkGapAnalysis',
  },
  {
    key: 'gov_project_team',
    category: 'governance',
    question_de: 'Gibt es ein Projektteam mit klaren Rollen und Zeitplan für die Umsetzung?',
    question_en: 'Is there a project team with clear roles and timeline for implementation?',
    weight: 2,
  },
  {
    key: 'gov_regulatory_monitoring',
    category: 'governance',
    question_de: 'Verfolgen Sie laufend regulatorische Entwicklungen (RTS, FoMaStG)?',
    question_en: 'Do you continuously monitor regulatory developments (RTS, FoMaStG)?',
    weight: 2,
    autoCheck: 'checkCalendar',
  },
  {
    key: 'gov_kyc_current',
    category: 'governance',
    question_de: 'Sind alle Investoren-KYC-Dokumente aktuell?',
    question_en: 'Are all investor KYC documents current?',
    weight: 3,
    autoCheck: 'checkKycStatus',
  },
];

// ─── Category Metadata ───────────────────────────────────────────────

export const CATEGORY_META: Record<ReadinessCategory, { label_de: string; label_en: string; icon: string; order: number }> = {
  delegation:      { label_de: 'Delegation & Auslagerung',    label_en: 'Delegation & Outsourcing',      icon: '🤝', order: 1 },
  liquidity:       { label_de: 'Liquiditätssteuerung',        label_en: 'Liquidity Management',           icon: '📉', order: 2 },
  reporting:       { label_de: 'Reporting & Meldewesen',      label_en: 'Reporting & Disclosure',         icon: '📊', order: 3 },
  disclosure:      { label_de: 'Anlegerinformation',          label_en: 'Investor Disclosure',            icon: '🛡️', order: 4 },
  loan_origination:{ label_de: 'Kreditvergabe',               label_en: 'Loan Origination',               icon: '💳', order: 5 },
  governance:      { label_de: 'Governance & Umsetzung',      label_en: 'Governance & Implementation',    icon: '⚙️', order: 6 },
};

// ─── Answer Types ────────────────────────────────────────────────────

export type AnswerStatus = 'yes' | 'no' | 'partial' | 'na' | 'unanswered';

export interface ReadinessAnswer {
  status: AnswerStatus;
  notes?: string;
  auto?: boolean;   // true if auto-populated from platform data
}

export interface ReadinessResponse {
  id: string;
  tenant_id: string;
  category: ReadinessCategory;
  question_key: string;
  answer: ReadinessAnswer;
  updated_by?: string;
  updated_at: string;
}

// ─── Score Computation ───────────────────────────────────────────────

export interface CategoryScore {
  category: ReadinessCategory;
  answered: number;
  total: number;
  score: number;       // 0-100
  maxScore: number;
  weightedScore: number;
}

export interface ReadinessScore {
  overall: number;     // 0-100
  categories: CategoryScore[];
  answeredCount: number;
  totalCount: number;
  daysUntilDeadline: number;
}

function computeScore(questions: ReadinessQuestion[], answers: Map<string, ReadinessAnswer>): ReadinessScore {
  const deadline = new Date('2026-04-16');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const categories = Object.keys(CATEGORY_META) as ReadinessCategory[];
  const categoryScores: CategoryScore[] = [];
  let totalWeightedScore = 0;
  let totalMaxScore = 0;
  let answeredCount = 0;

  for (const cat of categories) {
    const catQuestions = questions.filter(q => q.category === cat);
    let catScore = 0;
    let catMax = 0;
    let catAnswered = 0;

    for (const q of catQuestions) {
      const ans = answers.get(q.key);
      catMax += q.weight * 100;
      if (ans && ans.status !== 'unanswered') {
        catAnswered++;
        answeredCount++;
        if (ans.status === 'yes') catScore += q.weight * 100;
        else if (ans.status === 'partial') catScore += q.weight * 50;
        else if (ans.status === 'na') { catScore += q.weight * 100; catMax += 0; catMax -= q.weight * 100; catScore -= q.weight * 100; }
        // 'no' = 0 points
      }
    }

    const score = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
    categoryScores.push({
      category: cat,
      answered: catAnswered,
      total: catQuestions.length,
      score,
      maxScore: catMax,
      weightedScore: catScore,
    });
    totalWeightedScore += catScore;
    totalMaxScore += catMax;
  }

  return {
    overall: totalMaxScore > 0 ? Math.round((totalWeightedScore / totalMaxScore) * 100) : 0,
    categories: categoryScores,
    answeredCount,
    totalCount: questions.length,
    daysUntilDeadline,
  };
}

// ─── Auto-Check Functions ────────────────────────────────────────────

async function runAutoChecks(tenantId: string): Promise<Map<string, ReadinessAnswer>> {
  const results = new Map<string, ReadinessAnswer>();

  try {
    // Check LMT count across all funds
    const lmtRows = await queryInTenantContext<{ lmt_types: string | null }>(
      `SELECT lmt_types FROM fund_structures WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId], tenantId
    );
    let totalLmts = 0;
    for (const row of lmtRows) {
      const lmts = row.lmt_types ? (typeof row.lmt_types === 'string' ? JSON.parse(row.lmt_types) : row.lmt_types) : [];
      const activeLmts = Array.isArray(lmts) ? lmts.filter((l: any) => l.active).length : 0;
      totalLmts = Math.max(totalLmts, activeLmts);
    }
    results.set('lmt_selected', {
      status: totalLmts >= 2 ? 'yes' : totalLmts >= 1 ? 'partial' : 'no',
      notes: `${totalLmts} active LMT(s) configured across ${lmtRows.length} fund(s).`,
      auto: true,
    });

    // Check Annex IV capability (do we have fund structures?)
    const fundCount = lmtRows.length;
    results.set('rep_annex_iv', {
      status: fundCount > 0 ? 'yes' : 'no',
      notes: `${fundCount} fund structure(s) available for Annex IV reporting.`,
      auto: true,
    });

    // Check KYC status
    const kycRows = await queryInTenantContext<{ total: string; expired: string; pending: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE kyc_status = 'expired' OR (kyc_expiry IS NOT NULL AND kyc_expiry < CURRENT_DATE)) as expired,
        COUNT(*) FILTER (WHERE kyc_status = 'pending') as pending
       FROM investors WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId], tenantId
    );
    const kyc = kycRows[0];
    const expiredCount = parseInt(kyc?.expired || '0');
    const pendingCount = parseInt(kyc?.pending || '0');
    results.set('gov_kyc_current', {
      status: expiredCount === 0 && pendingCount === 0 ? 'yes' : expiredCount > 0 ? 'no' : 'partial',
      notes: `${kyc?.total || 0} investors. ${expiredCount} expired, ${pendingCount} pending.`,
      auto: true,
    });

    // Gap analysis — they're doing it right now
    results.set('gov_gap_analysis', {
      status: 'yes',
      notes: 'Conducted via Caelith AIFMD II Readiness Assessment.',
      auto: true,
    });

    // Calendar / regulatory monitoring
    results.set('gov_regulatory_monitoring', {
      status: 'yes',
      notes: 'Caelith Compliance Calendar tracks regulatory deadlines automatically.',
      auto: true,
    });

  } catch (err) {
    logger.error('Auto-check error', { error: err });
  }

  return results;
}

// ─── Public API ──────────────────────────────────────────────────────

export async function getReadinessAssessment(tenantId: string): Promise<{
  questions: ReadinessQuestion[];
  answers: Record<string, ReadinessAnswer>;
  score: ReadinessScore;
}> {
  // 1. Get saved answers
  const rows = await queryInTenantContext<ReadinessResponse>(
    `SELECT * FROM aifmd_readiness WHERE tenant_id = $1`,
    [tenantId], tenantId
  );

  const savedAnswers = new Map<string, ReadinessAnswer>();
  for (const row of rows) {
    savedAnswers.set(row.question_key, row.answer as ReadinessAnswer);
  }

  // 2. Run auto-checks for questions that support it
  const autoAnswers = await runAutoChecks(tenantId);

  // 3. Merge: saved answers take precedence over auto-checks
  const mergedAnswers = new Map<string, ReadinessAnswer>();
  for (const q of READINESS_QUESTIONS) {
    const saved = savedAnswers.get(q.key);
    const auto = autoAnswers.get(q.key);
    if (saved) {
      mergedAnswers.set(q.key, saved);
    } else if (auto) {
      mergedAnswers.set(q.key, auto);
    } else {
      mergedAnswers.set(q.key, { status: 'unanswered' });
    }
  }

  // 4. Compute score
  const score = computeScore(READINESS_QUESTIONS, mergedAnswers);

  // 5. Convert to record
  const answersRecord: Record<string, ReadinessAnswer> = {};
  mergedAnswers.forEach((v, k) => { answersRecord[k] = v; });

  return {
    questions: READINESS_QUESTIONS,
    answers: answersRecord,
    score,
  };
}

export async function saveReadinessAnswer(
  tenantId: string,
  questionKey: string,
  answer: ReadinessAnswer,
  userId?: string
): Promise<void> {
  const question = READINESS_QUESTIONS.find(q => q.key === questionKey);
  if (!question) throw new Error(`Unknown question: ${questionKey}`);

  await execute(
    `INSERT INTO aifmd_readiness (tenant_id, category, question_key, answer, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (tenant_id, question_key)
     DO UPDATE SET answer = $4, updated_by = $5, updated_at = now()`,
    [tenantId, question.category, questionKey, JSON.stringify(answer), userId || null]
  );
}

export async function getReadinessScore(tenantId: string): Promise<ReadinessScore> {
  const { score } = await getReadinessAssessment(tenantId);
  return score;
}
