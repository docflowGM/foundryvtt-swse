# Feats and Talents Database Analysis

## Current State

### Database Stats
- **Total Feats**: 130
- **Total Talents**: 853
- **Feats File**: `packs/feats.db`
- **Talents File**: `packs/talents.db`
- **Format**: NDJSON (Newline-Delimited JSON)

### Current Feat Structure
```json
{
  "_id": "75ff82e2dd80091d",
  "name": "Greater Weapon Focus",
  "type": "feat",
  "img": "icons/svg/upgrade.svg",
  "system": {
    "description": "You gain a +1 bonus on attack rolls...",
    "prerequisite": "Weapon Focus..., base attack bonus +8",
    "sourcebook": "Saga Edition Core Rulebook",
    "page": 87,
    "tags": ["weapon", "attack", "bonus", "focus"],
    "bonus_feat_for": ["Soldier"]
  },
  "effects": [],  // Empty - no automated effects
  "folder": null,
  "sort": 0,
  "ownership": {"default": 0},
  "flags": {}
}
```

### Current Talent Structure
```json
{
  "_id": "7acc479dee2d3b10",
  "name": "Adept Negotiator",
  "type": "talent",
  "img": "icons/svg/item-bag.svg",
  "system": {
    "talent_tree": "Jedi Consular",
    "prerequisites": null,
    "benefit": "Standard action make a Persuasion check...",
    "description": ""  // Empty
  },
  "effects": [],  // Empty - no automated effects
  "folder": null,
  "sort": 0,
  "ownership": {"default": 0},
  "flags": {}
}
```

### Data Model Schema

**FeatDataModel:**
```javascript
{
  featType: String (general|force|species),
  prerequisite: HTMLField,
  benefit: HTMLField,
  special: HTMLField,
  normalText: HTMLField,
  uses: {
    current: Number,
    max: Number,
    perDay: Boolean
  }
}
```

**TalentDataModel:**
```javascript
{
  tree: String (required),
  prerequisite: HTMLField,
  benefit: HTMLField,
  special: HTMLField,
  uses: {
    current: Number,
    max: Number,
    perEncounter: Boolean,
    perDay: Boolean
  }
}
```

## Problems Identified

### 1. **Schema Mismatches**

| Database Field | Data Model Field | Issue |
|---|---|---|
| `system.description` | `system.benefit` | Different field names |
| (missing) | `system.special` | Not in database |
| (missing) | `system.normalText` | Not in database |
| (missing) | `system.featType` | Not in database |
| `system.talent_tree` | `system.tree` | Different field names |

### 2. **Empty Active Effects**
- All 130 feats have empty `effects: []` arrays
- All 853 talents have empty `effects: []` arrays
- No automated mechanical bonuses implemented
- Players must manually track feat/talent effects

### 3. **Missing Feat Metadata**
Many feats lack important data:
- `featType` not specified (general, force, species)
- `special` text not populated
- `normalText` not populated
- Uses tracking not set up for limited-use feats

### 4. **Missing Talent Metadata**
Talents lack:
- `description` field is almost always empty
- `special` text not populated
- Uses tracking not consistently set up
- Per-encounter vs per-day tracking not configured

## Automation Possibilities with Active Effects

Foundry VTT supports Active Effects to automatically modify character attributes. Here are feats/talents we can automate:

### **Category 1: Simple Bonuses** (Easiest - Direct stat modifiers)

#### Skill Bonuses
- **Skill Focus** - +5 to one skill
- **Educated** - +5 to Knowledge (Galactic History) and Knowledge (Social Sciences)
- **Linguist** - +5 to Deception and Persuasion
- **Sharp-Eyed** - +5 to Perception and Survival

**Active Effect Structure:**
```json
{
  "effects": [{
    "name": "Skill Focus (Perception)",
    "icon": "icons/svg/upgrade.svg",
    "changes": [
      {
        "key": "system.skills.perception.bonus",
        "mode": 2,  // ADD
        "value": "5",
        "priority": 20
      }
    ],
    "disabled": false,
    "duration": {},
    "flags": {}
  }]
}
```

#### Attack Bonuses
- **Weapon Focus** - +1 to attack with weapon group
- **Greater Weapon Focus** - Additional +1 to attack (stacks)
- **Point Blank Shot** - +1 to attack and damage within 6 squares
- **Precise Shot** - +2 vs targets with cover

**Active Effect Example:**
```json
{
  "effects": [{
    "name": "Weapon Focus (Pistols)",
    "changes": [
      {
        "key": "system.attackBonus.pistols",
        "mode": 2,
        "value": "1"
      }
    ]
  }]
}
```

#### Defense Bonuses
- **Armor Proficiency** - Remove armor check penalties
- **Dodge** - +1 to Reflex Defense
- **Mobility** - +2 to Reflex Defense vs attacks of opportunity
- **Improved Defenses** - +1 to all defenses

**Active Effect Example:**
```json
{
  "effects": [{
    "name": "Dodge",
    "changes": [
      {
        "key": "system.defenses.reflex.bonus",
        "mode": 2,
        "value": "1"
      }
    ]
  }]
}
```

#### Attribute/Save Bonuses
- **Toughness** - +5 hit points per level
- **Improved Damage Threshold** - +5 to Damage Threshold
- **Force Sensitivity** - Can make Use the Force checks untrained
- **Great Fortitude** - +2 to Fortitude Defense

### **Category 2: Conditional Bonuses** (Medium - Require flags/conditions)

These need conditional logic but can be partially automated:

- **Acrobatic Strike** - +2 to melee attack after tumbling
- **Combat Reflexes** - Extra attacks of opportunity
- **Rapid Strike** - -2 penalty, extra attack
- **Running Attack** - Move and full-round attack

**Implementation:**
- Add effects that can be toggled on/off
- Or add automation with flags that trigger under certain conditions

### **Category 3: Complex Mechanics** (Hard - Require custom code)

These require significant custom implementation:

- **Adaptable Talent** - Temporarily gain any talent
- **Burst of Speed** - Move as swift action (action economy)
- **Double Attack** - Make two attacks (action modification)
- **Cleave** - Attack multiple enemies (targeting logic)

### **Category 4: Passive Abilities** (Documentation only)

Some feats can't be automated but should have better documentation:

- **Vehicular Combat** - Use pilot in place of vehicle defenses
- **Starship Tactics** - Bonus to crew actions
- **Shake It Off** - Second Wind heals more

## Recommended Implementation Strategy

### Phase 1: Field Migration & Normalization
1. **Migrate field names** to match data model
   - `description` → `benefit`
   - `talent_tree` → `tree`

2. **Add missing fields**
   - `featType` for all feats (general/force/species)
   - `special` text where applicable
   - `normalText` for clarification

3. **Set up uses tracking**
   - Identify limited-use feats (e.g., Force Point feats)
   - Configure per-day/per-encounter tracking

### Phase 2: Simple Active Effects Implementation
Implement automated effects for ~50 most common feats:

**Skill Bonuses (10 feats):**
- Skill Focus
- Educated
- Linguist
- Sharp-Eyed
- Weapon Proficiency feats

**Attack/Damage Bonuses (15 feats):**
- Weapon Focus
- Greater Weapon Focus
- Weapon Specialization
- Greater Weapon Specialization
- Point Blank Shot
- Deadeye

**Defense Bonuses (10 feats):**
- Dodge
- Mobility
- Armor Proficiency series
- Improved Defenses
- Great Fortitude/Iron Will/Lightning Reflexes

**Hit Points/Threshold (5 feats):**
- Toughness
- Improved Damage Threshold
- Conditioned

**Special Abilities (10 feats):**
- Force Sensitivity
- Force Training
- Linguist (bonus languages)

### Phase 3: Talent Active Effects
Implement effects for most common talent bonuses:

**Jedi/Force Talents:**
- Deflect (defense bonus)
- Force Point Recovery
- Improved Force Blast
- Severing Strike

**Combat Talents:**
- Devastating Attack
- Improved Stealth
- Quick Draw
- Uncanny Dodge

**Skill Talents:**
- Contact (Persuasion)
- Improved Initiative
- Master Linguist

### Phase 4: Conditional/Toggle Effects
Implement toggleable effects for situational bonuses:

- Acrobatic Strike (toggle after tumble)
- Charging Fire (toggle when charging)
- Defensive Fighting (toggle defensive stance)

## Active Effect Structure Reference

### Basic Stat Modifier
```json
{
  "name": "Feat/Talent Name",
  "icon": "path/to/icon.svg",
  "changes": [
    {
      "key": "system.path.to.stat",
      "mode": 2,  // 0=CUSTOM, 1=MULTIPLY, 2=ADD, 3=DOWNGRADE, 4=UPGRADE, 5=OVERRIDE
      "value": "5",
      "priority": 20
    }
  ],
  "disabled": false,
  "duration": {
    "startTime": null,
    "seconds": null,
    "rounds": null,
    "turns": null
  },
  "flags": {},
  "origin": "Item.id",
  "transfer": true  // Apply to owning actor
}
```

### Multiple Changes
```json
{
  "name": "Point Blank Shot",
  "changes": [
    {
      "key": "system.attackBonus.ranged",
      "mode": 2,
      "value": "1"
    },
    {
      "key": "system.damageBonus.ranged",
      "mode": 2,
      "value": "1"
    }
  ],
  "flags": {
    "swse": {
      "conditional": "within 6 squares"
    }
  }
}
```

### Common Attribute Paths
```javascript
// Skills
"system.skills.{skillName}.bonus"
"system.skills.perception.total"

// Defenses
"system.defenses.reflex.bonus"
"system.defenses.fortitude.bonus"
"system.defenses.will.bonus"

// Attack/Damage
"system.attackBonus.melee"
"system.attackBonus.ranged"
"system.damageBonus.melee"

// Hit Points
"system.hitPoints.max"
"system.damageThreshold"
"system.damageReduction"

// Initiative
"system.initiative.bonus"

// Attributes
"system.attributes.str.mod"
"system.attributes.dex.bonus"
```

## Example Automated Feats

### 1. Skill Focus (Perception)
```json
{
  "name": "Skill Focus",
  "system": {
    "featType": "general",
    "benefit": "<p>You gain a +5 bonus on all checks with the selected skill.</p>",
    "prerequisite": "",
    "special": "<p>You can select this feat multiple times. Each time, it applies to a different skill.</p>",
    "tags": ["skill", "bonus"],
    "uses": { "current": 0, "max": 0, "perDay": false }
  },
  "effects": [{
    "name": "Skill Focus (Perception)",
    "changes": [{
      "key": "system.skills.perception.bonus",
      "mode": 2,
      "value": "5"
    }],
    "transfer": true
  }]
}
```

### 2. Weapon Focus (Rifles)
```json
{
  "name": "Weapon Focus",
  "system": {
    "featType": "general",
    "benefit": "<p>You gain a +1 bonus on attack rolls with weapons in the selected group.</p>",
    "prerequisite": "Proficiency with selected weapon group",
    "special": "<p>You can select this feat multiple times. Each time, it applies to a different weapon group.</p>",
    "tags": ["weapon", "attack", "bonus"],
    "uses": { "current": 0, "max": 0, "perDay": false }
  },
  "effects": [{
    "name": "Weapon Focus (Rifles)",
    "changes": [{
      "key": "system.attackBonus.rifles",
      "mode": 2,
      "value": "1"
    }],
    "transfer": true
  }]
}
```

### 3. Toughness
```json
{
  "name": "Toughness",
  "system": {
    "featType": "general",
    "benefit": "<p>You gain 5 hit points per character level.</p>",
    "prerequisite": "",
    "tags": ["defense", "hit-points"],
    "uses": { "current": 0, "max": 0, "perDay": false }
  },
  "effects": [{
    "name": "Toughness",
    "changes": [{
      "key": "system.hitPoints.bonusPerLevel",
      "mode": 2,
      "value": "5"
    }],
    "transfer": true
  }]
}
```

### 4. Force Sensitivity
```json
{
  "name": "Force Sensitivity",
  "system": {
    "featType": "force",
    "benefit": "<p>You can make Use the Force checks untrained. You gain 1 Force Power.</p>",
    "prerequisite": "",
    "special": "<p>If you have levels in a Force-using class, you add your full character level to Use the Force checks.</p>",
    "tags": ["force", "prerequisite"],
    "uses": { "current": 0, "max": 0, "perDay": false }
  },
  "effects": [{
    "name": "Force Sensitivity",
    "changes": [{
      "key": "system.skills.useTheForce.trained",
      "mode": 5,  // OVERRIDE
      "value": "true"
    }],
    "transfer": true
  }]
}
```

## Migration Script Requirements

### Script 1: `migrate-feats-db.js`
1. Backup current feats.db
2. For each feat:
   - Rename `description` to `benefit`
   - Determine `featType` from tags/prereqs
   - Populate `special` and `normalText` where available
   - Add basic Active Effects for ~50 automatable feats
3. Validate against data model
4. Write migrated database

### Script 2: `migrate-talents-db.js`
1. Backup current talents.db
2. For each talent:
   - Rename `talent_tree` to `tree`
   - Move `benefit` content to proper field
   - Populate `description` with overview
   - Add Active Effects for common talents
   - Set up uses tracking (per-encounter/per-day)
3. Validate against data model
4. Write migrated database

## Benefits of Implementation

### For Players:
- ✅ Automatic calculation of bonuses
- ✅ No need to manually track feat effects
- ✅ Fewer errors in character building
- ✅ Quick reference for what feats do

### For GMs:
- ✅ Easier to verify character correctness
- ✅ Faster character review
- ✅ Consistent application of rules
- ✅ Better balance oversight

### For the System:
- ✅ Professional, polished feel
- ✅ Competitive with other TTRPG systems
- ✅ Reduced learning curve
- ✅ Better player experience

## Next Steps

1. ✅ Create migration script for feats
2. ✅ Implement Active Effects for top 50 feats
3. ✅ Create migration script for talents
4. ✅ Implement Active Effects for common talents
5. ⚠️ Test in Foundry VTT to verify effects apply correctly
6. ⚠️ Document which feats/talents are automated
7. ⚠️ Create guide for players on using automated effects
