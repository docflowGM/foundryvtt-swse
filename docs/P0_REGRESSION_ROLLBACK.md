# P0 Regression Rollback and Fix

**Status:** Regressions identified and corrected

---

## REGRESSIONS IDENTIFIED

Screenshot showed:
1. ❌ Missing bottom border/frame
2. ❌ Broken body scroll behavior

**Root cause:** The wrapper and form both had `flex: 1 1 auto` + `overflow: hidden`, creating double-wrapping that trapped the layout.

---

## WHAT WAS WRONG

**Original broken approach:**
```css
.window-content > div.swse-character-sheet-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;  ← This blocked the border
}

.wrapper > form.swse-character-sheet-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;  ← Double-wrapping broke scroll
}
```

This created a nested flex container problem:
- Both wrapper and form trying to control flex growth
- Wrapper's `overflow: hidden` blocked bottom border visibility
- Double `overflow: hidden` trapped scroll region
- Layout contract violated

---

## THE CORRECT FIX

**Wrapper becomes transparent to layout:**
```css
.window-content > div.swse-character-sheet-wrapper {
  /* Wrapper is transparent - form handles layout */
  display: contents;
}

.wrapper > form.swse-character-sheet-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;  ← Form is the only flex container
}
```

**`display: contents` removes the wrapper from the layout tree while keeping it in the DOM.**

This allows:
- ✅ ApplicationV2 to inject template into wrapper
- ✅ Form to be the actual flex container
- ✅ Border to be visible (not blocked by wrapper overflow)
- ✅ Scroll region to work correctly (single overflow context)
- ✅ No double-wrapping problems

---

## FILES CHANGED

| File | Change | Why |
|------|--------|-----|
| `templates/actors/character/v2/character-sheet.hbs` | Wrapper div exists (no changes) | Remains as ApplicationV2 injection point |
| `styles/sheets/character-sheet.css` | Wrapper uses `display: contents` | Makes wrapper transparent to flex layout |
| `scripts/sheets/v2/character-sheet.js` | (Previous fix intact) | Remove forced dimensions |

---

## WHAT NOW WORKS

✅ **Bottom border is visible** - Wrapper no longer blocks it  
✅ **Body scroll works** - Single flex/overflow context  
✅ **Frame is clean** - Proper ApplicationV2 layout contract  
✅ **Content expands** - Flexbox works correctly  
✅ **Resize still possible** - Wrapper allows frame events through  

---

## WHY `display: contents` IS CORRECT

`display: contents` is perfect for this use case:

| Property | Behavior |
|----------|----------|
| **DOM** | Wrapper element still exists |
| **Layout** | Wrapper doesn't create a flex container |
| **Events** | Normal event flow (no pointer-events hacks) |
| **Children** | Form becomes direct child of window-content for layout purposes |
| **Border** | Frame border visible (not blocked) |
| **Scroll** | Single scroll context (no nesting conflicts) |

This is a standard CSS technique for wrapper elements that need to exist for semantic/structural reasons but shouldn't participate in layout.

---

## SUMMARY

- ❌ Rolled back: Double-flex-container wrapping
- ✅ Implemented: Transparent wrapper with `display: contents`
- ✅ Result: Proper layout, visible border, working scroll, frame intact

**The sheet is now restored to full health while maintaining the structural fix that allows ApplicationV2 frame to function properly.**
