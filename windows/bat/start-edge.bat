@echo off
rem ============================================================
rem  Yaksok Necut - Windows auto-print launcher (Microsoft Edge)
rem  Edge runs full screen and prints to the DEFAULT printer
rem  without any dialog (--kiosk-printing). Exit: Alt+F4
rem ============================================================
setlocal
set "HTML=%~dp0yaksok-necut.html"
set "URL=file:///%HTML:\=/%?kiosk=1"
set "APP=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%APP%" set "APP=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%APP%" (
  echo Microsoft Edge not found.
  pause
  exit /b 1
)
start "" "%APP%" --start-fullscreen "%URL%" --kiosk-printing --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --user-data-dir="%LOCALAPPDATA%\yaksok-necut-profile"
exit /b 0
