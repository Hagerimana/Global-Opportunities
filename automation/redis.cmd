@echo off
setlocal

cd /d "E:\Projects\Global_Opportunities"

"%SystemRoot%\System32\wsl.exe" -d Ubuntu-24.04 -u root -- /bin/sh -c "while true; do service redis-server status >/dev/null 2>&1 || service redis-server start; sleep 30; done" >> "E:\Projects\Global_Opportunities\automation\logs\redis.log" 2>&1

exit /b 1