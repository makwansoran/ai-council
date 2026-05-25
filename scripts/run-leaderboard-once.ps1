$ErrorActionPreference = "Stop"
$headers = @{ "x-cron-secret" = "change-me" }
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/ingest/leaderboard" -Method POST -Headers $headers -UseBasicParsing -TimeoutSec 300
Write-Output $response.Content
