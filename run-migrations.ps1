# Run database migrations (Supabase).
# Option A: Set DATABASE_URL via env, or paste connection string in database\database-url.txt (one line).
# Option B: If not set, follow the step-by-step SQL Editor instructions below.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) { $dbUrl = $env:SUPABASE_DB_URL }
if (-not $dbUrl) {
    $urlFile = Join-Path $root "database\database-url.txt"
    if (Test-Path $urlFile) {
        $dbUrl = (Get-Content $urlFile -Raw).Trim()
        if ($dbUrl) { $env:DATABASE_URL = $dbUrl }
    }
}

if ($dbUrl) {
    Write-Host "Running migrations (connection string found)..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "database")
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing database script dependencies (pg)..." -ForegroundColor Yellow
            npm install
        }
        node run-migrations.js
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host "Migrations completed." -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Migrations: no DATABASE_URL found (script runs migrations from your machine)." -ForegroundColor Gray
    Write-Host "  If you already ran schema.sql + migrations in Supabase SQL Editor, your DB is set up." -ForegroundColor Gray
    Write-Host "  To run migrations from this script: set DATABASE_URL or add database\database-url.txt (see database-url.txt.example)." -ForegroundColor Gray
}