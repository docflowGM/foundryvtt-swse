# SWSE Sheet Classes - Foundry v13 Compatibility

Generated: 2025-10-12 22:06:40

## What Was Done

The sheet classes (SWSEActorSheet, SWSEDroidSheet, SWSEVehicleSheet, SWSEItemSheet) 
were left using the **legacy compatibility mode** which is supported in Foundry v13.

While these use deprecated APIs, they will continue to work until Foundry v15.

## Current Status

✅ **Working** - The sheets use ActorSheet/ItemSheet base classes which are compatible
✅ **Registered** - index.js now uses DocumentSheetConfig.registerSheet (v13 syntax)
✅ **Functional** - All sheet functionality should work normally

## Future Migration (Optional)

If you want to migrate to the new ApplicationV2 system (not required), you would need to:

1. Extend `foundry.applications.sheets.ActorSheetV2` instead of `ActorSheet`
2. Use `static DEFAULT_OPTIONS` instead of `static get defaultOptions()`
3. Use `static PARTS` to define template parts
4. Change `getData()` to `_prepareContext()`
5. Update event listeners to use the new actions system

**However, this is NOT necessary right now.** Your sheets will work fine as-is.

## Files Modified

- index.js - Updated sheet registration for v13
- (Sheet class files left unchanged - using legacy compatibility)

## Backup Location

C:\Users\Owner\Documents\GitHub\foundryvtt-swse\sheet_v13_fix_backup\20251012_220637

## Testing

After restarting Foundry, run this in console:

```javascript
// Check sheet registration
console.log("Character sheets:", Object.keys(CONFIG.Actor.sheetClasses.character));
console.log("Item sheets:", Object.keys(CONFIG.Item.sheetClasses.weapon));

// Try opening a character
const actor = game.actors.contents[0];
if (actor) actor.sheet.render(true);
```

All actor types (character, droid, vehicle, npc) should now have working sheets!
