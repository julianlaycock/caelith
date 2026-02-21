/**
 * AIFMD II Readiness Assessment Service
 * 
 * Manages the structured readiness checklist, auto-populates answers
 * from existing platform data, and computes readiness scores.
 * 
 * IMPORTANT: This assessment is an orientation tool, NOT legal advice.
 * Results are non-binding. Users must consult qualified legal counsel.
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
  source: string;        // Legal reference (e.g., "Art. 20(1) AIFMD II")
  weight: number;        // 1-3, higher = more important
  autoCheck?: string;    // function name for auto-population
  dependsOn?: string;    // key of parent question (for conditional display)
}

export type ReadinessCategory = 'delegation' | 'liquidity' | 'reporting' | 'disclosure' | 'loan_origination' | 'governance';

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  // ── Delegation & Outsourcing ──
  {
    key: 'del_register',
    category: 'delegation',
    question_de: 'Führen Sie ein vollständiges Auslagerungsregister?',
    question_en: 'Do you maintain a complete outsourcing/delegation register?',
    hint_de: 'Alle ausgelagerten Funktionen müssen mit Dienstleister, Gegenstand, Laufzeit und Überwachungsmaßnahmen dokumentiert sein.',
    hint_en: 'All outsourced functions must be documented with provider, scope, duration, and monitoring measures.',
    source: 'Art. 20(1) AIFMD II; § 36 KAGB',
    weight: 3,
  },
  {
    key: 'del_due_diligence',
    category: 'delegation',
    question_de: 'Haben Sie Due-Diligence-Prozesse für Auslagerungspartner definiert?',
    question_en: 'Do you have due diligence processes defined for outsourcing partners?',
    hint_de: 'Auswahl, Bewertung und laufende Überwachung von Dienstleistern.',
    hint_en: 'Selection, evaluation, and ongoing monitoring of service providers.',
    source: 'Art. 20(2) AIFMD II',
    weight: 2,
  },
  {
    key: 'del_eu_substance',
    category: 'delegation',
    question_de: 'Sind mindestens zwei leitende Personen mit Sitz in der EU für Tagesgeschäftsentscheidungen verantwortlich?',
    question_en: 'Are at least two senior persons resident in the EU responsible for day-to-day decisions?',
    hint_de: 'Neue Substanzanforderung — gilt auch bei Delegation des Portfoliomanagements an Drittstaaten.',
    hint_en: 'New substance requirement — applies even when portfolio management is delegated to third countries.',
    source: 'Art. 8(1)(e) AIFMD II',
    weight: 3,
  },
  {
    key: 'del_subdelegation',
    category: 'delegation',
    question_de: 'Sind Weiterdelegationen (Subdelegation) dokumentiert und der Aufsicht meldbar?',
    question_en: 'Are sub-delegations documented and reportable to supervisory authorities?',
    hint_de: 'Aufsichtsbehörden können jederzeit Einblick in Subdelegationsketten fordern.',
    hint_en: 'Supervisory authorities can request insight into sub-delegation chains at any time.',
    source: 'Art. 20(4)-(6) AIFMD II',
    weight: 2,
  },
  {
    key: 'del_review_cycle',
    category: 'delegation',
    question_de: 'Gibt es regelmäßige Überprüfungszyklen für Auslagerungsvereinbarungen?',
    question_en: 'Do you have regular review cycles for outsourcing agreements?',
    hint_de: 'Mindestens jährliche Überprüfung empfohlen; bei wesentlichen Änderungen sofort.',
    hint_en: 'At least annual review recommended; immediately upon material changes.',
    source: 'Art. 20(3) AIFMD II',
    weight: 2,
  },

  // ── Liquidity Management ──
  {
    key: 'lmt_selected',
    category: 'liquidity',
    question_de: 'Haben Sie mindestens zwei Liquiditätsmanagement-Tools (LMTs) ausgewählt?',
    question_en: 'Have you selected at least two Liquidity Management Tools (LMTs)?',
    hint_de: 'Pflicht für offene AIFs. Mögliche Tools: Redemption Gates, Swing Pricing, Side Pockets, Rücknahmeaussetzung.',
    hint_en: 'Mandatory for open-ended AIFs. Options include: redemption gates, swing pricing, side pockets, suspension of redemptions.',
    source: 'Art. 16(2a)-(2d) AIFMD II; RTS (ESMA, bis Apr. 2026)',
    weight: 3,
    autoCheck: 'checkLmtCount',
  },
  {
    key: 'lmt_activation_rules',
    category: 'liquidity',
    question_de: 'Sind Aktivierungsregeln und Schwellenwerte für Ihre LMTs definiert?',
    question_en: 'Are activation rules and thresholds defined for your LMTs?',
    hint_de: 'Dokumentierte Kriterien, wann welches Tool aktiviert wird.',
    hint_en: 'Documented criteria for when each tool is activated.',
    source: 'Art. 16(2b) AIFMD II',
    weight: 3,
  },
  {
    key: 'lmt_investor_communication',
    category: 'liquidity',
    question_de: 'Haben Sie einen Kommunikationsprozess für LMT-Aktivierungen gegenüber Anlegern und Aufsicht?',
    question_en: 'Do you have a communication process for LMT activations towards investors and regulators?',
    hint_de: 'Anleger und zuständige Behörde müssen informiert werden.',
    hint_en: 'Investors and the competent authority must be notified.',
    source: 'Art. 16(2c) AIFMD II',
    weight: 2,
  },
  {
    key: 'lmt_stress_testing',
    category: 'liquidity',
    question_de: 'Führen Sie regelmäßige Liquiditäts-Stresstests durch?',
    question_en: 'Do you conduct regular liquidity stress tests?',
    hint_de: 'Mindestens jährlich; bei Marktturbulenzen häufiger.',
    hint_en: 'At least annually; more frequently during market turbulence.',
    source: 'Art. 16(1) AIFMD II; Art. 15(3)(b) AIFMD',
    weight: 2,
  },

  // ── Reporting ──
  {
    key: 'rep_annex_iv',
    category: 'reporting',
    question_de: 'Können Sie Annex IV Reports fristgerecht und vollständig generieren?',
    question_en: 'Can you generate Annex IV reports on time and in full?',
    hint_de: 'Quartalsmeldung an BaFin/NCA. Prüfen Sie: Sind alle Datenfelder befüllt, Prozesse definiert?',
    hint_en: 'Quarterly reporting to BaFin/NCA. Check: Are all data fields populated, processes defined?',
    source: 'Art. 24 AIFMD; Annex IV (erweitert durch AIFMD II)',
    weight: 3,
    autoCheck: 'checkAnnexIv',
  },
  {
    key: 'rep_bafin_annual',
    category: 'reporting',
    question_de: 'Ist Ihr BaFin-Jahresberichtsprozess dokumentiert und terminiert?',
    question_en: 'Is your BaFin annual reporting process documented and scheduled?',
    source: 'Art. 22 AIFMD; § 38 KAGB',
    weight: 2,
  },
  {
    key: 'rep_data_quality',
    category: 'reporting',
    question_de: 'Haben Sie klare Verantwortlichkeiten für Datenlieferung und -qualität?',
    question_en: 'Do you have clear responsibilities for data delivery and quality?',
    hint_de: 'Wer liefert welche Daten, wie oft, in welchem Format? Wer prüft die Qualität?',
    hint_en: 'Who delivers which data, how often, in which format? Who checks quality?',
    source: 'Art. 24(5) AIFMD II',
    weight: 2,
  },
  {
    key: 'rep_esma_readiness',
    category: 'reporting',
    question_de: 'Bereiten Sie sich auf die neuen ESMA-Reportingstandards (ITS/RTS) vor?',
    question_en: 'Are you preparing for the new ESMA reporting standards (ITS/RTS)?',
    hint_de: 'Neue technische Standards werden bis April 2027 finalisiert. Frühzeitige Vorbereitung empfohlen.',
    hint_en: 'New technical standards expected by April 2027. Early preparation recommended.',
    source: 'Art. 24 AIFMD II; ESMA RTS/ITS (Entwurf)',
    weight: 1,
  },

  // ── Investor Disclosure ──
  {
    key: 'dis_cost_transparency',
    category: 'disclosure',
    question_de: 'Legen Sie alle Gebühren, Kosten und deren Empfänger detailliert offen?',
    question_en: 'Do you disclose all fees, costs, and their recipients in detail?',
    hint_de: 'Verwaltungsgebühren, Performance Fees, Transaktionskosten, Kosten Dritter — aufgeschlüsselt nach Empfänger.',
    hint_en: 'Management fees, performance fees, transaction costs, third-party costs — broken down by recipient.',
    source: 'Art. 23(1)(a)-(b) AIFMD II',
    weight: 3,
  },
  {
    key: 'dis_precontractual',
    category: 'disclosure',
    question_de: 'Sind Ihre vorvertraglichen Anlegerinformationen AIFMD-II-konform aktualisiert?',
    question_en: 'Are your pre-contractual investor disclosures updated to AIFMD II standards?',
    hint_de: 'Erweiterte Offenlegungspflichten zu Strategie, Risiken, Kosten und LMTs.',
    hint_en: 'Enhanced disclosure requirements on strategy, risks, costs, and LMTs.',
    source: 'Art. 23(1) AIFMD II',
    weight: 2,
  },
  {
    key: 'dis_lmt_info',
    category: 'disclosure',
    question_de: 'Informieren Sie Anleger über verfügbare Liquiditätsmanagement-Tools?',
    question_en: 'Do you inform investors about available Liquidity Management Tools?',
    hint_de: 'Welche LMTs sind für welche Fonds verfügbar und unter welchen Bedingungen?',
    hint_en: 'Which LMTs are available for which funds and under what conditions?',
    source: 'Art. 23(1)(a) AIFMD II (neu)',
    weight: 2,
  },
  {
    key: 'dis_fund_structure',
    category: 'disclosure',
    question_de: 'Ist die vollständige Fondsstruktur (auch bei komplexen Vehikeln) offengelegt?',
    question_en: 'Is the complete fund structure disclosed (including complex vehicles)?',
    hint_de: 'Master-Feeder, Dachfonds, Zweckgesellschaften — vollständige Strukturtransparenz.',
    hint_en: 'Master-feeder, fund-of-funds, SPVs — full structural transparency.',
    source: 'Art. 23(1)(f) AIFMD II',
    weight: 2,
  },

  // ── Loan Origination ──
  {
    key: 'loan_applicable',
    category: 'loan_origination',
    question_de: 'Vergeben Ihre AIFs direkt Kredite?',
    question_en: 'Do your AIFs directly originate loans?',
    hint_de: 'Falls nein, wählen Sie "N/A" — die weiteren Fragen in diesem Bereich werden automatisch übersprungen.',
    hint_en: 'If no, select "N/A" — the remaining questions in this area will be automatically skipped.',
    source: 'Art. 15a-15e AIFMD II (neu)',
    weight: 1,
  },
  {
    key: 'loan_retention',
    category: 'loan_origination',
    question_de: 'Halten Sie 5% des Kreditvolumens im Fonds (Skin in the Game)?',
    question_en: 'Do you retain 5% of loan volume in the fund (skin in the game)?',
    hint_de: 'Selbstbehalt verhindert "Originate-to-distribute"-Modelle.',
    hint_en: 'Retention prevents "originate-to-distribute" models.',
    source: 'Art. 15b(1) AIFMD II',
    weight: 2,
    dependsOn: 'loan_applicable',
  },
  {
    key: 'loan_concentration',
    category: 'loan_origination',
    question_de: 'Ist die Kreditvergabe an einzelne Kreditnehmer auf 20% des Fondsvermögens begrenzt?',
    question_en: 'Is lending to individual borrowers limited to 20% of fund assets?',
    hint_de: 'Klumpenrisiko-Begrenzung für Kreditfonds.',
    hint_en: 'Concentration risk limit for loan-originating funds.',
    source: 'Art. 15d AIFMD II',
    weight: 2,
    dependsOn: 'loan_applicable',
  },

  // ── Governance & Implementation ──
  {
    key: 'gov_gap_analysis',
    category: 'governance',
    question_de: 'Haben Sie eine systematische AIFMD II Gap-Analyse durchgeführt?',
    question_en: 'Have you conducted a systematic AIFMD II gap analysis?',
    hint_de: 'Dieses Assessment unterstützt Sie dabei — es ersetzt jedoch keine vollständige rechtliche Prüfung.',
    hint_en: 'This assessment supports you — however, it does not replace a full legal review.',
    source: 'Best Practice (PwC, KPMG, Deloitte Empfehlung)',
    weight: 3,
    autoCheck: 'checkGapAnalysis',
  },
  {
    key: 'gov_project_team',
    category: 'governance',
    question_de: 'Gibt es ein Projektteam mit klaren Rollen und verbindlichem Zeitplan für die Umsetzung?',
    question_en: 'Is there a project team with clear roles and a binding timeline for implementation?',
    source: 'Best Practice; BaFin MaRisk AT 8.2',
    weight: 2,
  },
  {
    key: 'gov_regulatory_monitoring',
    category: 'governance',
    question_de: 'Verfolgen Sie laufend regulatorische Entwicklungen (RTS, FoMaStG, ESMA)?',
    question_en: 'Do you continuously monitor regulatory developments (RTS, FoMaStG, ESMA)?',
    hint_de: 'Caelith Compliance Calendar trackt Fristen automatisch — bitte verifizieren Sie, dass Ihre internen Prozesse ebenso abgedeckt sind.',
    hint_en: 'Caelith Compliance Calendar tracks deadlines automatically — please verify that your internal processes are equally covered.',
    source: 'Best Practice; BaFin MaRisk AT 4.3.2',
    weight: 2,
    autoCheck: 'checkCalendar',
  },
  {
    key: 'gov_kyc_current',
    category: 'governance',
    question_de: 'Sind alle Investoren-KYC-Dokumente aktuell?',
    question_en: 'Are all investor KYC documents current?',
    hint_de: 'Abgelaufene oder ausstehende KYC-Dokumente sind ein Compliance-Risiko.',
    hint_en: 'Expired or pending KYC documents are a compliance risk.',
    source: 'Art. 23(4) AIFMD II; § 10 GwG',
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
  auto?: boolean;        // true if auto-populated from platform data
  needsVerification?: boolean;  // true if auto-detected but should be manually confirmed
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
  applicable: number;     // total minus N/A
  score: number;          // 0-100
  maxScore: number;
  weightedScore: number;
}

export interface ReadinessScore {
  overall: number;        // 0-100
  categories: CategoryScore[];
  answeredCount: number;
  totalCount: number;
  applicableCount: number;
  daysUntilDeadline: number;
}

function computeScore(questions: ReadinessQuestion[], answers: Map<string, ReadinessAnswer>): ReadinessScore {
  const deadline = new Date('2026-04-16');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Check if loan_applicable is N/A or No — skip dependent questions
  const loanAnswer = answers.get('loan_applicable');
  const loanSkipped = loanAnswer && (loanAnswer.status === 'na' || loanAnswer.status === 'no');

  const categories = Object.keys(CATEGORY_META) as ReadinessCategory[];
  const categoryScores: CategoryScore[] = [];
  let totalWeightedScore = 0;
  let totalMaxScore = 0;
  let answeredCount = 0;
  let applicableCount = 0;

  for (const cat of categories) {
    const catQuestions = questions.filter(q => q.category === cat);
    let catScore = 0;
    let catMax = 0;
    let catAnswered = 0;
    let catApplicable = 0;

    for (const q of catQuestions) {
      // Skip dependent loan questions if loan not applicable
      if (q.dependsOn === 'loan_applicable' && loanSkipped) {
        continue;
      }

      const ans = answers.get(q.key);
      const isNa = ans && ans.status === 'na';

      if (!isNa) {
        catMax += q.weight * 100;
        catApplicable++;
        applicableCount++;
      }

      if (ans && ans.status !== 'unanswered') {
        catAnswered++;
        answeredCount++;
        if (ans.status === 'yes') catScore += q.weight * 100;
        else if (ans.status === 'partial') catScore += q.weight * 50;
        // 'no' = 0, 'na' = excluded from max
      }
    }

    const score = catMax > 0 ? Math.round((catScore / catMax) * 100) : 100; // 100 if all N/A
    categoryScores.push({
      category: cat,
      answered: catAnswered,
      total: catQuestions.length,
      applicable: catApplicable,
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
    applicableCount,
    daysUntilDeadline,
  };
}

// ─── Auto-Check Functions (conservative — always "partial" + needsVerification) ──

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
      status: totalLmts >= 2 ? 'partial' : 'no',
      notes: totalLmts >= 2
        ? `${totalLmts} LMT(s) in Fondsdaten erkannt. Bitte bestätigen Sie, dass Aktivierungsregeln und Dokumentation vollständig sind.`
        : `${totalLmts} LMT(s) konfiguriert. AIFMD II erfordert mindestens 2 für offene AIFs.`,
      auto: true,
      needsVerification: totalLmts >= 2,
    });

    // Check Annex IV capability — conservative: having data ≠ having process
    const fundCount = lmtRows.length;
    results.set('rep_annex_iv', {
      status: fundCount > 0 ? 'partial' : 'no',
      notes: fundCount > 0
        ? `${fundCount} Fondsstruktur(en) vorhanden. Bitte bestätigen Sie, dass der Reporting-Prozess dokumentiert und termingerecht abläuft.`
        : 'Keine Fondsstrukturen angelegt.',
      auto: true,
      needsVerification: fundCount > 0,
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
    const totalInvestors = parseInt(kyc?.total || '0');
    results.set('gov_kyc_current', {
      status: expiredCount === 0 && pendingCount === 0 ? 'partial' : 'no',
      notes: expiredCount === 0 && pendingCount === 0
        ? `${totalInvestors} Investoren, alle KYC-Daten aktuell. Bitte verifizieren Sie die Vollständigkeit der Dokumente.`
        : `${totalInvestors} Investoren. ${expiredCount} abgelaufen, ${pendingCount} ausstehend. Handlungsbedarf.`,
      auto: true,
      needsVerification: expiredCount === 0 && pendingCount === 0,
    });

    // Gap analysis — partial, not yes. Opening a checklist ≠ completing a gap analysis.
    results.set('gov_gap_analysis', {
      status: 'partial',
      notes: 'Assessment begonnen. Bitte alle Bereiche durchgehen und mit Rechtsberater besprechen.',
      auto: true,
      needsVerification: true,
    });

    // Calendar / regulatory monitoring — partial, platform helps but doesn't replace process
    results.set('gov_regulatory_monitoring', {
      status: 'partial',
      notes: 'Caelith Compliance Calendar aktiv. Bitte bestätigen Sie, dass interne Monitoring-Prozesse ebenfalls bestehen.',
      auto: true,
      needsVerification: true,
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

  // 4. Auto-set dependent loan questions to N/A if loan not applicable
  const loanAnswer = mergedAnswers.get('loan_applicable');
  if (loanAnswer && (loanAnswer.status === 'na' || loanAnswer.status === 'no')) {
    for (const q of READINESS_QUESTIONS) {
      if (q.dependsOn === 'loan_applicable' && !savedAnswers.has(q.key)) {
        mergedAnswers.set(q.key, { status: 'na', notes: 'Automatisch übersprungen — Kreditvergabe nicht anwendbar.', auto: true });
      }
    }
  }

  // 5. Compute score
  const score = computeScore(READINESS_QUESTIONS, mergedAnswers);

  // 6. Convert to record
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

  // Clear needsVerification and auto flags when user manually answers
  const cleanAnswer: ReadinessAnswer = {
    status: answer.status,
    notes: answer.notes,
    auto: false,
    needsVerification: false,
  };

  await execute(
    `INSERT INTO aifmd_readiness (tenant_id, category, question_key, answer, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (tenant_id, question_key)
     DO UPDATE SET answer = $4, updated_by = $5, updated_at = now()`,
    [tenantId, question.category, questionKey, JSON.stringify(cleanAnswer), userId || null]
  );
}

export async function getReadinessScore(tenantId: string): Promise<ReadinessScore> {
  const { score } = await getReadinessAssessment(tenantId);
  return score;
}
