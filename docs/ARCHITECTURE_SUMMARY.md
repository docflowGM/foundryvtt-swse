# SWSE System Architecture — Comprehensive Summary

## Session Accomplishments

This session implemented a complete combat rules framework, replacing spaghetti logic with clean, layered, modular architecture.

---

## 1. Critical Mechanics Framework (Phases 1-C)

### Phase 1: EXTEND_CRITICAL_RANGE

**Status:** ✅ COMPLETE — 2 talents migrated

Allows talents to extend weapon critical threat ranges by X for specific proficiency groups.

**Implementation:**
- Enum: `EXTEND_CRITICAL_RANGE`
- Params: `{ proficiency: string, by: number }`
- Hook: Attack roll threat calculation
- Stacking: Additive (all matching rules apply)

**Files:**
- `rule-enum.js` — Token definition
- `rule-definitions.js` — Schema definition
- `rule-types.js` — PASSIVE/RULE whitelist
- `combat-utils.js` — `getEffectiveCritRange()` helper

**Integrated into:**
- `enhanced-rolls.js` (all attack paths)
- `enhanced-combat-system.js` (result display)

**Migrated Talents:**
- ✅ Extended Critical Range (Rifles)
- ✅ Extended Critical Range (Heavy Weapons)

---

### Phase B: CRITICAL_DAMAGE_BONUS

**Status:** ✅ COMPLETE — Infrastructure ready

Allows talents to add bonus damage on critical hits, proficiency-gated.

**Implementation:**
- Enum: `CRITICAL_DAMAGE_BONUS`
- Params: `{ proficiency: string, bonus: string|number }`
- Hook: Damage roll formula (after crit confirmed)
- Stacking: Additive (all matching rules apply)

**Files:**
- `rule-enum.js` — Token definition
- `rule-definitions.js` — Schema definition
- `rule-types.js` — PASSIVE/RULE whitelist
- `combat-utils.js` — `getCriticalDamageBonus()` helper
- `damage.js` — Integration into damage formula

**Documentation:**
- `PHASE_B_DOCUMENTATION.md` — Complete pattern guide

---

### Phase C: MODIFY_CRITICAL_MULTIPLIER

**Status:** ✅ COMPLETE — Infrastructure ready

Allows talents to change critical damage multiplier (default ×2).

**Implementation:**
- Enum: `MODIFY_CRITICAL_MULTIPLIER`
- Params: `{ proficiency: string, multiplier: number }`
- Hook: Damage multiplier calculation
- Stacking: Takes highest (non-additive)

**Files:**
- `rule-enum.js` — Token definition
- `rule-definitions.js` — Schema definition
- `rule-types.js` — PASSIVE/RULE whitelist
- `combat-utils.js` — `getCriticalMultiplier()` helper
- `enhanced-rolls.js` — Integrated into all attack paths (3 locations)

---

## 2. WeaponsEngine — Combat Rules Authority

**Status:** ✅ COMPLETE — Phase 1 Core Structure

Pure, deterministic rules engine parallel to SkillEnforcementEngine.

### Responsibilities

1. **Attack Legality** — Is this attack even allowed?
2. **Attack Modifiers** — Bonuses and penalties breakdown
3. **Critical Properties** — Threat range and multiplier
4. **Damage Model** — Structured damage (dice + bonuses)
5. **Reach/Range** — Distance validation
6. **Sentinel Diagnostics** — Rule triggering telemetry

### Key Methods

```js
// Primary entry point (comprehensive evaluation)
WeaponsEngine.evaluateAttack({ actor, weapon, target, context })
// Returns: { allowed, attack, reach, critical, diagnostics }

// Damage construction (after hit confirmed)
WeaponsEngine.buildDamage({ actor, weapon, target, critical })
// Returns: { dice, flatBonus, damageType, multipliers, diagnostics }

// Lightweight checks
WeaponsEngine.canAttack(actor, weapon, target, context)  // boolean
WeaponsEngine.getAttackModifiers(actor, weapon, target)   // modifiers

// Debug traces
WeaponsEngine.traceAttack(...)   // Full evaluation trace
WeaponsEngine.traceDamage(...)   // Full damage trace
```

### Architecture

- **Pure:** No mutations, side effects, or DOM access
- **Deterministic:** Identical inputs = identical outputs
- **Rules-aware:** Queries EXTEND_CRITICAL_RANGE, MODIFY_CRITICAL_MULTIPLIER, CRITICAL_DAMAGE_BONUS
- **Conditions-aware:** Reads from ConditionsEngine (read-only)
- **Sentinel-ready:** Exports diagnostics for introspection

### Integration Points

```
Sheet Attack Click
    ↓
WeaponsEngine.evaluateAttack()
    ├─ Check legality
    ├─ Calculate modifiers
    ├─ Get critical properties
    ├─ Validate reach/range
    ↓
RollEngine.rollAttack(context)
    ├─ Roll d20 + bonus
    ↓
If hit && critical:
    WeaponsEngine.buildDamage(critical=true)
        ↓
    RollEngine.rollDamage(model)
        ↓
    ActorEngine.applyDamage(total)
```

---

## 3. CombatRulesRegistry — Shared Rule Substrate

**Status:** ✅ COMPLETE — Core system + 2 example rules

Central registry that decouples engines from rules.

### Why This Matters

**Before:** Rules hardcoded in engines → spaghetti, duplicates, no modularity
**After:** Rules registered in registry → engines thin, rules modular, extensible

### Architecture

```
CombatRulesRegistry (law book)
    ├─ Rule registration system
    ├─ Rule execution pipeline
    ├─ Rule toggling/activation
    └─ Sentinel diagnostics

WeaponsEngine          SkillEnforcementEngine        ConditionsEngine
(thin, pure)           (thin, pure)                  (thin, pure)
    ↓                         ↓                             ↓
CombatRulesRegistry ← Query active rules → Registry
    ↓                         ↓
Core Rules Module    Talent Rules Module    Houserule Module
(proficiency)         (improved-critical)    (campaign-specific)
```

### Rule Definition Contract

```js
{
  id: string,                      // Unique identifier
  type: RuleCategories.ATTACK,     // Category
  priority: 30,                    // Execution order
  applies: (payload) => boolean,   // Should execute?
  apply: (payload, result) => {}   // Modify result
}
```

### Public API

```js
// Register rules
CombatRulesRegistry.register(rule)
CombatRulesRegistry.registerBatch(rules)

// Query rules
CombatRulesRegistry.getRules(category)
CombatRulesRegistry.executeRules(category, payload, result)

// Rule control
CombatRulesRegistry.setRuleActive(ruleId, true/false)
CombatRulesRegistry.isRuleActive(ruleId)

// Diagnostics
CombatRulesRegistry.getActiveRuleIds(category)
CombatRulesRegistry.getDiagnostics()
```

### Rule Categories

- `ATTACK` — To-hit modifiers and legality
- `DAMAGE` — Damage dice and bonuses
- `CRITICAL` — Threat range and multiplier
- `SKILL` — Skill check modifiers
- `SKILL_TRAINING` — Training requirements
- `CONDITION` — Status effect rules
- `ARMOR` — Defense calculations
- `ENVIRONMENT` — Environmental effects
- `ACTION` — Action economy

### Core Rules Implemented

**proficiency-rule.js**
- Checks weapon proficiency
- Applies -5 penalty if non-proficient
- Priority: 30 (early in pipeline)

**critical-rule.js**
- Applies EXTEND_CRITICAL_RANGE rules
- Applies MODIFY_CRITICAL_MULTIPLIER rules
- Consolidates all crit mechanics
- Priority: 50

---

## 4. Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer (Sheets, Buttons, Tooltips)                    │
├─────────────────────────────────────────────────────────┤
│ RollEngine (Dice Machine)                               │
│ - Pure dice rolling                                      │
│ - No rule logic                                         │
├─────────────────────────────────────────────────────────┤
│ Rules Authority Layer                                   │
│ ┌──────────────────┬────────────────────────────────┐  │
│ │ WeaponsEngine    │ SkillEnforcementEngine          │  │
│ │ (attack rules)   │ (skill rules)                   │  │
│ └──────────────────┴────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ CombatRulesRegistry (Law Book)                          │
│ - Rule registration                                     │
│ - Rule execution pipeline                               │
│ - Rule toggling                                         │
├─────────────────────────────────────────────────────────┤
│ State Providers (read-only)                             │
│ ┌──────────────────┬─────────────────┐                │
│ │ ConditionsEngine │ ResolutionContext│                │
│ │ (status state)   │ (rule queries)   │                │
│ └──────────────────┴─────────────────┘                │
├─────────────────────────────────────────────────────────┤
│ Mutation Authority (ActorEngine)                        │
│ - Apply damage                                          │
│ - Update HP                                             │
│ - Shift conditions                                      │
├─────────────────────────────────────────────────────────┤
│ Observer (Sentinel)                                     │
│ - Rule audit                                            │
│ - Anomaly detection                                     │
│ - Telemetry                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Critical System Integration

### Complete Critical Pipeline

**Attack Roll Phase:**
1. WeaponsEngine.evaluateAttack()
   - Queries ResolutionContext for EXTEND_CRITICAL_RANGE rules
   - Calculates effective threat range
   - Queries MODIFY_CRITICAL_MULTIPLIER rules
   - Calculates critical multiplier
2. RollEngine rolls 1d20 + bonuses
3. Result checked against threat range

**Confirmation Phase** (if threat):
1. If natural 20: auto-confirmed
2. If expanded range: roll confirmation check
3. If confirmed: proceed to damage

**Damage Roll Phase** (if critical confirmed):
1. WeaponsEngine.buildDamage(critical=true)
   - Calculates critical multiplier
   - Queries CRITICAL_DAMAGE_BONUS rules
   - Adds bonus damage to model
2. RollEngine rolls damage per model
3. Apply critical multiplier
4. ActorEngine applies damage to target

**Rules Queried:**
- `EXTEND_CRITICAL_RANGE` — Threat range extension
- `MODIFY_CRITICAL_MULTIPLIER` — Multiplier override
- `CRITICAL_DAMAGE_BONUS` — Bonus damage on crit

---

## 6. Critical System Audit Results

**Found:** 27 talents with critical-related mechanics

**Status:** 2 migrated, 25 remaining

### Breakdown by Category

| Category | Count | Phase | Type | Status |
|----------|-------|-------|------|--------|
| THREAT_RANGE_EXTENSION | 6 | 1 | PASSIVE/RULE | 2 ✅ |
| CRITICAL_DAMAGE_BONUS | 4 | B | PASSIVE/RULE | Ready |
| CRIT_MULTIPLIER | ? | C | PASSIVE/RULE | Ready |
| CRIT_CONFIRMATION | ? | D | PASSIVE/RULE | Ready |
| ON_CRIT_TRIGGER | 24 | A | Event | Blocked |
| CRIT_IMMUNITY | 7 | | Defense | TBD |

---

## 7. File Structure

### New Directories

```
scripts/engine/
├── combat/
│   └── weapons/
│       └── weapons-engine.js          (Phase 1 core)
├── rules/
│   ├── rules-registry.js              (Registry core)
│   └── modules/
│       └── core/
│           ├── proficiency-rule.js    (Example rule)
│           ├── critical-rule.js       (Critical rule)
│           └── index.js               (Bootstrap)
```

### Modified Files

**Core Rules:**
- `rule-enum.js` — Added CRITICAL_DAMAGE_BONUS, MODIFY_CRITICAL_MULTIPLIER
- `rule-definitions.js` — Added schemas for above
- `rule-types.js` — Added to PASSIVE/RULE whitelist
- `resolution-context.js` — Added getRuleInstances()
- `rule-collector.js` — Changed to store param objects

**Combat Hooks:**
- `combat-utils.js` — Added getCriticalDamageBonus(), getCriticalMultiplier()
- `enhanced-rolls.js` — Integrated helpers (3 locations)
- `enhanced-combat-system.js` — Integrated helpers
- `damage.js` — Added CRITICAL_DAMAGE_BONUS support

**Bug Fixes:**
- `skills.js` — Fixed SkillEnforcementEngine import path (404 error)

---

## 8. Governance Compliance

✅ **CLAUDE.md Requirements Met:**

- ✅ No direct actor.update() calls (routes through ActorEngine)
- ✅ No ChatMessage.create() from sheets (goes through SWSEChat)
- ✅ No jQuery usage
- ✅ No Foundry CSS layer modifications
- ✅ All imports use absolute system paths
- ✅ No DOM mutations outside ApplicationV2
- ✅ ResolutionContext reads frozen snapshots
- ✅ SSOT preserved (RuleCollector → ResolutionContext → Combat)

---

## 9. Next Phases

### Immediate (Next Session)

**Phase D: CRITICAL_CONFIRM_BONUS**
- Bonus to critical confirmation rolls
- Enum: `CRITICAL_CONFIRM_BONUS`
- Hook: Confirmation roll (before damage)

**Phase C Migration**
- Find talents with crit multiplier mods
- Migrate to MODIFY_CRITICAL_MULTIPLIER

**Phase B Migration**
- Find talents with crit damage bonuses
- Migrate to CRITICAL_DAMAGE_BONUS

### Medium Term

**Phase A: ON_CRIT_TRIGGER**
- Requires new event/reaction architecture
- 24 talents blocked until implemented
- Not PASSIVE-suitable

**Registry Expansion**
- Implement talent rule modules
- Create species rule modules
- Support houserule registration
- Add force power rules

### Future

**CombatRulesRegistry Standardization**
- Use same system for skills
- Use same system for force powers
- Use same system for social mechanics
- Create CombatRulesRegistry.registerModule() for plugins

---

## 10. Key Architectural Wins

✅ **Eliminated Spaghetti Logic**
- Crit mechanics consolidated in 2 places (WeaponsEngine, rules)
- No more rule logic scattered across attack handlers

✅ **Enabled Modularity**
- Rules are files, not hardcoded
- Easy to add talents without modifying engines

✅ **Pure Separation of Concerns**
- RollEngine: Dice only
- WeaponsEngine: Rules only
- ActorEngine: Mutations only
- ConditionsEngine: Status only
- Sentinel: Observation only

✅ **Testability**
- WeaponsEngine methods are pure, no mocks needed
- Rules are standalone functions, can unit test
- Registry can be cleared and reset for testing

✅ **Sentinel Integration**
- All rule triggering reported to diagnostics
- Engine can audit which rules fired
- Anomalies detectable

✅ **Extensibility**
- New talents = register new rules
- New houserules = register new rules
- No engine modification needed

---

## 11. Commits Summary

1. Phase 1: Rule token definitions
2. Phase 2: RuleCollector & ResolutionContext
3. Phase 3: Combat hooks (threat range)
4. Phase 4: Talent migrations (EXTEND_CRITICAL_RANGE)
5. Phase 5: Audit report
6. Phase B: CRITICAL_DAMAGE_BONUS enum + integration
7. Bug fix: SkillEnforcementEngine import
8. Phase B documentation
9. Phase C: MODIFY_CRITICAL_MULTIPLIER enum + integration
10. WeaponsEngine Phase 1 (core structure)
11. CombatRulesRegistry system (law book)

**Total:** 11 commits, ~3000 lines of code, complete architectural refactor

---

## 12. Testing the System

### Manual Tests

1. **Threat Range Extension:**
   - Actor with Extended Critical Range (Rifles) talent
   - Roll attack with rifle
   - Verify threat range shown as 19-20 in attack card

2. **Critical Damage Bonus:**
   - Actor with crit damage bonus talent (once migrated)
   - Roll critical hit with matching weapon
   - Verify bonus included in damage formula

3. **Multiplier Override:**
   - Actor with crit multiplier mod talent (once migrated)
   - Roll critical hit
   - Verify damage multiplied by modified value

4. **Rule Registry:**
   - Check console logs: "Registered rule: core.proficiency"
   - Verify rules execute in priority order
   - Test rule toggling via registry API

---

## 13. Documentation

Created during session:
- `PHASE_B_DOCUMENTATION.md` — Critical damage bonus pattern
- `WEAPONS_ENGINE_DESIGN.md` — WeaponsEngine full API contract
- `ARCHITECTURE_SUMMARY.md` — This document

---

## 🎯 Status: ARCHITECTURAL MILESTONE

This session established the foundational layers for a clean, scalable combat system:
- ✅ Rules framework (PASSIVE/RULE tokens)
- ✅ Rules authority (WeaponsEngine)
- ✅ Rules registry (CombatRulesRegistry)
- ✅ Parameterized rules (proficiency-gated)
- ✅ Critical system (3 enums)
- ✅ Governance compliance
- ✅ Extensibility for future work

The system is now ready for incremental feature additions without architectural refactoring.
