# Manual Step Processor — Design & Review

**File:** `scripts/engines/progression/engine/manual-step-processor.js`

**Status:** Ready for review before dialog integration

---

## 🎯 Core Design Principle

**Thin adapter pattern:**
- No duplicate compilation logic
- No mutation building in UI layer
- Single validation pipeline (PrerequisiteChecker)
- Single compiler pathway (ProgressionCompiler)

---

## 📋 Implementation Summary

### Public API

```javascript
async processManualStep(
  actor: Actor,
  stepId: string,
  input: Object,
  options?: {
    freebuild?: boolean,
    suppressWarnings?: boolean
  }
): Promise<MutationPlan>
```

### Flow

```
Raw Input
  ↓
_normalizeInput()          [UI → Domain transformation]
  ↓
_buildSnapshot()           [Read-only actor state]
  ↓
PrerequisiteChecker        [Standard validator]
  ↓
_buildIntent()             [Canonical intent]
  ↓
ProgressionCompiler        [Standard compiler]
  ↓
MutationPlan (return)
```

---

## 🔧 Step Normalizers Implemented

Each normalizer converts raw UI input → canonical internal form:

### Background
```javascript
// Manual freeform
input: { name: "Street Urchin", freeform: true }
output: { name: "Street Urchin", freeform: true, source: "manual" }

// Or list selection
input: { backgroundId: "noble" }
output: { id: "noble", source: "manual" }
```

### Species
```javascript
input: { speciesId: "wookiee" }
output: { id: "wookiee", source: "manual" }
```

### Abilities
```javascript
input: { scores: { str: 14, dex: 12, con: 13, int: 10, wis: 15, cha: 11 } }
output: { str: 14, dex: 12, ..., source: "manual" }
```

### Class
```javascript
// Freeform
input: { name: "Commando", freeform: true }
output: { name: "Commando", freeform: true, source: "manual" }

// Or select
input: { classId: "soldier" }
output: { id: "soldier", source: "manual" }
```

### Feats/Talents/ForceSecrets/etc
```javascript
input: { featIds: ["abc123", "def456"] }
output: { featIds: ["abc123", "def456"], source: "manual" }
```

---

## ✅ Key Architectural Guarantees

### 1. Single Validation Pipeline
```javascript
PrerequisiteChecker.checkPrerequisites(snapshot, type, itemId)
```
- Same validator used by ProgressionCompiler
- No special "manual mode" validation path
- All validation centralized

### 2. Single Compiler Pathway
```javascript
const intent = { type: 'chooseFeat', featId: '...' };
ProgressionCompiler.compile(snapshot, intent);
```
- Same compiler used by generator
- No duplicate logic
- No parallel compilation paths

### 3. Freebuild Flag (Sequencing Bypass Only)
```javascript
// Allows skipping step order, but still validates prerequisites
freebuild: true
  → Bypass: step sequencing restrictions
  → Keep: PrerequisiteChecker validation
  → Keep: Schema validation
```

### 4. Pure Immutable Snapshot
```javascript
snapshot = {
  actor,
  level,
  abilities,
  classes,
  freebuild,
  timestamp
}
```
- No mutations during validation
- No actor state changes
- Read-only reference only

---

## 🚨 Error Handling

### ProgressionStepError
```javascript
throw new ProgressionStepError("Unknown progression step: 'foo'");
```
- Invalid step ID
- No compiler intent builder for step
- Fail fast and clear

### ProgressionValidationError
```javascript
throw new ProgressionValidationError("Prerequisites unmet: level 3+ required");
```
- Input malformed
- Prerequisites unmet (normal mode)
- Schema validation failed

---

## 📊 Step Support Matrix

| Step | Normalizer | Compiler Intent | Status |
|------|------------|-----------------|--------|
| background | ✅ | _(pending)_ | Ready |
| species | ✅ | _(pending)_ | Ready |
| abilities | ✅ | _(pending)_ | Ready |
| class | ✅ | _(pending)_ | Ready |
| skills | ✅ | _(pending)_ | Ready |
| feats | ✅ | chooseFeat | Ready |
| talents | ✅ | chooseTalent | Ready |
| forceSecrets | ✅ | _(pending)_ | Ready |
| forceTechniques | ✅ | _(pending)_ | Ready |
| forcePowers | ✅ | _(pending)_ | Ready |

---

## 🧪 Usage Examples

### Manual Background (Freeform)
```javascript
const plan = await ManualStepProcessor.processManualStep(
  actor,
  'background',
  { name: 'Street Urchin', freeform: true }
);
// Returns: { set: { 'system.background': {...} } }
```

### Manual Feat Selection
```javascript
const plan = await ManualStepProcessor.processManualStep(
  actor,
  'feats',
  { featIds: ['abc123'] }
);
// Returns: { add: { feats: ['abc123'] } }
```

### Freebuild Ability Scores
```javascript
const plan = await ManualStepProcessor.processManualStep(
  actor,
  'abilities',
  { scores: { str: 18, dex: 16, con: 15, ... } },
  { freebuild: true }
);
// Returns: { set: { 'system.attributes.str.base': 18, ... } }
```

---

## 🔒 What This PREVENTS

### ✗ Dialog Building MutationPlan
Dialog does NOT construct:
```javascript
{ update: { 'system.attributes.str.base': 18 } }
```
Instead:
```javascript
{ scores: { str: 18, ... } }  // Domain interprets this
```

### ✗ Dialog Bypassing Validation
Dialog does NOT query game.items:
```javascript
❌ Object.values(game.items).filter(i => i.type === 'feat')
```
Instead:
```javascript
✅ PrerequisiteChecker validates in engine
```

### ✗ Dialog Knowing System Paths
Dialog does NOT use:
```javascript
❌ 'system.attributes.str.base'
❌ 'system.classes'
❌ 'system.skills.acrobatics'
```
All paths stay in domain layer.

### ✗ Parallel Compiler Paths
No manual-specific compiler logic.
No forking the ProgressionCompiler.
One pipeline. Two input adapters.

---

## 🔄 Integration Point

This processor will be called by:
```javascript
// In PickFromGeneratorDialog
const mutationPlan = await ManualStepProcessor.processManualStep(
  this.actor,
  this.stepId,
  userFormData,
  { freebuild: options.freebuild }
);

await ActorEngine.applyMutationPlan(this.actor, mutationPlan);
```

---

## ⚠️ Review Checklist

- [ ] Is the thin adapter pattern correct?
- [ ] Are all normalizers pure (no side effects)?
- [ ] Does reusing PrerequisiteChecker make sense?
- [ ] Should freebuild suppress warnings by default?
- [ ] Are error messages clear?
- [ ] Should we support multi-item selection in one step (e.g., multiple feats)?
- [ ] Are there missing normalizers?
- [ ] Should snapshot capture more actor state?

---

## 🎯 Next Steps

Once approved:
1. **Add missing ProgressionCompiler intent builders** for background, species, abilities, etc.
2. **Build CharacterGeneratorApp contract** (startStep, partial mode, event emission)
3. **Implement PickFromGeneratorDialog** with this processor
4. **Wire Background picker in sheet** as proof-of-concept
5. **Test full loop:** sheet → dialog → processor → compiler → ActorEngine → sheet

