
if (Test-Path C:\Deploy\ConcentratePub.zip) {
    Remove-Item C:\Deploy\ConcentratePub.zip
}

$files = New-Object System.Collections.ArrayList
[void] $files.AddRange((
        ".\.git",
        ".\.vscode",
        ".\.zipignore",
        ".\.gitignore",
        ".\.github",
        ".\PS_ZipPackage.ps1",
        ".\TODO",
        ".\visuals\",
        ".\tempCodeRunnerFile.ps1"
    ))
 
Write-Host "Copying..."
Copy-Item C:\Sources\Concentrate -Destination C:\Deploy -Recurse -Force

Write-Host "Removing files..."
foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item C:\Deploy\Concentrate\$file -Recurse -Force
    }
}

#Rename-Item C:\Deploy\Concentrate\manifest.deploy.json C:\Deploy\Concentrate\manifest.json

Write-Host "Zipping..."
Compress-Archive -Path C:\Deploy\Concentrate -DestinationPath C:\Deploy\ConcentratePub.zip
Write-Host "Package Ready C:\Deploy"