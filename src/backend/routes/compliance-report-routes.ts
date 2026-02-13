import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { NotFoundError } from '../errors.js';
import { generateComplianceReport } from '../services/compliance-report-service.js';
import PDFDocument from 'pdfkit';

const router = Router();

async function loadReport(fundStructureId: string) {
  try {
    return await generateComplianceReport(fundStructureId);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      throw new NotFoundError('Fund structure', fundStructureId);
    }
    throw err;
  }
}

router.get('/compliance/:fundStructureId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { fundStructureId } = req.params;
  const report = await loadReport(fundStructureId);
  res.status(200).json(report);
}));

router.get('/compliance/:fundStructureId/pdf', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { fundStructureId } = req.params;
  const report = await loadReport(fundStructureId);

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${fundStructureId.substring(0, 8)}.pdf"`);
  doc.pipe(res);

  const C = {
    brand950: '#0B2E1F', brand600: '#16A34A', brand500: '#22C55E', brand200: '#BBF7D1',
    brand50: '#F0FDF6', ink: '#0F1D18', inkSec: '#4B6358', inkTert: '#7A9488',
    edge: '#D1DDD7', white: '#FFFFFF', red: '#DC2626', amber: '#F59E0B',
  };

  const W = 495;
  const L = 50;
  const now = new Date().toISOString().split('T')[0];

  doc.save();
  doc.rect(0, 0, doc.page.width, 80).fill(C.brand950);
  doc.rect(L, 68, 32, 2).fill(C.brand500);
  doc.fontSize(8).fillColor(C.brand200).text('CAELITH', L, 20, { characterSpacing: 3 });
  doc.fontSize(7).fillColor(C.brand200).text('COMPLIANCE REPORT', L, 32);
  doc.fontSize(7).fillColor(C.brand200).text(`Generated ${now}`, L, 20, { width: W, align: 'right' });
  doc.restore();

  let y = 100;
  const TOP_Y = 50;
  const BOTTOM_Y = 760;
  const ensureSpace = (neededHeight: number): void => {
    if (y + neededHeight > BOTTOM_Y) {
      doc.addPage();
      y = TOP_Y;
    }
  };
  doc.fontSize(18).fillColor(C.ink).text(report.fund.name, L, y);
  y += 26;
  doc.fontSize(9).fillColor(C.inkSec).text(
    `${report.fund.legal_form} · ${report.fund.domicile} · ${report.fund.regulatory_framework || 'N/A'} · Status: ${report.fund.status}`,
    L, y
  );

  y += 20;
  doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();

  y += 15;
  doc.fontSize(11).fillColor(C.ink).text('Key Metrics', L, y);
  y += 18;
  doc.fontSize(9).fillColor(C.inkSec);
  doc.text(`Total Investors: ${report.fund.total_investors}`, L, y);
  doc.text(`Assets: ${report.fund.assets.length}`, 200, y);
  doc.text(`Utilization: ${report.fund.utilization_pct.toFixed(1)}%`, 350, y);
  y += 14;
  doc.text(`Total Units: ${report.fund.total_aum_units.toLocaleString()}`, L, y);
  doc.text(`Allocated: ${report.fund.total_allocated_units.toLocaleString()}`, 200, y);
  doc.text(`Risk Flags: ${report.risk_flags.length}`, 350, y);

  if (report.risk_flags.length > 0) {
    y += 30;
    ensureSpace(32);
    doc.fontSize(11).fillColor(C.ink).text('Risk Flags', L, y);
    y += 18;
    for (const flag of report.risk_flags) {
      const flagText = `[${flag.severity.toUpperCase()}] ${flag.message}`;
      const lineHeight = doc.heightOfString(flagText, { width: 470 });
      ensureSpace(lineHeight + 8);
      const color = flag.severity === 'high' ? C.red : flag.severity === 'medium' ? C.amber : C.brand500;
      doc.circle(58, y + 4, 3).fill(color);
      doc.fontSize(8).fillColor(C.ink).text(flagText, 68, y, { width: 470 });
      y += lineHeight + 6;
    }
  }

  const drawAssetTableHeader = (): void => {
    ensureSpace(28);
    doc.fontSize(7).fillColor(C.inkTert);
    doc.text('Asset', L, y);
    doc.text('Type', 220, y);
    doc.text('Total', 300, y);
    doc.text('Allocated', 380, y);
    doc.text('Util %', 460, y);
    y += 12;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();
    y += 8;
  };

  y += 20;
  ensureSpace(40);
  doc.fontSize(11).fillColor(C.ink).text('Asset Breakdown', L, y);
  y += 18;
  drawAssetTableHeader();
  for (const asset of report.fund.assets) {
    ensureSpace(20);
    if (y === TOP_Y) drawAssetTableHeader();
    const utilPct = asset.total_units > 0 ? ((asset.allocated_units / asset.total_units) * 100).toFixed(1) : '0.0';
    doc.fontSize(8).fillColor(C.ink);
    doc.text(asset.name, L, y, { width: 165 }); doc.text(asset.asset_type, 220, y);
    doc.text(asset.total_units.toLocaleString(), 300, y); doc.text(asset.allocated_units.toLocaleString(), 380, y);
    doc.text(`${utilPct}%`, 460, y);
    y += 16;
  }

  const drawEligibilityTableHeader = (): void => {
    ensureSpace(28);
    doc.fontSize(7).fillColor(C.inkTert);
    doc.text('Type', L, y);
    doc.text('Jurisdiction', 140, y);
    doc.text('Min (EUR)', 230, y);
    doc.text('Suitability', 320, y);
    doc.text('Source', 400, y);
    y += 12;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();
    y += 8;
  };

  if (report.eligibility_criteria.length > 0) {
    y += 20;
    ensureSpace(40);
    doc.fontSize(11).fillColor(C.ink).text('Eligibility Criteria', L, y);
    y += 18;
    drawEligibilityTableHeader();
    for (const c of report.eligibility_criteria) {
      ensureSpace(20);
      if (y === TOP_Y) drawEligibilityTableHeader();
      doc.fontSize(8).fillColor(C.ink);
      doc.text(c.investor_type.replace('_', ' '), L, y, { width: 85 });
      doc.text(c.jurisdiction === '*' ? 'All' : c.jurisdiction, 140, y);
      doc.text(c.minimum_investment_eur > 0 ? `€${c.minimum_investment_eur.toLocaleString()}` : '—', 230, y);
      doc.text(c.suitability_required ? 'Required' : '—', 320, y);
      doc.text(c.source_reference || '—', 400, y, { width: 145 });
      y += 16;
    }
  }

  const writeInvestorSection = (heading: string, rows: string[]): void => {
    if (rows.length === 0) return;
    ensureSpace(20);
    doc.fontSize(8).fillColor(C.inkTert).text(heading, L, y);
    y += 14;

    for (const row of rows) {
      const lineHeight = doc.heightOfString(row, { width: W - 10 });
      if (y + lineHeight + 4 > BOTTOM_Y) {
        doc.addPage();
        y = TOP_Y;
        doc.fontSize(8).fillColor(C.inkTert).text(`${heading} (cont.)`, L, y);
        y += 14;
      }
      doc.fontSize(8).fillColor(C.ink).text(row, L + 10, y, { width: W - 10 });
      y += lineHeight + 4;
    }
  };

  y += 20;
  ensureSpace(36);
  doc.fontSize(11).fillColor(C.ink).text('Investor Breakdown', L, y);
  y += 18;

  writeInvestorSection(
    'By Type:',
    report.investor_breakdown.by_type.map(
      (t) => `${t.type.replace('_', ' ')} - ${t.count} investor(s), ${t.total_units.toLocaleString()} units`
    )
  );

  if (report.investor_breakdown.by_type.length > 0 && report.investor_breakdown.by_jurisdiction.length > 0) {
    y += 6;
  }

  writeInvestorSection(
    'By Jurisdiction:',
    report.investor_breakdown.by_jurisdiction.map(
      (j) => `${j.jurisdiction} - ${j.count} investor(s), ${j.total_units.toLocaleString()} units`
    )
  );

  y += 20;
  if (y < 720) {
    doc.save();
    doc.rect(L, y, W, 40).fill(C.brand50);
    doc.rect(L, y, 3, 40).fill(C.brand500);
    doc.restore();
    doc.fontSize(6.5).fillColor(C.inkSec).text(
      'CONFIDENTIAL — This compliance report was generated by the Caelith Compliance Engine and represents a point-in-time snapshot. It does not constitute legal or regulatory advice.',
      L + 12, y + 10, { width: W - 24, lineGap: 2 }
    );
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(6.5).fillColor(C.inkTert);
    doc.text(
      `Caelith Compliance Report — ${report.fund.name} — Page ${i + 1} of ${pages.count}`,
      L, 780, { align: 'center', width: W }
    );
  }

  doc.end();
}));

export default router;
