# PERSISTENCE STATUS: After Governance-Aware Filtering

## What Was Fixed

**The Problem:** Form persistence was failing with `[HP SSOT Violation]` error because it was attempting to update `system.hp.max` directly, which is a protected field that can only be written by `ActorEngine.recomputeHP()`.

**The Solution:** Added `_filterProtectedFields()` method that removes SSOT-protected fields from the form data before submission to ActorEngine:
- Filters out `system.hp.max` (only recomputeHP can write)
- Filters out `system.derived.*` (only DerivedCalculator can write)
- Passes all other editable fields through normally
- HP recompute hooks automatically trigger when dependencies change

## Implementation Details

**File Modified:** `/sessions/adoring-clever-davinci/mnt/foundryvtt-swse/scripts/sheets/v2/character-sheet.js`

**Changes Made:**
1. Modified `_onSubmitForm()` method (line ~2354):
   - Added call to `this._filterProtectedFields(expanded)` before ActorEngine submission
   - Updated console logging to show filtering operation

2. Added new `_filterProtectedFields()` method (line ~2444):
   - Recursively identifies and removes protected fields
   - Logs which fields were filtered for debugging
   - Returns cleaned data for ActorEngine

**Expected Behavior:**
- Protected fields are silently filtered out (logged for transparency)
- All editable fields are submitted normally
- Hooks automatically trigger HP recalculation when dependencies change
- No governance violations in console
- Form persistence succeeds for all valid fields

## How to Verify the Fix

### Quick Verification (5 minutes)

1. Open any character sheet
2. Navigate to **Overview** tab
3. Edit HP **value** field (e.g., from 20 to 15)
4. Press **Tab**
5. Watch console for logs:
   ```
   [PERSISTENCE] ─── CHANGE EVENT FIRED ───
   [PERSISTENCE] Coerced form data: { "system.hp.value": 15 }
   [PERSISTENCE] Calling ActorEngine.updateActor with:
     - "system.hp.value"
     ✓ system.hp.max is NOT in the list (filtered out)
   [PERSISTENCE] ActorEngine.updateActor completed successfully ✓
   ```
6. Close sheet completely
7. Reopen sheet → HP value should be **15** (persisted) ✓

### Comprehensive Verification (Test Protocol)

Run the tests in this order:

**TEST SUITE A: Protected Field Filtering**
- Verify that `system.hp.max` is filtered when form collects it
- Verify that `system.derived.*` fields are filtered
- Verify other fields pass through normally

**TEST SUITE B: Form Persistence**
- Text field (actor.name)
- Numeric field (system.hp.value)
- Checkbox field (system.skills.X.trained)
- Textarea field (system.notes or biography)

**TEST SUITE C: HP Dependency Updates**
- Edit CON attribute → HP max should update (hook triggers recomputeHP)
- Edit level → HP max should update
- Edit HP bonus → HP max should update

**TEST SUITE D: Interaction Tests**
- Tab navigation still works
- Ability roll clicks still work
- Checkbox toggles still work
- Header buttons still work

## Console Log Format

When form is submitted, you should see logs like:

### If NO protected fields are present:
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "system.hp.value", inputValue: "15" }
[PERSISTENCE] Form found, calling _onSubmitForm
[PERSISTENCE] _onSubmitForm CALLED
[PERSISTENCE] Coerced form data (with types): { "system.hp.value": 15 }
[PERSISTENCE] Expanded form data: { system: { hp: { value: 15 } } }
[PERSISTENCE] Calling ActorEngine.updateActor with:
  - "system.hp.value"
[PERSISTENCE] ActorEngine.updateActor completed successfully ✓
```

### If protected fields ARE present (they get filtered):
```
[PERSISTENCE] Expanded form data: { system: { hp: { value: 15, max: 75 } } }
[PERSISTENCE] Protected fields filtered:
  - Filtering protected field (HP SSOT): system.hp.max
  - Note: These fields are recalculated via ActorEngine governance
[PERSISTENCE] Calling ActorEngine.updateActor with:
  - "system.hp.value"
  ✓ system.hp.max is NOT submitted
[PERSISTENCE] ActorEngine.updateActor completed successfully ✓
```

## Expected Test Results

After applying this fix and running the test protocol, you should see:

```
ROOT ELEMENT RESOLUTION:
  ✓ Form element is correctly detected on _onRender()
  ✓ activateListeners receives FORM element
  ✓ Form listeners attach on every render

FORM SUBMISSION CHAIN:
  ✓ Change events fire
  ✓ Form is found via closest() or querySelector()
  ✓ _onSubmitForm is called
  ✓ FormData is collected
  ✓ Data is coerced to correct types
  ✓ Protected fields are filtered
  ✓ Remaining fields are passed to ActorEngine ✓
  ✓ ActorEngine.updateActor completes successfully ✓

GOVERNANCE COMPLIANCE:
  ✓ No SSOT violations in console
  ✓ No governance errors
  ✓ Protected fields stay correct (recalculated by hooks)

PERSISTENCE:
  ✓ Editable fields persist after sheet close/reopen
  ✓ Protected fields are correct after sheet close/reopen
  ✓ HP max is auto-recalculated when dependencies change
```

## Key Points

1. **This is not a workaround** — it's the correct architectural pattern:
   - Forms collect user input for editable fields only
   - Protected fields are managed by governance layer
   - Hooks ensure consistency

2. **No user-facing changes** — the fix is transparent:
   - Users edit fields normally
   - Users don't see "protected field filtered" messages
   - Protected fields just work correctly

3. **Proper separation of concerns:**
   - Form layer: Collects user input for editable fields
   - Governance layer: Enforces SSOT constraints
   - Hook layer: Triggers recalculation when dependencies change

## Next Steps

1. Run the test protocol in `TEST-PERSISTENCE-WITH-GOVERNANCE.md`
2. Verify all persistence tests PASS
3. Verify all interaction tests PASS (no regressions)
4. Resume remaining stabilization work phases

## Files Referenced

- `/sessions/adoring-clever-davinci/mnt/foundryvtt-swse/scripts/sheets/v2/character-sheet.js` — Modified with filtering logic
- `/sessions/adoring-clever-davinci/mnt/foundryvtt-swse/TEST-PERSISTENCE-WITH-GOVERNANCE.md` — Comprehensive test protocol
- `/sessions/adoring-clever-davinci/mnt/foundryvtt-swse/GOVERNANCE-FIX-EXPLANATION.md` — Architecture explanation
