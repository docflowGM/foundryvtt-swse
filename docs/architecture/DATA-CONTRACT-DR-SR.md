# 🏛 DATA CONTRACT: Damage Reduction & Shield Rating

**Status**: V2 Canonical
**Authority**: Derived Layer (DerivedCalculator)
**Scope**: `system.derived.damageReduction` and `system.derived.shield`

---

## 🛡 SHIELD RATING (SR) — Data Contract

### Location
```
actor.system.derived.shield
```

### Structure
```typescript
{
  current: number,      // Current SR (degrades on hit)
  max: number,          // Max SR (from items)
  source: string,       // "Energy Shield Mk II" or similar
  active: boolean       // Shields active/equipped
}
```

### Example
```javascript
system.derived.shield = {
  current: 15,
  max: 20,
  source: "Energy Shield Mk II (Rating 20)",
  active: true
}
```

### Ownership
- **Computed by**: DerivedCalculator during prepareDerivedData()
- **Inputs**:
  - Equipped armor items with SR (type = "armor", armorType = "shield")
  - Energy Shield items (future: dedicated item type)
  - ModifierEngine domain: "shieldRating"
- **Rules**:
  - Only highest SR applies (no stacking)
  - SR is a pool (degrades per hit)
  - Current = max until degraded
  - Degradation: -5 per hit where damage > SR

### Usage in Combat
```javascript
// Read during mitigation
const sr = actor.system.derived.shield.current;

// Apply mitigation
const afterSR = Math.max(0, damage - sr);

// On hit exceeding SR
const newSRAfterDegradation = Math.max(0, sr - 5);
```

### Display in Sheet
```hbs
SR {{actor.system.derived.shield.current}} / {{actor.system.derived.shield.max}}
```

### NO Sheet Mutation
- ❌ Sheet must NOT write to `system.derived.shield`
- ✅ Only read for display
- ✅ DerivedCalculator owns all updates

---

## 🔻 DAMAGE REDUCTION (DR) — Data Contract

### Location
```
actor.system.derived.damageReduction
```

### Structure
```typescript
{
  entries: [
    {
      value: number,        // DR amount
      bypass: string[],     // ["Energy", "Lightsaber"] or []
      source: string        // "Talent: Advanced Armor" or "Species Trait"
    }
  ],
  highestValue: number,     // Convenience (for display)
  displayString: string     // Preformatted "20 / Energy, 5"
}
```

### Example
```javascript
system.derived.damageReduction = {
  entries: [
    {
      value: 20,
      bypass: ["Energy"],
      source: "Talent: Advanced Armor"
    },
    {
      value: 5,
      bypass: [],
      source: "Species Trait: Thick Hide"
    }
  ],
  highestValue: 20,
  displayString: "20 / Energy, 5"
}
```

### Ownership
- **Computed by**: DerivedCalculator during prepareDerivedData()
- **Inputs**:
  - ModifierEngine domain: "damageReduction"
  - Talent effects
  - Species traits
  - Item bonuses
- **Rules**:
  - All sources collected (no stacking)
  - Highest value applied at runtime
  - Bypass rules recorded per source
  - displayString precomputed (for performance)

### Bypass Rules
```javascript
// Example: Lightsabers bypass energy DR
{
  value: 20,
  bypass: ["Energy", "Lightsaber"],  // These damage types ignore this DR
  source: "Advanced Armor"
}

// Read during mitigation:
const canApply = !bypass.includes(weapon.system.damageType);
```

### Usage in Combat (Optimal DR Selection)
```javascript
// Called inside DamageMitigationManager
const entries = actor.system.derived.damageReduction.entries;

// Filter valid entries (bypass rules respected)
const valid = entries.filter(entry => {
  // Lightsabers bypass all DR
  if (weapon.system.weaponType === 'lightsaber') return false;

  // Damage type bypasses this DR?
  return !entry.bypass.includes(damageType);
});

// Optimal DR: highest valid value
const optimalDR = Math.max(...valid.map(e => e.value), 0);
```

### Display in Sheet
```hbs
{{#if actor.system.derived.damageReduction.entries.length}}
  DR {{actor.system.derived.damageReduction.highestValue}}
  {{#each actor.system.derived.damageReduction.entries}}
    {{this.value}} / {{join this.bypass ", "}}
  {{/each}}
{{/if}}
```

### NO Sheet Mutation
- ❌ Sheet must NOT modify `entries` array
- ✅ Only read for display
- ✅ DerivedCalculator owns all updates
- ✅ Bypass logic applies in DamageMitigationManager, not sheet

---

## 🔄 Integration: prepareDerivedData

DerivedCalculator calls both during `actor.prepareDerivedData()`:

```javascript
// In DerivedCalculator.computeAll()

// Compute SR
const shield = await computeShieldRating(actor);
updates['system.derived.shield'] = shield;

// Compute DR
const damageReduction = await computeDamageReduction(actor);
updates['system.derived.damageReduction'] = damageReduction;

// Apply all updates
await actor.update(updates);
```

---

## 🔐 Architectural Constraints

### What Sheet CAN Do
- ✅ **Read** `system.derived.shield` and `system.derived.damageReduction`
- ✅ **Display** values in summary blocks
- ✅ **Format** with CSS
- ✅ **Call** `percentage()` helper for visual bars

### What Sheet CANNOT Do
- ❌ **Mutate** SR current/max
- ❌ **Mutate** DR entries
- ❌ **Compute** optimal DR
- ❌ **Apply** bypass rules
- ❌ **Read** settings
- ❌ **Call** game rules

### What Engine MUST Do
- ✅ **Compute** derived values
- ✅ **Enforce** stacking rules
- ✅ **Apply** bypass logic (in DamageMitigationManager)
- ✅ **Format** displayString
- ✅ **Update** at prepareDerivedData time

---

## 📊 Derivation Pipeline

```
ModifierEngine (collect all sources)
       ↓
DerivedCalculator.computeShieldRating()
       ↓
system.derived.shield = { current, max, source, active }
       ↓
Sheet reads (display only)
       ↓
DamageMitigationManager reads at runtime
       ↓
ShieldMitigationResolver applies

---

ModifierEngine (collect all sources)
       ↓
DerivedCalculator.computeDamageReduction()
       ↓
system.derived.damageReduction = { entries, highestValue, displayString }
       ↓
Sheet reads (display only)
       ↓
DamageMitigationManager reads at runtime
       ↓
DamageReductionResolver applies bypass rules + selects optimal
```

---

## 🧪 Example: Character with Multiple DR Sources

```javascript
// Character has:
// 1. Species trait: 5 DR (no bypass)
// 2. Talent (Advanced Armor): 20 DR (Energy bypass)
// 3. Active Effect: +3 DR modifier

// DerivedCalculator computes:
actor.system.derived.damageReduction = {
  entries: [
    {
      value: 23,  // 20 + 3 from effects
      bypass: ["Energy"],
      source: "Talent: Advanced Armor + Active Effects"
    },
    {
      value: 5,
      bypass: [],
      source: "Species: Thick Hide"
    }
  ],
  highestValue: 23,
  displayString: "23 / Energy, 5"
}

// Sheet displays:
// "DR 23"
// "  23 / Energy"
// "  5"

// In combat, weapon hits with energy damage:
// Lightsaber (Energy): DR 23 bypassed (lightsabers bypass ALL)
// Blaster (Energy): DR 23 bypassed (Energy bypass applies)
// Thermal (Thermal): DR 23 applies, then 5 applies? NO! Highest only.
//   → Only DR 23 applies (if no thermal-specific bypass)
```

---

## 🔗 References

- [DamageMitigationManager](../../scripts/engines/combat/damage-mitigation-manager.js)
- [ShieldMitigationResolver](../../scripts/engines/combat/resolvers/shield-mitigation-resolver.js)
- [DamageReductionResolver](../../scripts/engines/combat/resolvers/damage-reduction-resolver.js)
- [DerivedCalculator](../../scripts/actors/derived/derived-calculator.js)

---

## ✍️ Sign-Off

**Authority**: Derived Layer (Engine)
**Read-Only by**: Sheet, UI, Display
**Mutable by**: DerivedCalculator only
**Runtime use**: DamageMitigationManager
**Compliance**: V2 Canonical
