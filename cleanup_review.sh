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
# DUPLICATE FILES
# ========================================

# Set 1 - Keeping: store\gm-settings.html
# rm 'scripts\store\gm-settings.js'

# Set 2 - Keeping: store\store.html
# rm 'scripts\store\store.html'
# rm 'templates\apps\store.hbs'

# Set 3 - Keeping: templates\chargen\chargen.html
# rm 'templates\apps\chargen.hbs'

# Set 4 - Keeping: scripts\store\gm-settings.html
# rm 'store\gm-settings.js'

# Set 5 - Keeping: templates\actor\character-sheet.hbs
# rm 'templates\actors\character-sheet.hbs'

# Set 6 - Keeping: templates\actor\droid-sheet.hbs
# rm 'templates\actors\droid-sheet.hbs'

# Set 7 - Keeping: templates\actor\npc-sheet.hbs
# rm 'templates\actors\npc-sheet.hbs'

# Set 8 - Keeping: templates\actor\vehicle-sheet.hbs
# rm 'templates\actors\vehicle-sheet.hbs'

# Set 9 - Keeping: templates\item\item-sheet.hbs
# rm 'templates\items\item-sheet.hbs'

# Set 10 - Keeping: scripts\chargen.js
# rm 'scripts\apps\chargen.js'

# Set 11 - Keeping: scripts\dice-utils.js
# rm 'scripts\helpers\dice-utils.js'

# Set 12 - Keeping: scripts\helpers.js
# rm 'scripts\helpers\helpers.js'
# rm 'module\scripts\helpers.js'

# Set 13 - Keeping: scripts\load-templates.js
# rm 'scripts\core\load-templates.js'

# Set 14 - Keeping: scripts\swse-data-optimized.js
# rm 'scripts\core\swse-data.js'

# Set 15 - Keeping: scripts\swse-item.js
# rm 'scripts\items\swse-item.js'

# Set 16 - Keeping: scripts\swse-vehicle.js
# rm 'scripts\actors\swse-vehicle.js'

# Set 17 - Keeping: scripts\world-data-loader.js
# rm 'scripts\core\world-data-loader.js'

# Set 18 - Keeping: scripts\apps\chargen-init.js
# rm 'scripts\chargen\chargen-init.js'

# Set 19 - Keeping: scripts\apps\store.js
# rm 'scripts\store\store.js'

# ========================================
# POTENTIALLY UNUSED FILES
# ========================================

# rm 'templates\actor\character-sheet.hbs'
# rm 'templates\actor\droid-sheet.hbs'
# rm 'templates\actor\item-sheet.hbs'
# rm 'templates\actor\npc-sheet.hbs'
# rm 'templates\actor\vehicle-sheet.hbs'
# rm 'templates\actors\character-sheet.hbs'
# rm 'templates\actors\droid-sheet.hbs'
# rm 'templates\actors\npc-sheet.hbs'
# rm 'templates\actors\vehicle-sheet.hbs'
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
# rm 'cleanup_backups.bat'
# rm 'system.json.bak'

echo '✅ Cleanup complete!'
