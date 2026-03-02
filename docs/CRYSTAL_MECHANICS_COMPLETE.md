# ⚡ Complete Crystal Mechanics System

## Overview

A three-phase, architecture-safe implementation of lightsaber crystal mechanics for Star Wars Saga Edition (SWSE) on Foundry VTT.

**Status**: ✅ **COMPLETE AND PRODUCTION READY**

---

## Architecture Principles

### Core Tenets

1. **Zero Engine Contamination** — No changes to core ModifierEngine, RollEngine, or ActorEngine
2. **Data-Driven** — All logic flows from crystal schema, not hardcoded names
3. **Reversible** — All effects dynamic; no permanent state modifications
4. **Declarative** — Triggers and effects defined in crystal data
5. **Composable** — Multiple crystals stack naturally
6. **Testable** — Each phase has isolated test suite

### Layering

```
Combat/Healing Roll
        ↓
   [Roll Evaluation]
        ↓
Phase 1: Modifier Gathering (flat bonuses, damage override)
Phase 2: Conditional Evaluation (crits, shields, DR)
Phase 3: Hook-Based Effects (unstable, Force die, alignment, healing)
        ↓
   [Roll Applies]
```

---

## Phase 1: Safe, Data-Driven Modifiers

**Status**: ✅ Implemented in `WeaponsEngine.getWeaponModifiers()`

### Type A — Standard Modifiers

Crystals define an array of modifiers with `domain`, `value`, and `bonusType`.

```javascript
"modifiers": [
  {
    "domain": "attack",
    "value": 1,
    "bonusType": "force"
  }
]
```

**Supported Domains**:
- `attack` → `attack.bonus`
- `damage` → `damage.melee`
- `defense` → `defense.ref`
- `skill` → `skill.general`
- `force` → `force.bonus`

**Supported Bonus Types**:
- `force` → ModifierType.FORCE
- `enhancement` → ModifierType.ENHANCEMENT
- `untyped` → ModifierType.UNTYPED
- `equipment` → ModifierType.EQUIPMENT

**Priority**: 55 (crystal tier, above most bonuses)

**Examples**:

| Crystal | Domain | Value | Type | Effect |
|---------|--------|-------|------|--------|
| Ilum | attack | 1 | force | +1 Force attack |
| Synthetic | attack | 1 | untyped | +1 attack |
| Sigil | damage | 2 | force | +2 Force damage |

### Type B — Damage Type Override

Crystals specify `damageOverride` field, applied in `getBaseDamage()`.

```javascript
"lightsaber": {
  "damageOverride": "fire"  // changes energy → fire
}
```

**Supported Overrides**:
- `fire` (Barab Ingot)
- `ion` (Firkraan)
- `stun` (Bondar)
- `sonic` (Dragite)
- Any custom damage type

**Note**: Applied during damage calculation, not as modifier.

---

## Phase 2: Context-Driven Conditional Effects

**Status**: ✅ Implemented in `WeaponsEngine.evaluateConditionalCrystalEffects()`

### Triggering Mechanism

Crystals define `damageModifiers` or `conditionalEffects` arrays.

```javascript
{
  "trigger": "critical",
  "effect": {
    "type": "extraDice",
    "value": "1d8"
  }
}
```

### Supported Triggers

| Trigger | Variants | Checks |
|---------|----------|--------|
| `critical` | `isCritical`, `crit` | `context.isCritical === true` |
| `targetHasShield` | `vs shield`, `vsShield` | `context.targetHasShield === true` |
| `targetHasDR` | `vs DR`, `vs damage reduction` | `context.targetHasDR === true` |
| `targetIsArmored` | `vs armor`, `vsarmor` | `context.targetIsArmored === true` |
| `always` | `unconditional`, `true` | Always applies |

**Trigger Normalization**:
- Case-insensitive
- Whitespace-trimmed
- Underscore/space interchangeable

### Supported Effects

| Type | Field | Example | Result |
|------|-------|---------|--------|
| `extraDice` | `"1d8"` | Critical hit | Add 1d8 to damage |
| `bonusDamage` | `2` (number) | vs Armor | Add 2 flat damage |

### Phase 2 Context Object

Passed to evaluation:

```javascript
const context = {
  isCritical: boolean,
  targetHasShield: boolean,
  targetHasDR: boolean,
  targetIsArmored: boolean
};
```

### Return Value

```javascript
{
  extraDice: ["1d8", "1d6"],          // All matching dice
  flatBonus: 3,                        // All stacking bonuses
  appliedEffects: [                    // For logging
    { source: "Opila", type: "extraDice", value: "1d8" }
  ]
}
```

### Examples

**Opila Crystal** (Extra die on crit):
```javascript
"damageModifiers": [{
  "trigger": "critical",
  "effect": { "type": "extraDice", "value": "1d8" }
}]
```

**Phond Crystal** (Extra die vs shields):
```javascript
"conditionalEffects": [{
  "trigger": "targetHasShield",
  "effect": { "type": "extraDice", "value": "1d8" }
}]
```

**Corusca Gem** (Extra die vs DR):
```javascript
"conditionalEffects": [{
  "trigger": "targetHasDR",
  "effect": { "type": "extraDice", "value": "1d8" }
}]
```

---

## Phase 3: Advanced Hook-Based Mechanics

**Status**: ✅ Implemented in `Phase3CrystalSystem`

### 1. Unstable Crystal Deactivation

**Hook**: `evaluateAttackRoll`

**Schema**:
```javascript
"specialFlags": {
  "unstable": true
}
```

**Behavior**:
- Roll Nat 1 (before modifiers) → Weapon deactivates
- Weapon sets `equippable.equipped = false`
- Weapon remains in inventory (not destroyed)
- Player can re-equip normally
- Non-Nat rolls: No effect

**Example**: Unstable Barab Ingot

### 2. Force Point Die Step Increase

**Hook**: `evaluateForcePointRoll`

**Schema**:
```javascript
"forceInteraction": {
  "forcePointDieStepIncrease": 1
}
```

**Behavior**:
- Only activates when Force Point spent during attack
- Die step increases: d20 → d24, d8 → d10, etc.
- Modifies roll formula (not permanent)
- Stacks with multiple crystals
- Non-Force attacks: No effect

**Die Step Progression**:
- d4 → d6 → d8 → d10 → d12 → d20 → d24 → d30

**Example**: Mantle Crystal (+1 Force die)

### 3. Alignment Resonance

**Method**: `Phase3CrystalSystem.evaluateAlignmentResonance()`

**Schema**:
```javascript
"specialFlags": {
  "reflectAlignment": true
}
```

**Behavior**:
- Gets actor's DSP alignment (light/dark/neutral)
- Light-side wielder: +1 attack bonus
- Dark-side wielder: +1 damage bonus
- Neutral: No bonus
- Dynamic (updates with alignment shift)

**Implementation**:
```javascript
if (alignment === "light") {
  result.attackBonus += 1;
} else if (alignment === "dark") {
  result.damageBonus += 1;
}
```

**Example**: Enlightenment Crystal (alignment-reactive)

### 4. Healing Amplification

**Hook**: `evaluateHealingRoll`

**Schema**:
```javascript
"conditionalEffects": [{
  "trigger": "healing",
  "effect": {
    "type": "bonus",
    "value": 2
  }
}]
```

**Behavior**:
- Only triggers on healing rolls
- Bonus applied post-roll, pre-healing
- Multiple crystals stack
- Attack/damage rolls: No effect

**Example**: Ankarres Sapphire (+2 healing)

---

## Complete Data Schema

### Full Crystal Definition

```javascript
{
  "id": "example-crystal",
  "name": "Example Crystal",
  "type": "weaponUpgrade",
  "system": {
    "lightsaber": {
      "category": "crystal",
      "compatibleChassis": ["*"],  // or ["standard", "short", ...]
      "cost": 1000,
      "rarity": "rare",

      // PHASE 1: Modifiers & Damage Override
      "modifiers": [
        {
          "domain": "attack",
          "value": 1,
          "bonusType": "force"
        }
      ],
      "damageOverride": "fire",

      // PHASE 2: Conditional Effects
      "damageModifiers": [
        {
          "trigger": "critical",
          "effect": {
            "type": "extraDice",
            "value": "1d8"
          }
        }
      ],
      "conditionalEffects": [
        {
          "trigger": "targetHasShield",
          "effect": {
            "type": "extraDice",
            "value": "1d6"
          }
        }
      ],

      // PHASE 3: Advanced Mechanics
      "specialFlags": {
        "unstable": false,
        "reflectAlignment": false
      },
      "forceInteraction": {
        "forcePointDieStepIncrease": 0
      }
    }
  }
}
```

---

## Complete Feature Matrix

| Feature | Phase | Method | Trigger | Stacks |
|---------|-------|--------|---------|--------|
| Flat attack/damage bonus | 1 | Modifier | Equipped | ✅ Yes |
| Damage type override | 1 | getBaseDamage() | Equipped | ❌ First only |
| Extra dice on crit | 2 | Conditional eval | Critical hit | ✅ Yes |
| Extra dice vs shields | 2 | Conditional eval | Target shield | ✅ Yes |
| Extra dice vs DR | 2 | Conditional eval | Target DR | ✅ Yes |
| Flat conditional bonus | 2 | Conditional eval | Any trigger | ✅ Yes |
| Unstable deactivation | 3 | Hook | Nat 1 | ❌ One shot |
| Force die step increase | 3 | Hook | FP spend | ✅ Yes |
| Alignment resonance | 3 | Method call | Alignment | ✅ Yes |
| Healing amplification | 3 | Hook | Healing roll | ✅ Yes |

---

## Integration Checklist

### For Developers

- [ ] Import `WeaponsEngine` in combat resolution
- [ ] Call `evaluateConditionalCrystalEffects()` after roll evaluation
- [ ] Use returned `extraDice` and `flatBonus` in damage calculation
- [ ] Call `Phase3CrystalSystem.registerPhase3Hooks()` in system init
- [ ] Call `evaluateAlignmentResonance()` during modifier assembly

### For GMs

- [ ] Define crystal items with proper schema
- [ ] Add crystals to actor inventory
- [ ] Install crystals on lightsabers via `installedUpgrades`
- [ ] Test each crystal's behavior
- [ ] Verify stacking works correctly
- [ ] Check edge cases (unequipped, removed crystals)

### For Players

- [ ] Build lightsabers with chosen crystals
- [ ] Attune lightsabers to unlock +1 bonus
- [ ] Experience contextual bonuses during combat
- [ ] Report any stacking issues

---

## Testing

### Phase 1 Tests
- ✅ Ilum: Force +1 attack
- ✅ Synthetic: Untyped +1 attack
- ✅ Barab: Damage type override (fire)
- ✅ Sigil: Force +2 damage
- ✅ Stacking: Multiple bonuses
- ✅ Equipped-only: Bonuses disabled when unequipped

### Phase 2 Tests
- ✅ Opila: Extra die on crit
- ✅ Phond: Extra die vs shields
- ✅ Corusca: Extra die vs DR
- ✅ Multiple conditions: Stacking
- ✅ Trigger normalization: Case-insensitive
- ✅ Flat bonuses: Conditional application

### Phase 3 Tests
- ✅ Unstable: Deactivates on Nat 1
- ✅ Unstable safe: No effect on normal rolls
- ✅ Force die: Step increases on Force spend
- ✅ Alignment light: +1 attack
- ✅ Alignment dark: +1 damage
- ✅ Alignment neutral: No bonus
- ✅ Healing: +X bonus on healing rolls

---

## Known Limitations & Future Work

### Phase 1-3 Complete ✅

### Phase 4+ (Future)

- [ ] DSP-based crystal coloring
- [ ] Unstable visual effects (blade flicker)
- [ ] Crystal resonance audio
- [ ] Crafting XP modifiers for rare crystals
- [ ] Ritual ceremonies for attunement
- [ ] Kyber attunement questline

---

## File Structure

```
scripts/engine/
├── combat/
│   └── weapons-engine.js                 # Phase 1 & 2 implementation
└── crafting/
    ├── phase-1-crystal-tests.js          # Phase 1 test suite
    ├── phase-2-conditional-tests.js      # Phase 2 test suite
    ├── phase-3-advanced-crystal-system.js # Phase 3 implementation
    └── phase-3-advanced-tests.js         # Phase 3 test suite
```

---

## Performance Notes

- **Modifier gathering**: O(upgrades) per equipped weapon
- **Conditional evaluation**: O(triggers × effects) per attack
- **Hook registration**: One-time on system init
- **Alignment check**: Simple flag lookup

All operations are lightweight and non-blocking.

---

## Credits

**Architecture**: Designed for zero-contamination engine extension
**Implementation**: Three-phase rollout (safe → sophisticated → advanced)
**Testing**: Comprehensive test suites for each phase
**Documentation**: Full schema and integration guide

---

**Status**: PRODUCTION READY ✅

All three phases complete, tested, and ready for deployment.
