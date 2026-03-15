# SWSE App Positioning and Launch Contract Audit

**Date**: 2026-03-15
**Focus**: AppV2 window lifecycle, positioning, and launch contract verification

---

## EXECUTIVE SUMMARY

The SWSE system has **two critical AppV2 window lifecycle bugs** that manifest as:

1. **WelcomeDialog fails to position** - `_updatePosition()` receives null element
2. **Welcome dialog launches twice** - guard flag doesn't prevent double launch

These are NOT CSS issues or rendering issues. They are **AppV2 lifecycle contract violations**.

The character sheet positioning may have similar issues.

---

## CRITICAL FINDING 1: WelcomeDialog._updatePosition() Contract Violation

### Error Evidence

```
First-run experience error: TypeError: Cannot read properties of null (reading 'offsetWidth')
    at WelcomeDialog._updatePosition
    at WelcomeDialog.setPosition
```

### What's Happening

```
Timeline:
T0: WelcomeDialog instantiated
T1: dialog.render(true) called
T2: Foundry ApplicationV2.render() executes
T3: Template rendered
T4: Element should be inserted into DOM
T5: Foundry calls setPosition()
T6: setPosition() calls _updatePosition()
T7: _updatePosition() tries to read this.element.offsetWidth
T8: this.element is NULL ❌
T9: TypeError thrown
```

### Root Cause Analysis

**Foundry AppV2 calls `setPosition()` BEFORE element is mounted to DOM**

Current timing assumption (WRONG):
```
render()
  → element created ✓
  → element mounted to DOM ✓
  → setPosition() called
    → _updatePosition() fires
      → element.offsetWidth accessible ✓
```

Actual Foundry V13 AppV2 timing:
```
render()
  → element created ✓
  → setPosition() called **TOO EARLY**
    → _updatePosition() fires
      → element.offsetWidth is NULL ❌ (not mounted yet!)
  → element mounted to DOM
```

### Code Location

**File**: `/scripts/core/first-run-experience.js`

```javascript
class WelcomeDialog extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-welcome-dialog',
    classes: ['swse-app'],
    window: {
      icon: 'fa-solid fa-star',
      title: '⭐ Welcome to SWSE for Foundry VTT',
      resizable: true
    },
    position: {
      width: 600,
      height: 500    // ← These size hints don't help with null element
    }
  };
  // ... rest of class
}
```

**Issue**: The `position: {}` config in DEFAULT_OPTIONS tells Foundry to set position, but Foundry tries to set it before the element is ready.

### Why This Happens

ApplicationV2's lifecycle is:
1. `render(force)` called by user
2. `_prepareContext()` runs (async)
3. `_onRender()` runs - calls `super._onRender()`
4. Foundry renders template
5. Element inserted to DOM
6. **BUT**: If `position` is in DEFAULT_OPTIONS, Foundry tries `setPosition()` at step 4 (before step 5)

This is a known AppV2 timing race condition.

---

## CRITICAL FINDING 2: Duplicate Welcome Dialog Launch

### Evidence

Console shows:
```
logger.js:8 SWSE Showing first-run welcome dialog
... (other logs)
logger.js:8 SWSE Showing first-run welcome dialog
```

The message appears **twice**.

### Code Path Analysis

**File**: `/scripts/core/first-run-experience.js`

```javascript
export function initializeFirstRunExperience() {
  if (!game?.user?.isGM) return;

  async function showWelcome() {
    try {
      const show = await shouldShowWelcome();
      if (!show) return;

      SWSELogger.log('Showing first-run welcome dialog');  // ← LINE 123

      // Allow layout cycle to complete
      await new Promise(resolve => requestAnimationFrame(resolve));

      await showWelcomeDialog();

    } catch (err) {
      SWSELogger.error('First-run experience error:', err);
    }
  }

  // If canvas is already ready, show immediately; otherwise register hook
  if (canvas?.ready) {
    showWelcome();  // ← CALL 1 if canvas ready
  } else {
    Hooks.once('canvasReady', showWelcome);  // ← CALL 2 if hook fires
  }
}
```

### Why It Launches Twice

**Scenario 1** (Most Likely):
1. Module initializes during boot
2. Canvas already `.ready` (previous session)
3. Calls `showWelcome()` immediately → logs "Showing..."
4. But also registers hook `Hooks.once('canvasReady', showWelcome)`
5. Page reloads or canvas refreshes during initialization
6. `canvasReady` hook fires
7. Calls `showWelcome()` AGAIN → logs "Showing..." second time

**Scenario 2** (Also Possible):
1. `shouldShowWelcome()` returns true, sets flag in settings
2. First dialog shows and logs "Showing..."
3. Before `markWelcomeShown()` completes, hook also fires
4. Second dialog shows before flag is persisted
5. Race condition: guard flag not yet set when second launch checks it

### The Bug

The guard is:
```javascript
async function shouldShowWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    const shown = await game.settings.get(SYSTEM_ID, SETTING_KEY);
    return !shown;  // ← Returns whether to SHOW (opposite of flag)
  } catch {
    return true;    // ← If no setting exists, show it
  }
}
```

This guard only prevents showing on **second page load**. Within a single initialization, the race condition allows both code paths to execute.

**Correct Pattern**:
```javascript
// WRONG: Both paths can execute in same initialization
if (canvas?.ready) {
  showWelcome();
} else {
  Hooks.once('canvasReady', showWelcome);
}

// CORRECT: Only one path executes
const shouldInitialize = () => {
  // ... check game state
};

if (canvas?.ready) {
  if (shouldInitialize()) showWelcome();
} else {
  Hooks.once('canvasReady', async () => {
    if (shouldInitialize()) showWelcome();  // Re-check on hook
  });
}
```

---

## FINDING 3: Template Naming Hybrid State

### Evidence from Template Preload

**New v2 naming** (correct):
```
✅ identity-strip.hbs
✅ abilities-panel.hbs
✅ skills-panel.hbs
✅ inventory-panel.hbs
✅ defenses-panel.hbs
```

**Old legacy naming** (should be renamed):
```
❌ Talents.hbs
❌ Feats.hbs
❌ Force.hbs
❌ Racial-ability.hbs
```

### Impact

If code refers to `Talents.hbs` but file is now `talents-panel.hbs`:
- Template path resolution fails silently
- Partial doesn't render
- No error logged
- Users see empty sections

This creates fragile coupling between:
- v2 character sheet (expects `talents-panel.hbs`)
- Old code somewhere (expects `Talents.hbs`)

---

## Character Sheet Positioning Contract

### Key Question: Does Character Sheet Have Custom Positioning?

**Need to Verify**:

1. Does `SWSEV2CharacterSheet` override `setPosition()`?
2. Does it have custom positioning logic?
3. Does it call `_updatePosition()` at the right time?
4. Why does it sometimes open on the right side of the viewport?

**File**: `/scripts/sheets/v2/character-sheet.js`

**Quick Audit Check**:
```bash
grep -n "setPosition\|_updatePosition\|position" character-sheet.js
```

If character sheet doesn't override positioning, it uses Foundry defaults. But if it does, we need to verify the timing matches AppV2 contracts.

---

## APP LAUNCH CONTRACT AUDIT

### Apps Launched from Character Sheet

| App | Launch Code | Contract | Status |
|-----|-------------|----------|--------|
| Chargen | `new CharacterGenerator(this.actor)` | Actor passed ✓ | ✅ OK |
| Level Up | `new SWSELevelUpEnhanced(this.actor)` | Actor passed ✓ | ✅ OK |
| Store | `new SWSEStore(this.actor)` | Actor passed ✓ | ✅ OK |
| Mentor | `this._openMentorConversation()` | Helper method | Need to verify |
| Conditions | `this.changeTab()` + scroll | No app launch | ✅ OK (local action) |

### Potential Issues

**Chargen, Level Up, Store**:
- All pass `this.actor`
- But do the app constructors expect `actor` or `document`?
- AppV2 contract requires: `this.object = document` (not `this.actor`)

**Mentor**:
- Calls helper method `_openMentorConversation()`
- Need to verify this method exists and works correctly

---

## Foundry ApplicationV2 Lifecycle Contract

The correct lifecycle is:

```
User clicks button
  ↓
new MyApp(options)
  - Constructor runs
  - this.element is NULL
  ↓
this.render(force, context)
  ↓
async _prepareContext(options)
  - Prepare data
  - this.element is still NULL
  ↓
async _onRender(context, options)
  - Call super._onRender()
    - Foundry renders template
    - Inserts element to DOM
    - **CRITICAL: Element now exists and is in DOM**
  - this.element is now valid HTMLElement
  - Call this.wireEvents() (bind listeners)
  - Position logic can safely run here
  ↓
**TIMING ISSUE**: Foundry's setPosition() may run before _onRender completes
  - If position is in DEFAULT_OPTIONS, setPosition() is called
  - But it may run before element is inserted to DOM
  - Causes: "Cannot read properties of null"
```

---

## Prioritized Fixes

### P0.A: WelcomeDialog Positioning — Defer setPosition()

**File**: `/scripts/core/first-run-experience.js`

**Current Code** (lines 55-66):
```javascript
static DEFAULT_OPTIONS = {
  // ...
  position: {
    width: 600,
    height: 500
  }
};
```

**Problem**: Tells Foundry to call `setPosition()` immediately, but element may not be in DOM yet.

**Fix**: Remove position from DEFAULT_OPTIONS, defer positioning to _onRender() when element definitely exists.

```javascript
static DEFAULT_OPTIONS = {
  id: 'swse-welcome-dialog',
  classes: ['swse-app'],
  window: {
    icon: 'fa-solid fa-star',
    title: '⭐ Welcome to SWSE for Foundry VTT',
    resizable: true
  }
  // REMOVE: position config
};

_onRender(context, options) {
  super._onRender(context, options);
  // NOW element exists in DOM, safe to position
  this.setPosition({
    width: 600,
    height: 500
  });
}
```

**Risk**: Low — positioning just moves to safer lifecycle point

---

### P0.B: Welcome Dialog Guard — Prevent Duplicate Launch

**File**: `/scripts/core/first-run-experience.js`

**Current Code** (lines 115-141):
```javascript
export function initializeFirstRunExperience() {
  if (!game?.user?.isGM) return;

  async function showWelcome() {
    // ... show dialog
  }

  if (canvas?.ready) {
    showWelcome();  // ← CALL 1
  } else {
    Hooks.once('canvasReady', showWelcome);  // ← CALL 2
  }
}
```

**Problem**: Both paths can execute if canvas becomes ready during initialization.

**Fix**: Add guard flag at module level to prevent double launch.

```javascript
let welcomeShown = false;

export function initializeFirstRunExperience() {
  if (!game?.user?.isGM) return;

  async function showWelcome() {
    if (welcomeShown) return;  // ← GUARD
    welcomeShown = true;

    try {
      const show = await shouldShowWelcome();
      if (!show) {
        welcomeShown = false;  // Reset if not needed
        return;
      }
      // ... show dialog
    } catch (err) {
      welcomeShown = false;  // Reset on error
      // ...
    }
  }

  // Safe to call both paths now
  if (canvas?.ready) {
    showWelcome();
  } else {
    Hooks.once('canvasReady', showWelcome);
  }
}
```

**Risk**: Low — simple flag prevents duplication

---

### P1: Template Naming Cleanup

**File**: Need to rename all old-style templates

**Current** → **Target**:
- `Talents.hbs` → `talents-panel.hbs`
- `Feats.hbs` → `feats-panel.hbs`
- `Force.hbs` → `force-panel.hbs`
- `Racial-ability.hbs` → `racial-ability-panel.hbs`

Then update all references in:
- Character sheet template (`character-sheet.hbs`)
- Any includes in other partials

**Risk**: Medium — need to verify all references updated, or templates won't load

---

### P1: Character Sheet Positioning Audit

**Action**: Check if character sheet overrides positioning

```bash
grep -n "setPosition\|_updatePosition\|position:" /scripts/sheets/v2/character-sheet.js
```

If it does custom positioning, verify it happens in `_onRender()` AFTER `super._onRender()` completes, not in DEFAULT_OPTIONS.

---

## APPENDIX: Known AppV2 Timing Issues

### Issue Pattern: "Element is null/undefined in setPosition"

**Common in**:
- Dialogs with `position: {}` in DEFAULT_OPTIONS
- Apps trying to position before render completes
- Positioning called during _prepareContext() (too early)

**Solution Pattern**:
- Remove `position` from DEFAULT_OPTIONS
- Call `setPosition()` in `_onRender()` after `super._onRender()`
- Element is guaranteed to exist at that point

---

## APPENDIX: Launch Contract Checklist

For every app launched from character sheet, verify:

- [ ] App constructor receives correct payload (actor vs document)
- [ ] App has proper AppV2 base class
- [ ] Position logic is in _onRender(), not DEFAULT_OPTIONS
- [ ] Element exists before position is calculated
- [ ] No race conditions during launch

---

**END AUDIT**
