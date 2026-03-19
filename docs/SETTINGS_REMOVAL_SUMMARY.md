# PROGRESSION SHELL — SETTING REMOVAL & CONSOLIDATION

**Date:** 2026-03-17  
**Status:** ✅ COMPLETE

## Summary

The new progression framework (with intro splash screen) is now the **ONLY** character generation and level-up system. The legacy `useNewProgressionShell` setting has been removed, and all code paths have been consolidated to use the new ProgressionShell exclusively.

## Changes Made

### 1. levelup-main.js
**File:** `/scripts/apps/levelup/levelup-main.js`  
**Change:** Removed setting check from `showForActor()` method

**Before:**
```javascript
static async showForActor(actor) {
  // Feature flag: route to new ProgressionShell when enabled
  if (game.settings?.get?.('foundryvtt-swse', 'useNewProgressionShell')) {
    const { LevelupShell } = await import('...');
    return LevelupShell.open(actor);
  }
  // Legacy fallback (now removed)
  const dialog = new SWSELevelUpEnhanced(actor);
  dialog.render({ force: true });
  return dialog;
}
```

**After:**
```javascript
static async showForActor(actor) {
  // NEW SHELL IS NOW THE ONLY ACTIVE PATH
  const { LevelupShell } = await import('...');
  return LevelupShell.open(actor);
}
```

### 2. chargen-shell.js
**File:** `/scripts/apps/progression-framework/chargen-shell.js`  
**Change:** Updated header documentation

**Before:**
```
Character generation entry point for the new progression framework.
Replaces: scripts/apps/chargen/chargen-main.js (legacy monolithic chargen)
(Activated when useNewProgressionShell setting is true)
```

**After:**
```
Character generation entry point for the new progression framework.
Sole authority for character generation (legacy monolithic chargen decommissioned)
```

### 3. levelup-shell.js
**File:** `/scripts/apps/progression-framework/levelup-shell.js`  
**Change:** Updated header documentation

**Before:**
```
Level-up entry point.
Replaces: scripts/apps/levelup/levelup-main.js
(Activated when useNewProgressionShell setting is true)
```

**After:**
```
Level-up entry point.
Sole authority for level-up progression (legacy levelup-main decommissioned)
```

### 4. init.js
**File:** `/scripts/core/init.js`  
**Change:** Removed setting registration

**Before:**
```javascript
// Progression Framework feature flag
// When enabled, CharacterGenerator.open() and LevelUpMain.open() route to
// the new ProgressionShell instead of the legacy shells.
if (!game.settings.settings.has("foundryvtt-swse.useNewProgressionShell")) {
  game.settings.register("foundryvtt-swse", "useNewProgressionShell", {
    name: "Use New Progression Shell (Beta)",
    hint: "Enable the new unified character progression shell. Requires restart.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}
```

**After:**
```
[Setting registration removed entirely]
```

## Verification

✅ **chargen-main.js** — Already routed to ChargenShell exclusively (no changes needed)  
✅ **levelup-main.js** — Updated to route to LevelupShell exclusively  
✅ **chargen-shell.js** — Documentation updated, now sole authority  
✅ **levelup-shell.js** — Documentation updated, now sole authority  
✅ **init.js** — Setting registration removed  
✅ **No remaining references** — All checks for setting removed

## Canonical Progression Paths

### Character Generation
```
CharacterGenerator.open(actor)
  ↓
ChargenShell.open(actor)
  ↓
Intro → Species → Attribute → Class → ... → Summary
```

### Level Up
```
SWSELevelUpEnhanced.showForActor(actor)
  ↓
LevelupShell.open(actor)
  ↓
Class → [Attribute] → [Skills] → ... → Confirm
```

## Impact

- **No more dual code paths** — Single implementation pathway for all progression
- **Cleaner system** — Removed feature flag infrastructure
- **Better performance** — No setting checks at runtime
- **Intro splash screen is mandatory** — All characters now experience the Versafunction Datapad boot sequence
- **Full progression consistency** — Same mentor system, validation, and mentorship across all progression types

## Notes for Future Development

If legacy chargen code (scripts/apps/chargen/) needs to remain for backward compatibility or reference, it can stay as-is but will never be invoked. The entry point (chargen-main.js) now always routes to ProgressionShell.

**Status: READY FOR DEPLOYMENT**
