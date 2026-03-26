# Module Chain Fix — Translation Engine Lazy Loading

## Problem Identified

**Symptom:** All chargen/levelup/mentor/store buttons became non-functional after Translation Engine implementation.

**Root Cause:** Static import of SWSETranslationEngine at module load time in intro-step.js was breaking the entire dependency chain:

```
chargen-sheet-hooks.js
  → progression-entry.js
    → chargen-shell.js
      → intro-step.js (imports SWSETranslationEngine)
        → engine load fails silently
          → hook registration never happens
            → all buttons non-functional
```

If the engine import OR instantiation failed, the entire chain would break silently with NO console errors.

---

## Solution Implemented

Convert static import to **lazy-loaded dynamic import** using `import()`:

### Before (Static Import — Module Chain Blocker)
```javascript
// Line 28 — Static import at module parse time
import { SWSETranslationEngine } from '../engine/swse-translation-engine.js';

// Line 140 — Instantiation at class construction time
this._translationEngine = new SWSETranslationEngine();
```

**Problem:** If this import/instantiation fails, the entire module fails to load.

### After (Dynamic Import — Deferred Until Use)
```javascript
// Line 28 — Removed static import

// Line 141 — Initialize as null
this._translationEngine = null;
this._engineLoadPromise = null;  // Cache promise to avoid duplicate imports

// New method: Lazy load engine on first use
async _getTranslationEngine() {
  // Return cached if already loaded
  if (this._translationEngine) return this._translationEngine;

  // Await in-progress load if one exists
  if (this._engineLoadPromise) return await this._engineLoadPromise;

  // First time: do the dynamic import with error handling
  this._engineLoadPromise = (async () => {
    try {
      const { SWSETranslationEngine } = await import('../engine/swse-translation-engine.js');
      this._translationEngine = new SWSETranslationEngine();
      console.log('[IntroStep._getTranslationEngine] Engine loaded successfully');
      return this._translationEngine;
    } catch (err) {
      console.error('[IntroStep._getTranslationEngine] CRITICAL: Failed to load engine:', err);
      return null;  // Graceful failure, doesn't break module chain
    }
  })();

  return await this._engineLoadPromise;
}
```

**Benefit:** If the engine fails to load, the error is caught and logged, but the module chain continues successfully.

---

## Changes Made

### File: `/scripts/apps/progression-framework/steps/intro-step.js`

1. **Removed static import** (line 28)
   - Changed: `import { SWSETranslationEngine } from '../engine/swse-translation-engine.js';`
   - To: Comment explaining why static import was removed

2. **Initialized engine as null** (line 141)
   - `this._translationEngine = null;`
   - `this._engineLoadPromise = null;`

3. **Added lazy-load method** (new method after constructor)
   - `async _getTranslationEngine()`
   - Handles import errors gracefully
   - Caches promise to prevent duplicate imports

4. **Updated `_runTranslationViaEngine()` method** (line 692)
   - Now calls: `const engine = await this._getTranslationEngine();`
   - Checks if engine is null (load failed)
   - Uses `engine` variable instead of `this._translationEngine`

5. **Fixed undefined `sessionToken` reference** (line 594)
   - Changed: `await this._runTranslationViaEngine(shell, sessionToken);`
   - To: `await this._runTranslationViaEngine(shell, this._sessionToken);`

6. **Updated afterRender() check** (line 540)
   - Removed check for `this._translationEngine` (no longer synchronous)
   - Now just checks `this._workSurfaceEl`

---

## Why This Fixes the Button Problem

1. **intro-step.js now loads successfully** even if the engine module fails
2. **chargen-shell.js imports successfully** (dependency satisfied)
3. **progression-entry.js imports successfully** (dependency satisfied)
4. **chargen-sheet-hooks.js imports successfully** (dependency satisfied)
5. **Hook registration code executes** (all buttons work again)
6. **Engine loads on first use** during translation phase (lazy init)
7. **If engine fails, graceful degradation** (animation skipped, but app continues)

---

## Expected Behavior After Fix

### Scenario 1: Engine loads successfully
```
[chargen button clicked]
  → hooks are registered ✓
  → chargen sheet opens ✓
  → intro sequence runs ✓
  → translation phase loads engine ✓
  → masked-reveal animation plays ✓
  → boot sequence completes ✓
```

### Scenario 2: Engine fails to load
```
[chargen button clicked]
  → hooks are registered ✓
  → chargen sheet opens ✓
  → intro sequence runs ✓
  → translation phase tries to load engine ✗
  → [IntroStep._getTranslationEngine] CRITICAL: Failed to load engine: [error details]
  → animation skipped, sequence continues ✓
  → boot sequence completes without animation ✓
```

---

## Testing Checklist

- [ ] Hard refresh browser
- [ ] Verify chargen/levelup/mentor/store buttons are responsive again
- [ ] Click chargen button → verify sheet opens
- [ ] Advance through intro sequence
- [ ] Verify masked-reveal animation plays (or gracefully skips if engine unavailable)
- [ ] Check console for any error messages starting with `[IntroStep._getTranslationEngine]`
- [ ] Verify Continue button works and transitions to next step

---

## Root Cause Analysis

The original implementation had a **hard dependency** on the Translation Engine being available at module load time. This is a fragile pattern in ES6 modules:

```javascript
// FRAGILE ✗
import { SWSETranslationEngine } from './engine.js';  // If this fails, entire module fails
class IntroStep {
  constructor() {
    this._engine = new SWSETranslationEngine();  // If this throws, module construction fails
  }
}
```

The fix uses a **soft dependency** pattern:

```javascript
// ROBUST ✓
class IntroStep {
  async _getTranslationEngine() {
    try {
      const { SWSETranslationEngine } = await import('./engine.js');  // Isolated failure
      return new SWSETranslationEngine();
    } catch (err) {
      console.error('Engine failed:', err);  // Logged, but doesn't break app
      return null;
    }
  }
}
```

---

## Key Design Principle

**Critical infrastructure should not depend on optional features.**

The button registration hooks are critical. The translation engine is an enhancement. By deferring the engine import until it's actually needed (lazy loading), we ensure that:

1. Critical systems always load (buttons work)
2. Optional features fail gracefully (animation degrades)
3. Errors are visible (logged) but not fatal
4. The app remains functional even if the enhancement fails

This is the opposite of the original approach, which made the translation engine a **blocking dependency** of the entire chargen system.

---

## Syntax Validation

✓ intro-step.js passes Node.js syntax check
✓ No breaking changes to public API
✓ Backward compatible with existing usage patterns
✓ Graceful error handling with detailed logging

