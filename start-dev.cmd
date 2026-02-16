@echo off
cd /d "%~dp0"
cd src\frontend
set NODE_OPTIONS=--max-old-space-size=4096
npx next dev --port 3000
