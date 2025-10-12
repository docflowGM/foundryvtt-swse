# SWSE System Consolidation Guide

## What Was Done

This script consolidated your two parallel systems into one:

**BEFORE:**
```
index.js (ACTIVE) → scripts/ → templates/actor/
swse.js (DORMANT) → module/ → templates/actors/
```

**AFTER:**
```
index.js (ACTIVE) → scripts/ (includes chargen) → templates/actor/
```

## Changes Made

- Removed: template.json.backup
- Removed: template_backups\20251012_161721\templates\actor\character-sheet.hbs.backup
- Removed: template_backups\20251012_161721\templates\actors\character-sheet.html.backup
- Removed: module\chargen\chargen-init.js.backup
- Removed: module\chargen\chargen.js.backup
- Removed: module\sheets\SWSEActorSheet.js.backup
- Removed: consolidation_backup\20251012_162555\module\chargen\chargen-init.js.backup
- Removed: consolidation_backup\20251012_162555\module\chargen\chargen.js.backup
- Removed: consolidation_backup\20251012_162555\module\sheets\SWSEActorSheet.js.backup
- Removed: consolidation_backup\20251012_162514\module\chargen\chargen-init.js.backup
- Removed: consolidation_backup\20251012_162514\module\chargen\chargen.js.backup
- Removed: consolidation_backup\20251012_162514\module\sheets\SWSEActorSheet.js.backup
- Moved: module/chargen/ → scripts/chargen/
- Copied: module/scripts/helpers.js → scripts/helpers.js
- Updated index.js to import character generator


## Warnings

⚠ MANUAL ACTION REQUIRED: Review module/ directory
  After verifying everything works, you can safely remove it:
  rm -rf module/



## What You Need to Do

### 1. Update Template Path in Module Sheets (if any remain)

If you kept any files from `module/sheets/`, update their template paths:

```javascript
// OLD
template: "systems/swse/templates/actors/character-sheet.html"

// NEW
template: "systems/swse/templates/actor/character-sheet.hbs"
```

### 2. Test Character Generator

The character generator should now work because it's imported in index.js:

```javascript
import "./scripts/chargen/chargen-init.js";
```

Test by:
1. Click "Create Actor" button in Foundry
2. You should see "Use Character Generator" dialog
3. Create a test character

### 3. Review Module Directory

After confirming everything works:

```bash
# List what's left in module/
ls -la module/

# If it's all redundant, remove it
git rm -rf module/
```

### 4. Clean Git History

```bash
# Review changes
git status
git diff

# Stage consolidation
git add .
git commit -m "Consolidate parallel systems: integrate chargen into main system"

# Remove backup files from git (if tracked)
git rm --cached **/*.backup
git commit -m "Remove backup files from version control"
```

### 5. Update .gitignore

Add to `.gitignore`:
```
*.backup
consolidation_backup/
optimization_backups/
```

## Testing Checklist

- [ ] Character sheet loads
- [ ] Character generator works
- [ ] All tabs functional (Skills, Feats, Talents, Powers, Equipment)
- [ ] Items can be added/removed
- [ ] Ability scores calculate correctly
- [ ] No console errors
- [ ] Templates render correctly

## File Structure (Recommended Final State)

```
foundryvtt-swse/
├── index.js                 # SOLE entry point
├── config.js                # System configuration
├── system.json              # Foundry manifest
├── template.json            # Data model
├── scripts/
│   ├── swse-actor.js       # Actor class & sheet
│   ├── swse-item.js        # Item class & sheet  
│   ├── swse-droid.js       # Droid sheet
│   ├── swse-vehicle.js     # Vehicle sheet
│   ├── load-templates.js   # Template loader
│   ├── helpers.js          # Handlebars helpers
│   └── chargen/            # Character generator
│       ├── chargen-init.js
│       └── chargen.js
├── templates/
│   ├── actor/              # All actor templates here
│   │   ├── character-sheet.hbs
│   │   ├── npc-sheet.hbs
│   │   ├── droid-sheet.hbs
│   │   └── vehicle-sheet.hbs
│   ├── item/
│   │   └── item-sheet.hbs
│   ├── apps/
│   │   └── chargen.hbs
│   └── partials/
│       └── ...
└── styles/
    └── ...
```

## Rollback Instructions

If something breaks, restore from backup:

```bash
# Your backup is at: {self.backup_dir}

# Restore a specific file
cp {self.backup_dir}/index.js ./index.js

# Restore entire directory
cp -r {self.backup_dir}/scripts ./scripts
```

## Questions?

Common issues:

**Q: Character generator button doesn't appear**
A: Check browser console for import errors. Verify chargen-init.js path is correct.

**Q: Templates not rendering**
A: Check template paths in sheet classes match actual file locations.

**Q: Sheet looks broken**
A: Verify CSS files are loaded in system.json styles array.

