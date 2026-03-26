# PERSISTENCE CHAIN DIAGNOSTIC TEST

## How to Run This Test

1. **Open the character sheet** (normal character, not NPC/droid)
2. **Open browser DevTools** (F12)
3. **Go to Console tab**
4. **Clear console** (`clear()`)
5. **Follow the test steps below and watch the console output**

---

## EXPECTED LOG OUTPUT SEQUENCE

When you edit a field and trigger the change event, you should see logs appear in THIS order:

### STEP 1: Change Event Fires
```
[PERSISTENCE] ─── CHANGE EVENT FIRED ───
[PERSISTENCE] Field changed: { inputName: "...", inputValue: "...", inputType: "..." }
[PERSISTENCE] Attempting to find form via input.closest("form")
[PERSISTENCE] Result: { found: true, formTag: "FORM", formClass: "swse-character-sheet-form" }
```

**STOP HERE IF:** "found: false" - means form is not a parent of the input

### STEP 2: Call _onSubmitForm
```
[PERSISTENCE] Form found, calling _onSubmitForm with: { formTag: "FORM", formClass: "swse-character-sheet-form", isConnected: true }
```

**STOP HERE IF:** "isConnected: false" - means form is not in the DOM

### STEP 3: _onSubmitForm Execution
```
[PERSISTENCE] ════════════════════════════════════════
[PERSISTENCE] _onSubmitForm CALLED
[PERSISTENCE] Event: { type: "submit", target: "FORM", targetClass: "swse-character-sheet-form" }
[PERSISTENCE] Prevented default
[PERSISTENCE] Form to submit: { tag: "FORM", class: "swse-character-sheet-form", isConnected: true, childCount: 1 }
[PERSISTENCE] Collecting FormData from form
[PERSISTENCE] FormData created successfully
[PERSISTENCE] FormData entries count: ...
[PERSISTENCE] Raw form data (strings): { ... }
```

**STOP HERE IF:** Any "Failed to..." message - means FormData creation failed

### STEP 4: Data Coercion
```
[PERSISTENCE] _coerceFormData called with ... fields
[PERSISTENCE] Coerced fieldName: "value" → ... (numeric|boolean|string)
[PERSISTENCE] _coerceFormData returning ... coerced fields
[PERSISTENCE] Coerced form data (with types): { ... }
```

### STEP 5: Expand and Submit
```
[PERSISTENCE] Expanded form data: { ... }
[PERSISTENCE] Calling ActorEngine.updateActor with: { actorName: "...", actorId: "...", expandedKeys: [...] }
[PERSISTENCE] ActorEngine.updateActor completed successfully
[PERSISTENCE] ════════════════════════════════════════
```

**SUCCESS IF:** All steps complete without errors and you see "completed successfully"

---

## TEST PROCEDURE

### Test 1: Text Field (actor.name)

1. **Clear console** (`clear()`)
2. **Edit the character name** in the sheet header (top-left)
3. **Type a new name** (e.g., `TEST-NAME`)
4. **Press Tab** to lose focus (triggers change event)
5. **Check console output:**
   - Do you see `[PERSISTENCE] ─── CHANGE EVENT FIRED ───`?
   - Do you see `[PERSISTENCE] Form found, calling _onSubmitForm`?
   - Do you see `[PERSISTENCE] ActorEngine.updateActor completed successfully`?

**Recording:**
- Log all console messages starting from CHANGE EVENT through completion
- Note where the chain breaks (if it does)

---

### Test 2: Numeric Field (system.hp.value)

1. **Switch to Overview tab** (if not already there)
2. **Clear console** (`clear()`)
3. **Edit HP value** (find the HP input showing current/max)
4. **Type a new number** (e.g., `42`)
5. **Press Tab**
6. **Check console output** - same as Test 1

**Recording:**
- Note if logs appear in same order and sequence
- Note any differences from Test 1

---

### Test 3: Checkbox (system.skills.acrobatics.trained)

1. **Switch to Skills tab**
2. **Clear console** (`clear()`)
3. **Find Acrobatics row**
4. **Click Trained checkbox**
5. **Check console output** - same as Test 1

**Recording:**
- Check if checkbox trigger produces same log sequence
- Note if anything is different

---

## FAILURE DIAGNOSTIC POINTS

If the chain breaks, look for the first point where logs STOP appearing:

### If logs stop after "CHANGE EVENT FIRED"
→ The change event listener is firing, but form is not being found
→ Check: Is form a parent of the input?

### If logs stop after "Form found, calling _onSubmitForm"
→ _onSubmitForm is being called, but not executing
→ Check: Is there a JavaScript error?
→ Check: Is `_onSubmitForm` method even defined?

### If logs stop after "_onSubmitForm CALLED"
→ The method is running, but failing during form collection
→ Check: Is the form still in the DOM? (`isConnected: true/false`)
→ Check: Browser error messages

### If logs stop after "FormData created successfully"
→ FormData was collected, but coercion failed
→ Check: Browser error messages
→ Check: Does `_coerceFormData` exist?

### If logs stop after "Coerced form data"
→ Data was coerced, but expandObject or ActorEngine failed
→ Check: Browser error messages
→ Check: Is `ActorEngine` available?

---

## WHAT TO REPORT BACK

After running all 3 tests, provide:

1. **Did Test 1 (text field) complete all steps?** YES / NO
   - If NO, where did it stop?

2. **Did Test 2 (numeric field) complete all steps?** YES / NO
   - If NO, where did it stop?

3. **Did Test 3 (checkbox) complete all steps?** YES / NO
   - If NO, where did it stop?

4. **Copy/paste the FIRST failing log sequence** (from where it breaks)

5. **Any JavaScript errors in console?** YES / NO
   - If YES, copy the error message

6. **Do all three tests show identical log patterns?** YES / NO
   - If NO, what's different?

---

## ACTIVATION TEST (Before Field Edit)

Before editing any fields, check that the form listener was even attached:

1. **Open the sheet**
2. **Open DevTools Console immediately**
3. **Look for these logs in the console:**
   ```
   [LIFECYCLE] activateListeners called with html element: { ... }
   [LIFECYCLE] Searching for form using html.closest("form")
   [LIFECYCLE] Form found, attaching submit listener
   [LIFECYCLE] Submit listener attached successfully
   ```

**CRITICAL:** If you DON'T see these logs, the listener was never attached in the first place.

---

## NOTES

- **Each test should be independent** - clear console between tests
- **Watch the FULL log sequence** - don't just look for the final log
- **Note EXACTLY where it stops** - that's the broken link
- **Copy any error messages exactly** - they will reveal the root cause

Once we see WHERE the chain breaks, we can fix it with precision.
