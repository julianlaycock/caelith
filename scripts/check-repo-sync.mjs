import { execSync } from 'node:child_process';

function run(command, options = {}) {
  const { allowFail = false } = options;
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (allowFail) {
      return null;
    }
    const stderr = error instanceof Error && 'stderr' in error
      ? String(error.stderr || '')
      : '';
    throw new Error(`Command failed: ${command}\n${stderr}`.trim());
  }
}

function info(message) {
  console.log(`[sync-check] ${message}`);
}

function warn(message) {
  console.warn(`[sync-check] ${message}`);
}

function fail(message) {
  console.error(`[sync-check] ${message}`);
  process.exit(1);
}

const inRepo = run('git rev-parse --is-inside-work-tree', { allowFail: true });
if (inRepo !== 'true') {
  process.exit(0);
}

const status = run('git status --porcelain', { allowFail: true }) || '';
if (status) {
  warn('Uncommitted changes detected. Commit or stash to keep local state safe.');
}

if (!process.env.SKIP_SYNC_FETCH) {
  const fetched = run('git fetch --quiet --prune', { allowFail: true });
  if (fetched === null) {
    warn('Could not fetch from remote. Continuing with local tracking refs.');
  }
}

const upstream = run('git rev-parse --abbrev-ref --symbolic-full-name "@{u}"', { allowFail: true });
if (!upstream) {
  warn('No upstream tracking branch configured. Skipping behind/ahead guard.');
  process.exit(0);
}

const counts = run(`git rev-list --left-right --count ${upstream}...HEAD`, { allowFail: true });
if (!counts) {
  warn(`Unable to compare against ${upstream}.`);
  process.exit(0);
}

const [behindRaw, aheadRaw] = counts.split(/\s+/);
const behind = Number(behindRaw || 0);
const ahead = Number(aheadRaw || 0);

if (behind > 0) {
  fail(`Branch is behind ${upstream} by ${behind} commit(s). Run "git pull --ff-only" before local runs.`);
}

if (ahead > 0) {
  info(`Branch is ahead of ${upstream} by ${ahead} commit(s).`);
}

if (!status && ahead === 0) {
  info(`Repository is clean and in sync with ${upstream}.`);
}
