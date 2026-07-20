@echo off
echo ====================================
echo   Koitus App - Clear Browser Cache
echo ====================================
echo.
echo This script clears ONLY Koitus-related browser data.
echo.

:: Clear Internet Explorer/Edge cache (Koitus-specific URLs only)
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 2
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 8

echo.
echo ====================================
echo   Done!
echo ====================================
echo.
echo Now press Ctrl+Shift+R in your browser
echo to hard refresh the Koitus application.
echo.
pause
