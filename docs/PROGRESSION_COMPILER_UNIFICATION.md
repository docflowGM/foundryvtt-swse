# Progression Compiler Unification — Architecture Documentation

**Status:** Complete (Commit dee9e93)

**Date:** 2026-02-24

---

## 🚨 The Problem We Just Solved

### Before This Refactor

The system had an architectural **sovereignty leak**: Intent objects were being constructed at the UI layer (ManualStepProcessor), which violated V2 principles.

```
WRONG (before):
  ManualStepProcessor._buildIntent()  → intent = { type: 'chooseFeat', featId: '...' }
  Generator._buildIntent()            → intent = { type: 'chooseFeat', featId: '...' }
                                           ↓
                                      ProgressionCompiler.compile(intent)

  Problem: Duplication. Intent types leak to UI. Risk of divergence.
```

### After This Refactor

Intent construction moved entirely INTO the compiler. UI layers only normalize input.

```
RIGHT (after):
  ManualStepProcessor (normalize)  → selections = { featIds: [...] }
  Generator (normalize)            → selections = { featIds: [...] }
                                           ↓
                                      ProgressionCompiler.compileStep(stepId, selections)
                                      (compiler internally builds intent)
                                           ↓
                                      MutationPlan { set, add, delete }

  Result: Single canonical intent builder. Zero duplication. Intent types private.
```

---

## 🏗 Architecture Overview

### Layered Responsibility

```
┌─────────────────────────────────────────────────────────────┐
│ Sheet / Dialog (UI)                                          │
│ Gathers user input → normalizedData                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ManualStepProcessor  (OR  CharacterGeneratorApp)             │
│ Normalizes → Canonical Selections                           │
│ { featIds: [...], talentIds: [...], etc. }                  │
│ DOES NOT build intent objects                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ProgressionCompiler.compileStep(stepId, selections)          │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ PHASE 1: Convert selections → intent                      ││
│ │ _buildIntentFromSelections(stepId, selections)            ││
│ │ (ONLY place where intent objects are constructed)         ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │ PHASE 2: Compile intent → delta                           ││
│ │ compile(snapshot, intent)                                 ││
│ │ → PrerequisiteChecker validates                           ││
│ │ → appropriate _compileXXX() method executes               ││
│ │ → returns { set: {...}, add: {...}, delete: {...} }       ││
│ └──────────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ActorEngine.applyMutationPlan()                              │
│ Applies delta to actor (only mutation authority)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 What Changed

### ProgressionCompiler Extensions

#### New High-Level Entry Point

```javascript
/**
 * @param {Object} snapshot - frozen actor state
 * @param {string} stepId - "background", "feats", etc.
 * @param {Object} selections - canonical selections (varies by step)
 * @param {Object} options - { freebuild, suppressWarnings }
 * @returns {Object} mutationPlan - { set, add, delete }
 */
static compileStep(snapshot, stepId, selections, options = {})
```

**Why this matters:**
- Provides a clean API for UI layers
- Hides intent construction from callers
- Enables future UI layers to converge on same contract
- Intent types become private compiler implementation detail

#### New Compiler Methods

All build steps now have compiler support:

```javascript
_compileSetBackground(snapshot, backgroundId)
_compileSetBackgroundFreeform(snapshot, name)
_compileSetSpecies(snapshot, speciesId)
_compileSetAbilities(snapshot, scores)
_compileSetClass(snapshot, classId)
_compileSetClassFreeform(snapshot, name)
_compileSetForceSecrets(snapshot, secretIds)
_compileSetForceTechniques(snapshot, techniqueIds)
_compileSetForcePowers(snapshot, powerIds)
```

#### Multi-Item Support

Existing methods updated to handle arrays:

```javascript
_compileChooseTalent(snapshot, talentIds)      // was talentId
_compileChooseFeat(snapshot, featIds)          // was featId
_compileChooseSkill(snapshot, skillIds)        // was skillId
```

Each method validates all items before returning delta:

```javascript
// Validates each talentId in array, throws if ANY unmet
for (const talentId of talentIds) {
  const prereq = PrerequisiteChecker.checkPrerequisites(snapshot, 'talent', talentId);
  if (!prereq.met) throw error;
}
return { add: { talents: talentIds } };
```

#### Intent Building (Private)

```javascript
static _buildIntentFromSelections(stepId, selections, options = {}) {
  switch (stepId) {
    case 'background':
      if (selections.freeform && selections.name) {
        return { type: 'setBackgroundFreeform', name: selections.name };
      } else if (selections.id) {
        return { type: 'setBackground', backgroundId: selections.id };
      }
    case 'feats':
      return { type: 'chooseFeat', featIds: selections.featIds || [] };
    // ... etc for all 10 steps
  }
}
```

**Key: This method is PRIVATE. UI layers never see intent types.**

---

### ManualStepProcessor Simplification

#### Before

```javascript
processManualStep(actor, stepId, input, options) {
  // Phase 1: Validate step
  // Phase 2: Normalize input
  // Phase 3: Build snapshot
  // Phase 4: Validate prerequisites
  // Phase 5: Build intent <- UI layer doing compiler's job
  // Phase 6: Compile
  return mutationPlan;
}
```

Lines of code: 471
Responsibilities: 6

#### After

```javascript
processManualStep(actor, stepId, input, options) {
  // Phase 1: Validate step ID
  this._assertValidStep(stepId);

  // Phase 2: Normalize to canonical selections
  const selections = await this._normalizeInput(stepId, input);

  // Phase 3: Build snapshot (read-only state)
  const snapshot = this._buildSnapshot(actor, { freebuild });

  // Phase 4: Delegate to compiler
  const mutationPlan = ProgressionCompiler.compileStep(
    snapshot, stepId, selections, { freebuild }
  );

  return mutationPlan;
}
```

Lines of code: ~70 (for whole class)
Responsibilities: 1 (normalization only)

#### Removed Methods

```javascript
_validatePrerequisites()  // Compiler owns this now
_compileStep()            // Compiler owns this now
_buildIntent()            // Compiler owns this now
_mapStepToType()          // No longer needed
```

#### Updated Normalizers

All normalizers now return ONLY canonical selections (no "source" field):

```javascript
// Before:
_normalizeFeats(input) {
  return { featIds: input.featIds, source: 'manual' };
}

// After:
_normalizeFeats(input) {
  return { featIds: input.featIds };
}
```

---

## ✅ Architectural Guarantees

### 1. Single Intent Authority
- **Only** ProgressionCompiler builds intent objects
- Intent types are `private` implementation detail
- UI layers never construct intent

### 2. Convergent Pipeline
- Manual input: normalize → selections → compiler.compileStep()
- Generator input: normalize → selections → compiler.compileStep()
- CharacterGeneratorApp input: normalize → selections → compiler.compileStep()
- Same pathway for all sources

### 3. No Duplication
- Intent building logic exists in ONE place (compiler)
- Intent types defined in ONE place (compiler switch)
- Validation logic unified in PrerequisiteChecker

### 4. Safe Extension
- New UI layer? Just call `ProgressionCompiler.compileStep(snapshot, stepId, selections, options)`
- Don't know about intent types? Good! That's the point.
- Can't create broken intents? Guaranteed. Compiler owns their shape.

---

## 📊 Intent Types Reference

| Step | Intent Type | Compiler Method |
|------|-------------|-----------------|
| background (list) | `setBackground` | `_compileSetBackground` |
| background (freeform) | `setBackgroundFreeform` | `_compileSetBackgroundFreeform` |
| species | `setSpecies` | `_compileSetSpecies` |
| abilities | `setAbilities` | `_compileSetAbilities` |
| class (list) | `setClass` | `_compileSetClass` |
| class (freeform) | `setClassFreeform` | `_compileSetClassFreeform` |
| skills | `chooseSkill` | `_compileChooseSkill` |
| feats | `chooseFeat` | `_compileChooseFeat` |
| talents | `chooseTalent` | `_compileChooseTalent` |
| forceSecrets | `setForceSecrets` | `_compileSetForceSecrets` |
| forceTechniques | `setForceTechniques` | `_compileSetForceTechniques` |
| forcePowers | `setForcePowers` | `_compileSetForcePowers` |

**Note:** These intent types are now internal compiler detail. UI layers don't know about them.

---

## 🔄 Example Flow: Feat Selection

### User selects 2 feats via dialog

```
// Dialog gathers user selection:
const userInput = {
  featIds: ['abc123', 'def456']
}

// Pass to ManualStepProcessor
const result = await ManualStepProcessor.processManualStep(
  actor,
  'feats',
  userInput,
  { freebuild: false }
);
```

### ManualStepProcessor normalizes

```
// _normalizeInput('feats', userInput)
// → _normalizeFeats(userInput)
// → returns { featIds: ['abc123', 'def456'] }

const selections = { featIds: ['abc123', 'def456'] };
```

### Build snapshot

```
const snapshot = {
  actor,
  level: actor.system.level,
  abilities: { ...actor.system.attributes },
  classes: actor.system.classes || [],
  freebuild: false,
  timestamp: Date.now()
};
```

### Delegate to compiler

```
const mutationPlan = ProgressionCompiler.compileStep(
  snapshot,
  'feats',
  selections,
  { freebuild: false }
);
```

### Compiler internally:

1. **Convert selections to intent**
   ```javascript
   _buildIntentFromSelections('feats', selections)
   // → { type: 'chooseFeat', featIds: ['abc123', 'def456'] }
   ```

2. **Compile intent**
   ```javascript
   compile(snapshot, intent)
   // → switch(intent.type) case 'chooseFeat':
   //   → _compileChooseFeat(snapshot, ['abc123', 'def456'])
   ```

3. **Validate each feat**
   ```javascript
   for (const featId of ['abc123', 'def456']) {
     PrerequisiteChecker.checkPrerequisites(snapshot, 'feat', featId);
   }
   // All pass → continue
   ```

4. **Build delta**
   ```javascript
   return {
     add: {
       feats: ['abc123', 'def456']
     }
   };
   ```

### Return to dialog

```
const mutationPlan = {
  add: {
    feats: ['abc123', 'def456']
  }
};

// Dialog passes to ActorEngine
await ActorEngine.applyMutationPlan(actor, mutationPlan);
```

---

## 🎯 Next Steps

### Immediate
1. ✅ Compiler owns all intent building
2. ✅ All build steps have compiler support
3. ✅ ManualStepProcessor is normalization-only

### Soon
1. Design CharacterGeneratorApp contract
   - Emit complete event with mutationPlan
   - Support "partial mode" (one step at a time)
   - Return canonical selections (not intent)

2. Implement PickFromGeneratorDialog
   - Call ManualStepProcessor.processManualStep()
   - OR call CharacterGeneratorApp for full flow
   - Pass mutationPlan to ActorEngine

3. Wire background picker in character sheet
   - Proof-of-concept: test full loop
   - Sheet → dialog → processor → compiler → ActorEngine → sheet

### Later
1. Add skill picker
2. Add feat picker
3. Add talent picker
4. Add force power picker
5. Wire character generation flow

---

## 📚 Reference Files

- **ProgressionCompiler**: `scripts/engine/progression/ProgressionCompiler.js`
- **ManualStepProcessor**: `scripts/engine/progression/engine/manual-step-processor.js`
- **PrerequisiteChecker**: `scripts/data/prerequisite-checker.js`
- **ActorEngine**: `governance/actor-engine/actor-engine.js`

---

## 🚀 Why This Matters

This is a **critical architectural improvement** because:

1. **Sovereignty Enforcement**: Compiler is the sole authority. UI can't violate rules.
2. **Future-Proof**: Any new UI layer (sheet widget, dialog, API endpoint) can safely plug in by normalizing → calling `compileStep()`.
3. **Testability**: You can test compiler in isolation. Intent building is internal.
4. **Maintainability**: Change how intents work? Change ONE place (compiler). Not UI layers.
5. **Safe Extension**: Add new build step? Add one compiler method. No UI changes needed.

The principle: **Compose, don't loosen.**

---

**Commit:** dee9e93
**Branch:** claude/clarify-code-specs-PwO0P
**User Session:** https://claude.ai/code/session_017gLKWKy2FFe33qaUgLzgHq
