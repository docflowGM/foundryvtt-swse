# Talent and Feat Selection - Quick Reference Guide

## File Locations Map

### Core Level-Up System
- **Level-Up Dialog Logic:** `/scripts/apps/swse-levelup-enhanced.js` (2000 lines)
- **Level-Up Template:** `/templates/apps/levelup.hbs` (1160 lines)

### Character Creation
- **Character Generator:** `/scripts/apps/chargen.js` (200+ lines)
- **Narrative Generator:** `/scripts/apps/chargen-narrative.js` (250+ lines)
- **Character Template:** `/templates/apps/chargen.hbs`

### Character Sheet
- **Character Sheet Class:** `/scripts/actors/character/swse-character-sheet.js`
- **Talents Tab:** `/templates/actors/character/tabs/talents-tab.hbs`

### Prerequisite & Validation
- **Prerequisite Validator:** `/scripts/utils/prerequisite-validator.js` (444 lines)
- **Feat Actions Mapper:** `/scripts/utils/feat-actions-mapper.js`

### Data & Configuration
- **Template Schema:** `/template.json`
- **Talent Enhancements:** `/data/talent-enhancements.json`
- **Talent Compendium:** `/packs/talents.db` (853 talents)
- **Feat Compendium:** `/packs/feats.db` (130 feats)
- **Talent Trees:** `/packs/talent_trees.db`
- **Classes:** `/packs/classes.db`

### Mentor System
- **Mentor Dialogues:** `/scripts/apps/mentor-dialogues.js`

---

## Talent Selection Flow

### During Level-Up
```
SWSELevelUpEnhanced._onSelectClass()
  ├─ _getTalentTrees(classDoc)
  └─ Render talent tree selection buttons

_onSelectTalentTree(event)
  └─ _showTalentTreeDialog(treeName)
    ├─ Load talents from swse.talents compendium
    ├─ Filter by talent_tree field
    ├─ _buildTalentGraph(talents)
    │  └─ Parse prerequisites (comma-separated talent names)
    ├─ _organizeTalentsIntoTiers(talentGraph)
    └─ _generateTalentTreeHtml()
       └─ Render visual tree with SVG connections

User clicks talent node
  └─ _selectTalent(talentName)
    ├─ PrerequisiteValidator.checkTalentPrerequisites()
    └─ Set this.selectedTalent

_onCompleteLevelUp()
  └─ actor.createEmbeddedDocuments("Item", [talentObject])
```

### Configuration
- **Talent Tree Restriction:** Setting `talentTreeRestriction`
  - `"current"` - Only from selected class trees
  - `"any"` - From any class the character has

---

## Feat Selection Flow

### During Level-Up
```
SWSELevelUpEnhanced._onSelectClass()
  └─ _getsBonusFeat()
    └─ Check class.system.level_progression for feat_choice feature

If bonus feat available:
  └─ _loadFeats()
    ├─ Load from swse.feats compendium
    ├─ Filter by class bonus_feat_for array
    ├─ Validate prerequisites with PrerequisiteValidator
    └─ Mark qualified feats with isQualified flag

Feat grid displayed
  └─ Show feat cards with:
    ├─ Name
    ├─ Benefit description
    └─ Prerequisites (if unqualified)

User clicks feat → _onSelectBonusFeat()
  └─ Add to this.selectedFeats[]

_onCompleteLevelUp()
  └─ actor.createEmbeddedDocuments("Item", featObjects)
```

### Configuration
- **Multi-class Bonus:** Setting `multiclassBonusChoice`
  - Controls what bonus when taking 2nd base class

---

## Prerequisite Validation

### For Talents
```javascript
checkTalentPrerequisites(talent, actor, pendingData)
  // Parses: "Talent1, Talent2, Talent3"
  // Checks against:
  //   - actor.items (existing talents)
  //   - pendingData.selectedTalents (pending selections)
  // Returns: { valid: boolean, reasons: string[] }
```

### For Feats
```javascript
checkFeatPrerequisites(feat, actor, pendingData)
  // Parses:
  //   - Ability scores: "Dex 13"
  //   - BAB: "BAB +1"
  //   - Levels: "Character level 7"
  //   - Skills: "Trained in Use the Force"
  //   - Classes: "Soldier 1"
  //   - Force Sensitivity
  //   - Other feats: "Weapon Focus"
  // Returns: { valid: boolean, reasons: string[] }
```

---

## Data Structures

### Talent Item (In Compendium)
```javascript
{
  _id: "unique_id",
  name: "Talent Name",
  type: "talent",
  system: {
    talent_tree: "Tree Name",        // Field name in db
    prerequisites: "Prereq1, Prereq2", // Comma-separated talent names
    benefit: "Effect description",
    grantsActions: [],
    grantsBonuses: { skills: {}, combat: {}, other: {} },
    toggleable: false,
    toggled: false
  },
  effects: []
}
```

### Feat Item (In Compendium)
```javascript
{
  _id: "unique_id",
  name: "Feat Name",
  type: "feat",
  system: {
    prerequisites: "Prerequisite string",  // Complex format
    benefit: "Effect description",
    bonus_feat_for: ["Class1", "Class2"],  // Classes that can take as bonus
    grantsActions: [],
    grantsBonuses: { skills: {}, combat: {}, other: {} }
  },
  effects: []
}
```

### Level-Up Dialog State
```javascript
this.selectedTalent = null;        // Single selected talent
this.selectedFeats = [];           // Array of selected feats
this.talentData = null;            // Cached talent documents
this.featData = null;              // Cached feat documents
this.abilityIncreases = {};        // Pending ability score changes
```

### Pending Data (for validation)
```javascript
{
  selectedFeats: [],       // Feats selected in this level-up
  selectedClass: classDoc, // Class being added
  abilityIncreases: {},    // Ability increases selected
  selectedSkills: [],      // Skills being trained
  selectedTalents: []      // Talents selected so far
}
```

---

## UI Components

### Talent Tree Dialog
- **Container:** `.talent-tree-container`
- **Canvas:** SVG element for drawing connections
- **Nodes:** `.talent-node` with data-talent-name attribute
- **Click:** Selects talent and closes dialog
- **Hover:** Highlights prerequisites/dependents

### Feat Selection Grid
- **Container:** `.feat-selection-grid`
- **Cards:** `.feat-card` with data-feat-id attribute
- **Selected:** `.feat-card.selected` class
- **Unqualified:** Shows prerequisites in yellow text

### Talent Selection in Character Sheet
- **Tab:** `talents-tab`
- **Trees:** `.talent-tree` containers with filters
- **Tiers:** `.tree-tier` for each tier
- **Nodes:** `.talent-node` with states: locked, acquired, available

---

## Configuration Settings

| Setting | Name | Values | Usage |
|---------|------|--------|-------|
| `talentTreeRestriction` | Talent Tree Access | `"current"` or `"any"` | Which talent trees available during level-up |
| `multiclassBonusChoice` | Multi-class Bonus | `"all_feats"` or other | What multiclass characters get |
| `abilityIncreaseMethod` | Ability Increase | `"flexible"` or `"standard"` | How ability score increases work |
| `hpGeneration` | HP Generation | `"maximum"`, `"average"`, etc | How HP is calculated |

---

## Key Methods Reference

### SWSELevelUpEnhanced

#### Talent Methods
- `_getTalentTrees(classDoc)` - Get available talent trees for class
- `_onSelectTalentTree(event)` - Handle tree selection button click
- `_showTalentTreeDialog(treeName)` - Show interactive talent tree
- `_buildTalentGraph(talents)` - Create prerequisite graph
- `_generateTalentTreeHtml(treeName, talentGraph)` - Render visual tree
- `_organizeTalentsIntoTiers(talentGraph)` - Sort talents by prerequisites
- `_selectTalent(talentName)` - Select talent with prerequisite validation

#### Feat Methods
- `_loadFeats()` - Load and filter feats from compendium
- `_onSelectBonusFeat(event)` - Handle feat selection click
- `_getsBonusFeat()` - Check if class grants feat this level

#### Navigation
- `_onNextStep()` - Move to next dialog step
- `_onPrevStep()` - Move to previous dialog step

#### Completion
- `_onCompleteLevelUp()` - Apply all selections and level up character

### PrerequisiteValidator

- `checkFeatPrerequisites(feat, actor, pendingData)` - Validate feat prerequisites
- `checkTalentPrerequisites(talent, actor, pendingData)` - Validate talent prerequisites
- `checkClassPrerequisites(classDoc, actor, pendingData)` - Validate class prerequisites
- `_parsePrerequisites(prereqString)` - Parse prerequisite string into objects
- `filterQualifiedFeats(feats, actor, pendingData)` - Filter feats to qualified only
- `filterQualifiedTalents(talents, actor, pendingData)` - Filter talents to qualified only

---

## Common Customization Points

### Add a new setting
Edit `houserule-settings.js`, register setting with:
```javascript
game.settings.register("swse", "settingName", {
  name: "Display Name",
  hint: "Tooltip description",
  scope: "world",
  config: true,
  type: String,
  choices: { "value1": "Label 1", "value2": "Label 2" },
  default: "value1"
});
```

### Add talent prerequisite parsing
Add pattern to `prerequisiteValidator.js` `_parsePrerequisitePart()` method.

### Add feat prerequisite requirement
Add check to `prerequisiteValidator.js` `_checkSinglePrerequisite()` method.

### Change talent selection UI
Edit `/templates/apps/levelup.hbs` section with `currentStep: "talent"`.

### Add feat selection filter
Modify `_loadFeats()` in `swse-levelup-enhanced.js` to add additional filters.

---

## Troubleshooting

### Talents not appearing in selection
- Check `talent_tree` field matches exactly
- Verify talents are in `swse.talents` compendium
- Check prerequisite blocking with `PrerequisiteValidator.checkTalentPrerequisites()`

### Feats showing as unqualified
- Check `bonus_feat_for` array in feat's system data
- Verify prerequisites with PrerequisiteValidator
- Check `level_progression` in class has `feat_choice` feature

### Prerequisite validation failing
- Check `prerequisites` field format in talent/feat
- See parsing patterns in `prerequisiteValidator.js`
- Add console logging to `_checkSinglePrerequisite()`

