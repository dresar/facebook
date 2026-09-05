@echo off
title Buka Chrome Login Meta Business Suite
echo ================================================================
echo Menutup proses Chrome background lama...
echo ================================================================
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo ================================================================
echo Membuka Google Chrome Port 9222...
echo ================================================================
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="C:\Users\NCN0C\.chrome-automation" --no-first-run --no-default-browser-check --start-maximized "https://business.facebook.com"
