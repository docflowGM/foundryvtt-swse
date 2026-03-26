# Step Transition Investigation Summary

## Current Issue
The chargen shell appears stuck on the intro step and does not transition to species step when the Continue button is clicked. Console logs show:
- `active step = intro`
- `isIntroMode = true`
- `workSurfaceHtml payload = ... intro-work-surface ...`

## What I've Done

### 1. Added Comprehensive Diagnostic Logging
I've instrumented the codebase with detailed logging at critical points in the step transition pipeline:

**ProgressionShell._onNextStep()** (line 691-773)
- Logs when Continue button handler is invoked
- Logs before/after step index increment
- Logs when entering next step
- Logs before/after render call
- Helps identify: button clicks, state changes, step plugins

**ProgressionShell._prepareContext()** (line 480-503)
- Logs active step on each render
- Logs step index and descriptor info
- Logs region payload contents
- Logs plugin registry status
- Helps identify: what step the shell thinks is active, if data is hydrating

**ProgressionShell._initializeSteps()** (line 332-348)
- Logs all registered steps
- Logs all instantiated plugins
- Shows plugin class names
- Helps identify: if species step is registered, if SpeciesStep plugin exists

**IntroStep.onStepExit()** (line 149-184)
- Logs when exiting intro
- Logs completion state before exit
- Logs cleanup actions
- Helps identify: if intro properly cleans up on exit

**IntroStep.afterRender()** (line 354-400)
- Logs when afterRender is called
- Logs if DOM elements are cached
- Logs if Continue button exists and is visible
- Logs if animation sequence starts
- Helps identify: if button is rendered, if it's clickable, if animation runs

**IntroStep.getStepData()** (line 182-230)
- Logs step data being returned
- Logs complete flag state
- Logs progress and phase info
- Helps identify: if animation completion sets _complete flag

**IntroStep.startIntroSequence()** (line 407-420)
- Logs when all phases complete
- Logs when shell renders after completion
- Logs if animation was cancelled
- Helps identify: if animation finishes successfully, if render called after

### 2. Created Diagnostic Guides

**DIAGNOSTIC-GUIDE-STEP-TRANSITION.md**
- Explains what each log means
- Shows step-by-step diagnostic procedure
- Explains common failure patterns
- Provides testing checklist
- Maps logs to root causes

**PHASE-1-STEP-TRANSITION-ANALYSIS.md**
- Follows your 7-phase diagnostic command (Phase 1 detailed)
- Answers authority questions (Q1-Q7):
  - Does shell set active step to species?
  - Where is state stored?
  - Does render occur after state change?
  - Is render using stale cached data?
  - Is intro mode suppression still active?
  - Is there a race condition?
  - Are there direct DOM hacks bypassing shell?
- Provides priority diagnostic steps
- Shows expected log output for successful transition

### 3. Identified Mentor Portrait Issue

Found critical file mismatch:
- System tries to load `salty.webp` (256x256, actually PNG data, 128 KB)
- Should load `salty.png` (873x873, full resolution, 788 KB)
- Causes poor portrait display quality

**FIX-MENTOR-PORTRAIT-SALTY.md**
- Details the file mismatch
- Lists all locations needing updates
- Provides option recommendations
- Includes testing checklist
- Provides implementation steps

## Next Steps: What to Do Now

### Step 1: Capture Console Logs
1. Open chargen
2. Open browser console (F12 → Console tab)
3. Wait for intro animation to complete
4. Click Continue button
5. **Immediately** take a screenshot of the console logs

### Step 2: Compare to Expected Logs
Look for these key logs in order:
```
[IntroStep.afterRender] Called
[IntroStep.afterRender] Continue button check
[IntroStep.startIntroSequence] All phases complete
[ProgressionShell._onNextStep] Entry ← KEY: Button click received?
[ProgressionShell._onNextStep] Step index incremented ← KEY: Did it go 0→1?
[ProgressionShell._onNextStep] Entering next step ← KEY: Was species loaded?
[ProgressionShell._prepareContext] Rendering step ← KEY: Is activeStep "species"?
```

**If any are missing, note which ones are absent.**

### Step 3: Run Diagnostic Procedure
Follow the step-by-step procedure in `DIAGNOSTIC-GUIDE-STEP-TRANSITION.md`:
1. **Verify Continue Button Appears** → Check for `[IntroStep.getStepData] complete: true`
2. **Click Continue and Check Transition Logs** → Check for `[ProgressionShell._onNextStep] Entry`
3. **Verify Step Index Incremented** → Check for `previousStepIndex: 0, newStepIndex: 1`
4. **Check Next Step Entry** → Check for `nextStep: "species"`
5. **Verify Render Occurred** → Check for `activeStep: "species"`
6. **Check Species Step Registration** → Look for species in plugin registry

### Step 4: Share Diagnostic Results
Provide:
1. Screenshot of console logs from when you clicked Continue
2. Which of the expected logs are present/missing
3. Any error messages in console
4. Confirmation of which diagnostic step you reach (1-6)

### Step 5: Address Mentor Portrait Issue
While investigating step transition, also fix the salty.webp issue:

**Quick Fix (3 min):**
1. Open these files and replace `salty.webp` with `salty.png`:
   - `/scripts/apps/mentor/mentor-dialogues.data.js`
   - `/scripts/engine/mentor/mentor-dialogues.data.js`
   - `/scripts/apps/progression-framework/shell/progression-shell.js`
   - `/data/dialogue/mentors/ol_salty/ol_salty_dialogues.json`

2. Test: Open chargen species step, verify mentor portrait displays clearly

See `FIX-MENTOR-PORTRAIT-SALTY.md` for detailed instructions.

## Log Reference

### Logs You Should See (Successful Path)
```
[ProgressionShell._initializeSteps] stepCount: 13+
[ProgressionShell._initializeSteps - Plugin registry] pluginCount: 13+
[ProgressionShell._initializeSteps - Plugin registry] plugins: ["intro", "species", ...]
ProgressionShell._initializeSteps: currentStepId: "intro"

[IntroStep.afterRender] workSurfaceEl: true
[IntroStep.afterRender] introRunning: true
[IntroStep.afterRender] Starting animation sequence

[IntroStep.startIntroSequence] All phases complete, marking complete and rendering

[ProgressionShell._onNextStep] Entry
[ProgressionShell._onNextStep] Exiting current step
[ProgressionShell._onNextStep] Step index incremented
  previousStepIndex: 0
  newStepIndex: 1
[ProgressionShell._onNextStep] Entering next step
  nextStep: "species"
  hasPlugin: true
[ProgressionShell._onNextStep] About to render

[ProgressionShell._prepareContext] Rendering step
  stepIndex: 1
  activeStep: "species"
  isIntroMode: false
  hasPlugin: true
```

### Logs Indicating Problems
```
[ProgressionShell._onNextStep] Entry ← MISSING: Button click not received
[ProgressionShell._onNextStep] Shell is processing, ignoring ← PROBLEM: isProcessing true
[ProgressionShell._onNextStep] Blocking issues found ← PROBLEM: Step validation failed
[ProgressionShell._onNextStep] Step index incremented: newStepIndex: 0 ← PROBLEM: Not incrementing
[ProgressionShell._initializeSteps - Plugin registry] plugins: [] ← PROBLEM: No plugins registered
[ProgressionShell._initializeSteps - Plugin registry] plugins: [...] "SpeciesStep" missing ← PROBLEM: Species plugin not registered
[ProgressionShell._prepareContext] activeStep: "intro" ← PROBLEM: State reverted or not persisted
```

## Expected Timeline

- **Logs added**: ✅ Complete
- **Diagnostic guides created**: ✅ Complete
- **Mentor portrait issue documented**: ✅ Complete
- **User captures logs**: ⏳ Next
- **Root cause identified**: ⏳ Next
- **Fix implemented**: ⏳ Next
- **Verification**: ⏳ Next

## Files Created/Modified

### New Documentation Files
- `DIAGNOSTIC-GUIDE-STEP-TRANSITION.md` - General diagnostic guide
- `PHASE-1-STEP-TRANSITION-ANALYSIS.md` - Phase 1 deep dive
- `FIX-MENTOR-PORTRAIT-SALTY.md` - Salty portrait issue and fix
- `STEP-TRANSITION-INVESTIGATION-SUMMARY.md` - This file

### Modified Source Files (Diagnostic Logging Added)
- `scripts/apps/progression-framework/shell/progression-shell.js`
  - _onNextStep() - Added 7 log points
  - _prepareContext() - Added 2 log points
  - _initializeSteps() - Added 1 log point

- `scripts/apps/progression-framework/steps/intro-step.js`
  - onStepExit() - Added 2 log points
  - afterRender() - Added 6 log points
  - getStepData() - Added 1 log point
  - startIntroSequence() - Added 2 log points

## Key Questions Being Investigated

1. **When the Continue button is clicked, does _onNextStep actually execute?**
   - Evidence: Look for `[ProgressionShell._onNextStep] Entry` log
   - If missing: Button click not reaching handler (CSS/event issue)

2. **Does currentStepIndex actually increment from 0 to 1?**
   - Evidence: Look for `previousStepIndex: 0, newStepIndex: 1`
   - If not: Blocking condition preventing increment

3. **Is the SpeciesStep plugin registered and available?**
   - Evidence: Look for "species" in plugin registry list
   - If missing: Plugin instantiation failed

4. **Does the shell actually render after step increment?**
   - Evidence: Look for `[ProgressionShell._prepareContext] Rendering step` with `activeStep: "species"`
   - If shows "intro": State not persisted or reverted

5. **Is the Continue button actually visible and clickable?**
   - Evidence: Look for `[IntroStep.afterRender] continueBtnVisible: true`
   - If false: CSS hiding button or button not rendered

6. **Is the intro animation completing successfully?**
   - Evidence: Look for `[IntroStep.startIntroSequence] All phases complete`
   - If missing: Animation error or infinite loop

## Success Criteria

Once the issue is fixed:
- [ ] Shell transitions from intro (step 0) to species (step 1) when Continue is clicked
- [ ] Console shows: `activeStep: "species"` and `isIntroMode: false`
- [ ] Species step displays with full UI:
  - [ ] Mentor portrait (Ol' Salty, clear and high-quality)
  - [ ] Mentor dialogue visible
  - [ ] Species list populated
  - [ ] Progress rail showing species as current step
  - [ ] Left/center/right panels properly laid out
- [ ] No console errors related to step transition
- [ ] All diagnostic logs appear in correct order

## References

For more details, see:
1. `DIAGNOSTIC-GUIDE-STEP-TRANSITION.md` - How to use the logs to diagnose
2. `PHASE-1-STEP-TRANSITION-ANALYSIS.md` - Deep analysis of step transition authority
3. `FIX-MENTOR-PORTRAIT-SALTY.md` - Mentor portrait file issue
4. Console logs from browser (F12 → Console tab)

---

**Status**: Waiting for console logs from failed transition attempt.
**Next Action**: Capture console output when clicking Continue button on intro.
