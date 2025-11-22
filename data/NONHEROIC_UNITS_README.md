# Nonheroic Units System

This directory contains sanitized NPC templates from the Star Wars Saga Edition nonheroic units database.

## Files

- **nonheroic_units.json** - Sanitized NPC template data (786 units)
- **nonheroic_units_original_backup.json** - Original unsanitized backup

## Usage Options

### Option 1: Drag and Drop (Recommended)

1. Open the **Nonheroic Units Browser** application (see below)
2. Search for the unit you want
3. Drag the unit directly onto an open NPC character sheet
4. The NPC's stats will be automatically populated!

### Option 2: Import to Compendium

Import units into the system's NPC compendium for permanent storage and easy access:

1. Open Foundry VTT as a GM
2. Go to **Macros** → **Create Macro**
3. Copy the contents of `/scripts/import-nonheroic-units-to-compendium.js`
4. Paste into the macro and execute it
5. Wait for the import to complete (may take several minutes for 786 units)
6. Units will now be available in the **SWSE NPCs** compendium

### Option 3: Browse and Select

Open the Nonheroic Units Browser application:

```javascript
new game.swse.NonheroicUnitsBrowser().render(true);
```

Features:
- Search by name or creature type
- Filter by Challenge Level
- View detailed stat blocks
- Drag onto NPC sheets
- One-click import to compendium

## Data Format

Each unit contains:

```json
{
  "name": "Unit Name",
  "type": "npc",
  "challengeLevel": 6,
  "size": "medium",
  "abilities": {
    "str": { "base": 13, "mod": 1, ... },
    // ... other abilities
  },
  "defenses": {
    "reflex": { "total": 20, ... },
    // ... other defenses
  },
  "hp": { "value": 82, "max": 82 },
  "feats": ["Feat 1", "Feat 2", ...],
  "talents": ["Talent 1", ...],
  "skillsText": "Initiative +9, Perception +12",
  "equipment": "Blaster Rifle, Armor, ..."
}
```

## Maintenance

### Re-sanitizing the Data

If you need to re-process the original data:

```bash
node scripts/sanitize-nonheroic-units.js
```

This will:
- Remove unnecessary fields (URLs, empty data)
- Transform ability scores to proper format
- Parse feats and talents into arrays
- Extract numeric values from text
- Remove entries with no valid stats

## Integration

The system automatically:
- Matches feats/talents to compendium entries when available
- Creates placeholder items for missing compendium entries
- Adds equipment, skills, and abilities to the NPC biography
- Applies all stats to the character sheet structure

## Notes

- **Placeholders**: If a feat/talent isn't found in the compendium, a placeholder will be created
- **Equipment**: Equipment parsing is basic - you may need to manually add specific items
- **Skills**: Skill bonuses are stored as text in the biography (not auto-applied to skill fields)
- **Challenge Level**: Stored for reference but doesn't auto-calculate encounter difficulty

## Troubleshooting

**Units not dragging?**
- Make sure you're dragging onto an NPC-type actor
- Ensure the Nonheroic Units Browser is open and loaded

**Import failing?**
- Check that the NPC compendium is unlocked
- Verify you're running as GM
- Check the console (F12) for error messages

**Feats not linking to compendium?**
- Feat/talent names must match exactly (case-insensitive)
- Run a compendium search to verify the item exists
- Placeholders will be created for missing items

## Support

For issues or feature requests, please report to:
https://github.com/docflowGM/foundryvtt-swse/issues
