import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const nextDir = join(process.cwd(), 'src', 'frontend', '.next');

try {
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log(`[clean-next-cache] Removed ${nextDir}`);
  } else {
    console.log('[clean-next-cache] No .next directory to remove');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[clean-next-cache] Failed to clean .next: ${message}`);
  process.exit(1);
}
