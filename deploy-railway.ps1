# Automated Railway Deployment Script for Caelith Backend
# Run this script to deploy your backend to Railway

Write-Host "=== Caelith Railway Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = $false
try {
    $version = railway --version 2>&1
    if ($version -match "railway") {
        Write-Host "Railway CLI installed: $version" -ForegroundColor Green
        $railwayInstalled = $true
    }
}
catch {
    Write-Host "Railway CLI not found. Already installed globally." -ForegroundColor Yellow
    $railwayInstalled = $true
}

Write-Host ""
Write-Host "To deploy, you need a Railway API token:" -ForegroundColor Yellow
Write-Host "1. Go to: https://railway.app/account/tokens" -ForegroundColor White
Write-Host "2. Login with your credentials" -ForegroundColor White
Write-Host "3. Click 'Create Token'" -ForegroundColor White
Write-Host "4. Copy the token" -ForegroundColor White
Write-Host ""

# Open Railway tokens page
Start-Process "https://railway.app/account/tokens"
Start-Sleep -Seconds 3

$token = Read-Host "Paste your Railway token here"
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
    exit 1
}

# Set token
$env:RAILWAY_TOKEN = $token
Write-Host "Token set" -ForegroundColor Green

Write-Host ""
Write-Host "=== Building Backend ===" -ForegroundColor Cyan
npm run build:backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Backend built successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== Linking to Railway Project ===" -ForegroundColor Cyan
railway link
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to link project." -ForegroundColor Red
    exit 1
}
Write-Host "Project linked" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setting Environment Variables ===" -ForegroundColor Cyan

railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set JWT_SECRET=change-this-in-production-min-32-chars-long
railway variables set "CORS_ORIGINS=https://www.caelith.tech,https://f1xc8s3n.up.railway.app"
# Get keys from .env file
$envContent = Get-Content .env -Raw
$anthropicKey = ($envContent | Select-String -Pattern 'ANTHROPIC_API_KEY=(.*)').Matches.Groups[1].Value.Trim()
$openaiKey = ($envContent | Select-String -Pattern 'OPENAI_API_KEY=(.*)').Matches.Groups[1].Value.Trim()

railway variables set ANTHROPIC_API_KEY=$anthropicKey
railway variables set OPENAI_API_KEY=$openaiKey

Write-Host "Environment variables set" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deploying Backend Service ===" -ForegroundColor Cyan
railway up
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Backend deployed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== Running Database Migrations ===" -ForegroundColor Cyan
Write-Host "Waiting 15 seconds for backend to start..."
Start-Sleep -Seconds 15

railway run npm run migrate
railway run npm run seed

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Update frontend environment variables in Railway dashboard:" -ForegroundColor Yellow
Write-Host "1. Go to your frontend service settings" -ForegroundColor White
Write-Host "2. Add/Update these variables:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_API_URL=/api" -ForegroundColor Gray
Write-Host "   BACKEND_API_REWRITE_TARGET=<your-backend-url>/api" -ForegroundColor Gray
Write-Host "3. Redeploy frontend" -ForegroundColor White
Write-Host ""
Write-Host "Then test at: https://www.caelith.tech/login" -ForegroundColor Cyan
Write-Host ""
