# SWSE Modding Guide - Phase 6 Ecosystem Readiness

Complete guide to extending Star Wars Saga Edition for Foundry VTT.

## Quick Start

### 1. Create a Module

In your module's `module.json`:

```json
{
  "id": "myswsemod",
  "title": "My SWSE Mod",
  "description": "Custom content for SWSE",
  "version": "1.0.0",
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "dependencies": [
    {
      "id": "foundryvtt-swse",
      "type": "system"
    }
  ]
}
```

### 2. Register Your Module

Create `myswsemod/scripts/init.js`:

```javascript
Hooks.once('init', () => {
  console.log('My SWSE Mod | Initializing');
});

Hooks.once('ready', () => {
  // Module is ready, hook into SWSE
  Hooks.on('swse.chargen.complete', onChargenComplete);
  Hooks.on('swse.levelup.complete', onLevelupComplete);
});

async function onChargenComplete(actor, selections) {
  console.log(`Character created: ${actor.name}`);
}

async function onLevelupComplete(actor, newLevel, data) {
  console.log(`Leveled up to: ${newLevel}`);
}
```

Register in `module.json`:
```json
{
  "esmodules": ["scripts/init.js"]
}
```

---

## Extension Patterns

### Pattern 1: Listen to Character Completion

Track when characters are created or imported:

```javascript
Hooks.on('swse.chargen.complete', async (actor, selections) => {
  // Character generation finished
  // actor = Actor object
  // selections = {race, class, talents, feats, ...}

  // Add custom flag
  await actor.setFlag('mymod', 'created-with-mymod', true);

  // Notify user
  ui.notifications.info(`Character ${actor.name} created!`);
});

Hooks.on('swse.import.complete', async (actor, sourceData) => {
  // Character import finished
  // Add default items
  const item = await createItemInActor(actor, {...});
});
```

### Pattern 2: Track Leveling

Add custom level-up effects:

```javascript
Hooks.on('swse.levelup.complete', async (actor, newLevel, data) => {
  console.log(`${actor.name} → Level ${newLevel}`);

  // Add bonus feat
  if (newLevel === 5) {
    const bonusFeat = await createItemInActor(actor, {
      type: 'feat',
      name: 'Bonus Feat',
      system: {...}
    });
  }

  // Track in custom data
  await actor.setFlag('mymod', 'levelup-history', [
    ...(actor.getFlag('mymod', 'levelup-history') || []),
    { level: newLevel, timestamp: Date.now() }
  ]);
});
```

### Pattern 3: Safe Data Mutation

Always use v13 wrappers when modifying actors/items:

```javascript
// ✓ GOOD - Use v13 wrappers
import { createItemInActor, createEffectOnActor } from 'foundryvtt-swse/scripts/core/document-api-v13.js';

Hooks.on('swse.chargen.complete', async (actor) => {
  // Safe item creation
  await createItemInActor(actor, {...});

  // Safe effect application
  await createEffectOnActor(actor, {...});

  // Safe actor update
  await actor.update({'system.level': 2});
});

// ❌ BAD - Direct mutations
Hooks.on('swse.chargen.complete', async (actor) => {
  // Don't do this - bypasses safety checks
  await actor.createEmbeddedDocuments('Item', [...]);
});
```

### Pattern 4: Conditional Logic

Check feature status and GM context:

```javascript
import { featureIsEnabled, getFeatureLabel } from 'foundryvtt-swse/scripts/core/feature-flags.js';

Hooks.on('swse.chargen.complete', async (actor) => {
  // Only run on GM side
  if (!game.user.isGM) return;

  // Check if feature enabled
  if (!featureIsEnabled('my-custom-feature')) {
    return;
  }

  // Check permission
  if (!actor.isOwner) {
    console.warn('Cannot modify actor: not owner');
    return;
  }

  // Proceed safely
  await actor.setFlag('mymod', 'data', {...});
});
```

### Pattern 5: Query System Data

Access compendiums and templates safely:

```javascript
import { getCompendium, getActorById } from 'foundryvtt-swse/scripts/core/foundry-env.js';

// Get items from compendium
const weaponPack = getCompendium('weapons');
const documents = await weaponPack?.getDocuments();

// Safe actor lookup
const actor = getActorById(actorId);
if (actor) {
  // Actor exists and is accessible
}
```

---

## Public API Reference

### Imports Available to Modules

```javascript
// Document API (v13 safe)
import {
  createActor,
  createItemInActor,
  createItem,
  updateActor,
  deleteActor,
  deleteItemInActor,
  createEffectOnActor,
  deleteEffectFromActor,
  patchDocument
} from 'foundryvtt-swse/scripts/core/document-api-v13.js';

// Environment accessors (safe global access)
import {
  getActorByUuid,
  getActorById,
  getItemById,
  getCompendium,
  getCurrentUser,
  isGameMaster,
  notify
} from 'foundryvtt-swse/scripts/core/foundry-env.js';

// Mutation safety
import {
  snapshotActorBeforeMutation,
  safeMutateActor,
  assertEmbeddedDocOwnership
} from 'foundryvtt-swse/scripts/core/mutation-safety.js';

// Feature flags
import {
  getFeatureLabel,
  featureIsEnabled,
  getFeatureDisplayInfo
} from 'foundryvtt-swse/scripts/core/feature-flags.js';

// Tracing & diagnostics
import {
  generateTraceId,
  withTraceContext,
  TraceMetrics
} from 'foundryvtt-swse/scripts/core/correlation-id.js';

// Schema validation
import {
  validateActorSchema,
  validateItemSchema,
  validateImportData
} from 'foundryvtt-swse/scripts/core/schema-validator.js';

// Version info
import {
  getFoundryVersion,
  isV13,
  VersionFeatures
} from 'foundryvtt-swse/scripts/core/version-adapter.js';
```

### Main System Classes (window.SWSE.api)

```javascript
// Available via window.SWSE.api (public API)
const {
  ActorEngine,           // Actor calculation engine
  FeatSystem,            // Feat management
  SkillSystem,           // Skill resolution
  TalentAbilitiesEngine, // Talent mechanics
  TalentActionLinker,    // Talent-to-action mapping
  CombatSuggestionEngine // Combat recommendations
} = window.SWSE.api;

// Request combat suggestion
const suggestion = await window.SWSE.api.requestCombatEvaluation(actor, target);
```

---

## Hooks Reference

### Custom SWSE Hooks

| Hook | When | Parameters | Cancel | Stable |
|------|------|-----------|--------|--------|
| `swse.chargen.complete` | Character generated | `(actor, selections)` | ✓ | ✓ v1.2.0+ |
| `swse.levelup.complete` | Level-up finalized | `(actor, newLevel, data)` | ✓ | ✓ v1.2.0+ |
| `swse.import.complete` | Character imported | `(actor, sourceData)` | — | ✓ v1.2.0+ |
| `swse.migration.start` | Migration begins | `(fromVersion, toVersion)` | ✓ | ✓ v1.2.0+ |
| `swse.migration.complete` | Migration done | `(fromVersion, toVersion, summary)` | — | ✓ v1.2.0+ |
| `swse.combat.resolved` | Combat action resolved | `(combat, resolution)` | — | ✓ v1.2.0+ |
| `swse.actor.prepared` | Actor prepared | `(actor)` | — | ✓ v1.2.0+ |

All hooks are documented in `/docs/HOOK_CONTRACTS.md`.

---

## Error Handling

### Safe Pattern

```javascript
Hooks.on('swse.chargen.complete', async (actor) => {
  try {
    // Your code here
    await doSomething(actor);
  } catch (err) {
    console.error('[My Mod] Error in hook:', err);
    // Don't throw - let system continue
  }
});
```

### Testing Mutations

```javascript
const result = await safeMutateActor(actor, async (a) => {
  // Mutations here are rolled back if error occurs
  await a.update({'system.level': 5});
  return true;
}, 'level-update');

if (!result.success) {
  console.error('Mutation failed:', result.error);
}
```

---

## What NOT to Do

### ❌ Monkey-Patching

```javascript
// DON'T modify prototypes
Actor.prototype.myMethod = function() {...};
```

### ❌ Direct Global Mutations

```javascript
// DON'T bypass safety checks
game.actors.contents.forEach(a => {
  a.data.system.hp.value = 100;
});
```

### ❌ Throwing from Hooks

```javascript
Hooks.on('swse.chargen.complete', () => {
  throw new Error('Oops'); // This breaks the system
});
```

### ❌ Assuming Hook Order

```javascript
// DON'T assume you're the only listener
Hooks.on('swse.chargen.complete', () => {
  // Other mods might also listen
  // Don't assume state after your handler
});
```

---

## Example: Full Module

`mymod/module.json`:
```json
{
  "id": "myswsemod",
  "title": "My SWSE Mod",
  "version": "1.0.0",
  "compatibility": {"minimum": "13", "verified": "13"},
  "dependencies": [{"id": "foundryvtt-swse", "type": "system"}],
  "esmodules": ["scripts/init.js"]
}
```

`mymod/scripts/init.js`:
```javascript
import { createItemInActor } from 'foundryvtt-swse/scripts/core/document-api-v13.js';

Hooks.once('ready', () => {
  console.log('My SWSE Mod | Ready');

  // Hook into chargen
  Hooks.on('swse.chargen.complete', async (actor, selections) => {
    try {
      console.log(`Created: ${actor.name}`);

      // Add custom item
      const item = await createItemInActor(actor, {
        type: 'equipment',
        name: 'Starting Gear',
        system: {}
      });

      if (item) {
        ui.notifications.info('Starting gear added!');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  });
});
```

---

## Troubleshooting

### "SWSE not found" Error
- Ensure SWSE system is installed and listed as dependency in `module.json`
- Check that hooks are registered in `Hooks.once('ready', ...)`

### Hooks Not Firing
- Make sure you're listening with correct hook name: `swse.X.Y` (not `swse:X:Y`)
- Check that SWSE is activated in the world
- Look at console for errors

### Mutations Not Working
- Use v13 wrappers: `createItemInActor()`, `createEffectOnActor()`
- Check actor ownership: `actor.isOwner` must be true
- Check permissions: actor must be owned by current user or be GM

### Performance Issues
- Don't use multiple listeners on same hook (consolidate)
- Don't do heavy processing in hooks (defer to next tick)
- Use `withTraceContext()` to identify bottlenecks

---

## Support

- **Documentation:** `/docs/HOOK_CONTRACTS.md`
- **GitHub Issues:** https://github.com/docflowGM/foundryvtt-swse/issues
- **Discord:** https://discord.gg/Sdwd7CgmaJ

Questions? Ask in the SWSE Discord community!
