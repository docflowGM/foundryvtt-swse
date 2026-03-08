# PASSIVE Remaining Implementation — Minimal Invention Strategy

**Status:** Recommending action to complete remaining 260 deferred items
**Principle:** Leverage existing calculation pipelines + state predicates (zero new logic)

---

## Executive Summary

Rather than inventing new conditional systems, **wire PASSIVE bonuses into existing calculation points** where game state is already being inspected.

**Key Insight:** The remaining 260 "deferred" items aren't actually conditional—they're **state-dependent bonuses** that apply when specific game state conditions are true at calculation time.

Examples:
- "Against ranged attacks" → Filter existing defense-type detection
- "While moving at least 2 squares" → Read existing derived.movement state
- "For each ally within 12 squares" → Use existing proximity checks (flanking engine)
- "Whenever you hit" → Hook into existing attack-hit resolution
- "On your turn" → Check existing derived.isCurrentTurn or round tracking

---

## Existing Calculation Pipelines (Already Available)

### 1. **Defense Calculator** (`scripts/actors/derived/defense-calculator.js`)
- **Already does:** Gathers modifiers from multiple sources
- **Can filter by:** Defense type (fortitude/reflex/will), attack type (ranged vs melee)
- **Existing hook point:** No modifications needed — add state predicates to adjust penalty/bonus

### 2. **Attack Resolution** (`scripts/combat/rolls/attacks.js`)
- **Already does:** Computes attack bonus from BAB, ability, weapon, conditions
- **Can filter by:** Weapon type, target defense type, attacker movement state
- **Already reads:** Condition track penalty, proficiency, talent bonuses
- **Existing pattern:** Just add new bonus source alongside talentBonus

### 3. **Combat Engine** (`scripts/engine/combat/CombatEngine.js`)
- **Architecture:** Unidirectional, deterministic execution order
- **Hook system:** Already fires `swse:post-attack-hit` and other hooks
- **Extension points:** Can add new dispatch hooks without modifying core order

### 4. **Skill Check Resolution** (multiple engines)
- **Pattern:** Read skill modifier, apply bonuses, return total
- **Can filter by:** Skill type, character state

---

## Recommended 3-Phase Approach

### **PHASE 1: Create PASSIVE/STATE Subtype**

**Goal:** Define how state-dependent bonuses are stored and evaluated

Create new file: `scripts/engine/abilities/passive/passive-state.js`

```javascript
export const PASSIVE_STATE_PREDICATES = {
  // Defense filters
  "defense.against-ranged": (actor, context) => context.attackType === 'ranged',
  "defense.against-melee": (actor, context) => context.attackType === 'melee',

  // Movement state
  "movement.while-moving": (actor) => (actor.system.derived?.movement?.movementUsed || 0) >= 2,

  // Proximity state
  "proximity.allies-within": (actor, range) => {
    // Reuse existing flanking proximity check
    const allies = // compute from combat
    return allies.length;
  },

  // Turn state
  "turn.on-current-turn": (actor) => actor.system.derived?.isCurrentTurn === true,
  "turn.once-per-round": (actor) => actor.system.derived?.roundsTaken?.lastRound !== getCurrentRound(),

  // Attack outcome state
  "attack.when-hit": (actor, context) => context.hitResult === true,
  "attack.when-miss": (actor, context) => context.hitResult === false,

  // Target relationship state
  "target.is-flanked": (target) => target.system.derived?.isFlanked === true,
  "target.prone": (target) => target.system.derived?.isProne === true,
  "target.stunned": (target) => target.system.derived?.isStunned === true,
};

/**
 * PASSIVE/STATE subtype schema
 */
export const PASSIVE_STATE_SCHEMA = {
  executionModel: "PASSIVE",
  subType: "STATE",
  abilityMeta: {
    modifiers: [
      {
        target: "defense.reflex",
        type: "untyped",
        value: 2,
        predicates: ["defense.against-ranged"],  // Only applies when predicate is true
        enabled: true,
        priority: 500,
        description: "Migrated from Hard Target"
      }
    ],
    rules: []
  }
};
```

---

### **PHASE 2: Wire Into Existing Calculation Points**

**Goal:** Inject state predicate evaluation into 4 key calculations

#### **2a. Defense Calculation**
File: `scripts/actors/derived/defense-calculator.js`

**Add after existing modifiers gathering:**
```javascript
// At the point where we gather all defense adjustments:
const stateModifiers = await this._getStateModifiers(actor, defenseType, context);
defAdjust += stateModifiers;
```

#### **2b. Attack Resolution**
File: `scripts/combat/rolls/attacks.js`

**In `computeAttackBonus()` after talentBonus:**
```javascript
// Check for PASSIVE/STATE bonuses that apply to attack rolls
const stateBonus = await getPassiveStateBonus(actor, 'attack', {
  weapon,
  targetDefense: context.targetDefense,
  movementUsed: actor.system.derived?.movement?.movementUsed
});

return (
  bab + halfLvl + abilityMod + miscBonus + sizeMod +
  attackPenalty + ctPenalty + proficiencyPenalty + talentBonus + stateBonus
);
```

#### **2c. Combat Engine Hook**
File: `scripts/engine/combat/CombatEngine.js`

**Add hook after hit determination:**
```javascript
// Fire hook so PASSIVE/STATE can react to hit/miss
await Hooks.call('swse:attack-resolved', {
  attacker: context.attacker,
  target: context.target,
  hitResult: hitDetermined,
  roll: context.attackRoll
});
```

#### **2d. Skill Check Resolution**
File: `scripts/engine/skills/skill-enforcement-engine.js`

**Add state-dependent skill modifiers:**
```javascript
const baseSkillBonus = actor.system.skills[skillName].misc || 0;
const stateSkillBonus = await getPassiveStateBonus(actor, 'skill', {
  skillName,
  skillValue: baseSkillBonus
});
return baseSkillBonus + stateSkillBonus;
```

---

### **PHASE 3: Bulk Migrate Remaining 260 Items**

**Goal:** Convert deferred items to PASSIVE/STATE using predicates

**Migration Rules by Category:**

| Category | Predicate Pattern | Example |
|----------|-------------------|---------|
| **DEFER-TARGET (47)** | `target.*` + `attack.*` | "Against ranged" → `predicates: ["defense.against-ranged"]` |
| **DEFER-ACTION (44)** | `turn.*` + `movement.*` | "On your turn" → `predicates: ["turn.on-current-turn"]` |
| **DEFER-CONDITIONAL (81)** | Composite predicates | "For each ally" → `predicates: ["proximity.allies-within-12", { dynamic: "ally-count" }]` |
| **DEFER-SUBSTITUTION (13)** | Special handling (stay DEFERRED) | "Instead of" → DEFER (requires action economy) |
| **DEFER-TEMPORAL (1)** | Duration-based (stay DEFERRED) | Rounds → DEFER |
| **DEFER-UNKNOWN (57)** | Manual audit → assign predicate | Review case-by-case |

**Example Migration:**

**Before (description-only):**
```json
{
  "name": "Hard Target",
  "system": {
    "benefit": "You gain a +2 bonus to Reflex Defense against ranged attacks while moving at least 2 squares on your turn."
  },
  "effects": [
    { "name": "Hard Target", "changes": [], "disabled": false }
  ]
}
```

**After (PASSIVE/STATE):**
```json
{
  "name": "Hard Target",
  "system": {
    "executionModel": "PASSIVE",
    "subType": "STATE",
    "benefit": "You gain a +2 bonus to Reflex Defense against ranged attacks while moving at least 2 squares on your turn.",
    "abilityMeta": {
      "modifiers": [
        {
          "target": "defense.reflex",
          "type": "untyped",
          "value": 2,
          "predicates": [
            "defense.against-ranged",
            "movement.while-moving",
            "turn.on-current-turn"
          ],
          "enabled": true,
          "priority": 500,
          "description": "Hard Target: +2 Reflex vs ranged while moving"
        }
      ],
      "rules": []
    }
  },
  "effects": [
    {
      "name": "Hard Target",
      "changes": [],
      "disabled": true,
      "flags": {
        "swse": {
          "migratedToPassive": true,
          "migrationType": "state-dependent"
        }
      }
    }
  ]
}
```

---

## What Stays DEFERRED (Not Converted to STATE)

**Items that violate PASSIVE invariants even with state predicates:**

1. **DEFER-SUBSTITUTION (13):** "Instead of use X skill" → Requires action economy gating
2. **DEFER-TEMPORAL (1):** "Until end of next round" → Requires round tracking
3. **Complex DEFER-CONDITIONAL (15):** "If allies outnumber enemies by 2+" → Requires evaluation of relative state
4. **DEFER-UNKNOWN (20):** Requires manual audit before deciding

**Total staying DEFERRED:** ~50 items (legitimate deferral, not abandoned)

---

## Implementation Checklist

### Step 1: Create Foundation
- [ ] Create `passive-state.js` with predicate definitions
- [ ] Add `_getStateModifiers()` helper to DefenseCalculator
- [ ] Add `getPassiveStateBonus()` utility function
- [ ] Add predicates to abilityMeta schema validation

### Step 2: Wire Into Calculation Points
- [ ] Inject state modifier gathering into DefenseCalculator
- [ ] Inject state bonus into computeAttackBonus()
- [ ] Inject state bonus into skill check resolution
- [ ] Add swse:attack-resolved hook to CombatEngine
- [ ] Add unit tests for each injection point

### Step 3: Bulk Migrate
- [ ] Audit remaining 260 items (categorize, assign predicates)
- [ ] Write migration script to batch-update feats.db/talents.db/species.db
- [ ] Validate: 0 enabled ActiveEffects with empty changes arrays remain
- [ ] Confirm: All predicates are recognized and evaluable

### Step 4: Validate
- [ ] Test defense calculations with predicates enabled/disabled
- [ ] Test attack rolls with dynamic bonuses
- [ ] Test skill checks with state-dependent modifiers
- [ ] Run Sentinel health checks
- [ ] Verify no double-stacking

---

## Why This Is Minimal Invention

✅ **No new conditional logic** — Uses existing game state inspection
✅ **No new action economy** — Reuses existing turn tracking
✅ **No new target context** — Bonuses apply to self-calculations
✅ **No evaluation strings** — Pure predicate name matching
✅ **Zero formula support** — All values are static modifiers
✅ **Fully deterministic** — State-based, not event-based

**Result:** 200+ additional items can be migrated using existing infrastructure with minimal new code.

---

## Migration Script Sketch

```bash
node /tmp/migrate-passive-state.js \
  --input-packs feats.db,talents.db,species.db \
  --mapping /tmp/predicate-mapping.json \
  --output-packs feats.db,talents.db,species.db \
  --validate
```

Output:
```
Processed 260 items
  ✓ 210 migrated to PASSIVE/STATE
  ✓ 30 reviewed and re-deferred (legitimate)
  ✓ 20 flagged for manual audit

PASSIVE completion: 305/355 items (86%)
Ready for Sentinel validation.
```

---

## Next Steps

**If this approach is approved:**

1. Implement Phase 1 (predicate system)
2. Create migration script & test on small dataset
3. Run Sentinel health check after Phase 2 wiring
4. Bulk migrate Phase 3
5. Validate and commit

**Estimated effort:** 3-4 hours engineering + 1 hour testing
**Risk:** Very low (state predicates evaluated at read-time, not write-time)
**Reversibility:** 100% (can revert migration script, re-enable old effects)

---

## Questions for Approval

1. Does this predicate approach align with your vision for PASSIVE?
2. Should proximity checks reuse the flanking engine, or need dedicated proximity layer?
3. Should "once per round" track be in action economy, or new in PASSIVE/STATE?
4. Are there additional state predicates you'd like defined beyond the examples above?

