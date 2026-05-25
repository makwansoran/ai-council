param(
  [string]$BaseUrl = "http://localhost:3001",
  [int]$EverySeconds = 300,
  [string]$Secret = $(if ($env:CRON_SECRET) { $env:CRON_SECRET } else { "change-me" })
)

$ErrorActionPreference = "Continue"
Write-Output "AI Market Council continuous ingest started: $BaseUrl every ${EverySeconds}s"

while ($true) {
  $started = Get-Date -Format o
  try {
    $headers = @{}
    if ($Secret) {
      $headers["x-cron-secret"] = $Secret
    }
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/ingest/all" -Method POST -Headers $headers -UseBasicParsing -TimeoutSec 240
    Write-Output "[$started] OK HTTP $($res.StatusCode) $($res.Content)"
  } catch {
    Write-Output "[$started] ERROR $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $EverySeconds
}
