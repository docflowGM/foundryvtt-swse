# SWSE Architectural Improvements - Implementation Guide

Generated: 2025-10-30 20:30:38
Target Repository: C:\Users\Owner\Documents\GitHub\foundryvtt-swse

## Overview

This guide explains how to integrate the newly generated architectural improvements into your SWSE system.

## Phase 1: Foundation (Immediate)

### 1. Register DataModels

Edit your main system file (index.js or swse.js) to register the new DataModels:
```javascript
import { SWSEActorDataModel } from './scripts/data-models/actor-data-model.js';
import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

Hooks.once("init", () => {
  // Register Data Models
  CONFIG.Actor.dataModels = {
    character: SWSECharacterDataModel,
    npc: SWSEActorDataModel,
    droid: SWSEActorDataModel,
    vehicle: SWSEVehicleDataModel
  };
  
  // Register Actor class
  CONFIG.Actor.documentClass = SWSEActorBase;
});
```

### 2. Update Actor Base Import

Replace your old actor import with the new enhanced version:
```javascript
import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
```

### 3. Update Sheet Registration

Register the new base sheet and character sheet:
```javascript
import { SWSEActorSheetBase } from './scripts/sheets/base-sheet.js';
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';

Actors.registerSheet("swse", SWSECharacterSheet, {
  types: ["character"],
  makeDefault: true,
  label: "SWSE Character Sheet"
});
```

## Phase 2: Migration (Before Players Access)

### 1. Create World Backup

Before running migration:
```javascript
await SWSEMigration.createBackup();
```

### 2. Run Migration

Open browser console in your world and run:
```javascript
await SWSEMigration.migrateWorld();
```

### 3. Verify Migration
```javascript
SWSEMigration.verifyMigration();
```

### 4. Test with Sample Character

Create a new test character and verify:
- Items appear correctly
- Feats/Talents work
- Calculations are accurate
- Rolls use getRollData properly

## Phase 3: Template Updates

### Update Your Handlebars Templates

The new system uses data-action attributes. Update your buttons:

**Old pattern:**
```handlebars
<button class="add-feat">Add Feat</button>
```

**New pattern:**
```handlebars
<button data-action="createFeat" class="item-control" data-type="feat">
  <i class="fas fa-plus"></i> Add Feat
</button>
```

### Item Lists

**Old pattern:**
```handlebars
{{#each feats}}
  <div class="feat">{{name}}</div>
{{/each}}
```

**New pattern:**
```handlebars
{{#each feats}}
  <div class="item" data-item-id="{{this._id}}">
    <h4>{{this.name}}</h4>
    <div class="item-controls">
      <a class="item-control" data-action="edit"><i class="fas fa-edit"></i></a>
      <a class="item-control" data-action="delete"><i class="fas fa-trash"></i></a>
    </div>
  </div>
{{/each}}
```

## Phase 4: Testing

### Manual Testing Checklist

- [ ] Create new character
- [ ] Add items (feats, weapons, armor)
- [ ] Test calculations (abilities, defenses, skills)
- [ ] Test damage application
- [ ] Test Second Wind
- [ ] Test Force Powers (if Force user)
- [ ] Test condition track
- [ ] Test rests (short/long)

### Automated Tests

If you set up a testing framework:
```bash
npm test
```

## Phase 5: Rollback Plan

If issues occur, you can rollback:

### Restore from Backup
```javascript
const backup = JSON.parse(await game.settings.get('swse', 'migrationBackup'));
// Restore actors from backup.actors array
```

### Switch Back to Old Code
```javascript
// In your init hook, comment out new registrations
// and restore old ones
```

## Common Issues & Solutions

### Issue: "DataModel is not defined"

**Solution:** Make sure you're using FoundryVTT V10 or later.

### Issue: Items not appearing

**Solution:** 
1. Check that migration completed successfully
2. Verify template.json has correct item types
3. Check browser console for errors

### Issue: Calculations wrong

**Solution:**
1. Verify calculation modules are imported correctly
2. Check that prepareDerivedData() is being called
3. Ensure condition penalties are applied

### Issue: Sheets not rendering

**Solution:**
1. Check template paths in sheet classes
2. Verify Handlebars templates exist
3. Check for JavaScript errors in console

## Performance Tips

1. **Throttle renders** - The base sheet already implements this
2. **Cache filtered items** - Already implemented in _prepareItems
3. **Use event delegation** - Already implemented with data-action pattern

## Next Steps

After successful implementation:

1. Test thoroughly with players
2. Gather feedback
3. Consider implementing:
   - Advanced roll dialog with modifiers
   - Macro support for common actions
   - Token automation hooks
   - Active Effects integration

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify FoundryVTT version (V10+ required)
3. Review the backup files in `_ARCHITECTURE_BACKUP_20251030_203037/`
4. Test with a fresh world to isolate issues

## Additional Resources

- **DataModel Documentation**: https://foundryvtt.com/article/v10-data-model/
- **getRollData Documentation**: https://foundryvtt.com/api/Actor.html#getRollData
- **Event Delegation**: https://javascript.info/event-delegation

---

Generated by SWSE Architectural Improvement Generator
Repository: C:\Users\Owner\Documents\GitHub\foundryvtt-swse
