$tools = @('og-preview', 'cors-checker', 'dns-lookup', 'ssl-checker', 'backlink-checker')
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
foreach ($tool in $tools) {
    Write-Host '=== ' $tool ' ==='
    $entry = $json | Where-Object { $_.detailUrl -like "*/$tool/*" }
    if ($entry) {
        Write-Host 'Found in JSON:'
        Write-Host '  title: ' $entry.title
        Write-Host '  category: ' $entry.category
        Write-Host '  detailUrl: ' $entry.detailUrl
        Write-Host '  zipUrl: ' $entry.zipUrl
    } else {
        Write-Host 'NOT FOUND in JSON'
    }
    Write-Host ''
}