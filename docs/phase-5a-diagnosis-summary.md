# Phase 5A — Zero-Effect Diagnosis Summary

**Based on Repo Inspection Alone (Before Runtime Testing)**

---

## MOST LIKELY ROOT CAUSE: **SELECTOR_MISMATCH** (60% probability)

### Why This Is Most Likely

1. **Zero visible change** is usually caused by rules not matching, not by rules being overridden
   - If a rule was being overridden, you'd typically see *some* effect
   - Zero effect = rule is not applying at all

2. **Complex nested selector chain** increases mismatch risk
   - `.application.swse-character-sheet > .window-content > form.swse-character-sheet-form`
   - This requires exact class names at exact positions
   - Any missing class, extra class, or structural variation breaks the chain

3. **The wrapper div** (`.swse-character-sheet-wrapper`) is a risk point
   - It's a transparent `display: contents` div
   - It must have NO unexpected classes
   - It must be the DIRECT parent of form

4. **Form selector variants** in v2-sheet.css
   - Lines 74-83 use two different selectors for the same element:
     ```css
     .application.swse-character-sheet > .window-content > form.swse-character-sheet-form,
     .application.swse.sheet.actor.character > .window-content > form.swse-character-sheet-form
     ```
   - If neither selector matches, rules don't apply
   - This suggests uncertainty about the actual selector chain

---

## SECONDARY RISK: **WRONG_SHEET_PATH** (20% probability)

### Why This Could Be It

1. **Phase 4 repairs were created for "normal character sheet"**
   - But at runtime, a **different sheet class** might be rendering
   - Example: NPC sheet, Droid sheet, legacy V3 architecture

2. **Specific CSS exists for other sheet types:**
   - `styles/sheets/v2-npc-specific.css` ← exists
   - `styles/sheets/v2-droid-specific.css` ← exists

3. **If wrong sheet is open**, the selectors would NOT match:
   - NPC sheet might use `.swse-npc-sheet` instead of `.swse-character-sheet`
   - Or different class structure entirely

### Test: Before running probes, verify:
```javascript
const app = ui.windows[Object.keys(ui.windows)[0]];
console.log('Sheet class:', app?.constructor?.name);
console.log('Actor type:', app?.actor?.type);
// Expected: SWSEV2CharacterSheet + character (not npc, droid)
```

---

## TERTIARY RISK: **STALE_ASSET** (10% probability)

### Why This Could Be It

1. **Phase 4 rules were applied to the file**, but:
   - Browser cache is serving **old v2-sheet.css** without Phase 4 changes
   - OR Foundry dev server is caching old asset

2. **Typical indicator:**
   - Probes added to v2-sheet.css remain invisible
   - But hard refresh (Ctrl+Shift+R) makes them appear
   - Then Phase 4 rules also appear

3. **Less likely because:**
   - It would affect all users equally (usually)
   - But it's possible in local development

---

## LOWER RISK: **OVERRIDDEN_AT_RUNTIME** (7% probability)

### Why This Is Less Likely

1. **No known override sources:**
   - `character-sheet.css` is **NOT loaded** (not in system.json)
   - `character-sheet-overflow-contract.css` only touches inner panels, not form/body
   - No inline styles in template
   - No dynamic CSS injection detected in code

2. **If overridden, we'd expect:**
   - Probes to be VISIBLE but still not work
   - OR to see multiple competing scroll owners
   - Neither typical of "zero effect"

3. **Possible only if:**
   - A file was recently added and not committed
   - OR a dynamic script is overwriting styles at runtime
   - OR a different V3/legacy sheet is being loaded

---

## MINIMUM RISK: **NOT_LOADED** (3% probability)

### Why This Is Unlikely

1. **system.json explicitly lists v2-sheet.css** as first in styles array
2. **No syntax errors** detected in CSS (file parses correctly)
3. **File exists and is readable** (verified at `/styles/sheets/v2-sheet.css`)
4. **Only way this happens:**
   - system.json is outdated in deployment vs repo
   - OR Foundry filtering out the file for some reason

---

## WHAT TO TEST FIRST (Priority Order)

### 1️⃣ **RUN THE MAGENTA OUTLINE PROBE** (5 seconds)
```javascript
// Add probe rules to v2-sheet.css, reload, check visually
```

**IF magenta outline is VISIBLE:**
- → Selector IS matching
- → File IS loaded
- → Problem is **OVERRIDDEN_AT_RUNTIME**
- → Move to Task 5 (inspect Styles panel for winning rules)

**IF magenta outline is INVISIBLE:**
- → Selector is NOT matching OR file not loaded
- → Could be **SELECTOR_MISMATCH** or **WRONG_SHEET_PATH**
- → Continue to next tests

---

### 2️⃣ **VERIFY SHEET IDENTITY** (10 seconds)
```javascript
const app = ui.windows[Object.keys(ui.windows)[0]];
console.log('Sheet class:', app?.constructor?.name);
console.log('Actor type:', app?.actor?.type);
```

**IF NOT `SWSEV2CharacterSheet` or `actor.type !== 'character'`:**
- → Problem is **WRONG_SHEET_PATH**
- → Test with a player character, not NPC/Droid

**IF correct sheet class:**
- → Problem is **SELECTOR_MISMATCH** or **STALE_ASSET**
- → Continue to next test

---

### 3️⃣ **HARD RELOAD AND RE-TEST PROBES** (10 seconds)
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
Reopen character sheet
Check if magenta outline now appears
```

**IF probes appear after hard reload:**
- → Problem was **STALE_ASSET**
- → Clear browser cache regularly or adjust cache headers

**IF probes still invisible:**
- → Problem is **SELECTOR_MISMATCH**
- → Inspect actual DOM structure vs expected selectors

---

### 4️⃣ **INSPECT ACTUAL DOM CHAIN** (20 seconds)
```javascript
// Run Command 1.1 and 1.2 from DevTools commands doc
// Verify each element exists with expected classes
```

**IF any element is missing or has different classes:**
- → Problem is **SELECTOR_MISMATCH**
- → Document the actual vs expected structure
- → Phase 6 will update selectors to match

**IF all elements present with correct classes:**
- → Very likely **OVERRIDDEN_AT_RUNTIME** or **STALE_ASSET**
- → Check v2-sheet.css in Sources tab for Phase 4 changes

---

## MOST ACTIONABLE HYPOTHESIS

If I had to bet right now (based on repo inspection alone):

> **The Phase 4 selectors are probably correct, but one or more of these is true:**
> 1. **A selector variant is not matching** the actual DOM (50% likely)
> 2. **The wrong sheet class is being tested** (npc/droid instead of character) (20% likely)
> 3. **Browser cache is serving stale CSS** (15% likely)
> 4. **A later CSS rule is winning** but only slightly (10% likely)
> 5. **A recent code change broke the selector chain** (5% likely)

---

## NEXT STEP: ADD PROBES AND TEST

Do NOT overthink this. The Magenta Outline Probe will answer 80% of the questions in 5 seconds.

**Then follow the decision tree above based on what you see.**

---

## Phase 5A Expected Timeline

- ✅ Add probe rules: 1 minute
- ✅ Reload and check visually: 1 minute
- ✅ Run DOM verification command: 2 minutes
- ✅ Run sheet identity command: 1 minute
- ✅ Run hard reload test: 2 minutes
- ✅ Inspect winning rules (if needed): 5 minutes
- ✅ Fill in audit report: 10 minutes
- **Total: 22 minutes to root cause**

---

## Key Insight

> **Zero visible effect almost always means "the rule is not matching or not loading", not "the rule is being overridden".**
>
> If a rule matched but lost to another rule, you'd see *some* effect from both the rule and its override.
>
> So: **Probes first. Specificity second. Override third.**
