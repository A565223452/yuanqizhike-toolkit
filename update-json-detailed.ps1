# Update tools-list.json
# This script updates detailUrl for tools and adds missing tools

$jsonPath = 'tools-list.json'

# Read current JSON
$json = Get-Content $jsonPath | ConvertFrom-Json

# Tools to update with their correct detailUrl
$toolsToUpdate = @(
    @{ title='Open Graph Preview'; detailUrl='/tools/og-preview/index.html'; zipUrl='/assets/zip-packages/dev/open-graph-preview.zip' },
    @{ title='Backlink Spam Checker'; detailUrl='/tools/backlink-checker/index.html'; zipUrl='/assets/zip-packages/seo/backlink-checker.zip' },
    @{ title='CORS Policy Checker'; detailUrl='/tools/cors-checker/index.html'; zipUrl='/assets/zip-packages/dev/cors-policy-checker.zip' },
    @{ title='DNS Record Lookup'; detailUrl='/tools/dns-lookup/index.html'; zipUrl='/assets/zip-packages/dev/dns-record-lookup.zip' },
    @{ title='SSL Certificate Checker'; detailUrl='/tools/ssl-checker/index.html'; zipUrl='/assets/zip-packages/dev/ssl-certificate-checker.zip' },
    @{ title='Domain ICP Filing Checker'; detailUrl='/tools/domain-filing-checker/index.html'; zipUrl='/assets/zip-packages/business/domain-icp-filing-checker.zip' },
    @{ title='CSV Order Data Cleaner'; detailUrl='/tools/csv-order-data-cleaner/index.html'; zipUrl='/assets/zip-packages/business/csv-order-data-cleaner.zip' },
    @{ title='Batch Base64 Encoder'; detailUrl='/tools/batch-base64-encoder/index.html'; zipUrl='/assets/zip-packages/dev/batch-base64-encoder.zip' },
    @{ title='Base64 Url Jwt Tool'; detailUrl='/tools/base64-url-jwt-tool/index.html'; zipUrl='/assets/zip-packages/dev/base64-url-jwt-tool.zip' },
    @{ title='Command Line Cheat Sheet'; detailUrl='/tools/command-line-cheat-sheet/index.html'; zipUrl='/assets/zip-packages/dev/command-line-cheat-sheet.zip' },
    @{ title='Cron Expression Parser'; detailUrl='/tools/cron-expression-parser/index.html'; zipUrl='/assets/zip-packages/dev/cron-expression-parser.zip' },
    @{ title='Crud Code Template Generator'; detailUrl='/tools/crud-code-template-generator/index.html'; zipUrl='/assets/zip-packages/dev/crud-code-template-generator.zip' },
    @{ title='Hex To Text Converter'; detailUrl='/tools/hex-to-text-converter/index.html'; zipUrl='/assets/zip-packages/dev/hex-to-text-converter.zip' },
    @{ title='JavaScript Minifier'; detailUrl='/tools/javascript-minifier/index.html'; zipUrl='/assets/zip-packages/dev/javascript-minifier.zip' },
    @{ title='JSON Field Cleaner'; detailUrl='/tools/json-field-cleaner/index.html'; zipUrl='/assets/zip-packages/dev/json-field-cleaner.zip' },
    @{ title='Json Format Converter'; detailUrl='/tools/json-format-converter/index.html'; zipUrl='/assets/zip-packages/dev/json-format-converter.zip' },
    @{ title='JSON Key Sorter'; detailUrl='/tools/json-key-sorter/index.html'; zipUrl='/assets/zip-packages/dev/json-key-sorter.zip' },
    @{ title='Jwt Token Decoder'; detailUrl='/tools/jwt-token-decoder/index.html'; zipUrl='/assets/zip-packages/dev/jwt-token-decoder.zip' },
    @{ title='Log File Formatter'; detailUrl='/tools/log-file-formatter/index.html'; zipUrl='/assets/zip-packages/dev/log-file-formatter.zip' },
    @{ title='Password Strength Analyzer'; detailUrl='/tools/password-strength-analyzer/index.html'; zipUrl='/assets/zip-packages/dev/password-strength-analyzer.zip' },
    @{ title='Web Font Format Converter'; detailUrl='/tools/web-font-format-converter/index.html'; zipUrl='/assets/zip-packages/design/web-font-format-converter.zip' },
    @{ title='Ico Icon Generator'; detailUrl='/tools/ico-icon-generator/index.html'; zipUrl='/assets/zip-packages/design/ico-icon-generator.zip' },
    @{ title='ISBN Book Lookup'; detailUrl='/tools/isbn-book-lookup/index.html'; zipUrl='/assets/zip-packages/education/isbn-book-lookup.zip' },
    @{ title='Meeting Time Planner'; detailUrl='/tools/meeting-time-planner/index.html'; zipUrl='/assets/zip-packages/business/meeting-time-planner.zip' }
)

# Update each tool
foreach ($tool in $toolsToUpdate) {
    $index = $json | ForEach-Object { $i = 0 } { if ($_.title -eq $tool.title) { return $i } ; $i++ ; return $null } | Where-Object { $_ -ne $null }
    
    # Find by title
    $entry = $json | Where-Object { $_.title -eq $tool.title }
    if ($entry) {
        if ([string]::IsNullOrEmpty($entry.detailUrl)) {
            $entry.detailUrl = $tool.detailUrl
            $entry.zipUrl = $tool.zipUrl
            Write-Host "Updated: $($tool.title)"
        }
    }
}

# Save updated JSON
$json | ConvertTo-Json -Depth 10 | Set-Content $jsonPath
Write-Host "`nDone updating JSON"