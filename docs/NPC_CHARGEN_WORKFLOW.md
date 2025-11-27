# NPC Character Generation Workflow

## Overview

NPCs in Star Wars Saga Edition use a different workflow than Player Characters. They start as **Nonheroic** characters and can optionally multiclass into heroic classes as they advance.

## Nonheroic Character Creation

### Step 1: Choose Template (Optional)

Five nonheroic templates are available in `data/nonheroic-templates.json`:

1. **Worker** - Skilled laborer, mechanic, technician
   - Feats: Skill Training (Mechanics), Skill Training (Use Computer), Skill Focus (Mechanics)
   - Skills: Mechanics +10, Use Computer
   - Equipment: Tool Kit, Work Coveralls, Datapad

2. **Trooper** - Baseline soldier, guard, militia
   - Feats: Armor Proficiency (Light), Weapon Proficiency (Rifles), Weapon Proficiency (Pistols)
   - Skills: Perception, Initiative
   - Equipment: Blaster Rifle, Blast Vest & Helmet

3. **Criminal** - Petty thug, gang member, street criminal
   - Feats: Weapon Proficiency (Pistols), Weapon Proficiency (Simple Weapons), Skill Training (Deception)
   - Skills: Deception +7, Stealth
   - Equipment: Blaster Pistol, Knife, Street Clothes

4. **Merchant** - Trader, shopkeeper, business professional
   - Feats: Skill Training (Persuasion), Skill Training (Gather Information), Skill Focus (Persuasion)
   - Skills: Persuasion +10, Gather Information, Use Computer
   - Equipment: Hold-Out Blaster, Business Attire, Datapad
   - Credits: 1000 (higher than other nonheroics)

5. **Police Officer** - Law enforcement, security, constable
   - Feats: Armor Proficiency (Light), Weapon Proficiency (Pistols), Skill Training (Perception)
   - Skills: Perception +8, Gather Information
   - Equipment: Stun Baton, Blaster Pistol, Padded Armor, Badge

### Step 2: Chargen for NPCs

When creating an NPC, the chargen process should work as follows:

1. **Name & Basic Info** - Same as PCs
2. **Species Selection** - Choose species (Human by default for templates)
3. **Abilities** - Set ability scores (or use template values)
4. **Skills** - Select trained skills (1 + INT modifier, minimum 1)
5. **Feats** - Select 3 starting feats from restricted list:
   - Armor Proficiency (Light/Medium)
   - Weapon Proficiency (Simple/Pistols/Rifles/Heavy Weapons/Advanced Melee)
   - Skill Focus (can be taken multiple times)
   - Skill Training (can be taken multiple times)
6. **Equipment** - Assign starting equipment
7. **NO CLASS SELECTION** - NPCs start without a class (implicitly Nonheroic 1)

### Step 3: Initial Stats

A level 1 Nonheroic character has:

- **HP**: 1d4 + CON modifier (average: 2.5 + CON)
- **Defenses**: 10 + ability modifiers (NO level bonus)
- **BAB**: +0
- **Force Points**: 0
- **Skills**: 1 + INT modifier trained skills
- **Feats**: 3 starting feats (from restricted list)

## Leveling Up NPCs

### Continuing as Nonheroic

When leveling up a nonheroic character (Nonheroic 1 → Nonheroic 2):

1. **HP Gain**: 1d4 + CON modifier
2. **BAB**: Use nonheroic BAB table
3. **Feats**: Gain feat at levels 1, 3, 6, 9, 12, 15, 18 (same as heroic)
4. **Ability Increases**: Every 4 levels (4, 8, 12, 16, 20) - **only 1 ability** increases
5. **NO Talents**: Nonheroic characters never gain talents
6. **NO Force Points**: Nonheroic characters never gain Force Points

### Multiclassing into Heroic Class

At any level, a nonheroic character can multiclass into a heroic class:

**Example: Nonheroic 4 → Nonheroic 4 / Soldier 1**

Benefits of multiclassing:
- Gains talents from heroic class
- Gains Force Points (based on heroic level only)
- Heroic levels add to defense scores
- Full BAB from both classes (additive)
- Better hit die (heroic classes use d6-d10 vs d4)

**Progression Example:**

| Level | Classes | Heroic Level | BAB | Ref Def | Force Points | HP Gain |
|-------|---------|--------------|-----|---------|--------------|---------|
| 1 | NH 1 | 0 | +0 | 10+DEX | 0 | 1d4+CON |
| 2 | NH 2 | 0 | +1 | 10+DEX | 0 | 1d4+CON |
| 3 | NH 3 | 0 | +2 | 10+DEX | 0 | 1d4+CON |
| 4 | NH 4 | 0 | +3 | 10+DEX | 0 | 1d4+CON |
| 5 | NH 4 / Sold 1 | 1 | +4 | 11+DEX | 6 | 1d10+CON |
| 6 | NH 4 / Sold 2 | 2 | +5 | 12+DEX | 6 | 1d10+CON |

## Implementation in Foundry VTT

### Current System

The current implementation requires:

1. Creating a "Nonheroic" class item with `isNonheroic: true`
2. Adding that class to the character during chargen or level-up
3. All nonheroic rules (BAB, HP, defenses, Force Points) are automatically applied

### Recommended NPC Workflow

For streamlined NPC creation:

#### Option A: Template-Based (Recommended)
1. Use templates from `nonheroic-templates.json`
2. Templates automatically set abilities, skills, and feats
3. Apply template during chargen to skip individual selections
4. Creates character at Nonheroic 1 level

#### Option B: Manual Creation
1. Create character through normal chargen
2. During class selection, choose "Nonheroic" class
3. Select 3 starting feats from restricted list
4. Select skills (1 + INT modifier)
5. Set equipment and credits

### Creating a Nonheroic Class Item

If a "Nonheroic" class doesn't exist in the classes compendium, create one:

```json
{
  "name": "Nonheroic",
  "type": "class",
  "system": {
    "isNonheroic": true,
    "hitDie": "1d4",
    "babProgression": "medium",
    "defenses": {
      "fortitude": 0,
      "reflex": 0,
      "will": 0
    },
    "classSkills": [
      "acrobatics", "climb", "deception", "endurance",
      "gather_information", "initiative", "jump",
      "knowledge_bureaucracy", "knowledge_galactic_lore",
      "knowledge_life_sciences", "knowledge_physical_sciences",
      "knowledge_social_sciences", "knowledge_tactics",
      "knowledge_technology", "mechanics", "perception",
      "persuasion", "pilot", "ride", "stealth", "survival",
      "swim", "treat_injury", "use_computer"
    ],
    "forceSensitive": false,
    "talent_trees": []
  }
}
```

## Converting Non-Human NPCs

To create a non-human nonheroic character:

1. **Start with a template** (e.g., Trooper)
2. **Change species** to desired race
3. **Remove 1 feat** (humans get bonus feat)
4. **Remove 1 trained skill** (humans get bonus skill)
5. **Add species traits** (ability modifiers, special abilities)

**Example: Bothan Merchant**
- Base Template: Merchant
- Species: Bothan → +2 INT
- Remove 1 feat: Remove "Skill Training (Gather Information)"
- Remove 1 skill: Keep Persuasion and Use Computer
- Add Bothan trait: +2 Gather Information

## Quick Reference: Nonheroic vs Heroic

| Feature | Nonheroic | Heroic |
|---------|-----------|--------|
| HP per level | 1d4 + CON | 1d6-1d10 + CON |
| BAB progression | Custom table | Slow/Medium/Fast |
| Defense bonus | 10 + ability | 10 + level + ability |
| Force Points | 0 | 5 + ½ level |
| Talents | None | Yes |
| Ability increases | 1 per 4 levels | 2 per 4 levels |
| Feats | Normal | Normal |
| Starting feats | 3 (restricted) | 1 + bonus feats |

## Examples

### Example 1: Imperial Stormtrooper (Nonheroic 6)
```
Species: Human
Classes: Nonheroic 6
Abilities: STR 10, DEX 12, CON 10, INT 11, WIS 10, CHA 10

Defenses:
- Reflex: 13 (10 + 0 heroic + 1 DEX + 2 armor)
- Fortitude: 10 (10 + 0 heroic + 0 ability)
- Will: 10 (10 + 0 heroic + 0 WIS)

HP: 15 (6d4 average, ~15 HP)
BAB: +4 (from nonheroic table at level 6)
Force Points: 0

Feats: Armor Proficiency (Light), Weapon Proficiency (Rifles), Weapon Proficiency (Pistols)
Skills: Initiative +9, Perception +8
```

### Example 2: Veteran Soldier (Nonheroic 4 / Soldier 2)
```
Species: Human
Classes: Nonheroic 4, Soldier 2
Abilities: STR 13, DEX 14, CON 12, INT 10, WIS 11, CHA 8

Defenses:
- Reflex: 14 (10 + 2 heroic + 2 DEX)
- Fortitude: 14 (10 + 2 heroic + 1 CON + 2 class)
- Will: 12 (10 + 2 heroic + 0 WIS)

HP: 20 (4d4 + 2d10, average ~20 HP)
BAB: +5 (+3 nonheroic + +2 soldier)
Force Points: 6 (5 + 1 for level 2)

Talents: 1 from Soldier talent tree
Feats: Armor Prof (Light), Weapon Prof (Rifles/Pistols), Point-Blank Shot
```

## Notes for GMs

- **Mass NPCs**: Use templates for quick NPC creation
- **Important NPCs**: Consider giving them 1-2 heroic levels to make them more competent
- **Conversion**: Existing nonheroic data (in `nonheroic_units.json`) can be imported as-is
- **Balance**: Nonheroic NPCs are intentionally weaker than PCs - use groups or higher levels to challenge heroes

## Integration with Existing System

The nonheroic rules are already implemented in the following files:
- `scripts/data-models/item-data-models.js` - `isNonheroic` flag
- `scripts/data-models/character-data-model.js` - Defense/BAB/Force Point calculations
- `scripts/apps/levelup/levelup-shared.js` - HP gain and ability increases
- `scripts/apps/levelup/levelup-talents.js` - Talent restrictions

Templates are ready to use in `data/nonheroic-templates.json`.
