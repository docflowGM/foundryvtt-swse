# Feats and Talents Migration Summary

## Overview

Migrated feats database to align with data model and implemented automated Active Effects for the most common mechanical bonuses.

## Feats Migration Results

### Statistics
```
Total feats: 130
Feats with automated effects: 12
Feats without automation: 118
```

### Feat Type Distribution
- **General**: 103 feats
- **Force**: 27 feats
- **Species**: 0 feats (none detected)

### Schema Changes

**Field Mappings:**
- `system.description` → `system.benefit` (data model compliance)
- Added `system.featType` (general/force/species)
- Added `system.special` field
- Added `system.normalText` field
- Preserved `sourcebook`, `page`, `tags`, `bonus_feat_for`

## Automated Feats (12 Total)

### Defense Bonuses (5 feats)
1. **Dodge** - +1 Reflex Defense
2. **Great Fortitude** - +2 Fortitude Defense
3. **Iron Will** - +2 Will Defense (if present)
4. **Lightning Reflexes** - +2 Reflex Defense
5. **Improved Defenses** - +1 to all three defenses (3 effects)

### Skill Bonuses (4 feats)
1. **Skill Focus** - +5 to one skill (template for Perception)
2. **Educated** - +5 to Knowledge (Galactic History) and Knowledge (Social Sciences)
3. **Linguist** - +5 to Deception and Persuasion
4. **Sharp-Eyed** - +5 to Perception and Survival

### Hit Points & Threshold (2 feats)
1. **Toughness** - +5 HP per level
2. **Improved Damage Threshold** - +5 to Damage Threshold

### Attack Bonuses (3 feats)
1. **Weapon Focus** - +1 attack with weapon group (template for Rifles)
2. **Greater Weapon Focus** - +1 attack with weapon group (stacks)
3. **Point Blank Shot** - +1 attack and damage within 6 squares

### Situational Bonuses (1 feat)
1. **Mobility** - +2 Reflex Defense vs attacks of opportunity

## Active Effects Structure

Each automated feat includes one or more Active Effects that modify character stats:

### Example: Improved Defenses
```json
{
  "effects": [
    {
      "name": "Improved Defenses",
      "icon": "icons/svg/upgrade.svg",
      "changes": [
        {
          "key": "system.defenses.reflex.bonus",
          "mode": 2,  // ADD
          "value": "1",
          "priority": 20
        }
      ],
      "disabled": false,
      "duration": {},
      "transfer": true,
      "flags": {
        "swse": {
          "type": "defense-bonus",
          "defense": "reflex"
        }
      }
    },
    // ... two more effects for fortitude and will
  ]
}
```

### Effect Modes
- **Mode 2 (ADD)**: Adds value to the attribute
- **Mode 5 (OVERRIDE)**: Replaces the attribute value entirely

### Common Attribute Paths
```javascript
// Defenses
"system.defenses.reflex.bonus"
"system.defenses.fortitude.bonus"
"system.defenses.will.bonus"

// Skills
"system.skills.perception.bonus"
"system.skills.deception.bonus"
"system.skills.persuasion.bonus"

// Attack/Damage
"system.attackBonus.rifles"
"system.damageBonus.ranged"

// Hit Points
"system.hitPoints.bonusPerLevel"
"system.damageThreshold"
```

## Not Yet Automated

### Feats Requiring Character Selection
These feats need player input to configure:
- **Skill Focus**: Player must select which skill
- **Weapon Focus**: Player must select weapon group
- **Greater Weapon Focus**: Player must select weapon group
- **Weapon Specialization**: Player must select weapon group

### Feats Requiring Complex Logic
These need custom code beyond simple Active Effects:
- **Combat Reflexes**: Extra attacks of opportunity
- **Double Attack**: Make two attacks as full-round action
- **Rapid Strike**: -2 penalty, extra attack
- **Cleave**: Attack multiple enemies
- **Burst of Speed**: Action economy modification
- **Adaptable Talent**: Temporary talent acquisition

### Feats That Are Passive/Procedural
These feats don't have automated effects but provide rules:
- **Armor Proficiency**: Removes penalties (procedural)
- **Weapon Proficiency**: Removes penalties (procedural)
- **Vehicular Combat**: Use pilot stats (calculation)
- **Starship Tactics**: Bonus to crew actions (situational)

## Future Enhancements

### Phase 2 - Additional Automated Feats (Target: +20-30 feats)
- **Weapon Specialization series**: +2 damage with weapon group
- **Melee Smash**: +1 damage with two-handed weapons
- **Power Attack**: Trade attack for damage
- **Rapid Shot**: Extra ranged attack at -2
- **Precise Shot**: Ignore partial cover
- **Far Shot**: Increase range increments
- **Deadeye**: No range penalties
- **Conditioning**: +1 to Fortitude checks

### Phase 3 - Configurable Feats
Implement UI for selecting feat parameters:
- Skill choice for Skill Focus
- Weapon group for Weapon Focus/Specialization
- Knowledge skill pairs for Educated
- Language selections for Linguist

### Phase 4 - Toggleable Effects
For situational bonuses that can be turned on/off:
- Defensive Fighting: +2 Reflex Defense, -2 attack
- Total Defense: +5 Reflex Defense, no attacks
- Fighting Defensively: +1 Reflex Defense, -2 attack
- Power Attack: Variable attack/damage trade

### Phase 5 - Complex Mechanics
Requires custom code:
- Action economy modifications (Burst of Speed, etc.)
- Extra attacks (Double Attack, Triple Attack)
- Condition-based triggers (Acrobatic Strike after tumble)

## Benefits for Players

✅ **Automatic Calculations**: No need to remember to add +1 from Dodge
✅ **Fewer Errors**: System calculates correctly every time
✅ **Quick Reference**: Hover over effect to see what it does
✅ **Stack Visibility**: See all active bonuses in one place
✅ **Character Building**: Instantly see impact of taking a feat

## Benefits for GMs

✅ **Character Verification**: Easy to check if bonuses are correct
✅ **Rule Consistency**: Effects apply uniformly
✅ **Less Math**: System handles the calculations
✅ **Transparency**: Clear what each feat does mechanically

## Technical Implementation

### Active Effect Transfer
All feat effects use `"transfer": true` to ensure they apply to the owning actor automatically when the feat is added to their character sheet.

### Effect Flags
Custom flags help identify and manage effects:
```json
"flags": {
  "swse": {
    "type": "defense-bonus",
    "defense": "reflex",
    "conditional": "vs attacks of opportunity"
  }
}
```

### Priority System
All effects use `"priority": 20` to ensure proper stacking order with other bonuses.

## Files Modified

1. **`packs/feats.db`** - All 130 feats migrated
2. **`packs/feats.db.backup`** - Original backup
3. **`tools/migrate-feats-db.js`** - Migration script
4. **`tools/FEATS_TALENTS_ANALYSIS.md`** - Full analysis
5. **`tools/FEATS_TALENTS_MIGRATION_SUMMARY.md`** - This file

## Next Steps

1. ⚠️ **Test in Foundry**: Verify effects apply correctly
2. ⚠️ **Talents Migration**: Apply same approach to talents (853 items)
3. ⚠️ **Expand Automation**: Add more automated feats
4. ⚠️ **UI Configuration**: Build selection interface for parameterized feats
5. ⚠️ **Documentation**: Create player guide for automated effects

## Notes

- Some feats like "Skill Focus" use template effects for one specific skill
- Players may need to manually edit effects to choose their specific selection
- Future enhancements will add UI for configuration
- 118 feats remain as documentation-only (still useful for reference)

## Verification Commands

Check automated feats:
```bash
cat packs/feats.db | jq 'select(.effects | length > 0) | {name, effects: .effects | length}'
```

View specific feat:
```bash
cat packs/feats.db | jq 'select(.name == "Improved Defenses")'
```

Count by type:
```bash
cat packs/feats.db | jq -s 'group_by(.system.featType) | map({type: .[0].system.featType, count: length})'
```
