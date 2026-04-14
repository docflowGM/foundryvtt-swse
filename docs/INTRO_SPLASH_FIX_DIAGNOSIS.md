# Intro Splash Regression Fix — Pre-Edit Diagnosis

## Root Cause Identified

**Primary blocker:** `ReferenceError: updateProgressUI is not defined` at `intro-step.js:1052`

When `runBootSequence()` executes, it calls `updateProgressUI(els, line.progress || (i + 1), 20)` which is undefined. This throws an exception that causes:
- Boot sequence animation to abort
- Exception caught silently
- Intro marked as complete immediately (`this._complete = true`)
- UI jumps straight to final frame

## Current Regressions

1. **Boot sequence skips to end** — Exception in runBootSequence causes immediate completion
2. **Success state not green** — CSS is correct (44, 255, 111) but may not be applied correctly
3. **Progress bar at bottom** — Container has `margin: 12px auto 0` instead of centered flex spacing
4. **Action buttons clipped** — Footer padding/height doesn't provide enough space
5. **Final frame not fully translated** — Remaining lines after translation-success may still contain Aurabesh

## Issues Found

### Issue #1: updateProgressUI Undefined
**File:** `intro-step.js:1052`  
**Current:** `updateProgressUI(els, line.progress || (i + 1), 20);`  
**Problem:** Function doesn't exist

**Solution:** Define helper function that:
- Updates progress segments (mark active ones)
- Updates progress percentage text
- Can be called once per boot line

### Issue #2: Progress Bar Positioning
**File:** `splash.css:390-399`  
**Current:** `margin: 12px auto 0; width: min(100%, 760px);`  
**Problem:** Not vertically centered; pushed to bottom

**Solution:** Adjust flex positioning in panel or progress-container to center it

### Issue #3: Footer Button Clipping
**File:** `intro-work-surface.hbs:104-139` and `splash.css:577-586`  
**Current:** Footer `height: 48px` with `padding: 0 20px 20px 20px`  
**Problem:** Buttons exceed available height

**Solution:** Increase footer height and/or adjust padding/margins to show full buttons

### Issue #4: Text Translation Coverage
**File:** `intro-step.js:1089-1093`  
**Current:** Only line with `translate: true` triggers translation swap  
**Problem:** Remaining lines may still show as Aurabesh

**Solution:** Ensure all post-translation lines have `localized: true` (they do in BOOT_LINES)

### Issue #5: Success Color Application
**File:** `splash.css` defines success colors correctly  
**Problem:** Color classes may not be applied if state classes not set correctly

**Solution:** Verify `setToneClasses()` applies correct classes for SUCCESS tone

## Files to Modify

1. **scripts/apps/progression-framework/steps/intro-step.js**
   - Add `updateProgressUI` helper function
   - Ensure it's called correctly in boot sequence

2. **styles/progression-framework/splash/splash.css**
   - Adjust progress-container centering
   - Increase footer height and adjust padding

3. **templates/apps/progression-framework/steps/intro-work-surface.hbs**
   - May need footer layout adjustments (if CSS-only fix insufficient)

## Implementation Strategy

1. **Define updateProgressUI()** — Simple helper that updates segments and progress text
2. **Fix progress bar centering** — Use flex properties to center in panel
3. **Fix footer height** — Increase from 48px to accommodate button sizes
4. **Verify translation mapping** — Check BOOT_LINES has `localized: true` for post-translation lines
5. **Test color classes** — Verify success state applies green styling

## Expected Outcome

- Boot sequence animates through 8 phases visibly
- Each phase waits for duration before advancing
- Translation occurs exactly once on phase 5 (LINGUISTIC MATRIX)
- Final phase shows in English/basic with blinking cursor
- Progress bar centered in splash body
- Action buttons fully visible at bottom
- Success state displays in bright green
