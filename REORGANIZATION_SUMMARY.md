# Repository Reorganization Summary

**Date:** 2025-10-29 06:31:27

## Changes Made

### Duplicates Removed

Total duplicate files removed: 7

- Removed: `assets\images\ui\sheet-background.png` (kept: `assets\images\ui\swse-cover.webp`)
- Removed: `assets\images\ui\sheet-frame.png` (kept: `assets\images\ui\swse-cover.webp`)
- Removed: `assets\images\ui\title-logo.png` (kept: `assets\images\ui\swse-cover.webp`)
- Removed: `assets\ui\logo.png` (kept: `ui\title-logo.png`)
- Removed: `assets\ui\logo@2x.png` (kept: `ui\title-logo@2x.png`)
- Removed: `module\sheets\character-sheet-handlers.js` (kept: `module\sheets\character-sheet-handlers.js.backup`)
- Removed: `scripts\helpers\dice-utils.js.old` (kept: `scripts\dice-utils.js`)

### Directory Structure Changes

The repository has been reorganized to follow FoundryVTT best practices:

- **module/**: All system code consolidated here (formerly split between `module/` and `scripts/`)
- **assets/**: All static assets consolidated (UI elements merged from multiple locations)
- **templates/**: All Handlebars templates in one location
- **tools/**: Development and build scripts moved here
- **data/**: JSON data files with co-located schemas

### Files Moved

- `Update.py` → `tools/scripts/Update.py`
- `apply_holo_theme.py` → `tools/scripts/apply_holo_theme.py`
- `assets/images/ui/` → `assets/ui/`
- `cleanup_review.sh` → `tools/cleanup_review.sh`
- `config.js` → `module/core/config.js`
- `helpers/` → `module/helpers/`
- `import os.py` → `tools/scripts/import_os.py`
- `migration-helper.js` → `tools/migration-helper.js`
- `module/chargen/` → `module/apps/chargen/`
- `module/constants/` → `module/apps/chargen/`
- `module/templates/` → `templates/`
- `rebuild_classes_db.py` → `tools/scripts/rebuild_classes_db.py`
- `scan_repo.py` → `tools/scripts/scan_repo.py`
- `schema/armor.schema.json` → `data/armor/armor.schema.json`
- `schema/attributes.schema.json` → `data/attributes.schema.json`
- `schema/combat-action.schema.json` → `data/combat-actions.schema.json`
- `schema/conditions.schema.json` → `data/conditions.schema.json`
- `schema/droids.schema.json` → `data/droids.schema.json`
- `schema/equipment.schema.json` → `data/equipment.schema.json`
- `schema/extraskilluses.schema.json` → `data/extraskilluses.schema.json`
- `schema/feats.schema.json` → `data/feats.schema.json`
- `schema/forcepowers.schema.json` → `data/forcepowers.schema.json`
- `schema/skills.schema.json` → `data/skills.schema.json`
- `schema/talents.schema.json` → `data/talents.schema.json`
- `schema/vehicles.schema.json` → `data/vehicles.schema.json`
- `schema/weapons.schema.json` → `data/weapons.schema.json`
- `scripts/actors/` → `module/actors/`
- `scripts/apps/` → `module/apps/`
- `scripts/core/` → `module/core/`
- `scripts/data/` → `module/data/`
- `scripts/helpers/` → `module/helpers/`
- `scripts/items/` → `module/items/`
- `scripts/rolls/` → `module/rolls/`
- `scripts/sheets/` → `module/sheets/`
- `scripts/swse.js` → `module/core/swse.js`
- `scripts/utils/` → `module/utils/`
- `store/` → `templates/apps/store/`
- `templates/chargen/` → `templates/apps/`
- `ui/` → `assets/ui/`


### Files Updated

Total files with updated references: 110

- data\Droids.json
- data\armor\heavy.json
- data\armor\light.json
- data\armor\medium.json
- data\attributes.json
- data\attributes.schema.json
- data\classes.json
- data\combat-actions.json
- data\combat-actions.schema.json
- data\conditions.json
- data\conditions.schema.json
- data\equipment.json
- data\equipment.schema.json
- data\extraskilluses.json
- data\extraskilluses.schema.json
- data\feats.json
- data\feats.schema.json
- data\forcepowers.schema.json
- data\skills.json
- data\skills.schema.json
- data\special-combat-condition.json
- data\talent_trees.json
- data\talents.json
- data\talents.schema.json
- data\vehicles.json
- data\vehicles.schema.json
- data\weapons.json
- data\weapons.schema.json
- helpers\handlebars-helpers.js
- index.js
- module\actors\swse-actor.js
- module\actors\swse-droid.js
- module\actors\swse-npc.js
- module\actors\swse-vehicle.js
- module\apps\chargen.js
- module\apps\chargen\chargen-init.js
- module\apps\chargen\chargen.js
- module\apps\store.js
- module\apps\swse-levelup.js
- module\chargen\chargen-init.js
- module\chargen\chargen.js
- module\core\config.js
- module\core\swse.js
- module\core\utils-init.js
- module\core\world-data-loader.js
- module\helpers\handlebars-helpers.js
- module\rolls\attacks.js
- module\rolls\damage.js
- module\rolls\dice.js
- module\rolls\initiative.js

... and 60 more files


## Next Steps

1. Test the system in FoundryVTT
2. Check that all imports/requires are working
3. Verify templates load correctly
4. Test that styles apply properly
5. Run any tests you have
6. Commit changes to git
