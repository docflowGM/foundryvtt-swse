# SWSE Compendium Organization Guide

## Overview

The Star Wars Saga Edition system now includes organized compendium packs that help users quickly find and access game content. This document outlines the new structure and how to work with it.

---

## Compendium Structure

### Core Character Building
These packs contain fundamental character creation and progression material:

- **Species** - Playable species and their traits
- **Classes** - Character classes and their progression
- **Talents** - Talent selections and abilities
- **Feats** - Feat options for characters
- **Skills** - Skill definitions and uses
- **Backgrounds** - Character background options
- **Languages** - Available languages

### Force Powers & Abilities
Specialized packs for Force-using characters:

- **Force Powers** - All available Force powers
- **Force Secrets** - Secret Force techniques
- **Force Techniques** - Special Force combat techniques

### Weapons (By Type)
Weapons are now organized by category for easier browsing:

| Pack | Contents |
|------|----------|
| **Weapons - Pistols** | Blaster pistols, slugthrowers, hold-out weapons |
| **Weapons - Rifles** | Blaster rifles, carbines, long-range weapons |
| **Weapons - Heavy** | Heavy weapons, cannons, support weapons |
| **Weapons - Grenades & Explosives** | Grenades, mines, demolition charges |
| **Weapons - Exotic** | Exotic weapons, vibroblade variants, unique weapons |
| **Weapons - Simple/Melee** | Simple melee weapons, basic implements |
| **Weapons (All)** | Master pack containing all weapons |

### Armor (By Type)
Armor organized by protection level:

| Pack | Contents |
|------|----------|
| **Armor - Light** | Light armor, robes, light suits |
| **Armor - Medium** | Medium protective gear, combat suits |
| **Armor - Heavy** | Heavy battle armor, powered suits, full protection |
| **Armor (All)** | Master pack containing all armor |

### Vehicles (By Type)
Vehicles organized by classification:

| Pack | Contents |
|------|----------|
| **Vehicles - Starships** | Starfighters, transports, freighters, corvettes, cruisers |
| **Vehicles - Stations** | Space stations, spacedocks, mobile bases |
| **Vehicles - Walkers** | Walker vehicles, AT-series, four-legged transports |
| **Vehicles - Speeders** | Ground speeders, speederbikes, speeder trucks |
| **Vehicles (All)** | Master pack containing all vehicles |

### Equipment (By Category)
Equipment organized by function and use:

| Pack | Contents |
|------|----------|
| **Equipment - Communications** | Comlinks, communicators, signal devices |
| **Equipment - Tools & Kits** | Tools, diagnostic kits, repair kits, portable equipment |
| **Equipment - Survival Gear** | Camping equipment, survival supplies, packs |
| **Equipment - Medical** | Medical kits, stim packs, antitoxins, bandages |
| **Equipment - Technology** | Scanners, datapads, holorecorders, computer equipment |
| **Equipment - Security** | Security devices, locks, slicer tools, scramblers |
| **Equipment - Other** | Miscellaneous items that don't fit other categories |
| **Equipment (All)** | Master pack containing all equipment |

### Game Rules & Conditions
Additional game mechanics and conditions:

- **Conditions** - Status conditions (poisoned, diseased, etc.)
- **Combat Conditions** - Combat-specific conditions
- **Attributes** - Character attributes and modifiers
- **Extra Skill Uses** - Alternative skill applications

### Characters
NPC and pre-built character packs:

- **NPCs** - Non-player characters
- **Droids** - Droid characters and templates

---

## Using the Compendium

### Finding Items

1. Open the **Compendium** sidebar in Foundry
2. Locate the relevant pack (e.g., "Weapons - Pistols")
3. Click the pack to view contents
4. Drag items into your character sheet or world

### Master Packs

Each category has a **Master Pack** (labeled "All"):
- Contains ALL items in that category
- Useful for searching across the entire category
- Use subcategory packs for easier browsing

### Creating Items from Compendium

**Drag & Drop Method:**
1. Click the compendium pack
2. Find your item
3. Drag it onto your character sheet

**Dialog Method:**
1. Click the compendium pack
2. Right-click item name
3. Select "Import" or appropriate option

---

## Migration from Previous Versions

If you're upgrading from an earlier version, the monolithic packs (weapons.db, equipment.db, vehicles.db, armor.db) remain available.

### Automatic Organization

To automatically organize items into the new subcategory packs:

1. Open the **Browser Console** (F12)
2. Paste this command:
   ```javascript
   import { organizeCompendiums } from '/systems/foundryvtt-swse/scripts/migration/organize-compendiums.js';
   organizeCompendiums();
   ```
3. Press Enter and wait for completion
4. Check the console for migration results

### Manual Organization

Items will remain in the master packs. You can:
- Use either master or subcategory packs interchangeably
- Manually move items between packs as needed
- Let the automatic script handle it for you

---

## Organization Criteria

Items are automatically organized based on these criteria:

### Weapons
- **Pistols**: Items with type "pistol"
- **Rifles**: Items with type "rifle" or "carbine"
- **Heavy**: Items with type "heavy" or "cannon"
- **Grenades**: Items with type "grenade" or "explosive"
- **Exotic**: Items with type "exotic" or containing "vibro"
- **Simple**: Items with type "simple" or "melee"

### Equipment
- **Comlinks**: Names containing "comlink" or "communicat"
- **Tools**: Names containing "tool", "kit", "diagnostic", "repair"
- **Survival**: Names containing "survival", "sleeping", "rope", "backpack"
- **Medical**: Names containing "medical", "medpack", "stim", "antitoxin"
- **Tech**: Names containing "tech", "scanner", "computer", "datapad", "holopad"
- **Security**: Names containing "lock", "slicer", "security", "scrambler"
- **Other**: Anything that doesn't match above categories

### Vehicles
- **Starships**: Names containing "Starfighter", "Corvette", "Cruiser", "Transport", "Freighter", "Interceptor"
- **Stations**: Names containing "Station", "Spacedock", "Dreadnaught"
- **Walkers**: Names containing "Walker", "AT-", "Spider Droid"
- **Speeders**: Names containing "Speeder", "Landspeeder", "Bike", "BARC", "Truck"

### Armor
- **Heavy**: Names containing "Heavy", "Powered", "Dreadnaught"
- **Medium**: Names containing "Medium"
- **Light**: Names containing "Light"

---

## Adding New Items

When adding new items to compendiums:

1. **Choose the appropriate subcategory pack** (if not using master pack)
2. **Follow naming conventions** for automatic organization
3. **Tag items consistently** for future migrations

Example:
- New pistol → Add to "Weapons - Pistols"
- New comlink → Add to "Equipment - Communications"
- New heavy armor → Add to "Armor - Heavy"

---

## Best Practices

### For Game Masters
1. **Use subcategory packs** for faster browsing
2. **Use master packs** when you need to see everything at once
3. **Keep both organized and master packs in sync** if adding items
4. **Create custom packs** for homebrew content

### For System Development
1. **Place new weapons** in appropriate type-specific packs
2. **Follow naming conventions** for automatic organization
3. **Use master packs as backup** references
4. **Update COMPENDIUM_ORGANIZATION.md** when adding new packs

---

## Troubleshooting

### Items not organizing correctly
- Check item names and types match organization criteria
- Manually run the organization script again
- Verify pack exists in system.json

### Can't find an item
- Check both master and subcategory packs
- Use the search function (Ctrl+F) in compendium view
- Ensure the item name matches expected category

### Migration script errors
- Open browser console to see detailed errors
- Ensure all packs exist (check Compendium sidebar)
- Verify you have appropriate permissions

---

## Technical Details

### Pack Definitions (system.json)
All packs are defined in system.json with the following structure:
```json
{
  "name": "unique-pack-id",
  "label": "Display Name",
  "type": "Item|Actor",
  "system": "foundryvtt-swse",
  "path": "packs/filename.db"
}
```

### Database Format
Compendium packs use NDJSON (New Line Delimited JSON) format:
- One document per line
- No commas between entries
- Efficient for Foundry import/export

### Master Pack Relationship
- Master packs ("All" version) contain references to all items
- Subcategory packs contain copies
- Changes to master packs don't auto-sync to subpacks
- Manual organization script handles synchronization

---

## Future Enhancements

Planned improvements for compendium organization:

- [ ] Automatic subcategory detection on import
- [ ] Subcategory folder structure in compendium browser
- [ ] Custom sort orders per pack
- [ ] Smart search across all packs
- [ ] Integration with custom item creation dialog

---

## Support

For issues with compendium organization:

1. Check this guide's **Troubleshooting** section
2. Review console logs for error messages
3. Report issues with detailed information:
   - Item name and type
   - Expected vs. actual organization
   - Error messages from console
4. Contact system developers

---

Last Updated: December 31, 2025
System Version: 1.2.0+
