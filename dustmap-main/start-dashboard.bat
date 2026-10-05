@echo off
REM Start a local web server for PKRU Air Quality and open the dashboard.
REM OpenStreetMap blocks map tiles when the page is opened directly from disk (file://),
REM so the page must be opened through http://localhost to get the standard OSM map.
cd /d "%~dp0"
set PORT=8000
set URL=http://localhost:%PORT%/dashboard.html

where python >nul 2>nul
if %errorlevel%==0 (
    start "" "%URL%"
    echo Server running at %URL%  ^(close this window to stop^)
    python -m http.server %PORT%
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    start "" "%URL%"
    echo Server running at %URL%  ^(close this window to stop^)
    py -m http.server %PORT%
    goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
    start "" "%URL%"
    echo Server running at %URL%  ^(close this window to stop^)
    npx --yes http-server -p %PORT% -c-1
    goto :eof
)

echo Python or Node.js was not found.
echo Install Python from https://www.python.org/downloads/ or use VS Code Live Server.
pause
