# SWSE Progression Engine - System Initialization Guide

## Overview

The SWSE Progression Engine requires proper initialization at system startup to ensure all data is normalized and indexed for optimal performance. This guide explains how to integrate the system initialization hooks into your main system file.

## Integration Steps

### Step 1: Import the System Init Hooks

In your system's main initialization file (typically `module/system.js` or `index.js`), add the import:

```javascript
import { SystemInitHooks } from './scripts/progression/hooks/system-init-hooks.js';
```

### Step 2: Register Hooks on System Init

In your system's initialization (typically in a `Hooks.once("init", ...)` block), register the hooks:

```javascript
Hooks.once('init', () => {
  // ... other init code ...

  // Register progression engine initialization hooks
  SystemInitHooks.registerHooks();
});
```

### Step 3: (Optional) Trigger Manual Initialization

If you need to manually trigger initialization (e.g., for testing or data reset), you can call:

```javascript
await SystemInitHooks.initialize();
```

## What Happens During Initialization

When the system becomes ready, the following automatic steps occur:

### 1. Feature Index Building
- Loads all items from compendiums (feats, talents, powers)
- Builds in-memory lookup maps for fast access
- Enables Feature Dispatcher to quickly find items by name

### 2. Game Data Normalization
- **Classes**: Normalizes hit dice, BAB progression, skill lists, talent trees, level progressions
- **Talents**: Normalizes talent tree names, prerequisites, benefits
- **Force Powers**: Normalizes power levels, actions, ranges, durations, force types
- **Force Techniques**: Ensures proper tagging and structure
- **Force Secrets**: Ensures proper tagging and structure

### 3. Actor Progression State Normalization
- Normalizes all actors' progression data in `system.progression`
- Ensures consistent structure for:
  - Class levels array
  - Talent selections
  - Feat selections
  - Force progression (powers, techniques, secrets)
  - Languages
  - Trained skills

### 4. Starting Feature Registration
- Registers all class starting features in FeatureIndex
- Includes:
  - Starting feats
  - Automatic feats
  - Bonus feats
  - Level-specific features
  - Starting equipment
  - Starting languages

## Architecture

```
SystemInitHooks.registerHooks()
    ↓
Hooks.once('ready', async () => {
    onSystemReady()
        ↓
    Step 1: _buildFeatureIndex()
        ↓
        FeatureIndex.buildIndex()
        └─ Loads all feats, talents, powers, techniques, secrets

    Step 2: _normalizeGameData()
        ├─ _normalizeClasses()
        │   └─ ClassNormalizer.normalizeClassDoc()
        ├─ _normalizeTalents()
        │   └─ TalentTreeNormalizer.normalize()
        └─ _normalizeForceContent()
            ├─ ForceNormalizer.normalizePower()
            ├─ ForceNormalizer.normalizeTechnique()
            └─ ForceNormalizer.normalizeSecret()

    Step 3: _normalizeActorProgression()
        └─ ProgressionStateNormalizer.normalize()

    Step 4: _registerStartingFeatures()
        └─ StartingFeatureRegistrar.register()
})
```

## Logging Output

The system initialization logs detailed information to the console. You'll see output like:

```
==================================================
SWSE Progression Engine: System Initialization
==================================================
Building feature index...
Feature index built: {"feats": 145, "talents": 89, "powers": 52, ...}
Normalizing game data...
Normalized 15 class documents
Normalized 89 talent documents
Normalized 52 Force power documents
Registered starting features for 15 classes
==================================================
Initialization Complete (1234.56ms)
==================================================
```

## Troubleshooting

### Missing Compendiums

If you see warnings about missing compendiums:
```
SWSE FeatureIndex: Missing pack foundryvtt-foundryvtt-swse.classes
```

**Solution**: Ensure the required compendium packs are imported in your system.json:
- `foundryvtt-foundryvtt-swse.classes`
- `foundryvtt-foundryvtt-swse.talents`
- `foundryvtt-foundryvtt-swse.feats`
- `foundryvtt-foundryvtt-swse.forcepowers`
- (Optional) `foundryvtt-foundryvtt-swse.forcetechniques`
- (Optional) `foundryvtt-foundryvtt-swse.forcesecrets`

### Invalid Progression States

If you see warnings about invalid progression states:
```
Actor "Character Name" has invalid progression state: ["talents must be an array", ...]
```

**Solution**: The normalizer should fix these automatically. If issues persist, check the actor's progression data in the console:
```javascript
const actor = game.actors.getName("Character Name");
console.log(actor.system.progression);
```

### Slow Initialization

If initialization takes longer than expected:

1. **Check console for errors** - Look for error messages that might indicate compendium loading issues
2. **Verify compendium size** - Larger compendiums take longer to load
3. **Check actors count** - More actors = slower progression state normalization
4. **Monitor network** - If compendiums are from remote sources, network speed matters

## Integration with Progression Engine

The initialized data is automatically used by:

### Feature Dispatcher
```javascript
import { dispatchFeature } from './scripts/progression/engine/feature-dispatcher.js';
import { FeatureIndex } from './scripts/progression/engine/feature-index.js';

// Feature lookup is now instant thanks to FeatureIndex
const feat = FeatureIndex.getFeat("Mobility");
```

### Progression Engine Finalization
```javascript
import { FinalizeIntegration } from './scripts/progression/integration/finalize-integration.js';

// Finalization uses normalized data and initialized indexes
await FinalizeIntegration.quickIntegrate(actor, 'chargen');
```

### Specialized Engines
```javascript
import { ForceProgressionEngine } from './scripts/progression/engine/force-progression.js';

// Force progression uses normalized data structures
const forceSensitive = ForceProgressionEngine.isForceEnlightened(actor);
```

## Custom Initialization

To run additional initialization code after the standard process:

```javascript
Hooks.on('swse:progression:initialized', () => {
  console.log('SWSE Progression Engine is ready!');

  // Your custom initialization here
  // This fires after all normalizers and indexes are built
});
```

## Manual Re-initialization

If you need to rebuild indexes or re-normalize data (e.g., after importing new content):

```javascript
// Full re-initialization
await SystemInitHooks.initialize();

// Rebuild just the feature index
await FeatureIndex.rebuild();

// Normalize just one actor
const actor = game.actors.getName("Character Name");
const prog = actor.system.progression;
const normalized = ProgressionStateNormalizer.normalize(prog);
await actor.update({ "system.progression": normalized });
```

## Performance Considerations

The initialization process is optimized for performance:

- **Feature Index**: Uses in-memory Maps for O(1) lookups
- **Normalizer Caching**: All normalizers are stateless functions
- **Parallel Loading**: Actor normalization processes in sequence (can be parallelized if needed)
- **Lazy Loading**: Compendiums are only loaded once, then cached

Typical initialization time: 500-2000ms depending on content volume.

## See Also

- `PROGRESSION_ARCHITECTURE.md` - Complete system architecture
- `PROGRESSION_ENGINE_INTEGRATION.md` - ApplyHandlers integration
- `scripts/progression/engine/` - All engine modules
- `scripts/progression/hooks/` - Hook implementations
