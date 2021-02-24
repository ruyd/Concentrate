
if (Test-Path C:\Deploy\ConcentrateAddonPub.zip) {
    Remove-Item C:\Deploy\ConcentrateAddonPub.zip
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
Copy-Item C:\Sources\ConcentrateAddon -Destination C:\Deploy -Recurse -Force

Write-Host "Removing files..."
foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item C:\Deploy\ConcentrateAddon\$file -Recurse -Force
    }
}

#Rename-Item C:\Deploy\ConcentrateAddon\manifest.deploy.json C:\Deploy\ConcentrateAddon\manifest.json

Write-Host "Zipping..."
Compress-Archive -Path C:\Deploy\ConcentrateAddon -DestinationPath C:\Deploy\ConcentrateAddonPub.zip
Write-Host "Package Ready C:\Deploy"