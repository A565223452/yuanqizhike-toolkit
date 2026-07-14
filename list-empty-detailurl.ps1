$json = Get-Content 'tools-list.json' -Raw | ConvertFrom-Json
$emptyEntries = $json | Where-Object { [string]::IsNullOrEmpty($_.detailUrl) }
Write-Host '=== Entries with empty detailUrl ==='
$emptyEntries | ForEach-Object { Write-Host ($_.title + ' -> ' + $_.zipUrl) }