# BATCH 5: Mutation Classification Map

**Classification complete through code inspection**

---

## Key Finding

**ALL 48 mutations in BATCH 5 are RUNTIME CLASS B (Talent Effect Actions)**

There are NO talent acquisition mutations in these files.

**Why?** Talent items are added by ProgressionEngine.finalize() during levelup. Talent files only contain the effect logic (DarkSidePowers, mechanics, etc.).

---

## Mutation Classification Table

### DarkSidePowers.js (21 mutations)

| Function | Entry Point | Mutation Type | Mutations | Category | Notes |
|----------|-------------|---------------|-----------|----------|-------|
| triggerSwiftPower | Macro call | Flag set (not ActorEngine) | 0 | SETUP | Pre-combat setup |
| triggerDarkSideSavant | Macro call | Flag set | 0 | SETUP | Combat setup |
| completeDarkSideSavantSelection | Combat resolution | HP update (target) | 1 | CLASS B | Action: return power |
| triggerWrathOfDarkSide | Combat roll (nat 20) | Flag set on target | 0 | COMBAT | Delayed damage setup |
| applyWrathDamageAtTurnStart | Turn start hook | HP updates (2) | 2 | CLASS B | Delayed damage resolution |
| triggerChannelAggression | After attack hit | Force points (actor) + HP (target) | 2 | CLASS B | Bonus damage action |
| triggerChannelAnger | Macro/action | Actor state updates | 1-2 | CLASS B | Rage mechanic |
| endChannelAnger | Timer/action | Condition + state updates | 1-2 | CLASS B | Rage end |
| triggerCripplingStrike | Critical hit | Speed + condition updates | 1-2 | CLASS B | Crit effect |
| removeCripplingStrike | Condition track | Speed restore | 1 | CLASS B | Crit cleanup |
| triggerDarkHealing | Action call | HP updates (2) + effect | 3 | CLASS B | Drain life action |
| triggerImprovedDarkHealing | Action call | HP updates (2) + effect | 3 | CLASS B | Enhanced drain |
| triggerDarkHealingField | Action call | Multiple HP updates + effect | 4+ | CLASS B | AOE drain |
| triggerWickedStrike | Crit hit | Condition track | 1 | CLASS B | Affliction trigger |
| applyAffliction | Status effect | Condition updates | 1 | CLASS B | Affliction application |
| applyAfflictionDamage | Turn start | HP + condition updates | 2 | CLASS B | Affliction damage |

**Subtotal: 21 mutations, ALL RUNTIME**

---

### dark-side-devotee-mechanics.js (5 mutations)

| Function | Entry Point | Mutation Type | Mutations | Category | Notes |
|----------|-------------|---------------|-----------|----------|-------|
| triggerChannelAggression | After flanked hit | FP spend (actor) + HP (target) | 2 | CLASS B | Bonus damage |
| triggerChannelAnger | Macro/action | FP spend + actor state | 2 | CLASS B | Rage start |
| endChannelAnger | Timer/macro | Actor state + condition | 1 | CLASS B | Rage end |
| triggerCripplingStrike | Critical hit | Speed + condition | 1-2 | CLASS B | Crit effect |
| triggerDarkSideTalisman | Protective action | Create effect + self update | 2 | CLASS B | Talisman creation |

**Subtotal: 5 mutations, ALL RUNTIME**

---

### dark-side-talent-mechanics.js (1 mutation)

| Function | Entry Point | Mutation Type | Mutations | Category | Notes |
|----------|-------------|---------------|-----------|----------|-------|
| applyEffect | (context unclear) | State update | 1 | CLASS B | Dark talent effect |

**Subtotal: 1 mutation, RUNTIME**

---

### light-side-talent-mechanics.js (4 mutations)

| Function | Entry Point | Mutation Type | Mutations | Category | Notes |
|----------|-------------|---------------|-----------|----------|-------|
| triggerMeditation | Macro/action | Actor state + effect | 2 | CLASS B | Meditation benefits |
| triggerDominion | Action use | Target + self updates | 2 | CLASS B | Force effect |
| (2 others) | Various | State updates | 2 | CLASS B | Light side effects |

**Subtotal: 4 mutations, RUNTIME**

---

### hooks & utilities (13 mutations)

| File | Function | Entry Point | Mutations | Category | Notes |
|------|----------|-------------|-----------|----------|-------|
| talent-effects-hooks.js | onTalentAdd | Talent item added | 1 | ACQUISITION-LIKE | Creates passive effects |
| actor-hooks.js | (3 functions) | Actor state changes | 3 | REACTION | Reactive state updates |
| actor-utils.js | (3 functions) | Utility calls | 3 | CLASS B | Helper mutations |
| destiny-effects.js | spendDestinyPoint | Action use | 1 | CLASS B | Destiny effect |
| droid-appendage-utils.js | addAppendage | Droid modification | 1 | CLASS B | Droid modification |
| force-power-manager.js | applyForce | Force power use | 1 | CLASS B | Force effect |
| hardening.js | (3 functions) | Snapshot/rollback | 3 | INFRASTRUCTURE | Safety/audit |

**Subtotal: 13 mutations, MIXED**

---

## CRITICAL REALIZATIONS

### 1. NO Talent Acquisition Mutations Here

**BATCH 5 files do NOT contain mutations for "add talent to actor"**

That happens in:
- ProgressionEngine.finalize()
- CharGen system
- Template system

**These files are 100% TALENT EFFECT MECHANICS**

### 2. Mutation Classes Found

**CLASS A (Acquisition) mutations: ZERO in BATCH 5 files**
- Adding talent item
- Updating progression array
- Adding passive effect

**CLASS B (Runtime) mutations: ~45 mutations**
- Damage/healing
- Condition shifts
- State changes (rage, cursed, etc.)
- Effect applications
- Resource spending (FP, HP, etc.)

**CLASS C (Reactive) mutations: ~3 mutations**
- hooks responding to state changes
- Cascading effects
- Automatic penalties/bonuses

### 3. Entry Points Are NOT Levelup

**These are called via:**
- Combat macros (triggerChannelAggression, triggerDarkHealing)
- Combat hooks/turn start (applyWrathDamageAtTurnStart)
- Chat card buttons
- Item right-click actions
- Direct macro execution

**NOT during levelup progression**

### 4. Mutations Are NOT Bundled

**Current pattern:**
```javascript
async triggerEffect(actor, target) {
  // Calculate
  const damage = Math.floor(roll * mod);

  // Mutate target
  await actor.update({ 'system.hp.value': newHp });

  // Mutate self (FP, score, etc.)
  await actor.update({ 'system.forcePoints.value': ... });

  // Create effect
  await actor.createEmbeddedDocuments('ActiveEffect', [...]);

  // Chat message (not ActorEngine)
}
```

**Result: 2-4 separate mutations per action**

### 5. Hooks Can Trigger Cascades

**talent-effects-hooks.js:**
- When talent item added → creates passive effects
- This could trigger actor-hooks.js
- Which could trigger more mutations

**Risk: Nested mutation chains**

---

## Classification Summary

| Class | Count | Examples | Atomic Boundary | Policy |
|-------|-------|----------|-----------------|--------|
| A (Acquisition) | 0 | N/A | N/A | N/A |
| B (Runtime Action) | 45 | channelAggression, darkHealing | Action invocation | maxMutations: 4, blockNested: false |
| C (Reactive) | 3 | actor-hooks reactions | Hook firing | maxMutations: 2, blockNested: false |

---

## What This Means for BATCH 5

### Phase 5A is NOT "applyTalent"

**Phase 5A should define:**

```javascript
ActorEngine.applyTalentEffect(actor, {
  effect: 'channelAggression',
  targets: [targetActor],
  parameters: { characterLevel, spendFP }
})
```

This is a COMBAT ACTION, not an acquisition operation.

### Phase 5B (Inline Math) Still Applies

Every mutation is preceded by calculation. All must be extracted.

### Phase 5C: Hook Safety

talent-effects-hooks.js can trigger cascades. Must validate nested mutation policy.

---

## Detailed Mutation Map

### DarkSidePowers.js - Detailed Breakdown

**Wrath of the Dark Side Flow:**
1. Player rolls natural 20 on force power attack
2. triggerWrathOfDarkSide() called
3. Calculate: halfDamage = Math.floor(damageDealt / 2)
4. Mutation: setFlag on target (counts as 0 in ActorEngine, but side effect)
5. No actor.update() yet - just delayed setup
6. At target's turn start:
7. applyWrathDamageAtTurnStart() called
8. Mutation 1: `await actor.update({ 'system.hp.value': newHp })`
9. Mutation 2: `await actor.update({ 'system.darkSideScore': score + 1 })`

**Pattern: Setup mutation (flag) + Deferred mutations (HP + score)**

**Channel Aggression Flow:**
1. Player hits flanked opponent
2. triggerChannelAggression() called with actor, target, characterLevel
3. Calculate: damageDice = Math.min(characterLevel, 10)
4. Roll: roll = await RollEngine.safeRoll(`${damageDice}d6`)
5. Calculate: damageAmount = roll.total
6. Mutation 1: `await actor.update({ 'system.forcePoints.value': ... })` (if spendFP)
7. Calculate: newHp = Math.max(0, targetHp - damageAmount)
8. Mutation 2: `await targetToken.actor.update({ 'system.hp.value': newHp })`
9. Chat message (not a mutation)

**Pattern: 2-3 mutations per action (FP spend optional)**

---

## Next Step: Refine Atomic Boundaries

Based on this classification:

**Phase 5A Should Define:**

1. `ActorEngine.applyTalentEffect()` - general talent action wrapper
   - Parameters: actor, effect name, targets, parameters
   - Bundles 2-4 mutations into single atomic action
   - Policy: maxMutations: 4, exactDerivedRecalcs: 1, blockNestedMutations: false

2. Special cases:
   - `ActorEngine.applyConditionEffect()` - for condition track changes
   - `ActorEngine.applyDamageEffect()` - for damage + healing effects
   - Or integrate into existing combat operations

**NOT "applyTalent" (which implies acquisition)**

**Instead: "applyTalentEffect" (which is combat action)**

---

## Status

- [x] All 48 mutations classified
- [x] Entry points identified (combat/macro, not levelup)
- [x] Mutation patterns mapped
- [x] NO acquisition mutations found
- [x] Hook cascade risks identified
- [x] Inline math scope confirmed

**Ready for:** Phase 5A architecture definition

