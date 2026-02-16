/**
 * Cap Table PDF Export Service
 *
 * Generates institutional-grade PDF cap table reports with Signal Sand branding.
 */

import PDFDocument from 'pdfkit';
import { query } from '../db.js';

interface CapTableEntry {
  investor_name: string;
  investor_id: string;
  jurisdiction: string;
  accredited: boolean;
  units: number;
  percentage: number;
}

interface AssetInfo {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  fund_structure_id: string | null;
  created_at: string;
}

interface FundInfo {
  name: string;
  legal_form: string;
  domicile: string;
  regulatory_framework: string;
}

const C = {
  bg: '#24364A',
  bgSec: '#E4E0D4',
  accent: '#D8BA8E',
  accentDim: '#BDB0A4',
  ink: '#2D2722',
  inkSec: '#5A524B',
  inkTert: '#6E655D',
  edge: '#C6BEB1',
  surface: '#E4E0D4',
  surfMuted: '#EFEBDD',
  white: '#FFFFFF',
  red: '#8A4A45',
};

export async function generateCapTablePdf(assetId: string): Promise<Buffer> {
  const assets = await query<AssetInfo>('SELECT * FROM assets WHERE id = $1', [assetId]);
  if (assets.length === 0) throw new Error('Asset not found');
  const asset = assets[0];

  let fund: FundInfo | null = null;
  if (asset.fund_structure_id) {
    const funds = await query<FundInfo>(
      'SELECT name, legal_form, domicile, regulatory_framework FROM fund_structures WHERE id = $1',
      [asset.fund_structure_id]
    );
    if (funds.length > 0) fund = funds[0];
  }

  const capTable = await query<CapTableEntry>(
    `SELECT
      i.name as investor_name,
      i.id as investor_id,
      i.jurisdiction,
      i.accredited,
      h.units,
      ROUND((h.units::numeric / $2 * 100), 2) as percentage
    FROM holdings h
    JOIN investors i ON h.investor_id = i.id
    WHERE h.asset_id = $1 AND h.units > 0
    ORDER BY h.units DESC`,
    [assetId, asset.total_units]
  );

  const utilRows = await query<{ allocated: string; holders: string }>(
    `SELECT
      COALESCE(SUM(units), 0) as allocated,
      COUNT(*) FILTER (WHERE units > 0) as holders
    FROM holdings WHERE asset_id = $1`,
    [assetId]
  );

  const allocated = Number(utilRows[0]?.allocated || 0);
  const holders = Number(utilRows[0]?.holders || 0);
  const utilPct = asset.total_units > 0 ? (allocated / asset.total_units) * 100 : 0;

  const kycStats = await query<{ status: string; count: string }>(
    `SELECT COALESCE(i.kyc_status, 'unknown') as status, COUNT(DISTINCT i.id) as count
     FROM holdings h JOIN investors i ON h.investor_id = i.id
     WHERE h.asset_id = $1 AND h.units > 0
     GROUP BY i.kyc_status ORDER BY count DESC`,
    [assetId]
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Cap Table - ${asset.name}`,
        Author: 'Caelith Compliance Engine',
        Subject: 'Capitalization Table Report',
        Creator: 'Caelith',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const L = doc.page.margins.left;
    const now = new Date().toISOString().split('T')[0];
    const reportId = assetId.substring(0, 8).toUpperCase();

    doc.save();
    doc.rect(0, 0, doc.page.width, 80).fill(C.bg);
    doc.rect(L, 68, 32, 2).fill(C.accent);
    drawNorthStarMark(doc, L, 18, 16);
    doc.fontSize(8).fillColor(C.white).text('CAELITH', L + 24, 20, { characterSpacing: 3 });
    doc.fontSize(7).fillColor(C.accent).text('CAP TABLE REPORT', L + 24, 32);
    doc
      .fontSize(7)
      .fillColor(C.accentDim)
      .text(`Report ${reportId}`, L, 20, { width: W, align: 'right' })
      .text(`Generated ${now}`, L, 32, { width: W, align: 'right' });
    doc.restore();

    let y = 100;

    doc.fontSize(20).fillColor(C.ink).text('Capitalization Table', L, y);
    y += 28;
    doc.fontSize(13).fillColor(C.inkSec).text(asset.name, L, y);

    y += 20;
    const meta = [asset.asset_type];
    if (fund) meta.push(fund.legal_form, fund.domicile);
    meta.push(`Created ${new Date(asset.created_at).toISOString().split('T')[0]}`);
    doc.fontSize(8).fillColor(C.inkTert).text(meta.join('  |  '), L, y);

    if (fund) {
      y += 14;
      doc.fontSize(8).fillColor(C.inkTert).text(`Fund: ${fund.name}  |  Framework: ${fund.regulatory_framework}`, L, y);
    }

    y += 28;
    const cardW = (W - 18) / 4;
    const cardH = 54;
    const cards = [
      { label: 'TOTAL UNITS', value: fmtNum(asset.total_units), color: C.accent },
      { label: 'ALLOCATED', value: fmtNum(allocated), color: '#3D6658' },
      { label: 'UTILIZATION', value: `${utilPct.toFixed(1)}%`, color: utilPct > 90 ? C.red : C.accent },
      { label: 'HOLDERS', value: String(holders), color: C.accentDim },
    ];

    cards.forEach((card, i) => {
      const cx = L + i * (cardW + 6);
      doc.save();
      doc.rect(cx, y, cardW, cardH).fill(C.surface);
      doc.rect(cx, y, 3, cardH).fill(card.color);
      doc.restore();
      doc.fontSize(6.5).fillColor(C.inkTert).text(card.label, cx + 12, y + 10, { characterSpacing: 0.8 });
      doc.fontSize(16).fillColor(C.ink).text(card.value, cx + 12, y + 24);
    });

    y += cardH + 16;
    doc.save();
    doc.roundedRect(L, y, W, 8, 4).fill(C.edge);
    const barW = Math.max((utilPct / 100) * W, 4);
    doc.roundedRect(L, y, barW, 8, 4).fill(C.accent);
    doc.restore();

    doc
      .fontSize(7)
      .fillColor(C.inkTert)
      .text(`${fmtNum(allocated)} allocated of ${fmtNum(asset.total_units)} total`, L, y + 12, { width: W, align: 'center' });

    y += 36;
    doc.fontSize(11).fillColor(C.ink).text('Ownership Distribution', L, y);
    y += 22;

    const cols = {
      name: { x: L + 8, w: W * 0.28 },
      jur: { x: L + 8 + W * 0.28, w: W * 0.1 },
      accr: { x: L + 8 + W * 0.38, w: W * 0.1 },
      units: { x: L + 8 + W * 0.48, w: W * 0.18 },
      pct: { x: L + 8 + W * 0.66, w: W * 0.14 },
      bar: { x: L + 8 + W * 0.8, w: W * 0.18 },
    };

    doc.save();
    doc.rect(L, y - 4, W, 20).fill(C.bg);
    doc.restore();

    doc.fontSize(6.5).fillColor(C.accent);
    doc.text('INVESTOR', cols.name.x, y, { characterSpacing: 0.5 });
    doc.text('JURISDICTION', cols.jur.x, y, { characterSpacing: 0.5 });
    doc.text('ACCREDITED', cols.accr.x, y, { characterSpacing: 0.5 });
    doc.text('UNITS', cols.units.x, y, { width: cols.units.w - 8, align: 'right', characterSpacing: 0.5 });
    doc.text('OWNERSHIP', cols.pct.x, y, { width: cols.pct.w - 8, align: 'right', characterSpacing: 0.5 });

    y += 22;

    capTable.forEach((entry, i) => {
      if (y > doc.page.height - 100) {
        addFooter(doc, L, W, now, reportId);
        doc.addPage();
        y = 60;
      }

      if (i % 2 === 0) {
        doc.save();
        doc.rect(L, y - 4, W, 20).fill(C.surfMuted);
        doc.restore();
      }

      doc.fontSize(8.5).fillColor(C.ink).text(entry.investor_name, cols.name.x, y, { width: cols.name.w - 8 });
      doc.fontSize(7.5).fillColor(C.inkSec).text(entry.jurisdiction, cols.jur.x, y);

      const accColor = entry.accredited ? C.accent : C.inkTert;
      doc.fontSize(7.5).fillColor(accColor).text(entry.accredited ? 'Yes' : 'No', cols.accr.x, y);

      doc.fontSize(8.5).fillColor(C.ink).text(fmtNum(entry.units), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });
      doc
        .fontSize(8.5)
        .fillColor(C.ink)
        .text(`${Number(entry.percentage).toFixed(2)}%`, cols.pct.x, y, { width: cols.pct.w - 8, align: 'right' });

      const barMaxW = cols.bar.w - 8;
      const ownerBarW = (Number(entry.percentage) / 100) * barMaxW;
      doc.save();
      doc.roundedRect(cols.bar.x, y + 1, barMaxW, 7, 3).fill(C.edge);
      doc.roundedRect(cols.bar.x, y + 1, Math.max(ownerBarW, 2), 7, 3).fill(C.accent);
      doc.restore();

      y += 22;
    });

    y += 6;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();

    const unallocated = asset.total_units - allocated;
    if (unallocated > 0) {
      y += 10;
      doc.fontSize(8.5).fillColor(C.inkTert).text('Unallocated', cols.name.x, y);
      doc.text(fmtNum(unallocated), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });
      doc.text(`${((unallocated / asset.total_units) * 100).toFixed(2)}%`, cols.pct.x, y, {
        width: cols.pct.w - 8,
        align: 'right',
      });
    }

    y += 22;
    doc.save();
    doc.rect(L, y - 4, W, 22).fill(C.bg);
    doc.restore();

    doc.fontSize(8.5).fillColor(C.white).font('Helvetica-Bold').text('TOTAL', cols.name.x, y);
    doc.text(fmtNum(asset.total_units), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });
    doc.text('100.00%', cols.pct.x, y, { width: cols.pct.w - 8, align: 'right' });
    doc.font('Helvetica');

    y += 32;
    if (y > doc.page.height - 200) {
      addFooter(doc, L, W, now, reportId);
      doc.addPage();
      y = 60;
    }

    const typeMap = new Map<string, { count: number; units: number }>();
    for (const entry of capTable) {
      const key = entry.jurisdiction || 'Unknown';
      const prev = typeMap.get(key) || { count: 0, units: 0 };
      typeMap.set(key, { count: prev.count + 1, units: prev.units + entry.units });
    }

    doc.fontSize(11).fillColor(C.ink).text('Jurisdiction Exposure', L, y);
    y += 20;

    doc.save();
    doc.rect(L, y - 3, W, 16).fill(C.bgSec);
    doc.restore();

    doc.fontSize(6.5).fillColor(C.inkTert);
    doc.text('JURISDICTION', L + 8, y, { characterSpacing: 0.5 });
    doc.text('INVESTORS', L + W * 0.4, y, { characterSpacing: 0.5 });
    doc.text('UNITS', L + W * 0.55, y, { width: W * 0.2, align: 'right', characterSpacing: 0.5 });
    doc.text('SHARE', L + W * 0.75, y, { width: W * 0.15, align: 'right', characterSpacing: 0.5 });
    y += 18;

    for (const [jurisdiction, data] of typeMap) {
      if (y > doc.page.height - 100) {
        addFooter(doc, L, W, now, reportId);
        doc.addPage();
        y = 60;
      }

      const pct = asset.total_units > 0 ? ((data.units / asset.total_units) * 100).toFixed(1) : '0';
      doc.fontSize(8).fillColor(C.ink).text(jurisdiction, L + 8, y);
      doc.fillColor(C.inkSec).text(String(data.count), L + W * 0.4, y);
      doc.text(fmtNum(data.units), L + W * 0.55, y, { width: W * 0.2, align: 'right' });
      doc.text(`${pct}%`, L + W * 0.75, y, { width: W * 0.15, align: 'right' });
      y += 16;
    }

    y += 16;
    if (y > doc.page.height - 160) {
      addFooter(doc, L, W, now, reportId);
      doc.addPage();
      y = 60;
    }

    doc.fontSize(11).fillColor(C.ink).text('KYC Status Overview', L, y);
    y += 20;

    const kycTotal = kycStats.reduce((sum, row) => sum + Number(row.count), 0);
    for (const row of kycStats) {
      if (y > doc.page.height - 100) {
        addFooter(doc, L, W, now, reportId);
        doc.addPage();
        y = 60;
      }

      const count = Number(row.count);
      const pct = kycTotal > 0 ? ((count / kycTotal) * 100).toFixed(1) : '0';
      const statusColor = row.status === 'verified' ? C.accent : row.status === 'expired' ? C.red : C.inkTert;

      doc.save();
      doc.rect(L, y - 2, W, 18).fill(C.surfMuted);
      doc.rect(L, y - 2, 3, 18).fill(statusColor);
      doc.restore();

      doc.fontSize(8.5).fillColor(C.ink).text(row.status.charAt(0).toUpperCase() + row.status.slice(1), L + 12, y);
      doc.fillColor(C.inkSec).text(`${count} investor${count !== 1 ? 's' : ''} (${pct}%)`, L + W * 0.4, y);
      y += 22;
    }

    y += 40;
    if (y < doc.page.height - 140) {
      doc.save();
      doc.rect(L, y, W, 48).fill(C.bgSec);
      doc.rect(L, y, 3, 48).fill(C.accent);
      doc.restore();

      doc
        .fontSize(7)
        .fillColor(C.accent)
        .text('CONFIDENTIAL - INSTITUTIONAL USE ONLY', L + 14, y + 10, { characterSpacing: 0.5 });
      doc
        .fontSize(6.5)
        .fillColor(C.inkSec)
        .text(
          'This capitalization table was generated by the Caelith Compliance Engine and represents a point-in-time snapshot of ownership distribution. It does not constitute legal or financial advice. Recipients should verify all data before making investment decisions.',
          L + 14,
          y + 22,
          { width: W - 28, lineGap: 2 }
        );
    }

    addFooter(doc, L, W, now, reportId);
    doc.end();
  });
}

function addFooter(doc: PDFKit.PDFDocument, L: number, W: number, date: string, reportId: string): void {
  const footerY = doc.page.height - 44;

  doc.moveTo(L, footerY - 8).lineTo(L + W, footerY - 8).strokeColor(C.edge).lineWidth(0.5).stroke();

  doc.save();
  doc.rect(L, footerY, 20, 2).fill(C.accent);
  doc.restore();

  doc.fontSize(6.5).fillColor(C.inkTert).text('CAELITH COMPLIANCE ENGINE', L, footerY + 6, { characterSpacing: 0.5 }).text(
    `Report ${reportId} | ${date} | Page ${doc.bufferedPageRange().count}`,
    L,
    footerY + 6,
    { width: W, align: 'right' }
  );
}

function drawNorthStarMark(doc: PDFKit.PDFDocument, x: number, y: number, scale: number): void {
  const s = scale;
  doc.save();
  doc.roundedRect(x, y, s, s, 3).fill('#DDE2E5');
  doc.roundedRect(x, y, s, s, 3).lineWidth(1).stroke('#3F3933');

  doc.moveTo(x + s * 0.25, y + s * 0.15).lineTo(x + s * 0.25, y + s * 0.85).lineWidth(0.5).stroke('#BDB0A4');
  doc.moveTo(x + s * 0.5, y + s * 0.15).lineTo(x + s * 0.5, y + s * 0.85).lineWidth(0.5).stroke('#BDB0A4');
  doc.moveTo(x + s * 0.75, y + s * 0.15).lineTo(x + s * 0.75, y + s * 0.85).lineWidth(0.5).stroke('#BDB0A4');
  doc.moveTo(x + s * 0.15, y + s * 0.25).lineTo(x + s * 0.85, y + s * 0.25).lineWidth(0.5).stroke('#BDB0A4');
  doc.moveTo(x + s * 0.15, y + s * 0.5).lineTo(x + s * 0.85, y + s * 0.5).lineWidth(0.5).stroke('#BDB0A4');
  doc.moveTo(x + s * 0.15, y + s * 0.75).lineTo(x + s * 0.85, y + s * 0.75).lineWidth(0.5).stroke('#BDB0A4');

  doc.polygon(
    [x + s * 0.5, y + s * 0.15],
    [x + s * 0.58, y + s * 0.42],
    [x + s * 0.85, y + s * 0.5],
    [x + s * 0.58, y + s * 0.58],
    [x + s * 0.5, y + s * 0.85],
    [x + s * 0.42, y + s * 0.58],
    [x + s * 0.15, y + s * 0.5],
    [x + s * 0.42, y + s * 0.42]
  ).fill('#D8BA8E').lineWidth(1).stroke('#3F3933');

  doc.restore();
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}
