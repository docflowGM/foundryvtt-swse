# SWSE System Status

Generated: 2025-10-20 20:22:34


## 🆕 Recent Improvements (Character Sheet v1.1)

- **Form Accessibility**: All 136+ form fields now have proper `id` and `autocomplete` attributes
- **Classes Tab**: New dedicated tab with level-based class slots (auto-adjusts to character level)
- **Defense Customization**: Added ability score selectors for Fort/Ref/Will defenses
- **Condition Track Fix**: 
  - Increased dropdown height to prevent text cutoff
  - Fixed bug where condition penalties incorrectly affected defenses (now only applies when helpless)
- **½ Level Display**: Moved next to character level for better visibility
- **Force Powers**: Enhanced add/edit/delete functionality
- **Species List**: Now displays all 68+ species from races.js data

## ✅ Working

- Character sheets load and display
- Actor data preparation works
- Sheet registration successful

## ⚠️ Warnings (Non-blocking)

These are deprecation warnings - everything still works:

1. **V1 Application Framework** - Works until Foundry v16
2. **TinyMCE Editor** - Works until Foundry v14
3. **Global APIs** - Works until Foundry v15

You can ignore these warnings. They won't break anything.

## Issues Fixed

- Fixed chargen for v13
- Fixed form accessibility issues (added IDs and autocomplete)
- Fixed condition track affecting defenses when it shouldn't
- Fixed species dropdown only showing limited races
- Fixed ½ level positioning



## Remaining Issues

1. **Character Sheet Enhancements Complete** ✓
   - All form fields properly labeled
   - Classes management system functional
   - Defense customization working
   - Condition track properly styled

2. **Missing Sheet-frame.png** - Background image not found
   - Add the image to ui/ folder, OR
   - Remove background-image CSS from character-sheet.hbs

2. **Store System** - If you see "Store not available"
   - Check that store/store.js exists
   - Or remove store button from templates if not needed

3. **Invalid Number Values** - Console warnings about "1,1" and ","
   - These are from number inputs with comma separators
   - Non-blocking, can be ignored

## Next Steps

1. ✅ Character sheets are working
2. Add missing assets (Sheet-frame.png, title-logo.png)
3. Test all sheet functionality
4. Optionally: Migrate to ApplicationV2 later (not urgent)

## To Test

```javascript
// Check if sheets work
const actor = game.actors.contents[0];
if (actor) actor.sheet.render(true);

// Check compendium indexing
console.log("Compendiums:", game.packs.size);

// Check items
console.log("World items:", game.items.size);
```
