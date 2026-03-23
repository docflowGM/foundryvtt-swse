# Chargen Button Fixes - Summary

## Problem

When clicking the "Chargen" button on the character sheet header, the button appeared to do nothing. The chargen window would not open.

## Root Causes Identified

### Issue 1: Async Event Handler (CRITICAL)
The chargen button's `onClick` handler was defined as `async function`, which doesn't work properly with Foundry's event system. Event handlers in UI frameworks must be synchronous to properly capture and execute.

**Code Before:**
```javascript
async function onClickChargen(app) {
  ...
  await launchProgression(actor);
}
```

**Why This Failed:**
- Async event handlers can cause the handler to not be called at all
- The event handler framework may not properly await the async function
- Other UI frameworks' event systems don't support async onclick handlers

### Issue 2: Window Visibility (SECONDARY)
Even if the button worked, the chargen window would open but not appear visually because it wasn't brought to the front after rendering. The window could be hidden behind other UI elements.

## Solutions Implemented

### Fix 1: Synchronous Event Handler with Proper Error Handling

**Commit:** `b90a8724`

**File:** `scripts/infrastructure/hooks/chargen-sheet-hooks.js`

**Changes:**
```javascript
// Changed from async to synchronous
function onClickChargen(app) {
  ...
  // Launch asynchronously without blocking the event handler
  launchProgression(actor).catch(err => {
    SWSELogger.error('[Chargen Header] Error launching progression:', err);
    ui?.notifications?.error?.(`Failed to open chargen: ${err.message}`);
  });
}
```

**Key Improvements:**
- Handler is now synchronous (required by event system)
- Uses fire-and-forget pattern for the async operation
- Includes error handling with .catch() to report failures
- Matches pattern used by levelup and store buttons
- Added comprehensive debug logging to track registration and clicks

### Fix 2: Ensure Chargen Window is Visible After Rendering

**Commit:** `2ac996b7`

**File:** `scripts/apps/progression-framework/shell/progression-shell.js`

**Changes:**
```javascript
static async open(actor, mode = 'chargen', options = {}) {
  // ... initialization ...

  app.render({ force: true });

  // Bring the shell to front after render completes
  await new Promise(resolve => setTimeout(() => {
    try {
      app.bringToTop?.();
      swseLogger.debug('[ProgressionShell.open] Shell brought to top after render');
    } catch (err) {
      swseLogger.warn('[ProgressionShell.open] Error bringing shell to top:', err.message);
    }
    resolve();
  }, 0));

  return app;
}
```

**Key Improvements:**
- Ensures chargen window appears on top of other windows
- Uses setTimeout(0) to defer bringToTop until after render cycle
- Prevents window from being hidden behind actor sheet or other UI
- Includes error handling and logging

## Testing Checklist

After deploying these fixes, verify:

- [ ] Click the Chargen button on the character sheet header
- [ ] The chargen window appears visibly on screen (not hidden)
- [ ] The window is in the foreground (not behind other windows)
- [ ] The intro animation plays through all 6 phases without exiting early
- [ ] The animation doesn't block the UI (fire-and-forget pattern)
- [ ] Console shows logging: `[Chargen Hook] Adding chargen button to character...`
- [ ] Console shows logging: `[Chargen Header] Opening Chargen for: {actor name}`
- [ ] If an error occurs, it's properly reported in notifications

## Expected Console Output

```
[Chargen Hook] Adding chargen button to character "Chargen Test"
[Chargen Header] Opening Chargen for: Chargen Test
[Progression Entry] Launching for actor: Chargen Test (character)
[Progression Entry] Actor sheet centered before minimize →...
[Progression Entry] Actor sheet minimized → clearing viewport for chargen
[IntroStep.onStepEnter] Entering intro step
[IntroStep.afterRender] Starting animation sequence
[IntroStep.startIntroSequence] Entering phase 1/6: SYSTEMS CHECK
[IntroStep.startIntroSequence] Entering phase 2/6: NETWORK SCAN
[IntroStep.startIntroSequence] Entering phase 3/6: IDENTITY QUERY
[IntroStep.startIntroSequence] Entering phase 4/6: IDENTITY UNKNOWN
[IntroStep.startIntroSequence] Entering phase 5/6: OVERRIDE AUTHORIZED
[IntroStep.startIntroSequence] Rendering shell to prepare translation container...
[IntroStep.startIntroSequence] Render cycle complete, translation container should now be in DOM
[IntroStep.startIntroSequence] About to call _runTranslation...
[ProgressionShell.open] Shell brought to top after render
```

## Impact

- **Scope:** Minimal - only affects chargen button functionality and window visibility
- **Risk:** Very low - uses standard Foundry patterns and APIs
- **Breaking Changes:** None
- **Performance:** Negligible - minimal overhead from window z-index adjustment

## Commits

1. **2ac996b7** - Fix: Bring chargen shell to front after render to ensure visibility
2. **b90a8724** - Fix: Make chargen button onClick handler synchronous with proper error handling

## Deployment Notes

Both fixes are required for complete functionality:
- Fix 1 ensures the button actually launches chargen
- Fix 2 ensures the chargen window is visible when it launches

Deploy both commits together.
