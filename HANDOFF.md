# Handoff: Sheet Instantiation Fix (Phase 3 Enforcement Diagnostic)

**Branch:** `claude/disable-phase-3-enforcement-uVZVc`

**Status:** Changes committed and pushed. Ready for testing and PR.

---

## Problem Summary

Actors cannot open sheets. When clicking an actor in the directory:
- Error: `Cannot read properties of null (reading 'render')`
- Root cause: `actor.sheet` returns `null` instead of a sheet instance
- Affects: All sheet types (character, NPC, droid, vehicle)

---

## Root Cause Identified

The **forensic sheet diagnostic code** (`scripts/core/forensic-sheet-diagnostic.js`) was:
1. Attempting to instrument the sheet getter for diagnostic logging
2. Unable to locate the real sheet getter in the expected prototype location
3. Creating its own getter that always returned `null`, shadowing the real Foundry getter

This prevented sheets from instantiating at all.

---

## Changes Made

### 1. **Disabled Phase 3 Structural Enforcement Layer**
- **File:** `scripts/core/v2-render-guard.js`
- **Change:** Added `ENABLE_PHASE3_ENFORCEMENT = false` feature flag
- **Reason:** Diagnostic isolation to determine if enforcement layer was interfering with sheets
- **Finding:** Phase 3 was NOT the cause; sheets fail even with enforcement disabled
- **Re-enable:** Change `const ENABLE_PHASE3_ENFORCEMENT = false;` to `true` (line 23)

### 2. **Disabled Forensic Sheet Diagnostic**
- **File:** `index.js`
- **Changes:**
  - Line 149-150: Commented out the import statement
  - Line 231-235: Commented out the `initializeSheetDiagnostics()` call
- **Reason:** The diagnostic was the actual culprit, not Phase 3
- **Note:** The diagnostic file itself (`forensic-sheet-diagnostic.js`) is good code but needs fixing to:
  - Properly traverse the prototype chain to find the real sheet getter
  - Handle the case where Actor instances are vanilla Foundry `Actor` class, not `SWSEV2BaseActor`

---

## What Was Tested

✅ **Verified working (manually in console):**
- `actor._getSheetClass()` returns correct sheet class
- Direct sheet instantiation: `new SheetClass(actor)` works
- Sheet class has `render()` method

❌ **Not yet tested after changes:**
- Sheets opening via directory click
- WelcomeDialog rendering
- All sheet types (character, NPC, droid, vehicle)
- Full Foundry restart with hard cache clear

---

## Next Steps: Testing & Validation

**After hard Foundry restart + browser cache clear:**

```javascript
// Test 1: Sheet getter works
const actor = game.actors.contents[0];
console.log('actor.sheet:', actor.sheet);  // Should be sheet instance, not null

// Test 2: Directory click works
// Click an actor in the directory — should open sheet without error

// Test 3: All sheet types
// Try opening character, NPC, droid, vehicle sheets

// Test 4: WelcomeDialog
// Check browser console — should not throw offsetWidth errors
```

**Expected results:**
- `actor.sheet` returns a sheet instance (not `null`)
- Clicking actors opens sheets without error
- All sheet types render normally
- No new console errors

---

## If Testing Passes

1. Create PR with title: **"Fix: Disable forensic sheet diagnostic blocking sheet instantiation"**
2. Description should reference this handoff and the root cause
3. Once merged, can consider:
   - Fixing the diagnostic code properly to re-enable diagnostic logging
   - Re-enabling Phase 3 enforcement if needed
   - Adding tests to prevent sheet getter shadowing

---

## If Testing Still Fails

The sheets may still not work due to:
1. **Browser cache not fully cleared** — try incognito/private window
2. **Document class mismatch** — actors are vanilla `Actor` instances, not `SWSEV2BaseActor`
3. **Another place shadowing the getter** — search for additional diagnostic code

In that case, run this full diagnostic:

```javascript
const actor = game.actors.contents[0];

// Find where sheet getter is
let obj = actor;
let depth = 0;
while (obj && depth < 10) {
  const desc = Object.getOwnPropertyDescriptor(obj, 'sheet');
  if (desc?.get) {
    console.log(`Sheet getter at depth ${depth}:`, desc.get.toString().substring(0, 200));
    break;
  }
  obj = Object.getPrototypeOf(obj);
  depth++;
}

// Try calling it
console.log('actor.sheet result:', actor.sheet);
```

---

## Git Info

**Latest commits:**
1. `5b60766` - Disable Phase 3 Structural Enforcement Layer for diagnostic isolation
2. `732bb46` - Fix: Disable forensic sheet diagnostic that was causing sheet instantiation failure
3. `4254880` - Disable forensic diagnostic import to prevent module loading

**Branch tracking:** `origin/claude/disable-phase-3-enforcement-uVZVc`

All changes are pushed and ready for testing.
