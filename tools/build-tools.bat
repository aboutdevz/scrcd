@echo off
setlocal
if not exist "%~dp0..\bin" mkdir "%~dp0..\bin"
set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=csc.exe

echo Compiling tools\CaptureScreen.cs to bin\capture.exe ...
"%CSC%" /nologo /optimize /target:winexe /out:"%~dp0..\bin\capture.exe" "%~dp0CaptureScreen.cs"
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling tools\MouseHook.cs to bin\hook.exe ...
"%CSC%" /nologo /optimize /target:winexe /out:"%~dp0..\bin\hook.exe" "%~dp0MouseHook.cs"
if %errorlevel% neq 0 exit /b %errorlevel%

echo Native tools successfully built into bin/
