# PowerShell Deployment Script for PMIS Backend
# Location: C:\pmis\backend\deploy.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PMIS Backend Deployment Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Stop"

# Get script directory
$BackendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendPath

Write-Host "[1/4] Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to activate virtual environment!" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Running database migrations..." -ForegroundColor Yellow
python manage.py migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database migrations failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[3/4] Collecting static files..." -ForegroundColor Yellow
python manage.py collectstatic --noinput
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: collectstatic failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[4/4] Restarting backend service..." -ForegroundColor Yellow
nssm restart PMISBackend
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart backend service!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
nssm status PMISBackend
