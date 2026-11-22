# dev.ps1  --  noroset dev environment launcher
#
#   .\dev.ps1          full start (docker, migrate, build, seed, api+web)
#   .\dev.ps1 -Stop    stop all servers
#   .\dev.ps1 -Reset   wipe DB volume (asks confirmation)
#   .\dev.ps1 -Seed    create/refresh test user only
#   .\dev.ps1 -Logs    tail API log

param([switch]$Stop, [switch]$Reset, [switch]$Seed, [switch]$Logs)

$ErrorActionPreference = 'Stop'
$Root    = $PSScriptRoot
$LogDir  = Join-Path $Root '.logs'
$ApiLog  = Join-Path $LogDir 'api.log'
$WebLog  = Join-Path $LogDir 'web.log'
$PidFile = Join-Path $Root '.dev-pids.json'

function Write-Step  { param($m) Write-Host "  -> $m" -ForegroundColor Cyan }
function Write-Ok    { param($m) Write-Host "  OK $m"  -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "  !! $m"  -ForegroundColor Yellow }
function Write-Title { param($m) Write-Host "`n== $m" -ForegroundColor White }

function Fail { param($m) Write-Host "  ERR $m" -ForegroundColor Red; exit 1 }

function Load-Env {
    $envFile = Join-Path $Root '.env'
    if (-not (Test-Path $envFile)) { Fail ".env not found -- copy from .env.example" }
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)$') {
            $val = $Matches[2].Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($Matches[1], $val)
        }
    }
    Write-Ok ".env loaded"
}

function Kill-Port { param([int]$Port)
    # match both 0.0.0.0:PORT and [::]:PORT (IPv4 and IPv6)
    $lines = netstat -ano 2>$null | Select-String ":$Port\s" | Where-Object { $_ -match 'LISTENING' }
    $killed = @{}
    foreach ($line in $lines) {
        $parts = ($line.ToString().Trim()) -split '\s+'
        $pid_ = $parts[-1]
        if ($pid_ -and $pid_ -ne '0' -and -not $killed.ContainsKey($pid_)) {
            $killed[$pid_] = $true
            Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
            Write-Warn "port $Port freed (PID $pid_)"
        }
    }
    if ($killed.Count -gt 0) { Start-Sleep -Milliseconds 800 }
}

function Assert-Docker {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Docker is not running -- open Docker Desktop" }
    Write-Ok "Docker is running"
}

function Start-Postgres {
    Write-Title "PostgreSQL"
    $status = docker inspect --format "{{.State.Status}}" noroset-postgres 2>$null
    if ($LASTEXITCODE -ne 0) { $status = 'missing' }
    $status = $status.Trim()

    if ($status -eq 'running') {
        Write-Ok "container already running"
    } elseif ($status -eq 'exited') {
        Write-Step "container stopped -- starting..."
        docker start noroset-postgres | Out-Null
    } else {
        Write-Step "container missing -- docker compose up..."
        Push-Location $Root
        docker compose up -d 2>&1 | Out-Null
        Pop-Location
    }

    Write-Step "waiting for PostgreSQL to be ready..."
    $tries = 0
    do {
        $tries++
        if ($tries -gt 30) { Fail "PostgreSQL not ready after 30s" }
        Start-Sleep 1
        docker exec noroset-postgres pg_isready -q 2>$null | Out-Null
    } while ($LASTEXITCODE -ne 0)
    Write-Ok "PostgreSQL ready (port 5433)"
}

function Ensure-TestDb {
    # tests run against <db>_test (see test setup-env) so they never wipe dev data
    $pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'noroset' }
    $testDb = "$(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'noroset' })_test"
    $exists = docker exec noroset-postgres psql -U $pgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$testDb'"
    if ("$exists".Trim() -eq '1') { Write-Ok "test database $testDb exists"; return }
    Write-Step "creating test database $testDb..."
    docker exec noroset-postgres createdb -U $pgUser $testDb
    if ($LASTEXITCODE -ne 0) { Fail "could not create $testDb" }
    $migratorPw = if ($env:POSTGRES_MIGRATOR_PASSWORD) { $env:POSTGRES_MIGRATOR_PASSWORD } else { 'noroset_migrator_password' }
    $appPw = if ($env:POSTGRES_APP_PASSWORD) { $env:POSTGRES_APP_PASSWORD } else { 'noroset_app_password' }
    $sql = (Get-Content (Join-Path $Root 'packages/db/sql/roles.sql') -Raw).
        Replace('__MIGRATOR_PASSWORD__', $migratorPw).Replace('__APP_PASSWORD__', $appPw)
    $sql | docker exec -i noroset-postgres psql -q -v ON_ERROR_STOP=1 -U $pgUser -d $testDb | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "could not set up roles in $testDb" }
    Write-Ok "test database $testDb ready (tests migrate it themselves)"
}

function Run-Migrations {
    Write-Title "Migrations"
    Write-Step "running db:migrate..."
    Push-Location $Root
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = pnpm --filter "@noroset/db" db:migrate 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    Pop-Location
    if ($code -ne 0) { Fail "migration failed:`n$out" }
    Write-Ok "migrations applied"
}

function Build-Packages {
    Write-Title "Build packages"
    Write-Step "building workspace packages..."
    Push-Location $Root
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = pnpm build:packages 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    Pop-Location
    if ($code -ne 0) { Fail "build failed:`n$out" }
    Write-Ok "packages built"
}

function Seed-TestUser {
    Write-Title "Test user"
    $seedScript = Join-Path $Root 'seed-test-user.mjs'
    if (-not (Test-Path $seedScript)) { Write-Warn "seed-test-user.mjs not found"; return }
    Write-Step "seeding 09120000001 / 12345678..."
    Push-Location $Root
    $out = node $seedScript 2>&1
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Write-Warn "seed failed: $out" } else { Write-Ok $out }
}

function Start-DevServer { param([string]$Name, [string]$Filter, [int]$Port, [string]$LogFile)
    Write-Step "starting $Name on port $Port..."
    Kill-Port $Port
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
    # set PORT explicitly so Next.js/Nest don't auto-increment to a busy port
    $proc = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList "/c set PORT=$Port && pnpm --filter `"$Filter`" dev" `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $LogFile `
        -RedirectStandardError "$LogFile.err" `
        -PassThru -WindowStyle Hidden
    Write-Ok "$Name started (PID $($proc.Id)) -- log: $LogFile"
    return $proc.Id
}

function Wait-Http { param([string]$Url, [string]$Name, [int]$Seconds = 60, [string]$MustContain = '')
    Write-Step "waiting for $Name ($Url)..."
    for ($i = 1; $i -le $Seconds; $i++) {
        Start-Sleep 1
        $body = curl.exe -s --max-time 2 $Url 2>$null
        if ($body) {
            if ($MustContain -and $body -notmatch [regex]::Escape($MustContain)) { continue }
            Write-Ok "$Name is ready"; return
        }
    }
    Write-Warn "$Name did not respond after ${Seconds}s -- check .logs\api.log"
}

# ── -Stop ─────────────────────────────────────────────────────────────────────
if ($Stop) {
    Write-Title "Stopping servers"
    Kill-Port 3001
    Kill-Port 3000
    if (Test-Path $PidFile) {
        $pids = Get-Content $PidFile | ConvertFrom-Json
        if ($pids.api) { Stop-Process -Id $pids.api -Force -ErrorAction SilentlyContinue }
        if ($pids.web) { Stop-Process -Id $pids.web -Force -ErrorAction SilentlyContinue }
        Remove-Item $PidFile -ErrorAction SilentlyContinue
    }
    Write-Ok "all servers stopped"
    exit 0
}

# ── -Reset ────────────────────────────────────────────────────────────────────
if ($Reset) {
    Write-Title "Reset DB"
    Write-Host "  !! This will DELETE all data!" -ForegroundColor Red
    $confirm = Read-Host "  Continue? (y/N)"
    if ($confirm -ne 'y') { Write-Warn "cancelled"; exit 0 }
    # volume name depends on the compose project (folder name), so read it from the container
    $vol = docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' noroset-postgres 2>$null
    docker stop noroset-postgres 2>$null | Out-Null
    docker rm noroset-postgres 2>$null | Out-Null
    if ($vol) { docker volume rm $vol.Trim() 2>$null | Out-Null }
    Write-Ok "DB wiped -- run .\dev.ps1 to start fresh"
    exit 0
}

# ── -Logs ─────────────────────────────────────────────────────────────────────
if ($Logs) {
    if (Test-Path $ApiLog) { Get-Content $ApiLog -Wait }
    else { Write-Warn "API log not found -- run .\dev.ps1 first" }
    exit 0
}

# ── -Seed ─────────────────────────────────────────────────────────────────────
if ($Seed) {
    Load-Env
    Start-Postgres
    Seed-TestUser
    exit 0
}

# ── full start ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  noroset dev" -ForegroundColor Magenta
Write-Host "  -----------" -ForegroundColor Magenta

Load-Env
Assert-Docker
Start-Postgres
Ensure-TestDb
Run-Migrations
Build-Packages
Seed-TestUser

Write-Title "Servers"
$apiPid = Start-DevServer -Name 'API' -Filter '@noroset/api' -Port 3001 -LogFile $ApiLog
# wait for API to bind its port before Web starts (Web auto-increments if 3001 busy)
Wait-Http 'http://localhost:3001/health' 'API' -MustContain 'noroset-api'
Kill-Port 3000
$webPid = Start-DevServer -Name 'Web' -Filter '@noroset/web' -Port 3000 -LogFile $WebLog
@{ api = $apiPid; web = $webPid } | ConvertTo-Json | Set-Content $PidFile

Wait-Http 'http://localhost:3000' 'Web'

Write-Host ""
Write-Host "  Web  : http://localhost:3000"       -ForegroundColor Green
Write-Host "  API  : http://localhost:3001"       -ForegroundColor Green
Write-Host "  Auth : http://localhost:3000/auth"  -ForegroundColor Green
Write-Host ""
Write-Host "  Test : 09120000001 / 12345678"      -ForegroundColor Yellow
Write-Host ""
Write-Host "  .\dev.ps1 -Logs   tail API log"     -ForegroundColor Gray
Write-Host "  .\dev.ps1 -Stop   stop servers"     -ForegroundColor Gray
Write-Host "  .\dev.ps1 -Reset  wipe DB"          -ForegroundColor Gray
Write-Host ""
