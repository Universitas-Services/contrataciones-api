# Sembrar la DB de Render desde esta PC usando Docker (Linux).
# Solo funciona si Render permite acceso External desde tu IP.
#
# Si falla con P1001: en Render → Postgres → Networking, asegurate de que
# el IP allow list incluya 0.0.0.0/0 (o tu IP). Si tu red bloquea 5432,
# usa el metodo RUN_SEED_ON_BOOT en el Web Service (recomendado).
#
# Uso:
#   1. En .env: DATABASE_URL = External URL de Render (?sslmode=require)
#   2. powershell -ExecutionPolicy Bypass -File .\scripts\seed-render.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path .env)) {
  Write-Error "No existe .env. Crea el archivo y pon DATABASE_URL (External de Render)."
}

$line = Get-Content .env | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $line) {
  Write-Error "DATABASE_URL no encontrado en .env"
}
$url = $line -replace '^\s*DATABASE_URL\s*=\s*', ''
$url = $url.Trim().Trim('"').Trim("'")

if ($url -match '127\.0\.0\.1|localhost') {
  Write-Error "DATABASE_URL apunta a local. Pon la External Database URL de Render antes de sembrar."
}

if ($url -notmatch 'sslmode=') {
  if ($url -match '\?') { $url = "$url&sslmode=require" } else { $url = "$url?sslmode=require" }
}

Write-Host "Usando Docker (node:20) para correr el seed contra Render..." -ForegroundColor Cyan
Write-Host "Host: $(([uri]$url).Host)" -ForegroundColor DarkGray
Write-Host "Esto puede tardar unos minutos (npm ci + seed)." -ForegroundColor DarkGray

docker run --rm `
  -e "DATABASE_URL=$url" `
  -e "SEED_FORCE=1" `
  -v "${PWD}:/app" `
  -v "/app/node_modules" `
  -w /app `
  node:20-bookworm-slim `
  bash -lc "apt-get update -qq && apt-get install -y -qq openssl python3 make g++ >/dev/null && npm ci && npx prisma generate && npm run seed"

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "El seed desde Docker fallo." -ForegroundColor Red
  Write-Host "Plan B (desde tu PC, sin conectar al puerto 5432):" -ForegroundColor Yellow
  Write-Host "  1. Render → Web Service → Environment → RUN_SEED_ON_BOOT = 1" -ForegroundColor Yellow
  Write-Host "  2. DATABASE_URL = Internal Database URL (misma region)" -ForegroundColor Yellow
  Write-Host "  3. Manual Deploy" -ForegroundColor Yellow
  Write-Host "  4. Cuando arranque, pon RUN_SEED_ON_BOOT = 0" -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Seed completado. Devuelve DATABASE_URL a Postgres local en .env cuando termines." -ForegroundColor Green
