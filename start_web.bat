@echo off
chcp 65001 > nul
echo ===================================================
echo   PrismVista 3D 웹 렌더러 서버를 실행합니다...
echo ===================================================
start "" "%~dp0start_web_server.exe"
exit

