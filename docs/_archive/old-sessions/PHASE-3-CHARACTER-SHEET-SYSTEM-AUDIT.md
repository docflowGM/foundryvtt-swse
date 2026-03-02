# PHASE 3: CHARACTER SHEET SYSTEM INTEGRITY AUDIT
## Complete V2 Governance Review

**Status**: 🔴 **STRUCTURAL DRIFT - CRITICAL VIOLATIONS FOUND**
**Date**: 2026-02-24
**Classification**: Internal Governance Audit
**Verdict**: Sheet system partially broken and architecturally inconsistent

---

## EXECUTIVE SUMMARY

The character sheet system is **architecturally broken** with critical governance violations:

🔴 **30 non-functional buttons** in character sheet (missing event handlers)
🔴 **5 direct `.update()` calls** in Droid/Vehicle sheets bypassing ActorEngine
🔴 **1 AppV2 violation** - DOM mutations in _onRender (npc-full-sheet.js)
🔴 **27+ missing CRUD operations** - No add/edit/delete handlers
🔴 **3 missing progression launchers** - Store, Chargen, Levelup not wired
🔴 **Severe architectural drift** - Character sheet diverging from reference implementation

**System Status**: Partially functional but NOT sovereignly architected. Requires immediate remediation.

---

## PHASE 1: ROLL SURFACE AUDIT

### ✅ Properly Implemented Rolls
- ✓ Skill rolling → RollCore routing
- ✓ Attack rolling → RollCore routing
- ✓ Initiative rolling → swseRollInitiative()
- ✓ Defense rolling → game.swse.rolls.defenses.rollDefense()
- ✓ Force power card flip mechanics
- ✓ Second Wind mechanics
- ✓ No string concatenation for dice (good)
- ✓ No direct new Roll() creation in sheets (good)

### ❌ Missing/Non-Functional Handlers

**Character Sheet** (12 actual, 42+ expected):
```
❌ cmd-chargen - Button exists, no handler
❌ cmd-levelup - Button exists, no handler
❌ cmd-store - Button exists, no handler
❌ cmd-conditions - Button exists, no handler
❌ add-feat - Button exists, no handler
❌ delete-feat - Button exists, no handler
❌ add-talent - Button exists, no handler
❌ add-language - Button exists, no handler
❌ remove-language - Button exists, no handler
❌ open-ability - Button exists, no handler
❌ activate-force - Button exists, no handler
❌ roll-attack (force/ability) - Button exists, no handler
❌ inventory-search - Button exists, no handler
❌ toggle-item-expand - Button exists, no handler
❌ split-stack - Button exists, no handler
❌ revalidate-build - Button exists, no handler
❌ create-follower - Button exists, no handler
❌ edit-follower - Button exists, no handler
... and ~12 more
```

**Droid Sheet** (25+ handlers implemented) - Better coverage
**NPC Combat Sheet** (11 handlers, combat-focused) - Minimal coverage
**Vehicle Sheet** (24+ handlers) - Good coverage

### Classification: 🟡 **MINOR** - Rolls work where implemented, but command handlers missing

---

## PHASE 2: ENGINE WIRING AUDIT

### ✅ Proper ActorEngine Routing

**Character Sheet** (exemplary):
```javascript
// GOOD: scripts/sheets/v2/character-sheet.js:293
await InventoryEngine.toggleEquip(item);
// Routes through domain engine, not direct mutation
```

**Droid Sheet** (some good examples):
```javascript
// GOOD: droid-sheet.js:129
const plan = DroidEngine.buildConfigurationPlan(config);
await ActorEngine.updateActor(this.actor, plan);
// Proper domain → engine routing
```

**Vehicle Sheet** (good condition track integration):
```javascript
// GOOD: vehicle-sheet.js:274
await ActorEngine.updateActor(this.actor, {
  'system.conditions.track': trackValue
});
```

### 🔴 **CRITICAL VIOLATIONS** - Direct .update() Bypass

**Droid Sheet**:
```javascript
// VIOLATION 1: droid-sheet.js:291
await this.document.update({
  "system.credits": currentCredits + price
});  // ❌ Should use ActorEngine

// VIOLATION 2: droid-sheet.js:319
await item.update({ "system.equipped": ev.currentTarget.checked });
// ❌ Should use ActorEngine or InventoryEngine

// VIOLATION 3: droid-sheet.js:347
await this.document.update({ "system.ownedActors": owned });
// ❌ Should use ActorEngine
```

**Vehicle Sheet**:
```javascript
// VIOLATION 4: vehicle-sheet.js:339
await this.document.update({
  "system.credits": currentCredits + price
});  // ❌ Should use ActorEngine

// VIOLATION 5: vehicle-sheet.js:367
await this.document.update({ "system.ownedActors": owned });
// ❌ Should use ActorEngine
```

### Summary
- ✓ Character sheet: 0 direct mutations (compliant)
- ❌ Droid sheet: 3 direct .update() calls (violations)
- ✓ NPC Combat sheet: 0 direct mutations (compliant)
- ❌ Vehicle sheet: 2 direct .update() calls (violations)

### Classification: 🔴 **CRITICAL** - 5 governance violations bypassing ActorEngine

---

## PHASE 3: CONTEXT PREPARATION AUDIT

### ✅ Proper Context Builders

**All Sheets**:
- ✓ `_prepareContext()` reads from `system.derived.*` only
- ✓ No mutations inside prepare methods
- ✓ No recalculation of derived stats inline
- ✓ No condition penalties applied during prepare
- ✓ ModifierEngine called read-only for bonus display (character-sheet.js:126)
- ✓ RenderAssertions prevent serialization errors
- ✓ All context data is presentation-only normalization

**No violations found. Proper separation of concerns maintained.**

### Classification: 🟢 **FULLY FUNCTIONAL** - Phase 3 architecturally sound

---

## PHASE 4: STORE/CHARGEN/BUILDER INTEGRATION

### ✅ Properly Wired Integrations

**Droid Sheet**:
```javascript
// GOOD: droid-sheet.js:426
static get title() {
  return "Droid Builder";
}

_onClickDroidBuilder() {
  DroidBuilderApp.open(this.actor);
}
```

**NPC/Vehicle Sheets**:
```javascript
// GOOD: npc-combat-sheet.js:199, vehicle-sheet.js:417
_onClickLevelUp() {
  SWSELevelUpEnhanced.showForActor(this.actor);
}
```

### ❌ **CRITICAL GAPS** - Character Sheet Missing All Progression Launchers

**Character Sheet** (scripts/sheets/v2/character-sheet.hbs:89-99):
```html
<button data-action="cmd-chargen">Character Generation</button>
<button data-action="cmd-levelup">Level Up</button>
<button data-action="cmd-store">Equipment Store</button>
<button data-action="cmd-conditions">Manage Conditions</button>
```

**Problem**: These buttons are defined in template but **NO handlers implemented** in character-sheet.js

### Missing Implementations
| Integration | Status | File | Handler |
|-------------|--------|------|---------|
| Chargen Launcher | ❌ Missing | character-sheet.js | _onClickChargen() |
| Levelup Launcher | ❌ Missing | character-sheet.js | _onClickLevelUp() |
| Store Launcher | ❌ Missing | character-sheet.js | _onClickStore() |
| Conditions Manager | ❌ Missing | character-sheet.js | _onClickConditions() |
| DroidBuilder | ✓ Implemented | droid-sheet.js:426 | _onClickDroidBuilder() |
| Template Builder | ✓ Implemented (legacy) | chargen-templates.js | Exists |

### Classification: 🔴 **CRITICAL** - 3 essential progression launchers non-functional

---

## PHASE 5: CRUD OPERATION COMPLETENESS

### Comprehensive CRUD Matrix

| Operation | Character | Droid | NPC | Vehicle |
|-----------|-----------|-------|-----|---------|
| **Add Feat** | ❌ Handler missing | ✓ droid-sheet.js:325 | ❌ Missing | ❌ Missing |
| **Delete Feat** | ❌ Handler missing | ✓ Implied | ❌ Missing | ❌ Missing |
| **Add Talent** | ❌ Handler missing | ✓ droid-sheet.js:332 | ❌ Missing | ❌ Missing |
| **Delete Talent** | ❌ Handler missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Add Language** | ❌ Button exists, handler missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Remove Language** | ❌ Button exists, handler missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Equip Item** | ✓ InventoryEngine | ✓ Via droid-sheet.js:319 | ✓ Via ActorEngine | ✓ Via ActorEngine |
| **Unequip Item** | ✓ InventoryEngine | ✓ Via InventoryEngine | ✓ Via ActorEngine | ✓ Via ActorEngine |
| **Sell Item** | ✓ InventoryEngine | ❌ Via direct .update() | ✓ No handler | ❌ Via direct .update() |
| **Delete Item** | ✓ InventoryEngine | ✓ Via deleteOwnedItem() | ✓ Basic delete | ✓ Via deleteOwnedItem() |
| **Add Weapon** | ❌ No handler | ❌ No handler | ❌ No handler | ❌ No handler |
| **Delete Weapon** | ❌ Via item deletion only | ✓ Via deleteOwnedItem() | ✓ Via deleteOwnedItem() | ✓ Via deleteOwnedItem() |
| **Force Power Use** | ✓ Card flip mechanics | ❌ No section | ❌ No section | ❌ No section |
| **Skill Roll** | ✓ Via roll handler | ✓ rollSkill() | ✓ rollSkill() | ❌ No skill section |
| **Condition Toggle** | ✓ Click handler | ✓ Full handler | ✓ Full handler | ✓ Full handler |
| **Manage XP** | ❌ Display only | ✓ Display | ✓ Display | ❌ No display |
| **Manage Credits** | ❌ No input | ✓ No input (read droid battery) | ❌ No input | ✓ Display only |

### Missing Operations Summary
- **Character Sheet**: 13+ missing handlers for feat/talent/language management
- **NPC Sheet**: Severely limited CRUD operations
- **Vehicle Sheet**: No add/delete weapons, no skill section
- **All Sheets**: No weapon add/delete handlers

### Classification: 🔴 **CRITICAL** - 27+ missing CRUD operations across sheets

---

## PHASE 6: EVENT HANDLER INTEGRITY

### ✅ Proper Handler Patterns

**Droid/Vehicle/NPC Combat Sheets**:
- ✓ Comprehensive addEventListener() usage
- ✓ All handlers properly bound in _onRender()
- ✓ Clear handler registration with event prevention
- ✓ No duplicate listeners (25+ handlers in Droid)

**Character Sheet**:
- ⚠️ Uses legacy jQuery `.on()` pattern
- ⚠️ Mixed binding approach (not all handlers registered)
- ⚠️ ~30 data-action attributes without corresponding handlers

### 🔴 **CRITICAL VIOLATION** - AppV2 DOM Mutation

**NPC Full Sheet** (scripts/sheets/v2/npc-full-sheet.js:40-46):
```javascript
// ❌ VIOLATION: Mutates DOM in _onRender
_onRender(context, options) {
  super._onRender(context, options);

  const commandBar = this.element.querySelector('.command-bar');
  const switchBtn = document.createElement('button');
  switchBtn.setAttribute('data-action', 'switch-combat-mode');
  switchBtn.textContent = 'Combat Mode';
  commandBar.appendChild(switchBtn);  // ❌ DOM mutation in _onRender

  if (!this.hasListener) {
    this.element.addEventListener('click', this._onClickAction.bind(this));
    this.hasListener = true;
  }
}
```

**Problem**: AppV2 rule states: "Do NOT mutate DOM in _onRender. Only attach event listeners."

This violates foundational V2 architecture by:
1. Creating elements dynamically instead of via template
2. Using a `hasListener` flag workaround (code smell)
3. Adding elements on every render cycle (potential memory leak)

### Missing Handler Coverage
- Character sheet: ~30 buttons with no event listeners
- NPC Combat sheet: Minimal handlers (11 total)
- Droid sheet: Comprehensive (25+)
- Vehicle sheet: Comprehensive (24+)

### Classification: 🔴 **CRITICAL** - DOM mutation violation + 30 missing listeners in character sheet

---

## PHASE 7: APPV2 COMPLIANCE

### ✅ Compliant Patterns

**All Sheets**:
- ✓ Proper PARTS definition with body template
- ✓ Single root element in templates
- ✓ Correct async _prepareContext() → _onRender() flow
- ✓ Proper instanceof HTMLElement checks
- ✓ RenderAssertions for safety
- ✓ No legacy FormApplication patterns (except character-sheet.js)

### ⚠️ Minor Issues

**Character Sheet** (scripts/sheets/v2/character-sheet.js):
- Uses `activateListeners()` method (FormApplication pattern)
- Not strictly AppV2 but doesn't break functionality
- Mixes jQuery `.on()` with V2 patterns

**NPC Full Sheet**:
- ❌ DOM mutations in _onRender (critical violation)
- Uses workaround flag instead of proper template
- Creates elements dynamically

### Classification: 🟡 **MINOR** - 95% compliant, one critical violation

---

## PHASE 8: CROSS-ACTOR CONSISTENCY

### Architectural Comparison

| Pattern | Character | Droid | NPC Combat | Vehicle | Status |
|---------|-----------|-------|-----------|---------|--------|
| Base Class | DocumentSheetV2 | DocumentSheetV2 | DocumentSheetV2 | DocumentSheetV2 | ✓ Consistent |
| Event Pattern | jQuery | addEventListener | addEventListener | addEventListener | ❌ Divergent |
| Handler Count | 12 incomplete | 25+ complete | 11 minimal | 24+ complete | ❌ Inconsistent |
| Direct Updates | 0 | 3 violations | 0 | 2 violations | ⚠️ Some bypass |
| CRUD Coverage | Partial | Complete | Minimal | Complete | ❌ Drift |
| Context Prep | Clean | Clean | Clean | Clean | ✓ Consistent |
| V2 Patterns | Mixed | Pure | Pure + violation | Pure | ⚠️ Minor |

### Special-Case Logic Found

1. **Character Sheet**:
   - Uses `CombatRollConfigDialog` unique pattern
   - Uses `InventoryEngine` directly (good)
   - Uses jQuery (legacy)

2. **Droid Sheet**:
   - Reference implementation with comprehensive handlers
   - Proper DroidEngine + ActorEngine routing
   - BUT: Has 3 direct .update() violations

3. **NPC Full Sheet**:
   - Extends Character Sheet
   - Adds DOM mutation workaround (npc-full-sheet specific)
   - Minimal handler coverage

4. **Vehicle Sheet**:
   - Extends base patterns
   - Has 2 direct .update() violations
   - Otherwise comprehensive

### Drift Analysis

```
                Character    Droid    NPC Combat    Vehicle
Reference Impl:   ❌         ✓         ❌            ✗
Architecture:     🟡         🟢        🟡            🟢
Handlers:         🔴         🟢        🔴            🟢
Engine Routing:   ✓          ❌        ✓             ❌
V2 Compliance:    🟡         ✓         ❌            ✓

Result: SEVERE DRIFT - Droid/Vehicle sheets are islands of quality
        surrounded by Character/NPC sheet problems
```

### Classification: 🔴 **CRITICAL** - Severe architectural drift and inconsistency

---

## DIRECT MUTATION VIOLATIONS SUMMARY

| File | Line | Violation | Severity | Fix |
|------|------|-----------|----------|-----|
| droid-sheet.js | 291 | `this.document.update()` for credits | 🔴 High | Use ActorEngine |
| droid-sheet.js | 319 | `item.update()` for equipped toggle | 🔴 High | Use ActorEngine |
| droid-sheet.js | 347 | `this.document.update()` for owned actors | 🔴 High | Use ActorEngine |
| vehicle-sheet.js | 339 | `this.document.update()` for credits | 🔴 High | Use ActorEngine |
| vehicle-sheet.js | 367 | `this.document.update()` for owned actors | 🔴 High | Use ActorEngine |
| npc-full-sheet.js | 40-46 | DOM mutation in _onRender | 🔴 High | Move to template |

---

## REMEDIATION REQUIREMENTS

### IMMEDIATE (Phase 2 & 5 violations)

**1. Fix Direct .update() Calls** (droid-sheet.js, vehicle-sheet.js)
```javascript
// BEFORE (WRONG):
await this.document.update({ "system.credits": newValue });

// AFTER (CORRECT):
await ActorEngine.updateActor(this.actor, {
  "system.credits": newValue
});
```

**2. Add Missing CRUD Handlers** (character-sheet.js)
- Implement _onClickAddFeat()
- Implement _onClickDeleteFeat()
- Implement _onClickAddTalent()
- Implement _onClickDeleteTalent()
- Implement _onClickAddLanguage()
- Implement _onClickRemoveLanguage()

**3. Add Progression Launchers** (character-sheet.js)
- Implement _onClickChargen()
- Implement _onClickLevelUp()
- Implement _onClickStore()

**4. Fix AppV2 Violation** (npc-full-sheet.js)
```javascript
// Move DOM creation from _onRender to template
// Remove dynamic button creation
// Add button to npc-full-sheet.hbs template
// Remove hasListener flag workaround
```

### SECONDARY (Consistency & Minor Issues)

**5. Standardize Event Pattern**
- Convert character-sheet.js from jQuery `.on()` to addEventListener
- Move all listeners to _onRender() like Droid/Vehicle sheets

**6. Add Missing Handlers**
- Implement all 30+ missing command and action handlers

**7. Verify CRUD Completeness**
- Ensure all actor types have consistent add/edit/delete operations

---

## FINAL CLASSIFICATION SUMMARY

| Phase | Status | Severity | Component |
|-------|--------|----------|-----------|
| **Phase 1** | 🟡 Minor | Roll handlers work, commands broken | Functional but incomplete |
| **Phase 2** | 🔴 Critical | 5 direct .update() violations | Governance violation |
| **Phase 3** | 🟢 Clean | Proper context preparation | Architecturally sound |
| **Phase 4** | 🔴 Critical | 3 launchers missing | User workflow broken |
| **Phase 5** | 🔴 Critical | 27+ missing CRUD handlers | Feature incomplete |
| **Phase 6** | 🔴 Critical | DOM mutation + 30 missing listeners | AppV2 violation |
| **Phase 7** | 🟡 Minor | Mostly compliant, one violation | Nearly complete |
| **Phase 8** | 🔴 Critical | Severe architectural drift | Inconsistent |

---

## FINAL VERDICT

### "Does the sheet work correctly and sovereignly?"

**NO** - The sheet system is **partially broken** with **critical governance violations**:

✅ **Functional**: Basic rendering, combat dialogs, some inventory operations work
❌ **Broken**: 30+ buttons non-functional, progression launchers missing
❌ **Non-Sovereign**: 5 direct .update() calls bypass ActorEngine governance
❌ **Inconsistent**: Character sheet diverging from reference implementations
❌ **Non-Compliant**: AppV2 DOM mutation violation in npc-full-sheet.js

**System Status**: **🔴 UNFIT FOR PRODUCTION** until critical violations are remediated.

**Priority Action**: Fix Phase 2 (governance violations) and Phase 5 (missing handlers) before next release.

---

*End of Sheet Audit Report*
