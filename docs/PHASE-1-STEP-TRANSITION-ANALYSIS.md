# Phase 1: Step Transition Authority Verification

## Problem Statement
From the captured console logs, the shell's official state is still `intro` when rendering:
- `active step = intro`
- `isIntroMode = true`
- `workSurfaceHtml payload = ... intro-work-surface ...`

This indicates the shell's currentStepIndex has not transitioned from 0 (intro) to 1 (species).

## Authority Questions to Answer

### Q1: When the intro completes, does the shell actually set active step to `species`?

**Where to check:**
```
- ProgressionShell._onNextStep() at line 691-773
  - currentStepIndex increment at line 710
  - Check logs: "[ProgressionShell._onNextStep] Step index incremented"

- ProgressionShell._prepareContext() at line 480+
  - currentDescriptor = this.steps[this.currentStepIndex] at line 434
  - Check logs: "[ProgressionShell._prepareContext] Rendering step"
    - Should show activeStep: "species" after transition
```

**Expected behavior:**
1. User clicks Continue button
2. `_onNextStep()` is invoked
3. Line 710: `this.currentStepIndex++` changes index from 0 to 1
4. Line 713: `const nextDescriptor = this.steps[1]` retrieves species descriptor
5. Line 717: `SpeciesStep.onStepEnter()` is called
6. Line 730: `shell.render()` is called with new state

**What to verify:**
- Look for `[ProgressionShell._onNextStep] Entry` in console
- Look for `[ProgressionShell._onNextStep] Step index incremented` with newStepIndex: 1
- Look for `[ProgressionShell._prepareContext] Rendering step` with activeStep: "species"

**Failure indicators:**
- No `_onNextStep` logs = Continue button click not reaching handler
- Step index shows newStepIndex: 0 = Index not actually incrementing
- activeStep still shows "intro" = State not persisted or reverted

---

### Q2: If yes, where is that stored?

**Answer:** In `this.currentStepIndex` on the ProgressionShell instance.

**Where it's stored:**
```javascript
// progression-shell.js line 164
this.currentStepIndex = 0;  // Initialized to 0

// progression-shell.js line 710
this.currentStepIndex++;    // Incremented during step transition

// progression-shell.js line 434
const currentDescriptor = this.steps[this.currentStepIndex];  // Used during render
```

**How to verify it's persisted:**
1. Add breakpoint in browser DevTools at line 730 (shell.render() call)
2. Before clicking Continue, check: `theShell.currentStepIndex` in console
   - Should show 0
3. Click Continue and verify the breakpoint stops execution
4. Check: `theShell.currentStepIndex` in console again
   - Should show 1 if transition occurred

**If not persisted:**
- Check if there's code resetting currentStepIndex after increment
- Check if render() is using a cached/stale value instead of this.currentStepIndex
- Check if there are multiple shell instances (old one still at 0)

---

### Q3: Does render occur after the state change?

**Where to check:**
```javascript
// progression-shell.js line 730
this.render();  // Called after step setup complete

// Should trigger _prepareContext which is async and rebuilds UI
```

**Expected sequence:**
1. Line 710: currentStepIndex incremented
2. Line 717: SpeciesStep.onStepEnter() called
3. Line 730: shell.render() called
4. Internally: _prepareContext() runs asynchronously
5. Internally: ProgressionShell.hbs template re-rendered with new data

**How to verify:**
1. Look for `[ProgressionShell._onNextStep] About to render` log
2. Look for `[ProgressionShell._onNextStep] Render complete` log
3. Look for `[ProgressionShell._prepareContext] Rendering step` log immediately after

**If render doesn't occur:**
- Check if error thrown in onStepEnter() causes early return at line 726
- Check console for error messages from SpeciesStep.onStepEnter()
- Check if shell.render() is explicitly overridden or broken

---

### Q4: Is the render using stale cached step data/template?

**Where cached data could exist:**
```javascript
// No explicit caching in ProgressionShell
// But Foundry's ApplicationV2 may cache templates

// Check if template is being reused
const workSurfaceSpec = currentPlugin?.renderWorkSurface?.(stepData) ?? null;
const workSurfaceHtml = workSurfaceSpec?.template
  ? await foundry.applications.handlebars.renderTemplate(workSurfaceSpec.template, workSurfaceSpec.data)
  : null;  // Line 456-458

// This should be fresh each render, no caching
```

**How to verify:**
1. Look at `[ProgressionShell._prepareContext] Region payloads` logs
2. Compare workSurfaceHtml before and after transition:
   - Before: Should show "prog-intro-surface"
   - After: Should show "prog-species" or similar species template prefix

**If stale data:**
- Check if template path resolution is wrong (using old template)
- Check if step plugin's renderWorkSurface() returns cached result
- Check if Foundry's template cache needs clearing

---

### Q5: Is intro mode suppression still active even after step transition?

**Where intro mode is checked:**
```javascript
// progression-shell.js line 481
const isIntroMode = currentDescriptor?.stepId === 'intro';

// progression-shell.js line 546
isIntroMode: currentDescriptor?.stepId === 'intro',

// If true, the progression-shell.hbs template shows ONLY work-surface
// If false, shows full UI (mentor rail, progress rail, footer, etc.)
```

**Expected behavior:**
- During intro (step 0): currentDescriptor.stepId = 'intro', so isIntroMode = true
- After transition (step 1+): currentDescriptor.stepId = 'species', so isIntroMode = false
- Shell should render full UI for species step

**How to verify:**
1. Look for `[ProgressionShell._prepareContext] Rendering step` logs
2. Before clicking Continue:
   - Should show `activeStep: "intro"` with `isIntroMode: true`
3. After clicking Continue:
   - Should show `activeStep: "species"` with `isIntroMode: false`

**If intro mode persists:**
- currentDescriptor.stepId is still 'intro' (step transition didn't happen)
- Check Q1-Q3 above
- Check if this.steps is broken or step IDs are wrong

---

### Q6: Is there a race where the UI visually changes but the shell still thinks step = intro?

**Possible race condition:**
```
Timeline:
T1: User clicks Continue
T2: _onNextStep starts, increments currentStepIndex to 1
T3: SpeciesStep.onStepEnter() starts (async, might be slow)
T4: shell.render() is called (async)
T5: _prepareContext() runs (reads currentStepIndex = 1)
T6: But SpeciesStep.onStepEnter() is STILL RUNNING from T3
T7: SpeciesStep.onStepEnter() completes, calls shell.render() again
T8: _prepareContext() runs again... but what is currentStepIndex now?
```

**If onStepEnter calls shell.render() recursively:**
- Could cause UI inconsistency
- Could render species content before species setup is complete

**Where to check:**
```javascript
// SpeciesStep.onStepEnter() at species-step.js line 61
async onStepEnter(shell) {
  // Does this call shell.render() or shell.render(false)?
  // Should it?
}

// Check the logs carefully
// Are there multiple render calls in sequence?
// Do the logs show alternating step states?
```

**How to verify:**
1. Count the number of `[ProgressionShell._prepareContext] Rendering step` logs after clicking Continue
2. Expected: 1 or 2 logs (one for species step entry)
3. If more: Recursive renders happening, race condition

**If race condition exists:**
- SpeciesStep.onStepEnter() should NOT call shell.render() itself
- It should let _onNextStep() at line 730 do the rendering
- Any shell.render() in step plugins should only happen for data updates, not state changes

---

### Q7: Is there a direct DOM intro hack that bypasses proper shell state update?

**Where intro-specific DOM hacks could exist:**
```javascript
// intro-step.js line 305
this.descriptor._shell?.render(false);  // <-- WRONG!
// This should be: this._shell?.render(false);
// Or better: don't call render at all, let the skip flag work

// Check if there are other direct DOM manipulations
// that might be preventing proper state updates
```

**Code to audit:**
1. **intro-step.js activateListeners()** (line 295-337)
   - Does click handler prevent event propagation?
   - Does it interfere with the Continue button?

2. **intro-step.js animation loops** (line 422-445)
   - Do they call shell.render()?
   - Could they be overwriting state?

3. **intro.css**
   - Are there z-index issues preventing button clicks?
   - Is button display:none while complete?

4. **intro-work-surface.hbs**
   - Is Continue button conditional on {{complete}}?
   - Is it wrapped in hidden containers?

**How to verify:**
1. Open DevTools → Inspector tab
2. When intro completes, inspect the Continue button
3. Check computed styles:
   - display: not none
   - visibility: not hidden
   - opacity: not 0
   - pointer-events: not none
4. Check parent elements for same conditions
5. Check z-index: should be above other elements

---

## Summary: Next Steps to Identify Root Cause

**Priority 1: Verify _onNextStep is called**
- Reproduce the issue
- Look for `[ProgressionShell._onNextStep] Entry` in console
- If missing: event listener issue, button issue, or click not reaching
- If present: step to Priority 2

**Priority 2: Verify step index incremented**
- Look for `[ProgressionShell._onNextStep] Step index incremented`
- If shows newStepIndex: 1: step to Priority 3
- If shows newStepIndex: 0: blocking issue detected, check logs for details

**Priority 3: Verify shell.render() called**
- Look for `[ProgressionShell._onNextStep] About to render`
- If present: step to Priority 4
- If missing: check for error in SpeciesStep.onStepEnter()

**Priority 4: Verify _prepareContext shows species**
- Look for `[ProgressionShell._prepareContext] Rendering step`
- If activeStep: "species": Step transition succeeded (go to Phase 2)
- If activeStep: "intro": State not persisted (go to Q2)

**Priority 5: Check for race conditions**
- Count number of `_prepareContext` logs after clicking Continue
- If more than 2: possible recursive renders
- If 1-2: normal, continue with diagnosis

**Priority 6: Verify no intro hacks interfering**
- Check intro-step.js for render() calls in step lifecycle
- Check CSS for hidden/disabled button styles
- Check template for conditional button rendering

---

## Expected Log Output (Successful Transition)

```
[IntroStep.startIntroSequence] All phases complete, marking complete and rendering
[IntroStep.startIntroSequence] Shell rendered after completion
[IntroStep.afterRender] Continue button check
[IntroStep.afterRender] Continue button: true
[IntroStep.afterRender] Continue button visible: true
[ProgressionShell._onNextStep] Entry
[ProgressionShell._onNextStep] Exiting current step
[ProgressionShell._onNextStep] Step index incremented
  previousStepIndex: 0
  newStepIndex: 1
[ProgressionShell._onNextStep] Entering next step
  nextStep: "species"
  hasPlugin: true
[ProgressionShell._onNextStep] Next step entered successfully
[ProgressionShell._onNextStep] About to render
[ProgressionShell._onNextStep] Render complete
[ProgressionShell._prepareContext] Rendering step
  stepIndex: 1
  activeStep: "species"
  isIntroMode: false
  hasPlugin: true
[ProgressionShell._prepareContext] Region payloads
  workSurfaceHtml: "prog-species..." (NOT "prog-intro-surface")
```

If your logs differ from this, use the diagnostic questions above to identify which step failed.
