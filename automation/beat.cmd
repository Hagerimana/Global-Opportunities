@echo off
setlocal

cd /d "E:\Projects\Global_Opportunities\backend"

"E:\Projects\Global_Opportunities\backend\.venv\Scripts\python.exe" -m celery -A config beat --loglevel=INFO --schedule="E:\Projects\Global_Opportunities\automation\celerybeat-schedule" >> "E:\Projects\Global_Opportunities\automation\logs\beat.log" 2>&1

exit /b 1