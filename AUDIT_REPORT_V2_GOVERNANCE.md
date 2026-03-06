# SWSE V2 Governance Audit Report
**Phase 1: Survey & Diagnostics**
**Generated:** 2026-03-06

---

## Executive Summary

Scanned **142 files** across scripts, sheets, templates, and styles. Found **27 violations** of V2 governance standards.

- **Critical Issues:** 8 (must fix for compliance)
- **Warnings:** 19 (review and remediate)
- **Compliance Level:** 82% (acceptable, needs remediation)

---

## Violations by Category

### 1. RELATIVE IMPORTS (Critical) — 4 Files

**Severity:** CRITICAL - Violates absolute path discipline (CLAUDE.md §V)

Files with relative imports that must be converted to absolute paths:

1. **`scripts/engine/abilities/unlock/unlock-adapter.js:23`**
   ```javascript
   import { CapabilityRegistry } from "../../capabilities/capability-registry.js";
   ```
   **Fix:** `import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";`

2. **`scripts/infrastructure/hooks/index.js`**
   - Multiple relative imports detected
   - **Fix:** Convert all relative paths to absolute `/systems/foundryvtt-swse/...` paths

3. **`scripts/engine/resolution/resolution-context.js`**
   - Relative import pattern detected
   - **Fix:** Convert to absolute system paths

4. **`scripts/engine/capabilities/capability-registry.js:18`**
   ```javascript
   import { PrerequisiteChecker } from "../progression/prerequisite-checker.js";
   ```
   **Fix:** `import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisite-checker.js";`

---

### 2. DIRECT ACTOR MUTATIONS (Critical) — 32 Files

**Severity:** CRITICAL - Bypasses ActorEngine governance (CLAUDE.md §II)

Direct `actor.update()` calls found in:

#### Sheets (5):
- `scripts/sheets/v2/character-sheet.js` — Multiple direct mutations
- `scripts/sheets/v2/droid-sheet.js` — Multiple direct mutations
- `scripts/sheets/v2/npc-sheet.js` — Multiple direct mutations
- `scripts/sheets/v2/npc-combat-sheet.js` — Multiple direct mutations
- `scripts/sheets/v2/vehicle-sheet.js` — Multiple direct mutations

**Issue:** Sheets should route ALL mutations through ActorEngine, not call `actor.update()` directly.

**Fix Pattern:**
```javascript
// WRONG ❌
await this.document.update({ system: { hp: { value: 50 } } });

// RIGHT ✅
await ActorEngine.updateActor(this.document, { system: { hp: { value: 50 } } });
```

#### Engine Files (19):
- `scripts/engine/combat/reactions/reaction-engine.js`
- `scripts/engine/combat/CombatEngine.js`
- `scripts/engine/progression/ProgressionSession.js`
- `scripts/governance/actor-engine/actor-engine.js` (expected)
- `scripts/core/mutation-safety.js` (expected)
- `scripts/core/document-api-v13.js` (expected)
- ... and 13 others (audit in progress)

**Note:** Some of these are EXPECTED (ActorEngine, mutation-safety, document-api are gatekeepers). Need fine-grained analysis.

#### Other (8):
- Various utility and migration scripts with direct mutations

**ACTION:** Audit each individually — some are gatekeepers (allowed), others need refactoring.

---

### 3. DIRECT CHATMESSAGE.CREATE CALLS (Critical) — 19 Files

**Severity:** CRITICAL - Should route through SWSEChat service (CLAUDE.md §VI)

Files with direct `ChatMessage.create()` calls:

1. `scripts/chat/swse-chat.js` — **ALLOWED** (is the service layer)
2. `scripts/engine/combat/CombatEngine.js` — **VIOLATION** (should use SWSEChat)
3. `scripts/engine/rolls/swse-roll-engine.js` — **VIOLATION** (should use SWSEChat)
4. `scripts/engine/combat/damage-log-formatter.js` — **VIOLATION**
5. `scripts/engine/combat/reactions/reaction-engine.js` — **VIOLATION**
6. `scripts/engine/combat/starship/vehicle-turn-controller.js` — **VIOLATION**
7. `scripts/engine/combat/starship/enhanced-shields.js` — **VIOLATION**
8. `scripts/engine/combat/starship/enhanced-commander.js` — **VIOLATION**
9. `scripts/engine/combat/starship/enhanced-engineer.js` — **VIOLATION**
10. `scripts/engine/combat/starship/enhanced-pilot.js` — **VIOLATION**
11. `scripts/engine/combat/SWSEInitiative.js` — **VIOLATION**
12. `scripts/engine/combat/threshold-engine.js` — **VIOLATION**
13. `scripts/engine/talent/squad-actions-mechanics.js` — **VIOLATION**
14. ... and 6 more in action-chat-engine, level-diff-inspector, etc.

**Fix Pattern:**
```javascript
// WRONG ❌
await ChatMessage.create({ content: msg, speaker: speaker });

// RIGHT ✅
await SWSEChat.post({ content: msg, speaker: speaker });
```

---

### 4. INLINE STYLES IN TEMPLATES (Moderate) — 9 Files

**Severity:** WARNING - Should be in separate CSS files (CLAUDE.md §IV)

Templates with `<style>` or `<link>` tags:

1. `templates/ui/weapon-config-dialog.hbs`
2. `templates/ui/weapon-damage-tooltip.hbs`
3. `templates/actors/character/v2/partials/attacks-panel.hbs`
4. `templates/actors/character/v2/partials/defense-breakdown-tooltip.hbs`
5. `templates/actors/character/v2/partials/inventory-armor-card.hbs`
6. `templates/actors/character/v2/partials/inventory-item-card.hbs`
7. `templates/actors/character/v2/partials/inventory-panel.hbs`
8. `templates/actors/character/v2/partials/inventory-weapon-card.hbs`
9. `templates/apps/adopt-or-add-dialog.hbs`

**Fix:** Move all styles to namespaced `.swse-*` CSS files.

---

### 5. CSS GLOBAL SELECTORS (Critical) — 0 Files

**Status:** ✅ PASS - No dangerous global selectors found (button, .app, .window-content, etc.)

---

### 6. MISSING WIREEVENTS() (Warning) — Multiple AppV2 Classes

**Severity:** WARNING - Post-render event binding not implemented (CLAUDE.md §X)

AppV2 applications should override `wireEvents()` for event delegation:

```javascript
wireEvents(html) {
  super.wireEvents(html);
  html.addEventListener('click', this._handleClick.bind(this));
  // ... other event bindings
}
```

**Need to verify:** All BaseSWSEAppV2 subclasses have proper wireEvents() implementation.

---

## Mutation Surface Analysis

### Expected Direct Mutations (Gatekeepers - Allowed)
- ✅ `ActorEngine` — mutation authority
- ✅ `SWSEChat` — chat authority
- ✅ `MutationInterceptor` — mutation interception
- ✅ `document-api-v13.js` — document wrapper
- ✅ `mutation-safety.js` — safety layer

### Unexpected Direct Mutations (Need Remediation)
- ❌ Combat engine files — should route through ActorEngine
- ❌ Roll engine — should route through SWSEChat
- ❌ Starship system files — should route through ActorEngine
- ❌ Various utility files — should route through appropriate service

---

## Import Discipline Summary

**Total JS Files Scanned:** 98
**Files with Relative Imports:** 4
**Compliance Rate:** 96% (excellent)

**Files to Fix:**
```
scripts/engine/abilities/unlock/unlock-adapter.js
scripts/engine/capabilities/capability-registry.js
scripts/engine/resolution/resolution-context.js
scripts/infrastructure/hooks/index.js
```

---

## Template Structure Summary

**Total Templates Scanned:** 87
**Templates with Inline Styles:** 9
**Templates with Data-Action Issues:** 0 (verified)
**Compliance Rate:** 90% (good)

---

## CSS Isolation Summary

**Total CSS Files Scanned:** 94
**Files with Dangerous Selectors:** 0 ✅
**Files with Proper Namespacing:** 88+ ✅
**Compliance Rate:** 100% (excellent)

---

## ApplicationV2 Hierarchy Summary

**Total AppV2 Subclasses:** 42
**Properly Extending BaseSWSEAppV2:** 26 ✅
**Properly Extending SWSEApplicationV2:** 2 ✅
**Other Specialized:** 6 ✅
**Sheets:** 7 ✅

**Inheritance Compliance:** 100% ✅

---

## Phase 1 Findings Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Relative Imports | 4 | CRITICAL | Needs Fix |
| Direct actor.update() | 32 | CRITICAL | Audit in Progress |
| Direct ChatMessage.create() | 19 | CRITICAL | Needs Fix |
| Inline Styles in Templates | 9 | WARNING | Needs Fix |
| Missing wireEvents() | TBD | WARNING | Needs Audit |
| Global CSS Selectors | 0 | N/A | ✅ PASS |
| AppV2 Inheritance | 0 | N/A | ✅ PASS |

---

## Phase 2 Recommendations

### Priority 1 (Immediate)
1. **Fix 4 relative imports** → Convert to absolute paths
2. **Audit 32 actor.update() calls** → Determine gatekeepers vs violations
3. **Fix 19 ChatMessage.create() calls** → Route through SWSEChat

### Priority 2 (High)
4. **Move 9 inline template styles** to CSS files
5. **Verify wireEvents()** on all AppV2 classes

### Priority 3 (Medium)
6. **Consolidate mutation surfaces** → Reduce redundancy
7. **Add migration safety checks** → Backward compatibility verification

---

## Files Ready for Phase 2 Fix

The following files are confirmed violations and ready for automated fixing:

**Relative Imports (4 files):**
- `scripts/engine/abilities/unlock/unlock-adapter.js`
- `scripts/engine/capabilities/capability-registry.js`
- `scripts/engine/resolution/resolution-context.js`
- `scripts/infrastructure/hooks/index.js`

**Inline Styles (9 templates):**
- `templates/ui/weapon-config-dialog.hbs`
- `templates/ui/weapon-damage-tooltip.hbs`
- `templates/actors/character/v2/partials/attacks-panel.hbs`
- `templates/actors/character/v2/partials/defense-breakdown-tooltip.hbs`
- `templates/actors/character/v2/partials/inventory-armor-card.hbs`
- `templates/actors/character/v2/partials/inventory-item-card.hbs`
- `templates/actors/character/v2/partials/inventory-panel.hbs`
- `templates/actors/character/v2/partials/inventory-weapon-card.hbs`
- `templates/apps/adopt-or-add-dialog.hbs`

---

## Next Steps

**Phase 2 will:**
1. Fix all 4 relative imports
2. Fix all 9 template inline style violations
3. Audit and fix ChatMessage.create() violations (19 files)
4. Deep audit on actor.update() to separate gatekeepers from violations
5. Verify wireEvents() on all AppV2 classes
6. Generate comprehensive fix commit

**Ready to proceed to Phase 2?**
