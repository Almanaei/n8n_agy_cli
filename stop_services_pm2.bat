@echo off
echo ===================================================
echo  Stopping Civil Defense Services under PM2 Manager
echo ===================================================
cd /d %~dp0
npx pm2 stop ecosystem.config.js
npx pm2 status
echo ===================================================
echo  Services stopped.
echo ===================================================
pause
