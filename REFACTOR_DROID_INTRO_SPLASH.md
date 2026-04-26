# Droid Intro Splash Screen Refactor — Creation Mode Fork

## Summary
Refactored the droid intro splash screen to present two primary action choices at the entry point:
- **"Build Custom"** — Start droid creation from scratch (custom degree selection path)
- **"Select Model"** — Import a published standard droid model (standard model path)

This creates a clean architectural fork from the splash screen entry point, setting `session.droidContext.creationMode` early so the shell can compute different step orders immediately.

## Files Modified

### 1. `intro-work-surface.hbs` (Template)
**Location:** `templates/apps/progression-framework/steps/intro-work-surface.hbs`

**Changes:**
- Updated droid-v2 splash variant (lines 363-379)
- When `isComplete` and `showDroidCreationModeChoice` are true:
  - Hide the single "Register New Unit" button
  - Show two primary action buttons:
    - "Build Custom" (data-role="droid-build-custom")
    - "Select Model" (data-role="droid-select-standard")
  - Buttons have appropriate icons and descriptions

**Logic:**
```handlebars
{{#if showDroidCreationModeChoice}}
  {{!-- Two primary action buttons for creation mode --}}
  <button class="btn primary" ... data-role="droid-build-custom">
    Build Custom
  </button>
  <button class="btn primary" ... data-role="droid-select-standard">
    Select Model
  </button>
{{else if showPregenerated}}
  {{!-- Traditional template selection (if not droid) --}}
{{/if}}
```

### 2. `droid-splash-v2-controller.js`
**Location:** `scripts/apps/progression-framework/steps/droid-splash-v2-controller.js`

**Changes:**
- Added `showDroidCreationModeChoice: complete` flag to buildDroidSplashV2Context()
- This flag controls whether the template displays the two creation mode buttons

**Behavior:**
- During animation (isComplete = false): Single progress button disabled
- After animation (isComplete = true): Two action buttons visible

### 3. `intro-step.js`
**Location:** `scripts/apps/progression-framework/steps/intro-step.js`

**Changes:**
- Added two new button handlers in activateListeners() method (lines 825-873):

#### Handler: `droid-build-custom`
- Sets `session.droidContext.creationMode = 'custom'`
- Triggers `_transitionToNextStep()`
- Logs action with swseLogger

#### Handler: `droid-select-standard`
- Sets `session.droidContext.creationMode = 'standard-model'`
- Triggers `_transitionToNextStep()`
- Logs action with swseLogger

**Error handling:**
- Guards against double-click via `_transitionInProgress` flag
- Proper error logging and state cleanup on failure

## Architecture Flow

### Before (Single Path)
```
Intro Splash → Continue → Single droid builder path
              (mode unknown until later)
```

### After (Forked Path)
```
Intro Splash
    ↓
[Boot animation complete]
    ↓
┌─────────────────────┬──────────────────────┐
│                     │                      │
Build Custom      Select Model
   ↓                  ↓
creationMode:    creationMode:
'custom'         'standard-model'
   ↓                  ↓
Shell computes different step orders
   ↓                  ↓
Custom Path:         Standard Path:
- droid-degree       - droid-model
- droid-builder      - droid-builder
- attribute          - class
- class (if eligible)- rest...
- rest...
```

## Session State Changes

When user clicks a button, the intro step modifies:
```javascript
session.droidContext.creationMode = 'custom' || 'standard-model'
```

This value is read by `DroidSubtypeAdapter.contributeActiveSteps()` to compute the appropriate step order.

## Router Configuration

The routing logic was already in place in `default-subtypes.js`:

```javascript
// DroidSubtypeAdapter.contributeActiveSteps()
const creationMode = session.droidContext?.creationMode || 'custom';

if (creationMode === 'standard-model') {
  // Splash → Model Selection → Systems → Class → rest
  prioritized = ['intro', 'droid-model', 'droid-builder', 'class'];
} else {
  // Splash → Degree → Systems → Attributes → rest
  prioritized = ['intro', 'droid-degree', 'droid-builder', 'attribute'];
}
```

## Testing Checklist

- [ ] Droid intro splash renders with boot animation
- [ ] After animation completes, two action buttons appear
- [ ] "Build Custom" button click sets creationMode='custom'
- [ ] "Select Model" button click sets creationMode='standard-model'
- [ ] Shell correctly routes to droid-degree step for custom
- [ ] Shell correctly routes to droid-model step for standard-model
- [ ] Both paths complete progression successfully
- [ ] Session state properly maintains creationMode through all steps
- [ ] Buttons are disabled during animation
- [ ] Buttons are only visible in droid intro (not actor intros)

## Impact Analysis

### Modified Behavior
- Droid intro splash now branches into two distinct progression paths at entry point
- Standard droid model path skips attribute generation (uses published scores)
- Custom droid path includes full attribute selection

### Backward Compatibility
- Actor intros unchanged (still show single "Continue" button)
- All other progression paths unchanged
- Follower subtypes unaffected

### Related Files Not Modified
- `droid-degree-step.js` — No changes needed
- `droid-model-step.js` — No changes needed
- `droid-builder-step.js` — Already mode-aware
- `class-step.js` — Already detects standard model
- `default-subtypes.js` — Router already in place (no changes needed)
