@echo off
REM Start your app first
start cmd /k "npm run dev"

REM Wait 5 seconds
timeout /t 5 /nobreak >nul

REM Start Cloudflared tunnel
start cmd /k "cloudflared tunnel --url http://localhost:5173/"