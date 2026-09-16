# news-restore.ps1 - puts a backup copy of data\news back. Nothing is deleted: the current data\news is renamed to
# data\news.before-restore-<yyyyMMdd-HHmmss> first. The service is stopped during the swap and started again (all
# editors are signed out). Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\web\web1\3qdc-unified\scripts\news-restore.ps1 -From C:\web\web1\_backup\news\20260917-0330
# -NoService skips stopping/starting the service (for trying it on a test folder with -Root).
param(
  [Parameter(Mandatory = $true)][string]$From,
  [string]$Root = 'C:\web\web1\3qdc-unified',
  [switch]$NoService
)
$ErrorActionPreference = 'Stop'
$nssm = 'C:\ProgramData\chocolatey\bin\nssm.exe'
$data = Join-Path $Root 'data\news'
if (-not (Test-Path (Join-Path $From 'posts'))) { throw "not a news backup (no posts folder): $From" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$aside = Join-Path $Root "data\news.before-restore-$stamp"
if (-not $NoService) { & $nssm stop 3qdc-unified | Out-Null; "service stopped" }
try {
  if (Test-Path $data) { Rename-Item -Path $data -NewName (Split-Path $aside -Leaf); "current data kept at $aside" }
  robocopy $From $data /E /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy exit $LASTEXITCODE" }
  "restored $From -> $data ($(@(Get-ChildItem (Join-Path $data 'posts') -Filter *.json).Count) articles)"
} catch {
  # put the previous data back if the copy failed
  if ((Test-Path $aside) -and -not (Test-Path (Join-Path $data 'posts'))) {
    if (Test-Path $data) { Remove-Item -Recurse -Force $data }
    Rename-Item -Path $aside -NewName 'news'
    "copy failed, previous data put back"
  }
  throw
} finally {
  if (-not $NoService) { & $nssm start 3qdc-unified | Out-Null; "service started: $((Get-Service 3qdc-unified).Status)" }
}
