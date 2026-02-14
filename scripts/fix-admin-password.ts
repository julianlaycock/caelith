import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { execute, closeDb } from '../src/backend/db.js';

dotenv.config();

const NEW_PASSWORD = 'Admin1234';

async function fixAdminPassword(): Promise<void> {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await execute(
    `UPDATE users SET password_hash = $1, updated_at = now() WHERE email = 'admin@caelith.com'`,
    [hash]
  );
  console.log(`✓ Updated admin@caelith.com password to: ${NEW_PASSWORD}`);
}

fixAdminPassword()
  .then(() => closeDb())
  .catch((error) => {
    console.error('Failed:', error);
    closeDb();
    process.exit(1);
  });
