# Testing Guide: Button Functionality Restoration

## Quick Test (5 minutes)

### Prerequisites
- Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R)
- Open browser Developer Console (F12)

### Test Steps

1. **Verify Hook Registration**
   - Look in console for any message containing: `registerChargenSheetHooks`
   - OR look for any error starting with: `[IntroStep._getTranslationEngine]`
   - Expected: No errors, clean console on page load

2. **Test Chargen Button**
   - Click "New Character" button in character sheet
   - Expected: Chargen sheet opens immediately
   - Expected in console: `[IntroStep.onStepEnter] CALLED`

3. **Verify Intro Animation**
   - Watch the boot sequence animation
   - Expected: 6 phases play (SYSTEMS CHECK, NETWORK SCAN, etc.)
   - Expected in console: `[IntroStep.startIntroSequence] Entering phase...` messages

4. **Test Translation Phase**
   - When TRANSLATING phase starts, watch for masked-reveal animation
   - Expected animation: `◆●●●● ●●●●●` → `Je◆●● ●●●●●` → `Jedi Knight◆`
   - Expected in console: `[TranslationSession] Frame X/12` messages (every 5 frames)
   - OR if engine fails to load: `[IntroStep._getTranslationEngine] CRITICAL: Failed to load engine:`

5. **Complete Sequence**
   - Click "Continue" after boot sequence
   - Expected: Transition to next step (Species selection)
   - No crashes, no console errors

---

## Detailed Console Logging Reference

### Expected Log Sequence (Healthy Run)

```
[ProgressionShell] Rendering shell
[IntroStep.onStepEnter] CALLED { state: 'idle' }
[IntroStep] State: idle → animating
[IntroStep.afterRender] Starting animation sequence
[IntroStep.startIntroSequence] Entering phase 1/6: SYSTEMS CHECK
[IntroStep.startIntroSequence] Entering phase 2/6: NETWORK SCAN
[IntroStep.startIntroSequence] Entering phase 3/6: IDENTITY QUERY
[IntroStep.startIntroSequence] Entering phase 4/6: IDENTITY UNKNOWN
[IntroStep.startIntroSequence] Entering phase 5/6: OVERRIDE AUTHORIZED
[IntroStep.startIntroSequence] Entering phase 6/6: TRANSLATING
[IntroStep.startIntroSequence] Starting translation phase via engine
[IntroStep._runTranslationViaEngine] Starting engine-based translation
[IntroStep._getTranslationEngine] Engine loaded successfully
[TranslationSession] Starting with profile: chargenIntro
[DOMBinding.rebind] Session token: 1, Found elements: {translationText: true, sourceText: true, ...}
[TranslationSession] Frame 0/12 { frame: "◆●●●● ●●●●●" }
[TranslationSession] Frame 5/12 { frame: "Jedi ◆●●●●●" }
[TranslationSession] Frame 10/12 { frame: "Jedi Knight◆" }
[TranslationSession] Masked-reveal animation complete { totalFrames: 12, finalText: "Jedi Knight" }
[IntroStep.startIntroSequence] Translation engine animation completed
[IntroStep.startIntroSequence] All phases complete, marking complete and rendering
[IntroStep] State: animating → complete-awaiting-click
```

### If Engine Fails to Load (Graceful Degradation)

```
[IntroStep.startIntroSequence] Entering phase 6/6: TRANSLATING
[IntroStep.startIntroSequence] Starting translation phase via engine
[IntroStep._runTranslationViaEngine] Starting engine-based translation
[IntroStep._getTranslationEngine] CRITICAL: Failed to load engine: [error details]
[IntroStep._getTranslationEngine] Error stack: [stack trace]
[IntroStep._runTranslationViaEngine] Translation engine not available, skipping animation
[IntroStep.startIntroSequence] Translation engine animation completed
[IntroStep.startIntroSequence] All phases complete, marking complete and rendering
→ Boot sequence continues without animation, user sees static final state
```

---

## Failure Diagnostics

### Symptom: Buttons Still Don't Work

**Check 1: Module Import Failed**
```javascript
// In browser console, try:
import { SWSETranslationEngine } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/engine/swse-translation-engine.js'
  .then(m => console.log('Engine module loaded:', m))
  .catch(e => console.error('Engine module failed:', e))
```

**Check 2: Logger Issue**
```javascript
// In browser console, try:
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js'
  .then(m => console.log('Logger loaded:', m))
  .catch(e => console.error('Logger failed:', e))
```

**Check 3: IntroStep Module**
```javascript
// In browser console, try:
import { IntroStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/intro-step.js'
  .then(m => console.log('IntroStep loaded:', m))
  .catch(e => console.error('IntroStep failed:', e))
```

### Symptom: Animation Doesn't Play (But Buttons Work)

This is expected if the engine fails to load. Check console for:
```
[IntroStep._getTranslationEngine] CRITICAL: Failed to load engine:
```

**This is OK** — The fix prioritizes button functionality over animation. If the engine fails, buttons still work and the sequence completes without animation.

---

## Advanced Diagnostics

### Checking Module Chain Resolution

1. Open DevTools → Network tab
2. Filter by `.js` files
3. Look for these files loading in order:
   - `chargen-sheet-hooks.js` ✓
   - `progression-entry.js` ✓
   - `chargen-shell.js` ✓
   - `intro-step.js` ✓
   - (swse-translation-engine.js loads later when animation phase starts)

### Checking if Hook Registration Happens

1. Open DevTools → Elements tab
2. Click "New Character" button
3. Search for `data-cy="chargen-sheet"` or similar in DOM
4. If found: Hook registration succeeded, chargen sheet mounted
5. If not found: Hook registration failed, check console for errors

### Checking Engine Import Timing

1. Open DevTools → Performance tab
2. Click "New Character" → watch through intro
3. When translation phase starts, look for:
   - `swse-translation-engine.js` loading
   - Should appear AFTER click, not on page load
   - This confirms lazy loading is working

---

## Performance Notes

### Before Fix
- Engine imported at module load time (always, even if never used)
- Potential module chain failure if engine unavailable

### After Fix
- Engine imported on-demand during translation phase (only when needed)
- First import might have slight delay (< 50ms)
- Subsequent imports cached (instant)
- Module chain failure impossible (engine not critical)

---

## Validation Checklist

- [ ] Browser hard-refreshed
- [ ] No errors in console on page load
- [ ] Chargen button opens chargen sheet
- [ ] Levelup button works (if applicable)
- [ ] Intro sequence boots smoothly
- [ ] Translation phase animation plays (or gracefully skips)
- [ ] Continue button advances sequence
- [ ] No crashes during character creation
- [ ] Created character saves successfully

---

## If Tests Pass

The fix is successful! The module chain is now resilient:

✅ Critical systems (buttons, hooks) load successfully
✅ Optional features (engine, animation) load on-demand
✅ Errors are logged but don't break the app
✅ Graceful degradation if engine unavailable
✅ Normal animation if engine loads successfully

---

## If Tests Fail

1. Check console for **specific error messages**
   - Copy the exact error and search for it in the codebase
   - Error messages now include source file and line number

2. Check if it's a **path issue**
   - Verify all imports use absolute paths from `/systems/foundryvtt-swse/`
   - Check that file paths match actual directory structure

3. Check if it's a **logger issue**
   - Verify `/scripts/utils/logger.js` exists and exports `swseLogger`
   - Try loading logger directly in console

4. Check if it's an **engine-specific issue**
   - Verify `/scripts/apps/progression-framework/engine/swse-translation-engine.js` exists
   - Try loading engine directly in console with dynamic import

---

## Summary

This fix changes the Translation Engine from a **blocking dependency** (static import at module load) to a **lazy-loaded dependency** (dynamic import on first use).

**Result:** Buttons work even if the engine fails to load. Animation degrades gracefully. App remains stable.

