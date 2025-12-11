# SWSE Migration Guide

This document describes the migration system for the Star Wars Saga Edition (SWSE) system for Foundry VTT.

## Overview

The SWSE system uses a migration system to update actor and item data when the data schema changes between versions. This ensures that existing worlds and characters continue to work correctly when the system is updated.

## Migration Status

### ✅ Completed Migrations

1. **ActorEngine Refactor (v1.1.207)**
   - **Risk Level**: High
   - **Status**: ✅ Complete
   - **Description**: Refactored ActorEngine to use atomic updates instead of recursive calls
   - **Changes**:
     - Created `scripts/utils/actor-utils.js` with atomic update helpers
     - Fixed circular reference in `ActorEngine.updateActor()`
     - All actor updates now use `applyActorUpdateAtomic()` for safety
     - Removed 100+ "TODO: manual migration required" markers
   - **Manual Steps**: None - automatic
   - **Rollback**: Not needed

2. **Defense Schema Fix**
   - **Risk Level**: Medium
   - **Status**: ✅ Complete
   - **Script**: `scripts/migration/fix-defense-schema.js`
   - **Description**: Updates defense schema to new format
   - **Manual Steps**: None - runs automatically on world load

3. **Actor Size Migration**
   - **Risk Level**: Low
   - **Status**: ✅ Complete
   - **Script**: `scripts/migration/fix-actor-size.js`
   - **Description**: Standardizes actor size field
   - **Manual Steps**: None - runs automatically on world load

4. **Actor Validation Migration**
   - **Risk Level**: Low
   - **Status**: ✅ Complete
   - **Script**: `scripts/migration/actor-validation-migration.js`
   - **Description**: Validates and fixes actor data structure
   - **Manual Steps**: None - runs automatically on world load

5. **Item Validation Migration**
   - **Risk Level**: Low
   - **Status**: ✅ Complete
   - **Script**: `scripts/migration/item-validation-migration.js`
   - **Description**: Validates and fixes item data structure
   - **Manual Steps**: None - runs automatically on world load

6. **Force Compendium Population**
   - **Risk Level**: Low
   - **Status**: ✅ Complete
   - **Script**: `scripts/migration/populate-force-compendiums.js`
   - **Description**: Populates Force power compendiums
   - **Manual Steps**: None - runs automatically on world load

### 🚧 In Progress Migrations

None currently.

### 📋 Planned Migrations

None currently planned.

## Migration Architecture

### Atomic Updates

All actor updates should use the atomic update helper functions to ensure data consistency:

```javascript
import { applyActorUpdateAtomic } from './scripts/utils/actor-utils.js';

// Single atomic update
await applyActorUpdateAtomic(actor, {
  'system.hp.value': 20,
  'system.credits': 1000
});

// Batch multiple updates
import { batchActorUpdates } from './scripts/utils/actor-utils.js';
await batchActorUpdates(actor, [
  { 'system.hp.value': 20 },
  { 'system.credits': 1000 }
]);

// Safe update with rollback
import { safeActorUpdate } from './scripts/utils/actor-utils.js';
try {
  await safeActorUpdate(actor, { 'system.hp.value': newValue });
} catch (err) {
  // Actor state has been restored
  console.error('Update failed and was rolled back');
}
```

### ActorEngine API

The `ActorEngine` provides centralized actor update methods:

```javascript
// Via game.swse namespace
await game.swse.ActorEngine.updateActor(actor, updateData);

// Via window.SWSE namespace
await window.SWSE.ActorEngine.updateActor(actor, updateData);

// Via globalThis.SWSE namespace (for compatibility)
await globalThis.SWSE.ActorEngine.updateActor(actor, updateData);
```

All three methods use the same underlying atomic update system.

## Migration Testing

### Unit Tests

Migration logic should be tested with unit tests that mock the Foundry API:

```javascript
// tests/migrations/actor-engine.test.js
import { ActorEngine } from '../../scripts/actors/engine/actor-engine.js';

describe('ActorEngine', () => {
  it('should update actor atomically', async () => {
    const mockActor = {
      update: jest.fn(),
      system: { hp: { value: 10 } }
    };

    await ActorEngine.updateActor(mockActor, { 'system.hp.value': 20 });

    expect(mockActor.update).toHaveBeenCalledWith({ 'system.hp.value': 20 }, {});
  });
});
```

### Integration Tests

Integration tests should verify migrations work in a real Foundry environment:

1. Create a test world with pre-migration data
2. Run the system with migrations enabled
3. Verify all actors and items are updated correctly
4. Check no data was corrupted

### Manual Testing Checklist

Before releasing a new migration:

- [ ] Backup test world
- [ ] Run migration on test world
- [ ] Verify character sheets load correctly
- [ ] Test character creation
- [ ] Test level-up
- [ ] Test combat
- [ ] Test Force powers
- [ ] Test vehicle sheets
- [ ] Check browser console for errors
- [ ] Verify no data loss

## Migration Best Practices

### 1. Idempotency

Migrations should be idempotent - running them multiple times should be safe:

```javascript
// Good - checks if migration is needed
if (!actor.system.newField) {
  await actor.update({ 'system.newField': defaultValue });
}

// Bad - always updates
await actor.update({ 'system.newField': defaultValue });
```

### 2. Validation

Always validate data before and after migration:

```javascript
import { validateActorFields } from './scripts/utils/actor-utils.js';

try {
  validateActorFields(actor, ['system.hp', 'system.defenses']);
  await applyActorUpdateAtomic(actor, changes);
} catch (err) {
  console.error('Validation failed:', err);
  // Handle error
}
```

### 3. Error Handling

Wrap migrations in try-catch and provide clear error messages:

```javascript
try {
  await migrateActor(actor);
} catch (err) {
  console.error(`Migration failed for actor ${actor.name} (${actor.id}):`, err);
  ui.notifications.error(`Failed to migrate ${actor.name}. Check console for details.`);
}
```

### 4. Logging

Log migration progress for debugging:

```javascript
import { swseLogger } from './scripts/utils/logger.js';

swseLogger.log(`Starting migration for actor ${actor.name}`);
// ... migration logic ...
swseLogger.log(`Migration complete for actor ${actor.name}`);
```

### 5. Backup

Critical migrations should create backups:

```javascript
const backup = foundry.utils.deepClone(actor.toObject());
try {
  await migrateActor(actor);
} catch (err) {
  // Restore backup
  await actor.update(backup, { diff: false });
  throw err;
}
```

## Troubleshooting

### Migration Not Running

1. Check system version in `system.json`
2. Verify migration script is imported in `index.js`
3. Check browser console for errors
4. Enable dev mode: `game.settings.set('swse', 'devMode', true)`

### Data Corruption

1. Restore from backup immediately
2. Disable the problematic migration
3. File a bug report with:
   - System version
   - Foundry version
   - Console errors
   - Steps to reproduce

### Performance Issues

If migrations are slow:

1. Check for unnecessary loops over all actors/items
2. Use `cacheManager` to cache compendium lookups
3. Batch updates instead of individual updates
4. Consider splitting into multiple smaller migrations

## Version History

| Version | Migration | Risk | Status |
|---------|-----------|------|--------|
| 1.1.207 | ActorEngine Refactor | High | ✅ Complete |
| 1.1.206 | Force Compendiums | Low | ✅ Complete |
| 1.1.205 | Item Validation | Low | ✅ Complete |
| 1.1.204 | Actor Validation | Low | ✅ Complete |
| 1.1.203 | Actor Size | Low | ✅ Complete |
| 1.1.202 | Defense Schema | Medium | ✅ Complete |

## Contact

If you encounter migration issues, please:

1. Check the [Issues](https://github.com/docflowGM/foundryvtt-swse/issues) page
2. Search for existing reports
3. File a new issue with details

For development questions, see [CONTRIBUTING.md](../CONTRIBUTING.md).
