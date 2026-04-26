# Phases B-E: Structural Changes, Upgrades, Operations, Templates

**Status**: IMPLEMENTED - Full customization system ready for integration

**Overview**: 
- Phase B: Structural changes (size increase, stripping)
- Phase C: Upgrade catalog and eligibility rules
- Phase D: Install/remove operations
- Phase E: Templates with stacking and cost sequencing

All phases build on Phase A foundations. All operations are preview-then-apply (defensive). All results structured with clear success/failure reasons.

---

## Phase B: Structural Change Engine

Implements permanent mechanical modifications to items.

### Size Increase Operation

Doubles item cost, adds +1 upgrade slot, requires Mechanics check and time.

```javascript
import { StructuralChangeEngine, ItemProfileResolver, UpgradeSlotEngine, CustomizationCostEngine } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const slotEngine = new UpgradeSlotEngine(resolver);
const costEngine = new CustomizationCostEngine(resolver);
const structuralEngine = new StructuralChangeEngine(resolver, slotEngine, costEngine);

// Preview
const preview = structuralEngine.previewSizeIncrease(item, actor);
if (preview.success) {
  // Show preview: cost, slots, DC, time
  console.log(preview.preview);
}

// Apply (after Mechanics check)
const result = await structuralEngine.applySizeIncrease(item, actor, mechanicsCheckResult);
if (result.success) {
  console.log(`Applied! New slots: ${result.mutations.newTotalSlots}`);
}
```

**Rules**:
- One-time only per item
- Doubles item cost
- Adds +1 slot
- Heavy armor cannot apply
- Lightsabers/droids: not supported in Phase B
- DC scales with item cost and category
- Time: 4-10 hours depending on complexity

### Strip Operation

Removes mechanical traits, gains +1 slot per area stripped, costs 50% base cost.

```javascript
// Preview
const preview = structuralEngine.previewStrip(item, actor, 'damage');
if (preview.success) {
  console.log(preview.preview.downgrade);  // What the item loses
}

// Apply
const result = await structuralEngine.applyStrip(item, actor, 'damage', mechanicsCheckResult);
if (result.success) {
  console.log(`Stripped ${result.mutations.areaStripped}, new slots: ${result.mutations.newTotalSlots}`);
}
```

**Strippable Areas**:
- Weapons: damage, range, design, stun_setting, autofire
- Armor: defensive_material, joint_protection

**Rules**:
- Each area can only be stripped once
- Stripping cannot be undone
- Gain +1 slot per stripped area
- Costs 50% of base item cost
- Design stripping excluded from already-exotic weapons
- DC scales with area complexity
- Mechanical downgrades applied (reduce damage, reduce range, etc.)

### Failure Handling

Both operations support failure on Mechanics check:

```javascript
// If check fails
if (!result.success && result.operationId === 'SIZE_INCREASE_MECHANIC_FAILURE') {
  // Retry costs 50% of original operation cost
  console.log(`Retry cost: ${result.failureData.retryOperationCost}`);
}
```

---

## Phase C: Upgrade Catalog + Eligibility

### Upgrade Catalog

Canonical definitions of all upgrades by category.

```javascript
import { UPGRADE_CATALOG, getUpgradeDefinition, getUpgradesForCategory } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

// Get upgrade definition
const upgradeDef = getUpgradeDefinition('improved_targeting');
// { key, name, category, slotCost, baseCost, mechanics, affectedAreas, restrictions, ... }

// Get all weapons upgrades
const weaponUpgrades = getUpgradesForCategory('weapon');
```

**Upgrade Structure**:
- key: unique identifier
- name: display name
- category: weapon, armor, or gear
- slotCost: number of slots consumed
- baseCost: installation cost (credits)
- mechanics: { dc, hoursPerSlot }
- affectedAreas: what this upgrade modifies
- restrictions: common, licensed, restricted, military
- incompatibilities: upgrades it conflicts with
- oncePerItem: if true, can only install once per item

**Sample Upgrades**:
- improved_targeting: +1 accuracy (1 slot, 500 cr)
- reinforced_barrel: +1d4 damage (1 slot, 300 cr, once per item)
- scope_system: +2 range increments, +2 accuracy (2 slots, 1200 cr)
- stealth_coating (armor): +4 stealth (1 slot, 1500 cr, restricted)

### Eligibility Engine

Determines what upgrades can be installed.

```javascript
import { UpgradeEligibilityEngine, ItemProfileResolver, UpgradeSlotEngine } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const slotEngine = new UpgradeSlotEngine(resolver);
const eligibilityEngine = new UpgradeEligibilityEngine(resolver, slotEngine);

// Check if upgrade can be installed
const check = eligibilityEngine.canInstallUpgrade(item, 'improved_targeting');
if (!check.eligible) {
  console.log(check.reason);  // Why it's not eligible
}

// Get all eligible upgrades for this item
const eligible = eligibilityEngine.getEligibleUpgrades(item);

// Get detailed report
const report = eligibilityEngine.getEligibilityReport(item);
// Shows each upgrade with eligible/reason/slots/cost
```

**Eligibility Rules**:
- Category match (upgrade category == item category)
- Slot availability (free slots >= upgrade slot cost)
- Stripped area lockout (cannot upgrade a stripped area)
- Incompatibility check (conflicting upgrades/features)
- One-per-item constraint (cannot install same upgrade twice if oncePerItem)

**Example**: If damage is stripped, cannot install any upgrade that affects damage.

---

## Phase D: Install/Remove Operations

Full install and remove operations with Mechanics DC and time requirements.

### Install Operation

```javascript
import { InstallRemoveEngine, ItemProfileResolver, UpgradeSlotEngine, CustomizationCostEngine, UpgradeEligibilityEngine } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const slotEngine = new UpgradeSlotEngine(resolver);
const costEngine = new CustomizationCostEngine(resolver);
const eligibilityEngine = new UpgradeEligibilityEngine(resolver, slotEngine);
const installEngine = new InstallRemoveEngine(resolver, slotEngine, costEngine, eligibilityEngine);

// Preview
const preview = installEngine.previewInstall(item, actor, 'improved_targeting');
if (preview.success) {
  console.log(preview.preview);
  // Shows: cost, slots before/after, mechanics DC, time
}

// Apply (after Mechanics check)
const result = await installEngine.applyInstall(item, actor, 'improved_targeting', mechanicsCheckResult);
if (result.success) {
  console.log(`Installed! Instance ID: ${result.mutations.instanceId}`);
}
```

**Rules**:
- Creates instance with instanceId (allows same upgrade multiple times if not oncePerItem)
- Validates eligibility before apply
- Checks cost and credits
- Requires Mechanics DC check
- Takes time (base hours per slot)
- Deducts credits from actor
- Logs operation to audit trail

### Remove Operation

```javascript
// Preview
const preview = installEngine.previewRemove(item, actor, instanceId);
if (preview.success) {
  console.log(preview.preview);
  // Shows: removal cost (50% of install), mechanics DC (lower), time
}

// Apply
const result = await installEngine.applyRemove(item, actor, instanceId, mechanicsCheckResult);
if (result.success) {
  console.log(`Removed! Refunded: ${result.mutations.costRefunded}`);
}
```

**Rules**:
- Removal cost = 50% of installation cost
- Refunds credits to actor
- Mechanics DC 2-3 points lower than install
- Time = 60-75% of installation time
- Restores slots

### Failure Handling

Both operations support Mechanics check failure with retry logic:

```javascript
// Install fails on mechanics
if (!result.success && result.operationId === 'INSTALL_MECHANIC_FAILURE') {
  console.log(`Retry cost: ${result.failureData.retryOperationCost}`);
}
```

---

## Phase E: Templates

Templates are distinct from upgrades with different rules. They affect item properties globally (not slot-based) and have special stacking rules.

### Template Catalog

Canonical definitions: restriction changes, rarity flags, cost multipliers, special modifiers.

```javascript
import { TEMPLATE_CATALOG, getTemplateDefinition, getTemplatesByType } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const templateDef = getTemplateDefinition('licensed_modification');
// { key, name, type, source, restriction, rarity, stackable, costModifier, ... }

// Get all rarity-flag templates
const rarityFlags = getTemplatesByType('rarity_flag');
```

**Sample Templates**:
- licensed_modification: changes restriction to licensed (+50 cr)
- military_grade_modification: restriction military, 1.5x cost multiplier
- exotic_material: rare, 2.0x cost multiplier
- masterwork_craftsmanship: 1.3x cost (no restriction change)
- salvaged_parts: 0.5x cost (cheap but less reliable)
- one_of_a_kind: rare, 3.0x cost

### Template Engine

```javascript
import { TemplateEngine, ItemProfileResolver, CustomizationCostEngine, RestrictionPropagator } 
  from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const costEngine = new CustomizationCostEngine(resolver);
const restrictionEngine = new RestrictionPropagator();
const templateEngine = new TemplateEngine(resolver, costEngine, restrictionEngine);

// Check eligibility
const eligible = templateEngine.canApplyTemplate(item, 'licensed_modification');

// Preview
const preview = templateEngine.previewTemplate(item, 'licensed_modification');
if (preview.success) {
  console.log(preview.preview);
  // Shows: cost impact, restriction change, rarity change
}

// Apply
const result = await templateEngine.applyTemplate(item, 'licensed_modification', actor);
if (result.success) {
  console.log(`Applied! Cost impact: ${result.mutations.costImpact}`);
}
```

### Template Stacking Rules

**By default**: No two of same template key on same item (non-stackable).

**Exceptions**: Some templates allow stacking (stackable: true) with special rules.

**Conflict Detection**: Templates affecting the same areas cannot be applied together unless they have exceptions defined.

### Cost Sequencing

Templates apply sequentially in order. Cost impact depends on cost modifier:

- **additive**: adds fixed credits (e.g., +50 cr)
- **multiplicative**: multiplies current cost (e.g., 1.5x)
- **override**: sets cost to specific value

```javascript
// Calculate final item cost after all templates
const finalCost = templateEngine.calculateFinalItemCost(item);

// Calculate effective restriction after all templates
const effectiveRestriction = templateEngine.calculateEffectiveRestriction(item);
```

---

## Integration Example: Full Customization Workflow

```javascript
import {
  ItemProfileResolver,
  UpgradeSlotEngine,
  CustomizationCostEngine,
  RestrictionPropagator,
  StructuralChangeEngine,
  UpgradeEligibilityEngine,
  InstallRemoveEngine,
  TemplateEngine
} from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

class CustomizationWorkflow {
  constructor() {
    this.profileResolver = new ItemProfileResolver();
    this.slotEngine = new UpgradeSlotEngine(this.profileResolver);
    this.costEngine = new CustomizationCostEngine(this.profileResolver);
    this.restrictionEngine = new RestrictionPropagator();
    this.structuralEngine = new StructuralChangeEngine(this.profileResolver, this.slotEngine, this.costEngine);
    this.eligibilityEngine = new UpgradeEligibilityEngine(this.profileResolver, this.slotEngine);
    this.installEngine = new InstallRemoveEngine(this.profileResolver, this.slotEngine, this.costEngine, this.eligibilityEngine);
    this.templateEngine = new TemplateEngine(this.profileResolver, this.costEngine, this.restrictionEngine);
  }

  async customizeItem(item, actor, actions) {
    // actions: [{ type: 'strip', area: 'damage' }, { type: 'install', upgradeKey: 'improved_targeting' }, ...]

    for (const action of actions) {
      switch (action.type) {
        case 'size_increase':
          const sizePreview = this.structuralEngine.previewSizeIncrease(item, actor);
          // ... show preview, get mechanics check ...
          await this.structuralEngine.applySizeIncrease(item, actor, mechanicsResult);
          break;

        case 'strip':
          const stripPreview = this.structuralEngine.previewStrip(item, actor, action.area);
          // ... show preview, get mechanics check ...
          await this.structuralEngine.applyStrip(item, actor, action.area, mechanicsResult);
          break;

        case 'install':
          const installPreview = this.installEngine.previewInstall(item, actor, action.upgradeKey);
          // ... show preview, get mechanics check ...
          await this.installEngine.applyInstall(item, actor, action.upgradeKey, mechanicsResult);
          break;

        case 'remove':
          const removePreview = this.installEngine.previewRemove(item, actor, action.instanceId);
          // ... show preview, get mechanics check ...
          await this.installEngine.applyRemove(item, actor, action.instanceId, mechanicsResult);
          break;

        case 'apply_template':
          const tmplPreview = this.templateEngine.previewTemplate(item, action.templateKey);
          // ... show preview ...
          await this.templateEngine.applyTemplate(item, action.templateKey, actor);
          break;
      }

      // After each operation, refresh item state
      item = await item.update({});
    }

    // Final state
    const finalState = this.slotEngine.getFullSlotState(item);
    const finalCost = this.templateEngine.calculateFinalItemCost(item);
    const finalRestriction = this.templateEngine.calculateEffectiveRestriction(item);

    return {
      item,
      slots: finalState.slots,
      cost: finalCost,
      restriction: finalRestriction
    };
  }
}
```

---

## Testing Checklist: Phases B-E

### Phase B: Structural Changes
- [ ] Size increase one-time enforcement
- [ ] Heavy armor size increase blocked
- [ ] Size increase doubles item cost
- [ ] Size increase adds +1 slot
- [ ] Mechanics DC scales correctly
- [ ] Strip cost = 50% base cost
- [ ] Strip adds +1 slot per area
- [ ] Cannot strip already-stripped area
- [ ] Exotic weapon design strip blocked
- [ ] Failure mechanics check prevents apply
- [ ] Retry cost = 50% of operation cost

### Phase C: Catalog & Eligibility
- [ ] Upgrade definitions load correctly
- [ ] Category matching works
- [ ] Slot availability blocking works
- [ ] Stripped area lockout works
- [ ] One-per-item constraint works
- [ ] Incompatibility detection works
- [ ] Eligibility report generated correctly

### Phase D: Install/Remove
- [ ] Install creates instance with unique ID
- [ ] Install deducts credits
- [ ] Install checks eligibility
- [ ] Remove costs 50% of install
- [ ] Remove refunds credits
- [ ] Remove restores slots
- [ ] Failure mechanics check prevents apply
- [ ] Retry cost calculated correctly

### Phase E: Templates
- [ ] Template definitions load correctly
- [ ] Stacking rule prevention works
- [ ] Conflict detection works
- [ ] Cost sequencing applies in order
- [ ] Additive cost modifier works
- [ ] Multiplicative cost modifier works
- [ ] Restriction impact calculated
- [ ] Rarity flag applied

---

## Summary

**Files Created**:
- structural-change-engine.js (300 lines)
- upgrade-catalog.js (150 lines)
- upgrade-eligibility-engine.js (200 lines)
- install-remove-engine.js (350 lines)
- template-engine.js (350 lines)

**Total New Code**: ~1350 lines across Phases B-E

**Key Principles**:
- Preview before apply (all operations)
- Structured results (no silent failures)
- Defensive against malformed data
- Real RAW rules enforced
- Mechanics checks required (fail gracefully)
- Cost calculations exact (no floating point surprises)
- Restrictions and templates compose correctly

**Ready for Phase F**: Workbench UI refactor to integrate these engines.
