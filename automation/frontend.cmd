@echo off
setlocal

cd /d "E:\Projects\Global_Opportunities\frontend"

set "PATH=C:\Program Files\nodejs;%PATH%"

call "C:\Program Files\nodejs\npm.cmd" run dev -- --hostname 127.0.0.1 --port 3000 >> "E:\Projects\Global_Opportunities\automation\logs\frontend.log" 2>&1

exit /b 1