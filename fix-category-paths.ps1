Get-ChildItem -Path "E:\yuanqizhiketools\yuanqizhike-toolkit\tools" -Filter "*.html" -File | ForEach-Object {
    $filePath = $_.FullName
    $content = [System.IO.File]::ReadAllText($filePath)
    $original = $content
    
    # 修复 favicon 路径
    $content = $content -replace 'href="\.\./favicon\.svg"', 'href="/favicon.svg"'
    
    # 修复 CSS 路径
    $content = $content -replace 'href="\.\./assets/', 'href="/assets/'
    
    # 修复 JS 路径
    $content = $content -replace 'src="\.\./assets/', 'src="/assets/'
    
    # 修复 fetch 路径
    $content = $content -replace "fetch\('\.\./tools-list\.json'\)", "fetch('/tools-list.json')"
    
    # 修复导航菜单中 tools.html 路径
    $content = $content -replace 'href="tools\.html#', 'href="/tools.html#'
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "Fixed:" $_.Name
    }
}