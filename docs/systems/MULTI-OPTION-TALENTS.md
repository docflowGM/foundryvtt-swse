# Multi-Option Talents Guide

## Overview

Some talents provide multiple abilities or options that players can choose from during play. For example, **Pistol Duelist** grants three different actions that can each be used once per encounter.

## How It Works

The system **automatically displays multiple sub-abilities** when they share the same `talentName` in `talent-granted-abilities.json`.

### Example: Pistol Duelist

When a player has the "Pistol Duelist" talent, they will see **3 separate action cards**:

1. **End Game** - Halve target's Damage Threshold
2. **Snap Aiming** - Attack with +2 bonus (Aiming benefit)
3. **Stand Ready** - +4 Reflex Defense until end of next turn + attack

Each card:
- Has its own uses (1 per encounter each)
- Shows independent cooldowns
- Can be clicked/used separately
- Displays its own effects and description

## Implementation Pattern

### 1. All sub-abilities share the same `talentName`

```json
{
  "pistol-duelist-end-game": {
    "talentName": "Pistol Duelist",  // ← Same for all 3
    "name": "End Game",              // ← Unique name
    "id": "pistol-duelist-end-game"  // ← Unique ID
  },
  "pistol-duelist-snap-aiming": {
    "talentName": "Pistol Duelist",  // ← Same for all 3
    "name": "Snap Aiming",
    "id": "pistol-duelist-snap-aiming"
  }
}
```

### 2. Each has unique properties

- **Unique ID**: `pistol-duelist-[ability-name]`
- **Unique name**: The display name shown on the card
- **Independent uses**: Each ability tracks its own uses
- **Own effects**: Each can have different bonuses, rolls, etc.

### 3. Full Example Structure

```json
{
  "talent-name-option-1": {
    "id": "talent-name-option-1",
    "name": "Option 1",
    "talentName": "Parent Talent Name",
    "talentTree": "Appropriate Tree",
    "description": "What this option does...",
    "actionType": "standard",
    "uses": {
      "max": 1,
      "perEncounter": true,
      "perDay": false
    },
    "effects": [
      {
        "type": "bonus",
        "value": 2
      }
    ],
    "tags": ["relevant", "tags"],
    "icon": "fa-solid fa-icon-name"
  }
}
```

## Adding New Multi-Option Talents

### Step 1: Identify the options

Read the talent description and identify each distinct option or action.

Example: **Pistol Duelist** says "You can use each of the following Actions once per encounter"
- → This means 3 separate abilities

### Step 2: Create ability definitions

Add each option to `data/talent-granted-abilities.json` with:
- Same `talentName` for all options
- Unique `id` and `name` for each
- Appropriate `uses` (usually 1 per encounter for choice-based abilities)
- Specific `effects` or `roll` bonuses for each

### Step 3: Test

The `TalentAbilitiesEngine` will automatically:
1. Detect all abilities with matching `talentName`
2. Display them as separate cards
3. Track uses independently
4. Show cooldowns per ability

## Common Patterns

### Pattern 1: Choose One (Mutually Exclusive)

**Example**: Fool's Luck - "Choose one: +1 attack, +5 to skills, or +1 to defenses"

- Each option is a separate ability
- All share `talentName: "Fool's Luck"`
- When player uses one, others remain available
- Uses refresh per encounter

### Pattern 2: Multiple Techniques (Independent)

**Example**: Pistol Duelist - Multiple techniques, each 1/encounter

- Each technique is independent
- All share same `talentName`
- Each has own cooldown
- Player can use all in same encounter

### Pattern 3: Stance Options (Toggle)

**Example**: Lightsaber Forms - Different forms with different bonuses

- Each form is a separate ability
- `actionType: "swift"` or `"toggle"`
- May want mutual exclusion (only one form active)

## Technical Details

### How TalentAbilitiesEngine Handles It

```javascript
// Engine automatically groups by talentName
const actorTalents = actor.items.filter(i => i.type === 'talent');

for (const talent of actorTalents) {
  const matchingAbilities = talentAbilitiesData.abilities.filter(
    ability => ability.talentName === talent.name
  );
  
  // If matchingAbilities.length > 1, display multiple cards!
  // Each card is independent with own uses, effects, etc.
}
```

### Key Fields

- **talentName**: Must exactly match the talent item name
- **id**: Must be unique across all abilities
- **uses.max**: How many times can be used
- **uses.perEncounter**: Refreshes per encounter
- **uses.perDay**: Refreshes per day
- **actionType**: `standard`, `swift`, `free`, `reaction`, etc.

## Benefits

1. **No code changes needed** - Just add to JSON
2. **Automatic rendering** - Engine handles display
3. **Independent tracking** - Each ability tracks separately
4. **Clean UI** - Players see clear options
5. **Rules-accurate** - Matches SWSE design

## Examples in System

- **Pistol Duelist** (3 options)
- **Hunter's Target** (2 related abilities)
- More to come as talents are added!
