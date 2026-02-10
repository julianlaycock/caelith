/**
 * Cap Table PDF Export Service
 *
 * Generates institutional-grade PDF cap table reports with Caelith green branding.
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

// ── Caelith Design Tokens ────────────────────────────────
const C = {
  brand950:  '#0B2E1F',
  brand800:  '#166534',
  brand700:  '#15803D',
  brand600:  '#16A34A',
  brand500:  '#22C55E',
  brand400:  '#4ADE80',
  brand200:  '#BBF7D1',
  brand100:  '#DCFCE8',
  brand50:   '#F0FDF6',
  navy800:   '#2C355E',
  navy700:   '#323D70',
  ink:       '#0F1D18',
  inkSec:    '#4B6358',
  inkTert:   '#7A9488',
  surface:   '#F0F4F2',
  surfMuted: '#F8FAF9',
  edge:      '#D1DDD7',
  edgeSub:   '#E8EFE9',
  white:     '#FFFFFF',
  red:       '#DC2626',
};

export async function generateCapTablePdf(assetId: string): Promise<Buffer> {
  const assets = await query<AssetInfo>(
    'SELECT * FROM assets WHERE id = $1',
    [assetId]
  );
  if (assets.length === 0) throw new Error('Asset not found');
  const asset = assets[0];

  // Fetch fund structure if linked
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
  const utilPct = asset.total_units > 0 ? ((allocated / asset.total_units) * 100) : 0;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Cap Table — ${asset.name}`,
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

    // ─── Top Banner ──────────────────────────────────────
    doc.save();
    doc.rect(0, 0, doc.page.width, 80).fill(C.brand950);

    // Accent line
    doc.rect(L, 68, 32, 2).fill(C.brand500);

    // Brand name
    doc.fontSize(8).fillColor(C.brand400)
      .text('CAELITH', L, 20, { characterSpacing: 3 });

    doc.fontSize(7).fillColor(C.brand400)
      .text('COMPLIANCE ENGINE', L, 32);

    // Right side: date + report ID
    doc.fontSize(7).fillColor(C.brand200)
      .text(`Report ${reportId}`, L, 20, { width: W, align: 'right' })
      .text(`Generated ${now}`, L, 32, { width: W, align: 'right' });
    doc.restore();

    // ─── Title Section ───────────────────────────────────
    let y = 100;

    doc.fontSize(20).fillColor(C.ink)
      .text('Capitalization Table', L, y);

    y += 28;
    doc.fontSize(13).fillColor(C.inkSec)
      .text(asset.name, L, y);

    y += 20;
    const meta = [asset.asset_type];
    if (fund) meta.push(fund.legal_form, fund.domicile);
    meta.push(`Created ${new Date(asset.created_at).toISOString().split('T')[0]}`);
    doc.fontSize(8).fillColor(C.inkTert)
      .text(meta.join('  ·  '), L, y);

    if (fund) {
      y += 14;
      doc.fontSize(8).fillColor(C.inkTert)
        .text(`Fund: ${fund.name}  ·  Framework: ${fund.regulatory_framework}`, L, y);
    }

    // ─── Summary Cards ───────────────────────────────────
    y += 28;
    const cardW = (W - 18) / 4;
    const cardH = 54;

    const cards = [
      { label: 'TOTAL UNITS', value: fmtNum(asset.total_units), color: C.brand600 },
      { label: 'ALLOCATED', value: fmtNum(allocated), color: C.brand600 },
      { label: 'UTILIZATION', value: `${utilPct.toFixed(1)}%`, color: utilPct > 90 ? C.red : C.brand600 },
      { label: 'HOLDERS', value: String(holders), color: C.navy700 },
    ];

    cards.forEach((card, i) => {
      const cx = L + i * (cardW + 6);
      // Card background
      doc.save();
      doc.rect(cx, y, cardW, cardH).fill(C.brand50);
      // Left accent bar
      doc.rect(cx, y, 3, cardH).fill(card.color);
      doc.restore();

      doc.fontSize(6.5).fillColor(C.inkTert)
        .text(card.label, cx + 12, y + 10, { characterSpacing: 0.8 });
      doc.fontSize(16).fillColor(C.ink)
        .text(card.value, cx + 12, y + 24);
    });

    // ─── Utilization Bar ─────────────────────────────────
    y += cardH + 16;

    doc.save();
    doc.roundedRect(L, y, W, 8, 4).fill(C.surface);
    const barW = Math.max((utilPct / 100) * W, 4);
    doc.roundedRect(L, y, barW, 8, 4).fill(C.brand500);
    doc.restore();

    doc.fontSize(7).fillColor(C.inkTert)
      .text(`${fmtNum(allocated)} allocated of ${fmtNum(asset.total_units)} total`, L, y + 12, { width: W, align: 'center' });

    // ─── Ownership Table ─────────────────────────────────
    y += 36;

    doc.fontSize(11).fillColor(C.ink)
      .text('Ownership Distribution', L, y);
    y += 22;

    // Column layout
    const cols = {
      name:    { x: L + 8,                               w: W * 0.28 },
      jur:     { x: L + 8 + W * 0.28,                    w: W * 0.10 },
      accr:    { x: L + 8 + W * 0.38,                    w: W * 0.10 },
      units:   { x: L + 8 + W * 0.48,                    w: W * 0.18 },
      pct:     { x: L + 8 + W * 0.66,                    w: W * 0.14 },
      bar:     { x: L + 8 + W * 0.80,                    w: W * 0.18 },
    };

    // Table header
    doc.save();
    doc.rect(L, y - 4, W, 20).fill(C.brand950);
    doc.restore();

    doc.fontSize(6.5).fillColor(C.brand200);
    doc.text('INVESTOR', cols.name.x, y, { characterSpacing: 0.5 });
    doc.text('JURISDICTION', cols.jur.x, y, { characterSpacing: 0.5 });
    doc.text('ACCREDITED', cols.accr.x, y, { characterSpacing: 0.5 });
    doc.text('UNITS', cols.units.x, y, { width: cols.units.w - 8, align: 'right', characterSpacing: 0.5 });
    doc.text('OWNERSHIP', cols.pct.x, y, { width: cols.pct.w - 8, align: 'right', characterSpacing: 0.5 });

    y += 22;

    // Table rows
    capTable.forEach((entry, i) => {
      if (y > doc.page.height - 100) {
        addFooter(doc, L, W, now, reportId);
        doc.addPage();
        y = 60;
      }

      // Alternate row background
      if (i % 2 === 0) {
        doc.save();
        doc.rect(L, y - 4, W, 20).fill(C.surfMuted);
        doc.restore();
      }

      doc.fontSize(8.5).fillColor(C.ink)
        .text(entry.investor_name, cols.name.x, y, { width: cols.name.w - 8 });

      doc.fontSize(7.5).fillColor(C.inkSec)
        .text(entry.jurisdiction, cols.jur.x, y);

      // Accredited badge
      const accColor = entry.accredited ? C.brand600 : C.inkTert;
      doc.fontSize(7.5).fillColor(accColor)
        .text(entry.accredited ? 'Yes' : 'No', cols.accr.x, y);

      doc.fontSize(8.5).fillColor(C.ink)
        .text(fmtNum(entry.units), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });

      doc.fontSize(8.5).fillColor(C.ink)
        .text(`${Number(entry.percentage).toFixed(2)}%`, cols.pct.x, y, { width: cols.pct.w - 8, align: 'right' });

      // Ownership bar
      const barMaxW = cols.bar.w - 8;
      const ownerBarW = (Number(entry.percentage) / 100) * barMaxW;
      doc.save();
      doc.roundedRect(cols.bar.x, y + 1, barMaxW, 7, 3).fill(C.surface);
      doc.roundedRect(cols.bar.x, y + 1, Math.max(ownerBarW, 2), 7, 3).fill(C.brand500);
      doc.restore();

      y += 22;
    });

    // ─── Divider ─────────────────────────────────────────
    y += 6;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.edge).lineWidth(0.5).stroke();

    // ─── Unallocated Row ─────────────────────────────────
    const unallocated = asset.total_units - allocated;
    if (unallocated > 0) {
      y += 10;
      doc.fontSize(8.5).fillColor(C.inkTert)
        .text('Unallocated', cols.name.x, y);
      doc.text(fmtNum(unallocated), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });
      doc.text(`${((unallocated / asset.total_units) * 100).toFixed(2)}%`, cols.pct.x, y, { width: cols.pct.w - 8, align: 'right' });
    }

    // ─── Total Row ───────────────────────────────────────
    y += 22;
    doc.save();
    doc.rect(L, y - 4, W, 22).fill(C.brand950);
    doc.restore();

    doc.fontSize(8.5).fillColor(C.white).font('Helvetica-Bold')
      .text('TOTAL', cols.name.x, y);
    doc.text(fmtNum(asset.total_units), cols.units.x, y, { width: cols.units.w - 8, align: 'right' });
    doc.text('100.00%', cols.pct.x, y, { width: cols.pct.w - 8, align: 'right' });
    doc.font('Helvetica');

    // ─── Disclaimer Box ──────────────────────────────────
    y += 40;
    if (y < doc.page.height - 140) {
      doc.save();
      doc.rect(L, y, W, 48).fill(C.brand50);
      doc.rect(L, y, 3, 48).fill(C.brand500);
      doc.restore();

      doc.fontSize(7).fillColor(C.brand800)
        .text('CONFIDENTIAL — INSTITUTIONAL USE ONLY', L + 14, y + 10, { characterSpacing: 0.5 });
      doc.fontSize(6.5).fillColor(C.inkSec)
        .text(
          'This capitalization table was generated by the Caelith Compliance Engine and represents a point-in-time snapshot of the ownership distribution. It does not constitute legal or financial advice. Recipients should independently verify all data before making investment decisions. Distribution is restricted to authorized parties.',
          L + 14, y + 22, { width: W - 28, lineGap: 2 }
        );
    }

    // ─── Footer ──────────────────────────────────────────
    addFooter(doc, L, W, now, reportId);

    doc.end();
  });
}

function addFooter(doc: PDFKit.PDFDocument, L: number, W: number, date: string, reportId: string): void {
  const footerY = doc.page.height - 44;

  // Separator line
  doc.moveTo(L, footerY - 8).lineTo(L + W, footerY - 8).strokeColor(C.edge).lineWidth(0.5).stroke();

  // Footer accent
  doc.save();
  doc.rect(L, footerY, 20, 2).fill(C.brand500);
  doc.restore();

  doc.fontSize(6.5).fillColor(C.inkTert)
    .text('CAELITH COMPLIANCE ENGINE', L, footerY + 6, { characterSpacing: 0.5 })
    .text(`Report ${reportId}  ·  ${date}  ·  Page ${doc.bufferedPageRange().count}`, L, footerY + 6, { width: W, align: 'right' });
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}
