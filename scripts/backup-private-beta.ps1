param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'

function Import-PrivateBetaEnvFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*#' -or $line -notmatch '=') {
      continue
    }

    $separator = $line.IndexOf('=')
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
    if ($name) {
      [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }
}

function Require-PrivateBetaEnv {
  param(
    [string]$Name,
    [string]$FallbackName = ''
  )

  $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value) -and $FallbackName) {
    $value = [Environment]::GetEnvironmentVariable($FallbackName, 'Process')
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing $Name. Configure it in .env.private-beta.local."
  }
  return $value.Trim()
}

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Import-PrivateBetaEnvFile (Join-Path $workspace '.env.local')
Import-PrivateBetaEnvFile (Join-Path $workspace '.env.private-beta.local')

$expectedRef = Require-PrivateBetaEnv 'PRIVATE_BETA_EXPECTED_PROJECT_REF'
$supabaseUrl = Require-PrivateBetaEnv 'PRIVATE_BETA_SUPABASE_URL' 'NEXT_PUBLIC_SUPABASE_URL'
$databaseUrl = Require-PrivateBetaEnv 'PRIVATE_BETA_DB_URL'
$serviceRoleKey = Require-PrivateBetaEnv 'PRIVATE_BETA_SUPABASE_SERVICE_ROLE_KEY' 'SUPABASE_SERVICE_ROLE_KEY'

if ($expectedRef -ne 'qdagzcivuddbztsybxfk') {
  throw "Refusing backup: expected project ref must be qdagzcivuddbztsybxfk."
}

if (-not $supabaseUrl.Contains($expectedRef)) {
  throw "Refusing backup: PRIVATE_BETA_SUPABASE_URL does not match $expectedRef."
}

if (-not $databaseUrl.Contains($expectedRef)) {
  throw "Refusing backup: PRIVATE_BETA_DB_URL does not identify $expectedRef."
}

if (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
  throw 'OutputDirectory must be an absolute path outside the Git repository.'
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$workspacePrefix = $workspace.TrimEnd('\') + '\'
if ($resolvedOutput -eq $workspace -or $resolvedOutput.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing backup: OutputDirectory must be outside the Git repository.'
}

if (Test-Path -LiteralPath $resolvedOutput) {
  throw "Refusing backup: output already exists: $resolvedOutput"
}

New-Item -ItemType Directory -Path $resolvedOutput | Out-Null

function Invoke-SupabaseDump {
  param([string[]]$Arguments)

  & npx.cmd supabase db dump --db-url $databaseUrl @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase database dump failed with exit code $LASTEXITCODE."
  }
}

Write-Output "Backing up project $expectedRef to $resolvedOutput"
Invoke-SupabaseDump @('--file', (Join-Path $resolvedOutput 'roles.sql'), '--role-only')
Invoke-SupabaseDump @('--file', (Join-Path $resolvedOutput 'schema.sql'))
Invoke-SupabaseDump @('--file', (Join-Path $resolvedOutput 'data.sql'), '--data-only', '--use-copy')

$env:PRIVATE_BETA_BACKUP_OUTPUT = $resolvedOutput
node (Join-Path $PSScriptRoot 'backup-private-beta-storage.mjs')
if ($LASTEXITCODE -ne 0) {
  throw "Storage backup failed with exit code $LASTEXITCODE."
}

$requiredFiles = @('roles.sql', 'schema.sql', 'data.sql', 'backup-manifest.json')
foreach ($fileName in $requiredFiles) {
  $filePath = Join-Path $resolvedOutput $fileName
  if (-not (Test-Path -LiteralPath $filePath) -or (Get-Item -LiteralPath $filePath).Length -eq 0) {
    throw "Backup verification failed: missing or empty $fileName."
  }
}

Write-Output "PASS: verified database and Storage backup at $resolvedOutput"
