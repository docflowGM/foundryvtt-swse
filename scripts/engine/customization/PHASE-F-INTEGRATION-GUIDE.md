# Phase F: Restriction Propagation + Workbench Integration

**Status**: IMPLEMENTED - Ready for workbench refactor

**What Phase F Does**:
- Implements full restriction propagation (base + upgrades + templates → most restrictive)
- Provides CustomizationWorkflow orchestrator (high-level API for UI)
- Handles data migration from old `swse` namespace
- Provides summary and detailed reports

---

## Restriction Propagation Engine

Derives effective restriction by composing all sources.

```javascript
import { RestrictionPropagationEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const restrictionEngine = new RestrictionPropagationEngine();

// Get effective restriction (most restrictive of: base + upgrades + templates)
const effectiveRestriction = restrictionEngine.getEffectiveRestriction(item);
// 'common' | 'licensed' | 'restricted' | 'military' | 'illegal'

// Check if item is rare (from base or any component)
const isRare = restrictionEngine.isItemRare(item);

// Get full profile for display
const profile = restrictionEngine.getRestrictionProfile(item);
// {
//   baseRestriction,
//   effectiveRestriction,
//   changed,
//   isRare,
//   restrictions: { baseRestriction, upgradeRestrictions, templateRestrictions }
// }

// Check if one restriction is more restrictive than another
const isMore = restrictionEngine.isMoreRestrictive('restricted', 'common');  // true
```

**Hierarchy**:
- common (0) < licensed (1) < restricted (2) < military (3) < illegal (4)
- Rare tracked separately (item can be common + rare)

---

## Customization Workflow

High-level orchestrator that manages all engines and provides a simple UI API.

### Initialization

```javascript
import { CustomizationWorkflow } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

class UnifiedCustomizationWorkbench {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    this.workflow = new CustomizationWorkflow();  // Create once, reuse
  }
}
```

### Query Full State (Primary Method)

```javascript
// This is the main query the UI should make
const state = this.workflow.getFullCustomizationState(this.item);

// Returns:
// {
//   item: { id, name, category, customizable },
//   profile: { ... },
//   slots: { stockBase, bonusFromSizeIncrease, bonusFromStripping, totalAvailable, usedSlots, freeSlots, isOverflowing },
//   strippable: ['damage', 'range', ...],
//   cost: (effective item value),
//   restriction: { baseRestriction, effectiveRestriction, changed, isRare, restrictions },
//   actions: {
//     canSizeIncrease: boolean,
//     canStrip: [{ area, allowed }],
//     eligibleUpgrades: [upgradeKey, ...],
//     appliedTemplates: [templateKey, ...]
//   },
//   error: null | "error message"
// }

// Use state for all display decisions
// Never calculate locally
```

### Preview Operations (Non-Mutating)

```javascript
// Preview size increase
const sizeIncreasePreview = this.workflow.previewSizeIncrease(this.item, this.actor);
if (sizeIncreasePreview.success) {
  console.log(sizeIncreasePreview.preview);
  // Show preview to user: cost, slots, DC, time
}

// Preview strip
const stripPreview = this.workflow.previewStrip(this.item, this.actor, 'damage');
if (stripPreview.success) {
  console.log(stripPreview.preview.downgrade);  // "Weapon damage reduced by 1d6"
}

// Preview install
const installPreview = this.workflow.previewInstall(this.item, this.actor, 'improved_targeting');
if (installPreview.success) {
  // Show: cost, slots before/after, mechanics DC, time
}

// Preview remove
const removePreview = this.workflow.previewRemove(this.item, this.actor, instanceId);
if (removePreview.success) {
  // Show: removal cost (50% of install), mechanics DC, time
}

// Preview template
const templatePreview = this.workflow.previewTemplate(this.item, 'licensed_modification');
if (templatePreview.success) {
  // Show: cost impact, restriction change, rarity change
}
```

### Apply Operations (Mutating)

```javascript
// Size increase (after mechanics check)
const sizeIncreaseResult = await this.workflow.applySizeIncrease(
  this.item,
  this.actor,
  mechanicsCheckResult  // { total: 22, ... }
);
if (sizeIncreaseResult.success) {
  ui.notifications.info('✓ Size increased!');
  this.item = await this.item.update({});  // Refresh
} else {
  ui.notifications.warn(sizeIncreaseResult.reason);
}

// Strip (after mechanics check)
const stripResult = await this.workflow.applyStrip(
  this.item,
  this.actor,
  'damage',
  mechanicsCheckResult
);

// Install (after mechanics check)
const installResult = await this.workflow.applyInstall(
  this.item,
  this.actor,
  'improved_targeting',
  mechanicsCheckResult
);

// Remove (after mechanics check)
const removeResult = await this.workflow.applyRemove(
  this.item,
  this.actor,
  instanceId,
  mechanicsCheckResult
);

// Apply template
const templateResult = await this.workflow.applyTemplate(
  this.item,
  'licensed_modification',
  this.actor
);
```

### Eligibility & Lookup

```javascript
// Get detailed eligibility report
const report = this.workflow.getUpgradeEligibilityReport(this.item);
// Shows each upgrade with eligible/reason/slots/cost

// Check if template can be applied
const canApply = this.workflow.canApplyTemplate(this.item, 'exotic_material');
// { eligible: boolean, reason?: string }

// Check if upgrade can be installed
const canInstall = this.workflow.canInstallUpgrade(this.item, 'improved_targeting');

// Check if area can be stripped
const canStrip = this.workflow.canStripArea(this.item, 'damage');

// Check if size increase is allowed
const canSize = this.workflow.canApplySizeIncrease(this.item);
```

### Data Migration (Old → New Namespace)

```javascript
// Check if item has old-style customization
if (this.workflow.hasLegacyCustomization(this.item)) {
  // Migrate from flags.swse to flags.foundryvtt-swse.customization
  const migration = await this.workflow.migrateLegacyCustomization(this.item);
  if (migration.success) {
    console.log(`Migrated: ${migration.details.hadBoltColor ? 'blaster' : ''}`);
  }
}
```

### Display Views (Summaries)

```javascript
// Compact summary for item card
const summary = this.workflow.getSummaryView(this.item);
// {
//   name, category, customized,
//   summary: { upgrades, templates, stripped, sizeIncreased },
//   slots: { free, total, full },
//   cost: { base, effective },
//   restriction: { base, effective, rare }
// }

// Detailed report for audit/inspection
const report = this.workflow.getDetailedReport(this.item);
// {
//   item, timestamp,
//   structural: { sizeIncreaseApplied, strippedAreas },
//   upgrades: [...],
//   templates: [...],
//   slots: {...},
//   costs: {...},
//   restriction: {...},
//   operationLog: [...]
// }
```

---

## Workbench Refactoring Pattern

### Before (Old Pattern - Don't Do This)

```javascript
// OLD: UI calculates everything
getContext() {
  let totalCost = this.item.system.cost;  // ❌ Wrong, doesn't account for upgrades
  let freeSlots = 2;  // ❌ Wrong, doesn't account for structural changes

  return {
    slots: freeSlots,
    cost: totalCost
  };
}
```

### After (New Pattern - Do This)

```javascript
// NEW: UI queries engines
async _prepareContext(options) {
  const context = await super._prepareContext(options);

  // Query workflow for everything
  const customState = this.workflow.getFullCustomizationState(this.item);

  if (customState.error) {
    return { ...context, error: customState.error };
  }

  return {
    ...context,
    // Use these, never calculate
    profile: customState.profile,
    slots: customState.slots,
    strippable: customState.strippable,
    cost: customState.cost,
    restriction: customState.restriction,
    actions: customState.actions,
    
    // For rendering
    itemName: customState.item.name,
    itemImg: this.item.img,
    canSizeIncrease: customState.actions.canSizeIncrease,
    eligibleUpgrades: customState.actions.eligibleUpgrades
  };
}
```

### Event Handlers

```javascript
// Size increase button
async onSizeIncreaseClick() {
  const preview = this.workflow.previewSizeIncrease(this.item, this.actor);
  if (!preview.success) {
    ui.notifications.warn(preview.reason);
    return;
  }

  // Show preview dialog
  const accepted = await this.showDialog('Size Increase Preview', preview.preview);
  if (!accepted) return;

  // Get mechanics check (via actor roll or player input)
  const mechanicsResult = await this.actor.rollMechanics({
    dc: preview.preview.mechanics.dc
  });

  // Apply
  const result = await this.workflow.applySizeIncrease(
    this.item,
    this.actor,
    mechanicsResult
  );

  if (result.success) {
    ui.notifications.info('✓ Size increased!');
    await this.item.update({});
    this.render();
  } else {
    if (result.operationId === 'SIZE_INCREASE_MECHANIC_FAILURE') {
      ui.notifications.warn(`Mechanics check failed. Retry cost: ${result.failureData.retryOperationCost}`);
    } else {
      ui.notifications.warn(result.reason);
    }
  }
}

// Strip button
async onStripClick(areaKey) {
  const canStrip = this.workflow.canStripArea(this.item, areaKey);
  if (!canStrip.allowed) {
    ui.notifications.warn(canStrip.reason);
    return;
  }

  const preview = this.workflow.previewStrip(this.item, this.actor, areaKey);
  if (!preview.success) {
    ui.notifications.warn(preview.reason);
    return;
  }

  // Show preview and get confirmation
  const accepted = await this.showDialog('Strip Area', {
    area: areaKey,
    downgrade: preview.preview.downgrade,
    cost: preview.preview.operationCost,
    mechanics: preview.preview.mechanics
  });

  if (!accepted) return;

  // Get mechanics check
  const mechanicsResult = await this.actor.rollMechanics({
    dc: preview.preview.mechanics.dc
  });

  // Apply
  const result = await this.workflow.applyStrip(
    this.item,
    this.actor,
    areaKey,
    mechanicsResult
  );

  if (result.success) {
    ui.notifications.info(`✓ Stripped ${result.mutations.areaStripped}!`);
    await this.item.update({});
    this.render();
  } else {
    ui.notifications.warn(result.reason);
  }
}

// Install upgrade
async onInstallClick(upgradeKey) {
  const canInstall = this.workflow.canInstallUpgrade(this.item, upgradeKey);
  if (!canInstall.eligible) {
    ui.notifications.warn(canInstall.reason);
    return;
  }

  const preview = this.workflow.previewInstall(this.item, this.actor, upgradeKey);
  if (!preview.success) {
    ui.notifications.warn(preview.reason);
    return;
  }

  // Show preview
  const accepted = await this.showDialog('Install Upgrade', preview.preview);
  if (!accepted) return;

  // Get mechanics check
  const mechanicsResult = await this.actor.rollMechanics({
    dc: preview.preview.mechanics.dc
  });

  // Apply
  const result = await this.workflow.applyInstall(
    this.item,
    this.actor,
    upgradeKey,
    mechanicsResult
  );

  if (result.success) {
    ui.notifications.info(`✓ Installed ${result.mutations.upgradeName}!`);
    await this.item.update({});
    this.render();
  } else {
    ui.notifications.warn(result.reason);
  }
}
```

---

## Integration Checklist

### Workbench Refactoring
- [ ] Import CustomizationWorkflow in constructor
- [ ] Replace all UI-level slot calculations with workflow queries
- [ ] Replace all UI-level cost calculations with workflow queries
- [ ] Replace all eligibility checks with workflow queries
- [ ] Implement preview dialogs for each operation
- [ ] Implement event handlers for: size increase, strip, install, remove, template
- [ ] Integrate Mechanics checks (actor rolls)
- [ ] Update template rendering for templates
- [ ] Handle migration on item load

### Testing (Phase F Specific)
- [ ] RestrictionPropagationEngine derives correct effective restriction
- [ ] CustomizationWorkflow.getFullCustomizationState() returns complete state
- [ ] Data migration preserves old customization data
- [ ] Workbench displays correct slots/costs from engines
- [ ] Workbench shows correct eligibility from engines
- [ ] Mechanics check failures handled correctly
- [ ] Retry costs calculated correctly

### Old Adapter Deprecation
- [ ] BlasterAdapter: still reads `flags.swse.boltColor` for backward compat
- [ ] Mark old adapters as deprecated (will remove in Phase G)
- [ ] Add migration prompt when old customization detected

---

## Summary

**Phase F provides**:
- Full restriction propagation (base + upgrades + templates)
- High-level CustomizationWorkflow API
- Data migration from old namespace
- Summary and detailed reporting

**Workbench integration is straightforward**:
1. Create workflow instance in constructor
2. Query full state via `getFullCustomizationState()`
3. Use that state for all display
4. Call preview methods before apply
5. Call apply methods after mechanics check
6. Requery after apply (never trust cached state)

**No more UI-level calculations. Engines are the source of truth.**
