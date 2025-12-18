# SWSE Progression Engine - Complete Architecture Guide

## Overview

The SWSE Progression Engine is now built as a modular, extensible system with specialized subsystems handling different aspects of character advancement. This guide explains the architecture and how to integrate all components.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Progression Engine                          │
│            (scripts/engine/progression.js)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Feature          │  │ Data Normalizers │  │ Apply Handlers   │
│ Dispatcher       │  │ (6 normalizers)  │  │ (ApplyHandlers)  │
│                  │  │                  │  │                  │
│ • Routes all     │  │ • Class          │  │ • applyClass()   │
│   feature types  │  │ • Item           │  │ • applyFeat()    │
│ • Handles        │  │ • Species        │  │ • applyTalent()  │
│   choices &      │  │ • Background     │  │ • applySkill()   │
│   grants         │  │ • Prerequisite   │  │ • applyHP()      │
│ • Extensible     │  │ • Class Feature  │  │ • etc.           │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Force            │  │ Language         │  │ Equipment        │
│ Progression      │  │ Engine           │  │ Engine           │
│                  │  │                  │  │                  │
│ • Force powers   │  │ • Grant          │  │ • Starting       │
│ • Force points   │  │   languages      │  │   equipment      │
│ • Techniques     │  │ • INT mod        │  │ • Starting       │
│ • Secrets        │  │   languages      │  │   credits        │
│ • Regimen        │  │ • Validate       │  │ • Carrying       │
│                  │  │   languages      │  │   capacity       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Derived          │
                    │ Calculator       │
                    │                  │
                    │ • BAB            │
                    │ • Saves          │
                    │ • Skills         │
                    │ • Initiative     │
                    │ • AC             │
                    │ • Speed          │
                    │ • Force Points   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Finalization     │
                    │ & Validation     │
                    │                  │
                    │ • Snapshot       │
                    │ • Level Diff     │
                    │ • Chat feedback  │
                    └──────────────────┘
```

## Core Subsystems

### 1. **Feature Dispatcher** (`feature-dispatcher.js`)

**Purpose**: Central routing for all class features and level-up grants.

**Handles**:
- Talent choices
- Feat choices
- Skill choices
- Force Technique choices
- Force Secret choices
- Medical Secret choices
- Automatic feat grants
- Automatic language grants
- Automatic equipment grants
- Automatic force power grants
- Class features (passive)
- Scaling features (progressive bonuses)

**Usage**:
```javascript
import { dispatchFeature } from '../engine/feature-dispatcher.js';

// In progression engine finalize loop:
for (const feature of classLevel.features) {
    await dispatchFeature(feature, actor, this);
}
```

**Key Method**: `dispatchFeature(feature, actor, engine)`

**Extensibility**: Register custom handlers with:
```javascript
registerFeatureHandler("custom_type", async (feature, actor, engine) => {
    // Custom handler logic
});
```

### 2. **Force Progression Engine** (`force-progression.js`)

**Purpose**: Unified system for all Force-related progression.

**Handles**:
- Force Power grants and selection
- Force Technique grants and selection
- Force Secret grants and selection
- Force Regimen selection
- Force Point calculation
- Force Sensitivity verification

**Key Methods**:
- `isForceEnlightened(actor)` - Check if Force-sensitive
- `calculateForcePoints(actor)` - Get total force points
- `grantForcePower(actor, name)` - Grant a force power
- `createForcePowerChoice(actor, count)` - Create selection dialog
- `finalizeForceProgression(actor)` - Finalize all force progression

**Usage**:
```javascript
import { ForceProgressionEngine } from '../engine/force-progression.js';

// Grant a force power
await ForceProgressionEngine.grantForcePower(actor, "Move Object");

// Finalize force progression
await ForceProgressionEngine.finalizeForceProgression(actor);
```

### 3. **Language Engine** (`language-engine.js`)

**Purpose**: Centralized language management across all sources.

**Handles**:
- Species languages
- Background languages
- INT modifier bonus languages
- Linguist feat languages
- Class languages
- Validation and deduplication

**Key Methods**:
- `grantLanguage(actor, language)` - Add a language
- `applySpeciesLanguages(actor, species)` - Apply from species
- `applyBackgroundLanguages(actor, background)` - Apply from background
- `applyIntModLanguages(actor)` - Calculate INT mod languages
- `calculateBonusLanguagesAvailable(actor)` - Total bonus languages
- `finalizeLanguages(actor)` - Deduplicate and validate

**Usage**:
```javascript
import { LanguageEngine } from '../engine/language-engine.js';

// Grant species languages
await LanguageEngine.applySpeciesLanguages(actor, "Twi'lek");

// Finalize all languages
await LanguageEngine.finalizeLanguages(actor);
```

### 4. **Equipment Engine** (`equipment-engine.js`)

**Purpose**: Manage starting equipment, weapons, armor, and credits.

**Handles**:
- Starting credits from class/background
- Starting equipment packs
- Starting weapons
- Starting armor
- Carrying capacity calculation
- Encumbrance checking

**Key Methods**:
- `getStartingCredits(actor, className, backgroundName)` - Calculate credits
- `setCredits(actor, amount)` - Set character credits
- `grantEquipment(actor, equipmentList)` - Add equipment items
- `grantWeapons(actor, weaponList)` - Add weapons
- `grantArmor(actor, armorList)` - Add armor
- `finalizeEquipment(actor, className, backgroundName)` - Complete equipment setup

**Usage**:
```javascript
import { EquipmentEngine } from '../engine/equipment-engine.js';

// Set up all starting equipment
await EquipmentEngine.finalizeEquipment(actor, "Soldier", "Military");

// Check carrying capacity
const capacity = EquipmentEngine.getCarryingCapacity(actor);
const weight = EquipmentEngine.getTotalWeight(actor);
```

### 5. **Derived Calculator** (`derived-calculator.js`)

**Purpose**: Compute all derived statistics in one place.

**Calculates**:
- Base Attack Bonus (BAB)
- Saving Throws (Reflex, Fortitude, Will)
- Skill modifiers (with class skill bonus and feat bonuses)
- Force Points pool
- Initiative
- Movement Speed
- Armor Class (AC)
- Damage Threshold

**Key Methods**:
- `registerCalculation(name, function)` - Add custom calculator
- `calculate(name, actor)` - Get single calculation
- `recalculate(actor)` - Run all calculations
- `updateActor(actor)` - Apply all calculations to actor

**Usage**:
```javascript
import { DerivedCalculator } from '../engine/derived-calculator.js';

// Calculate everything
const stats = DerivedCalculator.recalculate(actor);

// Get specific stat
const bab = DerivedCalculator.calculate("bab", actor);

// Update actor with new stats
await DerivedCalculator.updateActor(actor);

// Register custom calculation
DerivedCalculator.registerCalculation("customStat", (actor) => {
    // Return calculated value
});
```

### 6. **Snapshot Manager** (`snapshot-manager.js`)

**Purpose**: Save/restore character states for rollback functionality.

**Handles**:
- Creating actor snapshots before major operations
- Listing available snapshots
- Restoring from snapshots
- Managing snapshot history (max 10)

**Key Methods**:
- `createSnapshot(actor, label)` - Save current state
- `getSnapshots(actor)` - List all snapshots
- `restoreSnapshot(actor, identifier)` - Restore from snapshot
- `deleteSnapshot(actor, identifier)` - Delete a snapshot
- `getSnapshotsForDisplay(actor)` - Format for UI

**Usage**:
```javascript
import { SnapshotManager } from '../utils/snapshot-manager.js';

// Create snapshot before level-up
await SnapshotManager.createSnapshot(actor, "Before Level 5");

// Allow rollback
await SnapshotManager.restoreSnapshot(actor, snapshotId);

// Get available snapshots for UI
const snapshots = SnapshotManager.getSnapshotsForDisplay(actor);
```

### 7. **Level Diff Inspector** (`level-diff-inspector.js`)

**Purpose**: Show detailed summaries of level-up changes.

**Handles**:
- Comparing before/after states
- Generating human-readable change summaries
- Formatting for chat messages
- Creating detailed reports for GM review

**Key Methods**:
- `generateDiff(before, after, label)` - Create diff object
- `formatDiffAsHTML(diff)` - Format for chat display
- `formatDiffAsText(diff)` - Format as plain text
- `sendDiffToChatBroadcast(actor, diff)` - Post to chat
- `sendDiffToGMAsWhisper(actor, diff)` - GM-only notification
- `getChangesList(diff)` - Get concise change list

**Usage**:
```javascript
import { LevelDiffInspector } from '../utils/level-diff-inspector.js';

// Create snapshot before
const before = actor.toObject(false);

// ... level up happens ...

// Create snapshot after
const after = actor.toObject(false);

// Generate and display diff
const diff = LevelDiffInspector.generateDiff(before, after, "Level 5");
await LevelDiffInspector.sendDiffToChatBroadcast(actor, diff);
```

## Integration Workflow

### During Finalize

```javascript
async finalize() {
    // 1. Create safety snapshot
    await SnapshotManager.createSnapshot(this.actor, `Before Level ${this.actor.system.level + 1}`);

    // 2. Apply class-level selections
    for (const classLevel of this.data.classLevels) {
        // Dispatch all features through dispatcher
        for (const feature of classLevel.features) {
            await dispatchFeature(feature, this.actor, this);
        }
    }

    // 3. Apply all selection results
    await this._applySelections();

    // 4. Apply specialized progressions
    await ForceProgressionEngine.finalizeForceProgression(this.actor);
    await LanguageEngine.finalizeLanguages(this.actor);
    await EquipmentEngine.finalizeEquipment(this.actor, className, backgroundName);

    // 5. Recalculate all derived stats
    await DerivedCalculator.updateActor(this.actor);

    // 6. Create diff summary
    const after = this.actor.toObject(false);
    const diff = LevelDiffInspector.generateDiff(this._beforeSnapshot, after, `Level ${this.actor.system.level}`);

    // 7. Notify player/GM
    await LevelDiffInspector.sendDiffToChatBroadcast(this.actor, diff);

    // 8. Complete
    await this.completeStep("finalize");
}
```

## Data Normalizers

All data passes through normalizers before use:

1. **class-normalizer.js** - Standardizes class schema
2. **class-feature-normalizer.js** - Normalizes feature structures
3. **item-normalizer.js** - Normalizes feats, talents, force powers
4. **species-normalizer.js** - Standardizes species data
5. **background-normalizer.js** - Standardizes background data
6. **prerequisite-normalizer.js** - Converts prerequisites to structured format

All normalizers are called automatically during data loading.

## Apply Handlers

Centralized item creation via ApplyHandlers:

```javascript
import { ApplyHandlers } from '../utils/apply-handlers.js';

// All item creation goes through handlers:
await ApplyHandlers.applyClass(actor, classDoc, level);
await ApplyHandlers.applyFeat(actor, featObj);
await ApplyHandlers.applyTalent(actor, talentObj);
await ApplyHandlers.applyForcePower(actor, powerObj);
await ApplyHandlers.applySkillTraining(actor, skillKey);
await ApplyHandlers.applyHPGain(actor, hpGain);
```

## Quality-of-Life Features

### Rollback (Snapshot Manager)
```javascript
// Save state before risky operation
await SnapshotManager.createSnapshot(actor, "Before Level-Up");

// If something goes wrong, restore
await SnapshotManager.restoreSnapshot(actor, snapshotId);
```

### Level-Up Summary (Level Diff Inspector)
```javascript
// Automatically show what changed
const diff = LevelDiffInspector.generateDiff(before, after);
await LevelDiffInspector.sendDiffToGMAsWhisper(actor, diff);
```

### Extensibility (Feature Dispatcher)
```javascript
// Add new feature type support without modifying engine
registerFeatureHandler("custom_feature", async (feature, actor, engine) => {
    // Handle custom feature
});
```

## Best Practices

1. **Always normalize data** before using it in selections/validation
2. **Use Feature Dispatcher** for all class feature processing
3. **Use ApplyHandlers** for all item creation
4. **Use Derived Calculator** for all stat computation
5. **Create snapshots** before finalization for safety
6. **Display diffs** to give player feedback on level-up
7. **Register custom handlers** to extend without modifying core

## Troubleshooting

### Issue: Feature type not recognized
- **Solution**: Register handler via `registerFeatureHandler()`

### Issue: Skills/saves/BAB wrong
- **Solution**: Ensure DerivedCalculator.recalculate() is called at finalization

### Issue: Languages duplicated
- **Solution**: Call LanguageEngine.finalizeLanguages() to deduplicate

### Issue: Equipment not granted
- **Solution**: Call EquipmentEngine.finalizeEquipment() with class/background names

### Issue: Force progression broken
- **Solution**: Ensure ForceProgressionEngine.finalizeForceProgression() is called

## Testing & Validation

Each subsystem can be tested independently:

```javascript
// Test Force Progression
assert(ForceProgressionEngine.isForceEnlightened(actor));
assert(ForceProgressionEngine.calculateForcePoints(actor) > 0);

// Test Language Engine
const langs = LanguageEngine.getKnownLanguages(actor);
assert(langs.includes("Basic"));

// Test Equipment
const capacity = EquipmentEngine.getCarryingCapacity(actor);
assert(capacity > 0);

// Test Derived Stats
const stats = DerivedCalculator.recalculate(actor);
assert(stats.bab >= 0);
assert(stats.saves.reflex >= -5);

// Test Snapshots
const snap = await SnapshotManager.createSnapshot(actor, "Test");
assert(snap.timestamp > 0);
```

## Future Extensions

The modular architecture allows easy addition of:

- **Prestige Class Handler** - Handle prestige class specific rules
- **Droid Progression Engine** - Handle droid-specific progression
- **Custom Feat System** - Support for homebrew feats
- **Class Feature Validator** - Validate class definitions at import time
- **NPC Auto-Builder** - Auto-generate NPCs from templates
- **Character History** - Track all progression history for export

All extensions can be added without modifying core engine logic.
