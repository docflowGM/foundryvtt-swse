# FoundryVTT SWSE Hook Registration Summary

**Document**: See `HOOK_ANALYSIS.md` for full detailed analysis

## Quick Stats

- **Total Hooks**: 48+
- **Files with Hooks**: 25+
- **Duplicate/Multi-Register Hooks**: 8 (HIGH RISK)
- **Status**: SCATTERED - needs centralization

---

## Hook Registration By Type

### Initialization Hooks (7)
| Hook | Count | Files |
|------|-------|-------|
| Hooks.once("init") | 4+ | index.js, core/init.js, 3x migrations, logger |
| Hooks.once("ready") | 3+ | index.js, 3x migrations, theme-loader, houserules-config |

**Status**: DUPLICATE RISK - Multiple init/ready handlers can conflict

---

## Combat Hooks (11) - HIGHEST RISK

| Hook | Registrations | Locations | Issue |
|------|---|---|---|
| **combatTurn** | **5** | index.js:885, index.js:897, SWSECombatIntegration:17, SWSECombatAutomation:16, HouseruleMechanics:308, active-effects-manager:292 | Race condition risk; unpredictable execution order |
| createCombat | 2 | index.js:875, SWSECombatIntegration:14 | Duplicate handlers |
| deleteCombat | 3 | SWSECombatIntegration:15, force-power-hooks:86, (index.js has similar) | Multiple handlers, unpredictable order |
| combatRound | 2 | index.js:880, SWSECombatIntegration:16 | Duplicate |
| createCombatant | 1 | SWSECombatIntegration:20 | OK |
| deleteCombatant | 1 | SWSECombatIntegration:21 | OK |
| combatStart | 1 | SWSECombatAutomation:29 | OK |
| combatEnd | 1 | SWSECombatAutomation:43 | OK |
| preCreateCombatant | 1 | houserule-mechanics:297 | OK |

---

## Actor Update Hooks (5) - MEDIUM RISK

| Hook | Registrations | Locations | Issue |
|------|---|---|---|
| **preUpdateActor** | **4+** | index.js:957, force-power-hooks:54, houserule-mechanics:56, houserule-mechanics:89 | Race condition; order matters for conditions/abilities |
| **updateActor** | **3** | force-power-hooks:65, active-effects-manager:284, combat-action-bar:147 | Order matters for effects application |

---

## Chat & UI Hooks (7)

| Hook | Registrations | Locations | Issue |
|------|---|---|---|
| renderChatMessageHTML | 2 | index.js:976, enhanced-rolls.js:676 | Duplicate; both modify chat messages |
| dropActorSheetData | 1 | index.js:948 | OK |
| hotbarDrop | 1 | index.js:1019 | OK |
| chatMessage | 1 | chat-commands.js:8 | OK |
| renderActorDirectory | 1 | chargen-init.js:6 | OK |
| canvasReady | 1 | canvas-ui-manager.js:16 | OK |
| canvasResize | 1 | canvas-ui-manager.js:21 | OK |

---

## Force Power Hooks (4)

| Hook | Registrations | Locations | Issue |
|------|---|---|---|
| createItem | 1 | force-power-hooks:14 | OK - well isolated |
| updateActor | 1 | force-power-hooks:65 | Part of broader updateActor issue |
| preUpdateActor | 1 | force-power-hooks:54 | Part of broader preUpdateActor issue |
| deleteCombat | 1 | force-power-hooks:86 | Part of broader deleteCombat issue |

---

## Houserule Hooks (5)

| Hook | Registrations | Locations | Issue |
|------|---|---|---|
| preRollDamage | 1 | houserule-mechanics:31 | OK |
| preUpdateActor | 2 | houserule-mechanics:56, houserule-mechanics:89 | Part of broader issue |
| preRollSkill | 1 | houserule-mechanics:231 | OK |
| combatTurn | 1 | houserule-mechanics:308 | Part of broader combatTurn issue |

---

## Registration Patterns (ANTI-PATTERNS DETECTED)

### Pattern 1: Direct Module-Level Registration
```javascript
// ❌ SCATTERED - hard to see all hooks
Hooks.on("dropActorSheetData", async (actor, sheet, data) => { ... })
Hooks.on('preUpdateActor', function(actor, changes, options, userId) { ... })
```

### Pattern 2: Function-Based Registration (Called from Ready)
```javascript
// ❌ SCATTERED - registration order unclear
function setupCombatAutomation() {
  Hooks.on('combatTurn', ...);  // Line 875
}
// Called from ready hook line 524 if enabled
```

### Pattern 3: Class Static Method Registration
```javascript
// ❌ SCATTERED - mixed with class logic
static init() {
  Hooks.on("createCombat", this._onCombatStart.bind(this));
}
// Called from ready hook line 426
```

### Pattern 4: Exported Function Registration
```javascript
// ❌ SCATTERED - must be called explicitly
export function initializeForcePowerHooks() {
  Hooks.on('createItem', async (item, options, userId) => { ... });
}
// Called from ready hook line 483
```

---

## Critical Issues

### 1. combatTurn Hook - Race Condition
**Risk Level: CRITICAL**

5+ handlers for one hook execute in unpredictable order:
1. index.js:885 - Logging only
2. index.js:897 - Condition recovery dialog
3. SWSECombatIntegration:17 - Action economy
4. SWSECombatAutomation:16 - Condition recovery (DUPLICATE of #2!)
5. HouseruleMechanics:308 - Space combat
6. SWSEActiveEffectsManager:292 - Active effects

**Expected Sequence**: Check effects → reset actions → condition recovery → space combat rules
**Actual Sequence**: UNKNOWN (Hooks.on doesn't guarantee order)

**Impact**: 
- Duplicate condition recovery dialogs may appear
- Space combat rules may run before effects are applied
- Action economy may be reset after effects consume actions

---

### 2. preUpdateActor Hook - Condition/Ability Order
**Risk Level: MEDIUM-HIGH**

4 handlers in unknown order:
1. index.js:957 - Condition track penalty update
2. force-power-hooks:54 - Capture old abilities  **← Must run first**
3. houserule-mechanics:56 - Condition track cap
4. houserule-mechanics:89 - Death system rules

**Expected Sequence**: Capture old → apply caps → check death → apply penalty
**Actual Sequence**: UNKNOWN

**Impact**:
- Ability increase detection may fail if capture doesn't run first
- Death check may apply to wrong HP value
- Condition caps may be applied after other changes

---

### 3. Init Hook Duplication
**Risk Level: HIGH**

Multiple `Hooks.once('init')` registrations:
- index.js:160 - Main system init (LONG: 276 lines!)
- core/init.js:6 - Duplicate/placeholder
- migrations (3x) - Version tracking
- logger.js:203 - Logger init

**Impact**:
- Confusion about which init runs "first"
- Multiple CONFIG setups possible
- Wasted cycles on placeholder hooks

---

### 4. Conditional Registration (Settings-Based)
**Risk Level: MEDIUM**

Some hooks only register if settings enabled:
- `setupCombatAutomation()` - checks `enableAutomation` setting
- `setupConditionRecovery()` - checks `autoConditionRecovery` setting

**Issue**: Hooks may or may not be active based on settings, hard to predict

---

## Current File Organization

### Files with Hooks (25+)

**Core System**
- index.js (10 hooks) - MOST SCATTERED
- core/init.js (1 hook - placeholder)
- core/error-handler.js (1 hook)

**Combat System**
- scripts/combat/combat-integration.js (6 hooks)
- scripts/combat/combat-automation.js (3 hooks)
- scripts/combat/active-effects-manager.js (2 hooks)
- scripts/combat/systems/enhanced-combat-system.js (1 hook)
- scripts/combat/rolls/enhanced-rolls.js (1 hook)

**Force Powers & Items**
- scripts/hooks/force-power-hooks.js (4 hooks)

**House Rules**
- scripts/houserules/houserule-mechanics.js (5 hooks)
- scripts/houserules/houserules-config.js (1 hook)

**UI & Canvas**
- scripts/canvas-ui/canvas-ui-manager.js (2 hooks)
- scripts/theme-loader.js (1 hook)
- scripts/apps/chargen-init.js (1 hook)

**Chat & Config**
- scripts/chat/chat-commands.js (1 hook)
- scripts/config/skills.js (1 hook)
- scripts/utils/skill-use-filter.js (1 hook)
- scripts/utils/logger.js (1 hook)

**Migrations**
- scripts/migration/actor-validation-migration.js (2 hooks)
- scripts/migration/item-validation-migration.js (2 hooks)
- scripts/migration/populate-force-compendiums.js (2 hooks)

**Debug**
- debug-character-sheet.js (3 hooks - console script)

---

## Recommended Actions (Priority Order)

### URGENT (This Week)
1. **Document execution order** of combatTurn handlers
   - Test actual firing sequence
   - Check for race conditions
   - Add console logging to identify issues

2. **Investigate duplicate handlers**
   - Verify if index.js:897 and SWSECombatAutomation:16 are actually duplicates
   - Check if intentional or bug
   - Decide which to keep/remove

3. **Create hooks inventory**
   - Spreadsheet with all hooks
   - Location, purpose, dependencies
   - Identified risks

### SHORT TERM (Next 2 Weeks)
1. **Create HooksRegistry.js** (see HOOK_ANALYSIS.md)
   - Centralized registration point
   - Metadata for each hook (runOrder, requireGM, etc.)
   - Debug methods

2. **Consolidate combatTurn handlers**
   - Move all 5+ handlers to single registration
   - Implement runOrder system
   - Test execution sequence

3. **Consolidate preUpdateActor handlers**
   - Ensure ability capture runs first
   - Document expected order
   - Add error handling

### MEDIUM TERM (Next Month)
1. **Migrate all hooks to HooksRegistry**
   - Phase by phase (by system)
   - Keep old code for safety
   - Test after each phase

2. **Create init-manager.js**
   - Orchestrate system readiness
   - Phase-based initialization
   - Error boundaries

3. **Update documentation**
   - Document new hook registration pattern
   - Create contributor guide
   - Add console debugging commands

---

## Quick Reference: Which Files To Check

### If changing combat logic:
- `/index.js` (lines 875-940)
- `/scripts/combat/combat-integration.js` (init method)
- `/scripts/combat/combat-automation.js` (_registerHooks)
- `/scripts/combat/active-effects-manager.js` (init method)
- `/scripts/houserules/houserule-mechanics.js` (setup methods)

### If changing actor updates:
- `/index.js` (line 957)
- `/scripts/hooks/force-power-hooks.js` (lines 54, 65)
- `/scripts/houserules/houserule-mechanics.js` (lines 56, 89)
- `/scripts/combat/active-effects-manager.js` (line 284)

### If changing chat/UI:
- `/index.js` (lines 545, 976, 1019)
- `/scripts/combat/rolls/enhanced-rolls.js` (line 676)
- `/scripts/canvas-ui/canvas-ui-manager.js` (lines 16, 21)

### If changing initialization:
- `/index.js` (lines 160, 442)
- `/scripts/core/init.js` (line 6)
- All migration files (init + ready)
- `/scripts/utils/logger.js` (line 203)

---

## Performance Impact

Currently: ~50+ hook registrations scattered across initialization
- No way to quickly see what's registered
- No execution order guarantee
- No performance metrics
- Debugging hook issues requires grepping entire codebase

After centralization:
- Single source of truth for hooks
- Explicit runOrder prevents race conditions
- Easy to profile hook execution
- Simple debugging: `SWSE.hooks.list()`

---

## See Also

- **Detailed Analysis**: `HOOK_ANALYSIS.md` (887 lines)
- **Code Templates**: HooksRegistry class and InitManager in analysis document
- **Implementation Guide**: Phased refactoring plan in analysis document

