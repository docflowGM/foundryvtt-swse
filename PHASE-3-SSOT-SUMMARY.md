# Phase 3: Compendium Normalization & SSOT Hardening

**Status:** Schema Defined & Enforced
**Date:** 2026-02-10

---

## Overview

Store compendiums (weapons, armor, equipment, droids, vehicles) are now the Single Source of Truth (SSOT). Phase 3 establishes the contract between compendiums and engine.

---

## SSOT Contract

### Required for All Store Items

**Identity (Mandatory):**
- `id` - Canonical Foundry document ID
- `_id` - Legacy compatibility ID
- `name` - Display name (NO logic inference)
- `type` - Foundry item/actor type

**Pricing (Mandatory):**
- `system.cost` - Base cost in credits (number, ≥0)

**Classification (Optional but Recommended):**
- `system.availability` - Legality flag (Standard, Licensed, Restricted, Military, Illegal, Rare)

**Display (Mandatory):**
- `img` - Image path

---

## FORBIDDEN PATTERNS

The engine will NOT infer properties from:

❌ **Item Names:**
```javascript
// BAD: Name contains cost info
"Blaster Rifle (500 credits)"

// GOOD: Only display name
"Blaster Rifle"
// Cost from system.cost
```

❌ **Compendium Names or Paths:**
```javascript
// BAD: Item categorization inferred from pack name
// (if in 'weapons' pack → assumes weapon)

// GOOD: Categorization applied by engine
// (item.type checked, then engine categorizer)
```

❌ **Embedded Logic in Metadata:**
```javascript
// BAD: Purchase restrictions in flags
flags.swse.restrictedToMilitary = true

// GOOD: Availability metadata only
system.availability = 'Military'
// (engine enforces policy)
```

❌ **Fallback IDs:**
```javascript
// BAD: ID generated from name
id: `fallback-blaster-rifle-${timestamp}`
// (prevents purchase)

// GOOD: All items have canonical IDs
id: foundryDocumentId  // From Foundry
```

---

## Compendium Packs (Defined in Engine)

All store packs defined in `scripts/engines/store/store-constants.js`:

**Items:**
- `foundryvtt-swse.weapons`
- `foundryvtt-swse.armor`
- `foundryvtt-swse.equipment`

**Actors:**
- `foundryvtt-swse.droids`
- `foundryvtt-swse.vehicles-walkers`
- `foundryvtt-swse.vehicles-speeders`
- `foundryvtt-swse.vehicles-starships`
- `foundryvtt-swse.vehicles-stations`
- `foundryvtt-swse.vehicles` (canonical fallback)

---

## Validation

**Schema Validation** defined in `compendium-schema.js`:

```javascript
import { validateItemSchema } from './compendium-schema.js';

const item = await pack.getDocument(itemId);
const { valid, errors } = validateItemSchema(item);

if (!valid) {
  console.warn('Invalid compendium item:', errors);
}
```

---

## Expected Categories

Engine applies these categories automatically (not in compendium data):

```
Weapons
  ├─ Melee
  ├─ Ranged Weapons
  └─ Grenades/Explosives

Armor
  ├─ Clothing
  ├─ Light Armor
  ├─ Medium Armor
  └─ Heavy Armor

Equipment
  ├─ Survival Gear
  ├─ Technical Equipment
  ├─ Security Equipment
  └─ Tools

Droids
  ├─ Astromech
  ├─ Protocol Droid
  ├─ Medical Droid
  └─ Combat Droid

Vehicles
  ├─ Speeders
  ├─ Walkers
  ├─ Starships
  └─ Stations
```

---

## Future Extensibility

Schema supports (but does NOT require):

**Per-Vendor Pricing:**
```javascript
// NOT in compendium; defined by engine policies
StoreEngine.withVendorPolicies({ markup: 0.15, discount: 0 })
```

**Faction Availability:**
```javascript
// NOT in compendium; defined by engine policies
if (actor.faction === 'Separatists') {
  // Only show military items
}
```

**Dynamic Pricing:**
```javascript
// NOT in compendium; calculated by engine
finalCost = baseCost * markup * condition_multiplier
```

---

## Checklist: SSOT Compliance

When adding new items to store compendiums:

- [ ] `id` exists and is canonical (not generated)
- [ ] `name` is display name only (no cost/legality encoding)
- [ ] `system.cost` is numeric and ≥0
- [ ] `system.availability` is one of: Standard, Licensed, Restricted, Military, Illegal, Rare
- [ ] `img` path is valid and accessible
- [ ] No flags.swse.* cost or purchase logic
- [ ] No embedded conditionals in metadata
- [ ] Compendium path is one of the canonical STORE_PACKS

---

## Status: Phase 3 Complete ✓

Schema defined. Contract established. Compendiums ready for engine consumption.

Next: Phase 4 — UI Refactoring (apps/store → use engine API)
