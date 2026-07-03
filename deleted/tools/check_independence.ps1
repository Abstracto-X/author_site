# Independence scanner for the extracted subscription-only package.
# Run from the package root or new project root:
#   powershell -ExecutionPolicy Bypass -File tools/check_independence.ps1

$ErrorActionPreference = 'Stop'

$patterns = @(
  'gdivyqfhgashkqcqqnas',
  'abstracto_tales',
  'Abstracto Tales',
  'Aether Archives',
  'index.html#gallery',
  'index.html#timeline',
  'external-archive',
  'docs_v2',
  'subscription_bundle.md'
)

$roots = @('index.html', 'styles.css', 'admin.html', 'js', 'site', 'supabase', 'database') | Where-Object { Test-Path $_ }
if (-not $roots.Count) { $roots = @('.') }

Write-Host "Scanning for old project references..." -ForegroundColor Cyan
$found = $false
foreach ($pattern in $patterns) {
  $matches = Get-ChildItem -Path $roots -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\.zip$' } |
    Select-String -SimpleMatch -Pattern $pattern -ErrorAction SilentlyContinue
  if ($matches) {
    $found = $true
    Write-Host "`nPATTERN: $pattern" -ForegroundColor Yellow
    $matches | ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
  }
}

if (-not $found) {
  Write-Host "No old project references found by this scanner." -ForegroundColor Green
} else {
  Write-Host "`nReview every match. Some branding matches may be intentional; old Supabase/project refs should be removed." -ForegroundColor Red
}
