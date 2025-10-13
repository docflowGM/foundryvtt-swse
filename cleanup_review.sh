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
# rm 'editor_fix_backup\20251013_074959\templates\apps\store.hbs'

# Set 3 - Keeping: template_backups\20251012_161721\templates\chargen\chargen.html
# rm 'optimization_backups\20251012_162010\templates\chargen\chargen.html'
# rm 'editor_fix_backup\20251013_074959\templates\chargen\chargen.html'
# rm 'consolidation_backup\20251012_162555\templates\chargen\chargen.html'
# rm 'consolidation_backup\20251012_162514\templates\chargen\chargen.html'

# Set 4 - Keeping: template_backups\20251012_161721\templates\items\item-sheet.html
# rm 'templates\items\item-sheet.html'
# rm 'optimization_backups\20251012_162010\templates\items\item-sheet.html'
# rm 'editor_fix_backup\20251013_074959\templates\items\item-sheet.html'
# rm 'consolidation_backup\20251012_162555\templates\items\item-sheet.html'
# rm 'consolidation_backup\20251012_162514\templates\items\item-sheet.html'

# Set 5 - Keeping: scripts\store\gm-settings.html
# rm 'store\gm-settings.js'

# Set 6 - Keeping: template_backups\20251012_161721\templates\actor\character-sheet.hbs
# rm 'store_button_backup\20251012_163550\templates\actor\character-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\character-sheet.hbs'

# Set 7 - Keeping: template_backups\20251012_161721\templates\actor\droid-sheet.hbs
# rm 'templates\actor\droid-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\droid-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\droid-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\droid-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\droid-sheet.hbs'

# Set 8 - Keeping: template_backups\20251012_161721\templates\actor\item-sheet.hbs
# rm 'templates\actor\item-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\item-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\item-sheet.hbs'

# Set 9 - Keeping: template_backups\20251012_161721\templates\actor\npc-sheet.hbs
# rm 'templates\actor\npc-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\npc-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\npc-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\npc-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\npc-sheet.hbs'

# Set 10 - Keeping: template_backups\20251012_161721\templates\actor\vehicle-sheet.hbs
# rm 'templates\actor\vehicle-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\vehicle-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\vehicle-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\vehicle-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\vehicle-sheet.hbs'

# Set 11 - Keeping: template_backups\20251012_161721\templates\apps\chargen.hbs
# rm 'templates\apps\chargen.hbs'
# rm 'optimization_backups\20251012_162010\templates\apps\chargen.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\apps\chargen.hbs'
# rm 'consolidation_backup\20251012_162555\templates\apps\chargen.hbs'
# rm 'consolidation_backup\20251012_162514\templates\apps\chargen.hbs'

# Set 12 - Keeping: template_backups\20251012_161721\templates\apps\narrative-chargen.hbs
# rm 'templates\apps\narrative-chargen.hbs'
# rm 'optimization_backups\20251012_162010\templates\apps\narrative-chargen.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\apps\narrative-chargen.hbs'
# rm 'consolidation_backup\20251012_162555\templates\apps\narrative-chargen.hbs'
# rm 'consolidation_backup\20251012_162514\templates\apps\narrative-chargen.hbs'

# Set 13 - Keeping: template_backups\20251012_161721\templates\item\item-sheet.hbs
# rm 'optimization_backups\20251012_162010\templates\item\item-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\item\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\item\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\item\item-sheet.hbs'

# Set 14 - Keeping: template_backups\20251012_161721\templates\partials\ability-block.hbs
# rm 'templates\partials\ability-block.hbs'
# rm 'optimization_backups\20251012_162010\templates\partials\ability-block.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\ability-block.hbs'

# Set 15 - Keeping: template_backups\20251012_161721\templates\sheets\character-sheet.hbs
# rm 'templates\sheets\character-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\sheets\character-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\sheets\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\sheets\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\sheets\character-sheet.hbs'

# Set 16 - Keeping: templates\partials\ability-scores.hbs
# rm 'editor_fix_backup\20251013_074959\templates\partials\ability-scores.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\ability-scores.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\ability-scores.hbs'

# Set 17 - Keeping: templates\partials\defenses.hbs
# rm 'editor_fix_backup\20251013_074959\templates\partials\defenses.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\defenses.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\defenses.hbs'

# Set 18 - Keeping: templates\partials\item-controls.hbs
# rm 'editor_fix_backup\20251013_074959\templates\partials\item-controls.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\item-controls.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\item-controls.hbs'

# Set 19 - Keeping: templates\partials\skill-row.hbs
# rm 'editor_fix_backup\20251013_074959\templates\partials\skill-row.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\skill-row.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\skill-row.hbs'

# Set 20 - Keeping: templates\partials\tab-navigation.hbs
# rm 'optimization_backups\20251012_162010\templates\partials\tab-navigation.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\tab-navigation.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\tab-navigation.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\tab-navigation.hbs'

# Set 21 - Keeping: module\templates\partials\ability-block.hbs
# rm 'consolidation_backup\20251012_162555\module\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162514\module\templates\partials\ability-block.hbs'

# Set 22 - Keeping: config.js
# rm 'optimization_backups\20251012_162010\config.js'
# rm 'consolidation_backup\20251012_162514\config.js'
# rm 'consolidation_backup\20251012_162555\config.js'

# Set 23 - Keeping: backups\handlebars-helpers.js
# rm 'consolidation_backup\20251012_162555\scripts\helpers\handlebars-helpers.js'
# rm 'consolidation_backup\20251012_162514\scripts\helpers\handlebars-helpers.js'

# Set 24 - Keeping: scripts\dice-utils.js
# rm 'consolidation_backup\20251012_162555\scripts\dice-utils.js'
# rm 'consolidation_backup\20251012_162514\scripts\dice-utils.js'

# Set 25 - Keeping: scripts\diceroller.js
# rm 'consolidation_backup\20251012_162555\scripts\diceroller.js'
# rm 'consolidation_backup\20251012_162514\scripts\diceroller.js'

# Set 26 - Keeping: scripts\helpers.js
# rm 'module\scripts\helpers.js'
# rm 'consolidation_backup\20251012_162555\module\scripts\helpers.js'
# rm 'consolidation_backup\20251012_162514\module\scripts\helpers.js'

# Set 27 - Keeping: scripts\import-data.js
# rm 'consolidation_backup\20251012_162555\scripts\import-data.js'
# rm 'consolidation_backup\20251012_162514\scripts\import-data.js'

# Set 28 - Keeping: scripts\init.js
# rm 'consolidation_backup\20251012_162555\scripts\init.js'
# rm 'consolidation_backup\20251012_162514\scripts\init.js'

# Set 29 - Keeping: scripts\races.js
# rm 'consolidation_backup\20251012_162555\scripts\races.js'
# rm 'consolidation_backup\20251012_162514\scripts\races.js'

# Set 30 - Keeping: scripts\swse-data-optimized.js
# rm 'consolidation_backup\20251012_162555\scripts\swse-data-optimized.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-data-optimized.js'

# Set 31 - Keeping: scripts\swse-data.js
# rm 'consolidation_backup\20251012_162555\scripts\swse-data.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-data.js'

# Set 32 - Keeping: scripts\swse-droid.js
# rm 'sheet_v13_fix_backup\20251012_220637\scripts\swse-droid.js'
# rm 'consolidation_backup\20251012_162555\scripts\swse-droid.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-droid.js'

# Set 33 - Keeping: scripts\swse-item.js
# rm 'sheet_v13_fix_backup\20251012_220637\scripts\swse-item.js'
# rm 'consolidation_backup\20251012_162555\scripts\swse-item.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-item.js'

# Set 34 - Keeping: scripts\swse-levelup.js
# rm 'consolidation_backup\20251012_162555\scripts\swse-levelup.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-levelup.js'

# Set 35 - Keeping: scripts\swse-npc.js
# rm 'consolidation_backup\20251012_162555\scripts\swse-npc.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-npc.js'

# Set 36 - Keeping: scripts\swse-vehicle.js
# rm 'sheet_v13_fix_backup\20251012_220637\scripts\swse-vehicle.js'
# rm 'consolidation_backup\20251012_162555\scripts\swse-vehicle.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-vehicle.js'

# Set 37 - Keeping: scripts\system-entry.js
# rm 'consolidation_backup\20251012_162555\scripts\system-entry.js'
# rm 'consolidation_backup\20251012_162514\scripts\system-entry.js'

# Set 38 - Keeping: store_button_backup\20251012_163550\scripts\swse-actor.js
# rm 'consolidation_backup\20251012_162555\scripts\swse-actor.js'
# rm 'consolidation_backup\20251012_162514\scripts\swse-actor.js'

# Set 39 - Keeping: scripts\apps\chargen.js
# rm 'consolidation_backup\20251012_162555\scripts\apps\chargen.js'
# rm 'consolidation_backup\20251012_162514\scripts\apps\chargen.js'

# Set 40 - Keeping: optimization_backups\20251012_162010\index.js
# rm 'consolidation_backup\20251012_162514\index.js'
# rm 'consolidation_backup\20251012_162555\index.js'

# Set 41 - Keeping: module\chargen\chargen-init.js
# rm 'consolidation_backup\20251012_162555\module\chargen\chargen-init.js'
# rm 'consolidation_backup\20251012_162514\module\chargen\chargen-init.js'
# rm 'comprehensive_fix_backup\20251013_074537\scripts\chargen\chargen-init.js'

# Set 42 - Keeping: module\chargen\chargen.js
# rm 'consolidation_backup\20251012_162555\module\chargen\chargen.js'
# rm 'consolidation_backup\20251012_162514\module\chargen\chargen.js'

# Set 43 - Keeping: module\sheets\SWSEActorSheet.js
# rm 'consolidation_backup\20251012_162555\module\sheets\SWSEActorSheet.js'
# rm 'consolidation_backup\20251012_162514\module\sheets\SWSEActorSheet.js'

# Set 44 - Keeping: module\sheets\SWSEItemSheet.js
# rm 'consolidation_backup\20251012_162555\module\sheets\SWSEItemSheet.js'
# rm 'consolidation_backup\20251012_162514\module\sheets\SWSEItemSheet.js'

# Set 45 - Keeping: consolidation_backup\20251012_162555\scripts\chargen.js
# rm 'consolidation_backup\20251012_162514\scripts\chargen.js'

# Set 46 - Keeping: consolidation_backup\20251012_162555\scripts\load-templates.js
# rm 'consolidation_backup\20251012_162514\scripts\load-templates.js'
# rm 'comprehensive_fix_backup\20251013_074537\scripts\load-templates.js'

# Set 47 - Keeping: consolidation_backup\20251012_162555\scripts\world-data-loader.js
# rm 'consolidation_backup\20251012_162514\scripts\world-data-loader.js'

# Set 48 - Keeping: consolidation_backup\20251012_162555\scripts\actor\swse-actor.js
# rm 'consolidation_backup\20251012_162514\scripts\actor\swse-actor.js'

# Set 49 - Keeping: template.json
# rm 'optimization_backups\20251012_162010\template.json'
# rm 'consolidation_backup\20251012_162514\template.json'
# rm 'consolidation_backup\20251012_162555\template.json'

# Set 50 - Keeping: data\classes.json
# rm 'type_fix_backup\20251012_215230\data\classes.json'

# Set 51 - Keeping: data\combat-actions.json
# rm 'type_fix_backup\20251012_215230\data\combat-actions.json'

# Set 52 - Keeping: data\conditions.json
# rm 'type_fix_backup\20251012_215230\data\conditions.json'

# Set 53 - Keeping: data\forcepowers.json
# rm 'type_fix_backup\20251012_215230\data\forcepowers.json'

# Set 54 - Keeping: data\skills.json
# rm 'type_fix_backup\20251012_215230\data\skills.json'

# Set 55 - Keeping: data\talents.json
# rm 'type_fix_backup\20251012_215230\data\talents.json'
# rm 'json_autofix_backup\20251012_214750\data\talents.json'
# rm 'data_loader_fix_backup\20251012_214520\data\talents.json'

# Set 56 - Keeping: type_fix_backup\20251012_215230\data\classes-db.json
# rm 'json_autofix_backup\20251012_214750\data\classes-db.json'
# rm 'data_loader_fix_backup\20251012_214520\data\classes-db.json'

# Set 57 - Keeping: type_fix_backup\20251012_215230\data\equipment.json
# rm 'json_autofix_backup\20251012_214750\data\equipment.json'
# rm 'data_loader_fix_backup\20251012_214520\data\equipment.json'

# Set 58 - Keeping: type_fix_backup\20251012_215230\data\feats.json
# rm 'json_autofix_backup\20251012_214750\data\feats.json'
# rm 'data_loader_fix_backup\20251012_214520\data\feats.json'

# Set 59 - Keeping: type_fix_backup\20251012_215230\data\weapons.json
# rm 'json_autofix_backup\20251012_214750\data\weapons.json'
# rm 'data_loader_fix_backup\20251012_214520\data\weapons.json'

# Set 60 - Keeping: type_fix_backup\20251012_215230\data\armor\heavy.json
# rm 'json_autofix_backup\20251012_214750\data\armor\heavy.json'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\heavy.json'
# rm 'data\armor\heavy.json'

# Set 61 - Keeping: type_fix_backup\20251012_215230\data\armor\light.json
# rm 'json_autofix_backup\20251012_214750\data\armor\light.json'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\light.json'
# rm 'data\armor\light.json'

# Set 62 - Keeping: type_fix_backup\20251012_215230\data\armor\medium.json
# rm 'json_autofix_backup\20251012_214750\data\armor\medium.json'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\medium.json'
# rm 'data\armor\medium.json'

# Set 63 - Keeping: store_integration_backup\20251012_163225\system.json
# rm 'optimization_backups\20251012_162010\system.json'
# rm 'consolidation_backup\20251012_162514\system.json'
# rm 'consolidation_backup\20251012_162555\system.json'

# Set 64 - Keeping: json_autofix_backup\20251012_214750\data\attributes.json
# rm 'data_loader_fix_backup\20251012_214520\data\attributes.json'

# Set 65 - Keeping: json_autofix_backup\20251012_214750\data\classes.json
# rm 'data_loader_fix_backup\20251012_214520\data\classes.json'

# Set 66 - Keeping: json_autofix_backup\20251012_214750\data\combat-actions.json
# rm 'data_loader_fix_backup\20251012_214520\data\combat-actions.json'

# Set 67 - Keeping: json_autofix_backup\20251012_214750\data\conditions.json
# rm 'data_loader_fix_backup\20251012_214520\data\conditions.json'

# Set 68 - Keeping: json_autofix_backup\20251012_214750\data\Droids.json
# rm 'data_loader_fix_backup\20251012_214520\data\Droids.json'

# Set 69 - Keeping: json_autofix_backup\20251012_214750\data\extraskilluses.json
# rm 'data_loader_fix_backup\20251012_214520\data\extraskilluses.json'

# Set 70 - Keeping: json_autofix_backup\20251012_214750\data\forcepowers.json
# rm 'data_loader_fix_backup\20251012_214520\data\forcepowers.json'

# Set 71 - Keeping: json_autofix_backup\20251012_214750\data\skills.json
# rm 'data_loader_fix_backup\20251012_214520\data\skills.json'

# Set 72 - Keeping: json_autofix_backup\20251012_214750\data\special-combat-condition.json
# rm 'data_loader_fix_backup\20251012_214520\data\special-combat-condition.json'

# Set 73 - Keeping: json_autofix_backup\20251012_214750\data\vehicles.json
# rm 'data_loader_fix_backup\20251012_214520\data\vehicles.json'

# Set 74 - Keeping: templates\partials\README.md
# rm 'editor_fix_backup\20251013_074959\templates\partials\README.md'
# rm 'consolidation_backup\20251012_162555\templates\partials\README.md'
# rm 'consolidation_backup\20251012_162514\templates\partials\README.md'

# ========================================
# POTENTIALLY UNUSED FILES
# ========================================

# rm 'template_backups\20251012_161721\templates\actor\character-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\actor\droid-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\actor\item-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\actor\npc-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\actor\vehicle-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\apps\chargen.hbs'
# rm 'template_backups\20251012_161721\templates\apps\narrative-chargen.hbs'
# rm 'template_backups\20251012_161721\templates\item\item-sheet.hbs'
# rm 'template_backups\20251012_161721\templates\partials\ability-block.hbs'
# rm 'template_backups\20251012_161721\templates\sheets\character-sheet.hbs'
# rm 'templates\actor\character-sheet.hbs'
# rm 'templates\actor\droid-sheet.hbs'
# rm 'templates\actor\item-sheet.hbs'
# rm 'templates\actor\npc-sheet.hbs'
# rm 'templates\actor\vehicle-sheet.hbs'
# rm 'templates\apps\chargen.hbs'
# rm 'templates\apps\narrative-chargen.hbs'
# rm 'templates\apps\store.hbs'
# rm 'templates\item\item-sheet.hbs'
# rm 'templates\partials\ability-block.hbs'
# rm 'templates\partials\ability-scores.hbs'
# rm 'templates\partials\defenses.hbs'
# rm 'templates\partials\item-controls.hbs'
# rm 'templates\partials\skill-row.hbs'
# rm 'templates\partials\tab-navigation.hbs'
# rm 'templates\sheets\character-sheet.hbs'
# rm 'store_button_backup\20251012_163550\templates\actor\character-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\character-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\droid-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\item-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\npc-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\actor\vehicle-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\apps\chargen.hbs'
# rm 'optimization_backups\20251012_162010\templates\apps\narrative-chargen.hbs'
# rm 'optimization_backups\20251012_162010\templates\item\item-sheet.hbs'
# rm 'optimization_backups\20251012_162010\templates\partials\ability-block.hbs'
# rm 'optimization_backups\20251012_162010\templates\partials\ability-scores.hbs'
# rm 'optimization_backups\20251012_162010\templates\partials\defenses.hbs'
# rm 'optimization_backups\20251012_162010\templates\partials\tab-navigation.hbs'
# rm 'optimization_backups\20251012_162010\templates\sheets\character-sheet.hbs'
# rm 'module\templates\partials\ability-block.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\character-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\droid-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\item-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\npc-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\actor\vehicle-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\apps\chargen.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\apps\narrative-chargen.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\apps\store.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\item\item-sheet.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\ability-block.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\ability-scores.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\defenses.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\item-controls.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\skill-row.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\partials\tab-navigation.hbs'
# rm 'editor_fix_backup\20251013_074959\templates\sheets\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\droid-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\npc-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\actor\vehicle-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\apps\chargen.hbs'
# rm 'consolidation_backup\20251012_162555\templates\apps\narrative-chargen.hbs'
# rm 'consolidation_backup\20251012_162555\templates\item\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\ability-scores.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\defenses.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\item-controls.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\skill-row.hbs'
# rm 'consolidation_backup\20251012_162555\templates\partials\tab-navigation.hbs'
# rm 'consolidation_backup\20251012_162555\templates\sheets\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162555\module\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\droid-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\npc-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\actor\vehicle-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\apps\chargen.hbs'
# rm 'consolidation_backup\20251012_162514\templates\apps\narrative-chargen.hbs'
# rm 'consolidation_backup\20251012_162514\templates\item\item-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\ability-block.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\ability-scores.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\defenses.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\item-controls.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\skill-row.hbs'
# rm 'consolidation_backup\20251012_162514\templates\partials\tab-navigation.hbs'
# rm 'consolidation_backup\20251012_162514\templates\sheets\character-sheet.hbs'
# rm 'consolidation_backup\20251012_162514\module\templates\partials\ability-block.hbs'
# rm 'template.json.bak'
# rm 'backup\attributes.json.bak'
# rm 'backup\chargen.js.bak'
# rm 'backup\classes-db.json.bak'
# rm 'backup\classes.json.bak'
# rm 'backup\combat-actions.json.bak'
# rm 'backup\conditions.json.bak'
# rm 'backup\config.js.bak'
# rm 'backup\dice-utils.js.bak'
# rm 'backup\diceroller.js.bak'
# rm 'backup\Droids.json.bak'
# rm 'backup\equipment.json.bak'
# rm 'backup\extraskilluses.json.bak'
# rm 'backup\feats.json.bak'
# rm 'backup\forcepowers.json.bak'
# rm 'backup\import-data.js.bak'
# rm 'backup\init.js.bak'
# rm 'backup\load-templates.js.bak'
# rm 'backup\races.js.bak'
# rm 'backup\skills.json.bak'
# rm 'backup\special-combat-condition.json.bak'
# rm 'backup\swse-actor.js.bak'
# rm 'backup\swse-data.js.bak'
# rm 'backup\swse-droid.js.bak'
# rm 'backup\swse-item.js.bak'
# rm 'backup\swse-levelup.js.bak'
# rm 'backup\swse-vehicle.js.bak'
# rm 'backup\swse.js.bak'
# rm 'backup\system.json.bak'
# rm 'backup\talents.json.bak'
# rm 'backup\vehicles.json.bak'
# rm 'backup\weapons.json.bak'
# rm 'packs\classes.db.bak'
# rm 'packs\feats.db.bak'
# rm 'packs\talents.db.bak'
# rm 'scripts\load-templates.js.bak'
# rm 'type_fix_backup\20251012_215230\data\armor\heavy.json.bak'
# rm 'type_fix_backup\20251012_215230\data\armor\light.json.bak'
# rm 'type_fix_backup\20251012_215230\data\armor\medium.json.bak'
# rm 'json_autofix_backup\20251012_214750\data\armor\heavy.json.bak'
# rm 'json_autofix_backup\20251012_214750\data\armor\light.json.bak'
# rm 'json_autofix_backup\20251012_214750\data\armor\medium.json.bak'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\heavy.json.bak'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\light.json.bak'
# rm 'data_loader_fix_backup\20251012_214520\data\armor\medium.json.bak'
# rm 'data\armor\heavy.json.bak'
# rm 'data\armor\light.json.bak'
# rm 'data\armor\medium.json.bak'
# rm 'consolidation_backup\20251012_162555\scripts\load-templates.js.bak'
# rm 'consolidation_backup\20251012_162514\scripts\load-templates.js.bak'

echo '✅ Cleanup complete!'
