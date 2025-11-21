# SWSE Character Sheet - Complete Analysis

This document provides a thorough analysis of character sheet templates and JavaScript implementations.

## Quick Navigation

1. **[Overview](#overview)** - High-level summary
2. **[Template Files](#template-files)** - Where templates are located
3. **[JavaScript Classes](#javascript-classes)** - Sheet class structure
4. **[Button Wiring](#button-wiring)** - Which buttons work and which don't
5. **[Issues Found](#issues-found)** - All broken functionality
6. **[Recommendations](#recommendations)** - How to fix issues

---

## Overview

The SWSE character sheet is composed of multiple layers:
- **Templates**: Handlebars files defining UI structure
- **JavaScript Classes**: `SWSECharacterSheet` (extends `SWSEActorSheetBase`)
- **Event Handling**: Mixed jQuery direct bindings and data-action dispatchers
- **Components**: Separate components like `ForceSuiteComponent` (not integrated)

**Architecture Issues**:
- Two event binding patterns (direct jQuery and data-action dispatcher)
- Some component handlers not integrated into main sheet
- Missing handlers for multiple button types
- Critical bug with undefined variable reference

---

## Template Files

All character sheet templates are in `/home/user/foundryvtt-swse/templates/actors/character/`

| Template | Purpose | Key Buttons |
|----------|---------|------------|
| `character-sheet.hbs` | Main sheet container | Tab navigation |
| `persistent-header.hbs` | Header with resources | Level Up, Chargen, Shop |
| `summary-tab.hbs` | Combat summary | Rollable abilities/skills |
| `abilities-tab.hbs` | Ability scores | Ability checks |
| `skills-tab.hbs` | Skill list | Skill checks |
| `combat-tab.hbs` | Weapons/armor/combat actions | Add weapon/armor, combat actions |
| `force-tab.hbs` | Force powers | Use power, regain power, add/remove suite |
| `talents-tab.hbs` | Talent trees | Select talent, toggle tree, view talent |
| `inventory-tab.hbs` | Equipment/credits | Equipment management |
| `biography-tab.hbs` | Character details | Text input fields |
| `feat-actions-panel.hbs` | Feat-granted actions | Toggle actions, use actions, sliders |

---

## JavaScript Classes

### Main Files
- `/home/user/foundryvtt-swse/scripts/actors/character/swse-character-sheet.js` - Character sheet class (680 lines)
- `/home/user/foundryvtt-swse/scripts/sheets/base-sheet.js` - Base sheet class (827 lines)
- `/home/user/foundryvtt-swse/scripts/components/force-suite.js` - Force suite component (137 lines, unused)

### Class Hierarchy
```
ActorSheet (Foundry base class)
  └─ SWSEActorSheetBase (base-sheet.js)
       └─ SWSECharacterSheet (swse-character-sheet.js)
```

### Method Count
- Base sheet: 18 core methods
- Character sheet: 15 additional methods
- Total: 33 distinct handler/utility methods

---

## Button Wiring

### WORKING Buttons

#### Direct jQuery Bindings
These work via explicit jQuery selectors:
```javascript
.level-up                  → _onLevelUp()              ✓
.character-generator       → _onOpenCharGen()          ✓
.open-store               → _onOpenStore()            ✓
.action-name.rollable     → _onPostCombatAction()     ✓
.feat-action-toggle       → _onToggleFeatAction()     ✓
.feat-action-slider-input → _onUpdateVariableAction() ✓
.feat-action-use          → _onUseFeatAction()        ✓
.talent-enhancement-toggle → _onToggleTalentEnhancement() ✓
```

#### Data-Action Dispatcher
These work via base class action dispatcher:
```javascript
data-action="usePower"         → _onUsePower()         ✓
data-action="regainForcePower" → _onRegainForcePower() ✓
data-action="spendForcePoint"  → _onSpendForcePoint()  ✓ (base-sheet.js)
data-action="restForce"        → _onRestForce()        ✓
data-action="createItem"       → _onCreateItem()       ✓ (base-sheet.js)
data-action="rollAttack"       → _onRollAttack()       ✓ (base-sheet.js)
data-action="rollDamage"       → _onRollDamage()       ✓ (base-sheet.js)
data-action="edit"             → _onItemControl()      ✓ (base-sheet.js)
data-action="delete"           → _onItemControl()      ✓ (base-sheet.js)
```

---

## Issues Found

### ISSUE #1: Critical ReferenceError (Line 379)
**Severity**: CRITICAL - Will crash

```javascript
async _postCombatActionDescription(actionName, actionData) {
  const actionRow = $(event.currentTarget).closest('.combat-action-row');
  //              ^^^^^^^ UNDEFINED - not a parameter!
```

**Impact**: Calling this method crashes with `ReferenceError: event is not defined`

**Solution**: Remove the unused line (actionRow is never used in the function)

---

### ISSUE #2: Missing Force Suite Handlers
**Severity**: CRITICAL - Cannot manage force powers

Templates define buttons:
- `data-action="addToSuite"` - Nowhere in character sheet
- `data-action="removeFromSuite"` - Nowhere in character sheet

**What Exists**: `/scripts/components/force-suite.js` has handlers (lines 121-135)
**What's Missing**: Character sheet never calls `ForceSuiteComponent.attachListeners()`

**Impact**: Force suite buttons don't work. Cannot add/remove powers from active suite.

---

### ISSUE #3: Missing Talent Tree Handlers
**Severity**: CRITICAL - Cannot interact with talent system

Templates define buttons:
- `data-action="selectTalent"` - NO HANDLER
- `data-action="toggleTree"` - NO HANDLER
- `data-action="viewTalent"` - NO HANDLER

**Impact**: Talent tree buttons are non-functional. Cannot select talents or expand/collapse trees.

---

### ISSUE #4: Duplicate Combat Action Handlers
**Severity**: MEDIUM - Dead code and confusion

Two different handlers for the same button:
```javascript
// Handler 1: CALLED (line 328)
async _onPostCombatAction(event) {
  // Complex: handles DC checks, skill selection dialogs
}

// Handler 2: NEVER CALLED (line 246)
async _onRollCombatAction(event) {
  // Simple: just posts description
}
```

**Why**: Direct jQuery binding (line 169) takes precedence over data-action dispatcher

**Impact**: Confusing code, _onRollCombatAction is dead code

---

## Recommendations

### Priority 1: Fix Critical Bugs
1. **Fix undefined `event` reference (line 379)**
   - Remove the unused `actionRow` line
   - Or pass event as parameter if needed

2. **Implement missing talent handlers**
   - Add `_onSelectTalent()`, `_onToggleTree()`, `_onViewTalent()`
   - These are referenced in templates but not implemented

3. **Fix Force Suite integration**
   - Option A: Import and call `ForceSuiteComponent.attachListeners()` in `activateListeners()`
   - Option B: Implement `_onAddToSuite()` and `_onRemoveFromSuite()` directly

### Priority 2: Clean Up Architecture
1. **Remove duplicate handlers**
   - Delete `_onRollCombatAction()` (unused)
   - Keep `_onPostCombatAction()` (the actually used one)

2. **Standardize event binding**
   - Use data-action for all buttons (consistent with base class)
   - Remove direct jQuery bindings where possible
   - This makes the code more maintainable

3. **Integrate separated components**
   - ForceSuiteComponent should be called or folded into main sheet
   - Avoid orphaned component code

### Priority 3: Code Quality
1. **Document event handler patterns**
   - Add comments explaining why direct jQuery binding vs data-action
   - Make it clear which handlers go where

2. **Add handler method summary**
   - Document all available actions in a central location
   - Link to handler implementations

---

## Summary Statistics

- **Total Templates**: 8 tab templates + 2 partials = 10 files
- **Total Handler Methods**: 33 (18 base + 15 character sheet)
- **Working Buttons**: 17 of 24 button types (71%)
- **Broken Buttons**: 5 button types (21%)
- **Not-yet-analyzed**: 2 (2%)

**Button Status Breakdown**:
- Fully Working: 17 buttons ✓
- Missing Handlers: 5 buttons ❌
- Dead Code: 1 handler
- Critical Bugs: 1 undefined variable crash
- Integration Issues: 1 component not called

