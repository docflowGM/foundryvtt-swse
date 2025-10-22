# SWSE System Migration Notes

## Changes Made by Auto-Fixer

### Data Model Standardization

1. **Ability Scores Structure**
   - OLD: `{base, racial, modifier}`
   - NEW: `{base, racial, temp, total, mod}`
   - Total is calculated automatically
   - Mod is derived from total

2. **Species/Race Field**
   - Standardized on `race` (was inconsistent between `species` and `race`)
   - All files now use `system.race`

3. **Classes Structure**
   - OLD: `classes: [{name, level}]`
   - NEW: `levelClasses: [{name}]`
   - Array length matches character level
   - Each index represents class taken at that level

4. **Defense Structure**
   - Added `ability` field to each defense
   - Format: `{ability: "con|str|dex|int|wis|cha", class: 0, armor: 0, modifier: 0, total: 10}`
   - Allows customizing which ability modifier applies

### Files Modified

- `module/chargen/chargen.js` - Updated to new data structure
- `module/chargen/chargen-init.js` - Fixed default image path
- `module/scripts/helpers.js` - Added missing helpers
- `module/templates/partials/ability-block.hbs` - Updated to show total

### Files Backed Up

- `module/sheets/SWSEActorSheet.js.old` - Duplicate actor sheet (use scripts/swse-actor.js instead)

### Recommended Next Steps

1. Test character creation with the generator
2. Test existing characters load correctly
3. Update any custom code that references old field names
4. Consider removing `.old` backup file once confirmed working

### API Changes

If you have macros or custom code, update these references:

```javascript
// OLD
actor.system.species
actor.system.classes[0].name
actor.system.abilities.str.modifier

// NEW
actor.system.race
actor.system.levelClasses[0].name
actor.system.abilities.str.mod
```

### Handlebars Helper Changes

The following helpers are now available in templates:
- `add` - Add two numbers
- `toUpperCase` - Convert string to uppercase
- `upper` - Alias for toUpperCase
- `eq`, `ne`, `lt`, `gt`, `lte`, `gte` - Comparisons
- `and`, `or` - Logic operators

Generated: 2025-10-20 20:28:16