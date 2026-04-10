# Height Chain Diagnostic Guide

## Problem
The scroll owner (`.tab.active`) has `overflow-y: auto` but cannot scroll because:
- `scrollHeight: 2099`
- `clientHeight: 2099`
- `clientHeight === scrollHeight` means NO HEIGHT CONSTRAINT

The active tab is growing to fit all content instead of being limited by available window height.

## Root Cause Location
Somewhere in the parent chain, height constraint is being lost:
```
.window-content
  ↓
form.swse-character-sheet-form
  ↓
.sheet-shell or .swse-sheet
  ↓
.sheet-body
  ↓
.tab.active ← SHOULD BE CONSTRAINED HERE, BUT ISN'T
```

## New Diagnostic Method
Added `debugHeightChain()` to `CharacterSheetContractEnforcer`

**Called automatically** when character sheet renders (100ms after render completes)

## What It Measures

For each element in the parent chain:

```
Display:        computed display value
Flex:           flex-grow flex-shrink flex-basis
Min-height:     computed min-height
Height:         computed height
Max-height:     computed max-height
ClientHeight:   actual rendered height
ScrollHeight:   total content height
Is constrained: clientHeight < scrollHeight?
Height limited by parent: clientHeight <= parentClientHeight?
```

## Key Indicators

### ✓ CONSTRAINED (correct)
```
Parent clientHeight: 400
ClientHeight: 350
ScrollHeight: 2099
Is constrained: YES
Height limited by parent: YES
```
→ Element receives height limit from parent, content overflows

### ✗ UNCONSTRAINED (problem)
```
Parent clientHeight: 400
ClientHeight: 2099
ScrollHeight: 2099
Is constrained: NO
Height limited by parent: NO - AUTO-GROWING
⚠️ CONSTRAINT CHAIN BREAKS HERE
```
→ Element ignores parent height, grows to content size

## Expected Output Pattern

**Correct scenario (chain working):**
```
[1] .application.swse-character-sheet
    ClientHeight: 600
    ScrollHeight: 600
    Is constrained: NO (root is full window height)

[2] .window-content
    ClientHeight: 550
    ScrollHeight: 550
    Is constrained: NO
    Height limited by parent: YES ✓

[3] form.swse-character-sheet-form
    ClientHeight: 500
    ScrollHeight: 500
    Is constrained: NO
    Height limited by parent: YES ✓

[4] .sheet-body
    ClientHeight: 450
    ScrollHeight: 450
    Is constrained: NO
    Height limited by parent: YES ✓

[5] .tab.active
    ClientHeight: 450
    ScrollHeight: 2099
    Is constrained: YES ✓ (can scroll)
    Height limited by parent: YES ✓
```

**Problem scenario (where we are now):**
```
[1] .application.swse-character-sheet
    ClientHeight: 600

[2] .window-content
    ClientHeight: 550
    Height limited by parent: YES ✓

[3] form.swse-character-sheet-form
    ClientHeight: 500
    Height limited by parent: YES ✓

[4] .sheet-body
    ClientHeight: 450
    Height limited by parent: YES ✓

[5] .tab.active
    ClientHeight: 2099
    ScrollHeight: 2099
    Is constrained: NO ✗
    Height limited by parent: NO - AUTO-GROWING ✗
    ⚠️ CONSTRAINT CHAIN BREAKS HERE
```

## How to Read the Output

1. **Find the first "NO - AUTO-GROWING"** line
   - This is where the constraint chain breaks
   - The element should have `clientHeight ≤ parentClientHeight`
   - But instead it has `clientHeight > parentClientHeight`

2. **Check that element's CSS properties:**
   - Is `height` set to `auto`? (should be `flex: 1` or explicit value)
   - Is `min-height` set incorrectly?
   - Is `flex` property missing or wrong?
   - Is `overflow` hiding the problem?

3. **The fix will be CSS:**
   - Set proper `flex` property
   - Set or fix `height` constraint
   - Ensure `min-height: 0` is present for flex items

## Common Failure Patterns

### Pattern 1: Missing flex property
```css
/* WRONG */
.sheet-body {
  display: flex;
  flex-direction: column;
  /* no flex property — defaults to flex: 0 1 auto */
  min-height: 0;
}

/* CORRECT */
.sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;  /* ← REQUIRED to grow and shrink */
  min-height: 0;
}
```

### Pattern 2: Missing min-height: 0
```css
/* WRONG */
.tab.active {
  display: flex;
  flex-direction: column;
  flex: 1;
  /* missing min-height: 0 — defaults to auto */
}

/* CORRECT */
.tab.active {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;  /* ← REQUIRED for flex children to shrink */
}
```

### Pattern 3: Height property overriding flex
```css
/* WRONG */
.sheet-body {
  display: flex;
  flex: 1;
  height: auto;  /* ← OVERRIDES flex property */
}

/* CORRECT */
.sheet-body {
  display: flex;
  flex: 1;
  /* no explicit height — flex will control it */
}
```

## Next Steps After Diagnosis

1. Run the debugHeightChain() output
2. Identify the first "AUTO-GROWING" element
3. Read that element's CSS rules
4. Apply the minimal fix
5. Re-run diagnostics to verify the constraint chain is restored

## Files Involved

- `scripts/sheets/v2/contract-enforcer.js` — debugHeightChain() method
- `scripts/sheets/v2/character-sheet.js` — Calls debugHeightChain() automatically
- `styles/sheets/v2-sheet.css` — Where fixes will be applied
- `styles/sheets/v2-npc-specific.css` — May also need fixes
- `styles/sheets/v2-droid-specific.css` — May also need fixes

## Console Output Location

Open browser DevTools → Console tab after opening character sheet.

Look for box titled: `DEBUG: HEIGHT CONSTRAINT CHAIN AUDIT`

The output will appear 100ms after the sheet finishes rendering.
