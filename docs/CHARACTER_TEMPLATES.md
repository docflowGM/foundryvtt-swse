# Character Templates for SWSE

## Overview

The Character Template system provides 20 pre-configured, optimized character builds for Star Wars Saga Edition level 1 characters. These templates are based on the **Star Wars Saga Edition Character Optimization Guide: Core Classes at Level 1** and allow players to quickly create characters without going through the full character creation process.

## Features

- **20 Pre-configured Templates**: 4 archetypes for each of the 5 core classes
- **Fully Optimized**: Based on optimization guide with optimal ability scores, feats, talents, and skills
- **One-Click Creation**: Create a complete character in seconds
- **Equipment Lists**: Each template includes recommended starting equipment
- **Class Variety**: Covers multiple playstyles per class

## Available Templates

### Jedi (5 templates)
1. **Lightsaber Duelist** - Guardian Focus
   - Mirialan DEX-based finesse fighter
   - Block talent for defensive prowess
   - High mobility and Reflex Defense

2. **Force Wizard** - Consular Focus
   - Miraluka Force-focused controller
   - 4 Force Powers at level 1
   - High Use the Force skill

3. **Tank/Defender** - Guardian Focus
   - Zabrak high-CON defender
   - Deflect talent for ranged defense
   - Excellent HP and durability

4. **Dark Side Hunter** - Sentinel Focus
   - Miraluka investigative specialist
   - Dark Side Sense talent
   - Balanced Force abilities and stealth

### Noble (4 templates)
1. **Diplomat/Face Character**
   - Zeltron social specialist
   - Persuasion +18 at level 1
   - Inspire Confidence talent

2. **Inspirational Leader**
   - Human tactical commander
   - Born Leader talent
   - Improved Defenses feat

3. **Wealthy Manipulator**
   - Bothan information broker
   - Wealth talent (5,000 starting credits)
   - 10 trained skills

4. **Noble Duelist**
   - Zeltron finesse combatant
   - Noble Fencing Style (CHA to attack)
   - Social skills with combat capability

### Scoundrel (4 templates)
1. **Pistoleer**
   - Human precision shooter
   - Sneak Attack talent
   - Precise Shot feat

2. **Skill Monkey**
   - Bothan versatile specialist
   - 8 trained skills
   - Knack talent for rerolls

3. **Dirty Fighter**
   - Duros condition track manipulator
   - Dastardly Strike talent
   - High DEX finesse build

4. **Fortune's Favorite**
   - Twi'lek lucky gambler
   - Fool's Luck talent
   - High CHA social build

### Scout (4 templates)
1. **Sniper/Marksman**
   - Duros long-range specialist
   - Acute Senses talent
   - High Perception

2. **Mobile Skirmisher**
   - Human hit-and-run specialist
   - Long Stride talent
   - Running Attack feat

3. **Survivalist/Tracker**
   - Ithorian wilderness expert
   - Evasion talent
   - Survival +12

4. **Infiltrator/Spy**
   - Bothan stealth specialist
   - Improved Stealth talent
   - Stealth +18

### Soldier (4 templates)
1. **Sharpshooter**
   - Human precision marksman
   - Devastating Attack (Rifles)
   - Point-Blank Shot feat

2. **Heavy Weapons Specialist**
   - Human suppression specialist
   - Devastating Attack (Heavy Weapons)
   - Autofire capability

3. **Melee Warrior**
   - Wookiee close combat specialist
   - Devastating Attack (Advanced Melee)
   - Massive STR bonus

4. **Armored Tank**
   - Gen'Dai defensive specialist
   - Heavy armor proficiency
   - Doubled damage threshold

## How to Use

### Method 1: Create Actor Dialog
1. Click the "Create Actor" button in the Actors directory
2. Select **"Use Character Template"**
3. Browse templates by class
4. Click **"Select Template"** on your chosen build
5. Enter a character name
6. Character is created automatically!

### Method 2: Quick Access Buttons
1. Look for the **"Templates"** button in the Actors directory header
2. Click to open template selection
3. Choose your template
4. Enter character name
5. Done!

### Method 3: Custom Build Option
- Select **"Custom Character Generator"** for the full character creation experience
- Select **"Create Manually"** to create a blank character sheet

## What Gets Applied Automatically

When you select a template, the system automatically applies:

✅ **Ability Scores** - Optimized array (16, 14, 12, 12, 10, 8)
✅ **Species** - With racial ability modifiers
✅ **Class** - Level 1 in the appropriate class
✅ **Skills** - All trained skills marked
✅ **Feat** - Level 1 feat added from compendium
✅ **Talent** - Class talent added from compendium
✅ **Force Powers** - For Jedi templates
✅ **Starting Credits** - Based on class

## What You Need to Add Manually

⚠️ **Equipment** - The template shows recommended equipment, but you'll need to add items from your inventory/compendium
⚠️ **Background/Biography** - Add your character's story
⚠️ **Portrait/Token** - Upload character art

## Template Data Structure

Templates are stored in `data/character-templates.json` and include:

```json
{
  "id": "unique_identifier",
  "name": "Template Name",
  "class": "Class Name",
  "archetype": "Build Focus",
  "description": "Character concept description",
  "abilityScores": { "str": 10, "dex": 16, ... },
  "species": "Species Name",
  "feat": "Feat Name",
  "talent": "Talent Name",
  "talentTree": "Talent Tree Name",
  "trainedSkills": ["skill_key_1", "skill_key_2", ...],
  "forcePowers": ["Power Name 1", "Power Name 2"],
  "startingEquipment": ["Item 1", "Item 2", ...],
  "credits": 1000,
  "notes": "Optimization notes and key stats"
}
```

## Customization

### Adding New Templates

1. Edit `data/character-templates.json`
2. Add a new template object following the structure above
3. Ensure all skill keys match the system's skill key format
4. Test the template creation

### Modifying Existing Templates

1. Locate the template in `data/character-templates.json`
2. Modify the desired properties
3. Save and reload Foundry
4. Test the changes

## Technical Details

### Files Involved

- `data/character-templates.json` - Template definitions
- `scripts/apps/chargen/chargen-templates.js` - Template loader and UI
- `scripts/apps/template-character-creator.js` - Character creation logic
- `scripts/apps/chargen-init.js` - Integration hooks
- `styles/apps/chargen-templates.css` - UI styling

### System Integration

Templates integrate with:
- Actor creation system
- Item compendium lookups
- Species data
- Class system
- Skill system
- Force power system

## Troubleshooting

### Template Not Loading
- Check browser console for errors
- Verify `character-templates.json` is valid JSON
- Ensure compendiums are loaded

### Missing Feat/Talent
- Verify feat/talent exists in compendium with exact name match
- Check compendium pack names in code
- Manual addition may be required if not found

### Incorrect Ability Scores
- Check template JSON for typos
- Verify species racial modifiers are being applied
- Check character sheet calculations

## Future Enhancements

Potential improvements:
- Level 1-20 templates
- Prestige class templates
- Multi-class templates
- Equipment auto-addition
- Template import/export
- Community template sharing

## Credits

Based on the **Star Wars Saga Edition Character Optimization Guide: Core Classes at Level 1**, which provides detailed optimization analysis for creating effective level 1 characters.

## Support

For issues or feature requests:
- GitHub: https://github.com/docflowGM/foundryvtt-swse/issues
- Use the "Character Template" label for template-related issues
