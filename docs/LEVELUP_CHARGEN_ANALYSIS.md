# SWSE Level-Up and Character Generation System - Detailed Analysis

## Executive Summary

This is a sophisticated character advancement system in a Foundry VTT Star Wars Saga Edition module. It features:
- **Multi-step level-up progression** with prerequisite validation at each stage
- **Character generation (chargen)** with full character creation flow
- **Comprehensive prerequisite checking** that prevents advancement when requirements aren't met
- **No built-in override or bypass mechanisms** for players
- **Complete error handling and user feedback** through notifications
- **Mentor system** with narrative feedback during advancement

---

## 1. LEVEL-UP SYSTEM IMPLEMENTATION

### File Structure
- **Main Application**: `/scripts/apps/levelup/levelup-main.js` (SWSELevelUpEnhanced)
- **Validation**: `/scripts/apps/levelup/levelup-validation.js`
- **Class Selection**: `/scripts/apps/levelup/levelup-class.js`
- **Shared Utilities**: `/scripts/apps/levelup/levelup-shared.js`
- **Feats**: `/scripts/apps/levelup/levelup-feats.js`
- **Talents**: `/scripts/apps/levelup/levelup-talents.js`
- **Skills**: `/scripts/apps/levelup/levelup-skills.js`
- **Force Powers**: `/scripts/apps/levelup/levelup-force-powers.js`
- **Wrapper**: `/scripts/apps/swse-levelup.js`
- **Enhanced Wrapper**: `/scripts/apps/swse-levelup-enhanced.js`

### Main Application Class: SWSELevelUpEnhanced

**Location**: `/scripts/apps/levelup/levelup-main.js`

**Structure**: `FormApplication` with tabbed interface

**Default Options**:
```javascript
{
  classes: ['swse', 'levelup-dialog'],
  template: 'systems/swse/templates/apps/levelup.hbs',
  width: 800,
  height: 600,
  resizable: true,
  submitOnChange: false,
  closeOnSubmit: false
}
```

**Level-Up Flow** (Dynamic Step Navigation):
1. **species** → (Level 0 only) Select character species
2. **attributes** → (Level 0 only) Assign ability scores
3. **class** → Select a class (base or prestige with prerequisites)
4. **multiclass-bonus** → (Only if multiclassing a base class) Choose feat or skill
5. **ability-increase** → (Levels 4, 8, 12, 16, 20) Allocate 2 ability points
6. **feat** → (If class grants bonus feat) Select from qualified feats
7. **talent** → (If class grants talent) Select from talent tree
8. **skills** → (Automatic from multiclass bonus selection)
9. **summary** → Review and confirm level-up

### Entry Point from Character Sheet

**File**: `/scripts/actors/character/swse-character-sheet.js`

```javascript
// Line 160
html.find('.level-up').click(this._onLevelUp.bind(this));

// Handler (Line 185-191)
async _onLevelUp(event) {
  event.preventDefault();
  SWSELogger.log('SWSE | Level up clicked');
  await SWSELevelUp.openEnhanced(this.actor);
}
```

---

## 2. CHARACTER GENERATION SYSTEM

### File Structure
- **Main Application**: `/scripts/apps/chargen/chargen-main.js` (CharacterGenerator)
- **Shared Utilities**: `/scripts/apps/chargen/chargen-shared.js`
- **Droid Creation**: `/scripts/apps/chargen/chargen-droid.js`
- **Species Selection**: `/scripts/apps/chargen/chargen-species.js`
- **Class Selection**: `/scripts/apps/chargen/chargen-class.js`
- **Abilities**: `/scripts/apps/chargen/chargen-abilities.js`
- **Skills**: `/scripts/apps/chargen/chargen-skills.js`
- **Feats & Talents**: `/scripts/apps/chargen/chargen-feats-talents.js`

### Main Application Class: CharacterGenerator

**Type**: `Application` (not FormApplication)

**Default Options**:
```javascript
{
  classes: ["swse", "chargen"],
  template: "systems/swse/templates/apps/chargen.hbs",
  width: 900,
  height: 700,
  title: "Character Generator"
}
```

**Character Generation Steps** (Full Creation Flow):

For **Living Characters**:
1. **name** → Enter character name
2. **type** → Choose living or droid
3. **species** → Select species (Core, KotOR, Clone Wars, etc.)
4. **abilities** → Point buy or rolling (25-30 points, racial modifiers applied)
5. **class** → Select starting class (Core classes only: Jedi, Noble, Scout, Scoundrel, Soldier)
6. **feats** → Select feats (1 base + 1 for Human species if applicable)
7. **talents** → Select talents from class trees
8. **skills** → Train skills (class skills + INT modifier)
9. **summary** → Review character
10. **shop** → Purchase equipment

For **Droid Characters**:
1. **name** → Enter droid name
2. **type** → Choose living or droid
3. **degree** → Select droid degree (1st-5th: affects ability mods)
4. **size** → Select size (affects AC and damage threshold)
5. **droid-builder** → Configure droid systems, locomotion, processor, appendages, accessories
6. **abilities** → Remaining steps same as living characters

### Key Differences: CharGen vs Level-Up

| Aspect | CharGen | Level-Up |
|--------|---------|----------|
| Initial Step | Name entry | Species/Class selection |
| Species Selection | Required | Not applicable (already established) |
| Point Buy | Full 25-30 points | N/A (already established) |
| Starting Feats | Fixed count | Conditional (class-based) |
| Class Restriction | Core classes only | Can access prestige classes (with prereqs) |
| Droid Support | Full droid builder | Basic support |
| Validation | Prerequisite filtering | Prerequisite validation at each step |

---

## 3. VALIDATION AND PREREQUISITE CHECKING

### PrerequisiteValidator Class

**Location**: `/scripts/utils/prerequisite-validator.js`

**Main Validation Methods**:

#### checkFeatPrerequisites()
```javascript
checkFeatPrerequisites(feat, actor, pendingData = {})
Returns: { valid: boolean, reasons: string[] }
```

**Prerequisite Types Supported**:
1. **Ability Scores**: "DEX 13", "Strength 15+"
2. **BAB**: "BAB +7", "Base Attack Bonus +6"
3. **Character Level**: "Level 5", "Character level 12"
4. **Class Level**: "Soldier 1", "Jedi 3"
5. **Skill Training**: "Trained in Mechanics", "Use the Force"
6. **Force Sensitivity**: Checks for Force Sensitivity feat or class
7. **Feat Prerequisites**: Named feat requirements

#### checkTalentPrerequisites()
- Checks comma-separated talent names from prerequisite field
- Validates character has prerequisite talents
- Considers pending talents from current level-up

#### checkClassPrerequisites()
- **Base Classes**: No prerequisites (always available)
- **Prestige Classes**: Hardcoded prerequisites from SWSE rules

### Prestige Class Prerequisites (Hardcoded)

**Location**: `/scripts/apps/levelup/levelup-validation.js` (Lines 15-67)

Examples:
```javascript
"Ace Pilot": "Character Level 7, Trained in Pilot, Vehicular Combat",
"Force Adept": "Character Level 7, Trained in Use the Force, Force Sensitivity, 3 Force Talents",
"Jedi Knight": "BAB +7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Member of The Jedi",
"Jedi Master": "Character Level 12, Trained in Use the Force, ..., 1 Force Technique, Member of The Jedi",
// ... 63+ prestige classes
```

### Validation Flow

```
User Selects Action
  ↓
validateCurrentStep() (chargen-main.js line 400)
  ├─ Check name not empty
  ├─ Check species selected
  ├─ Check class selected
  ├─ Check droid builder requirements
  └─ Return false if validation fails
      ↓ (Show warning notification)
  ↓
Proceed to next step OR
Show error notification
```

### Prerequisite Checking Process

1. **Parse Prerequisites**: Split by comma/semicolon, extract structured data
2. **Check Each Prerequisite Type**:
   - Extract ability score, BAB, level, etc.
   - Compare against actor's current stats
   - Include pending data from current advancement
3. **Accumulate Reasons**: Collect all unmet prerequisites
4. **Return Result**: `{ valid: boolean, reasons: string[] }`

---

## 4. ADVANCEMENT BLOCKING AND VALIDATION ERRORS

### What Gets Blocked During Level-Up

#### At Ability Increase Step (Line 550-555 in levelup-main.js)
```javascript
const totalAllocated = Object.values(this.abilityIncreases)
  .reduce((sum, val) => sum + val, 0);
if (totalAllocated < 2) {
  ui.notifications.warn("You must allocate all 2 ability points before continuing!");
  return;  // BLOCKS advancement
}
```

#### At Feat Selection Step (Line 565-569)
```javascript
if (this.selectedFeats.length === 0) {
  ui.notifications.warn("You must select a feat before continuing!");
  return;  // BLOCKS advancement
}
```

#### At Talent Selection Step (Line 576-581)
```javascript
if (!this.selectedTalent) {
  ui.notifications.warn("You must select a talent before continuing!");
  return;  // BLOCKS advancement
}
```

### What Gets Blocked During Talent Selection (Line 460-473)

```javascript
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) return null;

  // Check prerequisites
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(
      `Cannot select ${talentName}: ${check.reasons.join(', ')}`
    );
    return null;  // BLOCKS selection
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
```

### User Feedback When Blocked

All blocked actions produce UI notifications with specific messages:

**Types of Notifications**:
1. **Warning (.warn)**: Yellow/orange, for invalid selections or missing choices
   - "You must allocate all 2 ability points..."
   - "You must select a feat before continuing..."
   - "Cannot select {talent}: {reason}"

2. **Error (.error)**: Red, for critical failures
   - "Species compendium not found!"
   - "Failed to complete level up. See console for details."

3. **Info (.info)**: Green/blue, for successful actions
   - "Species selected: {name}"
   - "Selected feat: {name}"
   - "+1 to STR (Total increases: 1/2)"

---

## 5. CAN PLAYERS OVERRIDE OR BYPASS ERRORS?

### Direct Answer: **NO**

#### Key Findings:

1. **No Bypass Mechanisms Exist**
   - No "Force Advance" button
   - No "Skip Validation" option
   - No "Admin Override" flag
   - No permission checks that would allow GM bypass

2. **No Override Logic Found**
   - Search for: `isGM`, `game.user.isGM`, `permission`, `admin`, `bypass`, `force`
   - **Result**: No matches in levelup system
   - Validation is uniform for all players

3. **Blocking is Hard-Coded**
   ```javascript
   if (!check.valid) {
     ui.notifications.warn(`Cannot select...`);
     return null;  // HARD STOP - no bypass
   }
   ```

4. **No Try-Catch Exception Handling**
   - All error conditions return `null` or `false`
   - No silent override of failures
   - Errors always surface to user

### What Players See When Blocked

When an advancement requirement blocks progress:
1. **Warning notification appears** with specific reason
2. **Action is rejected** (returned null)
3. **UI state unchanged** - the invalid selection isn't applied
4. **Dialog stays open** - player can retry with correct selection

Example from talent selection:
```javascript
// If prerequisites not met:
ui.notifications.warn(`Cannot select Telekinesis: Requires talent: Force Sensitivity`)
// The talent is NOT added to characterData
// The dialog does NOT close
// Player can select a different talent instead
```

---

## 6. WHAT HAPPENS WHEN ADVANCEMENT IS BLOCKED

### Scenario 1: Missing Required Ability Score
```
Player tries to select a prestige class requiring "STR 15"
They have STR 12

Flow:
1. getAvailableClasses() called (levelup-class.js line 17)
2. meetsClassPrerequisites() checks each class (levelup-validation.js line 76)
3. PrerequisiteValidator.checkClassPrerequisites() runs
4. _checkAbilityPrereq() compares 12 < 15
5. Returns { valid: false, reason: "Requires STR 15+ (you have 12)" }
6. Class is NOT added to availableClasses array
7. UI doesn't show that prestige class as an option
8. Player sees only available classes
9. No error message shown (silently filtered)
```

### Scenario 2: Attempting Invalid Feat Selection
```
Player tries to select "Force Sense" feat without Force Sensitivity

Flow:
1. selectBonusFeat() called (levelup-feats.js line 96)
2. loadFeats() pre-filters with filterQualifiedFeats()
3. PrerequisiteValidator marks feat as isQualified: false
4. UI displays feat in disabled/dimmed state or excludes it
5. If player somehow attempts selection:
   - checkFeatPrerequisites() returns { valid: false, reasons: [...] }
   - selectBonusFeat() returns null
   - Notification shows why it failed
6. Feat is NOT added to selectedFeats
7. Player cannot proceed without valid selection
```

### Scenario 3: Missing Talent Prerequisites
```
Player tries to select "Master" talent without "Novice" prerequisite

Flow:
1. selectTalent() called (levelup-talents.js line 460)
2. checkTalentPrerequisites() parses talent prerequisites
3. Finds "Requires talent: Novice"
4. Checks actor.items and pendingData for "Novice" talent
5. Not found - prerequisites not met
6. Returns { valid: false, reasons: ["Requires talent: Novice"] }
7. ui.notifications.warn() shows: "Cannot select Master: Requires talent: Novice"
8. selectTalent() returns null
9. selectedTalent is NOT updated
10. Dialog stays open, talent tree remains displayed
```

### Scenario 4: Incomplete Ability Score Allocation
```
Player allocated only 1/2 ability points and clicks Next

Flow:
1. _onNextStep() called (levelup-main.js line 527)
2. Calculates totalAllocated = 1 (only 1 point assigned)
3. Checks: if (totalAllocated < 2)
4. Condition is TRUE
5. Shows notification: "You must allocate all 2 ability points..."
6. Function returns early (doesn't proceed)
7. this.currentStep remains "ability-increase"
8. Dialog re-renders to same step
9. Player must allocate remaining point
```

### Scenario 5: No Feat Selection When Required
```
Player skips feat selection and clicks Next

Flow:
1. _onNextStep() called (levelup-main.js line 564)
2. Checks: if (this.selectedFeats.length === 0)
3. Condition is TRUE
4. Shows notification: "You must select a feat..."
5. Function returns early (doesn't proceed)
6. Dialog stays on feat selection step
7. Player MUST select a feat to continue
8. No way to skip or bypass this requirement
```

---

## 7. ADVANCEMENT BLOCKING CONDITIONS SUMMARY

### Ability Increases (Levels 4, 8, 12, 16, 20)
- **Blocks**: Less than 2 points allocated
- **Error Message**: "You must allocate all 2 ability points before continuing!"
- **Solution**: Allocate 2 points to abilities (flexible or standard method based on setting)

### Feat Selection (Class-Specific)
- **Blocks**: No feat selected when class grants bonus feat
- **Error Message**: "You must select a feat before continuing!"
- **Solution**: Select qualified feat from available list
- **Note**: Feats are pre-filtered by prerequisites; unqualified feats can't be selected

### Talent Selection (Class-Specific)
- **Blocks**: No talent selected when class grants talent
- **Error Message**: "You must select a talent before continuing!"
- **Solution**: Select qualified talent from talent tree
- **Prerequisite Blocks**: 
  - "Cannot select {talent}: Requires talent: {prerequisite}"
  - "Cannot select {talent}: Requires feat: {prerequisite}"
  - "Cannot select {talent}: Requires Force Sensitivity"

### Prestige Class Selection
- **Blocks**: Character level < required (e.g., level 7)
- **Error Message**: Silently filtered from available classes
- **Blocks**: Missing trained skills (e.g., "Trained in Pilot")
- **Blocks**: Missing base attack bonus (e.g., "BAB +7")
- **Blocks**: Missing feats or force sensitivity
- **Solution**: Meet prerequisites and try again at higher level

### Character Generation Name Step
- **Blocks**: Name is empty or only whitespace
- **Error Message**: "Please enter a character name."
- **Solution**: Enter a valid character name

### Character Generation Species Step
- **Blocks**: No species selected
- **Error Message**: "Please select a species."
- **Solution**: Click a species to select

### Character Generation Class Step
- **Blocks**: No class selected
- **Error Message**: "Please select a class."
- **Solution**: Click a class to select

### Character Generation Droid Builder Step
- **Blocks**: Droid systems don't meet requirements
- **Error Message**: Various (insufficient points, etc.)
- **Solution**: Reconfigure droid systems

---

## 8. ERROR MESSAGES AND USER FEEDBACK

### Notification Categories

#### Information Messages (.info)
```
"Species selected: {name}"
"Selected feat: {name}"
"Selected talent: {name}"
"+1 to STR (Total increases: 1/2)"
"Ability scores confirmed"
"Selected trained skill: {skillName}"
"Constitution increased! You gain {HP} retroactive HP!"
"Level {X}! You gain a bonus general feat."
```

#### Warning Messages (.warn)
```
"You've already allocated 2 ability points!"
"You can't add more than 2 points to a single ability!"
"Standard method: You must allocate to 2 different attributes!"
"You must allocate all 2 ability points before continuing!"
"You must select a feat before continuing!"
"You must select a talent before continuing!"
"Cannot select {talent}: {reason}"
"No talents found for {treeName}"
"Not enough point-buy points remaining."
```

#### Error Messages (.error)
```
"Species compendium not found! Please check..."
"Species \"{name}\" not found! The species compendium may be empty..."
"Class not found!"
"Failed to roll dice. Please try again."
"Failed to complete level up. See console for details."
"Failed to open the character generator."
```

### Logger Output (Console)
All major actions logged with `SWSELogger.log()` or `SWSELogger.error()`:
```
"SWSE LevelUp | HP gain: X (d6, method: average)"
"SWSE LevelUp | Selected feat: {name}"
"SWSE LevelUp | Cannot select {talent}: {reason}"
"SWSE LevelUp | Increasing {ability} by +{increase}"
```

---

## 9. DETAILED FUNCTION FLOW EXAMPLES

### Example 1: Complete Valid Level-Up Flow

```javascript
// 1. User clicks "Level Up" button on character sheet
_onLevelUp(event)
  → SWSELevelUp.openEnhanced(actor)
    → new SWSELevelUpEnhanced(actor).render(true)

// 2. Dialog shown with class selection
getData()
  → getAvailableClasses(actor, pendingData)
    → Check prerequisites for each class
    → Return only classes where meetsClassPrerequisites() = true
  → Show template with filtered classes

// 3. User selects class (e.g., "Soldier")
_onSelectClass(event)
  → selectClass(classId, actor, context)
  → Calculate HP gain: calculateHPGain(classDoc, actor, newLevel)
  → Determine next step based on what this level grants
    → Check getsAbilityIncrease(newLevel) = true at level 4?
    → Check getsBonusFeat(selectedClass, actor) = true?
    → Check getsTalent(selectedClass, actor) = true?
  → this.currentStep = 'ability-increase'
  → this.render()

// 4. Ability increase step shown
_onAbilityIncrease(event)
  → Get ability from event data
  → Calculate totalAllocated
  → Check flexible vs standard method from settings
  → Validate not exceeding 2 points total
  → this.abilityIncreases[ability]++
  → Show info notification
  → this.render()

// 5. User clicks Next after allocating 2 points
_onNextStep()
  → Check totalAllocated >= 2 ✓
  → Check if next step is feat
  → this.currentStep = 'feat'
  → this.render()

// 6. Feat selection shown
_loadFeats()
  → Load feats from 'swse.feats' compendium
  → filterQualifiedFeats(featObjects, actor, pendingData)
    → Each feat: checkFeatPrerequisites()
    → Mark with isQualified: true/false
  → Filter to available feats
  → return filteredFeats

// 7. User selects feat
_onSelectBonusFeat(event)
  → selectBonusFeat(featId, featData, selectedFeats)
  → Find feat in filtered list
  → Check not already selected
  → this.selectedFeats.push(feat)
  → Show info notification
  → this.render()

// 8. User clicks Next
_onNextStep()
  → Check selectedFeats.length > 0 ✓
  → Check if next step is talent
  → this.currentStep = 'talent'
  → this.render()

// 9. Talent selection step shown
getData()
  → getTalentTrees(selectedClass, actor)
  → Load talent data from 'swse.talents' compendium
  → show via TalentTreeVisualizer

// 10. User selects talent
_selectTalent(talentName)
  → selectTalent(talentName, talentData, actor, pendingData)
    → Find talent by name
    → checkTalentPrerequisites(talent, actor, pendingData)
      → Parse prerequisites
      → Check character has them ✓
      → return { valid: true, reasons: [] }
    → return talent
  → this.selectedTalent = talent
  → Show info notification

// 11. User clicks Next
_onNextStep()
  → Check selectedTalent exists ✓
  → No more steps applicable
  → this.currentStep = 'summary'
  → this.render()

// 12. Summary step shown
summary tab displays all selections

// 13. User clicks "Complete Level Up"
_onCompleteLevelUp(event)
  → Store level 1 class in flags if level 1
  → createOrUpdateClassItem(selectedClass, actor)
  → Create talent item in actor
  → Create feat items in actor
  → Apply ability score increases to actor.system.abilities.*.base
  → Update actor.system.level = newLevel
  → Update actor.system.hp
  → Apply class features
  → Recalculate BAB and defenses
  → Create chat message with mentor narration
  → Close dialog
  → Rerender actor sheet
  → Show success notification

actor.sheet.render(true)
```

### Example 2: Blocked Feat Selection (Missing Prerequisite)

```javascript
// User has STR 12, tries to select "Power Attack" (requires STR 13)

_onSelectBonusFeat(event)
  → selectBonusFeat(featId, featData, selectedFeats)
  
  // However, the feat was already filtered during getData()
  // So it's NOT in the available feats list shown to user
  
  // If feat somehow appeared (UI bug):
  → _loadFeats()
    → filterQualifiedFeats(featObjects, actor, pendingData)
      → For "Power Attack" feat:
        → checkFeatPrerequisites(feat, actor, pendingData)
          → parsePrerequisites("STR 13")
          → _checkAbilityPrereq({type: 'ability', ability: 'str', value: 13}, actor)
            → abilityScore = 12
            → 12 < 13 = TRUE (FAILED)
            → return { valid: false, reason: "Requires STR 13+ (you have 12)" }
          → return { valid: false, reasons: ["Requires STR 13+ (you have 12)"] }
        → Mark isQualified: false on feat object
  
  // Feat marked as isQualified: false
  // UI filters to only show isQualified: true feats
  // Feat never appears as selectable option
  // User never sees it and can't select it
```

### Example 3: Blocked Talent Selection with Error Message

```javascript
// User has "Novice Talent" but tries to select "Master Talent"

_selectTalent(talentName)
  → selectTalent("Master Talent", talentData, actor, pendingData)
    → Find talent = "Master Talent"
    → checkTalentPrerequisites(talent, actor, pendingData)
      → prereqString = "Novice Talent"
      → prereqNames = ["Novice Talent"]
      → characterTalents = [] (no talents yet)
      → pendingTalents = [] (no pending talents)
      → allTalents = []
      → Loop: "Novice Talent" not in []
      → reasons.push("Requires talent: Novice Talent")
      → return { valid: false, reasons: ["Requires talent: Novice Talent"] }
    
    → !check.valid = TRUE
    → ui.notifications.warn(
        `Cannot select Master Talent: Requires talent: Novice Talent`
      )
    → return null
  
  → this.selectedTalent = null (unchanged)
  → Dialog stays open
  → Talent tree still displayed
  → Player must select "Novice Talent" first
```

---

## 10. SYSTEM ARCHITECTURE PATTERNS

### Validation Pattern: Two-Phase Filtering

**Phase 1: Pre-filtering** (During getData)
```javascript
// Show only items character can select
const filteredFeats = filterQualifiedFeats(
  featObjects, 
  actor, 
  pendingData
);
// Return only { isQualified: true } feats to template
context.availableFeats = filteredFeats.filter(f => f.isQualified);
```

**Phase 2: Runtime Validation** (During selection)
```javascript
// Double-check selection is still valid
const check = checkFeatPrerequisites(selectedFeat, actor, pendingData);
if (!check.valid) {
  ui.notifications.warn(...);
  return null; // REJECT selection
}
```

### Blocking Pattern: Return Null or False

**Consistent Pattern Across All Validation**:
```javascript
// If validation fails, return null/false and show notification
if (!validation) {
  ui.notifications.warn("Message");
  return null;  // Don't apply change
}

// If validation passes, apply and return result
return selectedItem;  // Apply change
```

### Prerequisite Checking Pattern: Structured Objects

```javascript
// Parse flexible prerequisite string into structured data
const prereq = _parsePrerequisitePart("STR 13");
// Returns: { type: 'ability', ability: 'str', value: 13 }

// Then check specific type
switch (prereq.type) {
  case 'ability': return _checkAbilityPrereq(prereq, actor);
  case 'bab': return _checkBABPrereq(prereq, actor);
  // etc...
}
```

---

## 11. SETTINGS AND CONFIGURATION

### Game Settings Used in Level-Up

**Location**: Settings checks in getData() and event handlers

```javascript
// Multiclass bonus choice method
game.settings.get("swse", "multiclassBonusChoice")
// Options: "feat" or "skill"

// Talent tree restriction
game.settings.get("swse", "talentTreeRestriction")
// Options: "current" (only current class trees) or "any" (any class tree)

// Ability increase method
game.settings.get("swse", "abilityIncreaseMethod")
// Options: "flexible" (1+1 or 2 to one) or "standard" (must be 2 different)

// HP generation method
game.settings.get("swse", "hpGeneration")
// Options: "maximum", "average", "roll", "average_minimum"

// Max HP levels (levels where you get full HD)
game.settings.get("swse", "maxHPLevels")
// Default: 1 (only first level gets full d6)

// Point buy pools for chargen
game.settings.get("swse", "droidPointBuyPool")  // Default: 20
game.settings.get("swse", "livingPointBuyPool") // Default: 25

// Group Deflect/Block talents
game.settings.get("swse", "groupDeflectBlock")
```

### No Permission-Based Settings

**Important Finding**: No game settings control:
- Whether players can use level-up dialog
- Whether validation can be bypassed
- Whether prerequisites are optional
- Whether errors can be overridden

All players experience same validation regardless of role.

---

## 12. COMPLETE ADVANCEMENT SUMMARY

### What Gets Applied During Level-Up

1. **Class Item Creation/Update**
   - Increments level in that class
   - Stores BAB, defense bonuses, level_progression data

2. **Ability Score Increases** (Levels 4, 8, 12, 16, 20)
   - Modifies `system.abilities.{ability}.base`
   - Triggers modifier recalculation
   - Auto-grants extra trained skill if INT increases
   - Auto-grants retroactive HP if CON increases

3. **HP Increase**
   - Base = HD/2 + 1 + CON mod (or varies by setting)
   - Distributed evenly with CON mod increases across all levels

4. **BAB Recalculation**
   - Sums all class items' BAB progressions
   - Full BAB (1:1): Jedi, Soldier
   - 3/4 BAB: All others

5. **Defense Bonus Recalculation**
   - Applied ONCE per class, not per level
   - Sums: Reflex, Fortitude, Will bonuses
   - Class items updated with these bonuses

6. **Feat/Talent Addition**
   - Embedded as items in actor
   - Only selected/required ones added
   - No duplicates allowed

7. **Skill Training** (Multiclass)
   - Marks one skill as trained from multiclass bonus
   - Increases trained skills count

8. **Class Features**
   - Applied via applyClassFeatures()
   - Weapon proficiencies, special abilities, etc.

### What Does NOT Get Applied Without Proper Selection

- Extra feats (requires selection from available list)
- Extra talents (requires selection from talent tree)
- Ability increases (requires allocation in UI)
- Prestige class features (if prerequisites not met)
- Force powers (no implemented selection UI yet)

---

## 13. CONCLUSION: OVERRIDE AND BYPASS ANALYSIS

### Can Players Override Advancement Blocks?

**Technical Answer**: No. There are:
1. No bypass flags or settings
2. No GM-only override options
3. No admin permission checks
4. No conditional validation (all players treated equally)
5. No silent failure handling
6. No try-catch exceptions to skip validation
7. No hard-coded escape hatches

### The System's Philosophy

The advancement system is **validating but permissive**:
- **Permissive**: Shows only valid options from the start
- **Validating**: Double-checks selections match prerequisites
- **Informative**: Always explains why something is blocked
- **Modal**: Prevents proceeding with incomplete choices

Players cannot:
- Skip ability allocation steps
- Choose unqualified feats or talents
- Select prestige classes without prerequisites
- Bypass talent prerequisite trees

Players can:
- Navigate back and forth between steps
- Change selections at any point until final submission
- Review everything on summary page before confirming
- Cancel the entire level-up and start over

### How to Unblock Advancement

The only way to unblock advancement is to:
1. **Meet prerequisites**: Train required skills, gain levels, increase ability scores
2. **Make required selections**: Choose feat, talent, or ability increase when required
3. **Allocate all points**: Complete all mandatory allocations before proceeding
4. **Fix underlying issues**: If class unavailable, increase character level or meet BAB requirements

No technical override exists outside of these normal progression mechanisms.

