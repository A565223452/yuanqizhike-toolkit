$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$emptyCount = ($json | Where-Object { [string]::IsNullOrEmpty($_.detailUrl) }).Count
Write-Host "Remaining empty detailUrl entries: $emptyCount"