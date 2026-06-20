@echo off
echo ====================================
echo   Koitus App - Clear Cache
echo ====================================
echo.
echo Clearing browser cache for Koitus...
echo.

:: Clear Internet Explorer cache
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 2
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 8
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 16
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 32
RunDll32.exe InetCpl.cpl, ClearMyTracksByProcess 256

:: Clear temporary files
del /q /s "%TEMP%\*.*"
del /q /s "%LOCALAPPDATA%\Microsoft\Windows\INetCache\*"

echo.
echo ====================================
echo   Cache cleared successfully!
echo ====================================
echo.
echo IMPORTANT: Now press Ctrl+Shift+R in your browser
echo to hard refresh the Koitus application.
echo.
echo Admin Login:
echo   Email: fanasihlomuka@gmail.com
echo   Password: Nozibusiso89
echo.
pause
