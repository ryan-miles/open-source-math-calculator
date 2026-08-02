@echo off
rem Launches the Open-Source Math Calculator. Builds it first on a fresh checkout.
setlocal
set "APP=%~dp0dist\index.html"

if not exist "%APP%" (
  echo First run - building the Open-Source Math Calculator, takes about a minute...
  pushd "%~dp0"
  if not exist "node_modules" call npm install
  call npm run build
  popd
)

if not exist "%APP%" (
  echo.
  echo Build failed. Open a terminal in this folder and run:
  echo     npm install
  echo     npm run build
  echo.
  pause
  exit /b 1
)

start "" "%APP%"
