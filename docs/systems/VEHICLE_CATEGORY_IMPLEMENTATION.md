# Vehicle Category Implementation

## Overview

This document describes the vehicle category system implemented in SWSE FoundryVTT, which provides deterministic, canonical vehicle categorization across the entire compendium.

## Components

### 1. Audit Data
- **VEHICLE_AUDIT_MAPPING.json** — Canonical mapping of all 357 vehicles to categories
- **VEHICLE_AUDIT_SUMMARY.csv** — Human-readable vehicle details with confidence scores
- **VEHICLE_AUDIT_RESULTS.json** — Audit metadata and statistics

### 2. Vehicle Precreate Hooks
**File:** `scripts/actors/vehicle/vehicle-precreate-hooks.js`

Automatically assigns canonical category to vehicles when created:
- Loads canonical mapping from `VEHICLE_AUDIT_MAPPING.json`
- Watches for vehicle creation events (preCreateItem)
- Looks up vehicle name in canonical mapping
- Auto-fills `system.category` and `system.domain` fields
- Logs review-required vehicles for manual attention

**Registration:** Hooks registered in `scripts/core/init.js`

### 3. Vehicle Category Registry
**File:** `scripts/data/vehicle-category-registry.js`

Provides structured access to canonical categories and utilities:

```javascript
import {
  VEHICLE_CATEGORIES,
  getCategoriesByDomain,
  getCategoryMetadata,
  getCategoryDropdownOptions,
  isCanonicalCategory,
  parseVehicleCategory
} from '../data/vehicle-category-registry.js';

// Get all starship categories
const starships = getCategoriesByDomain('starship');

// Get dropdown options for form
const options = getCategoryDropdownOptions('planetary');

// Validate category
if (isCanonicalCategory('starfighter')) {
  console.log('Valid category');
}

// Parse user input
const category = parseVehicleCategory('Star Fighter');
```

## Canonical Categories

### Planetary Domain
- **mount** — Creatures/beasts for transportation
- **speeder** — Hovering ground-effect vehicles
- **tracked** — Tank/tracked vehicles
- **walker** — Bipedal/multi-legged walkers (AT-ST, AT-AT, etc)
- **wheeled** — Wheeled ground vehicles
- **emplacement** — Stationary defense platforms
- **airspeeder** — Atmospheric aircraft

### Starship Domain
- **starfighter** — Small combat spacecraft
- **transport** — Cargo, passenger, shuttle spacecraft
- **capitalShip** — Large cruisers, destroyers, flagships
- **spaceStation** — Orbital stations, space platforms

## Usage Examples

### In Vehicle Forms/Sheets

```javascript
import { getCategoryDropdownOptions } from 'path/to/vehicle-category-registry.js';

// Populate select field
const options = getCategoryDropdownOptions();
formData.categoryOptions = options;
```

### In PreCreate Hooks

```javascript
import { isCanonicalCategory } from 'path/to/vehicle-category-registry.js';

if (isCanonicalCategory(document.system.category)) {
  // Allow creation
} else {
  // Warn user
  ui.notifications.warn('Invalid vehicle category');
}
```

### Domain-Based Filtering

```javascript
import { getCategoryDomain } from 'path/to/vehicle-category-registry.js';

const domain = getCategoryDomain('starfighter'); // 'starship'

// Show/hide tabs based on domain
if (domain === 'starship') {
  showStarshipTab();
} else {
  showPlanetaryTab();
}
```

## Audit Results Summary

| Metric | Value |
|--------|-------|
| Total Vehicles Audited | 357 |
| Successfully Mapped | 209 (59%) |
| Requires Manual Review | 148 (41%) |

### Category Distribution
- **Starfighter:** 64 vehicles
- **Transport:** 59 vehicles
- **Capital Ship:** 37 vehicles
- **Speeder:** 34 vehicles
- **Space Station:** 5 vehicles
- **Walker:** 4 vehicles
- **Tracked:** 2 vehicles
- **REVIEW_REQUIRED:** 148 vehicles

### Notes on REVIEW_REQUIRED Entries
Most vehicles requiring manual review are:
1. Generic "Vehicle" type entries without descriptions
2. Named ships (Millennium Falcon, Ebon Hawk) needing lore context
3. Gunship variants (ambiguous between transport/airspeeder)

These should be manually reviewed and updated in the compendium, then added to the canonical mapping.

## Future Enhancements

### Pending Implementation
1. ✅ Precreate auto-fill hook
2. ✅ Category registry module
3. ⏳ Category-based sheet tab visibility
4. ⏳ Dropdown selector for vehicle forms
5. ⏳ Category-based filtering in compendium
6. ⏳ Migration script for existing vehicles

### Planned Features
- Category-driven vehicle data inheritance (e.g., speeders inherit hover mechanics)
- Category-based NPC crew templates
- Category-specific combat modifiers
- Category validation in migrations

## Testing

### Manual Test Checklist
- [ ] Create a vehicle from compendium → category auto-fills
- [ ] Create transport vehicle → domain = 'starship'
- [ ] Create speeder → domain = 'planetary'
- [ ] Update review-required vehicle → log warning
- [ ] Dropdowns show all canonical categories

## Files Changed
- `scripts/actors/vehicle/vehicle-precreate-hooks.js` (NEW)
- `scripts/data/vehicle-category-registry.js` (NEW)
- `scripts/core/init.js` (MODIFIED - hook registration)
- `VEHICLE_AUDIT_MAPPING.json` (NEW)
- `VEHICLE_AUDIT_SUMMARY.csv` (NEW)
- `VEHICLE_AUDIT_RESULTS.json` (NEW)
- `VEHICLE_AUDIT_PROMPT.md` (NEW)
