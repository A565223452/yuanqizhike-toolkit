# First get list of unregistered tools
$toolsDirs = Get-ChildItem -Directory 'tools' | Select-Object -ExpandProperty Name
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$registeredPaths = $json | ForEach-Object { $_.detailUrl } | Where-Object { $_ -ne '' } | ForEach-Object { ($_.Replace('/tools/', '').Replace('/index.html', '')) }
$unregistered = $toolsDirs | Where-Object { $registeredPaths -notcontains $_ }

# Now categorize them
Write-Host "=== Total unregistered tools: " $unregistered.Count "==="
Write-Host ""

# Categorize by checking if they're website/dev tools
$websiteTools = @('og-preview', 'cors-checker', 'dns-lookup', 'ssl-checker', 'backlink-checker')
$otherTools = $unregistered | Where-Object { $websiteTools -notcontains $_ }

Write-Host "=== Website Tools (5) ==="
$websiteTools | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "=== Other Unregistered Tools (" $otherTools.Count ") ==="
$otherTools | Sort-Object | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "=== Summary ==="
Write-Host "Website tools: 5"
Write-Host "Other tools: " $otherTools.Count
Write-Host "Total: " ($websiteTools.Count + $otherTools.Count)