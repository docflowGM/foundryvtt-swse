# SWSE Hook Contracts - Phase 6 Extension Safety

Complete documentation of all system hooks, their inputs, outputs, and firing timing.

## Custom System Hooks (Phase 5+)

These hooks are specific to SWSE and provide extension points for mods.

### swse.chargen.complete

**Fired When:** Character generation is finalized (after actor and items created)

**Inputs:**
```javascript
function onChargenComplete(actor, selections) {
  // actor: Actor - The newly created/updated actor
  // selections: Object - Chargen selections (race, class, talents, etc)
  //   {
  //     type: 'character',
  //     race: 'Human',
  //     class: 'Soldier',
  //     talents: [...],
  //     feats: [...],
  //     forcePowers: [...]
  //   }
}
```

**Outputs:** Handler can return `false` to prevent downstream effects

**Usage Example:**
```javascript
Hooks.on('swse.chargen.complete', (actor, selections) => {
  console.log(`Created character: ${actor.name}`);
});
```

---

### swse.levelup.complete

**Fired When:** Character level-up is finalized and committed

**Inputs:**
```javascript
function onLevelupComplete(actor, newLevel, levelupData) {
  // actor: Actor - Updated actor
  // newLevel: number - New character level
  // levelupData: Object - Selections made during levelup
  //   {
  //     previousLevel: 5,
  //     newLevel: 6,
  //     classSelected: 'Soldier',
  //     featSelected: 'Great Fortitude',
  //     talentSelected: 'Melee Smash'
  //   }
}
```

**Outputs:** Handler can return `false` to cancel commit

**Usage Example:**
```javascript
Hooks.on('swse.levelup.complete', (actor, newLevel, data) => {
  actor.setFlag('mymod', 'last-levelup', newLevel);
});
```

---

### swse.import.complete

**Fired When:** Character import/import wizard completes successfully

**Inputs:**
```javascript
function onImportComplete(actor, sourceData) {
  // actor: Actor - Imported actor
  // sourceData: Object - Raw import data (optional)
  //   {
  //     type: 'character',
  //     name: 'Imported Character',
  //     system: {...},
  //     items: [...]
  //   }
}
```

**Outputs:** None (informational)

**Usage Example:**
```javascript
Hooks.on('swse.import.complete', (actor) => {
  ui.notifications.info(`Character imported: ${actor.name}`);
});
```

---

### swse.migration.start

**Fired When:** System migration begins

**Inputs:**
```javascript
function onMigrationStart(fromVersion, toVersion) {
  // fromVersion: string - Version migrating from (e.g., '1.1.0')
  // toVersion: string - Version migrating to (e.g., '1.2.0')
}
```

**Outputs:** Handler can return `false` to abort migration

**Usage Example:**
```javascript
Hooks.on('swse.migration.start', (fromVersion, toVersion) => {
  console.log(`Migrating from ${fromVersion} to ${toVersion}`);
});
```

---

### swse.migration.complete

**Fired When:** System migration completes successfully

**Inputs:**
```javascript
function onMigrationComplete(fromVersion, toVersion, summary) {
  // fromVersion: string - Version migrated from
  // toVersion: string - Version migrated to
  // summary: Object - Migration results
  //   {
  //     actorsUpdated: 42,
  //     itemsUpdated: 156,
  //     errorsEncountered: 0
  //   }
}
```

**Outputs:** None (informational)

**Usage Example:**
```javascript
Hooks.on('swse.migration.complete', (from, to, summary) => {
  if (summary.errorsEncountered > 0) {
    ui.notifications.error('Migration completed with errors');
  }
});
```

---

### swse.combat.resolved

**Fired When:** Combat action is resolved (attack, damage, skill check)

**Inputs:**
```javascript
function onCombatResolved(combat, resolution) {
  // combat: Combat - The active combat encounter
  // resolution: Object - Resolution data
  //   {
  //     action: 'attack', // 'attack', 'damage', 'skill-check', 'save'
  //     actor: Actor,
  //     target: Token,
  //     result: {...} // Action-specific result
  //   }
}
```

**Outputs:** None (informational)

**Usage Example:**
```javascript
Hooks.on('swse.combat.resolved', (combat, resolution) => {
  if (resolution.action === 'attack') {
    console.log(`Attack resolved: ${resolution.actor.name}`);
  }
});
```

---

### swse.actor.prepared

**Fired When:** Actor data is fully prepared and ready for use

**Inputs:**
```javascript
function onActorPrepared(actor) {
  // actor: Actor - Prepared actor with all data normalized
}
```

**Outputs:** None (informational)

**Usage Example:**
```javascript
Hooks.on('swse.actor.prepared', (actor) => {
  // Actor defenses, skills, BAB all calculated and available
});
```

---

## Standard Foundry Hooks (SWSE Listeners)

The system listens to these Foundry hooks and may fire additional SWSE hooks in response:

| Foundry Hook | SWSE Response | Notes |
|--------------|---------------|-------|
| `preCreateActor` | Validation | Validates actor data shape |
| `createActor` | `swse.actor.prepared` | After actor fully initialized |
| `preUpdateActor` | Safety check | Mutation safety validation |
| `updateActor` | Recalculation | Recalcs defenses, skills, BAB |
| `deleteActor` | Cleanup | Removes related data |
| `createItem` | Recalculation | Updates actor calculations |
| `deleteItem` | Recalculation | Updates actor calculations |
| `combatTurn` | Action suggestions | Prepares turn recommendations |
| `combatRound` | Round tracking | Updates round-based effects |

---

## Hook Contract Principles

All SWSE hooks follow these principles:

### 1. **Early Exits**
Handlers can return `false` to prevent downstream effects:
```javascript
Hooks.on('swse.chargen.complete', () => {
  // Return false to prevent actor sheet from opening
  return false;
});
```

### 2. **Non-Throwing**
Handlers that throw errors are caught and logged, not propagated:
```javascript
// Error here is logged but doesn't break system
Hooks.on('swse.import.complete', (actor) => {
  throw new Error('Oops!'); // Caught internally
});
```

### 3. **Async-Safe**
All hooks safely handle async handlers:
```javascript
Hooks.on('swse.chargen.complete', async (actor) => {
  await actor.update({...});
});
```

### 4. **Safe Mutation**
Handlers should use v13 API wrappers for mutations:
```javascript
// ✓ Good - uses v13 wrapper
Hooks.on('swse.chargen.complete', async (actor) => {
  const item = await createItemInActor(actor, {...});
});

// ❌ Bad - direct creation
Hooks.on('swse.chargen.complete', async (actor) => {
  await actor.createEmbeddedDocuments('Item', [...]);
});
```

---

## Registering Hook Listeners

### Basic Registration
```javascript
// Module init code
Hooks.on('swse.chargen.complete', onChargenComplete);
```

### With Error Handling
```javascript
Hooks.on('swse.chargen.complete', (actor, selections) => {
  try {
    // Your code here
  } catch (err) {
    console.error('Hook handler error:', err);
  }
});
```

### Conditional Listeners
```javascript
// Only listen if GM
if (game.user.isGM) {
  Hooks.on('swse.levelup.complete', handleLevelup);
}

// Only listen if specific world setting enabled
if (game.settings.get('mymod', 'enable-tracking')) {
  Hooks.on('swse.import.complete', trackImports);
}
```

---

## Extension Best Practices

### ✓ DO
- Listen to hooks for non-breaking integration
- Use v13 API wrappers for mutations
- Handle errors gracefully
- Check permissions before mutation
- Document your hook listeners in module manifest

### ✗ DON'T
- Monkey-patch core system classes
- Directly mutate `Actor.prototype` or `Item.prototype`
- Assume hook firing order (multiple handlers may exist)
- Throw errors from hooks
- Mutate actor/item data without using v13 wrappers

---

## Extension Example: Simple Mod

```javascript
// mymod/init.js
Hooks.once('init', () => {
  console.log('My SWSE Mod | Initializing');
});

Hooks.once('ready', () => {
  // Register my hook listeners
  Hooks.on('swse.chargen.complete', handleChargenComplete);
  Hooks.on('swse.levelup.complete', handleLevelupComplete);
});

async function handleChargenComplete(actor, selections) {
  console.log(`[My Mod] Character created: ${actor.name}`);

  // Add custom data
  await actor.setFlag('mymod', 'chargen-data', {
    createdAt: Date.now(),
    selections
  });
}

async function handleLevelupComplete(actor, newLevel, data) {
  console.log(`[My Mod] Level-up: ${actor.name} → level ${newLevel}`);
}
```

---

## Versioning & Deprecation

Hook contracts are stable from v1.2.0 onward. Breaking changes will:
1. Trigger a deprecation warning (Phase 5 warning system)
2. Provide a migration guide
3. Maintain backward compatibility for 1-2 major versions

Current hooks are considered **stable** and safe to depend on.
