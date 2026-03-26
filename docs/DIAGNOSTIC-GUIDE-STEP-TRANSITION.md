# Step Transition Diagnostic Guide

## Issue Summary
The chargen shell appears to be stuck on the intro step and does not transition to the species step when the Continue button is clicked. The logs show `active step = intro` and `isIntroMode = true` even after the expected step transition.

## Reproduction Steps
1. Open chargen for a new character
2. Wait for intro animation to complete (boot sequence with Aurabesh text)
3. Click the "Continue" button that appears
4. **Expected:** Shell transitions to species step, shows species selection UI
5. **Actual:** Shell remains on intro step, or species step shows with empty/broken layout

## Diagnostic Logging Added

### 1. ProgressionShell._onNextStep() Logging
**Location:** `scripts/apps/progression-framework/shell/progression-shell.js:691-773`

**Logs to watch for:**
```
[ProgressionShell._onNextStep] Entry
[ProgressionShell._onNextStep] Exiting current step
[ProgressionShell._onNextStep] Step index incremented
[ProgressionShell._onNextStep] Entering next step
[ProgressionShell._onNextStep] About to render
[ProgressionShell._onNextStep] Render complete
```

**What to look for:**
- Does "Entry" log appear when you click Continue?
- Does "Step index incremented" show previousStepIndex: 0 and newStepIndex: 1?
- Does "Next step" show "species"?
- Does "Render complete" appear after "About to render"?

**Failure modes:**
- No "Entry" log → Continue button click not reaching handler
- "Shell is processing, ignoring" → isProcessing flag is true
- "Blocking issues found" → getBlockingIssues() returned array
- Step index not incrementing → Logic error in conditions

### 2. ProgressionShell._prepareContext() Logging
**Location:** `scripts/apps/progression-framework/shell/progression-shell.js:480-503`

**Logs to watch for:**
```
[ProgressionShell._prepareContext] Rendering step
[ProgressionShell._prepareContext] Region payloads
```

**What to look for:**
- `activeStep` value — should be "species" after transition, not "intro"
- `stepIndex` — should be 1 for species, 0 for intro
- `workSurfaceHtml` — should start with "prog-species" for species, "prog-intro-surface" for intro
- `hasPlugin` — should be true (indicating plugin exists and is registered)

**Failure modes:**
- activeStep still shows "intro" → currentStepIndex not incremented in state
- stepIndex: 0 → Transition didn't happen
- workSurfaceHtml shows "intro-work-surface" → species step not rendering

### 3. ProgressionShell._initializeSteps() Plugin Registry Logging
**Location:** `scripts/apps/progression-framework/shell/progression-shell.js:332-348`

**Logs to watch for:**
```
ProgressionShell._initializeSteps
ProgressionShell._initializeSteps - Plugin registry
```

**What to look for:**
- `steps` array should contain: ["intro", "species", "attribute", "class", ...]
- `pluginCount` should be 13+ (all canonical steps)
- `plugins` should include "species" in the list
- Species plugin class should show as "SpeciesStep"

**Failure modes:**
- "species" missing from steps list → descriptor not created
- pluginCount = 0 → no plugins registered at all
- "species" missing from plugins list → plugin not instantiated
- Species plugin shows "NullStepPlugin" → pluginClass not provided correctly

### 4. IntroStep.onStepExit() Logging
**Location:** `scripts/apps/progression-framework/steps/intro-step.js:149-180`

**Logs to watch for:**
```
[IntroStep.onStepExit] Exiting intro step
[IntroStep.onStepExit] Cleanup complete
```

**What to look for:**
- Does this appear when Continue is clicked?
- Does `complete: true` show?
- Does cleanup complete without errors?

**Failure modes:**
- Logs don't appear → onStepExit not being called
- complete: false → _complete flag not set before exit (animation didn't complete)

### 5. IntroStep.afterRender() Logging
**Location:** `scripts/apps/progression-framework/steps/intro-step.js:354-400`

**Logs to watch for:**
```
[IntroStep.afterRender] Called
[IntroStep.afterRender] Continue button check
[IntroStep.afterRender] Starting animation sequence
```

**What to look for:**
- Does afterRender get called multiple times? (Expected: 1 for initial render, then 1 after animation completion)
- `continueBtn: true` → button element exists in DOM
- `continueBtnVisible: true` → button is displayed (not hidden by CSS)
- Animation sequence starts on first render, not on completion render

**Failure modes:**
- afterRender never called → shell not calling step's afterRender hook
- continueBtn: false → Continue button not rendered in template
- continueBtnVisible: false → Continue button hidden by CSS (display:none or visibility:hidden)
- Animation sequence not starting → race condition with DOM caching

### 6. IntroStep.getStepData() Logging
**Location:** `scripts/apps/progression-framework/steps/intro-step.js:182-230`

**Logs to watch for:**
```
[IntroStep.getStepData] Returning step data
```

**What to look for:**
- `complete: true` when animation is done → _complete flag properly set
- `complete: false` while animating → _complete flag properly reset
- Progress increases over time (0-100)

**Failure modes:**
- complete always false → animation never sets _complete
- complete always true → _complete flag stuck in true state

### 7. IntroStep.startIntroSequence() Logging
**Location:** `scripts/apps/progression-framework/steps/intro-step.js:407-420`

**Logs to watch for:**
```
[IntroStep.startIntroSequence] All phases complete, marking complete and rendering
[IntroStep.startIntroSequence] Shell rendered after completion
[IntroStep.startIntroSequence] Intro animation was cancelled before completion
```

**What to look for:**
- Animation completes and triggers render → sequence executes fully
- Shell renders after completion → continue button becomes clickable
- Animation not cancelled prematurely → _introRunning stays true throughout

**Failure modes:**
- "cancelled before completion" → user navigated away before animation finished
- No completion log → animation loop has an error or infinite loop
- Shell rendered but _complete not set → render called without setting flag

## Step-by-Step Diagnostic Procedure

### Step 1: Verify Continue Button Appears
1. Open chargen
2. Wait for intro animation (should be ~6-8 seconds)
3. Open browser console (F12 → Console tab)
4. Look for logs: `[IntroStep.getStepData] complete: true`
5. **If you see it:** Continue button should be visible. If not visible, CSS issue.
6. **If you don't see it:** Animation didn't complete, check animation logs.

### Step 2: Click Continue and Check Transition Logs
1. Click the "Continue" button
2. Immediately check console for: `[ProgressionShell._onNextStep] Entry`
3. **If you see it:** Step transition code executed. Check subsequent logs.
4. **If you don't see it:** Button click didn't reach handler. CSS/event issue.

### Step 3: Verify Step Index Incremented
1. Look for: `[ProgressionShell._onNextStep] Step index incremented`
2. **If previousStepIndex: 0, newStepIndex: 1:** Good! Transition attempted.
3. **If previousStepIndex: 0, newStepIndex: 0 (or other):** Step index not changing. State bug.
4. **If log doesn't appear:** Transition blocked before index increment.

### Step 4: Check Next Step Entry
1. Look for: `[ProgressionShell._onNextStep] Entering next step`
2. **If nextStep: "species":** Correct step. Check if plugin exists.
3. **If plugin: true:** Good! onStepEnter should be called.
4. **If plugin: false:** SpeciesStep plugin not registered.

### Step 5: Verify Render Occurred
1. Look for: `[ProgressionShell._prepareContext] Rendering step`
2. **If activeStep: "species":** Perfect! Shell state updated.
3. **If activeStep: "intro":** State didn't update. Major bug.
4. **If workSurfaceHtml contains "species":** Template rendered correctly.

### Step 6: Check Species Step Registration
1. Scroll up to startup logs
2. Look for: `ProgressionShell._initializeSteps - Plugin registry`
3. Check `plugins` list:
   - **"species" present?** If yes, plugin should work. If no, registration bug.
   - **SpeciesStep class shown?** If yes, correct plugin. If NullStepPlugin, wrong plugin assigned.

## Common Failure Patterns and Solutions

### Pattern A: Continue Button Never Appears
- Check: `[IntroStep.afterRender] continueBtn: false`
- Cause: Template doesn't render button or has wrong data-role
- Fix: Check intro-work-surface.hbs template for button with `data-role="intro-continue"`

### Pattern B: Button Appears but Not Clickable
- Check: `[IntroStep.afterRender] continueBtnVisible: false`
- Cause: CSS hides button (display:none, visibility:hidden, opacity:0)
- Fix: Check intro.css for `.prog-intro-footer--fade-in` and button disabled state

### Pattern C: Click Doesn't Trigger Handler
- Check: No `[ProgressionShell._onNextStep] Entry` log after clicking
- Cause: Event listener not attached or event stopped
- Fix: Check if activateListeners is preventing event propagation

### Pattern D: Step Index Doesn't Increment
- Check: `previousStepIndex: 0, newStepIndex: 0` in logs
- Cause: Condition check before increment returned early
- Fix: Check getBlockingIssues() or isProcessing flag

### Pattern E: Shell Still Shows Intro After Transition
- Check: `activeStep: "intro"` in _prepareContext logs after _onNextStep
- Cause: State not persisted or reverted
- Fix: Check if render() is being called multiple times with stale state

### Pattern F: SpeciesStep Plugin Missing
- Check: "species" absent from plugin registry OR shows NullStepPlugin
- Cause: SpeciesStep import failed or plugin class not assigned in chargen-shell
- Fix: Verify chargen-shell._getCanonicalDescriptors() assigns SpeciesStep plugin

## What Each Log Entry Means

| Log | Meaning |
|-----|---------|
| `[ProgressionShell._onNextStep] Entry` | Continue button clicked, handler invoked |
| `[ProgressionShell._onNextStep] Exiting current step` | IntroStep.onStepExit() about to be called |
| `[ProgressionShell._onNextStep] Step index incremented` | currentStepIndex changed from 0 to 1 |
| `[ProgressionShell._onNextStep] Entering next step` | SpeciesStep.onStepEnter() about to be called |
| `[ProgressionShell._onNextStep] About to render` | shell.render() about to be called |
| `[ProgressionShell._prepareContext] Rendering step` | _prepareContext executing with new step data |
| `[IntroStep.startIntroSequence] All phases complete` | Animation finished, _complete set to true |
| `[IntroStep.afterRender] continueBtn: true` | Continue button successfully rendered in DOM |

## Next Steps After Diagnosis

Once you identify which log is missing or incorrect:

1. **Button Not Appearing?** → Check template, CSS, completion logic
2. **Click Not Triggering?** → Check event delegation, data-action attribute
3. **Index Not Incrementing?** → Check blocking issues, processing flag
4. **Plugin Not Found?** → Check chargen-shell imports and descriptor assignment
5. **Shell Still on Intro?** → Check if render() is using stale state cache

Return the specific logs from your console and we can identify the exact root cause.
