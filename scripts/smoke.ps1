$ErrorActionPreference = "Stop"
$paths = @("/", "/markets", "/leaderboard", "/signals", "/scrapers", "/x", "/hormuz", "/council", "/trades", "/api-references")
foreach ($p in $paths) {
  try {
    $r = Invoke-WebRequest -Uri ("http://localhost:3001" + $p) -UseBasicParsing -TimeoutSec 30
    Write-Output ("OK   " + $p + "  HTTP " + $r.StatusCode + "  " + $r.RawContentLength + " bytes")
  } catch {
    Write-Output ("FAIL " + $p + "  " + $_.Exception.Message)
  }
}
