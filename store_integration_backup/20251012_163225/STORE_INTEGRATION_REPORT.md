# SWSE Store Integration Report

Generated: 2025-10-12 16:32:25

## Changes Made

- Fixed swapped gm-settings.js and gm-settings.html
- Moved store/ → scripts/store/
- Removed old store/ directory
- Created templates/apps/store.hbs
- Updated store.js template path to .hbs
- Enhanced store to handle JSON-imported items
- Added store.css to system.json


## Warnings & Manual Steps Required

⚠ Manual integration required: See C:\Users\Owner\Documents\GitHub\foundryvtt-swse\store_integration_backup\20251012_163225\STORE_INTEGRATION_GUIDE.md
  You need to add a store button to your character sheet template.



## New File Structure

```
scripts/
├── store/
│   ├── store.js          # Main store class
│   ├── store.css         # Store styles
│   ├── gm-settings.js    # GM settings class
│   └── gm-settings.html  # GM settings template

templates/
├── apps/
│   └── store.hbs         # Store template
```

## How to Use the Store

### For GMs:

```javascript
// Open store for a specific actor
game.swse.openStore(actor);

// Or get an actor and open
const actor = game.actors.getName("Character Name");
game.swse.openStore(actor);
```

### For Players:

Add a button to the character sheet (see STORE_INTEGRATION_GUIDE.md)

## Testing

1. Open Foundry console (F12)
2. Test store access:
   ```javascript
   // Get first character
   const actor = game.actors.find(a => a.type === "character");
   game.swse.openStore(actor);
   ```
3. Store window should open
4. Test buying/selling items
5. Check credits are deducted/added

## GM Settings

To adjust store prices globally:
1. Open store
2. Click GM tab
3. Set markup/discount percentages
4. Click Save

## Next Steps

1. ✅ Test store in Foundry
2. ⚠ Add store button to character sheet (see integration guide)
3. ✅ Verify items have cost values in template.json
4. ✅ Create some world items for the store
5. ✅ Test buying/selling
6. ✅ Commit changes

## Rollback

If anything breaks, restore from:
{self.backup_dir}
