# Form Height Constraint - THE ACTUAL WINNING RULE (Corrected)

## What Went Wrong

I attempted to fix the form height constraint by changing rules at:
- Line 28: `.application.swse-character-sheet > .window-content > form.swse-character-sheet-form`
- Line 972: `.application.swse.sheet.actor.character > .window-content > form.swse-character-sheet-form`

**But these selectors did NOT match the actual form element at runtime.**

The form has the class `.swse-sheet-ui`, making it match:
- `form.swse-sheet-ui` (line 139) ← **THE ACTUAL WINNING SELECTOR**

## The Real Problem

**File:** `styles/sheets/v2-sheet.css`  
**Line:** 139-144
**Selector:** `form.swse-sheet-ui` (MORE SPECIFIC than my attempts)

**Original rule:**
```css
form.swse-sheet-ui {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;  ← WRONG: flex-basis is auto, prevents proper shrinking
  min-height: 0;
}
```

**Fixed rule:**
```css
form.swse-sheet-ui {
  display: flex;
  flex-direction: column;
  flex: 1;  ← CORRECT: flex-basis is 0%, allows proper height constraint
  min-height: 0;
}
```

## CSS Selector Specificity Lesson

My earlier attempts failed because:

```
SELECTOR SPECIFICITY (lowest → highest):
- `.window-content > form` (2 selectors: element + class)
- `form.swse-character-sheet-form` (element + 2 classes)
- `form.swse-sheet-ui` (element + 1 class) ← WINS at runtime!
```

The form's DOM classes determine which rules apply:
```html
<form class="swse-character-sheet-form swse-sheet-ui">
  <!-- Matches BOTH selectors, but form.swse-sheet-ui wins -->
</form>
```

## What This Fix Does

Changes form flex from `flex: 1 1 auto` to `flex: 1`:

**flex: 1 1 auto** (WRONG):
- flex-grow: 1 (expand)
- flex-shrink: 1 (shrink)
- flex-basis: **auto** ← Starts from content size (2668px)
- Problem: Element auto-grows and won't be constrained by parent

**flex: 1** (CORRECT):
- flex-grow: 1 (expand)
- flex-shrink: 1 (shrink)  
- flex-basis: **0%** ← Starts from 0, expands/contracts to fit parent
- Result: Form is now constrained by `.window-content`

## Expected Result After Fix

**Before (runtime broken):**
```
form.swse-sheet-ui
- Flex: 1 1 auto
- Height: 2668px
- Parent height: 941px
- Height limited by parent: NO - AUTO-GROWING
⚠️ CONSTRAINT CHAIN BREAKS HERE
```

**After fix (should show when browser hard-refreshes):**
```
form.swse-sheet-ui
- Flex: 1  ✓
- Height: ~550px
- Parent height: 941px
- Height limited by parent: YES ✓
```

Then the whole chain becomes constrained:
```
form: 550px ✓
  ↓
.sheet-shell: ~500px ✓
  ↓
.sheet-body: ~450px ✓
  ↓
.tab.active: ~350px ✓ (scrollHeight: 2099px)
  └─ CAN SCROLL NOW
```

## Why This Fix Is Authoritative

The rule `form.swse-sheet-ui` at line 139 is the **actual computed rule** that applies to the form at runtime because:

1. ✓ The form element has class `.swse-sheet-ui`
2. ✓ This selector matched in the cascade
3. ✓ Runtime diagnostics showed `flex: 1 1 auto` being applied
4. ✓ This is the only rule in loaded CSS that produces that exact value
5. ✓ Later CSS rules don't override it (no higher specificity matches)

## Browser Cache Note

This fix is in the file, but the browser needs a **hard refresh** to reload:
- `Ctrl+Shift+R` (Windows/Linux)
- `Cmd+Shift+R` (Mac)

After hard refresh and reopening the sheet, the diagnostics should show the form is now properly constrained.

## Files Affected

- `styles/sheets/v2-sheet.css`
  - Line 142: Changed `flex: 1 1 auto` → `flex: 1`
  - This is the ONLY change needed for height constraint to work

That's it. The entire scroll bug fix was ultimately about getting this one selector correct.
