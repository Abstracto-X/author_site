[CmdletBinding()]
param(
    [string]$CredentialPath = "$env:LOCALAPPDATA\AuthorSiteSafeguards\supabase-backup.credential.xml",
    [string[]]$DestinationRoots = @(
        "A:\Author Site Backups",
        "G:\My Drive\Author Site Backups"
    ),
    [int]$RetentionDays = 30,
    [string]$PostgresBin = "$env:USERPROFILE\scoop\apps\postgresql\current\bin"
)

$ErrorActionPreference = "Stop"
$projectRef = "cqgrulawpwkrdvxagzez"
$databaseHost = "aws-1-ap-south-1.pooler.supabase.com"
$databasePort = 5432
$databaseName = "postgres"
$databaseUser = "postgres.$projectRef"
$runName = Get-Date -Format "yyyy-MM-dd_HHmmss"
$workingRoot = Join-Path $env:TEMP "AuthorSiteSupabaseBackup"
$workingDirectory = Join-Path $workingRoot $runName
$logPath = Join-Path $workingDirectory "backup.log"
$persistentLogRoot = Join-Path $env:LOCALAPPDATA "AuthorSiteSafeguards\logs"
$persistentLogPath = Join-Path $persistentLogRoot "backup-job.log"

function Write-BackupLog {
    param([string]$Message)

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    $line | Tee-Object -FilePath $logPath -Append
    Add-Content -LiteralPath $persistentLogPath -Value $line -Encoding UTF8
}

function Assert-Executable {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required executable is missing: $Path"
    }
}

function Invoke-ValidatedDump {
    param(
        [string]$Name,
        [string[]]$AdditionalArguments
    )

    $pgDump = Join-Path $PostgresBin "pg_dump.exe"
    $pgRestore = Join-Path $PostgresBin "pg_restore.exe"
    $target = Join-Path $workingDirectory "$Name.backup"
    $stderr = Join-Path $workingDirectory "$Name.stderr.log"

    $arguments = @(
        "--host=$databaseHost",
        "--port=$databasePort",
        "--username=$databaseUser",
        "--dbname=$databaseName",
        "--format=custom",
        "--no-owner",
        "--no-publications",
        "--no-subscriptions",
        "--lock-wait-timeout=10s",
        "--file=$target"
    ) + $AdditionalArguments

    Write-BackupLog "Starting $Name dump."
    & $pgDump @arguments 2> $stderr
    if ($LASTEXITCODE -ne 0) {
        $detail = if (Test-Path -LiteralPath $stderr) {
            (Get-Content -LiteralPath $stderr -Raw).Trim()
        } else {
            "No pg_dump error output was captured."
        }
        throw "$Name pg_dump failed with exit code $LASTEXITCODE. $detail"
    }

    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        throw "$Name did not create its expected backup file."
    }

    $file = Get-Item -LiteralPath $target
    if ($file.Length -lt 1024) {
        throw "$Name backup is unexpectedly small ($($file.Length) bytes)."
    }

    & $pgRestore --list $target | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed pg_restore archive validation."
    }

    if (Test-Path -LiteralPath $stderr) {
        Remove-Item -LiteralPath $stderr -Force
    }

    Write-BackupLog "Completed and validated $Name ($($file.Length) bytes)."
}

function Copy-BackupToDestination {
    param([string]$DestinationRoot)

    $driveRoot = [System.IO.Path]::GetPathRoot($DestinationRoot)
    if ([string]::IsNullOrWhiteSpace($driveRoot) -or -not (Test-Path -LiteralPath $driveRoot)) {
        throw "Destination drive is unavailable: $DestinationRoot"
    }

    New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
    $resolvedRoot = (Resolve-Path -LiteralPath $DestinationRoot).Path.TrimEnd("\")
    $destination = Join-Path $resolvedRoot $runName

    if (-not $destination.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to copy outside the configured backup root: $destination"
    }

    Copy-Item -LiteralPath $workingDirectory -Destination $destination -Recurse -Force

    $copiedManifest = Join-Path $destination "manifest.json"
    if (-not (Test-Path -LiteralPath $copiedManifest -PathType Leaf)) {
        throw "Backup copy validation failed for $destination"
    }

    Write-BackupLog "Copied backup to $destination."

    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $resolvedRoot -Directory |
        Where-Object {
            $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{6}$' -and
            $_.LastWriteTime -lt $cutoff -and
            $_.FullName.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)
        } |
        ForEach-Object {
            Write-BackupLog "Removing expired backup $($_.FullName)."
            Remove-Item -LiteralPath $_.FullName -Recurse -Force
        }
}

New-Item -ItemType Directory -Path $workingDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $persistentLogRoot -Force | Out-Null

$pgDumpPath = Join-Path $PostgresBin "pg_dump.exe"
$pgRestorePath = Join-Path $PostgresBin "pg_restore.exe"
Assert-Executable $pgDumpPath
Assert-Executable $pgRestorePath

if (-not (Test-Path -LiteralPath $CredentialPath -PathType Leaf)) {
    throw "Encrypted backup credential is missing: $CredentialPath"
}

$credential = Import-Clixml -LiteralPath $CredentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)

try {
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:PGCONNECT_TIMEOUT = "20"

    Write-BackupLog "Starting Supabase backup for project $projectRef."

    Invoke-ValidatedDump "public" @(
        "--schema=public"
    )

    Invoke-ValidatedDump "auth-data" @(
        "--data-only",
        "--schema=auth",
        "--exclude-table=auth.schema_migrations"
    )

    Invoke-ValidatedDump "storage-metadata" @(
        "--data-only",
        "--schema=storage",
        "--exclude-table=storage.migrations",
        "--exclude-table=storage.buckets_vectors",
        "--exclude-table=storage.vector_indexes"
    )

    $backupFiles = Get-ChildItem -LiteralPath $workingDirectory -Filter "*.backup" |
        Sort-Object Name |
        ForEach-Object {
            [ordered]@{
                name = $_.Name
                bytes = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        }

    $manifest = [ordered]@{
        created_at = (Get-Date).ToUniversalTime().ToString("o")
        project_ref = $projectRef
        database_host = $databaseHost
        postgres_client = (& $pgDumpPath --version)
        retention_days = $RetentionDays
        contents = @(
            "public schema and data",
            "Supabase Auth data",
            "Supabase Storage metadata (not Storage objects)"
        )
        files = @($backupFiles)
    }

    $manifest |
        ConvertTo-Json -Depth 6 |
        Set-Content -LiteralPath (Join-Path $workingDirectory "manifest.json") -Encoding UTF8

    $copyErrors = @()
    foreach ($destinationRoot in $DestinationRoots) {
        try {
            Copy-BackupToDestination $destinationRoot
        } catch {
            $copyErrors += $_.Exception.Message
            Write-BackupLog "COPY FAILURE: $($_.Exception.Message)"
        }
    }

    if ($copyErrors.Count -gt 0) {
        throw "One or more backup destinations failed: $($copyErrors -join ' | ')"
    }

    Write-BackupLog "Backup completed successfully on all destinations."

    # Copy the finalized log again so both destinations contain the exact same
    # complete run log rather than snapshots taken at different copy moments.
    foreach ($destinationRoot in $DestinationRoots) {
        $finalLogTarget = Join-Path (Join-Path $DestinationRoot $runName) "backup.log"
        Copy-Item -LiteralPath $logPath -Destination $finalLogTarget -Force
    }
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if (Test-Path -LiteralPath $workingDirectory) {
        Remove-Item -LiteralPath $workingDirectory -Recurse -Force
    }
}
