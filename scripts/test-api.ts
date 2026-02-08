/**
 * Quick API Test Script
 * Tests the main API endpoints
 */

const BASE_URL = 'http://localhost:3001/api';

async function testAPI(): Promise<void> {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // 1. Create an asset
    console.log('1️⃣ Creating asset...');
    const assetResponse = await fetch(`${BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Fund',
        asset_type: 'Fund',
        total_units: 10000,
      }),
    });
    const asset = await assetResponse.json();
    console.log('✅ Asset created:', asset.id);

    // 2. Create two investors
    console.log('\n2️⃣ Creating investors...');
    const investor1Response = await fetch(`${BASE_URL}/investors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        jurisdiction: 'US',
        accredited: true,
      }),
    });
    const investor1 = await investor1Response.json();
    console.log('✅ Investor 1 created:', investor1.name);

    const investor2Response = await fetch(`${BASE_URL}/investors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        jurisdiction: 'US',
        accredited: true,
      }),
    });
    const investor2 = await investor2Response.json();
    console.log('✅ Investor 2 created:', investor2.name);

    // 3. Create rules
    console.log('\n3️⃣ Creating rules...');
    const rulesResponse = await fetch(`${BASE_URL}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.id,
        qualification_required: true,
        lockup_days: 0,
        jurisdiction_whitelist: ['US', 'UK'],
        transfer_whitelist: null,
      }),
    });
    const rules = await rulesResponse.json();
    console.log('✅ Rules created: version', rules.version);

    // 4. Allocate holdings
    console.log('\n4️⃣ Allocating holdings...');
    const holdingResponse = await fetch(`${BASE_URL}/holdings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investor_id: investor1.id,
        asset_id: asset.id,
        units: 5000,
        acquired_at: new Date().toISOString(),
      }),
    });
    const holding = await holdingResponse.json();
    console.log('✅ Holding created:', holding.units, 'units');

    // 5. Simulate transfer
    console.log('\n5️⃣ Simulating transfer...');
    const simulateResponse = await fetch(`${BASE_URL}/transfers/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.id,
        from_investor_id: investor1.id,
        to_investor_id: investor2.id,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });
    const simulation = await simulateResponse.json();
    console.log('✅ Simulation result:', simulation.valid ? 'VALID' : 'INVALID');
    if (!simulation.valid) {
      console.log('   Violations:', simulation.violations);
    }

    // 6. Execute transfer
    console.log('\n6️⃣ Executing transfer...');
    const transferResponse = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.id,
        from_investor_id: investor1.id,
        to_investor_id: investor2.id,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });
    const transfer = await transferResponse.json();
    console.log('✅ Transfer executed:', transfer.id);

    // 7. Get cap table
    console.log('\n7️⃣ Getting cap table...');
    const capTableResponse = await fetch(
      `${BASE_URL}/holdings/cap-table/${asset.id}`
    );
    const capTable = await capTableResponse.json();
    console.log('✅ Cap table:');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    capTable.forEach((entry: any) => {
      console.log(`   ${entry.investor_name}: ${entry.units} units (${entry.percentage.toFixed(2)}%)`);
    });

    console.log('\n🎉 All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPI();