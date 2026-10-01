@echo off
setlocal
echo ==========================================================
echo SCRCD - Windows Smart App Control / SmartScreen Unblocker
echo ==========================================================
echo.
echo Removing Mark of the Web (Zone.Identifier) from SCRCD downloads...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%USERPROFILE%\Downloads\*SCRCD*' -ErrorAction SilentlyContinue | ForEach-Object { Unblock-File $_.FullName; Write-Host ('Unblocked: ' + $_.Name) -ForegroundColor Green }"
echo.
echo If unblocked above, you can now run SCRCD.exe normally!
echo.
pause
