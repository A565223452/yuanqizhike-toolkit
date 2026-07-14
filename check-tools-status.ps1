$unregistered = @('og-preview', 'cors-checker', 'dns-lookup', 'ssl-checker', 'backlink-checker')
foreach ($tool in $unregistered) {
    Write-Host '=== ' $tool ' ==='
    if (Test-Path "tools/$tool/index.html") { Write-Host 'index.html: EXISTS' } else { Write-Host 'index.html: MISSING' }
    if (Test-Path "tools/$tool/tool.html") { Write-Host 'tool.html: EXISTS' } else { Write-Host 'tool.html: MISSING' }
    Write-Host ''
}