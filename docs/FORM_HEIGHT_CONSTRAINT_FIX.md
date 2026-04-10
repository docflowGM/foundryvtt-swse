# Critical Form Height Constraint Fix

## Problem Identified
The height constraint chain was breaking at the form element:

**Before fix:**
```
.window-content: clientHeight 941px
  ↓
form.swse-character-sheet-form: clientHeight 2668px (AUTO-GROWING)
  ↓ (constraint broken here)
.sheet-body: inherits unlimited height
  ↓
.tab.active: clientHeight === scrollHeight (NO SCROLL)
```

**Root cause:** Form had `flex: 1 1 auto` instead of `flex: 1`

## The Flex Basis Problem

### `flex: 1 1 auto` (WRONG)
- `flex-grow: 1` — expand to fill space
- `flex-shrink: 1` — shrink if needed
- **`flex-basis: auto`** — start from content size

This means: "The form starts at 2668px (its content height) and tries to shrink if needed, but the shrinking doesn't work reliably with `min-height: 0`"

### `flex: 1` (CORRECT)
- `flex-grow: 1` — expand to fill space
- `flex-shrink: 1` — shrink if needed
- **`flex-basis: 0%`** — start from 0px

This means: "The form starts at 0px and expands to fill available space, then shrinks to fit the parent"

## Fix Applied

**File:** `styles/sheets/v2-sheet.css`

**Change 1 (Line 32):**
```css
/* BEFORE */
.application.swse-character-sheet > .window-content > form.swse-character-sheet-form,
.application.swse.sheet.actor.character > .window-content > form.swse-character-sheet-form {
  flex: 1 1 auto;  /* ← WRONG: auto flex-basis */
}

/* AFTER */
.application.swse-character-sheet > .window-content > form.swse-character-sheet-form,
.application.swse.sheet.actor.character > .window-content > form.swse-character-sheet-form {
  flex: 1;  /* ← CORRECT: 0% flex-basis */
}
```

**Change 2 (Line 976):**
Same change applied to the P0 sheet stabilization rule for consistency.

## Why This Fixes Scrolling

With `flex: 1` (flex-basis: 0%):

1. **Form now receives height constraint** from `.window-content`
   ```
   .window-content: 941px
   form: flex: 1 → receives 941px
   ```

2. **Height flows down the chain**
   ```
   form: 941px
     ↓
   .sheet-shell: flex: 1 → receives available height
     ↓
   .sheet-body: flex: 1 → receives available height
     ↓
   .tab.active: flex: 1 → receives available height
   ```

3. **Active tab becomes scrollable**
   ```
   .tab.active
   - clientHeight: ~400px (constrained)
   - scrollHeight: 2099px (content)
   - overflow-y: auto ✓
   - CAN SCROLL: YES
   ```

## The Height Chain (After Fix)

```
.application (window frame)
  ↓
.window-content (constrained to available frame height)
  ↓ flex: 1 min-height: 0
form.swse-character-sheet-form (CONSTRAINED)
  ↓ flex: 1 min-height: 0
.sheet-shell (CONSTRAINED)
  ↓ flex: 1 min-height: 0
.sheet-body (CONSTRAINED)
  ↓ flex: 1 min-height: 0 overflow-y: auto
.tab.active (CONSTRAINED, scrollable)
```

## Expected Result After Fix

**Height chain diagnostics should now show:**

```
[3] form.swse-character-sheet-form
    ClientHeight: 550
    ScrollHeight: 550
    Height limited by parent: YES ✓

[4] .sheet-body
    ClientHeight: 500
    ScrollHeight: 500
    Height limited by parent: YES ✓

[5] .tab.active
    ClientHeight: 450
    ScrollHeight: 2099
    Is constrained: YES ✓
    Height limited by parent: YES ✓
```

## CSS Flex Property Cheat Sheet

| Property | Growth | Shrink | Basis | Use Case |
|----------|--------|--------|-------|----------|
| `flex: 1` | 1 | 1 | 0% | Growing flex item that should shrink to parent |
| `flex: 1 1 auto` | 1 | 1 | auto | Item that starts from content size |
| `flex: 0 0 auto` | 0 | 0 | auto | Fixed-size item (no grow/shrink) |
| `flex: 1 0 auto` | 1 | 0 | auto | Growing item that doesn't shrink |

For height-constrained flex layouts, **`flex: 1` is almost always correct** when combined with `min-height: 0`.

## Regression Prevention

This fix:
- ✓ Allows form to be constrained by window height
- ✓ Allows sheet-body to be constrained
- ✓ Allows tab.active to be scrollable
- ✓ Maintains proper flex hierarchy
- ✓ Respects existing `min-height: 0` requirements

The contract enforcer will verify that the height chain is now properly constrained on every sheet render.
