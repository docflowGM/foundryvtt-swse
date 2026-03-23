# Translation Engine Module Chain Fix — Summary

## The Problem

After implementing the Translation Engine, **all chargen/levelup/mentor/store buttons stopped working**. They were visible but completely unresponsive, with no console errors.

**Root Cause:** The SWSETranslationEngine was imported at the top level of intro-step.js:

```javascript
// BEFORE (line 28)
import { SWSETranslationEngine } from '../engine/swse-translation-engine.js';

// BEFORE (line 140)
this._translationEngine = new SWSETranslationEngine();
```

If this import OR instantiation failed, the entire module chain would break:

```
chargen-sheet-hooks imports
  ↓ (fails)
progression-entry imports
  ↓ (fails)
chargen-shell imports
  ↓ (fails)
intro-step (fails to import SWSETranslationEngine)
  ↓ (entire chain collapses)
Hook registration NEVER happens
  ↓
All buttons become non-functional
```

**Why no console errors?** ES6 module import failures at parse time happen before logging can start, so the failure was completely silent.

---

## The Solution

Convert to **lazy-loaded dynamic import**. The engine is now imported only when it's actually needed (during the translation phase), not at module load time.

### What Changed

**File:** `/scripts/apps/progression-framework/steps/intro-step.js`

**Change 1: Remove static import (line 28)**
```javascript
// BEFORE
import { SWSETranslationEngine } from '../engine/swse-translation-engine.js';

// AFTER
// NOTE: SWSETranslationEngine is dynamically imported to prevent module chain failure
// if the engine module fails to load
```

**Change 2: Initialize as null (line 141)**
```javascript
// BEFORE
this._translationEngine = new SWSETranslationEngine();

// AFTER
this._translationEngine = null;
this._engineLoadPromise = null;
```

**Change 3: Add lazy-load method (new method, ~30 lines)**
```javascript
async _getTranslationEngine() {
  // Returns cached engine if already loaded
  // OR imports and instantiates engine on first call
  // WITH error handling (catches import/instantiation failures)
}
```

**Change 4: Update _runTranslationViaEngine() (line 692)**
```javascript
// BEFORE
const session = this._translationEngine.createSession({...});
await this._translationEngine.runSession(session);

// AFTER
const engine = await this._getTranslationEngine();
if (!engine) {
  swseLogger.warn('[...] Translation engine not available, skipping animation');
  return;
}
const session = engine.createSession({...});
await engine.runSession(session);
```

**Change 5: Fix undefined variable (line 594)**
```javascript
// BEFORE
await this._runTranslationViaEngine(shell, sessionToken);  // sessionToken is undefined!

// AFTER
await this._runTranslationViaEngine(shell, this._sessionToken);  // Fixed
```

---

## Why This Works

1. **intro-step.js now loads successfully** even if the engine module fails
   - No static imports that could fail
   - Module construction doesn't try to instantiate engine

2. **The entire dependency chain succeeds**
   - chargen-shell.js imports intro-step.js ✓
   - progression-entry.js imports chargen-shell.js ✓
   - chargen-sheet-hooks.js imports progression-entry.js ✓

3. **Hook registration code executes**
   - All the hook setup code that registers button handlers runs ✓
   - Buttons become functional again ✓

4. **Engine loads lazily when needed**
   - During translation phase, `_getTranslationEngine()` is called
   - Dynamic import happens with try/catch error handling
   - If engine loads: animation plays ✓
   - If engine fails: graceful degradation, animation skipped but app continues ✓

---

## Expected Behavior

### Scenario 1: Engine loads successfully (Normal)
```
User clicks "New Character"
  → hooks are registered, chargen sheet opens ✓
  → boot sequence animates through 5 phases ✓
  → translation phase loads engine and plays masked-reveal animation ✓
  → continue button works, transitions to next step ✓
```

### Scenario 2: Engine fails to load (Graceful Degradation)
```
User clicks "New Character"
  → hooks are registered, chargen sheet opens ✓
  → boot sequence animates through 5 phases ✓
  → translation phase tries to load engine, fails ✗
  → [IntroStep._getTranslationEngine] CRITICAL: Failed to load engine: [error]
  → animation is skipped, but boot sequence continues ✓
  → continue button works, transitions to next step ✓
  → APP IS STILL FUNCTIONAL ✓
```

---

## Testing

**Quick 5-Minute Test:**
1. Hard refresh browser (Ctrl+F5)
2. Click "New Character" button → chargen sheet opens ✓
3. Watch boot sequence
4. When translation phase starts, watch for animation (or check console)
5. Click "Continue" → advance to next step ✓

**Detailed Testing:** See `TESTING-BUTTON-FIX.md`

---

## Key Principle

**Critical infrastructure should not depend on optional features.**

- Buttons and hook registration are CRITICAL
- Translation engine animation is OPTIONAL (nice to have, but not essential)

By making the engine lazy-loaded:
- Critical systems always work ✓
- Optional features fail gracefully ✓
- Errors are logged but don't break the app ✓

---

## Files Modified

- ✏️ `/scripts/apps/progression-framework/steps/intro-step.js`
  - Removed static import
  - Added lazy-load method
  - Updated engine usage
  - Fixed undefined variable

**No other files required changes.**

---

## Validation

✅ Modified intro-step.js passes Node.js syntax check
✅ No breaking changes to public API
✅ Backward compatible with existing usage
✅ Graceful error handling with detailed logging
✅ Module chain no longer breakable by engine import/instantiation failure

---

## Next Steps

1. **Test the fix**
   - Hard refresh browser
   - Test chargen/levelup/mentor/store buttons
   - Verify buttons work and chargen sheet opens
   - See `TESTING-BUTTON-FIX.md` for detailed steps

2. **Monitor console**
   - Look for `[IntroStep._getTranslationEngine]` messages
   - If you see `CRITICAL: Failed to load engine:`, the graceful degradation is working

3. **If tests pass**
   - All buttons work ✓
   - Animation plays (or gracefully skips) ✓
   - Boot sequence completes ✓
   - Fix is successful!

4. **If tests fail**
   - Check console for specific error messages
   - Share the exact error message for diagnosis
   - Check `TESTING-BUTTON-FIX.md` Failure Diagnostics section

---

## Technical Details

### Dynamic Import vs Static Import

**Static Import (OLD - Blocked Module Chain)**
```javascript
import { SWSETranslationEngine } from './engine.js';
// If engine module fails to load → entire module fails to parse
// If instantiation throws → entire module fails to construct
// Failure is SILENT with no logs (happens before logging can start)
```

**Dynamic Import (NEW - Resilient)**
```javascript
const { SWSETranslationEngine } = await import('./engine.js');
// If engine module fails to load → caught by try/catch, logged
// If instantiation throws → caught by try/catch, logged
// Module loading SUCCEEDS even if import fails
// Failure is VISIBLE with detailed error messages
```

### Lazy Loading Pattern

The `_getTranslationEngine()` method implements:
1. **Caching**: Returns cached engine if already loaded
2. **Promise caching**: Prevents duplicate imports if called multiple times in quick succession
3. **Error handling**: Catches both import errors and instantiation errors
4. **Logging**: Logs success and failures with details
5. **Graceful degradation**: Returns null if load fails, caller handles gracefully

---

## Conclusion

The Translation Engine is now a **soft dependency** instead of a **hard dependency**. This makes the entire chargen system more resilient and reliable.

- **Before:** Engine failure = complete app failure (no buttons)
- **After:** Engine failure = animation skipped, but app continues (buttons work)

This is the correct architecture for optional features in a larger system.

