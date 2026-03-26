# CHARGEN/LEVEL-UP LAUNCH CHAIN AUDIT

**Audit Date:** March 22, 2026
**System:** SWSE Foundry V13
**Scope:** Character sheet → Chargen/Level-Up progression launch
**Status:** AUDIT COMPLETE - INSTRUMENTATION ADDED

---

## 1. EXECUTIVE SUMMARY

This audit traces the complete launch chain from button click to app initialization for both "Chargen" and "Level Up" buttons on the character sheet.

**Key Finding:** The system has TWO separate button implementations:
1. **Hardcoded Template Buttons** in character sheet template (`data-action="cmd-chargen"` / `cmd-levelup`)
2. **Header Control Hook Buttons** created by `getHeaderControlsApplicationV2` hooks (`swse-chargen` / `swse-levelup`)

**TEMP AUDIT INSTRUMENTATION** has been added at all critical stages to verify:
- Hook registration and firing
- Button click handling
- Handler execution
- launchProgression() entry and progression
- Shell instantiation and rendering

**To Run Audit:** Open Foundry, open character sheet, click Chargen or Level Up button, check browser console for `[TEMP AUDIT]` logs.

---

## 2. CLICK-TO-OPEN LAUNCH MAP

### Stage 1: Button Rendering (Template)
**File:** `/systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs`
**Lines:** 23-27
**Implementation:**
```handlebars
{{#if isLevel0}}
  <button type="button" data-action="cmd-chargen" class="header-btn">Chargen</button>
{{else}}
  <button type="button" data-action="cmd-levelup" class="header-btn">Level Up</button>
{{/if}}
```
**Expected Behavior:** Render one of these buttons based on actor level
**Runtime Evidence:** UNVERIFIED - need console logs during sheet render

### Stage 2: Button Rendering (Header Controls via Hook)
**File:** `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js`
**Lines:** 59-92
**Function:** `registerChargenSheetHooks()`
**Hook:** `getHeaderControlsApplicationV2`
**Implementation:**
- Hook listener registered with HooksRegistry
- Hook callback pushes control object with handler to `controls` array
- Handler: `() => onClickChargen(app)`
- Action: `swse-chargen`
- Label: `Chargen`

**Same for Level-Up:**
**File:** `/systems/foundryvtt-swse/scripts/infrastructure/hooks/levelup-sheet-hooks.js`
**Lines:** 98-130
**Expected Behavior:** When sheet renders, Foundry calls `getHeaderControlsApplicationV2` hook with app and controls array. Hook mutates controls array by pushing new control objects. Foundry then renders these controls as header buttons.

**TEMP AUDIT LOGS ADDED:**
- Hook callback entry: `[TEMP AUDIT] getHeaderControlsApplicationV2 fired for chargen`
- App class logged: `[TEMP AUDIT] App class: {className}`
- Controls array before/after mutation
- Handler closure wrapping to log execution

### Stage 3: Hook Registration & Activation
**File:** `/systems/foundryvtt-swse/scripts/infrastructure/hooks/init-hooks.js`
**Lines:** 24-54
**Function:** `registerInitHooks()`
**Called From:** `/systems/foundryvtt-swse/index.js` line 281 during `init` hook

**Sequence:**
1. `registerUIHooks()` called (line 30)
2. Inside `registerUIHooks()`: `registerLevelUpSheetHooks()` and `registerChargenSheetHooks()` called
3. `HooksRegistry.activateAll()` called (line 33)
4. All registered hook handlers are passed to `Hooks.on()` to Foundry

**TEMP AUDIT:** HooksRegistry already logs when hooks are activated.

### Stage 4: Click Event & Sheet Listener
**File:** `/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet.js`
**Lines:** 1046-1058 (template buttons) / 1053-1058 (levelup)
**Method:** `_onRender()` (inferred from context)
**Implementation:**
```javascript
html.querySelectorAll('[data-action="cmd-chargen"]').forEach(button => {
  button.addEventListener("click", async ev => {
    ev.preventDefault();
    await launchProgression(this.actor);
  }, { signal });
});
```

**Expected Behavior:**
1. Sheet renders
2. `_onRender()` hook runs
3. Click listeners attached to template buttons
4. User clicks button
5. Event listener fires
6. `launchProgression(this.actor)` called with AbortSignal context

**TEMP AUDIT LOGS ADDED:**
- Chargen buttons found: `[TEMP AUDIT] Found chargen buttons in sheet HTML: {count}`
- Levelup buttons found: `[TEMP AUDIT] Found levelup buttons in sheet HTML: {count}`
- Click listener attached for each button
- Click event: `[TEMP AUDIT] Chargen button clicked via sheet listener`
- Click event: `[TEMP AUDIT] LevelUp button clicked via sheet listener`

### Stage 5: launchProgression() Entry
**File:** `/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js`
**Lines:** 31-92
**Function:** `export async function launchProgression(actor, options = {})`
**Behavior:**
1. Validates actor exists
2. Minimizes actor sheet if rendered
3. Closes mentor-notes app if open
4. Imports ChargenShell module (dynamic import)
5. Calls `ChargenShell.open(actor, options)`
6. Returns promise

**TEMP AUDIT LOGS ADDED:**
- Entry: `[TEMP AUDIT] launchProgression called with actor: {name}, {type}`
- Before import: `[TEMP AUDIT] Importing ChargenShell...`
- After import: `[TEMP AUDIT] ChargenShell imported successfully: {class name}`
- Before shell.open: `[TEMP AUDIT] Calling ChargenShell.open()`
- Catch block: `[TEMP AUDIT] launchProgression caught exception: {error}`

### Stage 6: ChargenShell.open()
**File:** `/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js`
**Lines:** 35-41
**Method:** `static async open(actor, options = {})`
**Implementation:**
```javascript
return ProgressionShell.open.call(this, actor, 'chargen', options);
```

**Purpose:** Preserve subclass dispatch so ChargenShell instance is created instead of base ProgressionShell

**TEMP AUDIT LOGS ADDED:**
- Entry: `[TEMP AUDIT] ChargenShell.open called for actor: {name}, {type}`

### Stage 7: ProgressionShell.open()
**File:** `/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js`
**Lines:** 127-163
**Method:** `static async open(actor, mode = 'chargen', options = {})`
**Sequence:**
1. Create app instance: `const app = new this(actor, mode, options);`
2. Initialize steps: `await app._initializeSteps();`
3. Initialize first step: `await app._initializeFirstStep();`
4. Render: `app.render({ force: true });`
5. Bring to top: `app.bringToTop();`
6. Return app promise

**TEMP AUDIT LOGS ADDED:**
- Entry: `[TEMP AUDIT] ProgressionShell.open called: { actor: {name}, mode, this: {className} }`
- Before constructor: `[TEMP AUDIT] Creating app instance of class: {className}`
- After constructor: `[TEMP AUDIT] App instance created: {className}`
- Before _initializeSteps: `[TEMP AUDIT] Calling _initializeSteps...`
- After _initializeSteps: `[TEMP AUDIT] Steps initialized, count: {count}`
- Before _initializeFirstStep: `[TEMP AUDIT] Calling _initializeFirstStep...`
- After _initializeFirstStep: `[TEMP AUDIT] First step initialized`
- Before render: `[TEMP AUDIT] Calling app.render()...`
- After render: `[TEMP AUDIT] Render called on app`

---

## 3. BUTTON INVENTORY

| Button | Where Rendered | How Bound | Click Handler | Launch Function | Runtime Status | Evidence | Notes |
|--------|-----------------|-----------|--------------|-----------------|-----------------|----------|-------|
| Chargen (Template) | `/templates/.../character-sheet.hbs` line 24 | Event listener in `_onRender()` (line 1046) | `launchProgression(this.actor)` | `launchProgression()` | UNVERIFIED | Check console for: Found chargen buttons in sheet HTML, Chargen button clicked | Rendered when `isLevel0 === true`. Binding happens during sheet render phase. |
| Level Up (Template) | `/templates/.../character-sheet.hbs` line 26 | Event listener in `_onRender()` (line 1053) | `launchProgression(this.actor)` | `launchProgression()` | UNVERIFIED | Check console for: Found levelup buttons in sheet HTML, LevelUp button clicked | Rendered when `isLevel0 === false`. Binding happens during sheet render phase. |
| Chargen (Header Control) | Via `getHeaderControlsApplicationV2` hook | Hook callback mutates controls array (line 78) | `() => onClickChargen(app)` | `onClickChargen()` → `launchProgression()` | UNVERIFIED_HOOK_FIRE | Check console for: getHeaderControlsApplicationV2 fired for chargen, Chargen handler fired | Created by hook listener registered on init. May not render if hook doesn't fire or controls are discarded. |
| Level Up (Header Control) | Via `getHeaderControlsApplicationV2` hook | Hook callback mutates controls array (line 117) | `() => onClickLevelUp(app)` | `onClickLevelUp()` → `launchProgression()` | UNVERIFIED_HOOK_FIRE | Check console for: getHeaderControlsApplicationV2 fired for levelup, LevelUp handler fired | Created by hook listener registered on init. May not render if hook doesn't fire or controls are discarded. |

---

## 4. RUNTIME EVIDENCE

### How to Collect Runtime Evidence

1. **Open browser console** (F12 or Right-click → Inspect → Console)
2. **Open character sheet** that has level 0 (for Chargen test)
3. **Click Chargen button**
4. **Search console output** for `[TEMP AUDIT]` prefix
5. **Note which logs appear and in what order**

### Evidence Checklist

- [ ] `[TEMP AUDIT] Found chargen buttons in sheet HTML: 1` — Template button exists
- [ ] `[TEMP AUDIT] Binding chargen button click listener` — Listener attached
- [ ] `[TEMP AUDIT] Chargen button clicked via sheet listener` — Click fired
- [ ] `[TEMP AUDIT] launchProgression called with actor:` — launchProgression entered
- [ ] `[TEMP AUDIT] Importing ChargenShell...` — Import started
- [ ] `[TEMP AUDIT] ChargenShell imported successfully:` — Import succeeded
- [ ] `[TEMP AUDIT] Calling ChargenShell.open()` — Shell open called
- [ ] `[TEMP AUDIT] ProgressionShell.open called:` — ProgressionShell.open entered
- [ ] `[TEMP AUDIT] Creating app instance of class:` — Constructor called
- [ ] `[TEMP AUDIT] App instance created:` — Constructor succeeded
- [ ] `[TEMP AUDIT] Calling _initializeSteps...` — Step initialization started
- [ ] `[TEMP AUDIT] Steps initialized, count:` — Steps loaded (should be > 0)
- [ ] `[TEMP AUDIT] Calling _initializeFirstStep...` — First step init started
- [ ] `[TEMP AUDIT] First step initialized` — First step init succeeded
- [ ] `[TEMP AUDIT] Calling app.render()...` — Render called
- [ ] `[TEMP AUDIT] Render called on app` — Render returned

### Failure Pattern Analysis

**If logs stop after:** → **Likely failure point:**
- "Found chargen buttons in sheet HTML: 0" → Button not rendered in template (check `isLevel0` condition)
- "Chargen button clicked via sheet listener" doesn't appear → Click listener not attached or button not found
- "launchProgression called with actor:" doesn't appear → Click didn't fire listener
- "ChargenShell imported successfully:" doesn't appear → Module import failed (check network, module syntax)
- "Steps initialized, count: 0" → Step descriptors not loaded (check ChargenShell._getCanonicalDescriptors())
- "First step initialized" doesn't appear → Step plugin initialization failed
- "Render called on app" doesn't appear → render() threw exception

---

## 5. VERIFIED BREAKAGES

**Status:** Awaiting runtime execution and log review

No breakages confirmed until runtime evidence is collected.

---

## 6. RISKY / UNPROVEN STAGES

### Stage: getHeaderControlsApplicationV2 Hook Firing

**Risk Level:** MEDIUM
**Files Involved:**
- Hook registration: `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` line 60
- Hook registration: `/systems/foundryvtt-swse/scripts/infrastructure/hooks/levelup-sheet-hooks.js` line 98

**Question:** Does the `getHeaderControlsApplicationV2` hook fire for ActorSheetV2?

**Why Risky:**
- Foundry V13 documentation states hook is real and fired for ApplicationV2 renders
- But exact timing and conditions unclear
- No evidence in code that hook was tested for ActorSheetV2 subclasses
- Headers could be pre-computed before hook fires

**How to Verify:**
- Check console for `[TEMP AUDIT] getHeaderControlsApplicationV2 fired for chargen`
- If missing: Hook not firing for this sheet instance
- If present: Hook fires; check if controls array is being mutated

**Unproven Evidence Required:**
```
[TEMP AUDIT] getHeaderControlsApplicationV2 fired for chargen
[TEMP AUDIT] App class: ActorSheetV2 (or subclass)
[TEMP AUDIT] Controls array before mutation: 3
[TEMP AUDIT] Controls array after mutation: 4
[TEMP AUDIT] Chargen button pushed to controls for: {actor name}
```

---

### Stage: Controls Array Mutation Preserved

**Risk Level:** MEDIUM
**Files Involved:**
- `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` lines 78-86

**Question:** After controls array is mutated by hook callback, does Foundry preserve those mutations and render the buttons?

**Why Risky:**
- Hook callback mutates array in-place (`.push()`)
- But Foundry might have already pre-computed header controls before hook fires
- Or Foundry might filter/replace controls after hook returns
- Or buttons might render but be hidden by CSS or z-index

**How to Verify:**
- Open DevTools → Inspector
- Look for button element with `data-action="swse-chargen"` in header
- Check if it's hidden (display:none, visibility:hidden, z-index:-1000, etc.)
- Check computed styles to see if button is rendered but invisible

**Unproven Evidence Required:**
- Visual inspection of actual rendered header in Foundry UI
- Verify button exists in DOM with correct action and handler attached

---

### Stage: launchProgression() Exception Swallowing

**Risk Level:** MEDIUM
**File:** `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` line 27

**Question:** If launchProgression() throws an error, does error notification show?

**Implementation:**
```javascript
launchProgression(actor).catch(err => {
  SWSELogger.error('[Chargen Header] Error launching progression:', err);
  ui?.notifications?.error?.(`Failed to open chargen: ${err.message}`);
});
```

**Why Risky:**
- Promise rejection is caught and logged
- Error notification attempts to display
- But if ui.notifications is unavailable, error is silent
- User sees no feedback that click didn't work

**How to Verify:**
- Check console for `[TEMP AUDIT] launchProgression caught exception:`
- Look for error message in Foundry UI notifications (usually top-right)
- Verify error message matches actual error

**Unproven Evidence Required:**
```
[TEMP AUDIT] launchProgression called with actor: TestChar, character
[TEMP AUDIT] launchProgression caught exception: {error details}
```

---

### Stage: ChargenShell Module Import

**Risk Level:** MEDIUM
**File:** `/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js` line 80

**Question:** Does dynamic import of './chargen-shell.js' succeed?

**Implementation:**
```javascript
const { ChargenShell } = await import('./chargen-shell.js');
```

**Why Risky:**
- Dynamic import can fail if:
  - Module path is wrong
  - Circular import dependency
  - Syntax error in ChargenShell
  - Module exports missing ChargenShell
- Failure would be caught and logged, but progression stops

**How to Verify:**
- Check console for `[TEMP AUDIT] ChargenShell imported successfully:`
- If missing: import failed

**Unproven Evidence Required:**
```
[TEMP AUDIT] Importing ChargenShell...
[TEMP AUDIT] ChargenShell imported successfully: ChargenShell
```

---

### Stage: Step Initialization

**Risk Level:** HIGH
**File:** `/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js` lines 138-144

**Question:** Do steps initialize without error?

**Implementation:**
```javascript
await app._initializeSteps();
await app._initializeFirstStep().catch(err => {
  swseLogger.error('[ProgressionShell] Error initializing first step:', err);
});
```

**Why Risky:**
- Step plugins may fail to load
- Step descriptors may be empty
- First step onStepEnter() hook may throw
- These errors are caught but progression may continue with broken state

**How to Verify:**
- Check console for `[TEMP AUDIT] Steps initialized, count:` — should be > 0
- Check console for `[TEMP AUDIT] First step initialized` — should appear
- Check browser console for any errors in step plugins

**Unproven Evidence Required:**
```
[TEMP AUDIT] Calling _initializeSteps...
[TEMP AUDIT] Steps initialized, count: 13
[TEMP AUDIT] Calling _initializeFirstStep...
[TEMP AUDIT] First step initialized
```

---

## 7. ROOT CAUSE RANKING

### Confidence-Ranked Hypotheses (awaiting runtime evidence)

**TIER 1 — HIGH CONFIDENCE (if logs missing):**

1. **Button Template Not Rendering** (Confidence: 70%)
   - If `[TEMP AUDIT] Found chargen buttons in sheet HTML: 0` appears
   - Cause: `isLevel0` condition not set correctly or template path wrong
   - Fix: Verify context data passed to template, check `isLevel0` computation

2. **Click Listener Never Attached** (Confidence: 65%)
   - If button found but click listener logs never appear
   - Cause: `_onRender()` not called, AbortSignal fires too early, selector doesn't match
   - Fix: Verify `_onRender()` is called during render cycle

3. **launchProgression() Never Called** (Confidence: 60%)
   - If click logs appear but launchProgression logs don't
   - Cause: Event listener attached but preventDefault/handler blocked
   - Fix: Check event listener implementation, test promise chain

**TIER 2 — MEDIUM CONFIDENCE (if specific logs missing):**

4. **ChargenShell Import Fails** (Confidence: 50%)
   - If "ChargenShell imported successfully" doesn't appear
   - Cause: Module syntax error, circular dependency, wrong path
   - Fix: Check module syntax, dependencies, import path

5. **Step Initialization Fails** (Confidence: 55%)
   - If steps initialized but count is 0
   - Cause: ChargenShell._getCanonicalDescriptors() returns empty array
   - Fix: Check step plugin loading, descriptor factory

6. **getHeaderControlsApplicationV2 Hook Never Fires** (Confidence: 40%)
   - If hook registered but hook callback logs never appear
   - Cause: Hook name wrong, not fired for this sheet type, Foundry doesn't call it
   - Fix: Verify hook name and type, check Foundry documentation

**TIER 3 — LOWER CONFIDENCE:**

7. **Shell Renders But Hidden/Offscreen** (Confidence: 30%)
   - If render logs appear but window not visible
   - Cause: z-index issue, position offscreen, CSS display:none
   - Fix: Check window positioning logic, CSS, z-index stacking

8. **Silent Promise Rejection** (Confidence: 25%)
   - If logs stop mid-chain with no error
   - Cause: Unhandled promise rejection, exception in async flow
   - Fix: Check all async/await chains for unhandled rejections

---

## 8. EXACT FILES MOST LIKELY NEEDING EDITS

Based on audit structure, if breakage is confirmed, focus on these files in this order:

### PRIMARY SUSPECTS (Most Likely to Contain Root Cause)

1. **`/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet.js`** (Lines 1046-1058)
   - Click listener binding for template buttons
   - Verify buttons are found and listeners attached
   - Check AbortSignal context and listener cleanup

2. **`/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js`** (Lines 31-92)
   - launchProgression() entry point
   - Sheet minimize logic
   - ChargenShell import and open call
   - Exception handling

3. **`/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js`** (Lines 35-41)
   - ChargenShell.open() dispatch to ProgressionShell
   - Verify class dispatch is correct

4. **`/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js`** (Lines 127-163)
   - ProgressionShell.open() orchestration
   - App instantiation, step initialization, rendering
   - Window positioning / bringToTop logic

### SECONDARY SUSPECTS (Less Likely but Possible)

5. **`/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js`** (Lines 59-92)
   - Hook registration and callback
   - If header control buttons not rendering

6. **`/systems/foundryvtt-swse/scripts/infrastructure/hooks/levelup-sheet-hooks.js`** (Lines 97-130)
   - Level-up hook registration and callback
   - If level-up header control buttons not rendering

7. **`/systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs`** (Lines 23-27)
   - Button template rendering
   - Check `isLevel0` context condition

---

## 9. MINIMAL FIX PLAN

**DO NOT IMPLEMENT UNTIL RUNTIME EVIDENCE IS COLLECTED**

### Phase 1: Verify Evidence (No Code Changes)

1. Open Foundry
2. Open character sheet (level 0)
3. Open browser console (F12)
4. Click Chargen button
5. Review console output for `[TEMP AUDIT]` logs
6. Identify where logs stop
7. Document exact failure point

### Phase 2: Hypothesis Testing

Based on where logs stop, run targeted test:

**If logs stop at "Found chargen buttons in sheet HTML: 0":**
- Check template rendering by inspecting DOM (Inspector tab)
- Verify `isLevel0` is true in sheet context
- Add debug log to `isLevel0` computation

**If logs stop at "Chargen button clicked via sheet listener":**
- Verify buttons exist in DOM with correct selector
- Test click manually in console: `document.querySelector('[data-action="cmd-chargen"]')?.click()`
- Check event listener is attached (use DevTools event breakpoint)

**If logs stop at "launchProgression called with actor:":**
- Verify listener code hasn't been modified
- Check for JavaScript errors in console
- Ensure `this.actor` is available in click handler

**If logs stop at "ChargenShell imported successfully:":**
- Check chargen-shell.js file for syntax errors
- Test import in console: `import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js')`
- Look for module resolution errors

### Phase 3: Targeted Fixes

**Only implement fixes that are proven necessary by evidence:**

- If button not rendering: Fix template condition or context data
- If listener not attached: Fix event listener binding in `_onRender()`
- If import fails: Fix module syntax or dependency
- If steps don't load: Fix step descriptor factory
- If hook doesn't fire: Implement fallback manual hook call or button injection

---

## APPENDIX: TEMP AUDIT INSTRUMENTATION LOCATIONS

All TEMP AUDIT logs are marked with `console.log('[TEMP AUDIT] ...')` comments and are prefixed with `[TEMP AUDIT]` in output.

### Added Instrumentation Points

**1. Hook Callback Entry & Controls Mutation:**
- File: `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` lines 61-64, 78-90
- Logs hook firing, app class, controls before/after mutation

**2. Hook Handler Closure:**
- File: `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` lines 85-88
- Logs handler execution

**3. onClickChargen() Entry & launchProgression Call:**
- File: `/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js` lines 12-30
- Logs handler entry, launchProgression call, error catch

**4. Click Listener Binding & Execution:**
- File: `/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet.js` lines 1050-1065
- Logs buttons found, listeners attached, click events

**5. launchProgression() Entry & ChargenShell Import:**
- File: `/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js` lines 33-82
- Logs progression entry, import progress, ChargenShell.open call

**6. ChargenShell.open() Entry:**
- File: `/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js` lines 36-38
- Logs shell opening with actor and type info

**7. ProgressionShell.open() Full Orchestration:**
- File: `/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js` lines 128-171
- Logs step initialization, first step init, render call

### Removing Instrumentation

To remove all TEMP AUDIT logs after debugging:
```bash
grep -r "\[TEMP AUDIT\]" /systems/foundryvtt-swse/scripts --include="*.js" | wc -l
```

Remove all lines containing:
```javascript
console.log('[TEMP AUDIT]
```

---

## NEXT STEPS

1. **Run the system** with instrumentation active
2. **Collect browser console logs** when clicking Chargen/Level-Up buttons
3. **Identify failure point** based on where logs stop
4. **Provide logs and failure point** to investigation phase
5. **Implement minimal fix** based on identified cause
6. **Remove TEMP AUDIT instrumentation** once fix is verified

