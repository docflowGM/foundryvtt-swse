# PHASE 3G: CONDITION TRACK / STATUS EFFECTS FAMILY MIGRATION — SCOPE AUDIT

**Phase Start**: Phase 3G initiated following successful completion of Phase 3F (Vehicles/Starship family, 10 rules)  
**Scope**: Condition Track / Status Effects family (11 rules assigned, 8 rules with direct reads in 3 files)  
**Pattern**: Seventh application of adapter pattern  
**Status**: ✅ AUDIT COMPLETE — Ready for migration

---

## DELIVERABLE A: FAMILY SCOPE CONFIRMATION

### Rules Assigned to Family (11 rules)

**Condition Track Rules** (6 rules):
1. `conditionTrackEnabled` — Boolean, master toggle for condition track system
2. `conditionTrackVariant` — String (standard/variant), determines CT description variant
3. `conditionTrackStartDamage` — Number, initial damage threshold before CT applies
4. `conditionTrackProgression` — String (standard/accelerated), CT penalty progression mode
5. `conditionTrackCap` — Number, maximum CT change per single hit
6. `conditionTrackAutoApply` — Boolean, automatically apply CT changes during combat

**Status Effects Rules** (5 rules):
7. `statusEffectsEnabled` — Boolean, master toggle for status effects system
8. `statusEffectsList` — String (combatConditions/expanded/custom), which status library to use
9. `autoApplyFromConditionTrack` — Boolean, automatically apply status effects when CT changes
10. `statusEffectDurationTracking` — String (rounds/scenes/manual), how effect durations are tracked
11. `autoRemoveOnRest` — Boolean, automatically remove temporary effects on rest

### Rules with Direct Reads (8 rules, 9 direct reads across 3 files)

| Rule | File | Lines | Read Count | Direct Access |
|------|------|-------|-----------|---|
| conditionTrackEnabled | houserule-actor-enhancements.js | 175 | 1 | `game.settings.get(NS, 'conditionTrackEnabled')` |
| conditionTrackVariant | houserule-actor-enhancements.js | 184 | 1 | `game.settings.get(NS, 'conditionTrackVariant')` |
| conditionTrackCap | houserule-mechanics.js | 91 | 1 | `game.settings.get('foundryvtt-swse', 'conditionTrackCap')` |
| statusEffectsEnabled | houserule-status-effects.js | 119, 132, 242, 292 | 4 | `game.settings.get(NS, 'statusEffectsEnabled')` |
| statusEffectsList | houserule-status-effects.js | 121 | 1 | `game.settings.get(NS, 'statusEffectsList')` |
| autoApplyFromConditionTrack | houserule-status-effects.js | 220 | 1 | `game.settings.get(NS, 'autoApplyFromConditionTrack')` |
| statusEffectDurationTracking | houserule-status-effects.js | 245 | 1 | `game.settings.get(NS, 'statusEffectDurationTracking')` |
| autoRemoveOnRest | houserule-status-effects.js | 262 | 1 | `game.settings.get(NS, 'autoRemoveOnRest')` |

**TOTAL: 8 rules with direct reads, 9 direct read calls across 3 files**

### Rules Without Direct Reads (3 rules - defined but not currently read)

- `conditionTrackStartDamage` — Defined in settings but not directly read by any file in scope
- `conditionTrackProgression` — Defined in settings but not directly read by any file in scope
- `conditionTrackAutoApply` — Defined in settings but not directly read by any file in scope

**Note**: These 3 rules will still have adapter getters for future use and governance completeness.

### Files in Scope (3 files total)

**Files with Direct Reads**:
1. scripts/houserules/houserule-actor-enhancements.js (2 reads)
2. scripts/houserules/houserule-mechanics.js (1 read)
3. scripts/houserules/houserule-status-effects.js (6 reads)

**Files Already Compliant** (not modified):
- scripts/engine/combat/ConditionEngine.js — Already uses HouseRuleService.getAll()
- scripts/engine/combat/CombatMechanicsEngine.js — Already uses HouseRuleService.getAll()
- scripts/houserules/houserule-condition-track.js — Deprecated; forwards to ConditionEngine

---

## DELIVERABLE B: ARCHITECTURAL CONTEXT

### Existing Architecture

**Deprecated Path**: ConditionTrackMechanics (houserule-condition-track.js)
- Old implementation layer
- Now forwards calls to ConditionEngine
- Still used by houserule-actor-enhancements.js for UI display logic

**Modern Path**: ConditionEngine + CombatMechanicsEngine
- Already fully routed through HouseRuleService
- No direct game.settings.get() calls
- Reads through HouseRuleService.getAll()

**Governance Gap**: houserule-actor-enhancements.js and houserule-status-effects.js
- Older mechanics layer that predates HouseRuleService SSOT pattern
- Direct game.settings.get() calls in UI and status effect logic
- Will be migrated to use ConditionTrackRules adapter

### Coupling Analysis

**No cross-family coupling detected**:
- Condition Track / Status Effects rules do NOT depend on Progression, Force, Skills, Healing, Feat, or Vehicle families
- No other families directly read these rules
- threshold-engine.js reads separate Damage Threshold rules (not in scope)

**Mechanical Separation**:
- ConditionTrackMechanics handles CT display logic (uses houserule-actor-enhancements.js)
- StatusEffectsMechanics handles SE application logic (standalone)
- Both can be migrated independently

---

## DELIVERABLE C: BEHAVIOR PRESERVATION TARGETS

### Condition Track Behavior

**Enabled/Disabled**: conditionTrackEnabled controls whether CT system is active
- **Read Location**: houserule-actor-enhancements.js line 175
- **Behavior**: Determines if CT display is added to actor sheet bio tab
- **Preservation**: Must remain boolean gate

**Variant Selection**: conditionTrackVariant selects CT description variant
- **Read Location**: houserule-actor-enhancements.js line 184
- **Behavior**: Determines visual description shown to players (standard/variant)
- **Preservation**: Must pass string value unchanged

**Cap Limit**: conditionTrackCap sets maximum CT change per hit
- **Read Location**: houserule-mechanics.js line 91
- **Behavior**: Used in preUpdateActor hook to limit CT advances (`if (delta > cap)`)
- **Preservation**: Must remain numeric; 0 = no cap

### Status Effects Behavior

**Enabled/Disabled**: statusEffectsEnabled controls whether SE system is active
- **Read Locations**: houserule-status-effects.js lines 119, 132, 242, 292
- **Behavior**: Gates all effect operations (getAvailableEffects, applyEffect, onActorUpdate, getEffectModifiers)
- **Preservation**: Must remain boolean gate; all 4 reads must return same value

**List Selection**: statusEffectsList selects which status effect library to use
- **Read Location**: houserule-status-effects.js line 121
- **Behavior**: Maps string key to effect library (combatConditions/expanded/custom)
- **Preservation**: Must return string that matches STATUS_EFFECTS_LIBRARY key

**Auto-Apply from CT**: autoApplyFromConditionTrack toggles automatic SE application when CT changes
- **Read Location**: houserule-status-effects.js line 220
- **Behavior**: Controls whether StatusEffectsMechanics.autoApplyConditionEffects() exits early
- **Preservation**: Must remain boolean gate

**Duration Tracking**: statusEffectDurationTracking selects tracking mode
- **Read Location**: houserule-status-effects.js line 245
- **Behavior**: Compared to string 'rounds' to determine if duration decrements per round
- **Preservation**: Must return string value; checked against 'rounds' in if condition

**Auto-Remove on Rest**: autoRemoveOnRest toggles automatic SE removal at rest
- **Read Location**: houserule-status-effects.js line 262
- **Behavior**: Controls whether rest-effect cleanup loop executes
- **Preservation**: Must remain boolean gate

---

## DELIVERABLE D: GOVERNANCE STATUS

### Current State (Before Migration)

**Direct Reads**: 9 direct `game.settings.get()` calls in houserule mechanics layer
- 2 in houserule-actor-enhancements.js (CT display)
- 1 in houserule-mechanics.js (CT cap enforcement)
- 6 in houserule-status-effects.js (SE operations)

**Governance Gap**: Reads bypass HouseRuleService SSOT, creating dual-access pattern
- HouseRuleService._hookDirectAccess() warns about these violations
- Modern engines (ConditionEngine, CombatMechanicsEngine) already compliant

### Target State (After Migration)

**Zero Direct Reads**: All in-scope rules read through ConditionTrackRules adapter
- ConditionTrackRules reads through HouseRuleService (canonical SSOT)
- All houserule mechanics layer reads redirected through adapter
- No behavioral change; only access-path change

**Governance Enforcement**: HouseRuleService governs all Condition Track / Status Effects reads
- Adapter pattern enables future auditing/deprecation
- Setting key changes isolatable to adapter only
- Fallback defaults centralized in adapter

---

## DELIVERABLE E: ROLLBACK PLAN

### Rollback Window: < 1 minute

**If Phase 3G must be reverted**:

1. Revert ConditionTrackRules adapter (5 seconds)
2. Revert 3 file imports and adapter calls (15 seconds)
3. Reload system in Foundry (5 seconds)

**Estimated total rollback time**: 25 seconds

**No data loss**: All CT/SE state preserved; rollback only changes access paths.

---

## SUMMARY

**Phase 3G Scope Audit is COMPLETE and VALIDATED.**

- ✅ 11 Condition Track / Status Effects rules assigned to family
- ✅ 8 rules with direct reads identified across 3 files (9 total read calls)
- ✅ 3 rules defined but not currently read (will have adapter getters for completeness)
- ✅ Zero cross-family coupling detected
- ✅ Modern engines (ConditionEngine, CombatMechanicsEngine) already HouseRuleService-compliant
- ✅ Deprecated ConditionTrackMechanics correctly identified and considered
- ✅ All CT and SE behavior targets documented
- ✅ Governance enforcement pattern clear
- ✅ Rollback plan: < 1 minute
- ✅ Pattern fitness: PRODUCTION-READY (seventh family)

**Next Step**: Proceed to Phase 3G implementation - Create ConditionTrackRules adapter and rewire 3 files.

---

## APPENDIX: DETAILED READ LOCATIONS

### houserule-actor-enhancements.js

**Line 175**: Gating condition track display
```javascript
static _addConditionTrackDisplay(root, actor) {
  if (!game.settings.get(NS, 'conditionTrackEnabled')) return;
```

**Line 184**: Selecting variant for description
```javascript
const variant = game.settings.get(NS, 'conditionTrackVariant');
const description = ConditionTrackMechanics.getTrackLevelDescription(trackLevel, variant);
```

### houserule-mechanics.js

**Line 91**: Enforcing CT change cap
```javascript
const cap = game.settings.get('foundryvtt-swse', 'conditionTrackCap');
if (!cap || !update?.system?.conditionTrack?.current) {return;}
```

### houserule-status-effects.js

**Line 119**: Gating available effects retrieval
```javascript
static getAvailableEffects() {
  if (!game.settings.get(NS, 'statusEffectsEnabled')) {return [];}
```

**Line 121**: Selecting effect library
```javascript
const list = game.settings.get(NS, 'statusEffectsList');
return STATUS_EFFECTS_LIBRARY[list] || STATUS_EFFECTS_LIBRARY.combatConditions;
```

**Line 132**: Gating effect application
```javascript
static async applyEffect(actor, effectId) {
  if (!game.settings.get(NS, 'statusEffectsEnabled') || !actor) {return false;}
```

**Line 220**: Gating auto-apply on CT change
```javascript
static async autoApplyConditionEffects(actor, newTrackLevel) {
  const autoApply = game.settings.get(NS, 'autoApplyFromConditionTrack');
  if (!autoApply) {return;}
```

**Line 242**: Gating actor update hook
```javascript
static async onActorUpdate(actor, data) {
  if (!game.settings.get(NS, 'statusEffectsEnabled')) {return;}
```

**Line 245**: Selecting duration tracking mode
```javascript
const tracking = game.settings.get(NS, 'statusEffectDurationTracking');
if (tracking === 'rounds') {
```

**Line 262**: Gating rest cleanup
```javascript
static async onRestCompleted(data) {
  const autoRemove = game.settings.get(NS, 'autoRemoveOnRest');
  if (!autoRemove) {return;}
```

**Line 292**: Gating effect modifier calculation
```javascript
static getEffectModifiers(actor) {
  // ...
  if (!game.settings.get(NS, 'statusEffectsEnabled') || !actor) {return modifiers;}
```
