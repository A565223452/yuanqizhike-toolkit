$tools = Get-ChildItem -Directory 'tools' | Select-Object -ExpandProperty Name
$json = Get-Content 'tools-list.json' | ConvertFrom-Json
$registered = $json | ForEach-Object { $_.detailUrl } | Where-Object { $_ -ne '' } | ForEach-Object { ($_.Replace('/tools/', '').Replace('/index.html', '')) }
$unregistered = $tools | Where-Object { $registered -notcontains $_ }
'=== UNREGISTERED TOOLS ==='
$unregistered | Sort-Object
'=== TOTAL: ' + $unregistered.Count