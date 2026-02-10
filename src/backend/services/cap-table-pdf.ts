/**
 * Cap Table PDF Export Service
 * 
 * Generates professional PDF cap table reports for assets.
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
  created_at: string;
}

export async function generateCapTablePdf(assetId: string): Promise<Buffer> {
  const assets = await query<AssetInfo>(
    'SELECT * FROM assets WHERE id = $1',
    [assetId]
  );
  if (assets.length === 0) throw new Error('Asset not found');
  const asset = assets[0];

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

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
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

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;
    const now = new Date().toISOString().split('T')[0];

    // Header
    doc.fontSize(8).fillColor('#64748b')
      .text('CAELITH COMPLIANCE ENGINE', leftMargin, 30, { align: 'left' })
      .text(`Generated: ${now}`, leftMargin, 30, { align: 'right' });

    // Title
    doc.moveDown(2);
    doc.fontSize(22).fillColor('#0f172a')
      .text('Capitalization Table', leftMargin, doc.y);

    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#334155')
      .text(asset.name);

    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#64748b')
      .text(`${asset.asset_type}  •  Created ${new Date(asset.created_at).toISOString().split('T')[0]}  •  Report ID: ${assetId.substring(0, 8)}`);

    // Summary cards
    const summaryY = doc.y + 20;
    const cardWidth = pageWidth / 4;

    const summaryItems = [
      { label: 'TOTAL UNITS', value: formatNum(asset.total_units) },
      { label: 'ALLOCATED', value: formatNum(allocated) },
      { label: 'UTILIZATION', value: `${((allocated / asset.total_units) * 100).toFixed(1)}%` },
      { label: 'HOLDERS', value: String(holders) },
    ];

    doc.save();
    doc.rect(leftMargin, summaryY, pageWidth, 50).fill('#f8fafc');
    summaryItems.forEach((item, i) => {
      const x = leftMargin + (i * cardWidth) + 12;
      doc.fontSize(7).fillColor('#64748b').text(item.label, x, summaryY + 10);
      doc.fontSize(16).fillColor('#0f172a').text(item.value, x, summaryY + 22);
    });
    doc.restore();

    // Cap table header
    const tableTop = summaryY + 70;
    doc.fontSize(12).fillColor('#0f172a')
      .text('Ownership Distribution', leftMargin, tableTop);

    const colWidths = {
      name: pageWidth * 0.28,
      jurisdiction: pageWidth * 0.12,
      accredited: pageWidth * 0.12,
      units: pageWidth * 0.18,
      percentage: pageWidth * 0.14,
      bar: pageWidth * 0.16,
    };

    let y = tableTop + 25;
    doc.save();
    doc.rect(leftMargin, y - 4, pageWidth, 20).fill('#f1f5f9');
    doc.restore();

    doc.fontSize(7).fillColor('#64748b');
    let x = leftMargin + 8;
    doc.text('INVESTOR', x, y);
    x += colWidths.name;
    doc.text('JURISDICTION', x, y);
    x += colWidths.jurisdiction;
    doc.text('ACCREDITED', x, y);
    x += colWidths.accredited;
    doc.text('UNITS', x, y, { width: colWidths.units - 8, align: 'right' });
    x += colWidths.units;
    doc.text('OWNERSHIP', x, y, { width: colWidths.percentage - 8, align: 'right' });

    y += 22;

    // Table rows
    capTable.forEach((entry, i) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 60;
      }

      if (i % 2 === 0) {
        doc.save();
        doc.rect(leftMargin, y - 4, pageWidth, 20).fill('#fafafa');
        doc.restore();
      }

      x = leftMargin + 8;
      doc.fontSize(9).fillColor('#0f172a')
        .text(entry.investor_name, x, y, { width: colWidths.name - 8 });

      x += colWidths.name;
      doc.fontSize(8).fillColor('#475569')
        .text(entry.jurisdiction, x, y);

      x += colWidths.jurisdiction;
      doc.fontSize(8).fillColor(entry.accredited ? '#059669' : '#94a3b8')
        .text(entry.accredited ? 'Yes' : 'No', x, y);

      x += colWidths.accredited;
      doc.fontSize(9).fillColor('#334155')
        .text(formatNum(entry.units), x, y, { width: colWidths.units - 8, align: 'right' });

      x += colWidths.units;
      doc.fontSize(9).fillColor('#0f172a')
        .text(`${Number(entry.percentage).toFixed(2)}%`, x, y, { width: colWidths.percentage - 8, align: 'right' });

      x += colWidths.percentage;
      const barWidth = (Number(entry.percentage) / 100) * (colWidths.bar - 16);
      doc.save();
      doc.rect(x, y + 1, colWidths.bar - 16, 8).fill('#e2e8f0');
      doc.rect(x, y + 1, Math.max(barWidth, 1), 8).fill('#1e40af');
      doc.restore();

      y += 22;
    });

    // Divider
    y += 10;
    doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).strokeColor('#e2e8f0').stroke();

    // Unallocated row
    const unallocated = asset.total_units - allocated;
    if (unallocated > 0) {
      y += 12;
      x = leftMargin + 8;
      doc.fontSize(9).fillColor('#94a3b8').text('Unallocated', x, y);
      x = leftMargin + 8 + colWidths.name + colWidths.jurisdiction + colWidths.accredited;
      doc.text(formatNum(unallocated), x, y, { width: colWidths.units - 8, align: 'right' });
      x += colWidths.units;
      doc.text(`${((unallocated / asset.total_units) * 100).toFixed(2)}%`, x, y, { width: colWidths.percentage - 8, align: 'right' });
    }

    // Total row
    y += 22;
    doc.save();
    doc.rect(leftMargin, y - 4, pageWidth, 22).fill('#f1f5f9');
    doc.restore();
    x = leftMargin + 8;
    doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold')
      .text('Total', x, y);
    x = leftMargin + 8 + colWidths.name + colWidths.jurisdiction + colWidths.accredited;
    doc.text(formatNum(asset.total_units), x, y, { width: colWidths.units - 8, align: 'right' });
    x += colWidths.units;
    doc.text('100.00%', x, y, { width: colWidths.percentage - 8, align: 'right' });
    doc.font('Helvetica');

    // Footer
    const footerY = doc.page.height - 40;
    doc.fontSize(7).fillColor('#94a3b8')
      .text(
        'This document was generated by Caelith Compliance Engine. It represents a point-in-time snapshot and should not be considered legal or financial advice.',
        leftMargin, footerY, { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}