$tools = @(
    'apparent-temperature-calc', 'article-rewrite', 'article-schema-generator', 'audio-video-muxer',
    'backlink-checker', 'beaufort-wind-scale', 'breadcrumb-schema-generator', 'cors-checker',
    'dew-point-calculator', 'dns-lookup', 'domain-filing-checker', 'faq-schema-generator',
    'heat-index-calculator', 'hreflang-tag-generator', 'ip-geolocation', 'loop-video-maker',
    'og-preview', 'port-scanner', 'precipitation-calculator', 'product-schema-generator',
    'seo-meta-generator', 'sitemap-generator', 'slow-motion-maker', 'speed-test',
    'ssl-checker', 'storm-distance-calc', 'structured-data-validator', 'sunrise-sunset-calculator',
    'temperature-converter', 'time-lapse-maker', 'twitter-card-generator', 'utm-builder',
    'uv-index-calculator', 'video-aspect-ratio-converter', 'video-compressor-online', 'video-flipper',
    'video-frame-extractor', 'video-joiner', 'video-metadata-viewer', 'video-resolution-converter',
    'video-reverser', 'video-rotator', 'video-speed-changer', 'video-thumbnail-maker',
    'video-to-gif', 'video-to-mp3', 'video-trimmer', 'video-volume-booster', 'video-watermark-adder',
    'wind-chill-calculator'
)

Write-Host "=== Checking ZIP packages ==="
$missingZip = @()
$existingZip = @()

foreach ($tool in $tools) {
    if (Test-Path "assets/zip-packages/dev/$tool.zip") { 
        $existingZip += $tool
    } elseif (Test-Path "assets/zip-packages/seo/$tool.zip") {
        $existingZip += $tool
    } elseif (Test-Path "assets/zip-packages/writing/$tool.zip") {
        $existingZip += $tool
    } elseif (Test-Path "assets/zip-packages/design/$tool.zip") {
        $existingZip += $tool
    } elseif (Test-Path "assets/zip-packages/business/$tool.zip") {
        $existingZip += $tool
    } else {
        $missingZip += $tool
    }
}

Write-Host "ZIP packages EXISTS: " $existingZip.Count
Write-Host "ZIP packages MISSING: " $missingZip.Count
if ($missingZip.Count -gt 0) {
    Write-Host "`n=== Missing ZIP packages ==="
    $missingZip | ForEach-Object { Write-Host $_ }
}