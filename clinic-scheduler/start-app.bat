@echo off
echo Starting Clinic Scheduler...
start /B cmd /c "npm run start-prod"
start http://localhost:3000