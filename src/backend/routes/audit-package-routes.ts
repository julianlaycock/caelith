import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../middleware/async-handler.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { generateAuditPackage, AuditPackageData } from '../services/audit-package-service.js';

const BRAND = {
  header: '#24364A',
  accent: '#D8BA8E',
  bg: '#F2EFE0',
  ink: '#2D2722',
  inkSecondary: '#5A524B',
  success: '#3D6658',
  warning: '#9C6E2D',
  danger: '#8A4A45',
  white: '#FFFFFF',
};

export function createAuditPackageRoutes(): Router {
  const router = Router();

  // GET /api/reports/audit-package/:fundId — JSON data
  router.get('/:fundId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const data = await generateAuditPackage(req.params.fundId, tenantId);
    res.json(data);
  }));

  // GET /api/reports/audit-package/:fundId/pdf — PDF export
  router.get('/:fundId/pdf', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const data = await generateAuditPackage(req.params.fundId, tenantId);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const slug = data.fund.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-package-${slug}.pdf"`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 100;
    let y = 50;

    function sectionHeader(title: string) {
      if (y > 680) { doc.addPage(); y = 50; }
      doc.rect(50, y, pageWidth, 28).fill(BRAND.header);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.white).text(title, 60, y + 8, { width: pageWidth - 20 });
      y += 38;
      doc.fillColor(BRAND.ink);
    }

    function labelValue(label: string, value: string, indent: number = 0) {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.inkSecondary).text(label, 55 + indent, y, { continued: true });
      doc.font('Helvetica').fillColor(BRAND.ink).text(`  ${value}`);
      y += 14;
    }

    function spacer(h: number = 8) { y += h; }

    // ─── Cover Page ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(BRAND.header);
    doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND.white)
      .text('AUDIT PACKAGE', 50, 200, { align: 'center' });
    doc.font('Helvetica').fontSize(14).fillColor(BRAND.accent)
      .text(data.fund.name, 50, 245, { align: 'center' });
    doc.fontSize(11).fillColor(BRAND.white)
      .text(`Generated: ${new Date(data.generatedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 280, { align: 'center' });
    doc.fontSize(10).fillColor(BRAND.accent)
      .text('Caelith Compliance Platform', 50, 310, { align: 'center' })
      .text('WP-Ready Export · SHA-256 Verified', 50, 325, { align: 'center' });

    // Integrity badge
    const chainLabel = data.integrityChain.chainIntact ? '✓ INTEGRITY CHAIN INTACT' : '✗ CHAIN BROKEN';
    const chainColor = data.integrityChain.chainIntact ? BRAND.success : BRAND.danger;
    doc.roundedRect(180, 370, 240, 30, 4).fill(chainColor);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.white)
      .text(chainLabel, 180, 378, { width: 240, align: 'center' });

    // ─── Page 2: Fund Overview ───────────────────────────────────
    doc.addPage(); y = 50;

    sectionHeader('1. Fund Overview');
    labelValue('Fund Name:', data.fund.name);
    labelValue('Legal Form:', data.fund.legalForm);
    labelValue('Domicile:', data.fund.domicile);
    labelValue('Regulatory Framework:', data.fund.regulatoryFramework);
    labelValue('SFDR Classification:', data.fund.sfdrClassification.replace('article_', 'Article ').replace('not_classified', 'Not classified'));
    labelValue('Status:', data.fund.status);
    labelValue('AIFM:', data.fund.aifmName || 'N/A');
    labelValue('AIFM LEI:', data.fund.aifmLei || 'N/A');
    labelValue('Inception:', data.fund.inceptionDate || 'N/A');
    labelValue('Currency:', data.fund.currency);
    spacer(12);

    // Compliance score
    sectionHeader('2. Compliance Score');
    const scoreColor = data.compliance.overallScore >= 80 ? BRAND.success : data.compliance.overallScore >= 50 ? BRAND.warning : BRAND.danger;
    doc.font('Helvetica-Bold').fontSize(36).fillColor(scoreColor)
      .text(`${data.compliance.overallScore}%`, 55, y);
    y += 45;
    labelValue('Risk Flags:', `${data.compliance.riskFlags.length}`);
    for (const flag of data.compliance.riskFlags) {
      const flagColor = flag.severity === 'high' ? BRAND.danger : flag.severity === 'medium' ? BRAND.warning : BRAND.inkSecondary;
      doc.font('Helvetica').fontSize(8).fillColor(flagColor).text(`  [${flag.severity.toUpperCase()}] ${flag.category}: ${flag.message}`, 55, y, { width: pageWidth - 10 });
      y += doc.heightOfString(`[${flag.severity}] ${flag.category}: ${flag.message}`, { width: pageWidth - 10, fontSize: 8 }) + 4;
    }
    spacer(12);

    // ─── Decisions + Integrity Chain ─────────────────────────────
    sectionHeader('3. Compliance Decisions & Integrity Chain');
    labelValue('Total Decisions:', `${data.decisions.total}`);
    labelValue('Approved:', `${data.decisions.approved}`);
    labelValue('Rejected:', `${data.decisions.rejected}`);
    labelValue('Pending:', `${data.decisions.pending}`);
    labelValue('Chain Integrity:', data.decisions.chainValid ? 'INTACT ✓' : `BROKEN (${data.integrityChain.brokenLinks.length} breaks)`);
    if (data.integrityChain.firstHash) {
      labelValue('First Hash:', data.integrityChain.firstHash.substring(0, 32) + '...');
      labelValue('Last Hash:', (data.integrityChain.lastHash || '').substring(0, 32) + '...');
    }
    spacer(8);

    // Decision table (compact)
    if (data.decisions.records.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.inkSecondary);
      doc.text('Date', 55, y, { width: 70 });
      doc.text('Type', 125, y, { width: 100 });
      doc.text('Result', 225, y, { width: 60 });
      doc.text('Checks', 285, y, { width: 50 });
      doc.text('Hash (first 16)', 340, y, { width: 150 });
      y += 14;
      doc.moveTo(55, y - 2).lineTo(50 + pageWidth, y - 2).lineWidth(0.5).stroke(BRAND.inkSecondary);

      for (const d of data.decisions.records.slice(0, 30)) {
        if (y > 740) { doc.addPage(); y = 50; }
        const resultColor = d.result === 'approved' ? BRAND.success : d.result === 'rejected' ? BRAND.danger : BRAND.warning;
        const passed = d.checks.filter(c => c.passed).length;
        const total = d.checks.length;

        doc.font('Helvetica').fontSize(7).fillColor(BRAND.ink);
        doc.text(new Date(d.decidedAt).toLocaleDateString('de-DE'), 55, y, { width: 70 });
        doc.text(d.type, 125, y, { width: 100 });
        doc.fillColor(resultColor).text(d.result.toUpperCase(), 225, y, { width: 60 });
        doc.fillColor(BRAND.ink).text(`${passed}/${total}`, 285, y, { width: 50 });
        doc.font('Courier').fontSize(6).text((d.integrityHash || 'N/A').substring(0, 16), 340, y + 1, { width: 150 });
        y += 12;
      }
      if (data.decisions.records.length > 30) {
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.inkSecondary)
          .text(`... and ${data.decisions.records.length - 30} more decisions`, 55, y);
        y += 14;
      }
    }
    spacer(12);

    // ─── Investors ───────────────────────────────────────────────
    doc.addPage(); y = 50;
    sectionHeader('4. Investor Overview');
    labelValue('Total Investors:', `${data.investors.total}`);
    for (const [status, count] of Object.entries(data.investors.byKycStatus)) {
      labelValue(`  KYC ${status}:`, `${count}`);
    }
    for (const [type, count] of Object.entries(data.investors.byType)) {
      labelValue(`  ${type.replace(/_/g, ' ')}:`, `${count}`);
    }
    spacer(8);

    if (data.investors.expiredKyc.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.danger)
        .text(`⚠ ${data.investors.expiredKyc.length} investor(s) with expired KYC:`, 55, y);
      y += 14;
      for (const inv of data.investors.expiredKyc) {
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink)
          .text(`  • ${inv.name} — expired ${inv.kycExpiry} (${inv.kycStatus})`, 55, y);
        y += 12;
      }
    }
    spacer(8);

    // Investor table
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.inkSecondary);
    doc.text('Investor', 55, y, { width: 150 });
    doc.text('Type', 210, y, { width: 80 });
    doc.text('Jurisdiction', 295, y, { width: 60 });
    doc.text('KYC', 360, y, { width: 60 });
    doc.text('Accredited', 425, y, { width: 60 });
    y += 14;
    doc.moveTo(55, y - 2).lineTo(50 + pageWidth, y - 2).lineWidth(0.5).stroke(BRAND.inkSecondary);

    for (const inv of data.investors.records) {
      if (y > 740) { doc.addPage(); y = 50; }
      const kycColor = inv.kycStatus === 'verified' ? BRAND.success : inv.kycStatus === 'expired' ? BRAND.danger : BRAND.warning;
      doc.font('Helvetica').fontSize(7).fillColor(BRAND.ink);
      doc.text(inv.name.substring(0, 30), 55, y, { width: 150 });
      doc.text(inv.type.replace(/_/g, ' '), 210, y, { width: 80 });
      doc.text(inv.jurisdiction, 295, y, { width: 60 });
      doc.fillColor(kycColor).text(inv.kycStatus, 360, y, { width: 60 });
      doc.fillColor(BRAND.ink).text(inv.accredited ? 'Yes' : 'No', 425, y, { width: 60 });
      y += 12;
    }
    spacer(12);

    // ─── Transfers ───────────────────────────────────────────────
    sectionHeader('5. Transfer History');
    labelValue('Total Transfers:', `${data.transfers.total}`);
    for (const [status, count] of Object.entries(data.transfers.byStatus)) {
      labelValue(`  ${status}:`, `${count}`);
    }
    spacer(8);

    if (data.transfers.records.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.inkSecondary);
      doc.text('Date', 55, y, { width: 70 });
      doc.text('From', 125, y, { width: 110 });
      doc.text('To', 240, y, { width: 110 });
      doc.text('Units', 355, y, { width: 50 });
      doc.text('Status', 410, y, { width: 60 });
      y += 14;

      for (const t of data.transfers.records.slice(0, 20)) {
        if (y > 740) { doc.addPage(); y = 50; }
        const sColor = t.status === 'executed' ? BRAND.success : t.status === 'rejected' ? BRAND.danger : BRAND.warning;
        doc.font('Helvetica').fontSize(7).fillColor(BRAND.ink);
        doc.text(new Date(t.executedAt).toLocaleDateString('de-DE'), 55, y, { width: 70 });
        doc.text(t.fromInvestor.substring(0, 22), 125, y, { width: 110 });
        doc.text(t.toInvestor.substring(0, 22), 240, y, { width: 110 });
        doc.text(`${t.units.toLocaleString()}`, 355, y, { width: 50 });
        doc.fillColor(sColor).text(t.status, 410, y, { width: 60 });
        y += 12;
      }
    }
    spacer(12);

    // ─── Rules ───────────────────────────────────────────────────
    doc.addPage(); y = 50;
    sectionHeader('6. Active Compliance Rules');
    labelValue('Active Rules:', `${data.rules.activeRules}`);
    spacer(4);

    for (const rule of data.rules.compositeRules) {
      if (y > 740) { doc.addPage(); y = 50; }
      const sevColor = rule.severity === 'high' ? BRAND.danger : rule.severity === 'medium' ? BRAND.warning : BRAND.inkSecondary;
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink)
        .text(`• ${rule.name}`, 55, y, { continued: true });
      doc.fillColor(sevColor).text(` [${rule.severity}]`, { continued: true });
      doc.fillColor(BRAND.inkSecondary).text(rule.jurisdiction ? ` — ${rule.jurisdiction}` : '');
      y += 14;
    }
    spacer(12);

    // ─── Documents ───────────────────────────────────────────────
    sectionHeader('7. Document Verification Status');
    labelValue('Total Documents:', `${data.documents.total}`);
    for (const [status, count] of Object.entries(data.documents.byStatus)) {
      labelValue(`  ${status}:`, `${count}`);
    }
    spacer(8);

    if (data.documents.expiringSoon.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.warning)
        .text(`${data.documents.expiringSoon.length} document(s) expiring within 90 days:`, 55, y);
      y += 14;
      for (const d of data.documents.expiringSoon) {
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink)
          .text(`  • ${d.investorName} — ${d.documentType} (${d.expiryDate})`, 55, y);
        y += 12;
      }
    }
    spacer(12);

    // ─── Footer: Certification ───────────────────────────────────
    sectionHeader('8. Export Certification');
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink)
      .text(`This audit package was generated by the Caelith Compliance Platform on ${new Date(data.generatedAt).toLocaleString('de-DE')}.`, 55, y, { width: pageWidth - 10 });
    y += 20;
    doc.text(`All compliance decisions are secured with SHA-256 cryptographic hashes forming a tamper-evident chain.`, 55, y, { width: pageWidth - 10 });
    y += 20;
    labelValue('Chain Status:', data.integrityChain.chainIntact ? 'All hashes verified — chain intact' : 'WARNING: Chain integrity compromised');
    labelValue('Total Decisions in Chain:', `${data.integrityChain.totalDecisions}`);
    if (data.integrityChain.lastHash) {
      labelValue('Latest Hash:', data.integrityChain.lastHash);
    }

    // Page numbers
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(7).fillColor(BRAND.inkSecondary)
        .text(`Caelith Audit Package — ${data.fund.name} — Page ${i + 1} of ${pages.count}`, 50, 780, { width: pageWidth, align: 'center' });
    }

    doc.end();
  }));

  return router;
}
