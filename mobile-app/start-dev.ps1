# Quick start script for mobile app
Write-Host "Starting Refrag Mobile App (Expo)..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Expo development server..." -ForegroundColor Cyan
npm start
