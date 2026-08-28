@echo off
echo ===================================================
echo  Starting Civil Defense Services under PM2 Manager
echo ===================================================
cd /d %~dp0
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 status
echo ===================================================
echo  Services started successfully!
echo ===================================================
pause
