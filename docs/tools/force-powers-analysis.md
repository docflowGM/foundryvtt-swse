# Force Powers Database Analysis

## Current State

### Database Stats
- **Total Force Powers**: 31
- **File**: `packs/forcepowers.db`
- **Format**: NDJSON (Newline-Delimited JSON)

### Current Structure
```json
{
  "_id": "75838fe2c1165b3d",
  "name": "Battle Meditation",
  "type": "forcepower",
  "img": "icons/svg/item-bag.svg",
  "system": {
    "type": "Force",
    "action": "Standard Action",
    "target": "One target",
    "check_type": "Use the Force",
    "descriptor": [],
    "dc_chart": [],
    "maintainable": false,
    "sourcebook": "Saga Edition Core Rulebook",
    "tags": [],
    "description": ""
  }
}
```

### Data Model Schema (ForcePowerDataModel)
```javascript
{
  powerLevel: Number (1-6),
  discipline: String (telekinetic|telepathic|vital|dark-side|light-side),
  useTheForce: Number (DC),
  time: String (activation time),
  range: String,
  target: String,
  duration: String,
  effect: HTMLField,
  special: HTMLField,
  inSuite: Boolean,
  uses: { current: Number, max: Number }
}
```

## Problems Identified

### 1. **Schema Mismatch**
Database fields don't match the data model:

| Database Field | Data Model Field | Issue |
|---|---|---|
| `system.action` | `system.time` | Different field name |
| `system.check_type` | (missing) | Not in data model |
| `system.descriptor` | (missing) | Not in data model |
| `system.dc_chart` | (missing) | **Critical - Not in data model** |
| `system.maintainable` | (missing) | Not in data model |
| `system.description` | `system.effect` | Different field name/type |
| (missing) | `system.powerLevel` | Not in database |
| (missing) | `system.discipline` | Not in database |
| (missing) | `system.useTheForce` | Not in database |
| (missing) | `system.duration` | Not in database |

### 2. **Empty Data**
All force powers have:
- ❌ Empty descriptions
- ❌ Empty DC charts (all powers show `"dc_chart": []`)
- ❌ Empty descriptor arrays
- ❌ Missing power levels
- ❌ Missing disciplines
- ❌ Missing effect descriptions

###3. **Missing DC Table Implementation**

**What is a DC Chart?**
Many Force Powers in SWSE have variable effects based on the Use the Force skill check result. This is similar to how ship combat actions work (see `data/ship-combat-actions.json`).

**Example from Ship Combat**:
```json
{
  "notes": "DC 15: restore 1d4 HP. DC 20: restore 2d4 HP. DC 25: restore 3d4 HP."
}
```

**Force Powers that Need DC Charts**:
1. **Force Lightning** - Damage scales with check result
2. **Vital Transfer** - Healing scales with check result
3. **Move Object** - Object size/weight scales with check result
4. **Force Grip** - Damage/effects scale with check result
5. **Drain Energy** - Energy drained scales with check result
6. **Drain Life** - HP drained scales with check result
7. **Force Storm** - Area and damage scale with check result

**Proposed DC Chart Structure**:
```javascript
dc_chart: [
  {
    dc: 15,
    effect: "2d6 damage",
    description: "Target takes 2d6 lightning damage"
  },
  {
    dc: 20,
    effect: "4d6 damage",
    description: "Target takes 4d6 lightning damage"
  },
  {
    dc: 25,
    effect: "6d6 damage",
    description: "Target takes 6d6 lightning damage and is stunned for 1 round"
  },
  {
    dc: 30,
    effect: "8d6 damage + stun",
    description: "Target takes 8d6 lightning damage and is stunned for 1d4 rounds"
  }
]
```

### 4. **Force Power Classifications**

Based on Saga Edition rules, force powers should have:

**Power Levels**: 1-6 (like spell levels)
- Level 1: Basic powers (Force Grip, Mind Trick)
- Level 2-3: Intermediate powers
- Level 4-5: Advanced powers
- Level 6: Master powers (Force Storm)

**Disciplines**: Category of force power
- **Telekinetic**: Moving objects, throwing, etc. (Move Object, Force Thrust)
- **Telepathic**: Mind-affecting (Mind Trick, Battle Meditation)
- **Vital**: Life force manipulation (Vital Transfer, Force Body)
- **Dark Side**: Powers requiring Dark Side points
- **Light Side**: Powers requiring Light Side alignment

**Descriptors**: Additional tags
- [Mind-Affecting]
- [Telekinetic]
- [Dark Side]
- [Light Side]
- [Force Lightning]
- [Force Sensitive]

## Required Actions

### 1. Update Data Model
Add missing fields to `ForcePowerDataModel`:
```javascript
{
  // Keep existing fields
  powerLevel: Number,
  discipline: String,
  useTheForce: Number,
  time: String,
  range: String,
  target: String,
  duration: String,
  effect: HTMLField,
  special: HTMLField,
  inSuite: Boolean,
  uses: { current, max },

  // ADD NEW FIELDS
  descriptor: ArrayField(String),        // [Mind-Affecting], [Dark Side], etc.
  dcChart: ArrayField(SchemaField({      // DC-based effects
    dc: Number,
    effect: String,
    description: String
  })),
  maintainable: Boolean,                  // Can be maintained as Swift action
  sourcebook: String,                     // Reference
  page: Number,                           // Page number
  tags: ArrayField(String)                // Additional categorization
}
```

### 2. Populate Force Power Data
All 31 force powers need:
- ✅ Proper descriptions/effects
- ✅ Power levels (1-6)
- ✅ Disciplines
- ✅ Base Use the Force DCs
- ✅ DC charts (where applicable)
- ✅ Descriptors
- ✅ Duration information
- ✅ Range information
- ✅ Sourcebook references

### 3. Create Migration Script
Script to:
1. Back up current database
2. Add missing fields to each power
3. Convert field names (`action` → `time`, etc.)
4. Populate basic data for common powers
5. Validate structure matches data model

## Force Powers List (31 Total)

### Powers Requiring DC Charts (7)
1. **Force Lightning** - Damage: 2d6/4d6/6d6/8d6 based on DC 15/20/25/30
2. **Vital Transfer** - Healing: 1d6/2d6/3d6/4d6 based on DC 15/20/25/30
3. **Move Object** - Weight: Medium/Large/Huge/Gargantuan based on DC 15/20/25/30
4. **Force Grip** - Damage: 1d6/2d6/3d6/4d6 based on DC 15/20/25/30
5. **Drain Energy** - Damage to tech: 1d6/2d6/3d6/4d6 based on DC 15/20/25/30
6. **Drain Life** - HP drain: 1d6/2d6/3d6/4d6 based on DC 15/20/25/30
7. **Force Storm** - Area/Damage scaling

### Powers with Fixed DCs (24)
- Battle Meditation
- Battle Strike
- Battlemind
- Farseeing
- Force Body
- Force Cloak
- Force Defense
- Force Disarm
- Force Scream
- Force Sense
- Force Slam
- Force Strike
- Force Stun
- Force Thrust
- Force Track
- Force Weapon
- Inspire
- Malacia
- Mind Trick
- Negate Energy
- Rebuke
- Sever Force (Lesser)
- Sever Force
- Surge

## Next Steps

1. **Update `scripts/data-models/item-data-models.js`**
   - Add `descriptor`, `dcChart`, `maintainable`, `sourcebook`, `page`, `tags` fields
   - Ensure compatibility with existing code

2. **Create `tools/populate-force-powers.js`**
   - Migration script to add proper data to all 31 powers
   - Include DC charts for applicable powers
   - Add descriptions, levels, disciplines

3. **Update Force Power Sheet** (if exists)
   - Display DC charts in a table format
   - Show roll buttons for each DC tier
   - Integrate with Use the Force skill rolls

4. **Test Import/Export**
   - Verify powers import correctly from compendium
   - Test drag-and-drop to character sheets
   - Verify force suite functionality

## Example Populated Power

**Force Lightning** (after migration):
```json
{
  "name": "Force Lightning",
  "type": "forcepower",
  "img": "systems/swse/assets/icons/force-powers/force-lightning.png",
  "system": {
    "powerLevel": 4,
    "discipline": "dark-side",
    "useTheForce": 15,
    "time": "Standard Action",
    "range": "6 squares",
    "target": "One target",
    "duration": "Instantaneous",
    "effect": "<p>You create a powerful bolt of Force Lightning that leaps from your fingertips to strike your target.</p>",
    "special": "<p>This is a Dark Side power. Using it moves you one step closer to the dark side.</p>",
    "descriptor": ["Dark Side", "Force Lightning"],
    "dcChart": [
      {
        "dc": 15,
        "effect": "2d6",
        "description": "Target takes 2d6 lightning damage"
      },
      {
        "dc": 20,
        "effect": "4d6",
        "description": "Target takes 4d6 lightning damage"
      },
      {
        "dc": 25,
        "effect": "6d6 + stun 1 round",
        "description": "Target takes 6d6 lightning damage and is stunned for 1 round"
      },
      {
        "dc": 30,
        "effect": "8d6 + stun 1d4 rounds",
        "description": "Target takes 8d6 lightning damage and is stunned for 1d4 rounds"
      }
    ],
    "maintainable": true,
    "sourcebook": "Saga Edition Core Rulebook",
    "page": 95,
    "tags": ["attack", "damage", "dark-side"],
    "inSuite": false,
    "uses": {
      "current": 0,
      "max": 0
    }
  }
}
```

## Resources Needed

To properly populate force powers, we need:
1. Saga Edition Core Rulebook (Force Powers chapter)
2. Force Unleashed Campaign Guide
3. Jedi Academy Training Manual
4. Other sourcebooks with force powers

Alternatively, we can:
- Create basic versions with placeholder DC charts
- Allow GMs to customize through item sheets
- Provide a template for common power types
