
# Armor System Updates

## Changes Made

### 1. Armor Bonus (Reflex Defense Replacement)
- The `armor_bonus` field represents the armor's Reflex Defense value
- When equipped, this value REPLACES the character's normal Reflex Defense calculation
- Talents modify how armor_bonus is applied:
  - **No talent**: Reflex Defense = armor_bonus only
  - **Armored Defense**: Reflex Defense = max(character_level, armor_bonus)
  - **Improved Armored Defense**: Reflex Defense = max(character_level + floor(armor_bonus/2), armor_bonus)

### 2. Max Dex Bonus
- All armor now has a proper `max_dex_bonus` value
- This caps how much Dexterity modifier can be added to Reflex Defense
- Default values by type:
  - Light Armor: 5
  - Medium Armor: 3
  - Heavy Armor: 1
- The old "999" unlimited value has been replaced with sensible defaults

### 3. Equipment Bonus
- All armor has an `equipment_bonus` field
- This bonus is ALWAYS added to Reflex Defense (doesn't replace)
- Represents quality, modifications, or special features of the armor

### 4. File Formatting
- JSON files (data/armor/*.json): Remain pretty-printed for readability
- DB files (packs/armor-*.db): Single-line format for better version control

## How It Works in Character Sheets

The character sheet (`scripts/swse-actor.js`) calculates Reflex Defense as:

```javascript
// 1. Determine base value
if (armor equipped) {
  if (has Improved Armored Defense) {
    base = max(level + floor(armor_bonus/2), armor_bonus)
  } else if (has Armored Defense) {
    base = max(level, armor_bonus)
  } else {
    base = armor_bonus  // Armor REPLACES normal calculation
  }
} else {
  base = level  // No armor, normal calculation
}

// 2. Add ability modifier (capped by max_dex_bonus if wearing armor)
if (armor equipped && max_dex_bonus is set) {
  dex_mod = min(dex_mod, max_dex_bonus)
}

// 3. Calculate total
reflex_defense = 10 + base + dex_mod + class_bonus + equipment_bonus + misc_modifiers
```

## Migration Notes

- All existing armor entries have been updated
- No data loss - all original values preserved
- Character sheets will automatically use the new calculations
- Talents "Armored Defense" and "Improved Armored Defense" work correctly

## Testing Checklist

- [ ] Verify armor_bonus values are correct for each armor type
- [ ] Test max_dex_bonus enforcement (Dex mod should be capped)
- [ ] Confirm Armored Defense talent works (level vs armor_bonus)
- [ ] Confirm Improved Armored Defense talent works (level + armor_bonus/2)
- [ ] Check that equipment_bonus is always applied
- [ ] Verify DB files are single-line format
