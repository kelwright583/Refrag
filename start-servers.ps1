# Start both Refrag servers
# Run this script from the project root directory

Write-Host "Starting Refrag servers..." -ForegroundColor Green

# Start Web App in background
Write-Host "`nStarting Web App on port 3004..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\web-app'; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start Mobile App (Expo) in background
Write-Host "Starting Mobile App (Expo)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\mobile-app'; npm start"

Write-Host "`nBoth servers are starting in separate windows." -ForegroundColor Green
Write-Host "Web App: http://localhost:3004" -ForegroundColor Yellow
Write-Host "Expo: Check the Expo window for QR code" -ForegroundColor Yellow
