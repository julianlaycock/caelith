import { execute, closeDb } from '../src/backend/db.js';
import { readFileSync } from 'fs';

const file = process.argv[2];
if (!file) { console.error('Usage: npx tsx scripts/run-sql.ts <file.sql>'); process.exit(1); }

const sql = readFileSync(file, 'utf8');
execute(sql)
  .then(() => { console.log(`✓ Applied ${file}`); return closeDb(); })
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
