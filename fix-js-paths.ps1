$files = Get-ChildItem -Path "E:\yuanqizhiketools\yuanqizhike-toolkit\tools" -Filter "*.html" -File

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Fix detailUrl href - remove ../ prefix
    $content = $content -replace "href='\.\./' \+ escapeHtml\(tool\.detailUrl\)", "escapeHtml(tool.detailUrl)"
    
    # Fix iconPath - change ../ to / prefix logic
    $content = $content -replace "iconPath = '\.\./' \+ iconPath", "iconPath = '/' + iconPath"
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Fixed JS paths in:" $file.Name
    }
}