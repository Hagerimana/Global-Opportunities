@echo off
setlocal

set "ROOT=E:\Projects\Global_Opportunities"
set "BACKEND=%ROOT%\backend"
set "PYTHON=%BACKEND%\.venv\Scripts\python.exe"
set "LOGDIR=%ROOT%\automation\logs"
set "LOGFILE=%LOGDIR%\worker.log"

if not exist "%LOGDIR%" (
    mkdir "%LOGDIR%"
)

if not exist "%LOGDIR%" (
    echo ERROR: Could not create the log directory:
    echo %LOGDIR%
    exit /b 1
)

if not exist "%PYTHON%" (
    echo ERROR: Python executable was not found:
    echo %PYTHON%
    echo [%date% %time%] ERROR: Python executable not found: "%PYTHON%" >> "%LOGFILE%"
    exit /b 1
)

cd /d "%BACKEND%"

if errorlevel 1 (
    echo ERROR: Could not open the backend directory:
    echo %BACKEND%
    echo [%date% %time%] ERROR: Could not open backend directory. >> "%LOGFILE%"
    exit /b 1
)

echo. >> "%LOGFILE%"
echo ============================================================ >> "%LOGFILE%"
echo [%date% %time%] Starting Celery worker. >> "%LOGFILE%"
echo Queues: celery, project_content >> "%LOGFILE%"
echo ============================================================ >> "%LOGFILE%"

echo Starting Celery worker...
echo Queues: celery, project_content
echo Log file: %LOGFILE%

"%PYTHON%" -u -m celery -A config worker --pool=solo --concurrency=1 --queues=celery,project_content --loglevel=INFO >> "%LOGFILE%" 2>&1

set "RESULT=%ERRORLEVEL%"

echo [%date% %time%] Celery worker exited with code %RESULT%. >> "%LOGFILE%"
echo Celery worker exited with code %RESULT%. See the worker log for details.

exit /b %RESULT%