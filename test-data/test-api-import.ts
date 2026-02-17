/**
 * End-to-end test: login, then POST /api/import/csv with test CSV
 */
const BASE = 'http://localhost:3001/api';

async function test() {
  // Step 1: Login to get a token
  console.log('1. Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@caelith.com', password: process.env.ADMIN_PASSWORD || 'admin' }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error('Login failed:', loginRes.status, body);
    return;
  }
  const { token } = await loginRes.json() as { token: string };
  console.log('   Token:', token.slice(0, 30) + '...');

  // Step 2: parse-csv
  console.log('2. Parsing CSV...');
  const { readFileSync } = await import('fs');
  const csvContent = readFileSync('test-data/investors.csv');

  const parseForm = new FormData();
  parseForm.append('file', new Blob([csvContent], { type: 'text/csv' }), 'investors.csv');
  parseForm.append('entityType', 'investors');

  const parseRes = await fetch(`${BASE}/import/parse-csv`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: parseForm,
  });
  if (!parseRes.ok) {
    const body = await parseRes.text();
    console.error('Parse failed:', parseRes.status, body);
    return;
  }
  const parseResult = await parseRes.json() as { columns: string[]; suggestedMapping: Record<string, string>; totalRows: number };
  console.log('   Columns:', parseResult.columns);
  console.log('   Mapping:', JSON.stringify(parseResult.suggestedMapping));
  console.log('   Total rows:', parseResult.totalRows);

  // Step 3: import with mapping
  console.log('3. Importing CSV...');
  const importForm = new FormData();
  importForm.append('file', new Blob([csvContent], { type: 'text/csv' }), 'investors.csv');
  importForm.append('entityType', 'investors');
  importForm.append('columnMapping', JSON.stringify(parseResult.suggestedMapping));
  importForm.append('mode', 'strict');

  const importRes = await fetch(`${BASE}/import/csv`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: importForm,
  });
  const importBody = await importRes.text();
  console.log('   Status:', importRes.status);
  console.log('   Response:', importBody.slice(0, 500));
}

test().catch(console.error);
