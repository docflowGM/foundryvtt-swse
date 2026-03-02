# PHASE 3 BATCH 2: Combat System Consolidation

**Status**: Ready to Execute
**Batch 1 Validation**: ✅ PASSED
**Goal**: Route ALL combat mutations through ActorEngine

---

## Combat System Scope

| File | Mutations | Priority |
|------|-----------|----------|
| damage-engine.js | HP reduction, condition shift | CRITICAL |
| combat-automation.js | Damage application | CRITICAL |
| enhanced-rolls.js | HP updates on roll | HIGH |
| swse-combatant.js | Initiative, turn state | HIGH |
| swse-combat.js | Combat round control | MEDIUM |
| ion-damage.js | Specific damage type | MEDIUM |
| combat-integration.js | Hooks & integration | MEDIUM |
| massive-damage-engine.js | Massive damage checks | LOW |

**Total**: 8 files, ~2000 lines of combat code

---

## Batch 2 Architecture

### Step 1: Extend ActorEngine with Combat APIs

**New methods to add to ActorEngine:**

```javascript
ActorEngine.applyDamage(actor, damagePacket)
ActorEngine.applyHealing(actor, amount, source)
ActorEngine.applyConditionShift(actor, direction)
ActorEngine.rollInitiative(actor, modifiers)
```

**Why**: Combat should NOT compute HP directly.
Combat produces **declarative packets**, ActorEngine applies them.

### Step 2: Create DamagePacket Contract

```javascript
DamagePacket {
  amount: number,
  type: 'kinetic' | 'energy' | 'burn',
  source: string,                    // 'combat-attack', 'force-power', etc
  modifiersApplied: false,           // ActorEngine applies ModifierEngine
  conditionShiftOnDamage: boolean,
  targetActor: Actor
}
```

### Step 3: Remove Direct HP Mutations

All instances of:
```javascript
actor.update({ 'system.attributes.hp.value': newHP })
system.attributes.hp.value -= damage
```

Must become:
```javascript
await ActorEngine.applyDamage(actor, { amount: damage, type, source })
```

### Step 4: Implement Single-Recalc Guarantee

Each damage roll → ONE mutation → ONE recalc
- No nested damage calculations
- No chained updates
- ConditionTrack shift within same mutation

---

## Detailed Batch 2 Execution Plan

### PHASE 2.1: Create ActorEngine Combat APIs

**File**: scripts/actors/engine/actor-engine.js

**Add these methods:**

```javascript
/**
 * applyDamage() — PHASE 3 Combat Authority
 *
 * Only legal way to reduce actor HP in combat.
 * Applies modifiers, triggers condition shifts, single recalc.
 */
async applyDamage(actor, damagePacket) {
  // 1. Validate packet
  // 2. Apply ModifierEngine (armor, defenses)
  // 3. Reduce HP
  // 4. Check condition threshold
  // 5. Apply condition shift if needed
  // 6. Single mutation → single recalc
}

/**
 * applyHealing() — Healing without combat
 */
async applyHealing(actor, amount, source) {
  // Increase HP, cap at max
}

/**
 * applyConditionShift() — Shift condition track
 */
async applyConditionShift(actor, direction) {
  // +1 or -1 on condition track
  // Updates system.progression.conditionTrack
}
```

---

### PHASE 2.2: Identify All Damage Mutations in Combat

**Search patterns:**

```javascript
// High priority (direct HP writes)
actor.update({ 'system.attributes.hp.value':
system.attributes.hp.value -=
system.attributes.hp.value +=
system.attributes.hp.value = Math.max(

// Medium priority (through rolls)
applyDamage / takeDamage / applyHeal
newHP = oldHP - amount

// Check files:
damage-engine.js
combat-automation.js
enhanced-rolls.js
swse-combatant.js
```

---

### PHASE 2.3: Route Files (One at a Time)

**Order** (dependency order, not alphabetical):

1. **damage-engine.js** — Core damage logic
2. **swse-combatant.js** — Combatant state
3. **enhanced-rolls.js** — Roll damage application
4. **combat-automation.js** — Automated damage
5. **ion-damage.js** — Specific damage type
6. **massive-damage-engine.js** — Massive damage checks
7. **swse-combat.js** — Combat round control
8. **combat-integration.js** — Final integration

**Per file:**
- [ ] Identify all actor.update() calls
- [ ] Map to ActorEngine equivalents
- [ ] Replace mutation calls
- [ ] Test in game (no visible behavior change)
- [ ] Verify Sentinel shows zero violations
- [ ] Check single recalc per damage

---

### PHASE 2.4: Verify Single Recalc Per Damage Event

**Test scenarios:**

```javascript
// Scenario 1: Single attack
// Expected: 1 mutation, 1 recalc

// Scenario 2: Multi-attack round
// Expected: N mutations, N recalcs (not 2N)

// Scenario 3: Damage + condition shift
// Expected: 1 mutation, 1 recalc (not 2)

// Scenario 4: Healing in combat
// Expected: 1 mutation, 1 recalc
```

**Instrument:**
```javascript
const origRecalcAll = ActorEngine.recalcAll;
let recalcCount = 0;
ActorEngine.recalcAll = async function(actor) {
  if (actor.id === targetActor.id) recalcCount++;
  return origRecalcAll.call(this, actor);
};

// Perform combat action
// Check recalcCount === 1
```

---

### PHASE 2.5: Sentinel Verification

**No violations should appear:**

```javascript
// In console
MutationIntegrityLayer.getViolationSummary()
// Should show: "No mutation violations detected"

// Check specific actor
MutationIntegrityLayer.getActorMutationStats(actorId)
// Should show all mutations routed through ActorEngine
```

---

## Estimated Scope

| Task | Files | LOC | Complexity |
|------|-------|-----|------------|
| Create ActorEngine.applyDamage() | 1 | 100-150 | High |
| Route damage-engine.js | 1 | 200-300 | High |
| Route combat files 2-7 | 6 | 150-250 each | Medium |
| Route combat-integration.js | 1 | 100-150 | Medium |
| Verification & testing | All | - | High |

**Total estimated**: ~2000 lines modified, 8 files consolidated

---

## Batch 2 Success Criteria

✅ ActorEngine.applyDamage() implemented
✅ All 8 combat files route through ActorEngine
✅ Zero direct actor.update() calls in combat code
✅ Single recalc verified per damage event
✅ Sentinel shows zero mutation violations
✅ Condition track shifts through ActorEngine
✅ Combat behavior unchanged (user visible)
✅ No double-recalcs in combat round

---

## What Happens After Batch 2

Once combat is consolidated:

**BATCH 3**: Progression System (ProgressionSession.js, xp-engine.js, etc.)
**BATCH 4**: Force/Effects (force-engine.js, active-effects-engine.js)
**BATCH 5**: Final systems (chargen, DraftCharacter, misc)

Each batch follows same pattern:
- Identify mutations
- Create domain API
- Route through ActorEngine
- Verify single recalc
- Check Sentinel

---

## Critical Implementation Notes

### 1. DamagePacket Should Be Declarative

❌ WRONG:
```javascript
// Computation in combat file
const finalDamage = baseDamage - armor + modifiers;
await ActorEngine.applyDamage(actor, { amount: finalDamage });
```

✅ RIGHT:
```javascript
// Combat declares what happened
const packet = {
  amount: baseDamage,
  armor: armorValue,
  modifiers: [/* applied by ModifierEngine later */],
  source: 'laser-rifle-attack'
};
// ActorEngine applies modifiers and computes
await ActorEngine.applyDamage(actor, packet);
```

### 2. Never Nest Mutations

❌ WRONG:
```javascript
await ActorEngine.applyDamage(actor, packet);
// Inside applyDamage:
await ActorEngine.applyConditionShift(actor, direction); // Nested!
```

✅ RIGHT:
```javascript
// Single atomic operation
await ActorEngine.applyDamage(actor, {
  ...packet,
  conditionShiftOnDamage: true,
  conditionDirection: 1
});
// Inside applyDamage, apply condition shift atomically
```

### 3. Condition Track Integration

**Current state**: Condition track may shift separately from damage

**Batch 2 goal**: Condition shift happens WITHIN damage mutation
- Damage applied → check threshold → shift condition → single recalc

---

## Getting Started

### Next Immediate Actions

1. **Commit current progress**
2. **Create ActorEngine.applyDamage()** stub
3. **Find all damage mutations** in damage-engine.js
4. **Replace first 5 mutations** with ActorEngine calls
5. **Test in game** (single attack, verify one recalc)
6. **Verify Sentinel** (zero violations)
7. **Continue systematically** through remaining files

### Testing Before & After

**Before routing**:
- Single attack does 5 HP damage
- Character HP goes from 100 → 95
- DerivedCalculator called once

**After routing**:
- Behavior identical
- But now damage routed through ActorEngine
- Sentinel shows authorized mutation

**No user-visible change. Just governance.**

---

## Questions to Answer Before Starting

1. How does ConditionTrack currently shift? (separate mutation or part of damage?)
2. Does ion-damage.js do custom HP logic? (check for non-standard mutations)
3. Does massive-damage-engine.js have special flow? (may need dedicated API)
4. Are there any async dependencies in combat damage? (must be resolved atomically)

---

## Ready to Begin

Batch 1: ✅ Authority hardened, validated, integrated
Batch 2: 🚀 Ready to execute

Command to proceed: Begin routing damage-engine.js

