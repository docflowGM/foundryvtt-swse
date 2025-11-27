# Nonheroic Characters

## Overview

Nonheroic characters in Star Wars Saga Edition include everything from professional workers to petty criminals, police officers to common thugs. They lack the inclination or training to be heroes, but they are capable in their own fields. Skilled engineers, educated professors, and master architects are all Nonheroic characters, as is the local governor, the self-serving spice merchant, and the baseline Imperial Stormtrooper.

## Implementation

### Class Definition

To create a nonheroic class, set the `isNonheroic` flag to `true` in the class item's system data:

```javascript
{
  "name": "Nonheroic",
  "type": "class",
  "system": {
    "isNonheroic": true,
    "hitDie": "1d4",  // Will be overridden by nonheroic HP calculation
    "babProgression": "medium",  // Will be overridden by nonheroic BAB table
    // ... other class data
  }
}
```

### Rules Implementation

The following SWSE nonheroic character rules are implemented in the system:

#### 1. No Talents
- **Rule**: Nonheroic characters do not gain Talents.
- **Implementation**: `getsTalent()` in `levelup-talents.js` returns `false` for nonheroic classes.

#### 2. No Level Bonus to Defense
- **Rule**: Nonheroic characters do not add their Nonheroic Class Level to their Defense Scores.
- **Implementation**:
  - `_calculateMulticlassStats()` in `character-data-model.js` tracks `heroicLevel` and `nonheroicLevel` separately.
  - `_calculateDefenses()` uses only `heroicLevel` when calculating defense scores.
  - Defense formula: `10 + heroicLevel + ability mod + class bonus + misc`

#### 3. No Force Points or Destiny Points
- **Rule**: Nonheroic characters do not gain Force Points or Destiny Points.
- **Implementation**:
  - `_calculateForcePoints()` in `character-data-model.js` uses only `heroicLevel` for Force Point calculation.
  - Characters with `heroicLevel = 0` receive 0 Force Points.

#### 4. Reduced Ability Score Increases
- **Rule**: Nonheroic characters only get to increase one Ability Score by one point every fourth level (instead of increasing two scores by one point each).
- **Implementation**:
  - `getAbilityIncreaseCount()` in `levelup-shared.js` returns `1` for nonheroic characters (instead of `2`).
  - Ability increases still occur at levels 4, 8, 12, 16, and 20.

#### 5. Normal Feat Progression
- **Rule**: Nonheroic characters gain Feats normally as they advance in level.
- **Implementation**: No special handling needed - feat progression works the same as heroic characters.

#### 6. Custom BAB Progression
- **Rule**: Nonheroic characters use a custom Base Attack Bonus table.
- **Implementation**: `_getNonheroicBAB()` in `character-data-model.js` provides the nonheroic BAB table:

| Level | BAB | Level | BAB |
|-------|-----|-------|-----|
| 1st   | +0  | 11th  | +8  |
| 2nd   | +1  | 12th  | +9  |
| 3rd   | +2  | 13th  | +9  |
| 4th   | +3  | 14th  | +10 |
| 5th   | +3  | 15th  | +11 |
| 6th   | +4  | 16th  | +12 |
| 7th   | +5  | 17th  | +12 |
| 8th   | +6  | 18th  | +13 |
| 9th   | +6  | 19th  | +14 |
| 10th  | +7  | 20th  | +15 |

#### 7. Hit Points: 1d4 + CON
- **Rule**: At each level, Nonheroic characters gain 1d4 Hit Points + their Constitution modifier.
- **Implementation**: `calculateHPGain()` in `levelup-shared.js` uses `1d4` for nonheroic classes (regardless of the class's hitDie setting).

#### 8. Starting Feats (Level 1)
- **Rule**: A Nonheroic character gains three starting Feats at 1st level, chosen from a limited list:
  - Armor Proficiency (Light)
  - Armor Proficiency (Medium)
  - Skill Focus* (may be taken multiple times)
  - Skill Training* (may be taken multiple times)
  - Weapon Proficiency (Advanced Melee Weapons)
  - Weapon Proficiency (Heavy Weapons)
  - Weapon Proficiency (Pistols)
  - Weapon Proficiency (Rifles)
  - Weapon Proficiency (Simple Weapons)

- **Implementation**: This is handled during character creation and should be enforced by the GM when building nonheroic NPCs.

#### 9. Class Skills
- **Rule**: Nonheroic characters have access to the following class skills (trained in 1 + Intelligence modifier, minimum 1):
  - Acrobatics, Climb, Deception, Endurance, Gather Information
  - Initiative, Jump, Knowledge (all types, taken individually)
  - Mechanics, Perception, Persuasion, Pilot, Ride
  - Stealth, Survival, Swim, Treat Injury, Use Computer

- **Implementation**: Set the `classSkills` array on the nonheroic class item to include these skills.

#### 10. Multiclassing
- **Rule**: A Nonheroic character can Multiclass into a heroic class. The normal multiclassing rules apply.
- **Implementation**:
  - The system tracks `heroicLevel` and `nonheroicLevel` separately.
  - When multiclassing, BAB is additive across all classes (using appropriate progression for each).
  - Only heroic levels add to defense scores.
  - Force Points are calculated based on heroic level only.

## Character Archetypes

### Creating Non-Human Nonheroic Characters

When converting a human nonheroic character to another species:

1. **Remove one Feat**: Human characters gain a bonus Feat.
2. **Remove one Trained Skill**: Human characters gain a bonus Trained Skill.
3. **Add Species Traits**: Apply the relevant Species Traits for the selected Species.

## Examples

### Example: Imperial Stormtrooper (Nonheroic 6)

```
Medium Human Nonheroic 6
Init: +9; Senses: Perception +8
Defenses: Ref 13, Fort 10, Will 10
HP: 15 (average of 6d4 + CON)
Base Attack Bonus: +4
Force Points: 0

Abilities: Str 10, Dex 12, Con 10, Int 11, Wis 10, Cha 10
Feats: Armor Proficiency (Light), Weapon Proficiency (Rifles), Weapon Proficiency (Pistols)
Skills: Initiative +9, Perception +8
```

### Example: Mixed Nonheroic/Heroic Character (Nonheroic 4 / Soldier 2)

This character has:
- **Total Level**: 6
- **Heroic Level**: 2 (from Soldier)
- **Nonheroic Level**: 4 (from Nonheroic class)
- **Reflex Defense**: 10 + 2 (heroic level only) + DEX + class bonus + misc
- **BAB**: +3 (from Nonheroic 4) + +2 (from Soldier 2) = +5
- **Force Points**: 5 + floor(2/2) = 6 (based on heroic level only)
- **HP**: 4d4 (Nonheroic) + 2d10 (Soldier) + CON×6

## Modified Files

The following files were modified to implement nonheroic character rules:

1. **scripts/data-models/item-data-models.js**
   - Added `isNonheroic` boolean field to ClassDataModel

2. **scripts/data-models/character-data-model.js**
   - Modified `_calculateMulticlassStats()` to track `heroicLevel` and `nonheroicLevel` separately
   - Added `_getNonheroicBAB()` to provide custom BAB table for nonheroic classes
   - Modified `_calculateDefenses()` to use only `heroicLevel` for defense calculations
   - Modified `_calculateForcePoints()` to use only `heroicLevel` for Force Point calculation

3. **scripts/apps/levelup/levelup-shared.js**
   - Modified `calculateHPGain()` to use 1d4 for nonheroic classes
   - Added `getAbilityIncreaseCount()` to return 1 ability increase for nonheroic (instead of 2)

4. **scripts/apps/levelup/levelup-talents.js**
   - Modified `getsTalent()` to return `false` for nonheroic classes

## Notes

- **Destiny Points**: The rules state that nonheroic characters do not gain Destiny Points. However, the current implementation doesn't provide a specific calculation for Destiny Points based on character level, so this is handled implicitly.

- **Starting Feat Restrictions**: The system does not currently enforce the starting feat restrictions for nonheroic characters at 1st level. This should be managed by the GM during character creation.

- **Talent Trees**: Nonheroic classes should not have any talent trees assigned to them, as they cannot gain talents.
