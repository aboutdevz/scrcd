# Build helper native binaries for SCRCD
$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot "..\bin"
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "csc.exe"
}

Write-Host "Compiling tools/CaptureScreen.cs -> bin/capture.exe..."
& $csc /nologo /optimize /target:winexe /out:"$binDir\capture.exe" "$PSScriptRoot\CaptureScreen.cs"

Write-Host "Compiling tools/MouseHook.cs -> bin/hook.exe..."
& $csc /nologo /optimize /target:winexe /out:"$binDir\hook.exe" "$PSScriptRoot\MouseHook.cs"

Write-Host "Native tools successfully built into bin/!"
