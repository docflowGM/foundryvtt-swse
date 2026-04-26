# Phase A: Canonical Customization State + Engine Foundation

**Status**: IMPLEMENTED - Backend foundation ready for UI integration

**What Phase A Is**:
- Canonical flag state model at `item.flags["foundryvtt-swse"].customization`
- Normalized item profile resolver (ItemProfileResolver)
- Upgrade slot engine (UpgradeSlotEngine)
- Cost semantics engine (CustomizationCostEngine)
- Restriction model framework (RestrictionPropagator)

**What Phase A Is NOT**:
- Full install/remove/strip operations (Phase B/D)
- Template behavior (Phase E)
- Restriction propagation logic (Phase F)
- Workbench UI updates (Phase F integrates with UI)
- Category migration (deferred)

---

## Canonical Customization State

All customization data lives in one flag structure:

```javascript
item.flags["foundryvtt-swse"].customization = {
  structural: {
    sizeIncreaseApplied: false,        // One-time only
    strippedAreas: []                  // e.g., ["damage", "range"]
  },

  installedUpgrades: [
    {
      instanceId: "upg_inst_001",
      upgradeKey: "improved_targeting",
      slotCost: 1,                     // Can be 0 for free upgrades
      operationCost: 500,              // What player paid to install
      installedAt: 1234567890,
      installSource: "commercial"
    }
  ],

  appliedTemplates: [
    {
      instanceId: "tmpl_inst_001",
      templateKey: "rare_modification",
      source: "restricted",
      stackOrder: 0
    }
  ],

  overrides: {
    stockSlotOverride: null            // null = use resolver default
  },

  operationLog: [
    {
      id: "op_001",
      type: "install" | "strip" | "size_increase",
      timestamp: 1234567890,
      appliedBy: "actor-uuid",
      details: {}
    }
  ]
}
```

**Key Rules**:
- Source-of-truth state only (no stored totals like totalAvailable, usedSlots, freeSlots)
- installedUpgrades is instance-based array (allows same upgrade multiple times)
- Templates are distinct from upgrades
- operationLog is audit-only, never authoritative

---

## Engine Architecture

### ItemProfileResolver

Normalizes items to consistent shape. Every customizable item → standard profile.

```javascript
import { ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const profile = resolver.getNormalizedProfile(item);

// Returns:
// {
//   itemId, itemName, category,
//   weaponSubtype, weaponSize, armorWeightClass, objectSize,
//   traits: { hasDamage, hasRange, hasDesign, hasStunSetting, hasAutofire, isExotic, isPoweredArmor },
//   baseCost,
//   customizable,
//   stockSlotOverride,
//   existingState
// }
```

**Resolver Guarantees**:
- All enums normalized to lowercase
- Defensive defaults for missing data
- BlasterAdapter compat: recognizes `blaster` type and resolves to `blaster` category
- Bodysuit compat: resolves to `armor` category
- Lightsabers recognized but `customizable: false` in Phase A
- Droids recognized but `customizable: false` in Phase A

### UpgradeSlotEngine

Derives slot accounting from canonical state using RAW rules.

```javascript
import { UpgradeSlotEngine, ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const slotEngine = new UpgradeSlotEngine(resolver);

const slots = slotEngine.getSlotAccounting(item);
// Returns: { stockBase, bonusFromSizeIncrease, bonusFromStripping, totalAvailable, usedSlots, freeSlots, isOverflowing, isCorruptState }

const canApplySizeIncrease = slotEngine.canApplySizeIncrease(item);
// Returns: { allowed, reason? }

const canStripArea = slotEngine.canStripArea(item, 'damage');
// Returns: { allowed, reason? }

const strippableAreas = slotEngine.getStrippableAreas(item);
// Returns: ['damage', 'range', 'design', ...]

const fullState = slotEngine.getFullSlotState(item);
// One-shot query: { profile, slots, strippable, sizeIncreaseAllowed, customState, error }
```

**Slot Rules Enforced**:
- Stock slots: 1 default, 2 powered armor, explicit override
- Size increase: one-time, +1 max, heavy armor blocked, lightsabers/droids rejected
- Stripping: +1 per area
- Used slots: sum of installedUpgrades[].slotCost with `?? 0`
- Overflow detection: freeSlots < 0

### CustomizationCostEngine

Separates operation costs from item valuation.

```javascript
import { CustomizationCostEngine, ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const resolver = new ItemProfileResolver();
const costEngine = new CustomizationCostEngine(resolver);

// OPERATION COSTS (what player pays now)
const sizeIncreaseOpCost = costEngine.getSizeIncreaseOperationCost(item);  // baseCost
const stripOpCost = costEngine.getStripOperationCost(item, 'damage');      // 50% of baseCost
const removalCost = costEngine.getRemovalCost(upgradeInstance);            // 50% of install cost
const retryCost = costEngine.getRetryOperationCost(originalCost);          // 50% of original

// ITEM VALUATION (resulting item worth)
const sizeIncreasedValue = costEngine.getSizeIncreasedItemValue(item);     // baseCost * 2
const valueAfterUpgrades = costEngine.getEffectiveItemValueAfterUpgrades(item);
const totalValue = costEngine.getTotalEffectiveItemValue(item);

// VALIDATION
const validation = costEngine.validateCost(amount);
// Returns: { valid, error?, value }
```

**Cost Rules Enforced**:
- No NaN, no negative, no infinity
- Size increase operation cost ≠ resulting item value
- All money math hardened against edge cases
- Phase E will add template sequencing

### RestrictionPropagator

Defines canonical restriction hierarchy.

```javascript
import { RestrictionPropagator, RESTRICTION_HIERARCHY, RESTRICTION_LEVELS } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

const propagator = new RestrictionPropagator();

// Canonical levels
RESTRICTION_LEVELS  // ['common', 'licensed', 'restricted', 'military', 'illegal']
RESTRICTION_HIERARCHY  // { COMMON: 0, LICENSED: 1, RESTRICTED: 2, MILITARY: 3, ILLEGAL: 4 }

// Phase A placeholder
const restriction = propagator.getEffectiveRestriction(item);  // Returns base restriction

// Helper methods (used by Phase F)
const most = propagator.getMostRestrictive('common', 'restricted', 'military');  // 'military'
const isMore = propagator.isMoreRestrictive('restricted', 'common');  // true
const isValid = propagator.isValidRestriction('licensed');  // true
```

**Restriction Rules**:
- Rare is tracked separately (not part of legality hierarchy)
- Phase F will propagate: base + upgrades + templates → most restrictive
- Phase A just reserves structure

---

## Integration: From Phase A to UI

The workbench (or any UI) should follow this pattern:

```javascript
import { ItemProfileResolver, UpgradeSlotEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/index.js";

// 1. Create engines once
const profileResolver = new ItemProfileResolver();
const slotEngine = new UpgradeSlotEngine(profileResolver);

// 2. Query full state before rendering
const state = slotEngine.getFullSlotState(item);

// 3. Display from state, never calculate:
// - use state.slots.freeSlots, not computed locally
// - use state.strippable, not computed locally
// - use state.sizeIncreaseAllowed, not computed locally
// - use state.error to detect corruption

// 4. For preview calculations:
const costEngine = new CustomizationCostEngine(profileResolver);
const previewCost = costEngine.getTotalEffectiveItemValue(item);  // Don't trust UI math

// 5. Before apply, ask engine:
const canStrip = slotEngine.canStripArea(item, 'damage');
if (!canStrip.allowed) {
  ui.notifications.warn(canStrip.reason);
  return;
}

// 6. After mutation, requery state:
const newState = slotEngine.getFullSlotState(item);
```

---

## What Still Needs Implementation

### Phase B: Structural Change Engine
- Implements size increase operation
- Implements strip operation
- Enforces DC/time requirements
- Handles failure states
- Retries with 50% cost

### Phase C: Upgrade Catalog + Eligibility Engine
- Real upgrade data definitions
- Category-aware eligibility rules
- Locked-out areas (cannot upgrade damage if already stripped)

### Phase D: Install/Remove Operation Engine
- Full install operation with cost, DC, time
- Full remove operation with cost, DC, time
- Failure recovery handling

### Phase E: Template Engine
- Template definitions
- Stack behavior (mostly non-stacking)
- Cost sequencing

### Phase F: Restriction Propagation + Workbench UI Integration
- Actual restriction derivation logic
- Workbench UI updated to use engines
- Preview calculations from engines, not UI
- Apply operations through engines, not raw mutations

---

## Testing Checklist for Phase A

Before moving to Phase B, verify:

- [ ] ItemProfileResolver normalizes all category combinations
- [ ] UpgradeSlotEngine.getSlotAccounting derives correct totals (no overflow, no underflow)
- [ ] CustomizationCostEngine.validateCost catches NaN/negative/infinity
- [ ] RestrictionPropagator.getMostRestrictive picks the right level
- [ ] All engines handle missing/malformed flags safely
- [ ] All engines return structured results, never throw
- [ ] Size increase one-time enforcement works
- [ ] Heavy armor size increase blocked
- [ ] Lightsaber/droid category rejection works
- [ ] 0-slot upgrades calculate correctly
- [ ] Powered armor gets 2 base slots
- [ ] Exotic weapons cannot strip design
- [ ] Blasters can strip (damage, range, stun, autofire)

---

## Code Quality Notes

- All engines are pure: take item, return derived value
- All operations are defensive: assume data is malformed
- All queries return structured objects with error fields
- No side effects at engine level
- No DOM coupling
- No template/app coupling
- All math is exact (no floating point surprises)
- All money calculations hardened

---

## Files Created

- `scripts/engine/customization/item-profile-resolver.js` (200+ lines)
- `scripts/engine/customization/upgrade-slot-engine.js` (250+ lines)
- `scripts/engine/customization/customization-cost-engine.js` (200+ lines)
- `scripts/engine/customization/restriction-model.js` (150+ lines)
- `scripts/engine/customization/index.js` (exports)
- `scripts/engine/customization/PHASE-A-GUIDE.md` (this file)

**Total New Code**: ~1000 lines of backend logic, fully documented

---

## Next: Integration Path

Phase A is complete as a standalone backend. To integrate with the existing workbench:

1. Import engines in workbench constructor
2. Replace UI-level slot calculations with `slotEngine.getSlotAccounting()`
3. Replace UI-level cost calculations with `costEngine.getTotalEffectiveItemValue()`
4. Replace UI-level validation with engine queries (canApplySizeIncrease, canStripArea, etc.)
5. Before apply, validate through engines
6. After apply, requery engines (do not trust cached state)

This separation ensures the UI becomes a consumer of engine authority, not a rule engine itself.
