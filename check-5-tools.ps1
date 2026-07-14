$tools = @(
    'og-preview', 'cors-checker', 'dns-lookup', 'ssl-checker', 'backlink-checker'
)
Write-Host '=== Checking 5 website tools ==='
foreach ($tool in $tools) {
    Write-Host "`n--- $tool ---"
    if (Test-Path "tools/$tool/index.html") { 
        $content = Get-Content "tools/$tool/index.html" | Select-Object -First 5
        Write-Host 'index.html: EXISTS'
        Write-Host '  Title: ' ($content | Where-Object { $_ -like '<title>*' })
    } else { 
        Write-Host 'index.html: MISSING' 
    }
    if (Test-Path "tools/$tool/tool.html") { 
        $content = Get-Content "tools/$tool/tool.html" | Select-Object -First 5
        Write-Host 'tool.html: EXISTS'
        Write-Host '  Title: ' ($content | Where-Object { $_ -like '<title>*' })
    } else { 
        Write-Host 'tool.html: MISSING' 
    }
}