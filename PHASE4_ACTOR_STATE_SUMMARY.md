# Phase 4: Actor State & Integration Summary

## Actor Schema Fields Consumed (Phase 3 → Phase 4)

### System Fields (Durable Gameplay State)
- **`system.species`** (string) – Canonical species name; authority for sheet identity
- **`system.speciesMovement`** (object) – Structured multi-mode movement
  - `walk` (number) – Base walk speed (required)
  - `swim` (number | null) – Swim speed
  - `fly` (number | null) – Fly speed
  - `hover` (number | null) – Hover speed
  - `glide` (number | null) – Glide speed
  - `burrow` (number | null) – Burrow/tunnel speed
  - `climb` (number | null) – Climb speed
- **`system.speed`** (number) – Alias to `speciesMovement.walk` for backward compatibility

### Flag Fields (Metadata & Bookkeeping)

**namespace: `flags.swse`**

- **`speciesUuid`** (string) – Compendium UUID for species; used for tracing/re-resolution
- **`speciesSource`** (string) – Content source for audit trail
- **`speciesFeatsRequired`** (number) – Entitlements reference (feats granted by species)
- **`speciesBonusSpeed`** (number) – Movement bonus from entitlements
- **`speciesLanguages`** (array of strings) – Languages granted by species
- **`speciesTraitIds`** (array of strings) – Trait IDs for prerequisite visibility
- **`speciesTraits`** (object) – Trait metadata for visibility
  - Key: trait name (string)
  - Value: `{classification, id, type}` object
- **`speciesPassiveBonuses`** (object) – Passive bonus registry
  - Key: target (skill name, "defense.reflex", etc.)
  - Value: array of `{value: number, type: string, trait: string, conditions: array}`
- **`speciesRerolls`** (array) – Reroll rights registration
  - Each: `{scope, target, frequency, outcome, sourceTraitName, sourceTraitId}`

---

## Weapon Item Flags (Natural Weapons Identification)

**namespace: `flags.swse` (on type='weapon' items)**

- **`isNaturalWeapon`** (boolean, true) – Marks this item as a natural weapon
- **`speciesGranted`** (boolean, true) – Indicates this item is species-managed
- **`sourceSpecies`** (string) – Species name that granted this weapon
- **`alwaysArmed`** (boolean, true) – Always counts as armed (doesn't go away if disarmed)
- **`autoEquipped`** (boolean, true) – Automatically included in equipped weapons for attacks

---

## Phase 4 Integration Points

### Derived Calculator (derived-calculator.js)
**Reads:** `flags.swse.speciesPassiveBonuses`
**Function:** `DerivedCalculator.computeAll()` (lines 301-315)
**Purpose:** Extract skill bonuses from Phase 3 canonical structure and apply to skill totals
**Data Flow:**
```
flags.swse.speciesPassiveBonuses {target: [{value, type, trait}]}
→ Extract by skill key
→ Sum bonus values
→ Add to skill total (line 340)
```

### Character Actor (character-actor.js)
**Reads:** `flags.swse.autoEquipped`
**Function:** `mirrorAttacks()` (lines 307-309)
**Purpose:** Include naturally-equipped items in attack list
**Data Flow:**
```
actor.items[weapon]
→ Check: system.equipped === true OR flags.swse.autoEquipped === true
→ Include in derived.attacks.list
```

### Sheet Context Builders (sheets/v2/character-sheet/context.js)

#### buildIdentityViewModel()
**Reads:** `system.species`, `flags.swse.speciesLanguages`, `flags.swse.speciesTraits`, `system.speciesMovement`
**Purpose:** Build complete species identity view model for sheet
**Returns:**
```javascript
{
  species: string,
  speciesLanguages: string[],
  speciesTraits: object,
  speciesMovement: object,
  // ... other identity fields
}
```

#### buildMovementViewModel()
**Reads:** `system.speciesMovement`, `system.speed`
**Purpose:** Build multi-movement mode display
**Returns:**
```javascript
{
  walk: number,
  swim: number | null,
  fly: number | null,
  hover: number | null,
  glide: number | null,
  burrow: number | null,
  climb: number | null,
  primary: number,
  modes: [{type, speed, label}],
  hasMultipleModes: boolean
}
```

#### getSpeciesPassiveBonus(actor, target)
**Reads:** `flags.swse.speciesPassiveBonuses`
**Purpose:** Helper for calculators to get bonus for specific target
**Returns:** number (total bonus for that target)

#### buildNaturalWeaponsViewModel()
**Reads:** Items with `type='weapon'` and `flags.swse.isNaturalWeapon === true`
**Purpose:** Filter and build natural weapons display
**Returns:** Array of natural weapon view models with species identification

### Species Reroll Handler (scripts/species/species-reroll-handler.js)
**Reads:** `flags.swse.speciesRerolls`
**Functions:**
- `getApplicableRerolls(actor, skillKey)` – Filter by scope and target
- `getAvailableRerolls(actor, rollType)` – Filter by roll type
- `offerReroll(actor, skillKey, originalRoll, options)` – Present reroll dialog

**Data Structure:**
```javascript
// flags.swse.speciesRerolls = [
{
  scope: 'skill' | 'attack' | 'any',
  target: 'piloting' | 'initiative' | 'any',
  frequency: 'once_per_day' | 'once_per_encounter' | 'unlimited',
  outcome: 'keep_better' | 'must_accept',
  sourceTraitName: string,
  sourceTraitId: string
}
// ]
```

---

## Natural Weapon Item Structure (Created by Phase 3)

```javascript
{
  type: 'weapon',
  name: 'Claws', // Species-appropriate name
  system: {
    category: 'melee',
    type: 'simple melee weapon',
    damage: {
      formula: '1d6',  // Species-defined
      type: 'slashing' // Species-defined
    },
    attackAbility: 'str',
    properties: {alwaysArmed: true},
    equipped: false  // Not set; use autoEquipped flag instead
  },
  flags: {
    swse: {
      isNaturalWeapon: true,
      speciesGranted: true,
      sourceSpecies: 'Bothan',
      alwaysArmed: true,
      autoEquipped: true  // This flag tells mirrorAttacks to include it
    }
  }
}
```

---

## Canonical Authority Chain

```
Phase 3 Durable Actor State (AUTHORITY)
        ↓
Phase 4 Integration Points
├─ Derived Calculator → Reads speciesPassiveBonuses → Applies skill bonuses
├─ Character Actor → Reads autoEquipped flag → Includes in attacks
├─ Sheet Builders → Read all Phase 3 fields → Build view models
└─ Reroll Handler → Reads speciesRerolls → Offers at runtime
        ↓
Character Sheet Display & Gameplay
```

**No Re-derivation:** Phase 4 does not re-parse species from compendium, old maps, or JSON. All data comes from Phase 3 durable actor state.

---

## Data Consistency Guarantees

✅ **Single Source of Truth:** Phase 3 actor state is sole authority
✅ **No Duplicates:** Natural weapons idempotent via `sourceSpecies` tracking
✅ **No Stacking:** Bonuses read fresh from Phase 3 each calculation
✅ **Backward Compatible:** Legacy fields (`system.race`, `system.speed`) still set
✅ **Reconciliation:** Old species items cleaned up when species changes

---

## Test Validation Points

| Field | Component | Test Case |
|-------|-----------|-----------|
| `system.species` | Sheet Identity | Species name displays correctly |
| `system.speciesMovement` | Movement Display | All movement modes visible |
| `flags.swse.speciesLanguages` | Identity Panel | Languages listed |
| `flags.swse.speciesTraits` | Runtime Visibility | Traits accessible |
| `flags.swse.speciesPassiveBonuses` | Skill Totals | Bonuses applied correctly |
| `flags.swse.speciesRerolls` | Reroll Dialog | Rerolls available |
| `flags.swse.isNaturalWeapon` | Attacks List | Natural weapons appear |
| `flags.swse.autoEquipped` | Equipment | Naturally equipped |
| `flags.swse.sourceSpecies` | Idempotence | No duplicates on recalc |

