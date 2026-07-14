# Script to update tools-list.json
# This script will:
# 1. Add detailUrl for 50 unregistered tools
# 2. Fix empty detailUrl for 24 tools

$jsonPath = 'tools-list.json'
$backupPath = 'tools-list.json.backup'

# Backup original
Copy-Item $jsonPath $backupPath

# Read JSON
$json = Get-Content $jsonPath | ConvertFrom-Json

# Define tools to add/update with their categories and info
$toolsInfo = @{
    'og-preview' = @{ category='Developer Tools'; icon='/assets/icons/dev-1.svg'; title='Open Graph Preview Tool'; desc='Visually preview and debug Open Graph meta tags for social media platforms like Facebook, Twitter, and LinkedIn directly in your browser.'; features=@('Live Social Preview','OG Tag Debugger','Mobile View Support','Client-Side Processing','One-Click Copy Code') }
    'cors-checker' = @{ category='Webmaster & SEO Tools'; icon='assets/icons/business-7.svg'; title='CORS Checker'; desc='Free online CORS checker for web developers to test Cross-Origin Resource Sharing support, verify Access-Control headers, and debug preflight OPTIONS requests for any target URL.'; features=@('Preflight Simulation','CORS Header Analysis','Error Diagnosis','Wildcard Detection','Share Results') }
    'dns-lookup' = @{ category='Webmaster & SEO Tools'; icon='assets/icons/business-7.svg'; title='DNS Lookup'; desc='Free online DNS lookup tool to instantly check domain DNS records in your browser. Query A, AAAA, MX, TXT, NS, CNAME, and SOA records securely via DNS-over-HTTPS with no signup required.'; features=@('Supports common DNS record types','Secure DNS-over-HTTPS queries','One-click all types lookup','Displays TTL for each record','No signup required','Light and dark mode support') }
    'ssl-checker' = @{ category='Webmaster & SEO Tools'; icon='assets/icons/business-7.svg'; title='SSL Certificate Checker'; desc='Free online SSL Certificate Checker to instantly inspect any domain''s TLS/SSL certificate details. View issuer info, validity dates, SAN entries, and certificate chain to validate your website''s HTTPS security setup.'; features=@('One-click domain SSL check','View certificate issuer details','Check certificate validity dates','List SAN domain entries','Detect SSL connection errors','No signup or installation required') }
    'backlink-checker' = @{ category='Webmaster & SEO Tools'; icon='assets/icons/business-7.svg'; title='Backlink Spam Checker'; desc='Analyze backlinks for spam signals and toxic links. Check domain reputation and link quality indicators to protect your SEO health.'; features=@('Detect Toxic Links','Check Domain Reputation','Analyze Link Quality','Identify Spam Signals','Protect SEO Health') }
}

# Update JSON
foreach ($tool in $toolsInfo.Keys) {
    $info = $toolsInfo[$tool]
    $existing = $json | Where-Object { $_.title -eq $info.title }
    
    if ($existing) {
        # Fix empty detailUrl
        if ([string]::IsNullOrEmpty($existing.detailUrl)) {
            $existing.detailUrl = "/tools/$tool/index.html"
            Write-Host "Updated detailUrl for $($info.title)"
        }
    } else {
        # Add new entry
        $newEntry = [PSCustomObject]@{
            category = $info.category
            icon = $info.icon
            title = $info.title
            desc = $info.desc
            features = $info.features
            detailUrl = "/tools/$tool/index.html"
            zipUrl = "/assets/zip-packages/seo/$tool.zip"
        }
        $json += $newEntry
        Write-Host "Added new entry for $($info.title)"
    }
}

# Output updated JSON
$json | ConvertTo-Json -Depth 10 | Set-Content $jsonPath

Write-Host "Done! Backup saved to $backupPath"