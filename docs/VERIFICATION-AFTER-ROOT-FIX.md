# VERIFICATION PROTOCOL: ROOT ELEMENT FIX

## CRITICAL TEST GATES

After the root element resolution fix, we need to verify:

1. **PERSISTENCE IS ACTUALLY RESTORED** (not incidentally working)
2. **OTHER LISTENERS STILL WORK** (root fix didn't break them)
3. **ROOT ELEMENT IS CONSISTENT** (not working by accident on some renders)
4. **NO REGRESSIONS INTRODUCED** (fix didn't create new problems)

---

## PART A: PERSISTENCE TESTS

### Test A1: Text Field Persistence

**Setup:**
1. Open character sheet
2. Open DevTools Console (F12)
3. Clear console (`clear()`)

**Action:**
1. Edit character **name** in header (top-left)
2. Type new value (e.g., `TEST-NAME-PERSISTENCE`)
3. Press **Tab** to lose focus

**Console Check:**
```
✓ [PERSISTENCE] ─── CHANGE EVENT FIRED ───
✓ [PERSISTENCE] Field changed: { inputName: "name", ... }
✓ [PERSISTENCE] Form found, calling _onSubmitForm
✓ [PERSISTENCE] _onSubmitForm CALLED
✓ [PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Persistence Check:**
1. Do NOT close console yet
2. **Close the sheet completely** (close button on window)
3. Wait 2 seconds
4. **Reopen the character sheet**
5. **Look at the name field** in header
   - **PASS:** Name still shows your test value
   - **FAIL:** Name reverted to original

**Report:** ✓ PASS / ✗ FAIL

---

### Test A2: Numeric Field Persistence

**Setup:**
1. Sheet still open
2. Navigate to **Overview** tab
3. Clear console

**Action:**
1. Find HP value input (shows current/max)
2. Edit the HP value
3. Type new number (e.g., `77`)
4. Press **Tab**

**Console Check:**
```
✓ [PERSISTENCE] ─── CHANGE EVENT FIRED ───
✓ [PERSISTENCE] Field changed: { inputName: "system.hp.value", inputValue: "77", ... }
✓ [PERSISTENCE] _onSubmitForm CALLED
✓ [PERSISTENCE] Coerced form data (with types): { "system.hp.value": 77, ... }  ← Number, not string!
✓ [PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Persistence Check:**
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen the character sheet
4. Go back to Overview tab
5. **Check HP field**
   - **PASS:** HP still shows 77
   - **FAIL:** HP reverted

**Report:** ✓ PASS / ✗ FAIL

---

### Test A3: Checkbox Field Persistence

**Setup:**
1. Sheet still open
2. Navigate to **Skills** tab
3. Clear console

**Action:**
1. Find Acrobatics skill row
2. Click the **Trained** checkbox
3. Toggle it (check if unchecked, uncheck if checked)

**Console Check:**
```
✓ [PERSISTENCE] ─── CHANGE EVENT FIRED ───
✓ [PERSISTENCE] Field changed: { inputName: "system.skills.acrobatics.trained", ... }
✓ [PERSISTENCE] _onSubmitForm CALLED
✓ [PERSISTENCE] Coerced form data (with types): { "system.skills.acrobatics.trained": true/false, ... }
✓ [PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Persistence Check:**
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen and go to Skills tab
4. **Check Acrobatics Trained checkbox**
   - **PASS:** Checkbox is in the same state you left it
   - **FAIL:** Checkbox reverted to previous state

**Report:** ✓ PASS / ✗ FAIL

---

### Test A4: Textarea Field Persistence

**Setup:**
1. Sheet still open
2. Navigate to **Notes** tab
3. Clear console

**Action:**
1. Click in notes textarea
2. Type test text (e.g., `PERSIST TEST 12345`)
3. Press **Tab**

**Console Check:**
```
✓ [PERSISTENCE] ─── CHANGE EVENT FIRED ───
✓ [PERSISTENCE] Field changed: { inputName: "system.notes", ... }
✓ [PERSISTENCE] _onSubmitForm CALLED
✓ [PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Persistence Check:**
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen and go to Notes tab
4. **Check notes textarea**
   - **PASS:** Your text is still there
   - **FAIL:** Notes are empty or show old text

**Report:** ✓ PASS / ✗ FAIL

---

## PART B: INTERACTION TESTS

Test that the root element fix didn't break other delegated listeners.

### Test B1: Ability Roll Click

**Action:**
1. Go to **Abilities** tab or **Overview**
2. Clear console
3. **Click on an ability score** (e.g., Strength number)
4. A dialog should appear

**Expected:**
- Click handler fires
- Roll dialog opens (or roll is computed)
- Console should show ability roll logs

**Check:** ✓ WORKS / ✗ BROKEN

---

### Test B2: Trained/Focus Toggle

**Action:**
1. Go to **Skills** tab
2. Find any skill
3. Click the **Trained** checkbox (on and off)
4. **Then click Focus** (if Trained is checked, Focus should enable)

**Expected:**
- Checkbox toggles visibly
- If you uncheck Trained, Focus should disable
- Change events fire
- Persistence works (from Test A3)

**Check:** ✓ WORKS / ✗ BROKEN

---

### Test B3: Tab Click Navigation

**Action:**
1. Click on different tab names (Abilities, Skills, Combat, Gear, Biography, etc.)
2. Each click should switch the visible content

**Expected:**
- Tabs switch immediately
- Content changes correctly
- No errors in console

**Check:** ✓ WORKS / ✗ BROKEN

---

### Test B4: Header Button (Chargen/Store/Mentor)

**Action:**
1. Look at the header buttons below the character name
2. Click **Store** button
3. A dialog/window should open

**Expected:**
- Store app opens
- No JavaScript errors
- Button interaction works correctly

**Check:** ✓ WORKS / ✗ BROKEN

---

## PART C: ROOT CONSISTENCY TEST

This verifies that `activateListeners()` is receiving a consistent, correct root on every render.

**What to Look For:**

In the console, look for logs showing what root element is passed to activateListeners:

```
[LIFECYCLE] _onRender calling activateListeners with root element:
{rootTag: 'FORM', rootClasses: '...', rootId: '', isForm: true}

[LIFECYCLE] activateListeners called with html element:
{htmlTag: 'FORM', htmlClasses: '...', signalExists: true}
```

**On First Render:**
- Root should be **FORM element** (`rootTag: 'FORM'`, `isForm: true`)
- Form should be connected (`isConnected: true`)

**On Rerender After Edit:**
1. Clear console
2. Edit a field (trigger a rerender)
3. Check the new logs:
   ```
   [LIFECYCLE] _onRender calling activateListeners with root element:
   {rootTag: 'FORM', ..., isForm: true}
   ```
   - Should still be FORM
   - Should have same classes
   - Should be connected

**On Rerender After Tab Change:**
1. Clear console
2. Click a different tab (if that triggers rerender)
3. Check logs again:
   ```
   [LIFECYCLE] _onRender calling activateListeners with root element:
   {rootTag: 'FORM', ..., isForm: true}
   ```
   - Should STILL be FORM (not BUTTON or other element)
   - Should be consistent

**Expected Pattern:**
```
RENDER #1: root = FORM ✓
RENDER #2: root = FORM ✓
RENDER #3: root = FORM ✓
```

**Check:** ✓ CONSISTENT / ✗ INCONSISTENT

---

## FINAL REPORT

After completing all tests, report:

### Persistence Results
```
Text field persistence:       ✓ PASS / ✗ FAIL
Numeric field persistence:    ✓ PASS / ✗ FAIL
Checkbox field persistence:   ✓ PASS / ✗ FAIL
Textarea field persistence:   ✓ PASS / ✗ FAIL

PERSISTENCE OVERALL:          ✓ WORKING / ✗ BROKEN
```

### Interaction Results
```
Ability roll click:           ✓ WORKS / ✗ BROKEN
Trained/Focus toggle:         ✓ WORKS / ✗ BROKEN
Tab click navigation:         ✓ WORKS / ✗ BROKEN
Header buttons:               ✓ WORKS / ✗ BROKEN

INTERACTIONS OVERALL:         ✓ OK / ✗ REGRESSION
```

### Root Consistency
```
First render root:            FORM / BUTTON / OTHER
Rerender after edit root:     FORM / BUTTON / OTHER
Rerender after tab root:      FORM / BUTTON / OTHER

ROOT CONSISTENCY:             ✓ CONSISTENT / ✗ INCONSISTENT
```

### Overall Status
```
READY FOR PRODUCTION:         ✓ YES / ✗ NO

If NO, which tests failed?
- ...

Which tests passed?
- ...

Any error messages in console?
- ...
```

---

## CRITICAL GATE

**Do NOT proceed with other stabilization work until:**
1. All 4 persistence tests **PASS**
2. All 4 interaction tests **WORK**
3. Root element is **CONSISTENT** across renders

If any test fails, report which one and copy the relevant console logs.
