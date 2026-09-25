# news-backup.ps1 - copies data\news (articles, accounts, revisions, trash, uploaded pictures) to
# C:\web\web1\_backup\news\<yyyyMMdd-HHmm>\ and keeps the newest 30 copies. data\news is outside git, so this is the
# only copy of the articles; the early sign-up list (data\dang-ky-som) is copied too, see the end. Runs daily at 03:30 as the scheduled task "3qdc-news-backup"; safe to run by hand:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\web\web1\3qdc-unified\scripts\news-backup.ps1
# Every run appends one line to verify-out\news-backup.log.
param(
  [string]$Root = 'C:\web\web1\3qdc-unified',
  [string]$Dest = 'C:\web\web1\_backup\news',
  [int]$Keep = 30
)
$ErrorActionPreference = 'Stop'
$src = Join-Path $Root 'data\news'
$logDir = Join-Path $Root 'verify-out'
$log = Join-Path $logDir 'news-backup.log'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
function Write-Log([string]$msg) { Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format 's'), $msg) -Encoding ascii; $msg }

if (-not (Test-Path $src)) { Write-Log "FAIL no $src"; exit 1 }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$target = Join-Path $Dest $stamp
# half-written files (.tmp / .part) are skipped; articles are replaced by rename, so a copy is never torn
robocopy $src $target /E /R:2 /W:2 /XF *.tmp *.part /NFL /NDL /NJH /NJS /NP | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) { Write-Log "FAIL robocopy exit $rc copying to $target"; exit 1 }

$files = Get-ChildItem $target -Recurse -File
$bytes = ($files | Measure-Object -Property Length -Sum).Sum
$posts = @(Get-ChildItem (Join-Path $target 'posts') -Filter *.json -ErrorAction SilentlyContinue).Count
$uploads = @(Get-ChildItem (Join-Path $target 'uploads') -Recurse -File -ErrorAction SilentlyContinue).Count

# keep the newest copies only (folders named by this script)
$old = Get-ChildItem $Dest -Directory | Where-Object { $_.Name -match '^\d{8}-\d{4}$' } | Sort-Object Name -Descending | Select-Object -Skip $Keep
foreach ($d in $old) { Remove-Item -Recurse -Force $d.FullName }

# the early sign-up list (data\dang-ky-som, also outside git) goes to its own folder beside the news copies,
# C:\web\web1\_backup\dang-ky-som\<yyyyMMdd-HHmm>\, so restoring the news never touches it; same number of copies kept
$signupSrc = Join-Path $Root 'data\dang-ky-som'
$signupNote = 'signups=none'
if (Test-Path $signupSrc) {
  $signupDest = Join-Path (Split-Path $Dest -Parent) 'dang-ky-som'
  robocopy $signupSrc (Join-Path $signupDest $stamp) /E /R:2 /W:2 /XF *.tmp /NFL /NDL /NJH /NJS /NP | Out-Null
  $rc = $LASTEXITCODE
  if ($rc -ge 8) { Write-Log "FAIL robocopy exit $rc copying $signupSrc"; exit 1 }
  $list = Join-Path (Join-Path $signupDest $stamp) 'dang-ky.jsonl'
  $lines = if (Test-Path $list) { @(Get-Content $list).Count } else { 0 }
  $oldSignup = Get-ChildItem $signupDest -Directory | Where-Object { $_.Name -match '^\d{8}-\d{4}$' } | Sort-Object Name -Descending | Select-Object -Skip $Keep
  foreach ($d in $oldSignup) { Remove-Item -Recurse -Force $d.FullName }
  $signupNote = "signup-lines=$lines"
}

Write-Log ("OK {0} files={1} bytes={2} posts={3} uploads={4} pruned={5} {6}" -f $target, $files.Count, $bytes, $posts, $uploads, @($old).Count, $signupNote)
