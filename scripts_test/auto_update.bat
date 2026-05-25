@echo off
SETLOCAL EnableDelayedExpansion

echo ============================================================
echo   RINCOVITCH REPORT - AUTOMATED DEPLOYMENT SYSTEM
echo ============================================================

:: Step 1: Build Validation
echo [1/4] Running Production Build...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed! Please check your code before pushing.
    pause
    exit /b %errorlevel%
)
echo [OK] Build completed successfully.

:: Step 2: Git Staging
echo.
echo [2/4] Staging all changes...
git add .
echo [OK] Changes staged.

:: Step 3: Automated Commit
echo.
echo [3/4] Generating commit message...
:: Get Date and Time for message
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a:%%b)
set COMMIT_MSG="[AUTO-COMMIT] System update - %mydate% %mytime%"

git commit -m %COMMIT_MSG%
if %errorlevel% neq 0 (
    echo [INFO] No changes to commit.
) else (
    echo [OK] Committed with message: %COMMIT_MSG%
)

:: Step 4: Push to GitHub
echo.
echo [4/4] Pushing to GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Push failed. Please check your internet connection or git permissions.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   [SUCCESS] SYSTEM UPDATED AND DEPLOYED TO GITHUB
echo ============================================================
pause
