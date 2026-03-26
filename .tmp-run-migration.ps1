param(
  [string]$MigrationFile = 'supabase/migrations/001_initial_schema.sql',
  [string]$OutputFile = '.tmp-migration-result.txt',
  [string]$SupabaseAccessToken,
  [string]$SupabaseProjectRef
)

$ErrorActionPreference = 'Stop'

$pat = if ([string]::IsNullOrWhiteSpace($SupabaseAccessToken)) { $env.SUPABASE_ACCESS_TOKEN } else { $SupabaseAccessToken }
$ref = if ([string]::IsNullOrWhiteSpace($SupabaseProjectRef)) { $env.SUPABASE_PROJECT_REF } else { $SupabaseProjectRef }
$outFile = $OutputFile

function Write-Result($line) {
  Add-Content -Path $outFile -Value ([string]$line)
}

function IsPlaceholderValue([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return $true }
  $v = $value.Trim().ToLowerInvariant()
  return (
    $v -eq '<project-ref>' -or
    $v -eq '<personal-access-token>' -or
    $v -eq 'placeholder' -or
    $v -eq 'your_real_pat' -or
    $v -eq 'your_real_project_ref' -or
    $v -eq 'sbp_xxx_real_token' -or
    $v.Contains('replace_me')
  )
}

if (Test-Path $outFile) { Remove-Item $outFile -Force }

try {
  if (IsPlaceholderValue $pat -or IsPlaceholderValue $ref) {
    throw 'SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must be real values (not placeholders). Set them in your terminal environment or pass -SupabaseAccessToken/-SupabaseProjectRef.'
  }

  if (-not (Test-Path $MigrationFile)) {
    throw "Migration file not found: $MigrationFile"
  }

  $authCode = curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $pat" https://api.supabase.com/v1/projects
  Write-Result "AUTH_HTTP=$authCode"

  Write-Result "MIGRATION_FILE=$MigrationFile"

  $sql = Get-Content $MigrationFile -Raw
  $body = @{ query = $sql } | ConvertTo-Json -Compress -Depth 10

  try {
    $m = Invoke-WebRequest -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers @{ Authorization = "Bearer $pat" } -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Result ("MIGRATION_HTTP=" + [int]$m.StatusCode)
    if ($m.Content) { Write-Result ([string]$m.Content) }
  } catch {
    if ($_.Exception.Response) {
      $r = $_.Exception.Response
      Write-Result ("MIGRATION_HTTP=" + [int]$r.StatusCode.value__)
      $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
      Write-Result ([string]$sr.ReadToEnd())
    } else {
      Write-Result 'MIGRATION_HTTP=-1'
      Write-Result $_.Exception.Message
    }
  }

  $checkSql = "select to_regclass('public.profiles') as profiles, to_regclass('public.user_streaks') as user_streaks, to_regclass('public.dance_styles') as dance_styles, to_regclass('public.routines') as routines;"
  $checkBody = @{ query = $checkSql } | ConvertTo-Json -Compress

  try {
    $v = Invoke-WebRequest -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers @{ Authorization = "Bearer $pat" } -ContentType 'application/json' -Body $checkBody -UseBasicParsing
    Write-Result ("VERIFY_HTTP=" + [int]$v.StatusCode)
    if ($v.Content) { Write-Result ([string]$v.Content) }
  } catch {
    if ($_.Exception.Response) {
      $r = $_.Exception.Response
      Write-Result ("VERIFY_HTTP=" + [int]$r.StatusCode.value__)
      $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
      Write-Result ([string]$sr.ReadToEnd())
    } else {
      Write-Result 'VERIFY_HTTP=-1'
      Write-Result $_.Exception.Message
    }
  }
} catch {
  Write-Result ('FATAL=' + $_.Exception.Message)
}
