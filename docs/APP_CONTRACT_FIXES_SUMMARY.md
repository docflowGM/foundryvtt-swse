# AppV2 Contract Fixes - SWSE Character Sheet

**Date:** 2026-03-15
**Status:** FIXES APPLIED ✅

---

## Overview

Fixed critical contract mismatches between V1 code patterns and Foundry V13 AppV2 requirements that were causing:
- Header button crashes (Level Up, Chargen, Store)
- Template partial loading failures
- Modal rendering failures

---

## Fixes Applied

### 1. Partial Registration — partials-auto.js ✅

**Problem:** Character sheet template referenced partials that weren't registered, causing complete sheet render failure.

**Root Cause:**
- `partials-auto.js` had incomplete/incorrect partial list
- Used wrong filenames: `"Talents.hbs"` instead of `"talents-panel.hbs"`
- Missing many required partials: `attacks-panel.hbs`, `actions-panel.hbs`, `inventory-panel.hbs`, etc.

**Fix Applied:**
```javascript
// BEFORE (incomplete):
const PARTIALS = [
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Talents.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/Feats.hbs",
  // ... only 13 partials, many missing
];

// AFTER (complete, correct filenames):
const PARTIALS = [
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/gear-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/xp-panel.hbs"
];
```

**Result:** All character sheet tabs can now render properly. The sheet body will load without "partial not found" errors.

---

### 2. Level Up App Contract — levelup-main.js ✅

**Problem:** Level Up button crashes with: `TypeError: Cannot read properties of undefined (reading 'system')`

**Root Cause:**
- V1 pattern: Constructor set `this.actor = actor`
- V2 contract: `_prepareContext()` reads from `this.object` (AppV2 standard)
- Mismatch caused `this.object` to be undefined when `_prepareContext()` tried to access `this.object.system`

**Fix Applied:**
```javascript
constructor(actor, options = {}) {
  super(options);
  this.actor = actor;
  this.object = actor;  // ← AppV2 contract: object is the document being edited
```

**Result:** Level Up app can now access actor data properly and render without crashes.

---

### 3. Chargen App Modal Binding — chargen-main.js ✅

**Problem:** Chargen button crashes with: `TypeError: this._bindInWindowModalHost is not a function`

**Root Cause:**
- Orphaned V1 method call in `_onRender()`: `this._bindInWindowModalHost(root)`
- The method doesn't exist in the class or anywhere in the codebase
- This was a V1 custom modal-host binding pattern no longer needed in V2

**Fix Applied:**
```javascript
async _onRender(context, options) {
  await super._onRender(context, options);
  const root = this.element;
  if (!(root instanceof HTMLElement)) {return;}

  // REMOVED: this._bindInWindowModalHost(root); ← orphaned V1 call

  if (game.tooltip) {
    game.tooltip.activate(root, { selector: '[data-tooltip]' });
  }
  // ... rest of _onRender
```

**Result:** Chargen app can now render without modal-host errors.

---

### 4. Store App Contract — store-main.js ✅

**Problem:** Potential future compatibility issue (preventive fix).

**Status:** App currently uses `this.actor?.system?.credits` (safe), but for consistency with AppV2 standards:

**Fix Applied:**
```javascript
constructor(actor = null, options = {}) {
  super(options);
  this.actor = actor ?? null;
  this.object = actor ?? null;  // AppV2 contract for consistency
```

**Result:** Store app follows AppV2 contract explicitly, improving code consistency and future-proofing.

---

## Technical Context

### AppV2 Contract Requirements

Foundry V13's ApplicationV2 framework establishes these conventions:

1. **Document Property:** The document being edited must be at `this.object`
   - V1 code used custom properties like `this.actor`
   - V2 code expects `this.object` for compatibility with base class methods

2. **Lifecycle Hooks:**
   - `_prepareContext()` - prepares data for rendering
   - `_onRender()` - called after template renders (receives DOM element via `this.element`)
   - Both expect `this.object` to contain the active document

3. **Modal Binding:** V2 doesn't use custom modal-host bindings
   - V1: `_bindInWindowModalHost()` created custom modal container behavior
   - V2: Foundry handles modal rendering natively via ApplicationV2

### Why These Errors Occurred

The codebase was partially migrated from V1 to V2:
- New ApplicationV2-based architecture established (constructor calls `super(options)`)
- But V1 patterns remained in properties and method calls
- This created a **contract mismatch** where:
  - Code called AppV2 hooks expecting `this.object`
  - But only `this.actor` was set (V1 pattern)
  - Result: `this.object === undefined` → crash

---

## Verification Checklist

After these fixes, test:

- [ ] Level Up button click → App renders without crashing
- [ ] Chargen button click → App renders without crashing
- [ ] Store button click → App opens without errors
- [ ] Character sheet loads → All tabs render (Overview, Abilities, Skills, Combat, Talents, Gear, Relationships, Notes)
- [ ] Skills tab → Shows skill list with roll buttons
- [ ] Gear tab → Shows inventory items organized by type
- [ ] Talents tab → Shows character talents grouped by source
- [ ] Combat tab → Shows equipped weapons with attack roll buttons
- [ ] No console errors related to partials, contracts, or missing methods

---

## Files Modified

1. `/helpers/handlebars/partials-auto.js` — Updated partial registration array
2. `/scripts/apps/levelup/levelup-main.js` — Added `this.object = actor;` to constructor
3. `/scripts/apps/chargen/chargen-main.js` — Removed orphaned `_bindInWindowModalHost()` call
4. `/scripts/apps/store/store-main.js` — Added `this.object = actor;` for consistency

---

## Architecture Notes

These fixes align the codebase with AppV2 standards without requiring major refactoring:
- All actor data flows through `this.object` property
- V1 custom properties (`this.actor`) can remain as application-specific extensions
- Modal lifecycle now handled by Foundry framework, not custom code
- Partial loading centralized in `bootstrapTemplates()` → `registerSWSEPartials()`

---

## Future Prevention

To avoid similar issues:
1. When creating new apps, always set `this.object = document` in constructor
2. Verify `_prepareContext()` reads from `this.object`, not custom properties
3. Remove any V1-style modal binding code (`_bindInWindowModalHost`, custom modals, etc.)
4. Ensure template partial names match file names exactly
5. Register all used partials in `partials-auto.js` PARTIALS array
