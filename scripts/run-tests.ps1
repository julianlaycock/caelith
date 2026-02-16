# Automated Test Runner for Private Asset Registry
# Runs baseline unit/rules tests plus full e2e with backend in test-reset mode.

$ErrorActionPreference = 'Stop'

Write-Host "TEST RUNNER - Private Asset Registry" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$serverJob = $null

function Assert-StepSuccess {
    param(
        [string]$StepName
    )
    if ($LASTEXITCODE -ne 0) {
        throw "$StepName failed (exit code $LASTEXITCODE)"
    }
}

try {
    Write-Host "[Step 1] Clearing backend port..." -ForegroundColor Yellow
    node scripts/free-port.js 3001
    Write-Host "  [OK] Port 3001 is clear" -ForegroundColor Green
    Write-Host ""

    Write-Host "[Step 2] Starting backend in test mode..." -ForegroundColor Yellow
    $serverJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        $env:NODE_ENV = 'test'
        $env:ENABLE_TEST_RESET = '1'
        npm run dev:backend | Out-Null
    }
    Write-Host "  Server starting (Job ID: $($serverJob.Id))..." -ForegroundColor Gray

    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -UseBasicParsing
            if ($health.status -eq 'ok') {
                $healthy = $true
                break
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    if (-not $healthy) {
        throw "Backend health check failed on http://localhost:3001/health"
    }

    Write-Host "  [OK] Backend is healthy" -ForegroundColor Green
    Write-Host ""

    Write-Host "[Step 3] Running repository unit tests..." -ForegroundColor Yellow
    npm run test -- tests/unit/repositories.test.ts --run
    Assert-StepSuccess "Unit tests"
    Write-Host ""

    Write-Host "[Step 4] Running rules-engine validator tests..." -ForegroundColor Yellow
    npm run test -- src/rules-engine/validator.test.ts --run
    Assert-StepSuccess "Validator tests"
    Write-Host ""

    Write-Host "[Step 5] Running full e2e suite..." -ForegroundColor Yellow
    npm run test:e2e
    Assert-StepSuccess "E2E suite"
    Write-Host ""

    Write-Host "SUCCESS! ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "[PASS] Unit tests" -ForegroundColor Green
    Write-Host "[PASS] Validator tests" -ForegroundColor Green
    Write-Host "[PASS] E2E tests" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($serverJob) {
        Stop-Job $serverJob -ErrorAction SilentlyContinue
        Remove-Job $serverJob -ErrorAction SilentlyContinue
        Write-Host "  [Cleanup] Backend job stopped" -ForegroundColor Gray
    }
}
