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