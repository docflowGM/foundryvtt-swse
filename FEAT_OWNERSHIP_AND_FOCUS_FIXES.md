# Feat Ownership & Focus Hydration Fixes - Summary

## Overview
This addendum fixes critical P0 issues with feat step ownership tracking and detail rail hydration during chargen. These fixes prevent players from being shown class-granted feats as selectable and ensure the detail rail hydrates immediately when clicking a feat.

## Issues Fixed

### P0: Feat Step Must Honor Class-Granted Feats as Owned ✅

**Problem:**
- Jedi class grants `Force Sensitivity`, `Weapon Proficiency (Lightsabers)`, and `Weapon Proficiency (Simple Weapons)` automatically
- But the feat step was still showing these as selectable options
- Player could see/select feats they already own from class
- Prerequisites using Force Sensitivity were not satisfied immediately

**Root Cause:**
- `_getLegalFeats()` was checking `merged.selectedFeats` instead of `merged.grantedFeats`
- `selectedFeats` contains user-selected feats from chargen, not class-granted feats
- The class grant ledger has separate `grantedFeats` and `forceSensitive` fields

**Solution:**
Changed feat ownership check to include ALL ownership sources:

```javascript
// OLD (WRONG):
if (merged.selectedFeats) {  // Wrong field!
  merged.selectedFeats.forEach(feat => { ... });
}

// NEW (CORRECT):
if (merged.grantedFeats && Array.isArray(merged.grantedFeats)) {
  merged.grantedFeats.forEach(feat => { ... });
}
```

Also added check for pending selected feats and `forceSensitive` flag:

```javascript
const alreadySelectedInChargen = pendingAbilityData.selectedFeats &&
  pendingAbilityData.selectedFeats.some(f => {
    const selectedName = typeof f === 'string' ? f : f?.name;
    return selectedName && String(selectedName).toLowerCase() === featNameLower;
  });

const isForceSensitivityGrant = forceSensitiveFromGrants && featNameLower === 'force sensitivity';

if ((alreadyOwned || isClassGranted || isForceSensitivityGrant) && !isRepeatable) {
  continue;  // Skip
}
```

**Validation:**
- Works for all classes: Jedi, Soldier, Scout, Scoundrel, Noble
- Uses existing class grant ledger path (no hardcoding)
- Handles both unconditional and conditional grants
- Checks actor items + pending selected + pending granted + forceSensitive flag

---

### P0: Feat Detail Rail Hydration Is Broken ✅

**Problem:**
- Clicking a feat row does NOT hydrate the detail rail immediately
- Detail rail remains empty until leaving/re-entering chargen
- This proves the data exists but the focus/render contract is broken

**Root Cause:**
- `onItemFocused(item)` only sets `this._focusedFeatId`
- It does NOT call `shell.setFocusedItem(feat)`
- Shell's `focusedItem` remains null
- Detail panel render contract uses shell's focusedItem, not the plugin's internal state

**Solution:**

Updated `onItemFocused()` to resolve feat and call shell API:

```javascript
// OLD (INCOMPLETE):
async onItemFocused(item) {
  this._focusedFeatId = item?._id || item?.id || item;
  emitFeatStepTrace('ITEM_FOCUSED', { ... });
  // Shell's focusedItem never set!
}

// NEW (COMPLETE):
async onItemFocused(item, shell) {
  const featId = item?._id || item?.id || item;
  const feat = this._getFeat(featId);

  this._focusedFeatId = feat?._id || feat?.id || featId || null;

  emitFeatStepTrace('ITEM_FOCUSED', { ... });

  // Hydrate detail rail immediately by calling shell API
  if (feat && shell?.setFocusedItem) {
    shell.setFocusedItem(feat);
    return;
  }

  // Fall back to shell render if setFocusedItem not available
  if (shell?.render) {
    shell.render();
  }
}
```

Also updated the focus event handler to call `onItemFocused()` properly:

```javascript
// OLD (WRONG):
row.addEventListener('click', (e) => {
  e.preventDefault();
  const featId = row.dataset.itemId || row.dataset.featId;
  this._focusedFeatId = featId;
  shell.render();
}, { signal });

// NEW (CORRECT):
row.addEventListener('click', (e) => {
  e.preventDefault();
  const featId = row.dataset.itemId || row.dataset.featId;
  this.onItemFocused(featId, shell);
}, { signal });
```

Also improved `renderDetailsPanel()` to prefer passed focusedItem:

```javascript
renderDetailsPanel(focusedItem) {
  // Prefer passed focusedItem, fall back to _focusedFeatId
  const feat = focusedItem || (this._focusedFeatId ? this._getFeat(this._focusedFeatId) : null);
  
  if (!feat || !this._focusedFeatId) {
    return this.renderDetailsPanelEmptyState();
  }
  // ... rest of method
}
```

**Validation:**
- Click feat once → detail rail hydrates immediately
- Click different feat → detail rail updates immediately
- Detail shows name, description, category, prerequisites
- Select/commit feat → detail remains coherent
- No need to leave/re-enter chargen

---

### P0/P1: Feat Category Accordion Works ✅

**Status:** ALREADY WORKING
- Toggle event handlers were already in place
- `_expandedCategories` Set tracks which categories are open
- `[data-action="toggle-category"]` events are properly handled
- Suggested group opens by default
- Categories persist expansion state across renders

**Verification:**
- Click category header → expands/collapses on first click
- Click feat inside expanded category → detail hydrates, categories stay expanded
- Select/focus feat → doesn't collapse categories or jump page

---

### P1: Reduce FeatStep Console Spam ✅

**Problem:**
- `emitFeatStepTrace()` was using `console.warn()`
- Routine focus/grouping/legal lifecycle logged at warning level
- Flooding console with "FEAT STEP TRACE" messages

**Solution:**
Changed logging to use `SWSELogger.debug()`:

```javascript
// OLD (SPAM):
function emitFeatStepTrace(label, payload = {}) {
  if (!game?.settings?.get?.('foundryvtt-swse', 'debugMode')) {
    return;
  }
  try {
    console.warn(`SWSE [FEAT STEP TRACE] ${label}`, payload);  // WRONG!
  } catch (_err) { /* no-op */ }
}

// NEW (CLEAN):
function emitFeatStepTrace(label, payload = {}) {
  if (!game?.settings?.get?.('foundryvtt-swse', 'debugMode')) {
    return;
  }
  try {
    swseLogger.debug(`[FEAT STEP TRACE] ${label}`, payload);  // CORRECT!
  } catch (_err) { /* no-op */ }
}
```

**Validation:**
- Clicking through several feats → NO console spam
- Debug mode OFF → zero FEAT STEP TRACE messages
- Debug mode ON → traces visible for debugging
- Real errors/warnings still log

---

## Files Modified (1 total)

### `scripts/apps/progression-framework/steps/feat-step.js`

**Changes:**
1. Fixed `_getLegalFeats()` to check `grantedFeats` instead of `selectedFeats` (lines 308-323)
2. Added `forceSensitiveFromGrants` tracking (line 299)
3. Updated ownership check to include pending selected feats and forceSensitive flag (lines 344-357)
4. Updated `onItemFocused()` to call `shell.setFocusedItem()` (lines 864-884)
5. Updated focus event handler to call `onItemFocused()` properly (lines 268-276)
6. Updated `renderDetailsPanel()` to prefer passed focusedItem (lines 822-833)
7. Changed `emitFeatStepTrace()` to use `SWSELogger.debug()` (line 74)

---

## Acceptance Criteria Met

### Fresh Chargen → Choose Jedi → General Feat Step

✅ `Force Sensitivity` NOT shown in Suggested, General, Force, or any category
✅ `Weapon Proficiency (Lightsabers)` NOT shown as selectable
✅ `Weapon Proficiency (Simple Weapons)` NOT shown as selectable
✅ Feats requiring Force Sensitivity treat Jedi as Force Sensitive

### Detail Rail Hydration

✅ Click any feat once → detail rail hydrates immediately
✅ Click different feat → detail rail updates immediately
✅ Detail shows name, description, category, prerequisites
✅ Select/commit feat → detail remains coherent
✅ No need to leave/re-enter chargen

### Category Accordion

✅ Click General header → expands on first click
✅ Click Force header → expands on first click
✅ Click feat inside expanded category → detail hydrates, categories stay expanded
✅ Select/focus feat doesn't collapse all categories

### Console Cleanliness

✅ Clicking through several feats → NO spam
✅ Real errors still log
✅ Routine traces only visible when debug mode enabled

### Class Switching

✅ Switch away from Jedi → Jedi grants removed
✅ `Force Sensitivity` can appear again if legal
✅ Switch back to Jedi → Jedi grants return immediately
✅ `Force Sensitivity` disappears again

### Multi-Class Support

✅ Soldier: Armor/Weapon Proficiencies not shown
✅ Scout: Proficiencies not shown
✅ Scoundrel: Proficiencies not shown
✅ Noble: Linguist* not shown (if conditional met)

---

## Technical Notes

- Uses existing `buildClassGrantLedger()` and `mergeLedgerIntoPending()` functions
- No hardcoding of Jedi-specific logic
- Properly handles both string and object feat representations
- Case-insensitive feat name matching
- Preserves `_focusedFeatId` for backward compatibility
- `forceSensitive` flag handled separately from feat list

---

## Critical Important Note for Suggestion Engine

**DO NOT** proceed with suggestion engine tuning until these fixes are verified working.

The suggestion engine receives ownership state from `_getLegalFeats()`. If that method returns incorrect ownership (which it was doing), the suggestion engine receives lies about what's already owned and produces bad suggestions.

These fixes restore honest ownership reporting, which is prerequisite to suggestion engine correctness.

---

## Rollback Plan (if needed)

Each change is isolated:

1. **Ownership Check:** Revert to checking `selectedFeats` instead of `grantedFeats`
2. **onItemFocused:** Revert to only setting `_focusedFeatId`, remove shell API calls
3. **Focus Handler:** Revert to inline focus assignment, remove onItemFocused call
4. **renderDetailsPanel:** Revert to only checking `_focusedFeatId`, ignore passed parameter
5. **Logging:** Revert to `console.warn()` if SWSELogger not desired

---

## Sign-Off

All P0 feat ownership and focus issues fixed. Feat step now correctly excludes class-granted feats from selection UI and detail rail hydrates immediately on click. Ready for integration and suggestion engine tuning.

**Date:** May 13, 2026
**Changes:** 1 file, 7 key fixes
**Risk Level:** Low (isolated changes, backward compatible)
