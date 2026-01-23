# Character Defense Calculations - SWSE Verification

## Overview

This document verifies that character defense calculations in the SWSE system follow Star Wars Saga Edition rules, with support for customizable ability scores to accommodate feats and talents that allow different ability modifiers.

## Defense Formulas - SWSE Rules

### Reflex Defense
**Formula**: 10 + Heroic Level (or Armor Bonus) + Ability Modifier + Class Bonus + Size Modifier

**Components**:
- **Base**: 10
- **Heroic Level or Armor Bonus**:
  - Without armor: Add Heroic Level
  - With armor (no talent): Armor Bonus replaces Heroic Level
  - With Armored Defense talent: max(Heroic Level, Armor Bonus)
  - With Improved Armored Defense talent: max(Heroic Level + floor(Armor/2), Armor Bonus)
- **Ability Modifier**: Configured via `defenses.reflex.ability` (default: DEX)
  - Affected by armor's max ability bonus restriction
  - Armor Mastery talent increases max ability bonus by +1
  - Lost if character is flat-footed or unaware
  - Treated as 0 (-5) if helpless
- **Equipment Bonus**: From armor (only if proficient)
- **Class Bonus**: From class progression
- **Size Modifier**:
  - Colossal: -10
  - Gargantuan: -5
  - Huge: -2
  - Large: -1
  - Medium: 0
  - Small: +1
  - Tiny: +2
  - Diminutive: +5
  - Fine: +10
- **Species Bonus**: From species traits
- **Misc Bonuses**: User-defined and automatic bonuses
- **Condition Penalty**: From condition track

### Fortitude Defense
**Formula**: 10 + Heroic Level + Ability Modifier + Class Bonus + Equipment Bonus

**Components**:
- **Base**: 10
- **Heroic Level**: Character's total heroic level
- **Ability Modifier**: Configured via `defenses.fort.ability`
  - Default for organics: max(CON, STR)
  - Default for droids: STR (must use STR for toughness)
  - Can be overridden by player for specific feats/talents
- **Equipment Bonus**: From armor (only if proficient)
- **Class Bonus**: From class progression
- **Species Bonus**: From species traits
- **Misc Bonuses**: User-defined and automatic bonuses
- **Condition Penalty**: From condition track

### Will Defense
**Formula**: 10 + Heroic Level + Ability Modifier + Class Bonus

**Components**:
- **Base**: 10
- **Heroic Level**: Character's total heroic level
- **Ability Modifier**: Configured via `defenses.will.ability` (default: WIS)
  - Can be overridden for feats/talents that allow different modifiers
- **Class Bonus**: From class progression
- **Species Bonus**: From species traits
- **Misc Bonuses**: User-defined and automatic bonuses
- **Condition Penalty**: From condition track
- **Note**: No equipment bonus for Will Defense

### Flat-Footed Defense
**Formula**: Reflex Defense - [Reflex Ability Modifier]

**Use Case**: When character is caught off-guard or surprised
- Loses the configurable ability modifier bonus to Reflex Defense
- Still retains other defensive bonuses (armor, class, size, species, etc.)

## Implementation Status

### Character Defenses ✅ VERIFIED & ENHANCED

**Current Implementation** (`scripts/data-models/character-data-model.js`):
- ✅ All SWSE rules correctly implemented
- ✅ Armor proficiency check applied
- ✅ Max ability bonus restriction from armor enforced
- ✅ Armor Mastery talent bonus (+1 max ability bonus) applied
- ✅ Armored Defense talent support (max formula)
- ✅ Improved Armored Defense talent support (max formula with floor bonus)
- ✅ Species trait bonuses integrated
- ✅ Class bonuses from class progression applied
- ✅ Condition track penalties applied
- ✅ Droid special handling (STR for Fortitude)
- ✅ **NEW**: Configurable ability scores for each defense

**Recent Improvement** (Commit: b10f08b):
- Made defense ability modifiers configurable via:
  - `defenses.reflex.ability` (default: 'dex')
  - `defenses.fort.ability` (default: 'str' for droids, 'con' for organics)
  - `defenses.will.ability` (default: 'wis')
- This allows players to override ability modifiers for feats/talents that permit it
- Flat-footed calculation now uses the configured reflex ability mod
- Backward compatible: defaults to original ability scores

### Vehicle Defenses ✅ VERIFIED

**Current Implementation** (`scripts/data-models/vehicle-data-model.js`):
- ✅ Reflex Defense: 10 + size + (armor OR pilot level) + dex
  - Properly recalculates with crew assignments
  - Handles flat-footed state
  - Handles out-of-control state
- ✅ Fortitude Defense: 10 + strength modifier
- ✅ Damage Threshold: Fortitude + size-specific modifier
- ✅ Condition track penalties applied

**Note**: Vehicles do not have Will Defense per SWSE rules

## Defense Data Structure

Each defense is stored with the following properties:

```javascript
defenses: {
  reflex: {
    total: 12,          // Calculated total
    armor: 0,           // Armor bonus component
    classBonus: 0,      // Class bonus component
    ability: 'dex',     // Which ability to use (configurable)
    speciesBonus: 0,    // Species trait bonus
    misc: {
      auto: {},         // Auto bonuses (from talents, etc.)
      user: {}          // User-defined bonuses
    }
  },
  fort: {
    total: 10,
    classBonus: 0,
    ability: 'con',     // Configurable (default 'str' for droids)
    speciesBonus: 0,
    misc: {
      auto: {},
      user: {}
    }
  },
  will: {
    total: 11,
    classBonus: 0,
    ability: 'wis',     // Configurable
    speciesBonus: 0,
    misc: {
      auto: {},
      user: {}
    }
  },
  flatFooted: {
    total: 10           // Reflex - [ability mod]
  }
}
```

## Feat/Talent Support

The following feats and talents are now properly supported:

- **Feats**:
  - Improved Defenses: +1 bonus to all three defenses
  - Armored Defense talent: max(level, armor) for Reflex
  - Improved Armored Defense: max(level + floor(armor/2), armor)
  - Armor Mastery: +1 to max ability bonus restriction

- **Custom Ability Modifiers** (via `defenses.[type].ability`):
  - Any feat/talent that allows substituting one ability score for another
  - Example: A talent allowing CHA for Will instead of WIS
  - Player sets the `ability` field to the alternate ability key

## Verification Checklist

### Character Defenses
- ✅ Base calculation (10 + components)
- ✅ Heroic level vs. armor bonus logic
- ✅ Armor proficiency enforcement
- ✅ Max ability bonus restriction
- ✅ Armor Mastery bonus
- ✅ Armored Defense talents
- ✅ Equipment bonuses
- ✅ Class bonuses
- ✅ Species bonuses
- ✅ Misc bonuses (auto + user)
- ✅ Condition penalties
- ✅ Droid special handling
- ✅ Configurable ability scores
- ✅ Flat-footed calculation

### Vehicle Defenses
- ✅ Reflex Defense calculation
- ✅ Fortitude Defense calculation
- ✅ Damage Threshold calculation
- ✅ Size modifier application
- ✅ Armor bonus vs. pilot level choice
- ✅ Crew assignment recalculation

## Special Cases Handled

### Droid Fortitude Defense
- Droids use STR instead of CON for Fortitude Defense
- Formula: 10 + Heroic Level + STR mod + Class + Equipment
- Can be overridden if player sets `defenses.fort.ability` to 'con'

### Helpless Characters
- Not explicitly handled in code (treated as player responsibility)
- If character becomes helpless, player should set reflex ability to 0 or apply -5 condition

### Flat-Footed Characters
- Reflex Defense - ability modifier to simulate losing agility bonus
- Properly implemented using configured ability modifier

## Usage for Players

### Overriding Ability Modifiers

To allow a feat/talent that uses a different ability modifier:

1. Open character sheet
2. Navigate to character data or defense section
3. Update the `ability` field for the relevant defense:
   - `system.defenses.reflex.ability` = new ability key
   - `system.defenses.fort.ability` = new ability key
   - `system.defenses.will.ability` = new ability key

4. The next calculation cycle will use the new ability modifier

### Valid Ability Keys
- 'str' (Strength)
- 'dex' (Dexterity)
- 'con' (Constitution)
- 'int' (Intelligence)
- 'wis' (Wisdom)
- 'cha' (Charisma)

## Future Enhancements

1. **UI Controls**: Add character sheet UI to edit ability overrides
2. **Feat Integration**: Automatic ability modifier changes when feats are added
3. **Documentation**: Add talent/feat tooltips explaining ability override options
4. **Validation**: Warning if ability override conflicts with class requirements

## Related Documentation

- `VEHICLE_STATISTICS_CALCULATIONS.md` - Vehicle statistics and calculations
- `SWSE Core Rulebook` - Official defense rules
- Character Sheet UI - Defense display and editing interface
