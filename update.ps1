# PowerShell Update Script for PMIS (Full Deployment)
# Location: C:\pmis\update.ps1
# Usage: Run this script after git pull to update both backend and frontend

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PMIS Full Update & Deployment Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Stop"

# Set base path
$BasePath = "C:\pmis"
Set-Location $BasePath

# ============================================================================
# STEP 1: Pull Latest Code
# ============================================================================
Write-Host "[STEP 1/6] Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git pull failed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 2: Update Backend Dependencies
# ============================================================================
Write-Host ""
Write-Host "[STEP 2/6] Updating backend dependencies..." -ForegroundColor Yellow
Set-Location "$BasePath\backend"
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 3: Run Database Migrations
# ============================================================================
Write-Host ""
Write-Host "[STEP 3/6] Running database migrations..." -ForegroundColor Yellow
python manage.py migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database migrations failed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 4: Collect Static Files
# ============================================================================
Write-Host ""
Write-Host "[STEP 4/6] Collecting static files..." -ForegroundColor Yellow
python manage.py collectstatic --noinput
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: collectstatic failed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 5: Build Frontend
# ============================================================================
Write-Host ""
Write-Host "[STEP 5/6] Building frontend..." -ForegroundColor Yellow
Set-Location "$BasePath\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Copying frontend build to IIS directory..." -ForegroundColor Yellow
Copy-Item -Path dist\* -Destination C:\inetpub\wwwroot\pmis -Recurse -Force
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy frontend files to IIS!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 6: Restart Services
# ============================================================================
Write-Host ""
Write-Host "[STEP 6/6] Restarting services..." -ForegroundColor Yellow

Write-Host "Restarting backend service (NSSM)..." -ForegroundColor Yellow
nssm restart PMISBackend
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to restart backend service via NSSM" -ForegroundColor Yellow
}

Write-Host "Restarting IIS..." -ForegroundColor Yellow
iisreset
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to restart IIS" -ForegroundColor Yellow
}

# ============================================================================
# Completion Summary
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Update & Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
nssm status PMISBackend

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://45.118.163.111" -ForegroundColor White
Write-Host "  Backend API: http://45.118.163.111:8000" -ForegroundColor White
Write-Host "  Admin Panel: http://45.118.163.111:8000/admin" -ForegroundColor White
Write-Host ""
Write-Host "To view backend logs:" -ForegroundColor Yellow
Write-Host "  Get-Content C:\pmis\logs\backend.log -Tail 100 -Wait" -ForegroundColor White
