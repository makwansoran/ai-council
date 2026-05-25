$ErrorActionPreference = "Stop"
$headers = @{ "x-cron-secret" = "change-me" }
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/ingest/all" -Method POST -Headers $headers -UseBasicParsing -TimeoutSec 240
Write-Output $response.Content
