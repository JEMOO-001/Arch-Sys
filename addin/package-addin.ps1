param(
    [string]$TargetDir,
    [string]$ProjectDir,
    [string]$ProAddInFolder,
    [string]$AddInName
)

$zipPath = Join-Path $ProAddInFolder "$AddInName.zip"
$finalPath = Join-Path $ProAddInFolder $AddInName

$filesToPackage = @(
    (Join-Path $TargetDir "ArcLayoutSentinel.dll"),
    (Join-Path $TargetDir "ArcLayoutSentinel.deps.json"),
    (Join-Path $ProjectDir "src\Config.daml")
)

$optionalRuntimeFiles = @(
    (Join-Path $TargetDir "Microsoft.Windows.SDK.NET.dll"),
    (Join-Path $TargetDir "WinRT.Runtime.dll")
)

foreach ($file in $optionalRuntimeFiles) {
    if (Test-Path $file) {
        $filesToPackage += $file
    }
}

Compress-Archive -Path $filesToPackage -DestinationPath $zipPath -Force
Move-Item -Path $zipPath -Destination $finalPath -Force

Write-Output "SENTINEL: Add-in packaged at $finalPath"
