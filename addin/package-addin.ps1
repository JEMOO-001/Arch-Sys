param(
    [string]$TargetDir,
    [string]$ProjectDir,
    [string]$ProAddInFolder,
    [string]$AddInName
)

$zipPath = Join-Path $ProAddInFolder "$AddInName.zip"
$finalPath = Join-Path $ProAddInFolder $AddInName

Compress-Archive -Path (Join-Path $TargetDir "ArcLayoutSentinel.dll"), (Join-Path $TargetDir "ArcLayoutSentinel.deps.json"), (Join-Path $ProjectDir "src\Config.daml") -DestinationPath $zipPath -Force
Move-Item -Path $zipPath -Destination $finalPath -Force

Write-Output "SENTINEL: Add-in packaged at $finalPath"
