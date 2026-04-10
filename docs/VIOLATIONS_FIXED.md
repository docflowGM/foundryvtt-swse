# Violations Fixed - Contract Enforcement

**Date Fixed**: 2026-04-09
**Status**: Violations removed from CSS
**Validation**: PENDING runtime verification

---

## What Was Fixed

### Violation 1: `.window-content` Missing `min-height: 0`

**File**: `styles/sheets/character-sheet.css:166`

**Fix Applied**:
```css
.application.swse-character-sheet > .window-content,
.application.swse.sheet.actor.character > .window-content {
  display: flex;
  flex-direction: column;
  min-height: 0 !important;  ← Added !important to ensure it applies
  overflow: hidden;
}
```

**Why**: This is required for flex children to shrink below their content height. Without it, the flex chain breaks and scroll regions don't work.

---

### Violation 2: Inner Panels with Independent Scroll

**File**: `styles/ui/character-sheet-overflow-contract.css`

**Fixes Applied** (removed 4 overflow rules from inner panels):

1. **Bio note wrapper** (line 148)
   - Removed: `overflow-y: auto`
   - Reason: Panel should inherit parent tab scroll

2. **Bio profile content** (line 158)
   - Removed: `overflow-y: auto`
   - Reason: Panel should inherit parent tab scroll

3. **Bio log sections** (line 168)
   - Removed: `overflow-y: auto`
   - Reason: Panel should inherit parent tab scroll

4. **Notes content** (line 181)
   - Removed: `overflow-y: auto`
   - Reason: Panel should inherit parent tab scroll

**Why**: Inner panels creating independent scroll regions compete with the primary `.tab.active` scroll owner, fragmenting the scroll experience.

---

### Violation 3: Multiple Scroll Owners

**Root Cause**: The 4 inner panel rules above were creating multiple scroll regions.

**Fix**: Removed those 4 rules (see Violation 2 above).

**Remaining Scroll Owners** (after fix):
- `form.swse-sheet-ui .sheet-body > .tab` in v2-sheet.css:193 ✓
- `.swse-character-sheet.swse-sheet .sheet-body > .tab` in character-sheet.css:214 ✓

Both point to the same element (`.tab.active`) so counted as ONE scroll owner.

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `styles/sheets/character-sheet.css` | Added `!important` to `.window-content min-height: 0` | 166 |
| `styles/ui/character-sheet-overflow-contract.css` | Removed 4 `overflow-y: auto` rules from panels | 148, 158, 168, 181 |

---

## Remaining Scroll Rules (Allowed)

These are the only `overflow` rules that should remain in character sheet files:

| File | Selector | Rule | Status |
|------|----------|------|--------|
| character-sheet.css | `.swse-character-sheet.swse-sheet .sheet-body > .tab` | `overflow-y: auto !important` | ✓ CORRECT |
| v2-sheet.css | `form.swse-sheet-ui .sheet-body > .tab` | `overflow-y: auto` | ✓ CORRECT |
| v2-sheet.css | `.condition-track` | `overflow-x: auto` | ✓ CORRECT (horizontal) |
| v2-sheet.css | `.dsp-numbered-track` | `overflow-x: auto` | ✓ CORRECT (horizontal) |

---

## What Now?

Run runtime verification to confirm:

```javascript
import { AcceptanceVerification } from '/systems/foundryvtt-swse/scripts/sheets/v2/acceptance-verification.js';
import { CharacterSheetContractEnforcer } from '/systems/foundryvtt-swse/scripts/sheets/v2/contract-enforcer.js';

// 1. Contract validation
const appElement = document.querySelector('.application.swse-character-sheet');
const contractResult = CharacterSheetContractEnforcer.validateAndReport(appElement);

// 2. Functional verification
const acceptanceResult = AcceptanceVerification.verifyAcceptance(appElement);
AcceptanceVerification.printReport(acceptanceResult);
```

---

## Expected Results After Fix

**Contract Enforcer Should Report**:
```
✓ All rules passed
- SCROLL: 1 owner found (was 21)
- PANELS: 0 violations (was 1)
- FLEX: WINDOW-CONTENT: min-height: 0 ✓ (was missing)
```

**Acceptance Tests Should Show**:
```
✓ scrollFunctionality: PASS (or at least improves)
✓ resizeFunctionality: PASS or WARN (depending on frame state)
? contentClipping: Status unknown until verified
? scrollRegions: 1 (primary) + 0 competing
```

---

## Key Point

**CSS violations have been removed.** This is a necessary but not sufficient condition for the sheet to work.

The real test is whether the sheet now actually scrolls and resizes. That requires runtime verification via acceptance tests.
