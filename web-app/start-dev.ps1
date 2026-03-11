# Quick start script for web app
Write-Host "Starting Refrag Web App..." -ForegroundColor Green

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local with mock mode enabled..." -ForegroundColor Yellow
    "NEXT_PUBLIC_USE_MOCK=true" | Out-File -FilePath ".env.local" -Encoding utf8
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting development server on port 3004..." -ForegroundColor Cyan
npm run dev
