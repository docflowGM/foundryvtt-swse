# SWSE System Status

Generated: 2025-10-13 07:56:58

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


## Remaining Issues

1. **Missing Sheet-frame.png** - Background image not found
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
