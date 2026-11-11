@echo off
setlocal

set "ROOT=E:\Projects\Global_Opportunities"
set "LOGDIR=%ROOT%\automation\logs"

if not exist "%LOGDIR%" (
    mkdir "%LOGDIR%"
)

if not exist "%LOGDIR%" (
    echo ERROR: Could not create the backend log directory.
    exit /b 1
)

cd /d "%ROOT%\backend"
if errorlevel 1 (
    echo ERROR: Could not open the backend directory. >> "%LOGDIR%\backend.log"
    exit /b 1
)

echo. >> "%LOGDIR%\backend.log"
echo [%date% %time%] Starting Django backend... >> "%LOGDIR%\backend.log"

"%ROOT%\backend\.venv\Scripts\python.exe" -u manage.py runserver 127.0.0.1:8000 --noreload >> "%LOGDIR%\backend.log" 2>&1

set "RESULT=%ERRORLEVEL%"

echo [%date% %time%] Django exited with code %RESULT%. >> "%LOGDIR%\backend.log"

exit /b %RESULT%