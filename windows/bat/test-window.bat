@echo off
rem  Opens the app in a normal Chrome/Edge window (print dialog shown) for checking camera and layout.
setlocal
set "HTML=%~dp0yaksok-necut.html"
set "URL=file:///%HTML:\=/%"
set "APP=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%APP%" set "APP=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%APP%" set "APP=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%APP%" set "APP=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
start "" "%APP%" --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --user-data-dir="%LOCALAPPDATA%\yaksok-necut-profile" "%URL%"
exit /b 0
