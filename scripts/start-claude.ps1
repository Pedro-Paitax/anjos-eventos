$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ============================================================
# CONFIGURAÇÃO
# ============================================================

$TunnelPort = 15433

# IP do PostgreSQL no servidor Docker
$RemoteHost = "172.18.0.3"
$RemotePort = 5432

# Host SSH configurado no ~/.ssh/config
$SshHost = "ender"

$PgHost = "127.0.0.1"
$PgUser = "ender"
$PgDatabase = "senhorchurrasco"

# Senha usada somente para o teste local do PostgreSQL.
# Não é gravada no .mcp.json nem no Git.
$PgPassword = "ender"


# ============================================================
# CABEÇALHO
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      ANJOS EVENTOS - DEV ENV" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot


# ============================================================
# 1. VERIFICAR SSH
# ============================================================

Write-Host "[1/5] Verificando SSH..." -ForegroundColor Yellow

try {
    $sshTest = ssh `
        -o BatchMode=yes `
        -o ConnectTimeout=5 `
        $SshHost `
        "echo SSH_OK" 2>$null
}
catch {
    $sshTest = $null
}

if ($sshTest -ne "SSH_OK") {
    Write-Host ""
    Write-Host "ERRO: Não foi possível conectar ao servidor SSH '$SshHost'." -ForegroundColor Red
    Write-Host ""
    Write-Host "Teste manualmente com:" -ForegroundColor DarkYellow
    Write-Host "ssh $SshHost" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "      SSH OK" -ForegroundColor Green


# ============================================================
# 2. VERIFICAR / CRIAR TÚNEL SSH
# ============================================================

Write-Host "[2/5] Verificando túnel PostgreSQL..." -ForegroundColor Yellow

$portInUse = Get-NetTCPConnection `
    -LocalPort $TunnelPort `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($portInUse) {

    Write-Host "      Túnel já está ativo em localhost:$TunnelPort" -ForegroundColor Green

}
else {

    Write-Host "      Criando túnel SSH..." -ForegroundColor DarkYellow

    $TunnelArgument = "-N -L ${TunnelPort}:${RemoteHost}:${RemotePort} $SshHost"

    Start-Process `
        -FilePath "ssh" `
        -ArgumentList $TunnelArgument `
        -WindowStyle Minimized

    Start-Sleep -Seconds 2

    $portInUse = Get-NetTCPConnection `
        -LocalPort $TunnelPort `
        -State Listen `
        -ErrorAction SilentlyContinue

    if (-not $portInUse) {

        Write-Host ""
        Write-Host "ERRO: Não foi possível criar o túnel PostgreSQL." -ForegroundColor Red
        Write-Host ""
        Write-Host "Comando esperado:" -ForegroundColor DarkYellow
        Write-Host "ssh -N -L ${TunnelPort}:${RemoteHost}:${RemotePort} $SshHost" -ForegroundColor White
        Write-Host ""

        exit 1
    }

    Write-Host "      Túnel criado: localhost:$TunnelPort" -ForegroundColor Green
}


# ============================================================
# 3. TESTAR POSTGRESQL
# ============================================================

Write-Host "[3/5] Testando PostgreSQL..." -ForegroundColor Yellow

$env:PGPASSWORD = $PgPassword

try {

    $pgTest = psql `
        -h $PgHost `
        -p $TunnelPort `
        -U $PgUser `
        -d $PgDatabase `
        -tAc "SELECT 1;" 2>$null

}
finally {

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if ($pgTest.Trim() -ne "1") {

    Write-Host ""
    Write-Host "ERRO: PostgreSQL não respondeu corretamente." -ForegroundColor Red
    Write-Host ""
    Write-Host "Configuração testada:" -ForegroundColor DarkYellow
    Write-Host "Host: $PgHost"
    Write-Host "Porta: $TunnelPort"
    Write-Host "Usuário: $PgUser"
    Write-Host "Banco: $PgDatabase"
    Write-Host ""

    exit 1
}

Write-Host "      PostgreSQL OK" -ForegroundColor Green


# ============================================================
# 4. VERIFICAR .mcp.json
# ============================================================

Write-Host "[4/5] Verificando MCP PostgreSQL..." -ForegroundColor Yellow

$McpFile = Join-Path $ProjectRoot ".mcp.json"

if (-not (Test-Path $McpFile)) {

    Write-Host "      ERRO: .mcp.json não encontrado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Crie o arquivo .mcp.json na raiz do projeto." -ForegroundColor DarkYellow
    Write-Host ""

    exit 1
}

Write-Host "      .mcp.json encontrado" -ForegroundColor Green


# ============================================================
# 5. INICIAR CLAUDE CODE
# ============================================================

Write-Host "[5/5] Iniciando Claude Code..." -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "          AMBIENTE PRONTO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Projeto:    $ProjectRoot"
Write-Host "SSH:        $SshHost"
Write-Host "PostgreSQL: $PgHost`:$TunnelPort"
Write-Host "Banco:      $PgDatabase"
Write-Host "MCP:        postgres"
Write-Host ""

claude