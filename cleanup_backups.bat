@echo off
REM SWSE Backup Folder Cleanup Script
REM This will DELETE all backup folders!
REM Path: C:\Users\Owner\Documents\GitHub\foundryvtt-swse

echo ========================================
echo SWSE BACKUP CLEANUP SCRIPT
echo ========================================
echo.
echo This script will DELETE the following backup folders:
echo   - template_backups
echo   - store_button_backup
echo   - optimization_backups
echo   - consolidation_backup
echo   - editor_fix_backup
echo   - store_integration_backup
echo.
echo These folders contain 74+ duplicate files.
echo.
echo WARNING: This action cannot be undone!
echo Make sure you have a backup of your entire system first!
echo.

pause

cd /d "C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

echo.
echo Deleting backup folders...
echo.

REM Delete all backup folders
if exist "template_backups" (
    echo Deleting template_backups...
    rmdir /s /q "template_backups"
)

if exist "store_button_backup" (
    echo Deleting store_button_backup...
    rmdir /s /q "store_button_backup"
)

if exist "optimization_backups" (
    echo Deleting optimization_backups...
    rmdir /s /q "optimization_backups"
)

if exist "consolidation_backup" (
    echo Deleting consolidation_backup...
    rmdir /s /q "consolidation_backup"
)

if exist "editor_fix_backup" (
    echo Deleting editor_fix_backup...
    rmdir /s /q "editor_fix_backup"
)

if exist "store_integration_backup" (
    echo Deleting store_integration_backup...
    rmdir /s /q "store_integration_backup"
)

echo.
echo ========================================
echo CLEANUP COMPLETE!
echo ========================================
echo.
echo Deleted backup folders. Your main system files are intact.
echo.
echo Recommended next steps:
echo   1. Test your system in Foundry VTT
echo   2. Commit changes to Git
echo   3. Run the scanner again to verify
echo.

pause

