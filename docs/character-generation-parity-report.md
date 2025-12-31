# Character Generation Parity Report: Droid vs Living Characters

**Status: FIXED**
**Date: 2025-12-31**

## Executive Summary

This report analyzes the differences between the droid and living (organic) character generation flows in the SWSE Character Generator. Several critical inconsistencies were identified and have now been fixed to ensure both flows follow the same progression (except for type-specific steps).

## Current Step Flows

### Living Character PC Flow (from `_getSteps()`)
```
1. name
2. type
3. species
4. abilities
5. class
6. background
7. skills
8. feats
9. talents
10. (force-powers - conditional if Force-sensitive)
11. summary
12. shop
```

### Droid Character PC Flow (from `_getSteps()`)
```
1. name
2. type
3. degree
4. size
5. droid-builder
6. abilities
7. class
8. background
9. skills
10. feats
11. talents
12. (force-powers - conditional if Force-sensitive)
13. droid-final
14. summary
15. shop
```

### Chevron Navigation (from template)
```
1. name
2. type
3. (droid) degree, size, droid-builder / (living) species
4. abilities
5. class
6. skills
7. languages
8. (force-powers - conditional)
9. skills (DUPLICATE!)
10. summary
```

## Critical Issues Found

### Issue 1: Languages Step Missing from PC Workflow (CRITICAL)

**Location:** `scripts/apps/chargen/chargen-main.js:472`

**Problem:** The `languages` step is completely absent from the PC workflow in `_getSteps()`:
```javascript
// Current code (line 472):
steps.push("abilities", "class", "background", "skills", "feats", "talents");
// Note: "languages" is missing!
```

**Impact:**
- The chevron navigation shows a "Languages" step
- The template has a fully-functional languages section (`step-languages`)
- The `chargen-languages.js` module is loaded and ready
- But players never reach the languages step because it's not in the workflow!
- Droid characters get Binary automatically but never choose additional languages based on INT

**Expected:** Languages should come after Skills (INT-dependent) for both living and droid characters.

### Issue 2: Missing Chevron Steps (UI/UX Issue)

**Location:** `templates/apps/chargen.hbs:17-77`

**Problem:** The chevron navigation is missing several steps that exist in the actual workflow:

| Step | In Code | In Chevron |
|------|---------|------------|
| background | YES | NO |
| feats | YES | NO |
| talents | YES | NO |
| droid-final | YES | NO |
| languages | NO | YES |

**Impact:** Users cannot see their full progress through the character generator, and the visual indicator doesn't match the actual workflow.

### Issue 3: Duplicate Skills Step in Chevron

**Location:** `templates/apps/chargen.hbs:52-54` and `templates/apps/chargen.hbs:68-71`

**Problem:** The skills step appears twice in the chevron navigation template - once as a `chevron-step` class (line 52) and once as a `progress-step` class (line 68).

**Impact:** Confusing UI with duplicate step indicators.

### Issue 4: Step Order Inconsistency

**Location:** `templates/apps/chargen.hbs` vs `scripts/apps/chargen/chargen-main.js`

**Problem:** The chevron navigation shows steps in a different order than the code workflow:

- **Chevron order:** abilities -> class -> skills -> languages
- **Code order:** abilities -> class -> background -> skills -> (languages missing) -> feats -> talents

The chevron completely skips background, feats, and talents.

## Parity Analysis: What Should Be Shared

Both living and droid characters should follow the same core progression after their unique "origin" steps:

### Origin Steps (Unique to each type)
| Living Characters | Droid Characters |
|------------------|------------------|
| species | degree |
| - | size |
| - | droid-builder |

### Shared Steps (Should be identical)
1. abilities
2. class
3. background
4. skills
5. **languages** (MISSING FROM CODE!)
6. feats
7. talents
8. (force-powers - if Force-sensitive)
9. (droid-final - droids only, after talents)
10. summary
11. shop

## Recommended Fixes

### Fix 1: Add Languages Step to PC Workflow

In `chargen-main.js:_getSteps()`, add "languages" after "skills":

```javascript
// Before:
steps.push("abilities", "class", "background", "skills", "feats", "talents");

// After:
steps.push("abilities", "class", "background", "skills", "languages", "feats", "talents");
```

### Fix 2: Update Chevron Navigation

Update the chevron navigation in `chargen.hbs` to include all steps:
- Add: background, feats, talents, droid-final chevron steps
- Remove: duplicate skills progress-step
- Ensure order matches the code workflow

### Fix 3: Ensure Languages Step Works for Droids

Verify that `chargen-languages.js:_getStartingLanguages()` properly handles droids:
- Currently grants "Binary" automatically
- Should also allow INT-based additional language selection

## Files Affected

1. `scripts/apps/chargen/chargen-main.js` - Add languages to _getSteps()
2. `templates/apps/chargen.hbs` - Fix chevron navigation to match workflow
3. `scripts/apps/chargen/chargen-languages.js` - Verify droid language handling (already correct)

## Fixes Applied

### Fix 1: Added Languages Step to PC Workflow
**File:** `scripts/apps/chargen/chargen-main.js:473`

Changed:
```javascript
steps.push("abilities", "class", "background", "skills", "feats", "talents");
```

To:
```javascript
steps.push("abilities", "class", "background", "skills", "languages", "feats", "talents");
```

The languages step is now properly included in the PC workflow for both living and droid characters. The existing auto-skip logic (line 514-524) will automatically skip this step if the character has no additional languages to select (INT modifier <= 0).

### Fix 2: Updated Chevron Navigation
**File:** `templates/apps/chargen.hbs:44-87`

- Added missing chevron steps: background, feats, talents
- Added conditional droid-final chevron step (droids only)
- Changed force-powers from old progress-step to chevron-step for consistency
- Removed duplicate skills progress-step entry
- Ensured correct order matches the code workflow

The chevron navigation now shows:
1. name
2. type
3. (droid) degree, size, droid-builder / (living) species
4. abilities
5. class
6. background (NEW)
7. skills
8. languages
9. feats (NEW)
10. talents (NEW)
11. (force-powers - living only, conditional)
12. (droid-final - droids only, NEW)
13. summary

### Fix 3: Droids Cannot Be Force-Sensitive
**Files:**
- `scripts/apps/chargen/chargen-class.js:99`
- `scripts/apps/chargen/chargen-main.js:477`
- `templates/apps/chargen.hbs:72-79`

In Star Wars Saga Edition, droids cannot be Force-sensitive. This rule is now enforced:

1. **Class Selection:** When selecting a Force-sensitive class (like Jedi), the `forceSensitive` flag is only set if the character is NOT a droid.
2. **Step Logic:** The force-powers step is explicitly excluded for droids in `_getSteps()`.
3. **Chevron Navigation:** The force-powers chevron uses `{{#unless characterData.isDroid}}` to hide for droids.

## Updated Step Flows (After Fixes)

### Living Character PC Flow
```
1. name
2. type
3. species
4. abilities
5. class
6. background
7. skills
8. languages (NEW - was missing)
9. feats
10. talents
11. (force-powers - conditional if Force-sensitive)
12. summary
13. shop
```

### Droid Character PC Flow
```
1. name
2. type
3. degree
4. size
5. droid-builder
6. abilities
7. class
8. background
9. skills
10. languages (NEW - was missing)
11. feats
12. talents
13. droid-final
14. summary
15. shop
```
Note: Droids cannot be Force-sensitive in SWSE, so the force-powers step never appears for droids.

## Testing Recommendations

After fixes are applied:
1. Create a living character - verify all steps appear in order
2. Create a droid character - verify all steps appear in order
3. Verify languages step appears and functions for both types
4. Verify chevron navigation shows all steps correctly
5. Test Force-sensitive path for both types
6. Verify droid-final step only appears for droids
7. Verify languages auto-skip works when INT modifier <= 0
