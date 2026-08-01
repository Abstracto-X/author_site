[CmdletBinding(DefaultParameterSetName = "Query")]
param(
    [Parameter(Mandatory, ParameterSetName = "Query")]
    [string]$Query,

    [Parameter(Mandatory, ParameterSetName = "File")]
    [string]$File,

    [string]$EnvironmentFile = "",
    [string]$PsqlPath = "$env:USERPROFILE\scoop\apps\postgresql\current\bin\psql.exe"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($EnvironmentFile)) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $EnvironmentFile = Join-Path $scriptDirectory "..\..\.env"
}

if (-not (Test-Path -LiteralPath $PsqlPath -PathType Leaf)) {
    throw "psql is missing: $PsqlPath"
}

$connectionUrl = $env:SUPABASE_AI_DB_URL
if ([string]::IsNullOrWhiteSpace($connectionUrl)) {
    if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
        throw "SUPABASE_AI_DB_URL is unset and .env was not found."
    }

    $line = Get-Content -LiteralPath $EnvironmentFile |
        Where-Object { $_ -match '^\s*SUPABASE_AI_DB_URL\s*=' } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($line)) {
        throw "SUPABASE_AI_DB_URL is missing from $EnvironmentFile"
    }

    $connectionUrl = ($line -split "=", 2)[1].Trim()
}

$uri = [Uri]$connectionUrl
$userParts = $uri.UserInfo -split ":", 2
if ($userParts.Count -ne 2) {
    throw "SUPABASE_AI_DB_URL must include a username and password."
}

$databaseUser = [Uri]::UnescapeDataString($userParts[0])
$databasePassword = [Uri]::UnescapeDataString($userParts[1])
$databaseName = $uri.AbsolutePath.TrimStart("/")

try {
    $env:PGPASSWORD = $databasePassword
    $env:PGCONNECT_TIMEOUT = "20"

    $arguments = @(
        "--host=$($uri.Host)",
        "--port=$($uri.Port)",
        "--username=$databaseUser",
        "--dbname=$databaseName",
        "--no-password",
        "--set=ON_ERROR_STOP=1"
    )

    if ($PSCmdlet.ParameterSetName -eq "File") {
        $resolvedFile = (Resolve-Path -LiteralPath $File).Path
        $arguments += "--file=$resolvedFile"
    } else {
        $arguments += "--command=$Query"
    }

    & $PsqlPath @arguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
}
