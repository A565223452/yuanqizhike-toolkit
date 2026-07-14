$toolsDirs = Get-ChildItem -Directory 'tools' | Select-Object -ExpandProperty Name
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$registeredPaths = $json | ForEach-Object { $_.detailUrl } | Where-Object { $_ -ne '' } | ForEach-Object { ($_.Replace('/tools/', '').Replace('/index.html', '')) }
$unregistered = $toolsDirs | Where-Object { $registeredPaths -notcontains $_ }

Write-Host "=== Checking detail pages for unregistered tools ==="
$missingDetail = 0
$existsDetail = 0
$missingTool = 0
$existsTool = 0

foreach ($tool in $unregistered) {
    $hasIndex = Test-Path "tools/$tool/index.html"
    $hasTool = Test-Path "tools/$tool/tool.html"
    
    if (-not $hasIndex) { $missingDetail++ }
    if ($hasIndex) { $existsDetail++ }
    if (-not $hasTool) { $missingTool++ }
    if ($hasTool) { $existsTool++ }
}

Write-Host "Tools with index.html (detail page): $existsDetail / $($unregistered.Count)"
Write-Host "Tools with tool.html (online tool): $existsTool / $($unregistered.Count)"
Write-Host "Tools MISSING index.html: $missingDetail"
Write-Host "Tools MISSING tool.html: $missingTool"