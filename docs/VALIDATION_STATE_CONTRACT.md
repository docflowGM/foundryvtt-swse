# Validation State Contract & TempActor Design

## Overview

This document describes the validation and state management patterns used in character progression systems (chargen and levelup). It defines the contracts between:
1. **Character Generation (Chargen)** - Using transient mock actor (tempActor)
2. **Level Up** - Using real actor
3. **Validators** - Ensuring progression rules are enforced
4. **Progression Rules** - Single authoritative sources of truth

## System Architecture

### 1. Character Generation (Chargen)

**State Owner**: `this.characterData` (transient object in CharacterGeneratorApp)

**Actor Type**: TempActor (mock actor-like object in `chargen-feats-talents.js:_createTempActorForValidation()`)

**Purpose**: Validate feat/talent selections against prerequisites BEFORE committing to database

**Key Properties**:
```javascript
{
  system: {
    level: number,
    bab: number,
    attributes: { str, dex, con, int, wis, cha },
    skills: { [skillKey]: { trained, focused } },
    defenses: { fort, ref, will },
    swse: {
      mentorBuildIntentBiases: {},
      mentorSurveyCompleted: boolean,
      mentorSurveySkipped: boolean,
      mentorSurveySkipCount: number,
      mentorSurveyLastSkippedAt: null|timestamp
    }
  },
  items: {
    filter: (fn) => [...],  // All items built deterministically
    some: (fn) => boolean,   // All items built deterministically
    find: (fn) => item       // All items built deterministically
  }
}
```

**Items Collection** (all deterministic, built once via `_buildTempActorItems()`):
1. Auto-granted class features (from ClassesDB)
2. Previously selected feats
3. Previously selected talents
4. Previously selected classes

**Determinism Guarantee**:
- Items built by `_buildTempActorItems()` in fixed order: features → feats → talents → classes
- All three methods (filter, some, find) use the same built items list
- No dynamic or random ordering

### 2. Level Up

**State Owner**: `actor` (real Foundry actor document)

**Actor Type**: Real Actor (actual database document)

**Purpose**: Apply talent/feat grants and validate progression state

**Key Contract**:
- Real actor has persistent flags: `flags.foundryvtt-swse.*`
- Validators use real actor to check prerequisites
- Actor state includes actual items (feats, talents, classes)
- All mutations route through ActorEngine

### 3. Validation Checkpoints

#### Chargen Validation (Immediate Decision Point)

**Where**: `chargen-feats-talents.js:_onSelectFeat()` and `_onSelectTalent()`

**How**:
```javascript
// BEFORE adding feat to characterData
const isValid = FeatSlotValidator.validateFeatForSlot(tempActor, feat, slotType, ...);
if (!isValid) {
  ui.notifications.error('Prerequisite not met');
  return;  // Block selection
}

// BEFORE adding talent to characterData
const isValid = TalentSlotValidator.validateTalentForSlot(tempActor, talent, slotType, ...);
if (!isValid) {
  ui.notifications.error('Prerequisite not met');
  return;  // Block selection
}
```

**Contract**: Validators receive:
- `tempActor`: Mock actor with current selection state
- `item`: Feat/talent being added
- `slotType`: 'class' or 'heroic' (for talents)
- Additional context as needed

**Validators Return**: `boolean` - true if valid, false if prerequisite not met

#### Levelup Validation (Permanent State)

**Where**: `levelup-*.js` when actually adding items to real actor

**How**:
```javascript
// Routes through ActorEngine with source metadata
await ActorEngine.updateActor(actor, {
  'items': [newItem, ...],
  'flags.foundryvtt-swse.*': value
}, { source: 'levelup-talent-grant', skipValidation: true });
```

**Contract**:
- Validators already checked progression rules (TalentCadenceEngine, etc.)
- Real actor already has accurate state
- ActorEngine ensures authoritative mutation

### 4. Progression Rules - Single Sources of Truth

#### Talent Cadence (TalentCadenceEngine)

**Purpose**: Determine when talents are granted at each level

**Canonical Methods**:
- `grantsHeroicTalent(level)` - Does absolute level grant talent?
- `grantsClassTalent(classLevel, isNonheroic)` - Does class level grant talent?
- `calculateL1TalentCount()` - How many talents at L1 chargen?

**Rules**:
- RAW: Talents at odd levels (1, 3, 5, 7, ...)
- House rule `talentEveryLevel`: Talents at every level (1, 2, 3, 4, ...)
- House rule `talentEveryLevelExtraL1`: Extra talent at L1 chargen

**Used By**:
- `slot-calculator.js`: L1 chargen slot calculation
- `chargen-feats-talents.js`: Slot display count
- `levelup-dual-talent-progression.js`: Talent grant determination
- `levelup-*.js`: Slot calculation for multi-class scenarios

#### Feat/Talent Validators

**Purpose**: Check if a specific feat/talent can be selected

**Implementations**:
- `FeatSlotValidator`: Checks feat prerequisites against current actor state
- `TalentSlotValidator`: Checks talent prerequisites and tree availability

**Contract**:
- Receives actor (real or temp) + item to validate
- Returns boolean: is this item valid for selection?
- Used as final decision gate before adding to actor

### 5. Mutation Authority - All Routes Through ActorEngine

#### Chargen Finalization
```javascript
// Route chargen-finalized flag through ActorEngine
await ActorEngine.updateActor(created, {
  'flags.foundryvtt-swse.chargenData': this.characterData
}, { source: 'chargen-finalization', skipValidation: true });
```

#### Template Application
```javascript
// Route template flag through ActorEngine
await ActorEngine.updateActor(actor, {
  'flags.foundryvtt-swse.appliedTemplate': templateData
}, { source: 'chargen-template-application', skipValidation: true });
```

#### Snapshot Management
```javascript
// All snapshot operations route through ActorEngine
await ActorEngine.updateActor(actor, {
  'flags.foundryvtt-swse.snapshots': snapshotHistory
}, { source: 'snapshot-create|restore|delete|clear', skipValidation: true });
```

#### Level Up Progression
```javascript
// Talent/feat grants route through ActorEngine
await ActorEngine.updateActor(actor, {
  'items': [newItem, ...],
  'flags.foundryvtt-swse.selectedTalents': selectedList
}, { source: 'levelup-talent-grant', skipValidation: true });
```

## State Ownership Summary

| System | State Owner | Actor Type | Validation Timing | Persistence |
|--------|-------------|-----------|-------------------|------------|
| Chargen | `characterData` (transient) | TempActor (mock) | Immediate (on selection) | Flags on finalization |
| Levelup | `actor` (real) | Real Actor | Pre-mutation (validator checks) | Immediate (ActorEngine) |
| Snapshots | `actor.flags.snapshots` | Real Actor | N/A (restore validates structure) | ActorEngine |

## Key Design Principles

### 1. Single Authoritative Source
- TalentCadenceEngine is THE authority on talent progression timing
- Validators are THE authority on prerequisite checking
- ActorEngine is THE authority on actor mutations
- No scattered logic across multiple files

### 2. Determinism
- TempActor items built once via `_buildTempActorItems()` in fixed order
- All validators use same function signature
- Progression rules have no randomization
- Snapshot history is ordered by timestamp

### 3. Separation of Concerns
- Chargen: Selection validation only (doesn't write to DB)
- Levelup: Application only (validators already passed in chargen)
- Snapshots: Rollback mechanism (preserves progression state)
- ActorEngine: Mutation governance (all changes route here)

### 4. Clear Contracts
- Validators always take (actor, item, context) and return boolean
- TempActor has fixed structure matching real actor prereq needs
- Progression rules methods have clear parameters and return values
- All flag writes use consistent `source` metadata

## Migration Notes for Future Changes

### Adding New Progression Rules
1. Create/modify rule in TalentCadenceEngine
2. Update all callers to use new method
3. Test in both chargen (TempActor) and levelup (real actor) paths

### Adding New Validators
1. Implement validator with (actor, item, context) → boolean signature
2. Wire into chargen-feats-talents.js `_onSelect*` methods
3. Document prerequisite checks in validator docstring

### Extending State
1. If transient: Add to `characterData` in chargen
2. If persistent: Add flag via ActorEngine.updateActor() with source metadata
3. Update TempActor builder if needed for validation

## Example: Adding a New Talent Progression Rule

**Scenario**: Need to grant talents at levels 2, 4, 6 instead of odd levels

**Implementation**:
1. **TalentCadenceEngine** (single source):
   ```javascript
   static grantsHeroicTalent(level) {
     const settings = this.getHouseRuleSettings();

     if (settings.talentAtEvenLevels) {
       return level % 2 === 0;  // New rule
     }

     // Existing RAW and other rules...
   }
   ```

2. **All callers automatically updated** (because they call the engine):
   - `slot-calculator.js` - Uses TalentCadenceEngine
   - `levelup-dual-talent-progression.js` - Uses TalentCadenceEngine
   - No changes needed in chargen (uses engine via slot display)

3. **Test both paths**:
   - Chargen: Create character, verify slot count
   - Levelup: Level character, verify talent grant count

## Validation Flow Diagram

```
CHARGEN PATH:
characterData (transient)
    ↓
_createTempActorForValidation() [builds mock actor]
    ↓
User selects feat/talent
    ↓
FeatSlotValidator / TalentSlotValidator [checks prerequisites]
    ↓
Valid? → Add to characterData → Update tempActor on next call
         Invalid? → Show error, reject selection
    ↓
User finalizes character
    ↓
ActorEngine.updateActor(created, chargenData)
    ↓
Real actor created with all selections persisted

LEVELUP PATH:
Real actor (persistent)
    ↓
User levels up, triggers talent grant
    ↓
TalentCadenceEngine.grantsHeroicTalent() [determine what to grant]
    ↓
TalentSlotValidator [verify prerequisite for real actor]
    ↓
ActorEngine.updateActor(actor, {items: [talent]})
    ↓
Real actor updated immediately with persistent change
```

## See Also
- `/scripts/engine/progression/talents/talent-cadence-engine.js` - Talent timing rules
- `/scripts/apps/chargen/chargen-feats-talents.js` - Chargen validation integration
- `/scripts/engine/validation/validators/` - Validator implementations
- `/scripts/governance/actor-engine/actor-engine.js` - Mutation authority
