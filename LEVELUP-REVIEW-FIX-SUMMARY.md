# Level-Up Review Step Fix — Missing Selection Helpers

**Date:** 2026-05-18  
**Status:** COMPLETE  
**Issue:** TypeError when entering Level-Up Review step  

---

## Problem

When a player clicked "Next" into the Level-Up Review step during class progression, Foundry returned this error:

```
TypeError: this._getSelectionNames is not a function
    at LevelupReviewStep._buildLevelupSummary (summary-step.js:592:39)
```

The class data was loading correctly, but the review step's summary builder crashed because two helper methods were missing from the `SummaryStep` base class.

---

## Root Cause

The level-up summary code expanded to show newly added Force techniques, Force secrets, medical secrets, starship maneuvers, and languages (Phase 10), but two normalization helpers were not implemented:

1. `_getSelectionNames()` — Extract display names from selection data (various shapes)
2. `_extractSkillSelectionKeys()` — Normalize skill selections into flat key arrays

Both are called from `_buildLevelupSummary()` starting at line 592:

```js
const addedForceTechniques = this._getSelectionNames(selections.forceTechniques);
const addedForceSecrets = this._getSelectionNames(selections.forceSecrets);
const addedMedicalSecrets = this._getSelectionNames(selections.medicalSecrets);
const addedStarshipManeuvers = this._getSelectionNames(selections.starshipManeuvers);
const addedLanguages = this._getSelectionNames(selections.languages);
const addedSkills = this._getAddedSkills(actor, projection?.skills?.trained || this._extractSkillSelectionKeys(selections.skills));
```

---

## Solution

Added two robust helper methods to `SummaryStep` that safely handle multiple selection data shapes without throwing.

### 1. `_getSelectionNames(selection)` — Lines 782–829

Safely extracts display names from selection data in any shape:

**Input shapes handled:**
- `null` / `undefined` → returns `[]`
- Arrays of strings → returns array as-is
- Arrays of objects → extracts `.name`, `.label`, `.id`, `.key`, or `.slug`
- Sets → converts to array, extracts display names
- Maps → iterates values, extracts display names
- Object dictionaries with status properties (`selected`, `trained`, `value`) → filters by truthy values
- Object dictionaries with name properties → returns values as display names

**Safety guarantees:**
- Never throws on unexpected input
- Falls back to empty array for undefined/null
- Filters out empty/blank names
- Uses existing `_displayName()` for consistent normalization

### 2. `_extractSkillSelectionKeys(selection)` — Lines 832–877

Normalizes skill selections into a flat array of skill keys for comparison:

**Input shapes handled:**
- `null` / `undefined` → returns `[]`
- Arrays of strings (skill keys) → returns array as-is
- Arrays of objects → extracts `.key`, `.id`, `.slug`, or `.name`
- Object dictionaries with status properties (`trained`, `selected`, `value`) → filters by truthy, returns keys
- Object dictionaries without status → treats keys as skill keys

**Safety guarantees:**
- Returns empty array on unknown shapes
- Filters out empty/blank keys
- Handles both "selected as properties" and "object keys" patterns

---

## Files Changed

| File | Change | Lines | Notes |
|------|--------|-------|-------|
| `summary-step.js` | Added two methods | 782–877 | 96 lines total; pure helpers, no side effects |

---

## Validation

**Syntax checks:** ✓ PASS

```bash
✓ node --input-type=module --check < scripts/apps/progression-framework/steps/summary-step.js
✓ node --input-type=module --check < scripts/apps/progression-framework/steps/levelup-review-step.js
```

**Method verification:** ✓ CONFIRMED

```
Lines 592–597: Calls to _getSelectionNames() and _extractSkillSelectionKeys()
Line 782: _getSelectionNames definition
Line 832: _extractSkillSelectionKeys definition
```

Both methods are now defined and will be found at runtime.

---

## Testing Checklist

- [ ] Open character sheet with level-up progression
- [ ] Click "Next" to advance to Level-Up Review
- [ ] Verify no TypeError crash
- [ ] Verify added Force techniques display
- [ ] Verify added languages display
- [ ] Verify HP calculation preview shows
- [ ] Verify credit preview shows
- [ ] Click "Next" to proceed past review step

---

## Architecture Notes

- **No mutation of actor data:** Helpers are pure (read-only)
- **Side-effect free:** Only compute and return normalized data
- **Backward compatible:** Existing selection shapes still work
- **Inheritable:** LevelupReviewStep inherits these helpers from SummaryStep
- **Consistent:** Uses existing `_displayName()` for normalization

---

## Expected Behavior After Fix

When a player enters the Level-Up Review step:

1. Class data is loaded successfully ✓
2. Progression selections are evaluated ✓
3. Summary builder calls `_buildLevelupSummary()` ✓
4. Helper methods now exist and handle all selection shapes ✓
5. Summary displays added abilities, skills, languages, etc. ✓
6. Player can proceed to the next step ✓

The error `TypeError: this._getSelectionNames is not a function` will no longer occur.

---

## Next Steps

**Foundry runtime testing required:**
- Open a character sheet at class level-up
- Progress through the level-up shell
- Verify Level-Up Review step opens without error
- Confirm all selections (feats, talents, skills, languages, etc.) display correctly in the summary
- Proceed through finalizer to complete level-up

