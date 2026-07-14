$toolsDirs = Get-ChildItem -Directory 'tools' | Select-Object -ExpandProperty Name
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$registeredPaths = $json | ForEach-Object { $_.detailUrl } | Where-Object { $_ -ne '' } | ForEach-Object { ($_.Replace('/tools/', '').Replace('/index.html', '')) }
$unregistered = $toolsDirs | Where-Object { $registeredPaths -notcontains $_ }

# Get entries with empty detailUrl
$emptyDetailEntries = $json | Where-Object { [string]::IsNullOrEmpty($_.detailUrl) }

# Combine: tools that have empty detailUrl OR are not in JSON at all
Write-Host "=== Tools needing detailUrl fix ==="
Write-Host "Total unregistered tools: " $unregistered.Count
Write-Host "Tools with empty detailUrl: " $emptyDetailEntries.Count

# Check for overlap
$unregisteredSlugs = $unregistered
$emptyDetailSlugs = $emptyDetailEntries | ForEach-Object { 
    $_.detailUrl -replace '^/tools/', '' -replace '/index.html', '' 
} | Where-Object { $_ -ne '' }

Write-Host ""
Write-Host "=== All tools that need detailUrl fixed ==="
($unregistered + $emptyDetailSlugs | Sort-Object | Get-Unique) | ForEach-Object { Write-Host $_ }