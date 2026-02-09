# FoundryVTT SWSE System - Character Generation & Level Up Investigation

## Overview
This document traces the character generation and leveling code in the FoundryVTT SWSE system, with specific focus on class features and how a level 1 Noble character is created.

---

## 1. Where Does the System Get Class Information From?

### Primary Source: Compendium Database
- **Location**: `/packs/classes.db` (NDJSON format)
- **Type**: Foundry VTT compendium pack
- **Pack Name**: `swse.classes`
- **Fallback**: Loaded from `/data/classes-db.json` via `getClasses()` function

### Data Structure
Each class document in `classes.db` contains:
```javascript
{
  "_id": "unique_id",
  "name": "ClassName",
  "type": "class",
  "system": {
    "class_name": "ClassName",
    "base_class": true/false,
    "hit_die": "1d6",           // e.g., "1d6", "1d8", "1d10"
    "base_hp": 18,              // First level HP
    "starting_credits": "3d4 x 400",
    "trained_skills": 6,        // Number of trained skills at level 1
    "class_skills": [           // List of class skills
      "Deception", "Gather Information", ...
    ],
    "talent_trees": [           // Available talent trees
      "Influence", "Inspiration", ...
    ],
    "starting_features": [      // Features granted at level 1
      {
        "name": "Feature Name",
        "type": "class_feature|proficiency|feat_grant"
      }
    ],
    "level_progression": [      // Level-by-level progression
      {
        "level": 1,
        "bab": 0,               // Base Attack Bonus
        "features": [           // Features at this level
          {
            "name": "Defense Bonuses",
            "type": "class_feature"
          }
        ],
        "force_points": 5       // For Force-sensitive classes
      },
      // ... levels 2-20
    ]
  }
}
```

### Loading Classes in Code
**File**: `/scripts/core/swse-data.js`

```javascript
const CACHE = {};
const DATA_FILES = {
  classes: "classes-db.json"  // Points to JSON file, not compendium DB
};

async function getData(key) {
  if (!CACHE[key]) CACHE[key] = await loadJson(DATA_FILES[key]);
  return CACHE[key] || [];
}

export const getClasses = () => getData('classes');
```

**Alternative Source**: Character generation also loads directly from compendium:
```javascript
// From chargen.js _loadData() method
const packNames = {
  classes: "swse.classes"  // Compendium pack name
};

for (const [k, packName] of Object.entries(packNames)) {
  const pack = game.packs.get(packName);
  if (pack) {
    const docs = await pack.getDocuments();
    this._packs[k] = docs.map(d => d.toObject());
  }
}
```

---

## 2. How Does Character Generation/Leveling Work?

### Character Generation Flow
**Entry Point**: `/scripts/apps/chargen-init.js`

When user clicks "Create New Actor" in Actor Directory:
1. Dialog offers: "Use Character Generator" or "Create Manually"
2. Selecting "Use Character Generator" opens `CharacterGeneratorImproved`

**Main Generator**: `/scripts/apps/chargen-improved.js` extends `/scripts/apps/chargen.js`

#### Generation Steps (in order)
1. **Type Selection** - Living/Droid
2. **Species Selection** - Choose race/droid degree
3. **Ability Scores** - Point buy, standard array, or rolls
4. **Class Selection** - Choose base class
5. **Feats** - Select feat(s)
6. **Talents** - Select starting talent
7. **Skills** - Train skills based on class + INT
8. **Summary/Finish** - Create actor

### Class Selection During Character Gen
**File**: `/scripts/apps/chargen.js` `_onSelectClass()` method (line 1418)

When a class is selected:
1. Find class document from packs: `this._packs.classes.find(c => c.name === className)`
2. Extract and apply class properties:
   - **BAB**: `classDoc.system.babProgression`
   - **Hit Die**: Parse "1d6" → extract 6
   - **HP**: `hitDie + CON modifier`
   - **Defense Bonuses**: From class system
   - **Trained Skills**: `classDoc.system.trained_skills + INT mod + (Human bonus)`

### Leveling System
**Primary Handler**: `/scripts/apps/swse-levelup-enhanced.js`
**Basic Handler**: `/scripts/apps/swse-levelup.js`

#### Level Up Process
1. **Class Selection** - Choose which class to add/level
2. **Ability Increases** (if applicable at this level) - +2 total ability points
3. **Feat Selection** (if level grants bonus feat)
4. **Talent Selection** (if level grants talent)
5. **Summary** - Review and confirm
6. **Apply Changes**:
   - Create/update class item
   - Grant class features
   - Update HP, BAB, defenses
   - Apply ability increases with retroactive adjustments

#### Key Level-Up Methods

**`_applyClassFeatures(classDoc, classLevel)`** (line 1661)
- Extracts features from `level_progression[classLevel]`
- Creates feat items for proficiencies and class features
- Applies Force Points increases
- Checks for duplicate features before creating

**`_calculateDefenseBonuses()`** (line 1614)
- Called once per class (NOT per level)
- Uses `_getClassDefenseBonuses()` lookup table
- Examples:
  - Noble: +1 Reflex, +0 Fortitude, +2 Will
  - Soldier: +1 Reflex, +2 Fortitude, +0 Will

---

## 3. Tracing Level 1 Noble Character Creation

### Noble Class Base Stats
From `/packs/classes.db`:
```json
{
  "name": "Noble",
  "hit_die": "1d6",
  "base_hp": 18,
  "trained_skills": 6,
  "starting_credits": "3d4 x 400",
  "base_class": true,
  "bab": 0 (from level_progression[0])
}
```

### Step-by-Step Noble Character Creation

#### 1. **Class is Selected** (`_onSelectClass()`)
- Class found: `chargen.js:1423`
- Store in characterData: `this.characterData.classes = [{name: "Noble", level: 1}]`
- Extract stats:
  - `characterData.bab = 0` (babProgression)
  - `characterData.hp.max = 6 + CON_mod`
  - `characterData.hp.value = 6 + CON_mod`
  - Defense Bonuses applied to `characterData.defenses`
  - Trained Skills Available: `6 + INT_mod + (Human +1 if applicable)`

#### 2. **Actor is Created** (`_createActor()`)
- Creates actor document with:
  ```javascript
  {
    name: characterName,
    type: "character",
    system: {
      level: 1,
      race: "species_name",
      abilities: {...},
      hp: {max: hp, value: hp},
      bab: 0,
      defenses: {fortitude, reflex, will},
      skills: {trained: true/false for each}
    }
  }
  ```

#### 3. **Class Item is Created** (`_createActor()` continues)
- After actor is created, class item is added:
  ```javascript
  {
    type: 'class',
    name: 'Noble',
    system: {
      level: 1
    }
  }
  ```
  - Added via `await created.createEmbeddedDocuments("Item", [classItem])`

#### 4. **Other Items are Created**
- Feats selected during chargen
- Talent selected during chargen
- Any starting equipment/weapons

### No Automatic Feature Granting
**IMPORTANT**: The character generation does NOT automatically grant starting features like "Linguist" or weapon proficiencies. These are:
- Defined in the class data (`starting_features` array)
- Logged but not applied during chargen: `"Auto-applying: ${feature.name}"`
- NOT created as feat items on the character
- Would need manual implementation or should be created in chargen

---

## 4. What Class Features Should a Level 1 Noble Receive?

### Starting Features (Base Class)
From `classes.db`, Noble's `starting_features` array:

1. **Linguist*** (class_feature)
   - The asterisk indicates a special rule note
   - Likely grants bonus languages or language-learning capability

2. **Weapon Proficiency (Pistols)** (proficiency)
   - Grants proficiency with pistol weapons
   - No attack penalty with pistols

3. **Weapon Proficiency (Simple Weapons)** (proficiency)
   - Grants proficiency with all simple weapons
   - Prevents attack penalties

### Level 1 Specific Features
From `level_progression[0]` array:

1. **Defense Bonuses** (class_feature)
   - Noble Defense Progression: +1 Reflex, +0 Fortitude, +2 Will
   - Applied to defense calculations

2. **Starting Feats** (feat_grant)
   - Grants initial feats
   - Amount calculated as: `Math.ceil(level / 2)` = 1 feat at level 1
   - Bonus for Human: +1 feat

3. **Talent** (talent_choice)
   - Character selects ONE talent from available noble talent trees:
     - Influence, Inspiration, Leadership, Lineage, Fencing,
     - Ideologue, Disgrace, Collaborator, Loyal Protector,
     - Provocateur, Gambling Leader

### Other Level 1 Properties
- **Hit Points**: 1d6 + CON modifier (max at level 1)
  - Example: If CON mod = +2, HP = 8
- **Base Attack Bonus**: 0
- **Trained Skills**: 6 + INT modifier (+ 1 if Human)
- **Force Points**: 5 (standard for level 1, Noble not Force-sensitive)
- **Starting Credits**: 3d4 × 400 (300-1200 credits)
- **Class Skills** (allowed to train):
  - Deception, Gather Information, Initiative, Knowledge (all),
  - Perception, Persuasion, Pilot, Ride, Treat Injury, Use Computer

---

## 5. Code Files Reference

### Character Generation
- `/scripts/apps/chargen-init.js` - Entry point/hook
- `/scripts/apps/chargen.js` - Main generator (base class)
- `/scripts/apps/chargen-improved.js` - Enhanced generator
- `/scripts/apps/chargen-narrative.js` - Narrative/mentor system

### Level Up System
- `/scripts/apps/swse-levelup.js` - Basic level up (delegates to enhanced)
- `/scripts/apps/swse-levelup-enhanced.js` - Full-featured level up
  - 1717 lines, comprehensive feature handling
  - Supports prestige classes, multi-classing, ability increases
  - Integrated mentor system

### Core Data Loading
- `/scripts/core/swse-data.js` - Data loading functions
- `/scripts/core/world-data-loader.js` - World initialization

### Character Actor
- `/scripts/actors/character/swse-character-sheet.js` - Character sheet UI
- `/scripts/data-models/character-data-model.js` - Character data structure
- `/scripts/actors/base/swse-actor-base.js` - Base actor class

### Data Sources
- `/packs/classes.db` - Compendium pack (NDJSON format)
- `/data/classes-db.json` - JSON backup/alternative source
- `/packs/talents.db` - Talent definitions
- `/packs/feats.db` - Feat definitions
- `/packs/species.db` - Species/race definitions

---

## 6. Key Insights & Observations

### Architectural Observations

1. **Dual Data Sources**
   - Code loads classes from both compendium packs AND JSON files
   - Packs are primary during chargen (better support for documents)
   - JSON files used as fallback via `getClasses()` function

2. **Starting Features Not Automatically Granted**
   - `starting_features` array exists in class data
   - Code logs intention to apply: "Auto-applying: ${feature.name}"
   - But actual feature items are NOT created during chargen
   - This is likely intentional - features are narrative/rules-based, not mechanical

3. **Defense Bonuses Applied Once Per Class**
   - Stored in class item: `system.defenses`
   - Calculated once, not per level
   - Multi-classing accumulates bonuses from all classes

4. **Level-Up is Highly Flexible**
   - Supports base classes and prestige classes
   - Handles multi-classing with bonus selection
   - Includes ability score increases with retroactive HP adjustments
   - Integrated mentor/narration system for flavor

5. **Class Item Structure**
   - Classes stored as embedded items on character
   - Each class item has: name, level, defenses, hitDie
   - Allows multi-classing and tracking separate class levels

### Feature Granting Logic

**Current Implementation**:
- Features are defined but mostly not created as items
- Exception: Prestige class features at level 1 are checked in `_applyPrestigeClassFeatures()`
- Level-up system has `_applyClassFeatures()` but it's not called in normal flow

**What Actually Happens for Level 1 Noble**:
1. ✓ Class item created
2. ✓ HP calculated and set
3. ✓ Defense bonuses applied (stored but not always visible separately)
4. ✓ BAB set to 0
5. ✓ Trained skills pool set
6. ✗ Starting features NOT created as items
7. ✓ Player selects 1 feat
8. ✓ Player selects 1 talent (created as item)
9. ✗ Weapon proficiencies NOT automatically created

---

## 7. Questions for Implementation

If implementing automatic feature granting:

1. Should starting features create feat items on the character?
2. Should weapon proficiencies be tracked as items or stored in system data?
3. What about the "Linguist*" feature - how should this be implemented?
4. Should features be checked/applied during sheet rendering or only during creation?

---

## Conclusion

The SWSE system uses a well-organized compendium-based approach to class data. Classes are flexible documents that support multi-classing and prestige class progression. For level 1 Noble specifically, the mechanical parts (HP, BAB, defenses, skill pools) are properly calculated and applied, while narrative features are defined in the class data but not automatically instantiated as items on the character. This is likely by design - features can be referenced from the class item or manually managed as needed.
