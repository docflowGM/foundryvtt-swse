# Phase 5B: Compendium V2 Compliance

## Overview

Phase 5B addresses critical blocking issues in compendium data that prevent safe v2 migration. These issues are **silent failures** - they work until a compendium item is renamed, then chargen/progression silently breaks.

## Critical Issues Found

### Issue #1: Talents Reference Classes by Name (986 items)
**File**: `packs/talents.db`
**Field**: `system.class`
**Current**: Text names like `"Jedi Knight"`, `"Soldier"`, `"Scout"`
**Problem**: If a class is renamed in compendium, all talents reference the old name silently
**Impact**: Chargen can't assign talents to renamed classes

**Example**:
```javascript
// Current (BROKEN):
talent.system.class = "Scout";  // If renamed to "Explorer", breaks

// Fixed:
talent.system.class = "8048efd85ae61101";  // ID - survives rename
```

### Issue #2: Classes Reference Talent Trees by Name (37 items)
**File**: `packs/classes.db`
**Field**: `system.talent_trees`
**Current**: Array of tree names like `["Awareness", "Commando", "Force Adept"]`
**Problem**: Renaming a talent tree in compendium breaks all class references
**Impact**: Level-up progression for renamed trees fails silently

### Issue #3: Feats List Bonus Classes by Name (420 items)
**File**: `packs/feats.db`
**Field**: `system.bonus_feat_for`
**Current**: Array of class names like `["Jedi", "Soldier", "Scout"]`
**Problem**: Chargen bonus feat assignment breaks on class rename
**Impact**: Characters may miss bonus feats if class was renamed

### Issue #4: Triple Fallback Pattern on Talent Trees (986 items)
**File**: `packs/talents.db`
**Fields**: `system.tree`, `system.talent_tree`, `system.treeId`
**Problem**: Three fields with different names, all serving same purpose
**Risk**: Runtime code uses wrong field if not careful
**Fix**: Remove redundant name fields, keep only `treeId`

## Migration Script

### Location
```
scripts/maintenance/migrate-compendium-to-v2-ids.js
```

### How to Run

1. **In Foundry v13+, open the browser console (F12)**
2. **Paste and run**:
```javascript
import('/scripts/maintenance/migrate-compendium-to-v2-ids.js')
  .then(mod => {
    mod.migrateAllCompendiums().then(results => {
      console.log('✅ Migration complete:', results);
    }).catch(err => console.error('❌ Migration failed:', err));
  });
```

### What It Does

```
1. Builds name→ID maps for all compendium items
2. Migrates talents.db system.class names to class IDs (986 items)
3. Migrates classes.db system.talent_trees names to tree IDs (37 items)
4. Migrates feats.db system.bonus_feat_for names to class IDs (420 items)
5. Cleans up triple fallback pattern in talents (removes redundant fields)
```

### Safety Features

- ✅ **Dry-run reporting**: Shows what will change before applying
- ✅ **Error handling**: Gracefully handles missing items
- ✅ **Fully reversible**: Document updates only, no deletions
- ✅ **Detailed logging**: All changes logged to console
- ✅ **Backup safety**: Run with backup present (script doesn't delete anything)

### Expected Results

After running the migration, you should see:

```
═══════════════════════════════════════════════════════════
✅ MIGRATION COMPLETE
═══════════════════════════════════════════════════════════
Results summary:
┌─────────────────────────┬───────┐
│ Talent class names      │ ~986  │
│ Class talent_trees      │ ~37   │
│ Feat bonus classes      │ ~420  │
│ Fallback cleanup        │ ~986  │
└─────────────────────────┴───────┘
═══════════════════════════════════════════════════════════
```

## Validation After Migration

After running the migration, verify by:

1. **Check a talent**:
   - Open talent in compendium
   - Verify `system.class` is a 16-character hex ID (e.g., `8048efd85ae61101`)
   - NOT a class name string

2. **Check a class**:
   - Open class in compendium
   - Verify `system.talent_trees` array contains hex IDs
   - NOT talent tree names

3. **Test chargen**:
   - Create new character
   - Select Scout class
   - Verify talents for Scout show correctly
   - Select a feat with bonus feats
   - Verify bonus feats apply to correct class

## What Happens If You Don't Run This Migration

### Silent Failures
- Rename `"Scout"` to `"Explorer"` in classes → All 57 Scout talents silently reference old name
- Rename `"Warrior"` tree to `"Martial Arts"` → All classes using it silently fail
- Chargen shows no error but creates incomplete characters

### Runtime Issues
- Talent assignment doesn't match class
- Bonus feats don't apply
- Level-up progression can't find talents

## Rollback Plan

If migration causes issues:

1. **Option 1: Restore backup** (easiest)
2. **Option 2: Reverse migration**:
   - Run a rollback script (TODO: create if needed)
   - Or manually revert the database changes

## Next Steps (After Migration)

1. ✅ Run the migration script
2. ✅ Test chargen with renamed items (if you rename anything)
3. ✅ Verify talent assignment works
4. ✅ Commit the migrated compendium data

Then proceed to Phase 5C (Chargen Card Finalization).

## Architecture Decision

After this migration, the system will follow these principles:

- **IDs are authoritative**: All references use 16-character hex IDs
- **Names are labels**: Used for display only, not for lookups
- **No fallbacks**: Code uses IDs directly, not name-matching
- **Rename-safe**: Renaming compendium items doesn't break references

This enables:
- ✅ Safe compendium refactoring
- ✅ Chargen preview cards with fresh data
- ✅ Concurrent chargen in Foundry v13
- ✅ Future data versioning and schema changes
