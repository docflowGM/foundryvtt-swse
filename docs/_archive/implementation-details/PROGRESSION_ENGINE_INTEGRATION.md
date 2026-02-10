# Progression Engine Integration Guide

## Overview

This guide explains how to integrate the new `ApplyHandlers` utility into your progression engine for cleaner, more maintainable code.

## What Are ApplyHandlers?

`ApplyHandlers` is a centralized module that handles all item creation and actor updates during progression. Instead of duplicating logic across `finalize()` and other methods, we use handlers:

- `applyClass()` - Create or update class items
- `applyFeat()` - Add feat items to actor
- `applyTalent()` - Add talent items to actor
- `applyForcePower()` - Add force power items to actor
- `applyScalingFeature()` - Apply scaling features (like Trusty Sidearm +3)
- `applyClassFeature()` - Apply class features (proficiencies, etc.)
- `applySkillTraining()` - Mark skills as trained
- `applyAbilityIncreases()` - Apply ability score increases
- `applyHPGain()` - Add HP gains
- `recalculateDerived()` - Recalculate BAB, defenses, etc.

## Integration Steps

### Step 1: Import ApplyHandlers in progression.js

At the top of `/home/user/foundryvtt-swse/scripts/engine/progression.js`, add:

```javascript
import { ApplyHandlers } from '../progression/utils/apply-handlers.js';
```

### Step 2: Replace finalize() Method

The current `finalize()` method manually creates items. Replace the `_createProgressionItems()` section with handler calls.

**Current (Before):**
```javascript
async finalize() {
  try {
    // ... existing code ...

    // Create feat/talent/skill items from progression data
    await this._createProgressionItems();

    // ... existing code ...
  }
}

async _createProgressionItems() {
  const prog = this.actor.system.progression || {};
  const itemsToCreate = [];

  // Lots of manual item creation logic
  for (const featName of allFeats) {
    const existing = this.actor.items.find(i => i.type === 'feat' && i.name === featName);
    if (!existing) {
      itemsToCreate.push({
        name: featName,
        type: 'feat',
        // ... etc
      });
    }
  }

  // More manual creation code
}
```

**New (After):**
```javascript
async finalize() {
  try {
    // Save progression state
    await this.saveStateToActor();

    // Apply derived stats (HP, defenses, BAB, etc.)
    const { ActorProgressionUpdater } = await import('../progression/engine/progression-actor-updater.js');
    await ActorProgressionUpdater.finalize(this.actor);

    // Create progression items using handlers
    await this._applyProgressionItems();

    // Trigger force powers (if applicable)
    // ... existing code ...

    // Emit completion event
    // ... existing code ...

    return true;
  } catch (err) {
    swseLogger.error('Progression finalize failed:', err);
    ui.notifications?.error(`Failed to finalize: ${err.message}`);
    throw err;
  }
}

/**
 * Apply progression items using centralized handlers
 * @private
 */
async _applyProgressionItems() {
  const prog = this.actor.system.progression || {};

  // Apply all feats (starting + chosen)
  const startingFeats = prog.startingFeats || [];
  const chosenFeats = prog.feats || [];
  const allFeats = [...startingFeats, ...chosenFeats];

  for (const featName of allFeats) {
    // Find feat in compendium to get full data
    const featPack = game.packs.get('foundryvtt-foundryvtt-swse.feats');
    const featIndex = featPack?.index.find(f => f.name === featName);

    if (featIndex) {
      const featDoc = await featPack.getDocument(featIndex._id);
      if (featDoc) {
        await ApplyHandlers.applyFeat(this.actor, featDoc.toObject());
      }
    }
  }

  // Apply all talents
  const talents = prog.talents || [];
  for (const talentName of talents) {
    const talentPack = game.packs.get('foundryvtt-foundryvtt-swse.talents');
    const talentIndex = talentPack?.index.find(t => t.name === talentName);

    if (talentIndex) {
      const talentDoc = await talentPack.getDocument(talentIndex._id);
      if (talentDoc) {
        await ApplyHandlers.applyTalent(this.actor, talentDoc.toObject());
      }
    }
  }

  // Apply force powers if needed
  const forcePowers = prog.forcePowers || [];
  for (const powerName of forcePowers) {
    const powerPack = game.packs.get('foundryvtt-foundryvtt-swse.forcepowers');
    const powerIndex = powerPack?.index.find(p => p.name === powerName);

    if (powerIndex) {
      const powerDoc = await powerPack.getDocument(powerIndex._id);
      if (powerDoc) {
        await ApplyHandlers.applyForcePower(this.actor, powerDoc.toObject());
      }
    }
  }

  // Apply ability increases if applicable
  if (prog.abilityIncreases) {
    await ApplyHandlers.applyAbilityIncreases(this.actor, prog.abilityIncreases);
  }

  // Recalculate all derived stats
  await ApplyHandlers.recalculateDerived(this.actor);
}
```

### Step 3: Use Handlers in Other Finalization Points

If you have multiple places where items are created (like in `_action_confirmClass`), consider using handlers there too:

```javascript
async _action_confirmClass(payload) {
  // ... existing class confirmation logic ...

  // When applying the class, use the handler instead of manual updates
  const classDoc = { /* normalized class data */ };
  await ApplyHandlers.applyClass(this.actor, classDoc, levelInClass);
}
```

### Step 4: Track Selections Uniformly

Ensure each action method stores selections consistently:

```javascript
async _action_confirmFeats(payload) {
  const { featIds } = payload;

  // ... validation logic ...

  // Store both in actor.system.progression AND in engine.data
  await applyActorUpdateAtomic(this.actor, {
    "system.progression.feats": feats
  });

  // Store in engine for reference
  this.data.feats = featIds;
  await this.completeStep("feats");
}
```

## Benefits of This Approach

✅ **Single Source of Truth**: All item creation logic in one place
✅ **Easier Testing**: Test ApplyHandlers independently
✅ **Consistent Behavior**: No duplicated logic = no inconsistencies
✅ **Future-Proof**: Easy to add new item types or modify application rules
✅ **Better Organization**: Separation of concerns - progression logic vs. item application

## Migration Path

You can integrate this gradually:

1. **Phase 1**: Create ApplyHandlers (✅ Done)
2. **Phase 2**: Update finalize() to use handlers
3. **Phase 3**: Update individual action methods to use handlers
4. **Phase 4**: Remove old `_createProgressionItems()` method
5. **Phase 5**: Consider normalizing item creation across the codebase

## Example: Adding a New Handler

If you need to handle a new item type, just add a method to ApplyHandlers:

```javascript
// In apply-handlers.js
async applyCustomItem(actor, item) {
  const exists = actor.items.some(i => i.type === "custom" && i.name === item.name);
  if (exists) return;

  await actor.createEmbeddedDocuments("Item", [item]);
}

// In progression.js finalize()
const customItems = prog.customItems || [];
for (const itemName of customItems) {
  // ... fetch from compendium ...
  await ApplyHandlers.applyCustomItem(this.actor, itemDoc.toObject());
}
```

## Integration Checklist

- [ ] Import ApplyHandlers in progression.js
- [ ] Create `_applyProgressionItems()` method
- [ ] Update finalize() to call `_applyProgressionItems()`
- [ ] Test that feats/talents/powers are still applied correctly
- [ ] Update _action_confirmClass to use ApplyHandlers
- [ ] Update other action methods if needed
- [ ] Remove old _createProgressionItems() method
- [ ] Update documentation with new approach

## Questions?

If you need clarification on any integration step, check:
- The ApplyHandlers source in `scripts/progression/utils/apply-handlers.js`
- The current progression engine in `scripts/engine/progression.js`
- The action methods section (~line 513+)
