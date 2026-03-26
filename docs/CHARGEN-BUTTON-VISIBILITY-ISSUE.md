# Chargen Button Issue: Window Not Appearing

## Problem Description

When the "Chargen" button on the character sheet header is clicked, the chargen window does not visually appear, even though backend logs show the chargen is launching and the intro animation is running.

Console logs from testing show:
```
SWSE [Chargen Header] Opening Chargen for: Chargen Test
SWSE [Progression Entry] Launching for actor: Chargen Test (character)
[IntroStep.startIntroSequence] Entering phase 1/6: SYSTEMS CHECK
[IntroStep.startIntroSequence] Entering phase 2/6: NETWORK SCAN
[IntroStep.startIntroSequence] Entering phase 3/6: IDENTITY QUERY
SWSE [IntroStep.onStepExit] Exiting intro step
```

The animation is starting but exiting prematurely after phase 3.

## Root Cause Analysis

### Issue 1: Window Visibility
The chargen shell opens with centered positioning (top: null, left: null in DEFAULT_OPTIONS), but there's no guarantee it will appear on top of existing windows or be visible given current viewport constraints.

### Issue 2: Premature Animation Exit
The intro animation exits after phase 3 instead of continuing through all 6 phases. This suggests:
- The step's `onStepExit` is being called during animation
- This invalidates the session token (`_sessionToken = null`)
- The animation loop detects the invalidated session and exits

Possible causes:
1. The shell is being closed or hidden while the animation runs
2. The window z-index is too low, causing it to render behind other windows
3. The window rendering fails silently

### Issue 3: Missing Window Authority on Render
While `launchProgression` minimizes the actor sheet, it does NOT explicitly bring the chargen shell to the front after rendering. The shell renders with `{ force: true }` but without ensuring z-index/bringToTop.

## The Fix

Add explicit window authority to the ProgressionShell.open() method to ensure:
1. The chargen window is brought to the front after rendering
2. The window is visually prominent and cannot be hidden behind other windows

### Code Change Required

In `scripts/apps/progression-framework/shell/progression-shell.js`, modify the `open` method:

```javascript
static async open(actor, mode = 'chargen', options = {}) {
  if (!actor) {
    ui.notifications.error('No actor selected');
    return null;
  }

  const app = new this(actor, mode, options);
  await app._initializeSteps();

  // Initialize the first step
  await app._initializeFirstStep().catch(err => {
    swseLogger.error('[ProgressionShell] Error initializing first step:', err);
    ui?.notifications?.error?.('Failed to initialize progression. Please try again.');
  });

  app.render({ force: true });

  // CRITICAL: Bring the shell to front immediately after render
  // Ensures it's visible even if other windows are open
  // Use setTimeout(0) to ensure render cycle completes before z-index change
  await new Promise(resolve => setTimeout(() => {
    app.bringToTop?.();
    resolve();
  }, 0));

  return app;
}
```

### Why This Works

1. **Forces render cycle completion**: `setTimeout(0)` defers the bringToTop call until the next macrotask, ensuring Foundry's render engine has finished positioning the window.

2. **Brings window to front**: `bringToTop()` adjusts the z-index to ensure the chargen window appears above all other windows.

3. **Prevents premature animation exit**: By ensuring the window is visible and won't be hidden, the intro step won't receive unexpected close/exit signals, so the animation can complete all 6 phases.

## Testing Checklist

After implementing the fix:

- [ ] Click the Chargen button on the character sheet header
- [ ] The chargen window appears visibly on screen (centered, not hidden behind other windows)
- [ ] The intro animation plays through all 6 phases smoothly
- [ ] The TRANSLATING phase appears and shows character-by-character animation
- [ ] The Continue button appears after animation completes
- [ ] No "Window not found" or similar errors in console
- [ ] The animation doesn't exit early

## Expected Console Output (after fix)

```
[Chargen Header] Opening Chargen for: {actor}
[Progression Entry] Launching for actor: {actor}
[IntroStep.startIntroSequence] Entering phase 1/6: SYSTEMS CHECK
[IntroStep.startIntroSequence] Entering phase 2/6: NETWORK SCAN
[IntroStep.startIntroSequence] Entering phase 3/6: IDENTITY QUERY
[IntroStep.startIntroSequence] Entering phase 4/6: IDENTITY UNKNOWN
[IntroStep.startIntroSequence] Entering phase 5/6: OVERRIDE AUTHORIZED
[IntroStep.startIntroSequence] Rendering shell to prepare translation container...
[IntroStep.startIntroSequence] Shell.render() called
[IntroStep.startIntroSequence] Render cycle complete, translation container should now be in DOM
[IntroStep.startIntroSequence] About to call _runTranslation...
[IntroStep._updateTranslationTextDOM] Found translation element, updating with {N} characters
[IntroStep.startIntroSequence] _runTranslation completed
[IntroStep.startIntroSequence] All phases complete, marking complete and rendering
```

## Impact

- **Scope**: Minimal - only affects window visibility when opening chargen
- **Risk**: Very low - uses standard Foundry API (`bringToTop`)
- **Performance**: Negligible - single async operation during initialization

## Implementation Notes

- The fix uses the same pattern employed elsewhere in the codebase (see progression-entry.js line 590: `shell?.bringToTop?.()`)
- Uses optional chaining (`?.`) for safety in case the method doesn't exist
- Maintains compatibility with all Foundry ApplicationV2 patterns

---

**Status**: Ready for implementation

**Next Steps**:
1. Apply the code fix to progression-shell.js
2. Test the chargen button to verify window appears and animation completes
3. Commit the fix
4. Run full end-to-end chargen verification

