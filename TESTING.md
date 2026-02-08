# Testing Guide

## Quick Start

To run all tests with proper setup and cleanup:

```powershell
npm run test:all
```

This automated script will:
1. ✅ Kill any existing server on port 3001
2. ✅ Start the backend server
3. ✅ Run unit tests
4. ✅ Run validator tests
5. ✅ Run E2E tests (with database reset between each suite)
6. ✅ Clean up and stop the server

## Test Structure

### Unit Tests (2 tests)
**Location:** `tests/unit/repositories.test.ts`

Tests the repository layer in isolation using in-memory SQLite database.

```powershell
npm run test -- tests/unit/repositories.test.ts --run
```

### Validator Tests (20 tests)
**Location:** `src/rules-engine/validator.test.ts`

Tests the transfer validation rules engine logic.

```powershell
npm run test -- src/rules-engine/validator.test.ts --run
```

### E2E Tests (27 tests total)

**Prerequisites:** Backend server must be running on port 3001

#### Audit Trail (10 tests)
```powershell
npm run test -- tests/e2e/audit-trail.test.ts --run
```

#### Happy Path (9 tests)
```powershell
npm run test -- tests/e2e/happy-path.test.ts --run
```

#### Validation Failures (8 tests)
```powershell
npm run test -- tests/e2e/validation-failures.test.ts --run
```

## Manual Testing Process

If you need to run tests manually:

### 1. Start the Backend Server

In one terminal:
```powershell
npm run dev:backend
```

Keep this running while you test.

### 2. Reset Database (before each E2E test suite)

In another terminal:
```powershell
Remove-Item -Force data/registry.db -ErrorAction SilentlyContinue
npm run migrate
```

### 3. Run Individual Test Suites

```powershell
# Unit tests (don't need database reset)
npm run test -- tests/unit/repositories.test.ts --run

# Validator tests (don't need database reset)
npm run test -- src/rules-engine/validator.test.ts --run

# E2E tests (reset database before each)
npm run test -- tests/e2e/audit-trail.test.ts --run
npm run test -- tests/e2e/happy-path.test.ts --run
npm run test -- tests/e2e/validation-failures.test.ts --run
```

### 4. Stop the Server

When done, stop the server (Ctrl+C) or:
```powershell
$pid = (netstat -ano | Select-String ":3001" | Select-Object -First 1).ToString().Split()[-1]
taskkill /PID $pid /F
```

## Why Database Reset is Needed

E2E tests create real data in the SQLite database at `data/registry.db`. Without resetting between test suites:

- Tests may find unexpected data from previous runs
- Unique constraints may be violated
- "Asset not found" errors can occur due to stale data

**Solution:** Delete and recreate the database between E2E test suites.

## Troubleshooting

### Port 3001 Already in Use

```powershell
# Find the process
netstat -ano | findstr :3001

# Kill it (replace PID with the actual number)
taskkill /PID <PID> /F
```

### Tests Failing with "Asset not found"

Make sure:
1. Backend server is running
2. Database was reset before the test suite
3. You're running E2E tests one suite at a time (not in parallel)

### Tests Failing to Load ("No test suite found")

This can happen if:
- TypeScript compilation issues
- Import path problems

Try:
```powershell
# Clear vitest cache
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install
```

## Test Coverage

**Total: 49 tests**
- Unit: 2 tests
- Validator: 20 tests
- E2E Audit Trail: 10 tests
- E2E Happy Path: 9 tests
- E2E Validation Failures: 8 tests

All tests should pass when run with the automated script.
