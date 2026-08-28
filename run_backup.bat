@echo off
echo =================================================================
echo  Civil Defense AI Assistant - Automated Backup Utility
echo =================================================================
cd /d %~dp0
node scripts/backup_manager.js
echo =================================================================
pause
