@echo off
rem ============================================================
rem  Yaksok Necut - Windows auto-print launcher (Google Chrome)
rem  Chrome runs in kiosk mode and prints to the DEFAULT printer
rem  without any dialog (--kiosk-printing). Exit: Alt+F4
rem ============================================================
setlocal
set "HTML=%~dp0yaksok-necut.html"
set "URL=file:///%HTML:\=/%?kiosk=1"
set "APP=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%APP%" set "APP=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%APP%" set "APP=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%APP%" (
  echo Google Chrome not found. Install Chrome or use start-edge.bat
  pause
  exit /b 1
)
start "" "%APP%" --kiosk "%URL%" --kiosk-printing --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --user-data-dir="%LOCALAPPDATA%\yaksok-necut-profile"
exit /b 0
