/**
 * AIFMD II Readiness Assessment Routes
 */

import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { getReadinessAssessment, saveReadinessAnswer, getReadinessScore, READINESS_QUESTIONS, CATEGORY_META, type ReadinessCategory, type ReadinessAnswer } from '../services/readiness-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { DEFAULT_TENANT_ID } from '../db.js';

const BRAND = {
  header: '#24364A',
  accent: '#D8BA8E',
  bg: '#F2EFE0',
  ink: '#2D2722',
  inkSecondary: '#5A524B',
  inkTertiary: '#6E655D',
  success: '#3D6658',
  warning: '#9C6E2D',
  danger: '#8A4A45',
  white: '#FFFFFF',
};

const router = Router();

// GET /api/readiness — full assessment (questions + answers + score)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const result = await getReadinessAssessment(tenantId);
  res.json(result);
}));

// GET /api/readiness/score — score only (for dashboard card)
router.get('/score', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const score = await getReadinessScore(tenantId);
  res.json(score);
}));

// PUT /api/readiness/:questionKey — save/update one answer
router.put('/:questionKey', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const { questionKey } = req.params;
  const { status, notes } = req.body;

  if (!['yes', 'no', 'partial', 'na'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: yes, no, partial, na' });
  }

  await saveReadinessAnswer(tenantId, questionKey, { status, notes }, (req as any).userId);
  const result = await getReadinessAssessment(tenantId);
  res.json(result);
}));

// GET /api/readiness/export — PDF export
router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const lang = (req.query.lang === 'de' ? 'de' : 'en') as 'de' | 'en';
  const { questions, answers, score } = await getReadinessAssessment(tenantId);

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="AIFMD-II-Readiness-${new Date().toISOString().slice(0, 10)}.pdf"`);
  doc.pipe(res);

  const pw = doc.page.width - 100; // page width minus margins

  // ── Header ──
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND.header);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND.white)
    .text('AIFMD II Readiness Assessment', 50, 25, { width: pw });
  doc.font('Helvetica').fontSize(9).fillColor(BRAND.accent)
    .text(lang === 'de'
      ? `Erstellt am ${new Date().toLocaleDateString('de-DE')} · Caelith Compliance Platform`
      : `Generated on ${new Date().toLocaleDateString('en-GB')} · Caelith Compliance Platform`,
      50, 52, { width: pw });

  doc.moveDown(2);
  let y = 100;

  // ── Legal Disclaimer ──
  doc.rect(50, y, pw, 50).lineWidth(0.5).strokeColor(BRAND.warning).fillAndStroke('#FFF8F0', BRAND.warning);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.warning)
    .text(lang === 'de' ? 'RECHTLICHER HINWEIS' : 'LEGAL NOTICE', 58, y + 8, { width: pw - 16 });
  doc.font('Helvetica').fontSize(7).fillColor(BRAND.inkSecondary)
    .text(lang === 'de'
      ? 'Dieses Assessment dient als Orientierungshilfe und ersetzt keine rechtliche Beratung. Die Ergebnisse sind nicht rechtsverbindlich und stellen keine Garantie für die AIFMD-II-Konformität dar. Konsultieren Sie Ihren Compliance-Beauftragten oder Rechtsberater.'
      : 'This assessment serves as an orientation tool and does not constitute legal advice. Results are non-binding and do not guarantee AIFMD II compliance. Consult your compliance officer or legal counsel.',
      58, y + 20, { width: pw - 16 });
  y += 60;

  // ── Deadline + Overall Score ──
  doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.ink)
    .text(lang === 'de' ? 'Gesamtbewertung' : 'Overall Assessment', 50, y);
  y += 18;

  const scoreColor = score.overall >= 70 ? BRAND.success : score.overall >= 40 ? BRAND.warning : BRAND.danger;
  doc.font('Helvetica-Bold').fontSize(28).fillColor(scoreColor)
    .text(`${score.overall}%`, 50, y);
  doc.font('Helvetica').fontSize(9).fillColor(BRAND.inkSecondary)
    .text(lang === 'de'
      ? `${score.answeredCount} von ${score.totalCount} Fragen beantwortet · ${score.daysUntilDeadline} Tage bis zur Umsetzungsfrist (16. April 2026)`
      : `${score.answeredCount} of ${score.totalCount} questions answered · ${score.daysUntilDeadline} days until transposition deadline (April 16, 2026)`,
      130, y + 8, { width: pw - 80 });
  y += 45;

  // ── Category Summary Table ──
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.ink)
    .text(lang === 'de' ? 'Kategorie-Übersicht' : 'Category Overview', 50, y);
  y += 16;

  const catOrder = Object.entries(CATEGORY_META).sort(([, a], [, b]) => a.order - b.order);
  const colWidths = [pw * 0.4, pw * 0.15, pw * 0.15, pw * 0.3];

  // Table header
  doc.rect(50, y, pw, 16).fill('#E8E4DC');
  doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.inkSecondary);
  doc.text(lang === 'de' ? 'Kategorie' : 'Category', 55, y + 4, { width: colWidths[0] });
  doc.text(lang === 'de' ? 'Beantwortet' : 'Answered', 55 + colWidths[0], y + 4, { width: colWidths[1], align: 'center' });
  doc.text('Score', 55 + colWidths[0] + colWidths[1], y + 4, { width: colWidths[2], align: 'center' });
  doc.text('Status', 55 + colWidths[0] + colWidths[1] + colWidths[2], y + 4, { width: colWidths[3], align: 'center' });
  y += 18;

  for (const [catKey, catMeta] of catOrder) {
    const catScore = score.categories.find(c => c.category === catKey);
    if (!catScore) continue;
    const label = lang === 'de' ? catMeta.label_de : catMeta.label_en;
    const sColor = catScore.score >= 70 ? BRAND.success : catScore.score >= 40 ? BRAND.warning : BRAND.danger;
    const statusText = catScore.score >= 70
      ? (lang === 'de' ? 'Gut' : 'Good')
      : catScore.score >= 40
        ? (lang === 'de' ? 'Teilweise' : 'Partial')
        : (lang === 'de' ? 'Handlungsbedarf' : 'Action needed');

    if (y % 2 === 0) doc.rect(50, y, pw, 16).fill('#F7F5F0');
    doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink)
      .text(`${catMeta.icon} ${label}`, 55, y + 4, { width: colWidths[0] });
    doc.fillColor(BRAND.inkSecondary)
      .text(`${catScore.answered}/${catScore.total}`, 55 + colWidths[0], y + 4, { width: colWidths[1], align: 'center' });
    doc.font('Helvetica-Bold').fillColor(sColor)
      .text(`${catScore.score}%`, 55 + colWidths[0] + colWidths[1], y + 4, { width: colWidths[2], align: 'center' });
    doc.font('Helvetica').fillColor(sColor)
      .text(statusText, 55 + colWidths[0] + colWidths[1] + colWidths[2], y + 4, { width: colWidths[3], align: 'center' });
    y += 18;
  }

  y += 10;

  // ── Detailed Questions per Category ──
  for (const [catKey, catMeta] of catOrder) {
    const catQuestions = questions.filter(q => q.category === catKey);
    const label = lang === 'de' ? catMeta.label_de : catMeta.label_en;

    // Check if we need a new page
    if (y > doc.page.height - 150) {
      doc.addPage();
      y = 50;
    }

    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.header)
      .text(`${catMeta.icon} ${label}`, 50, y);
    y += 16;

    for (const q of catQuestions) {
      const answer = answers[q.key] as ReadinessAnswer || { status: 'unanswered' };
      const qText = lang === 'de' ? q.question_de : q.question_en;

      // Check page break
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      // Status indicator
      const statusIcon = answer.status === 'yes' ? '✓' : answer.status === 'partial' ? '◐' : answer.status === 'no' ? '✗' : answer.status === 'na' ? '—' : '○';
      const statusColor = answer.status === 'yes' ? BRAND.success : answer.status === 'partial' ? BRAND.warning : answer.status === 'no' ? BRAND.danger : BRAND.inkTertiary;

      doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor)
        .text(statusIcon, 55, y, { width: 12 });
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink)
        .text(qText, 72, y, { width: pw - 30 });
      y += 14;

      // Source reference
      doc.font('Helvetica').fontSize(6.5).fillColor(BRAND.inkTertiary)
        .text(`📖 ${q.source}`, 72, y, { width: pw - 30 });
      y += 10;

      // Notes if present
      if (answer.notes) {
        doc.font('Helvetica-Oblique').fontSize(7).fillColor(BRAND.inkSecondary)
          .text(answer.notes, 72, y, { width: pw - 30 });
        y += 12;
      }

      y += 4;
    }

    y += 8;
  }

  // ── Footer on every page ──
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 30;
    doc.font('Helvetica').fontSize(6.5).fillColor(BRAND.inkTertiary)
      .text(
        lang === 'de'
          ? `Caelith Compliance Platform · Erstellt am ${new Date().toLocaleDateString('de-DE')} · Seite ${i + 1} von ${pageCount} · Dieses Dokument ist nicht rechtsverbindlich.`
          : `Caelith Compliance Platform · Generated on ${new Date().toLocaleDateString('en-GB')} · Page ${i + 1} of ${pageCount} · This document is non-binding.`,
        50, bottom, { width: pw, align: 'center' }
      );
  }

  doc.end();
}));

export default router;
