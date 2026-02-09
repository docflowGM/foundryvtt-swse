# SWSE Talent and Feat Implementation Architecture

## Executive Summary

The Foundry VTT SWSE system has a comprehensive but partially fragmented implementation of talent and feat selection across character generation and level-up flows. The system uses:
- **Database compendium packs** for storing talents and feats
- **Multi-step dialog systems** for character creation and level-up
- **Prerequisite validation** to ensure proper character building
- **Mentor-based narration** for immersive character progression

---

## 1. TALENT SELECTION UI COMPONENTS

### 1.1 Level Up Dialog (`SWSELevelUpEnhanced`)
**Location:** `/home/user/foundryvtt-swse/scripts/apps/swse-levelup-enhanced.js`

**Purpose:** Multi-step dialog for leveling up characters with visual talent tree selection

**Key Features:**
- Step-based navigation (class → multiclass-bonus → ability-increase → feat → talent → summary)
- Mentor-based greeting and guidance system
- Visual talent tree dialog with prerequisite visualization
- Prerequisite checking before allowing talent selection

**Talent Selection Step:**
```javascript
// Lines 1075-1150: _onSelectTalentTree() and _showTalentTreeDialog()
- Loads talents from swse.talents compendium
- Filters talents by tree name
- Builds prerequisite graph with dependencies
- Generates HTML visualization with SVG connection lines
- Allows clicking talent nodes to select
- Shows prerequisite highlighting on hover
```

**Data Structure:**
```javascript
this.selectedTalent = null;  // Stores selected talent object
this.talentData = null;      // Cached talent data from compendium
```

### 1.2 Character Sheet Talents Tab
**Location:** `/home/user/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs`

**Purpose:** Display and manage acquired talents on character sheet

**Features:**
- Filter buttons for talent trees
- Available talent selections counter
- Collapsible talent trees organized by tiers
- Visual talent nodes with lock/check indicators
- Acquired talents summary section

**Template Structure:**
- Talent trees organized by `.talent-tree` containers
- Each tier displayed with filter buttons
- Visual states: locked, acquired, available
- Prerequisite indicators with star icon

### 1.3 Character Generator (Narrative Enhanced)
**Location:** `/home/user/foundryvtt-swse/scripts/apps/chargen-narrative.js`

**Purpose:** Create characters with visual talent tree selection during character creation

**Features:**
- Narrative-based commentary from "Ol' Salty" mentor
- Talent tree visualization during character creation
- Same prerequisite graph system as level-up

**Key Methods:**
- `_loadTalentData()` - Loads talents from compendium
- `_onSelectTalentTree()` - Handles tree selection
- `_showTalentTreeDialog()` - Shows interactive talent tree

---

## 2. FEAT SELECTION UI COMPONENTS

### 2.1 Level Up Dialog Feat Step
**Location:** `/home/user/foundryvtt-swse/scripts/apps/swse-levelup-enhanced.js` (Lines 317-327)

**Feat Loading:**
```javascript
async _loadFeats() {
  // Loads from swse.feats compendium
  // Filters by class bonus feats
  // Validates prerequisites using PrerequisiteValidator
  // Marks qualified feats with isQualified flag
}
```

**Selection Mechanism:**
- Grid layout of feat cards
- Shows prerequisites and benefits
- Single or multiple feat selection (depending on implementation)
- Visual feedback for selected feats

**Data Structure:**
```javascript
this.selectedFeats = [];  // Array of selected feat objects
this.featData = null;     // Cached feat data from compendium
```

### 2.2 Feat Display in Character Sheet
**Location:** `/home/user/foundryvtt-swse/scripts/actors/character/swse-character-sheet.js`

**Features:**
- Force Secrets extraction (feats with "force secret" in name)
- Force Techniques extraction (feats with "force technique" in name)
- Combat actions mapping from feats
- Feat-granted actions display

**Feat Actions:**
```javascript
const featActions = FeatActionsMapper.getActionsByType(this.actor);
// Groups feat actions by type:
// - toggleable (can be turned on/off)
// - variable (have adjustable values)
// - standard (single-use actions)
// - passive (always-on bonuses)
```

### 2.3 Bonus Feat Selection in Level-Up
**Location:** `/home/user/foundryvtt-swse/templates/apps/levelup.hbs` (Lines 337-378)

**UI Elements:**
- Feat card grid with name, description, prerequisites
- Selected feats display section
- Navigation buttons (Back/Continue)

**Class-Specific Bonus Feats:**
- Checks `selectedClass.system.level_progression`
- Looks for `feat_choice` features
- Filters by `bonus_feat_for` array in feat system data
- Supports class-specific feat lists

---

## 3. TALENT TREE DATA STRUCTURES

### 3.1 Talent Compendium Format
**Location:** `/home/user/foundryvtt-swse/packs/talents.db`

**Current Structure:**
```json
{
  "_id": "unique_id",
  "name": "Talent Name",
  "type": "talent",
  "img": "path/to/icon.svg",
  "system": {
    "talent_tree": "Jedi Consular",
    "prerequisites": "Prerequisite Talent Name",
    "benefit": "Description of talent benefit",
    "description": "",
    "grantsActions": [],
    "grantsBonuses": {
      "skills": {},
      "combat": {},
      "other": {}
    },
    "toggleable": false,
    "toggled": false,
    "variable": false,
    "variableValue": 0
  },
  "effects": [],
  "folder": null,
  "sort": 0,
  "ownership": {"default": 0},
  "flags": {}
}
```

### 3.2 Talent Tree Organization
**Location:** `/home/user/foundryvtt-swse/packs/talent_trees.db`

**Talent Tree Reference:**
- Stored separately in talent_trees compendium
- Referenced by `talent_tree` field in talent items
- Used to filter available talents during selection

**Tree Distribution:**
- 853 total talents across multiple trees
- Examples: "Jedi Consular", "Gunslinger", "Bounty Hunter", etc.
- Trees associated with specific classes

### 3.3 Template Schema
**Location:** `/home/user/foundryvtt-swse/template.json`

**Talent Item Template:**
```javascript
"talent": {
  "templates": ["base"],
  "tree": "",                    // Talent tree name
  "grantsActions": [],           // Actions this talent grants
  "grantsBonuses": {
    "skills": {},               // Skill bonuses
    "combat": {},               // Combat-related bonuses
    "other": {}                 // Other bonuses
  },
  "toggleable": false,          // Can be toggled on/off
  "toggled": false,             // Current toggle state
  "variable": false,            // Has adjustable value
  "variableValue": 0            // Current variable value
}
```

### 3.4 Talent Enhancement System
**Location:** `/home/user/foundryvtt-swse/data/talent-enhancements.json`

**Purpose:** Link talents to combat actions they enhance

**Structure:**
```json
{
  "aim": {
    "baseAction": "Aim",
    "enhancements": [
      {
        "name": "Hunter's Mark",
        "requiredTalent": "Hunter's Mark",
        "talentTree": "Bounty Hunter",
        "trigger": "After aiming, if attack deals damage",
        "effect": {"type": "condition_track", "value": -1}
      }
    ]
  }
}
```

---

## 4. PREREQUISITE HANDLING

### 4.1 PrerequisiteValidator System
**Location:** `/home/user/foundryvtt-swse/scripts/utils/prerequisite-validator.js`

**Core Methods:**

1. **checkFeatPrerequisites(feat, actor, pendingData)**
   - Parses prerequisite string
   - Validates against actor and pending changes
   - Returns `{ valid: boolean, reasons: string[] }`

2. **checkTalentPrerequisites(talent, actor, pendingData)**
   - Checks for prerequisite talents
   - Accounts for pending talent selections during character creation
   - Talent prerequisites are comma-separated talent names

3. **checkClassPrerequisites(classDoc, actor, pendingData)**
   - Validates prestige class prerequisites
   - Checks hardcoded prerequisites from SWSE core rules

### 4.2 Prerequisite Parsing
**Lines 117-220 of prerequisite-validator.js:**

Supports parsing:
- **Ability scores:** "Dex 13", "Strength 15+", "Con 13 or higher"
- **BAB:** "BAB +1", "Base Attack Bonus +6"
- **Character level:** "Character level 3rd", "3rd level"
- **Class levels:** "Soldier 1", "Jedi 3"
- **Skill training:** "Trained in Use the Force"
- **Force Sensitivity:** "Force sensitive"
- **Feat requirements:** Named feats

### 4.3 Prerequisite Checking Logic

**Ability Check (Line 258-270):**
```javascript
static _checkAbilityPrereq(prereq, actor, pendingData) {
  const abilityScore = actor.system.abilities[prereq.ability]?.total || 10;
  const pendingIncreases = pendingData.abilityIncreases || {};
  const finalScore = abilityScore + (pendingIncreases[prereq.ability] || 0);
  
  if (finalScore < prereq.value) {
    return { valid: false, reason: `Requires ${prereq.ability.toUpperCase()} ${prereq.value}+` };
  }
  return { valid: true };
}
```

**Talent Prerequisites (Line 47-78):**
- Simple comma-separated list of prerequisite talent names
- Checks against both existing and pending talents
- No complex prerequisite logic needed

**Feat Prerequisites (Line 388-406):**
- Can reference other feats, abilities, skills, BAB, level, class levels
- Supports complex nested prerequisites

### 4.4 Pending Data Structure

Used during character creation/level-up to validate against pending changes:
```javascript
const pendingData = {
  selectedFeats: [],           // Feats selected in this level-up
  selectedClass: classDoc,     // Class being added
  abilityIncreases: {},        // Ability increases selected
  selectedSkills: [],          // Skills being trained
  selectedTalents: []          // Talents selected so far
};
```

---

## 5. EXISTING UI FOR SELECTION

### 5.1 Level-Up Dialog Template
**Location:** `/home/user/foundryvtt-swse/templates/apps/levelup.hbs`

**Step Flow:**
1. **Species Selection** (Level 0 only) - Grid of species cards
2. **Attributes Selection** (Level 0 only) - Point buy/roll system
3. **Class Selection** - Base and prestige class cards
4. **Multi-class Bonus** - Feat OR skill choice
5. **Ability Score Increase** - Ability increase buttons
6. **Feat Selection** - Feat card grid
7. **Talent Selection** - Talent tree buttons
8. **Summary** - Review and complete

**Talent Selection UI (Lines 380-417):**
```handlebars
{{#each talentTrees}}
  <button class="select-talent-tree choice-button" data-tree="{{this}}">
    <i class="fas fa-tree"></i>
    <span>{{this}}</span>
  </button>
{{/each}}
```

### 5.2 Mentor System
**Location:** `/home/user/foundryvtt-swse/scripts/apps/mentor-dialogues.js`

**Integration Points:**
- Mentor greeting changes based on class and level
- Mentor guidance updates per step
- Prestige class-specific mentors
- Mentor portrait displayed in level-up dialog

**Data Structure:**
```javascript
const MENTORS = {
  'Jedi': { name: 'Jedi Master', title: '...', portrait: '...' },
  'Soldier': { name: 'Captain', title: '...', portrait: '...' },
  'Scoundrel': { name: 'Ol\' Salty', title: '...', portrait: '...' },
  // ... etc for all classes and prestige classes
};
```

### 5.3 Character Generator Dialog
**Location:** `/home/user/foundryvtt-swse/scripts/apps/chargen.js` and variants

**Available Variants:**
- **chargen.js** - Basic character generator
- **chargen-improved.js** - Enhanced with better UI
- **chargen-narrative.js** - Narrative with Ol' Salty commentary

**Talent/Feat Selection During Chargen:**
- Same prerequisite validation
- Same talent tree visualization
- Limited feats based on class and species

---

## 6. CONFIGURATION AND SETTINGS

### 6.1 Talent Tree Restriction Setting
**Name:** `talentTreeRestriction`
**Values:**
- `"current"` - Only talent trees from currently selected class
- `"any"` - Talent trees from any class the character has levels in

**Usage in Level-Up:**
```javascript
const talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");
if (talentTreeRestriction === "current") {
  availableTrees = classDoc.system.talent_trees || [];
} else {
  // Get trees from all character classes
}
```

### 6.2 Multi-class Bonus Setting
**Name:** `multiclassBonusChoice`
**Values:**
- `"all_feats"` - All starting feats from the new class
- Other options: feat or skill choice

### 6.3 Other Relevant Settings
- `abilityIncreaseMethod` - "flexible" or "standard"
- `hpGeneration` - "maximum", "average", "roll", "average_minimum"
- `maxHPLevels` - Levels at which characters get maximum HP
- `groupDeflectBlock` - Special grouping for Block/Deflect talents

---

## 7. DATA FLOW DURING LEVEL-UP

### 7.1 Talent Selection Data Flow

```
1. SWSELevelUpEnhanced opened
   ↓
2. Class selected → _onSelectClass()
   - _getTalentTrees(classDoc)
   - Loads talent data
   ↓
3. User clicks talent tree button → _onSelectTalentTree()
   - _showTalentTreeDialog(treeName)
   ↓
4. Talent tree dialog rendered
   - Builds prerequisite graph
   - Organizes talents into tiers
   - Shows visual tree
   ↓
5. User clicks talent node
   - _selectTalent(talentName)
   - Validates prerequisites
   - Sets this.selectedTalent
   ↓
6. Talent added to character in _onCompleteLevelUp()
   - actor.createEmbeddedDocuments("Item", [talentObject])
```

### 7.2 Feat Selection Data Flow

```
1. Class selected → _getsBonusFeat() checks if level grants feat
   ↓
2. If feat bonus: show feat selection step
   ↓
3. _loadFeats() called
   - Loads from swse.feats compendium
   - Filters by class (bonus_feat_for)
   - Validates prerequisites
   ↓
4. Feats displayed in grid
   - Shows qualified feats
   - Shows prerequisites for unqualified
   ↓
5. User clicks feat → _onSelectBonusFeat()
   - Adds to this.selectedFeats
   ↓
6. Feat added to character in _onCompleteLevelUp()
   - actor.createEmbeddedDocuments("Item", featObjects)
```

---

## 8. CLASS INTEGRATION

### 8.1 Class Level Progression
**Location:** Class items have `system.level_progression` array

**Structure:**
```javascript
level_progression: [
  {
    level: 1,
    bab: 1,
    force_points: 0,
    features: [
      { type: "feat_choice", name: "Choose a feat", list: "class_feats" },
      { type: "talent_choice", name: "Choose a talent" },
      { type: "feat_grant", name: "Weapon Proficiency" }
    ]
  },
  // ... more levels
]
```

### 8.2 Detecting Feat/Talent Grants
**In _getsBonusFeat() and _getsTalent():**
- Checks `level_progression` for current class level
- Looks for features with type `"feat_choice"` or `"talent_choice"`
- If found, shows corresponding selection step

### 8.3 Prestige Class Features
**Integration:**
- Prestige classes have their own mentors
- Prestige class level is calculated from class item levels
- Starting features applied when prestige class taken

---

## 9. CURRENT LIMITATIONS AND GAPS

### 9.1 Schema Mismatches (From FEATS_TALENTS_ANALYSIS.md)

| Database Field | Template Field | Issue |
|---|---|---|
| `system.description` | `system.benefit` | Different field names |
| (missing) | `system.special` | Not in database |
| `system.talent_tree` | `system.tree` | Name mismatch |

### 9.2 Empty Active Effects
- All feats and talents have `effects: []`
- No automated mechanical bonuses
- Players manually track feat/talent effects

### 9.3 Missing Metadata
- `featType` not consistently populated
- Feat/talent descriptions often empty
- Limited-use feat tracking not configured

### 9.4 Talent Prerequisite System
- Simple comma-separated names only
- No complex prerequisite logic for talents
- Unlike feats, can't require abilities or BAB

---

## 10. KEY FILES SUMMARY

| File | Purpose |
|---|---|
| `scripts/apps/swse-levelup-enhanced.js` | Main level-up dialog with talent/feat selection |
| `scripts/apps/chargen-narrative.js` | Character creation with talent visualization |
| `scripts/utils/prerequisite-validator.js` | Prerequisite validation system |
| `scripts/actors/character/swse-character-sheet.js` | Character sheet display of talents/feats |
| `templates/apps/levelup.hbs` | Level-up UI template |
| `templates/actors/character/tabs/talents-tab.hbs` | Talents tab template |
| `packs/talents.db` | Talent compendium (853 talents) |
| `packs/feats.db` | Feat compendium (130 feats) |
| `packs/talent_trees.db` | Talent tree reference data |
| `data/talent-enhancements.json` | Talent enhancement system |
| `template.json` | Data schema definitions |

---

## 11. RECOMMENDED NEXT STEPS FOR OPTIMIZATION

1. **Migrate field names** to match template schema consistently
2. **Implement Active Effects** for talent/feat bonuses
3. **Expand prerequisite system** to handle complex talent requirements
4. **Add better UI feedback** for unqualified selections
5. **Create talent/feat dependency validation** to prevent conflicts
6. **Document feature automation** with clear player guides

