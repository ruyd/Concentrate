
if (Test-Path C:\Deploy\ConcentrateExtensionPub.zip) {
    Remove-Item C:\Deploy\ConcentrateExtensionPub.zip
}

$files = New-Object System.Collections.ArrayList
[void] $files.AddRange((
        ".\.git",
        ".\.vscode",
        ".\.zipignore",
        ".\.gitignore",
        ".\ZipPackage.ps1",
        ".\TODO",
        ".\visuals"
    ))


#check popup.html for popup.min.js
# if ((Get-Content $file | %{$_ -match $wordToFind}) -contains $true) {
#     Add-Content log.txt $_.FullName
#     ($file) | ForEach-Object { $_ -replace $wordToFind , $wordToReplace } | 
#     Set-Content $_.FullName
# }

Write-Host "Copying..."
Copy-Item C:\Sources\ConcentrateExtension -Destination C:\Deploy -Recurse -Force

Write-Host "Removing files..."
foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item C:\Deploy\ConcentrateExtension\$file -Recurse -Force
    }
}

#Rename-Item C:\Deploy\ConcentrateExtension\manifest.deploy.json C:\Deploy\ConcentrateExtension\manifest.json

Write-Host "Zipping..."
Compress-Archive -Path C:\Deploy\ConcentrateExtension -DestinationPath C:\Deploy\ConcentrateExtensionPub.zip
Write-Host "Package Ready C:\Deploy"