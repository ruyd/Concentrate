
$checks = Select-String -Path .\js\*.js -Pattern "log = true" -SimpleMatch -List
Write-Host $checks.Count
If ($checks.Count -gt 0) {
    foreach ($item in $checks) {
        $replace_file = $item.ToString().substring(0,$item.ToString().indexOf(".js") + 3)
        ((Get-Content -path $replace_file -Raw) -replace 'log = true','log = false') | Set-Content -Path $replace_file       
    }
    git commit -m "log false" -a 
    Write-Host "Yuca"
    exit -1;
}


$result = ".\build\release.zip"
if (Test-Path $result) {
    Remove-Item $result
}

$files = New-Object System.Collections.ArrayList
[void] $files.AddRange((
        ".\css\",
        ".\html\",
        ".\images\",
        ".\js\",
        ".\manifest.json",
        ".\PRIVACY.TXT",
        ".\LICENSE"
    ))
  
Write-Host "Zipping..."
Compress-Archive -Path $files -DestinationPath $result
Write-Host "Package Ready $result"