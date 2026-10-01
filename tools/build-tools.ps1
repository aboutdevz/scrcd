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

$wpfDir = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF"
$uiClient = Join-Path $wpfDir "UIAutomationClient.dll"
$uiTypes = Join-Path $wpfDir "UIAutomationTypes.dll"
$winBase = Join-Path $wpfDir "WindowsBase.dll"

$manifest = Join-Path $PSScriptRoot "app.manifest"
$icon = Join-Path $PSScriptRoot "app.ico"
$assemblyInfo = Join-Path $PSScriptRoot "AssemblyInfo.cs"

Write-Host "Compiling tools/CaptureScreen.cs -> bin/capture.exe..."
& $csc /nologo /optimize /target:winexe /win32manifest:"$manifest" /win32icon:"$icon" /r:"$uiClient","$uiTypes","$winBase" /out:"$binDir\capture.exe" "$assemblyInfo" "$PSScriptRoot\CaptureScreen.cs"

Write-Host "Compiling tools/MouseHook.cs -> bin/hook.exe..."
& $csc /nologo /optimize /target:winexe /win32manifest:"$manifest" /win32icon:"$icon" /out:"$binDir\hook.exe" "$assemblyInfo" "$PSScriptRoot\MouseHook.cs"

# Apply Authenticode signature to protect against AV/SmartScreen false positives
try {
    $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | Where-Object { $_.Subject -like "*SCRCD*" } | Select-Object -First 1
    if (-not $cert) {
        $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=SCRCD Software" -CertStoreLocation Cert:\CurrentUser\My -ErrorAction SilentlyContinue
    }
    if ($cert) {
        Write-Host "Applying Authenticode signature to native binaries..."
        Set-AuthenticodeSignature -FilePath "$binDir\capture.exe" -Certificate $cert | Out-Null
        Set-AuthenticodeSignature -FilePath "$binDir\hook.exe" -Certificate $cert | Out-Null
    }
} catch {
    Write-Warning "Authenticode signing skipped (not critical): $($_.Exception.Message)"
}

Write-Host "Native tools successfully built into bin/!"
