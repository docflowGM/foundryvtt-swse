# BUTTON AUDIT — RUNTIME PROOF PASS

**Date:** 2026-03-22
**Audit Type:** Strict runtime evidence-based audit
**Status:** Framework ready, evidence pending user browser testing

---

## EXECUTIVE SUMMARY

This audit requires ACTUAL runtime testing. No code repairs have been made. All changes from previous pass have been REVERTED to original state.

**Current State:** Original codebase with static import of SWSETranslationEngine restored

**What This Audit Will Prove:**
1. ✅ Chargen button: Rendered? Hydrated? Clickable? Handler fires? Window opens?
2. ✅ Species screen: Hydrated correctly? Selection works? Next button transitions?
3. ✅ Intro controls: Continue button visible after animation? Clickable? Transitions?
4. ✅ Footer controls: Back/Next/Confirm responsive? State changes occur?
5. ✅ Step rail: Navigation buttons work? Jump-to-step function works?

---

## BUTTON INVENTORY TABLE — HIGH PRIORITY CLUSTERS

### CLUSTER 1: Chargen Launcher Entry Point

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| "Chargen" Header Button | Template: injected via hook; See `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` line 78 | `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` line 12 (`onClickChargen`) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] Open character sheet
- [ ] Verify "Chargen" button visible in header
- [ ] Right-click button, inspect element
- [ ] Verify `data-action="swse-chargen"` is present
- [ ] Verify button HTML matches template expectation
- [ ] Click button
- [ ] Monitor console: Should see logs starting with `[Chargen Hook]`, then `[Progression Entry]`
- [ ] Verify ProgressionShell window opens
- [ ] If no window opens: Check console for `Error:` messages
- [ ] If window opens but boot sequence fails: Check console for `[IntroStep.onStepEnter]`

---

### CLUSTER 2: Intro Boot Sequence Completion

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Intro Continue Button | `/templates/apps/progression-framework/steps/intro-work-surface.hbs` | `/scripts/apps/progression-framework/steps/intro-step.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Intro Skip Button | `/templates/apps/progression-framework/steps/intro-work-surface.hbs` | `/scripts/apps/progression-framework/steps/intro-step.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] Once ProgressionShell opens, monitor intro animation
- [ ] Boot sequence should show 6 phases: SYSTEMS CHECK, NETWORK SCAN, IDENTITY QUERY, IDENTITY UNKNOWN, OVERRIDE AUTHORIZED, TRANSLATING
- [ ] Watch for `[IntroStep.startIntroSequence] Entering phase X/6` logs
- [ ] When TRANSLATING phase starts, check if:
  - [ ] Animation plays (character-by-character reveal)
  - [ ] Animation stalls (engine failed to load)
  - [ ] Error appears in console
- [ ] After boot sequence completes, verify "Continue" button appears at bottom
- [ ] Click "Continue" button
- [ ] Verify button is actually clickable (not grayed out, not hidden, not covered)
- [ ] Monitor console for handler invocation
- [ ] Verify transition to next step (Species selection) occurs

---

### CLUSTER 3: Species Screen Hydration & Selection

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Species Selection Controls (radio/click targets) | `/templates/apps/progression-framework/steps/species-work-surface.hbs` | `/scripts/apps/progression-framework/steps/species-step.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Species "Next" Button | `/templates/apps/progression-framework/steps/species-work-surface.hbs` rendered in ProgressionShell footer | `/scripts/apps/progression-framework/shell/progression-shell.js` line 305 (`_onNextStep`) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] After intro completes and you click Continue, species screen should appear
- [ ] Inspect element on species cards/options
- [ ] Verify each species option has `data-action` attribute
- [ ] Check console for any hydration-related errors: `hydrate`, `selector`, `undefined`
- [ ] Try clicking on a species (e.g., "Human", "Twilek")
- [ ] Monitor console for `[SpeciesStep]` logs or action dispatch logs
- [ ] Verify the selected species is visually highlighted/changed
- [ ] Check that Next button becomes enabled (if conditional logic applies)
- [ ] Click "Next" button in footer
- [ ] Verify next step (Attributes or similar) appears
- [ ] If species selection doesn't work:
  - [ ] Check console for `selector mismatch` errors
  - [ ] Check if elements exist in DOM but are hidden (CSS issue)
  - [ ] Check if data-action value doesn't match action handler

---

### CLUSTER 4: Step Footer Controls (Next, Back, Confirm)

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| "Next" Button | `/templates/apps/progression-framework/progression-shell.hbs` footer | `/scripts/apps/progression-framework/shell/progression-shell.js` line 305 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| "Back" Button | `/templates/apps/progression-framework/progression-shell.hbs` footer | `/scripts/apps/progression-framework/shell/progression-shell.js` line 306 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| "Confirm" Button | `/templates/apps/progression-framework/progression-shell.hbs` footer | `/scripts/apps/progression-framework/shell/progression-shell.js` line 307 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] At each step, verify footer buttons are visible
- [ ] Inspect footer element, verify `data-action` is present
- [ ] For "Next": Click button, monitor console for `[ProgressionShell._onNextStep]` or equivalent
- [ ] Verify step changes (check if new step title appears)
- [ ] For "Back": Verify previous step is reached
- [ ] For "Confirm": Verify expected behavior (accept selection, progress to next mandatory step, etc.)
- [ ] If button doesn't respond:
  - [ ] Check CSS: Is button `display: none`, `opacity: 0`, `pointer-events: none`?
  - [ ] Check if button is `disabled` attribute
  - [ ] Check console for action dispatch errors
  - [ ] Check if event listener was destroyed by rerender

---

### CLUSTER 5: Step Rail Navigation

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Step Rail Chip (e.g., "Species", "Class") | `/templates/apps/progression-framework/progress-rail.hbs` | `/scripts/apps/progression-framework/shell/progression-shell.js` line 373 (`_onJumpStep`) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] In ProgressionShell, look at left sidebar step rail
- [ ] Completed steps should be clickable (not grayed out)
- [ ] Incomplete future steps should be grayed out/disabled
- [ ] Click on a previously completed step (e.g., "Species" if you've already selected one)
- [ ] Monitor console for `_onJumpStep` invocation
- [ ] Verify you jump back to that step
- [ ] Verify content of that step is correctly restored (selected values preserved)
- [ ] If step chip is not clickable:
  - [ ] Check if CSS makes it `pointer-events: none`
  - [ ] Check if data-action is missing
  - [ ] Check if handler method doesn't exist

---

### CLUSTER 6: Character Sheet (Non-Progression)

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Tab buttons (Abilities, Skills, Combat, etc.) | `/templates/actors/character/v2/character-sheet.hbs` | `/scripts/sheets/v2/character-sheet.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Action/Item Buttons in sheet | `/templates/actors/character/v2/partials/*.hbs` | Various | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] Open character sheet for a created character
- [ ] Click on various tabs (don't do this until after chargen completes)
- [ ] Verify tab content changes
- [ ] Check if buttons in panels (add item, delete, etc.) are responsive
- [ ] Click a few action buttons, verify they work

---

### CLUSTER 7: Level-Up Button Entry

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| "Level-Up" Header Button | Template: injected via hook; See `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` | `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] After completing chargen and creating character, open character sheet again
- [ ] "Chargen" button should now be hidden (character complete)
- [ ] "Level-Up" button should now be visible
- [ ] Click "Level-Up" button
- [ ] Verify ProgressionShell opens with level-up content
- [ ] Monitor console for progression entry

---

### CLUSTER 8: Mentor System

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Mentor Panel Toggle | ProgressionShell header | `/scripts/apps/progression-framework/shell/progression-shell.js` line 318 (`_onToggleMentor`) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Mentor Dialog Buttons | Mentor dialog window | `/scripts/apps/mentor/mentor-chat-dialog.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] During chargen, look for mentor panel in ProgressionShell
- [ ] Click mentor toggle button
- [ ] Verify mentor panel appears/disappears
- [ ] If mentor dialog appears, verify buttons in dialog are responsive
- [ ] Monitor console for mentor system logs

---

### CLUSTER 9: Store System

| Control / Selector / Label | Absolute File Path (Rendered) | Absolute File Path (Handler) | Rendered? | Hydrated? | Clickable? | Handler Invoked? | Behavior Completed? | Evidence | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Store Entry Button | Character sheet header (injected via hook) | `/scripts/infrastructure/hooks/store-sheet-hooks.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Store Category Buttons | `/templates/apps/store/store-card-grid.hbs` | `/scripts/apps/store/store-main.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |
| Purchase Buttons | Store product cards | `/scripts/apps/store/store-main.js` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Not tested | NOT_RUNTIME_TESTED |

**Evidence Required:**
- [ ] In character sheet, look for "Store" button
- [ ] Click Store button
- [ ] Verify store window opens
- [ ] Try clicking on product categories
- [ ] Try clicking purchase buttons
- [ ] Monitor console for store system logs

---

## RUNTIME TEST PROCEDURE

### Prerequisites
1. Hard refresh browser (Ctrl+F5 or Cmd+Shift+Delete)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Filter console by keyword "AUDIT" or look for any console output starting with `[`

### Test Sequence

**Step 1: Chargen Entry**
```
1. Open character sheet for incomplete character
2. Verify "Chargen" button visible
3. Click button
4. Watch console output
5. Check if ProgressionShell opens
6. If fails: Note exact error from console
```

**Step 2: Intro Sequence**
```
1. Watch boot sequence (6 phases)
2. Monitor for phase logs in console
3. Watch for translation phase (may show error if engine fails)
4. Wait for "Continue" button to appear
5. Verify button is clickable (not hidden/disabled)
6. Click "Continue"
7. Note any console errors
```

**Step 3: Species Selection**
```
1. Species screen should appear after intro
2. Try clicking on different species
3. Monitor console for action logs
4. Verify visual selection changes
5. Click "Next" button
6. Verify next step appears
```

**Step 4: All Remaining Steps**
```
1. For each step: Click Next → advance
2. For each step: Try Back → revert
3. For step rail: Click previous step → jump back
4. Monitor console for any errors
```

**Step 5: Character Completion**
```
1. Complete full chargen sequence
2. Verify character is created
3. Re-open character sheet
4. Verify "Chargen" button is hidden
5. Verify "Level-Up" button is visible
6. Click "Level-Up" button
7. Verify level-up progression opens
```

---

## CRITICAL OBSERVATIONS TO COLLECT

### If Chargen Button Doesn't Appear
- [ ] Is character incomplete? (Check: no class item, level 0, default name)
- [ ] Check console for `[Chargen Hook]` logs
- [ ] If no logs: Hook never fired (module chain failed)
- [ ] If logs exist but button not visible: CSS issue or hydration problem

### If ProgressionShell Opens But Boot Sequence Fails
- [ ] Check console for `[IntroStep.onStepEnter] CALLED`
- [ ] If missing: Step plugin never initialized (module chain failed)
- [ ] If present: Specific step issue

### If Species Selection Doesn't Work
- [ ] Check console for `selector mismatch` errors
- [ ] Inspect element on species card: Does it have `data-action`?
- [ ] Check CSS: Is element visible? (display, opacity, pointer-events)
- [ ] Check if DOM element exists but is zero-height or off-screen

### If Footer Buttons Don't Respond
- [ ] Check CSS: `display: none`? `opacity: 0`? `pointer-events: none`?
- [ ] Check if button has `disabled` attribute
- [ ] Try right-click → inspect: Verify `data-action` is present
- [ ] Check console for action dispatch errors

### If Module Chain Failed (Nothing Opens)
- [ ] Check console for error starting with `import` or `SyntaxError` or `TypeError`
- [ ] Check if any `[IntroStep]` logs appear at all
- [ ] If no logs: Module never loaded (static import failure)
- [ ] If logs present: Module loaded but specific handler/step failed

---

## CLASSIFICATION REFERENCE

| Classification | Meaning | Evidence Required |
|---|---|---|
| VERIFIED_WORKING | Control functions as designed, tested at runtime | Click succeeded + expected behavior occurred + console shows successful logs |
| VERIFIED_BROKEN | Control tested, confirmed non-functional | Click tested, handler not invoked OR wrong behavior occurred |
| PRESENT_BUT_DEAD | Control exists in DOM but doesn't respond | Element visible in inspector, click registered but no handler invocation |
| WIRED_BUT_UNREACHABLE | Handler/code exists but control cannot be accessed | Template/hook code exists, but control not rendered to DOM |
| VISUAL_ONLY | Control visible but has no actual function | Button appears but clicking does nothing, no error |
| NOT_RUNTIME_TESTED | Control not tested in browser yet | No click test performed, no runtime evidence collected |

---

## CRITICAL FINDINGS FRAMEWORK

**Will populate after runtime testing with:**
- Actual click results
- Console error messages
- Handler execution evidence
- Selector mismatch reports
- CSS/layout issues
- Module chain failures
- Hydration problems
- Render/rerender destruction of listeners

---

## NEXT STEPS FOR USER

1. **Hard refresh browser**
2. **Open DevTools Console**
3. **Follow test sequence above**
4. **Capture console output** (copy/paste relevant error messages)
5. **Report findings** in the format of the inventory table above
6. **Focus first on**: Chargen button → Intro sequence → Species selection

Once runtime evidence is collected, audit will be complete with actual proof for each classification.

