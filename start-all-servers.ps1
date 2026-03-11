# 1. Run migrations (or show instructions)
# 2. Start Admin, Web App, and Expo in three new PowerShell windows via cmd start

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== Refrag: Migrations then start all servers ===" -ForegroundColor Green
Write-Host ""

# Step 1: Migrations
Write-Host "Step 1: Migrations" -ForegroundColor Cyan
& (Join-Path $root "run-migrations.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""

# Step 2: Open three new PowerShell windows using cmd start (reliable on Windows)
Write-Host "Step 2: Opening Admin, Web App, Expo in new windows..." -ForegroundColor Cyan

$adminScript = Join-Path $root "start-admin.ps1"
$webScript = Join-Path $root "start-webapp.ps1"
$mobileScript = Join-Path $root "start-mobile.ps1"

# cmd /c start "title" powershell ... opens a visible new window
$cmd = "start `"Refrag Admin`" powershell -NoExit -ExecutionPolicy Bypass -NoProfile -File `"$adminScript`""
Start-Process cmd -ArgumentList "/c", $cmd -WindowStyle Normal
Start-Sleep -Seconds 1

$cmd = "start `"Refrag Web App`" powershell -NoExit -ExecutionPolicy Bypass -NoProfile -File `"$webScript`""
Start-Process cmd -ArgumentList "/c", $cmd -WindowStyle Normal
Start-Sleep -Seconds 1

$cmd = "start `"Refrag Mobile (Expo)`" powershell -NoExit -ExecutionPolicy Bypass -NoProfile -File `"$mobileScript`""
Start-Process cmd -ArgumentList "/c", $cmd -WindowStyle Normal

Write-Host ""
Write-Host "Three new windows should have opened." -ForegroundColor Green
Write-Host "  Admin:    http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Web App:  http://localhost:3004" -ForegroundColor Yellow
Write-Host "  Mobile:   Expo window - scan QR with Expo Go" -ForegroundColor Yellow
