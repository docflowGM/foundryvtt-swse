#!/bin/bash
# SWSE Repository Cleanup Script
# Generated automatically - REVIEW BEFORE RUNNING!
# Uncomment lines to execute them

echo 'WARNING: This script will delete files!'
echo 'Make sure you have a backup!'
read -p 'Continue? (y/n) ' -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo 'Cancelled.'
    exit 1
fi

# ========================================
# POTENTIALLY UNUSED FILES
# ========================================

# rm 'templates\actors\character-sheet.hbs'
# rm 'templates\actors\droid-sheet.hbs'
# rm 'templates\actors\item-sheet.hbs'
# rm 'templates\actors\npc-sheet.hbs'
# rm 'templates\actors\vehicle-sheet.hbs'
# rm 'templates\apps\chargen-fixed.hbs'
# rm 'templates\apps\chargen.hbs'
# rm 'templates\apps\narrative-chargen.hbs'
# rm 'templates\apps\store.hbs'
# rm 'templates\item\item-sheet.hbs'
# rm 'templates\items\item-sheet.hbs'
# rm 'templates\partials\ability-block.hbs'
# rm 'templates\partials\ability-scores.hbs'
# rm 'templates\partials\defenses.hbs'
# rm 'templates\partials\item-controls.hbs'
# rm 'templates\partials\skill-row.hbs'
# rm 'templates\partials\tab-navigation.hbs'
# rm 'templates\sheets\character-sheet.hbs'
# rm 'module\templates\partials\ability-block.hbs'

echo '✅ Cleanup complete!'
