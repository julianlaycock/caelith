/**
 * Compliance Report Routes — Slice 6
 *
 * GET /api/reports/compliance/:fundStructureId  — Full compliance status snapshot
 */
import { Router } from 'express';
import { generateComplianceReport } from '../services/compliance-report-service.js';
import PDFDocument from 'pdfkit';
const router = Router();
/**
 * GET /api/reports/compliance/:fundStructureId
 *
 * Returns a comprehensive compliance status report for a fund:
 *   - Fund structure + assets summary
 *   - Eligibility criteria in force
 *   - Investor breakdown (type, jurisdiction, KYC status)
 *   - Onboarding pipeline
 *   - Recent decision records
 *   - Risk flags
 */
router.get('/compliance/:fundStructureId', async (req, res) => {
    try {
        const { fundStructureId } = req.params;
        if (!fundStructureId) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Missing fundStructureId parameter',
            });
            return;
        }
        const report = await generateComplianceReport(fundStructureId);
        res.status(200).json(report);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: error.message,
            });
            return;
        }
        console.error('Compliance report error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Failed to generate compliance report',
        });
    }
});
router.get('/compliance/:fundStructureId/pdf', async (req, res) => {
    try {
        const { fundStructureId } = req.params;
        const report = await generateComplianceReport(fundStructureId);
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${fundStructureId.substring(0, 8)}.pdf"`);
        doc.pipe(res);
        // Colors
        const C = {
            brand950: '#0B2E1F', brand600: '#16A34A', brand500: '#22C55E', brand200: '#BBF7D1',
            brand50: '#F0FDF6', ink: '#0F1D18', inkSec: '#4B6358', inkTert: '#7A9488',
            edge: '#D1DDD7', white: '#FFFFFF', red: '#DC2626', amber: '#F59E0B',
        };
        const W = 495; // page width minus margins
        const L = 50;
        const now = new Date().toISOString().split('T')[0];
        // Banner
        doc.save();
        doc.rect(0, 0, doc.page.width, 80).fill(C.brand950);
        doc.rect(L, 68, 32, 2).fill(C.brand500);
        doc.fontSize(8).fillColor(C.brand200).text('CAELITH', L, 20, { characterSpacing: 3 });
        doc.fontSize(7).fillColor(C.brand200).text('COMPLIANCE REPORT', L, 32);
        doc.fontSize(7).fillColor(C.brand200).text(`Generated ${now}`, L, 20, { width: W, align: 'right' });
        doc.restore();
        // Title
        let y = 100;
        doc.fontSize(18).fillColor(C.ink).text(report.fund.name, L, y);
        y += 26;
        doc.fontSize(9).fillColor(C.inkSec).text(`${report.fund.legal_form} · ${report.fund.domicile} · ${report.fund.regulatory_framework || 'N/A'} · Status: ${report.fund.status}`, L, y);
        // Divider
        y += 20;
        doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();
        // Key Metrics
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
        // Risk Flags
        if (report.risk_flags.length > 0) {
            y += 30;
            doc.fontSize(11).fillColor(C.ink).text('Risk Flags', L, y);
            y += 18;
            for (const flag of report.risk_flags) {
                if (y > 750) {
                    doc.addPage();
                    y = 50;
                }
                const color = flag.severity === 'high' ? C.red : flag.severity === 'medium' ? C.amber : C.brand500;
                doc.circle(58, y + 4, 3).fill(color);
                doc.fontSize(8).fillColor(C.ink).text(`[${flag.severity.toUpperCase()}] ${flag.message}`, 68, y, { width: 470 });
                y += 18;
            }
        }
        // Assets Table
        y += 20;
        if (y > 650) {
            doc.addPage();
            y = 50;
        }
        doc.fontSize(11).fillColor(C.ink).text('Asset Breakdown', L, y);
        y += 18;
        doc.fontSize(7).fillColor(C.inkTert);
        doc.text('Asset', L, y);
        doc.text('Type', 220, y);
        doc.text('Total', 300, y);
        doc.text('Allocated', 380, y);
        doc.text('Util %', 460, y);
        y += 12;
        doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();
        y += 8;
        for (const asset of report.fund.assets) {
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
            const utilPct = asset.total_units > 0 ? ((asset.allocated_units / asset.total_units) * 100).toFixed(1) : '0.0';
            doc.fontSize(8).fillColor(C.ink);
            doc.text(asset.name, L, y, { width: 165 });
            doc.text(asset.asset_type, 220, y);
            doc.text(asset.total_units.toLocaleString(), 300, y);
            doc.text(asset.allocated_units.toLocaleString(), 380, y);
            doc.text(`${utilPct}%`, 460, y);
            y += 16;
        }
        // Eligibility Criteria
        if (report.eligibility_criteria.length > 0) {
            y += 20;
            if (y > 650) {
                doc.addPage();
                y = 50;
            }
            doc.fontSize(11).fillColor(C.ink).text('Eligibility Criteria', L, y);
            y += 18;
            doc.fontSize(7).fillColor(C.inkTert);
            doc.text('Type', L, y);
            doc.text('Jurisdiction', 140, y);
            doc.text('Min (EUR)', 230, y);
            doc.text('Suitability', 320, y);
            doc.text('Source', 400, y);
            y += 12;
            doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();
            y += 8;
            for (const c of report.eligibility_criteria) {
                if (y > 750) {
                    doc.addPage();
                    y = 50;
                }
                doc.fontSize(8).fillColor(C.ink);
                doc.text(c.investor_type.replace('_', ' '), L, y, { width: 85 });
                doc.text(c.jurisdiction === '*' ? 'All' : c.jurisdiction, 140, y);
                doc.text(c.minimum_investment_eur > 0 ? `€${c.minimum_investment_eur.toLocaleString()}` : '—', 230, y);
                doc.text(c.suitability_required ? 'Required' : '—', 320, y);
                doc.text(c.source_reference || '—', 400, y, { width: 145 });
                y += 16;
            }
        }
        // Investor Breakdown
        y += 20;
        if (y > 600) {
            doc.addPage();
            y = 50;
        }
        doc.fontSize(11).fillColor(C.ink).text('Investor Breakdown', L, y);
        y += 18;
        if (report.investor_breakdown.by_type.length > 0) {
            doc.fontSize(8).fillColor(C.inkTert).text('By Type:', L, y);
            y += 14;
            for (const t of report.investor_breakdown.by_type) {
                doc.fontSize(8).fillColor(C.ink).text(`${t.type.replace('_', ' ')} — ${t.count} investor(s), ${t.total_units.toLocaleString()} units`, L + 10, y);
                y += 14;
            }
        }
        if (report.investor_breakdown.by_jurisdiction.length > 0) {
            y += 6;
            doc.fontSize(8).fillColor(C.inkTert).text('By Jurisdiction:', L, y);
            y += 14;
            for (const j of report.investor_breakdown.by_jurisdiction) {
                if (y > 750) {
                    doc.addPage();
                    y = 50;
                }
                doc.fontSize(8).fillColor(C.ink).text(`${j.jurisdiction} — ${j.count} investor(s), ${j.total_units.toLocaleString()} units`, L + 10, y);
                y += 14;
            }
        }
        // Disclaimer
        y += 20;
        if (y < 720) {
            doc.save();
            doc.rect(L, y, W, 40).fill(C.brand50);
            doc.rect(L, y, 3, 40).fill(C.brand500);
            doc.restore();
            doc.fontSize(6.5).fillColor(C.inkSec).text('CONFIDENTIAL — This compliance report was generated by the Caelith Compliance Engine and represents a point-in-time snapshot. It does not constitute legal or regulatory advice.', L + 12, y + 10, { width: W - 24, lineGap: 2 });
        }
        // Footer on all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(6.5).fillColor(C.inkTert);
            doc.text(`Caelith Compliance Report — ${report.fund.name} — Page ${i + 1} of ${pages.count}`, L, 780, { align: 'center', width: W });
        }
        doc.end();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: 'NOT_FOUND', message: error.message });
            return;
        }
        console.error('Compliance PDF error:', error);
        res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to generate compliance report PDF' });
    }
});
export default router;
//# sourceMappingURL=compliance-report-routes.js.map