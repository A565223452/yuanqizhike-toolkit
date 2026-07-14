$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$emptyEntries = $json | Where-Object { [string]::IsNullOrEmpty($_.detailUrl) }
Write-Host "=== Tools still with empty detailUrl ==="
$emptyEntries | ForEach-Object { Write-Host ($_.title + ' - ' + $_.zipUrl) }