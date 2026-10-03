@echo off
cd /d F:\crm\angler_crm\server
echo Starting migration... > migration_output.txt
node node_modules/.bin/prisma db push --skip-generate >> migration_output.txt 2>&1
echo EXIT: %ERRORLEVEL% >> migration_output.txt
