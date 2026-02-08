/**
 * Seed Data Script
 * Populates the database with demo data for the Private Asset Registry MVP
 */

const BASE_URL = 'http://localhost:3001/api';

interface ApiResponse {
  id: string;
  [key: string]: unknown;
}

async function api<T = ApiResponse>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`${path} failed: ${err.message || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function seed(): Promise<void> {
  console.log('?? Seeding database...\n');

  // 1. Create assets
  console.log('Creating assets...');
  const fund = await api('/assets', {
    name: 'Horizon Venture Fund I',
    asset_type: 'Fund',
    total_units: 1000000,
  });
  const lp = await api('/assets', {
    name: 'Redwood LP Interest',
    asset_type: 'LP Interest',
    total_units: 500000,
  });
  console.log(`  ? ${fund.id} - Horizon Venture Fund I (1,000,000 units)`);
  console.log(`  ? ${lp.id} - Redwood LP Interest (500,000 units)\n`);

  // 2. Create investors
  console.log('Creating investors...');
  const investors = [
    { name: 'Alice Johnson', jurisdiction: 'US', accredited: true },
    { name: 'Bob Smith', jurisdiction: 'US', accredited: true },
    { name: 'Carol Williams', jurisdiction: 'UK', accredited: true },
    { name: 'David Chen', jurisdiction: 'SG', accredited: true },
    { name: 'Eva Martinez', jurisdiction: 'US', accredited: false },
    { name: 'Frank Weber', jurisdiction: 'DE', accredited: true },
    { name: 'Grace Kim', jurisdiction: 'KR', accredited: true },
    { name: 'Henry Tanaka', jurisdiction: 'JP', accredited: true },
    { name: 'Isabella Rossi', jurisdiction: 'IT', accredited: false },
    { name: "James O''Brien", jurisdiction: 'IE', accredited: true },
  ];

  const created: ApiResponse[] = [];
  for (const inv of investors) {
    const result = await api('/investors', inv);
    created.push(result);
    console.log(`  ? ${result.id} - ${inv.name} (${inv.jurisdiction}, ${inv.accredited ? 'accredited' : 'non-accredited'})`);
  }
  console.log();

  // 3. Configure rules for Horizon Fund
  console.log('Configuring rules...');
  await api('/rules', {
    asset_id: fund.id,
    qualification_required: true,
    lockup_days: 90,
    jurisdiction_whitelist: ['US', 'UK', 'SG', 'IE'],
    transfer_whitelist: null,
  });
  console.log('  ? Horizon Fund: qualification required, 90-day lockup, US/UK/SG/IE only\n');

  // Rules for Redwood LP
  await api('/rules', {
    asset_id: lp.id,
    qualification_required: false,
    lockup_days: 0,
    jurisdiction_whitelist: ['US', 'UK', 'DE', 'IT'],
    transfer_whitelist: null,
  });
  console.log('  ? Redwood LP: no qualification, no lockup, US/UK/DE/IT only\n');

  // 4. Allocate holdings (use date 120 days ago to satisfy lockup)
  console.log('Allocating holdings...');
  const pastDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const allocations = [
    { investor: 0, asset: fund.id, units: 300000, name: 'Alice � Horizon Fund' },
    { investor: 1, asset: fund.id, units: 200000, name: 'Bob � Horizon Fund' },
    { investor: 2, asset: fund.id, units: 150000, name: 'Carol � Horizon Fund' },
    { investor: 3, asset: fund.id, units: 100000, name: 'David � Horizon Fund' },
    { investor: 9, asset: fund.id, units: 50000, name: 'James � Horizon Fund' },
    { investor: 0, asset: lp.id, units: 200000, name: 'Alice � Redwood LP' },
    { investor: 5, asset: lp.id, units: 150000, name: 'Frank � Redwood LP' },
    { investor: 8, asset: lp.id, units: 100000, name: 'Isabella � Redwood LP' },
  ];

  for (const alloc of allocations) {
    await api('/holdings', {
      investor_id: created[alloc.investor].id,
      asset_id: alloc.asset,
      units: alloc.units,
      acquired_at: pastDate,
    });
    console.log(`  ? ${alloc.name}: ${alloc.units.toLocaleString()} units`);
  }
  console.log();

  // 5. Execute some transfers
  console.log('Executing transfers...');
  const transfers = [
    { from: 0, to: 1, asset: fund.id, units: 25000, name: 'Alice � Bob (Horizon)' },
    { from: 1, to: 2, asset: fund.id, units: 10000, name: 'Bob � Carol (Horizon)' },
    { from: 0, to: 5, asset: lp.id, units: 50000, name: 'Alice � Frank (Redwood)' },
  ];

  for (const t of transfers) {
    await api('/transfers', {
      asset_id: t.asset,
      from_investor_id: created[t.from].id,
      to_investor_id: created[t.to].id,
      units: t.units,
      execution_date: new Date().toISOString(),
    });
    console.log(`  ? ${t.name}: ${t.units.toLocaleString()} units`);
  }

  console.log('\n?? Seed complete!\n');
  console.log('Summary:');
  console.log('  � 2 assets');
  console.log('  � 10 investors');
  console.log('  � 8 holdings allocated');
  console.log('  � 3 transfers executed');
  console.log('\nOpen http://localhost:3000 to explore the data.');
}

seed().catch((err) => {
  console.error('? Seed failed:', err.message);
  process.exit(1);
});
