/**
 * Seed Data Script
 * Populates the database with realistic demo data for Caelith
 */

const BASE_URL = 'http://localhost:3001/api';

interface ApiResponse {
  id: string;
  [key: string]: unknown;
}

let authToken: string;

async function api<T = ApiResponse>(
  path: string,
  body?: Record<string, unknown>,
  method = 'POST'
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`${method} ${path} failed: ${err.message || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function seed(): Promise<void> {
  console.log('Seeding Caelith database...\n');

  // 0. Authenticate
  console.log('[Auth] Creating admin user...');
  try {
    const auth = await api<{ token: string }>('/auth/register', {
      email: 'admin@caelith.com',
      password: 'admin1234',
      name: 'System Admin',
      role: 'admin',
    });
    authToken = auth.token;
  } catch {
    const auth = await api<{ token: string }>('/auth/login', {
      email: 'admin@caelith.com',
      password: 'admin1234',
    });
    authToken = auth.token;
  }
  console.log('  OK - Authenticated as admin@caelith.com\n');

  // 1. Create assets
  console.log('[Assets] Creating funds...');
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
  const bond = await api('/assets', {
    name: 'Alpine Green Bond 2026',
    asset_type: 'Bond',
    total_units: 250000,
  });
  console.log(`  OK - Horizon Venture Fund I (1,000,000 units)`);
  console.log(`  OK - Redwood LP Interest (500,000 units)`);
  console.log(`  OK - Alpine Green Bond 2026 (250,000 units)\n`);

  // 2. Create investors
  console.log('[Investors] Registering 10 investors...');
  const investorData = [
    { name: 'Alice Johnson', jurisdiction: 'US', accredited: true },
    { name: 'Bob Smith', jurisdiction: 'US', accredited: true },
    { name: 'Carol Williams', jurisdiction: 'GB', accredited: true },
    { name: 'David Chen', jurisdiction: 'SG', accredited: true },
    { name: 'Eva Martinez', jurisdiction: 'US', accredited: false },
    { name: 'Frank Weber', jurisdiction: 'DE', accredited: true },
    { name: 'Grace Kim', jurisdiction: 'KR', accredited: true },
    { name: 'Henry Tanaka', jurisdiction: 'JP', accredited: true },
    { name: 'Isabella Rossi', jurisdiction: 'IT', accredited: false },
    { name: "James O'Brien", jurisdiction: 'IE', accredited: true },
  ];

  const investors: ApiResponse[] = [];
  for (const inv of investorData) {
    const result = await api('/investors', inv);
    investors.push(result);
    console.log(`  OK - ${inv.name} (${inv.jurisdiction}, ${inv.accredited ? 'accredited' : 'non-accredited'})`);
  }
  console.log();

  // 3. Configure rules
  console.log('[Rules] Configuring transfer restrictions...');
  await api('/rules', {
    asset_id: fund.id,
    qualification_required: true,
    lockup_days: 90,
    jurisdiction_whitelist: ['US', 'GB', 'SG', 'IE'],
    transfer_whitelist: null,
  });
  console.log('  OK - Horizon Fund: accredited only, 90-day lockup, US/GB/SG/IE');

  await api('/rules', {
    asset_id: lp.id,
    qualification_required: false,
    lockup_days: 0,
    jurisdiction_whitelist: ['US', 'GB', 'DE', 'IT'],
    transfer_whitelist: null,
  });
  console.log('  OK - Redwood LP: open qualification, no lockup, US/GB/DE/IT');

  await api('/rules', {
    asset_id: bond.id,
    qualification_required: true,
    lockup_days: 30,
    jurisdiction_whitelist: ['DE', 'FR', 'ES', 'IT', 'GB'],
    transfer_whitelist: null,
  });
  console.log('  OK - Alpine Bond: accredited only, 30-day lockup, EU/GB\n');

  // 4. Create composite rules
  console.log('[Composite Rules] Adding custom compliance rules...');
  await api('/composite-rules', {
    asset_id: fund.id,
    name: 'Large transfer limit',
    description: 'Transfers must be under 100,000 units',
    operator: 'AND',
    conditions: [
      { field: 'transfer.units', operator: 'lt', value: 100000 },
    ],
  });
  console.log('  OK - Horizon Fund: max 100,000 units per transfer');

  await api('/composite-rules', {
    asset_id: bond.id,
    name: 'EU accredited only',
    description: 'Recipient must be accredited and in EU/GB',
    operator: 'AND',
    conditions: [
      { field: 'to.accredited', operator: 'eq', value: true },
      { field: 'to.jurisdiction', operator: 'in', value: ['DE', 'FR', 'ES', 'IT', 'GB'] },
    ],
  });
  console.log('  OK - Alpine Bond: EU accredited recipients only\n');

  // 5. Allocate holdings
  console.log('[Holdings] Allocating units...');
  const pastDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  const recentDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const allocations = [
    { inv: 0, asset: fund.id, units: 300000, date: pastDate, label: 'Alice -> Horizon Fund' },
    { inv: 1, asset: fund.id, units: 200000, date: pastDate, label: 'Bob -> Horizon Fund' },
    { inv: 2, asset: fund.id, units: 150000, date: pastDate, label: 'Carol -> Horizon Fund' },
    { inv: 3, asset: fund.id, units: 100000, date: pastDate, label: 'David -> Horizon Fund' },
    { inv: 9, asset: fund.id, units: 50000, date: pastDate, label: 'James -> Horizon Fund' },
    { inv: 0, asset: lp.id, units: 200000, date: pastDate, label: 'Alice -> Redwood LP' },
    { inv: 5, asset: lp.id, units: 150000, date: pastDate, label: 'Frank -> Redwood LP' },
    { inv: 8, asset: lp.id, units: 100000, date: pastDate, label: 'Isabella -> Redwood LP' },
    { inv: 2, asset: bond.id, units: 100000, date: pastDate, label: 'Carol -> Alpine Bond' },
    { inv: 5, asset: bond.id, units: 75000, date: recentDate, label: 'Frank -> Alpine Bond (recent)' },
  ];

  for (const a of allocations) {
    await api('/holdings', {
      investor_id: investors[a.inv].id,
      asset_id: a.asset,
      units: a.units,
      acquired_at: a.date,
    });
    console.log(`  OK - ${a.label}: ${a.units.toLocaleString()} units`);
  }
  console.log();

  // 6. Execute transfers
  console.log('[Transfers] Executing valid transfers...');
  const transfers = [
    { from: 0, to: 1, asset: fund.id, units: 25000, label: 'Alice -> Bob (Horizon)' },
    { from: 1, to: 2, asset: fund.id, units: 10000, label: 'Bob -> Carol (Horizon)' },
    { from: 0, to: 5, asset: lp.id, units: 50000, label: 'Alice -> Frank (Redwood)' },
    { from: 2, to: 5, asset: bond.id, units: 20000, label: 'Carol -> Frank (Alpine)' },
  ];

  for (const t of transfers) {
    await api('/transfers', {
      asset_id: t.asset,
      from_investor_id: investors[t.from].id,
      to_investor_id: investors[t.to].id,
      units: t.units,
      execution_date: new Date().toISOString(),
    });
    console.log(`  OK - ${t.label}: ${t.units.toLocaleString()} units`);
  }

  // 7. Register a webhook
  console.log('\n[Webhooks] Registering demo webhook...');
  await api('/webhooks', {
    url: 'https://example.com/caelith-webhook',
    event_types: ['transfer.executed', 'transfer.rejected'],
  });
  console.log('  OK - Webhook for transfer events\n');

  console.log('========================================');
  console.log('  Seed complete!');
  console.log('========================================');
  console.log('  3 assets');
  console.log('  10 investors');
  console.log('  10 holdings allocated');
  console.log('  4 transfers executed');
  console.log('  2 composite rules');
  console.log('  1 webhook registered');
  console.log('  Full audit trail generated');
  console.log('========================================');
  console.log('\nOpen http://localhost:3000 to explore.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
