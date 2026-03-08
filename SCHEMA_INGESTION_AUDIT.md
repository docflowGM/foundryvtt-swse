# Schema Ingestion Audit: Combat Actions & Abilities

**Status**: 🔴 CRITICAL GAPS IDENTIFIED
**Date**: March 8, 2026

---

## Executive Summary

The WeaponsEngine and ActionEngine are properly **reading** ability/combat data via the correct fields, BUT several critical fields are **missing from the actor schema** that these engines expect.

---

## Verified: Weapons Engine Data Ingestion

### Weapon Fields Being Read (✅ Correct)

WeaponsEngine and combat-utils correctly read from `weapon.system`:

**Attack Calculations**:
- ✅ `weapon.system.attackAttribute` — Which ability (str/dex) to use
- ✅ `weapon.system.attackBonus` — Weapon's attack bonus
- ✅ `weapon.system.proficient` — Whether actor is proficient
- ✅ `weapon.system.proficiency` — Weapon group (lightsabers, blasters, etc.)
- ✅ `weapon.system.disabled` — Whether weapon is disabled

**Critical Hits**:
- ✅ `weapon.system.critRange` — Threat range (default 20)
- ✅ `weapon.system.critMultiplier` — Critical multiplier (default 2)

**Reach/Range**:
- ✅ `weapon.system.range` — melee/ranged/distant
- ✅ `weapon.system.isLight` — Light weapon property
- ✅ `weapon.system.size` — Weapon size
- ✅ `weapon.system.twoHanded` — Two-handed property
- ✅ `weapon.system.hands` — Number of hands
- ✅ `weapon.system.category` — Weapon category
- ✅ `weapon.system.ranged` — Boolean ranged flag

**Damage**:
- ✅ `weapon.system.damage` — Base damage dice formula

### Actor Fields Being Read (✅ Mostly Correct)

Combat-utils correctly read from `actor.system`:

**Existing & Correct**:
- ✅ `actor.system.level` — Character level
- ✅ `actor.system.bab` — Base attack bonus
- ✅ `actor.system.attributes[str].mod` — Ability modifiers
- ✅ `actor.system.conditionTrack.penalty` — Condition track penalty
- ✅ `actor.system.sizeMod` — Size modifier
- ✅ `actor.system.attackPenalty` — Attack penalty

---

## 🔴 CRITICAL GAPS: Missing Schema Fields

### Gap 1: Combat Actions Configuration

**Expected by ActionEngine**:
```javascript
actor.system.combatActions.maxSwiftPerTurn  // Line 69 of action-engine.js
```

**Problem**: Field does NOT exist in template.json

**Current Default**: `?? 1` (if missing, defaults to 1)

**What's Missing**:
```json
"combatActions": {
  "maxSwiftPerTurn": 1,    // Usually 1, can be more for some classes
  "maxStandardPerTurn": 1,
  "maxMovePerTurn": 1
}
```

**Impact**:
- ✅ **NOT BLOCKING** — ActionEngine has safe defaults
- ⚠️ **LIMITED** — Can't increase swift actions per house rules
- ⚠️ **NO PERSISTENCE** — Can't store custom combat action limits

---

### Gap 2: Combat Turn State

**Expected by ActionEngine**:
```javascript
actor.system.combatTurnState  // Used in action-economy-bindings.js and enhanced-rolls.js
```

**Problem**: Field does NOT exist in template.json

**Current Default**: `undefined` (created on-demand via ActionEngine.startTurn())

**What's Missing**:
```json
"combatTurnState": {
  "actorId": "",
  "hasStandardAction": true,
  "hasMoveAction": true,
  "swiftActionsUsed": 0,
  "maxSwiftActions": 1,
  "actionsUsed": []
}
```

**Impact**:
- ✅ **NOT BLOCKING** — Recreated each turn via ActionEngine.startTurn()
- ⚠️ **NO PERSISTENCE** — Lost on page reload
- ⚠️ **NO RECOVERY** — Can't resume mid-turn

---

### Gap 3: Species Combat Bonuses Location

**Current Implementation** (line 62 of combat-utils.js):
```javascript
const speciesCombat = actor.system?.speciesCombatBonuses ||
                      actor.system?.speciesTraitBonuses?.combat || {};
```

**Problem**: Falls back to two different paths (speciesCombatBonuses OR speciesTraitBonuses.combat)

**What Should Exist**:
```json
"speciesCombatBonuses": {
  "meleeAttack": 0,
  "rangedAttack": 0,
  "defense": 0
}
```

**Status**: Unclear if one or both paths actually exist in template

---

## ✅ Verified: Ability Ingestion Flow

Abilities properly flow through the system:

1. **Definition**: Talents/Feats in packs with `system.executionModel`
2. **Registration**: AbilityExecutionCoordinator.registerActorAbilities()
3. **Adaptation**: PassiveAdapter collects RULE-type abilities
4. **Collection**: RuleCollector aggregates rules into arrays
5. **Storage**: Finalized into `actor._ruleParams` (frozen)
6. **Resolution**: ResolutionContext.getRuleInstances(ruleType) queries them

**Flow Diagram**:
```
Talent.system.executionModel="PASSIVE"
  ↓
AbilityExecutionCoordinator.registerActorAbilities()
  ↓
PassiveAdapter.register()
  ↓
RuleCollector.add()
  ↓
RuleCollector.finalize(actor)
  ↓
actor._ruleParams = { EXTEND_CRITICAL_RANGE: [{proficiency: "lightsabers", by: 1}] }
  ↓
ResolutionContext.getRuleInstances(EXTEND_CRITICAL_RANGE)
  ↓
CombatRulesRegistry executes rule with params
```

✅ **This flow is working correctly**

---

## Action Costs in Combat Actions

### Current Status

ActionEngine receives action costs via:
```javascript
const costMap = {
  standard: { standard: 1, move: 0, swift: 0 },
  move: { standard: 0, move: 1, swift: 0 },
  swift: { standard: 0, move: 0, swift: 1 },
  full: { standard: 1, move: 1, swift: 0 }
};
```

### Missing: Combat-Action Item Data

Combat-Action items should have:
```javascript
system.actionCost: {
  standard: 0,
  move: 0,
  swift: 1   // or 2+ for expensive abilities
}
```

**Current Status**: ❌ **NOT VERIFIED** where action costs come from

Need to check:
- [ ] Do combat-action items have actionCost field?
- [ ] Is ActionType enum complete?
- [ ] How do abilities declare their action costs?

---

## Recommendations

### Priority 1: Add Missing Schema Fields

Update `template.json` character actor schema:

```json
"combatActions": {
  "maxSwiftPerTurn": 1,
  "maxStandardPerTurn": 1,
  "maxMovePerTurn": 1
},

"combatTurnState": {
  "actorId": "",
  "hasStandardAction": true,
  "hasMoveAction": true,
  "swiftActionsUsed": 0,
  "maxSwiftActions": 1,
  "actionsUsed": []
},

"combat": {
  "meleeAttack": 0,
  "rangedAttack": 0,
  "defense": 0
}
```

### Priority 2: Verify Species Combat Bonuses Path

Ensure consistent field name:
- Choose ONE: `speciesCombatBonuses` OR `speciesTraitBonuses.combat`
- Update combat-utils.js to only check one path
- Update template.json to have field

### Priority 3: Verify Combat-Action Item Schema

Check that combat-action items have:
- `system.actionCost` field with { standard, move, swift }
- `system.actionType` field
- Proper default values

### Priority 4: Add Turn State Persistence

Currently turn state is recreated on demand. Consider:
- Persisting combatTurnState to actor.system on each action
- Resetting it when combat round changes
- Allowing recovery mid-turn on page reload

---

## Testing Checklist

- [ ] Verify actor.system.combatActions exists and has maxSwiftPerTurn
- [ ] Verify actor.system.combatTurnState persists between actions
- [ ] Verify combat-action items have actionCost field
- [ ] Verify WeaponsEngine reads all expected weapon.system fields
- [ ] Verify ActionEngine properly degrades actions with current schema
- [ ] Test multi-swift ability with swift: 2 cost
- [ ] Test turn reset on round change

---

## Impact Assessment

| Missing Field | Engine | Impact | Severity |
|---|---|---|---|
| combatActions.maxSwiftPerTurn | ActionEngine | Defaults to 1, no house rule support | Medium |
| combatTurnState | ActionEngine | Recreated each turn, no persistence | Low |
| speciesCombatBonuses clarity | WeaponsEngine | Falls back correctly, but unclear path | Low |
| actionCost in combat-action items | ActionEngine | TBD - need verification | High |

---

## Next Steps

1. **Immediate**: Add missing schema fields to template.json
2. **Investigation**: Verify combat-action item schema
3. **Testing**: Run action economy tests with actual actor data
4. **Persistence**: Implement turn state persistence if needed

All engines are **reading correctly**, but schema must provide the expected data structures.
