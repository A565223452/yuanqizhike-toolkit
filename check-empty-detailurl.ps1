$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$emptyDetail = $json | Where-Object { [string]::IsNullOrEmpty($_.detailUrl) }
Write-Host '=== Tools with empty detailUrl in JSON ==='
$emptyDetail | ForEach-Object {
    Write-Host ($_.title + ' - zipUrl: ' + $_.zipUrl)
}