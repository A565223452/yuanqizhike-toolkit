$toolsDirs = Get-ChildItem -Directory 'tools' | Select-Object -ExpandProperty Name
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$registeredPaths = $json | ForEach-Object { $_.detailUrl } | Where-Object { $_ -ne '' } | ForEach-Object { ($_.Replace('/tools/', '').Replace('/index.html', '')) }
$unregistered = $toolsDirs | Where-Object { $registeredPaths -notcontains $_ }

Write-Host "=== Tools MISSING tool.html ==="
foreach ($tool in $unregistered) {
    if (-not (Test-Path "tools/$tool/tool.html")) {
        Write-Host $tool
    }
}