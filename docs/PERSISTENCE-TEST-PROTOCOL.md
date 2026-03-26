# PERSISTENCE TEST PROTOCOL

## Pre-Test Checklist

- [ ] Character sheet is OPEN
- [ ] Browser DevTools Console is OPEN (F12)
- [ ] Console is CLEAR (type `clear()`)
- [ ] No other sheets are open
- [ ] Sheet has fully rendered (wait 2-3 seconds after opening)

---

## TEST 1: TEXT FIELD (actor.name)

### Setup
1. Locate the character name input in the sheet header (top-left, large text box)
2. Note the current name

### Action
1. Click in the name field
2. Clear it and type a test name: `TEST-${timestamp}` (e.g., `TEST-1711270450`)
3. Press **Tab** (to lose focus and trigger change event) OR **Enter** (to trigger submit)

### Expected Results

**In Console, you should see (in this order):**
```
[PERSISTENCE] Field changed: { inputName: "name", inputValue: "TEST-1711270450", inputType: "text" }
[PERSISTENCE] Form submit event FIRED - preventing native submit
[PERSISTENCE] _onSubmitForm called
[PERSISTENCE] Raw form data (strings): { name: "TEST-1711270450", ... }
[PERSISTENCE] Coerced form data (with types): { name: "TEST-1711270450", ... }
[PERSISTENCE] Expanded form data: { name: "TEST-1711270450", ... }
[PERSISTENCE] Calling ActorEngine.updateActor with: { actorName: "...", actorId: "...", expandedKeys: ["name"] }
[PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Visual Checks:**
- [ ] No page refresh occurs (console and sheet stay visible)
- [ ] Sheet remains in same state
- [ ] No error notifications appear

### Persistence Check
1. **Do NOT close the sheet yet**
2. Close the browser Developer Tools
3. Close the character sheet completely (close button on window)
4. Wait 2 seconds
5. Reopen the character sheet
6. **Check:** Is the name still showing your test value?
   - [ ] **YES** - PASSED
   - [ ] **NO** - FAILED

---

## TEST 2: NUMERIC FIELD (system.hp.value)

### Setup
1. Make sure you're on the **Overview** tab
2. Look for the HP display (should show "X / Y" where X is current, Y is max)
3. Note the current HP value

### Action
1. Click on the HP current value field
2. Enter a test number (e.g., `42`)
3. Press **Tab** OR **Enter**

### Expected Results

**In Console, you should see:**
```
[PERSISTENCE] Field changed: { inputName: "system.hp.value", inputValue: "42", inputType: "number" }
[PERSISTENCE] Form submit event FIRED - preventing native submit
[PERSISTENCE] _onSubmitForm called
[PERSISTENCE] Raw form data (strings): { "system.hp.value": "42", ... }
[PERSISTENCE] Coerced form data (with types): { "system.hp.value": 42, ... }  ← NOTE: coerced to NUMBER
[PERSISTENCE] Expanded form data: { system: { hp: { value: 42 } } }
[PERSISTENCE] Calling ActorEngine.updateActor with: { actorName: "...", actorId: "...", expandedKeys: ["system.hp.value"] }
[PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Visual Checks:**
- [ ] No page refresh
- [ ] Sheet stays open
- [ ] HP field still shows your test value (42)

### Persistence Check
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen the character sheet
4. **Check:** Does HP still show 42?
   - [ ] **YES** - PASSED
   - [ ] **NO** - FAILED

---

## TEST 3: CHECKBOX FIELD (system.skills.acrobatics.trained)

### Setup
1. Navigate to the **Skills** tab
2. Find the Acrobatics row
3. Note the current state of the "Trained" checkbox (checked or unchecked)

### Action
1. Click the "Trained" checkbox next to Acrobatics
2. It should toggle (checked → unchecked or vice versa)

### Expected Results

**In Console, you should see:**
```
[PERSISTENCE] Field changed: { inputName: "system.skills.acrobatics.trained", inputValue: "true" (or "false"), inputType: "checkbox" }
[PERSISTENCE] Form submit event FIRED - preventing native submit
[PERSISTENCE] _onSubmitForm called
[PERSISTENCE] Raw form data (strings): { "system.skills.acrobatics.trained": "true", ... }
[PERSISTENCE] Coerced form data (with types): { "system.skills.acrobatics.trained": true, ... }  ← NOTE: coerced to BOOLEAN
[PERSISTENCE] Expanded form data: { system: { skills: { acrobatics: { trained: true } } } }
[PERSISTENCE] Calling ActorEngine.updateActor with: { ... expandedKeys: ["system.skills.acrobatics.trained"] }
[PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Visual Checks:**
- [ ] No page refresh
- [ ] Checkbox visual state changed

### Persistence Check
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen and navigate back to Skills tab
4. **Check:** Is the Acrobatics Trained checkbox in the same state you left it?
   - [ ] **YES** - PASSED
   - [ ] **NO** - FAILED

---

## TEST 4: TEXTAREA FIELD (system.notes)

### Setup
1. Navigate to the **Notes** tab
2. Note the current notes (if any)

### Action
1. Click in the notes textarea
2. Type a test message: `Test at ${timestamp}`
3. Press **Tab** to lose focus (triggers change event)

### Expected Results

**In Console, you should see:**
```
[PERSISTENCE] Field changed: { inputName: "system.notes", inputValue: "Test at 1711270450", inputType: "textarea" }
[PERSISTENCE] Form submit event FIRED - preventing native submit
[PERSISTENCE] _onSubmitForm called
[PERSISTENCE] Raw form data (strings): { "system.notes": "Test at 1711270450", ... }
[PERSISTENCE] Coerced form data (with types): { "system.notes": "Test at 1711270450", ... }
[PERSISTENCE] Expanded form data: { system: { notes: "Test at 1711270450" } }
[PERSISTENCE] Calling ActorEngine.updateActor with: { ... expandedKeys: ["system.notes"] }
[PERSISTENCE] ActorEngine.updateActor completed successfully
```

**Visual Checks:**
- [ ] No page refresh
- [ ] Textarea shows your text

### Persistence Check
1. Close the sheet completely
2. Wait 2 seconds
3. Reopen and navigate to Notes tab
4. **Check:** Does the notes textarea still contain your test text?
   - [ ] **YES** - PASSED
   - [ ] **NO** - FAILED

---

## DUPLICATE LISTENER CHECK

### What to Look For

**Each time you edit a field, you should see the log:**
```
[PERSISTENCE] Field changed: ...
[PERSISTENCE] Form submit event FIRED - preventing native submit
```

**Appearing EXACTLY ONCE per field edit.**

If you see it appearing **MULTIPLE TIMES** for a single field edit, there is a duplicate listener issue.

### How to Check

1. Edit a field (e.g., change the name again)
2. Look at the console
3. Count how many times you see `[PERSISTENCE] Form submit event FIRED`
   - [ ] Appears 1 time = Good (no duplicates)
   - [ ] Appears 2+ times = BAD (duplicate listeners)

---

## FINAL REPORT

After running all 4 tests and the duplicate listener check, report:

### Summary
```
TEXT FIELD PERSISTENCE:       [ ] PASSED  [ ] FAILED
NUMERIC FIELD PERSISTENCE:    [ ] PASSED  [ ] FAILED
CHECKBOX FIELD PERSISTENCE:   [ ] PASSED  [ ] FAILED
TEXTAREA FIELD PERSISTENCE:   [ ] PASSED  [ ] FAILED

DUPLICATE LISTENER RISK:      [ ] NONE (logs appear once)
                              [ ] POSSIBLE (logs appear multiple times)

OVERALL STATUS:               [ ] READY FOR PRODUCTION
                              [ ] NEEDS INVESTIGATION
```

### If Any Test Failed

1. Check the console for error messages
2. Verify the field name is correct (use Inspector to check `name=` attribute)
3. Verify you're in the correct tab for the field
4. Look for any JavaScript errors in the console

---

## Additional Notes

- If a field doesn't exist (e.g., Skills tab not visible), skip that test
- All tests should show NO PAGE REFRESH
- All tests should show the [PERSISTENCE] logs
- After close/reopen, values should persist

---

**Created:** 2026-03-24
**Purpose:** Verify form persistence pipeline is fully restored
