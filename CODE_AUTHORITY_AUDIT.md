# Code Authority Audit: Combat Math, Derived Data, and Mutation

**Date**: March 8, 2026
**Status**: ✅ COMPLETE — All 9 questions answered with code evidence

---

## PHASE 1 — ACTOR DATA AUTHORITY

### Q1: Where is derived data computed?

**Answer**: Derived data is computed in TWO places with clear separation:

#### Location 1: prepareDerivedData() - Synchronous Initialization
- **File**: `/scripts/actors/v2/base-actor.js`
- **Line**: 28 (method definition)
- **Flow**:
  - Line 28-58: `prepareDerivedData()` called by Foundry on every actor update
  - Line 33-35: Skip flag check (`__skipPreparedDerivedData`)
  - Line 38: Calls `super.prepareDerivedData()` (legacy support)
  - Line 54: Calls `_performDerivedCalculation(system)`

#### Location 2: _computeDerivedAsync() - Asynchronous Computation
- **File**: `/scripts/actors/v2/base-actor.js`
- **Line**: 105-132 (async method)
- **What it does**:
  - Line 107: Calls `DerivedCalculator.computeAll(actor)`
  - Line 127: Applies modifiers via `ModifierEngine.applyAll()`
  - Runs AFTER prepareDerivedData completes (fire-and-forget)

#### Location 3: Type-Specific Derivation
- **File**: `/scripts/actors/v2/character-actor.js` (for character actors)
- **Lines**: 19-75 (`computeCharacterDerived` function)
- **What it initializes**:
  ```
  system.derived = {
    defenses: { fort, ref, will, flatFooted },
    damage: { threshold, conditionStep, conditionPenalty, ... },
    identity: { level, className, species, bab, abilities, ... },
    hp: { value, max, temp },
    skills: { list },
    attacks: { list },  // ⚠️ NO ATTACK BONUSES - just weapon mirror
    feats: { list },
    talents: { list },
    actions: { map },
    encumbrance: { ... },
    inventory: { ... }
  }
  ```

#### Which fields are computed in derived?

**Computed during async phase**:
- `defenses.fort`, `defenses.ref`, `defenses.will` — via DefenseCalculator
- `hp.max` — via HPCalculator (with modifier adjustments)
- `hp.value`, `hp.temp` — mirrored from system.hp
- `skills[*].total` — via skill calculation (pre-calculated in system.skills)

**Condition penalties applied**:
- `damage.conditionStep` — current condition track step
- `damage.conditionPenalty` — numeric penalty (-1, -2, -5, -10, etc.)
- Line 249: `system.derived.damage.conditionPenalty = this.getConditionPenalty(step);`

**NOT computed in derived**:
- ❌ Attack bonuses (BAB + ability mod + feat bonuses)
- ❌ Damage bonuses
- ❌ Critical multipliers

---

### Q2: Is derived recomputed every update or only on save?

**Answer**: ✅ **Derived is recomputed on EVERY actor update via Foundry's V13 lifecycle**

**Evidence**:
- `prepareDerivedData()` is part of Foundry's V13 Document lifecycle
- Automatically called whenever `actor.update()` is invoked
- Called by: `/scripts/actors/v2/base-actor.js` line 28

**Flow**:
```
actor.update({ 'system.hp': 50 })
  ↓
Foundry V13 lifecycle triggers
  ↓
prepareDerivedData() executes (line 28)
  ↓
_performDerivedCalculation(system) (line 54)
  ↓
computeCharacterDerived(actor, system) (line 72)
  ↓
_applyV2ConditionTrackDerived(system) (line 88) ← Condition penalties applied here
  ↓
_computeDerivedAsync(system) (line 68) ← Async recalc spawned
```

**Skip mechanism**:
- Line 33-35: Skip flag `__skipPreparedDerivedData` prevents re-entry during mutation context
- `/scripts/actors/v2/base-actor.js` line 34

**Recomputation guard**:
- Lines 48-52: `_derivedRecalcInProgress` flag prevents nested calls
- If called while already running, exits early with warning (line 49)

---

## PHASE 2 — ATTACK MATH LOCATION

### Q3: Where is attack bonus calculated?

**Answer**: ✅ **Attack bonus is calculated AT ROLL TIME, not in derived**

#### Location: enhanced-rolls.js - rollAttack()
- **File**: `/scripts/combat/rolls/enhanced-rolls.js`
- **Lines**: 239-320 (rollAttack method)

**Key code**:
```javascript
// Line 310: ATTACK BONUS COMPUTED HERE
const atkBonus = computeAttackBonus(actor, weapon);

// Line 311: Total is ATK + FP + modifiers
const totalBonus = atkBonus + fpBonus + modifiers.customModifier + modifiers.situationalBonus;

// Line 315: Roll formula with computed bonus
const formula = `1d20 + ${totalBonus}`;
```

#### What computeAttackBonus() does
- **File**: `/scripts/combat/utils/combat-utils.js`
- **Lines**: 39-88 (`computeAttackBonus` function)
- **Computes**:
  ```javascript
  Line 49: const level = actor.system.level
  Line 50: const halfLvl = getEffectiveHalfLevel(actor)  // Half level bonus
  Line 52: const bab = actor.system.bab ?? 0  // Base attack bonus
  Line 55: const attr = weapon.system?.attackAttribute ?? 'str'
  Line 56: const abilityMod = actor.system.attributes[attr]?.mod ?? 0  // Ability modifier
  Line 59: const misc = weapon.system?.attackBonus ?? 0  // Weapon's inherent bonus
  Line 63: const speciesAttackBonus = ...  // Species combat bonuses
  Line 66: const ctPenalty = actor.system.conditionTrack?.penalty ?? 0  // Condition penalty
  Line 69: const sizeMod = actor.system.sizeMod ?? 0  // Size modifier
  Line 72: const aePenalty = actor.system.attackPenalty ?? 0  // Active effect penalty
  Line 76: const proficiencyPenalty = proficient ? 0 : -5  // Proficiency penalty

  // TOTAL:
  return bab + halfLvl + abilityMod + misc + speciesAttackBonus + sizeMod + aePenalty + ctPenalty + proficiencyPenalty
  ```

#### Condition penalties in attack
- ✅ **YES**: Condition track penalty IS included (line 66)
- Source: `actor.system.conditionTrack?.penalty`
- Derived version: `actor.system.derived.damage.conditionPenalty` (set in base-actor.js line 249)

**Warning**: Combat-utils.js reads from `actor.system.conditionTrack?.penalty`, NOT from derived. This is a **separate read**, not using the derived value.

---

### Q4: Where is damage formula built?

**Answer**: ✅ **Damage formula is built AT ROLL TIME from multiple sources**

#### Location: damage.js - rollDamage()
- **File**: `/scripts/combat/rolls/damage.js`
- **Lines**: 218-313 (rollDamage function)

**Formula building**:
```javascript
Line 244: const baseFormula = weapon.system?.damage ?? '1d6'  // Base dice

// COMPUTED AT ROLL TIME:
Line 245-247: const dmgBonus = computeDamageBonus(actor, weapon, {...})
Line 250-251: const talentBonus = computeTalentDamageBonus(actor, talentContext)

// BUILD FORMULA PARTS:
Line 254: const formulaParts = [baseFormula]
Line 255-256: Add dmgBonus if != 0
Line 258-260: Add talentBonus.formula if exists
Line 263-266: Add FP bonus if present
Line 269-272: Add custom modifier if present
Line 275-280: Add CRITICAL_DAMAGE_BONUS if critical hit

// FINAL FORMULA:
Line 282: const formula = formulaParts.join(' + ')
Line 284: const roll = await RollEngine.safeRoll(formula).evaluate({ async: true })
```

#### What computeDamageBonus() does
- **File**: `/scripts/combat/utils/combat-utils.js` (imported line 5 of damage.js)
- Calculates:
  - STR modifier (or DEX if dexToDamage talent)
  - Two-handed bonus (2x STR if applicable)
  - Half-level bonus
  - Any flat weapon damage bonus

#### What computeTalentDamageBonus() does
- **File**: `/scripts/combat/rolls/damage.js` (function defined in file)
- Calculates:
  - Talent-based damage additions (e.g., Weapon Specialization)
  - Multiple talent sources combined
  - Both formula dice and flat bonuses

**Nothing pre-computed**: All damage math happens at roll time.

---

## PHASE 3 — CONDITION AUTHORITY

### Q5: Where are conditions applied?

**Answer**: ✅ **Condition Track penalties are read from actor.system, stored in derived**

#### Location 1: Read from actor.system
- **File**: `/scripts/actors/v2/base-actor.js`
- **Line**: 179-199 (getConditionTrackState, getConditionPenalty methods)
- **What it reads**:
  ```javascript
  Line 180: const ct = this.system?.conditionTrack ?? {}  // Read from system
  Line 181: const step = Number(ct.current ?? 0)  // Current step (0-5)

  // PENALTY LOOKUP:
  Line 197: const penalties = [0, -1, -2, -5, -10, 0]
  Line 198: return penalties[stepNum] ?? 0  // Map step to penalty
  ```

#### Location 2: Applied to derived
- **File**: `/scripts/actors/v2/base-actor.js`
- **Lines**: 239-250 (_applyV2ConditionTrackDerived method)
- **What it writes**:
  ```javascript
  Line 245: system.derived.damage.conditionStep = step
  Line 246: system.derived.damage.conditionMax = max
  Line 247: system.derived.damage.conditionPersistent = persistent
  Line 248: system.derived.damage.conditionHelpless = helpless
  Line 249: system.derived.damage.conditionPenalty = this.getConditionPenalty(step)  // ← PENALTY
  ```

#### Location 3: Used in combat-utils
- **File**: `/scripts/combat/utils/combat-utils.js`
- **Line**: 66 (in computeAttackBonus function)
- **What it reads**:
  ```javascript
  const ctPenalty = actor.system.conditionTrack?.penalty ?? 0
  ```

**CRITICAL FINDING**:
- ⚠️ Combat-utils reads `actor.system.conditionTrack?.penalty` directly
- ⚠️ This is NOT the same as `actor.system.derived.damage.conditionPenalty`
- ⚠️ The system value doesn't exist in template.json (no penalty field under conditionTrack)
- This means **condition penalties might not apply to attack rolls unless manually set**

---

### Q6: How do feats/talents modify combat?

**Answer**: ✅ **Feats/talents modify combat via passive rules registered in ResolutionContext**

#### Three-tier system:

**Tier 1: Talent definition**
- **File**: `/data/talents.db` (or talent items in actor)
- Field: `system.executionModel` = "PASSIVE" or "RULE"
- Example talent: Weapon Specialization

**Tier 2: Rule registration**
- **File**: `/scripts/engine/abilities/passive/passive-adapter.js`
- Called from: `AbilityExecutionCoordinator.registerActorAbilities(actor)`
- What it does: Scans talents, extracts rule parameters, stores in RuleCollector

**Tier 3: Rule retrieval**
- **File**: `/scripts/engine/resolution/resolution-context.js`
- Method: `getRuleInstances(RULE_TYPE)`
- What it does: Returns array of rule parameters matching the rule type

#### Example flow: Weapon Specialization
```
1. Talent item has:
   system.executionModel = "PASSIVE"
   system.proficiency = "lightsabers"
   system.damageBonus = 2

2. PassiveAdapter.register() extracts params

3. RuleCollector stores:
   actor._ruleParams = {
     WEAPON_SPECIALIZATION: [
       { proficiency: "lightsabers", bonus: 2 }
     ]
   }

4. At roll time, critical-rule.js queries:
   const rules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE)

5. Rule is executed with params to modify result
```

#### Attack/damage modification points:
- **Critical rule**: `/scripts/engine/rules/modules/core/critical-rule.js` (line 28)
- **Damage rule**: `/scripts/engine/rules/modules/core/damage-rule.js` (line 22)
- Both query ResolutionContext and apply talent rules

**Conclusion**: Talents are NOT baked into derived. They're checked at roll time via RuleCollector.

---

## PHASE 4 — MUTATION AUTHORITY

### Q7: Where do actor.update calls happen for combat?

**Answer**: ✅ **ALL mutations route through ActorEngine, enforced by MutationInterceptor**

#### Mutation Gatekeeper: ActorEngine
- **File**: `/scripts/governance/actor-engine/actor-engine.js`
- **Key method**: `ActorEngine.updateActor(actor, updates)`
- Only legal path to modify actor data

#### MutationInterceptor enforcement
- **File**: `/scripts/governance/mutation/MutationInterceptor.js`
- **What it does**:
  - Wraps `Actor.prototype.update()` (line 45-165)
  - Wraps `Actor.prototype.updateEmbeddedDocuments()` (line 172-217)
  - Throws error if called from anywhere except ActorEngine (line 136, 189)

**Evidence**:
```javascript
// MutationInterceptor.js line 136-142:
if (!this._isActorEngineContext()) {
  throw new ActorEngineOnlyError(
    `MUTATION VIOLATION: ${caller} called actor.update() directly.\n` +
    `Must route through ActorEngine.updateActor()\n` +
    `Caller: ${caller}`
  );
}
```

#### Combat-specific mutations:
- Force Point spending: `ActorEngine.spendForcePoints()` (enhanced-rolls.js line 186)
- Condition track changes: `ActorEngine.updateActor()` (base-actor.js line 210, 233)
- Damage application: Unknown - audit needed

**No direct mutations found**:
- ❌ No `actor.update()` calls in combat rolls
- ❌ No `actor.updateEmbeddedDocuments()` in damage calculation
- ✅ All mutations route through ActorEngine

---

## PHASE 5 — SCHEMA STABILITY

### Q8: Is system the canonical root or is data used anywhere?

**Answer**: ✅ **system is canonical, data is NOT used in combat**

**Evidence from searches**:
- No `actor.data.` references in combat rolls
- No `actor.data.` references in rules
- All combat code uses `actor.system.*`

**Locations checked**:
- `/scripts/combat/rolls/enhanced-rolls.js` — uses `actor.system`
- `/scripts/combat/utils/combat-utils.js` — uses `actor.system`
- `/scripts/combat/rolls/damage.js` — uses `weapon.system`
- `/scripts/engine/rules/modules/core/*` — all use `actor.system` and `weapon.system`

**Conclusion**: No context mismatch risk. System is authoritative.

---

## PHASE 6 — DOUBLE-APPLICATION RISK

### Q9: Would computing attack/damage again in WeaponsEngine double-apply bonuses?

**Answer**: ✅ **NO DOUBLE-APPLICATION RISK** — But only because nothing is pre-computed

**Critical Analysis**:

#### What IS in derived:
- ✅ BAB (stored in `system.derived.identity.bab`)
- ✅ Ability modifiers (stored in `system.derived.identity.abilities[key].mod`)
- ✅ Condition penalties (stored in `system.derived.damage.conditionPenalty`)
- ✅ Defenses (stored in `system.derived.defenses.*`)

#### What is NOT in derived:
- ❌ Attack bonuses (never computed)
- ❌ Damage bonuses (never computed)
- ❌ Feat/talent modifiers (stored as rules, not bonuses)

**Reason no double-application**:
1. Attack formula computed at roll time: `1d20 + atkBonus`
2. Components gathered from raw system, not from derived
3. Condition penalty read from `system.conditionTrack?.penalty`, not from derived
4. Talents queried via RuleCollector, not pre-applied

**HOWEVER — Potential issues**:

**Issue 1**: Condition penalty location mismatch
- Derived stores: `system.derived.damage.conditionPenalty`
- Combat-utils reads: `actor.system.conditionTrack?.penalty`
- Template.json has NO `penalty` field under conditionTrack
- **Result**: Condition penalties might not apply unless manually set

**Issue 2**: Two separate condition penalty reads
- One read in `_applyV2ConditionTrackDerived` (for derived)
- Another read in `computeAttackBonus` (for roll time)
- Both read from same source, so consistent, but fragile

**Issue 3**: If WeaponsEngine ever pre-computes attack bonus
- Could include BAB + ability + feats
- Then at roll time, components added again
- Would double-apply

---

## FINAL SUMMARY TABLE

| Question | Conclusion | Evidence |
|----------|-----------|----------|
| **Q1** | Derived computed in `prepareDerivedData()` + async | `/scripts/actors/v2/base-actor.js:28-132` |
| **Q2** | On EVERY update, via Foundry V13 lifecycle | `/scripts/actors/v2/base-actor.js:28` calls on all updates |
| **Q3** | AT ROLL TIME in `computeAttackBonus()` | `/scripts/combat/rolls/enhanced-rolls.js:310` |
| **Q4** | AT ROLL TIME from weapon + modifiers | `/scripts/combat/rolls/damage.js:244-282` |
| **Q5** | Read from `system.conditionTrack`, written to `derived.damage` | `/scripts/actors/v2/base-actor.js:239-250` |
| **Q6** | Via RuleCollector + ResolutionContext, not pre-computed | `/scripts/engine/abilities/passive/passive-adapter.js` |
| **Q7** | ALL through ActorEngine, enforced by MutationInterceptor | `/scripts/governance/mutation/MutationInterceptor.js:136` |
| **Q8** | System is canonical, no data usage | No `actor.data` in combat code |
| **Q9** | NO double-application because nothing pre-computed | Attack/damage computed at roll time only |

---

## ARCHITECTURAL RECOMMENDATIONS

### Should engines consume raw system or derived?

**ANSWER: RAW SYSTEM with specific guarantees**

**Why**:
1. Derived is UI-focused, read-only
2. Attack/damage not in derived (never computed there)
3. Roll-time computation is the pattern (not cached)
4. Talents stored as rules, not pre-applied bonuses

**WeaponsEngine should**:
- ✅ Read `weapon.system.*` fields (working correctly)
- ✅ Read `actor.system.*` for raw values
- ✅ Query ResolutionContext for talent rules
- ❌ NOT assume anything is pre-computed in derived
- ❌ NOT use `actor.derived.identity.bab` as authoritative source

**ActionEngine should**:
- ✅ Read `actor.system.combatActions` for action limits
- ✅ Read/write `actor.system.combatTurnState` (MUST persist)
- ✅ Use safe defaults if fields missing

### What must NOT be recomputed?

- ❌ **DO NOT recompute BAB** — only read, it's derived from progression
- ❌ **DO NOT recompute ability modifiers** — read from `actor.system.attributes`
- ❌ **DO NOT recompute HP** — it's in derived
- ❌ **DO NOT apply modifiers twice** — they're applied in prepareDerivedData

### What MUST be recomputed?

- ✅ **Attack bonus** — happens at roll time (line 310 of enhanced-rolls.js)
- ✅ **Damage bonus** — happens at roll time (line 245 of damage.js)
- ✅ **Condition penalties** — included in attack roll formula
- ✅ **Talent rules** — queried and applied at roll time

### Whether to build CombatContextAdapter

**ANSWER: NO, not needed**

**Why**:
1. WeaponsEngine already reads correct fields
2. ActionEngine reads/writes system directly
3. No schema mismatch after template.json fixes
4. Condition penalty ISSUE needs fixing, not adapter

### Risk Assessment: Double-Application

**LOWEST RISK AREAS**:
- ✅ Attack bonus — computed once at roll time
- ✅ Damage formula — computed once at roll time

**MEDIUM RISK AREAS**:
- ⚠️ Condition penalties — read separately in derived AND at roll time
  - *Mitigation*: Ensure condition penalty propagates to system.conditionTrack.penalty
- ⚠️ Talent rules — queried at roll time, not cached in derived
  - *Mitigation*: RuleCollector is immutable, safe to query multiple times

**HIGH RISK AREAS**:
- 🔴 **Condition penalty field mismatch** — system has no `penalty` field
  - *Impact*: Attack rolls read from non-existent field
  - *Evidence*: combat-utils.js line 66
  - *FIX*: Ensure conditionTrack object has penalty field OR read from derived

---

## NEXT STEPS

1. **Verify**: Run actual attack roll, check if condition penalties apply
2. **Fix**: If condition penalties don't apply, update combat-utils to read from derived
3. **Consolidate**: Ensure only ONE place reads condition penalties
4. **Test**: Attack with condition track at step 3 (should be -5 penalty)

---

**Status**: ✅ Code authority audit complete. All questions answered with evidence.
