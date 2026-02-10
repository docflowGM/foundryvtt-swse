# Audit: Jedi Level 1 → 2 Progression Path

## Scenario
A new Jedi character (level 1) takes their second level in Jedi.

Expected Delta (from spec):
```javascript
{
  set: { "system.level": 2 },
  add: {
    feats: ["uuid-bonus-feat"], // if level grants bonus feat
    talents: ["uuid-talent-1"], // from talent budget
    skills: [] // no automatic skill grants at level 2
  },
  computed: {
    bab: 1,
    defenses: {
      fort: { total: 12, classBonus: 1 },
      ref: { total: 12, classBonus: 1 },
      will: { total: 13, classBonus: 1 }
    }
  }
}
```

---

## Actual Execution Path (Traced)

### Phase 1: Snapshot ✅
```javascript
// scripts/engine/progression.js:_action_confirmClass()
const progression = this.actor.system.progression || {};
const classLevels = Array.from(progression.classLevels || []);
classLevels.push({
  class: "Jedi",
  level: 2,
  choices: {},
  skillPoints: 0
});

await applyActorUpdateAtomic(this.actor, {
  "system.progression.classLevels": classLevels,
  "system.progression.startingFeats": allStartingFeats,
  "system.progression.featBudget": featBudget,
  "system.progression.talentBudget": talentBudget
});
```

**Checkpoint**: Actor mutated directly without delta intermediary. ❌ Violates Phase 3/4 separation.

---

### Phase 2: Validation ❌
No explicit validation function exists.
- Validation scattered through `_action_confirmClass()`
- Prerequisite checks mixed with state mutations
- BAB loaded but not validated against anything

```javascript
// From scripts/engine/progression.js:1237
const { calculateBAB } = await import('../progression/data/progression-data.js');
const currentBAB = await calculateBAB(classLevels);
if (currentBAB < prereqs.bab) {
  throw new Error(...);
}
```

**Issue**: BAB is validated but never written to delta. Only used for prestige checks.

---

### Phase 3: Resolution ❌
Completely missing as discrete phase. Work scattered:

1. **Class feature dispatch** (`finalize-integration.js`):
```javascript
await this._dispatchClassFeatures(actor, mode);
```

2. **Force power engine** (separate):
```javascript
await ForceProgressionEngine.finalize(actor, selection);
```

3. **Language engine** (separate):
```javascript
await LanguageEngine.finalize(actor);
```

4. **Derived calculator** (separate):
```javascript
await DerivedCalculator.finalize(actor);
```

**Critical Issue**: No unified delta generator. Each subsystem mutates independently. 🚨

---

### Phase 4: Application ❌
Multiple mutation points discovered:

**Mutation Point 1** (scripts/engine/progression.js:1379):
```javascript
await applyActorUpdateAtomic(this.actor, {
  "system.progression.classLevels": classLevels,
  "system.progression.startingFeats": allStartingFeats,
  "system.progression.featBudget": featBudget,
  "system.progression.talentBudget": talentBudget
});
```

**Mutation Point 2** (scripts/progression/integration/finalize-integration.js):
```javascript
await this._dispatchClassFeatures(actor, mode);
// Calls feature-dispatcher which creates items
// Modifies actor.system directly
```

**Mutation Point 3** (scripts/progression/engine/derived-calculator.js):
```javascript
await actor.update({ "system.bab": bab });
```

**Mutation Point 4** (prepareDerivedData - automatic):
```javascript
// scripts/data-models/actor-data-model.js
_calculateDefenses();
_calculateInitiative();
// FORMERLY: _calculateBaseAttack(); // HOTFIXED ✅
```

**Checkpoint**: 4 separate mutation points instead of 1 atomic applier. ❌

---

## Illegal Writes (Against Compiler Spec)

| Write | Location | Phase | Violation | Severity |
|-------|----------|-------|-----------|----------|
| `system.progression.classLevels` | progression.js:1379 | 4 | Direct actor.update in progression code (should be delta→applier) | High |
| `system.progression.featBudget` | progression.js:1382 | 4 | Same as above | High |
| `system.progression.talentBudget` | progression.js:1383 | 4 | Same as above | High |
| Class features (items) | feature-dispatcher.js | 4 | Mutates during finalize (should be part of delta) | High |
| `system.bab` | derived-calculator.js | 4 | Overwrites progression value | **Critical** |
| `system.defenses.*.total` | actor-data-model.js (prepareDerivedData) | Auto | Happens after mutations (correct layer, but too late) | Medium |

---

## Missing: Single Atomic Applier

The spec requires:
```javascript
class ProgressionApplier {
  async apply(actor, delta) {
    // 1. Verify actor hasn't changed since snapshot
    // 2. Apply all set/add/remove in ONE atomic batch
    // 3. Verify computed values match after derivedData recalc
  }
}
```

**Current state**: Mutations scattered across 4+ files, no atomicity guarantee.

---

## Missing: Delta Generation

No single function returns the delta. Instead:
- Each engine computes locally
- Each mutates directly
- No contract between subsystems

**Example for Jedi 2**:
- confirmClass: updates classLevels, budgets
- (no unified resolver here)
- finalize-integration: dispatches features
- derived-calculator: computes BAB
- prepareDerivedData: computes defenses (after BAB overwrite hotfix)

---

## Order Dependency Risk 🚨

Current execution order:
1. confirmClass (mutates classLevels, budgets)
2. _dispatchClassFeatures (mutates items)
3. finalize integrations (mutates derived stats)
4. prepareDerivedData (auto-recalc, reads mutated data)

**Problem**: If step 3 or 4 runs before step 1 completes, or if a new mutation is added at wrong place:
- BAB could be computed twice (before hotfix: YES, it happened)
- Defenses could use stale data
- Features could be dispatched with wrong budgets

**Verdict**: Not order-independent. ❌

---

## Recommendations

✅ **Hotfix Applied**: Removed BAB overwrite from `_calculateBaseAttack()`

🔧 **Next**:
1. Create `ProgressionResolver.resolve(snapshot, intent)` that returns unified delta
2. Create `ProgressionApplier.apply(actor, delta)` as single mutation point
3. Move all subsystem finalizations into resolve, not into apply
4. Verify BAB is never touched by data model again

✍️ **Test**: Run Jedi 1→2 twice, compare resulting actor state. Should be identical (determinism test).

