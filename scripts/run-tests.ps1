# Automated Test Runner for Private Asset Registry
# This script runs all tests with proper setup and cleanup

Write-Host "TEST RUNNER - Private Asset Registry" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any existing server on port 3001
Write-Host "[Step 1] Cleaning up any existing servers..." -ForegroundColor Yellow
$existingProcess = netstat -ano | Select-String ":3001" | Select-Object -First 1
if ($existingProcess) {
    $processId = ($existingProcess -split '\s+')[-1]
    Write-Host "  Found process $processId using port 3001, terminating..." -ForegroundColor Gray
    taskkill /PID $processId /F 2>$null | Out-Null
    Start-Sleep -Seconds 2
}
Write-Host "  [OK] Port 3001 is clear" -ForegroundColor Green
Write-Host ""

# Step 2: Start the backend server in background
Write-Host "[Step 2] Starting backend server..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev:backend 2>&1 | Out-Null
}
Write-Host "  Server starting (Job ID: $($serverJob.Id))..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Verify server is running
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "  [OK] Server is running (status: $($health.status))" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Server failed to start!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Step 3: Run unit tests (don't need database reset)
Write-Host "[Step 3] Running unit tests..." -ForegroundColor Yellow
npm run test -- tests/unit/repositories.test.ts --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Unit tests failed!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Step 4: Run validator tests
Write-Host "[Step 4] Running validator tests..." -ForegroundColor Yellow
npm run test -- src/rules-engine/validator.test.ts --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Validator tests failed!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Function to reset database via API
function Reset-Database {
    Write-Host "  Resetting database..." -ForegroundColor Gray
    try {
        Invoke-RestMethod -Uri "http://localhost:3001/api/reset" -Method POST -UseBasicParsing | Out-Null
        Write-Host "  [OK] Database reset" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Reset via API failed, continuing..." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 1
}

# Step 5: Run E2E tests (with database reset between each)
Write-Host "[Step 5] Running E2E tests..." -ForegroundColor Yellow

Write-Host "  Running: Audit Trail tests..." -ForegroundColor Cyan
Reset-Database
npm run test -- tests/e2e/audit-trail.test.ts --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Audit trail tests failed!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  Running: Happy Path tests..." -ForegroundColor Cyan
Reset-Database
npm run test -- tests/e2e/happy-path.test.ts --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Happy path tests failed!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  Running: Validation Failures tests..." -ForegroundColor Cyan
Reset-Database
npm run test -- tests/e2e/validation-failures.test.ts --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Validation failures tests failed!" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}
Write-Host ""

# Step 6: Cleanup
Write-Host "[Step 6] Cleaning up..." -ForegroundColor Yellow
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue
Write-Host "  [OK] Server stopped" -ForegroundColor Green
Write-Host ""

# Success!
Write-Host "SUCCESS! ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "[PASS] Unit tests" -ForegroundColor Green
Write-Host "[PASS] Validator tests" -ForegroundColor Green
Write-Host "[PASS] E2E tests" -ForegroundColor Green
Write-Host ""
