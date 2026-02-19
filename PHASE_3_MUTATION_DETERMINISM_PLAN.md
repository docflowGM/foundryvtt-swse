# PHASE 3 EXECUTION PLAN — Mutation Determinism
**Scope**: Route ALL mutations through ActorEngine.updateActor()
**Scale**: 79 files with direct actor.update() calls
**Objective**: Single mutation authority + deterministic recalculation

---

## Critical Mutation Hot-Spots

### TIER 1: COMBAT SYSTEMS (Highest Priority)
- combat-automation.js
- combat-integration.js
- ion-damage.js
- enhanced-rolls.js
- swse-combat.js
- swse-combatant.js
- damage-engine.js
- massive-damage-engine.js

### TIER 2: PROGRESSION & XP
- ProgressionSession.js
- progression.js
- xp-engine.js
- npc-levelup.js

### TIER 3: FORCE/CONDITION/EFFECTS
- force-engine.js
- active-effects-engine.js
- mount-engine.js
- crew-interaction-engine.js

### TIER 4: CHARGEN
- chargen-backgrounds.js
- ability-rolling.js

### TIER 5: MISC ENGINES
- DraftCharacter.js
- ArchetypeAffinityEngine.js
- BonusHitPointsEngine.js
- RuleElement.js
- PrerequisiteEngine.js
- SWSEInitiative.js

---

## Phase 3 Execution Batches

### BATCH 1: ActorEngine Enhancement
Update ActorEngine to handle all mutation types:
- updateActor(actor, updates) — already exists
- updateEmbeddedDocuments(actor, type, updates) — needs implementation
- applyConditionChange(actor, step) — needs implementation
- applyForceUse(actor, amount) — needs implementation
- applyDamage(actor, amount) — needs implementation

Result: ActorEngine becomes single mutation API

### BATCH 2: Combat System Consolidation
Replace all direct mutations in:
- damage-engine.js → ActorEngine.applyDamage()
- combat-automation.js → ActorEngine.updateActor()
- enhanced-rolls.js → ActorEngine.updateActor()
- swse-combatant.js → ActorEngine.updateEmbeddedDocuments()

Result: Combat applies damage through ActorEngine only

### BATCH 3: Progression System Consolidation
Replace all direct mutations in:
- ProgressionSession.js → ActorEngine.updateActor()
- progression.js → ActorEngine.updateActor()
- xp-engine.js → ActorEngine.updateActor()
- npc-levelup.js → ActorEngine.updateActor()

Result: Level-up applies through ActorEngine only

### BATCH 4: Force/Condition/Effect Consolidation
Replace all direct mutations in:
- force-engine.js → ActorEngine.applyForceUse()
- active-effects-engine.js → ActorEngine.updateEmbeddedDocuments()
- mount-engine.js → ActorEngine.updateActor()
- condition updates → ActorEngine.applyConditionChange()

Result: Effects applied through ActorEngine only

### BATCH 5: Remaining Systems
- chargen updates → ActorEngine.updateActor()
- DraftCharacter → ActorEngine.updateActor()
- All remaining engines → ActorEngine.updateActor()

Result: All mutations consolidated

---

## Determinism Guarantee

After Phase 3, every mutation follows:

```
Caller (any system)
  ↓
ActorEngine.updateActor(actor, updates)
  ↓ Check guard (_derivedRecalcInProgress)
  ↓
Apply update to actor
  ↓
actor.prepareDerivedData() [Foundry native]
  ↓ SWSEV2BaseActor guard prevents recursion
  ↓
DerivedCalculator.computeAll()
  ↓
ModifierEngine (Phase 4)
  ↓
Return stable, authoritative derived values
```

**Guarantee**: Exactly one recalculation per mutation, no exceptions.

---

## Sentinel Enforcement for Phase 3

Add strict detection in DerivedIntegrityLayer:

```javascript
STRICT MODE:
If any file calls:
  actor.update(...)
  actor.updateEmbeddedDocuments(...)
Outside ActorEngine → throw error

Examples of violations to catch:
- combat-automation calling actor.update() directly ✗
- force-engine calling actor.update() directly ✗
- chargen calling actor.update() directly ✗
All must be caught.
```

---

## Phase 3 Completion Criteria

✅ Zero direct actor.update() outside ActorEngine
✅ Zero direct updateEmbeddedDocuments() outside ActorEngine
✅ Exactly one recalc per mutation
✅ Sentinel enforces mutation authority
✅ All combat damage through ActorEngine
✅ All progression updates through ActorEngine
✅ All force/condition updates through ActorEngine
✅ No console spam
✅ No stale values
✅ No race conditions

---

## Files to Update (Summary)

**Combat (8 files)**
- combat-automation.js
- combat-integration.js
- ion-damage.js
- enhanced-rolls.js
- swse-combat.js
- swse-combatant.js
- damage-engine.js
- massive-damage-engine.js

**Progression (4 files)**
- ProgressionSession.js
- progression.js
- xp-engine.js
- npc-levelup.js

**Force/Effects/Other (16+ files)**
- force-engine.js
- active-effects-engine.js
- mount-engine.js
- crew-interaction-engine.js
- chargen updates
- DraftCharacter.js
- All remaining engines

**Total**: ~30-40 critical files for Phase 3

---

## Next Action

**BEGIN BATCH 1**: Enhance ActorEngine with consolidated mutation API

Then execute batches 2-5 in order, verifying Sentinel enforcement throughout.

