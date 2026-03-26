# PERSISTENCE TEST: GOVERNANCE-FILTERED FIELDS

## Overview

After implementing governance-aware field filtering in `_onSubmitForm()`, the form will now:
1. **Allow updates to HP-related fields that trigger recomputation**:
   - `system.hp.value` (current HP) ✓
   - `system.hp.bonus` (HP bonus) ✓
   - `system.attributes.con.*` (CON mod affects HP) ✓
   - `system.level` (level affects HP) ✓

2. **Filter out SSOT-protected fields that cannot be updated directly**:
   - `system.hp.max` → Only ActorEngine.recomputeHP() writes this ✗
   - `system.derived.*` → Only DerivedCalculator writes these ✗

3. **Trigger automatic HP recalculation via hooks** when dependencies change

## Test Protocol

### Setup
1. Open character sheet
2. Open DevTools Console (F12)
3. Clear console: `clear()`
4. Watch for `[PERSISTENCE]` logs during all tests

---

## TEST 1: HP Value Persistence (Should PASS)

**Action:**
1. Navigate to **Overview** tab
2. Find **HP** field (current/max display)
3. Edit the **value** (e.g., change 20 to 15)
4. Press **Tab** to trigger change

**Expected Console Logs:**
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "system.hp.value", inputValue: "15", ... }
[PERSISTENCE] Form found, calling _onSubmitForm
[PERSISTENCE] _onSubmitForm CALLED
[PERSISTENCE] Coerced form data (with types): { "system.hp.value": 15 }
[PERSISTENCE] Expanded form data: { system: { hp: { value: 15 } } }
[PERSISTENCE] Calling ActorEngine.updateActor
[PERSISTENCE] ActorEngine.updateActor completed successfully ✓
```

**Verification:**
1. Close sheet completely
2. Wait 2 seconds
3. Reopen sheet → HP value should be **15** (persisted) ✓

**Report:** PASS / FAIL

---

## TEST 2: HP Max Filtering (Should be FILTERED, then RECALCULATED)

**Action:**
1. Go to **Overview** tab
2. In console, manually set an invalid HP max value:
```javascript
// This simulates what form persistence would do if not filtered:
const form = document.querySelector("form.swse-character-sheet-form");
const hpMaxInput = form.querySelector('input[name="system.hp.max"]');
if (hpMaxInput) {
  hpMaxInput.value = "999";  // Intentionally wrong value
  hpMaxInput.dispatchEvent(new Event('change', { bubbles: true }));
}
```

**Expected Console Logs:**
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "system.hp.max", inputValue: "999" }
[PERSISTENCE] Coerced form data: { "system.hp.max": 999 }
[PERSISTENCE] Expanded form data: { system: { hp: { max: 999 } } }
[PERSISTENCE] Protected fields filtered:
  - Filtering protected field (HP SSOT): system.hp.max
  - Note: This field is recalculated via ActorEngine governance
[PERSISTENCE] No updatable data after filtering ⚠ (only had hp.max, nothing else)
```

**Verification:**
- Check that hp.max was **filtered out** and NOT submitted ✓
- HP max should remain at its **correct calculated value**, not 999 ✓
- Sheet should still be responsive (no errors) ✓

**Report:** PASS / FAIL

---

## TEST 3: HP Dependencies Update (Should trigger recomputation)

**Action:**
1. Go to **Abilities** tab
2. Find **CON** ability score
3. Edit the **base** value (e.g., from 10 to 12) — this will increase CON mod by 1
4. Press **Tab**

**Expected Console Logs:**
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "system.attributes.con.base", inputValue: "12" }
[PERSISTENCE] Coerced form data: { "system.attributes.con.base": 12 }
[PERSISTENCE] Expanded form data: { system: { attributes: { con: { base: 12 } } } }
[PERSISTENCE] Calling ActorEngine.updateActor
[PERSISTENCE] ActorEngine.updateActor completed successfully ✓
```

**Followed by HP recomputation (via hooks):**
```
[HP-RECOMPUTE-HOOK] Detected change that affects HP...
[HP-RECOMPUTE-HOOK] Calling ActorEngine.recomputeHP() for <actor>
... (recomputation math logs)
```

**Verification:**
1. Observe that CON was updated ✓
2. HP max should have **increased by 1-2 HP** (due to CON mod) ✓
3. Close and reopen sheet → CON and HP max both persisted ✓

**Report:** PASS / FAIL

---

## TEST 4: Checkbox Persistence with Governance (Should PASS)

**Action:**
1. Go to **Skills** tab
2. Find **Acrobatics** row
3. Click **Trained** checkbox
4. Observe console logs

**Expected Console Logs:**
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "system.skills.acrobatics.trained" }
[PERSISTENCE] Coerced form data: { "system.skills.acrobatics.trained": true }
[PERSISTENCE] Calling ActorEngine.updateActor
[PERSISTENCE] ActorEngine.updateActor completed successfully ✓
```

**Verification:**
1. No filtering should occur (skill fields are not protected) ✓
2. Close sheet → Reopen → Acrobatics trained state should be remembered ✓

**Report:** PASS / FAIL

---

## TEST 5: Multiple Fields with Mixed Protection

**Action:**
1. Go to **Overview** tab
2. Edit multiple fields:
   - HP value: 22
   - HP bonus: 5
   - Name: "TEST-MULTI"
3. Press **Tab** on the last field

**Expected Console Logs:**
```
[PERSISTENCE] Coerced form data: {
  "name": "TEST-MULTI",
  "system.hp.value": 22,
  "system.hp.bonus": 5,
  "system.hp.max": ... (if form includes it)
}
[PERSISTENCE] Expanded form data: { ... }
[PERSISTENCE] Protected fields filtered:
  - Filtering protected field (HP SSOT): system.hp.max  (if present)
[PERSISTENCE] Calling ActorEngine.updateActor with:
  - "name"
  - "system.hp.value"
  - "system.hp.bonus"
  ✓ system.hp.max is NOT in the list
```

**Verification:**
1. All updatable fields were submitted (name, hp.value, hp.bonus) ✓
2. Protected field (hp.max) was filtered out ✓
3. HP max gets recalculated correctly ✓
4. Close/reopen → all updatable values persist ✓

**Report:** PASS / FAIL

---

## Summary Checklist

After running all 5 tests, verify:

```
☐ TEST 1 (HP Value):            PASS
☐ TEST 2 (HP Max Filtering):     PASS
☐ TEST 3 (HP Dependencies):      PASS
☐ TEST 4 (Checkbox):             PASS
☐ TEST 5 (Mixed Fields):         PASS

Overall Governance Filtering:     WORKING / BROKEN
Persistence Chain:               WORKING / BROKEN
HP Recalculation:                WORKING / BROKEN
```

## Expected Outcome

After governance-aware filtering is applied:
- ✅ Form persistence should work for all editable fields
- ✅ Protected fields are silently filtered, not submitted
- ✅ HP max is automatically recalculated by hooks when dependencies change
- ✅ No governance errors should appear in console
- ✅ All values persist correctly after sheet close/reopen

If any test fails, check:
1. Are `[PERSISTENCE]` logs appearing?
2. Are protected fields being filtered? (look for "Protected fields filtered" log)
3. Are there JavaScript errors in console?
4. Is ActorEngine.updateActor completing successfully?
