# Advancement System Security & Override Analysis - Executive Summary

## Quick Answers to Your Questions

### 1. **Where is the level up system implemented?**
- **Main Entry Point**: `/scripts/actors/character/swse-character-sheet.js` (Line 160, `.level-up` button click)
- **Main Application**: `/scripts/apps/levelup/levelup-main.js` (SWSELevelUpEnhanced FormApplication)
- **Wrapper**: `/scripts/apps/swse-levelup.js` (Entry point for opening the dialog)

**Key File Structure**:
```
/scripts/apps/levelup/
├── levelup-main.js (Multi-step dialog orchestration)
├── levelup-validation.js (Prerequisite checking)
├── levelup-class.js (Class selection & species handling)
├── levelup-feats.js (Feat loading & selection)
├── levelup-talents.js (Talent tree visualization)
├── levelup-skills.js (Trained skill selection)
├── levelup-shared.js (Common utilities - HP calc, BAB, defenses)
└── levelup-force-powers.js (Placeholder for future force powers)
```

---

### 2. **How does character generation work?**
- **Main Application**: `/scripts/apps/chargen/chargen-main.js` (CharacterGenerator Application)
- **Entry Point**: Character Sheet → "Character Generator" button

**CharGen Flow** (Living Characters):
1. Name entry
2. Type selection (Living/Droid)
3. Species selection
4. Ability score allocation (Point buy 25-30 points)
5. Class selection (Core classes only)
6. Feat selection
7. Talent selection
8. Skill training
9. Summary & Equipment shop

**Key Feature**: Both systems use the same `PrerequisiteValidator` class for consistent prerequisite checking across the entire advancement workflow.

---

### 3. **What validation/error checks occur during advancement?**

#### Prerequisite Types Checked:
1. **Ability Scores**: "STR 13", "DEX 15+"
2. **Base Attack Bonus**: "BAB +7"
3. **Character Level**: "Level 5", "Character level 12"
4. **Class Level**: "Soldier 1", "Jedi 3"
5. **Skill Training**: "Trained in Mechanics", "Use the Force"
6. **Force Sensitivity**: Feat or class-based
7. **Feat Prerequisites**: Named feat requirements
8. **Talent Prerequisites**: Required prerequisite talents
9. **Prestige Class Prerequisites**: Hardcoded 60+ classes with complex requirements

#### Hard Blocking Points:
- Ability increases: MUST allocate 2 points (Levels 4, 8, 12, 16, 20)
- Feat selection: MUST select if class grants one
- Talent selection: MUST select if class grants one
- Species/Class in CharGen: MUST select to proceed
- Name in CharGen: MUST provide non-empty value

#### Silent Filtering:
- Unqualified feats/talents don't appear in UI at all
- Prestige classes with unmet prerequisites aren't shown
- All filtering happens during `getData()` before UI render

---

### 4. **Can players override errors or blocks during advancement?**

### **ANSWER: NO - No override mechanisms exist**

#### Evidence:
- **0 GM permission checks** in levelup code
- **0 bypass flags or settings**
- **0 try-catch exceptions** to skip validation
- **0 force/admin override buttons**
- **All players treated identically** - same validation regardless of role

#### How Blocking Works:
```javascript
// All blocking follows this pattern:
if (!check.valid) {
  ui.notifications.warn(`Cannot select ${item}: ${reason}`);
  return null;  // Hard stop - selection rejected
}

// No condition like: if (!game.user.isGM) { block }
// No setting to disable validation
// No override mechanism
```

#### What Happens When Blocked:
1. Notification shows specific reason
2. Selection is rejected (returned null)
3. Character data is NOT updated
4. Dialog stays open to allow retry
5. No error log/exception - just normal return flow

---

### 5. **What happens when a player tries to advance but is stopped?**

#### Scenario: Missing Prestige Class Prerequisites
```
Attempt: Select "Jedi Knight" prestige class at level 5
Requirements: Level 7, Force Sensitivity, Lightsaber Proficiency, Jedi Member

Result:
- Dialog opens showing available classes
- "Jedi Knight" is NOT in the list (silently filtered out)
- Player only sees classes they qualify for
- When character reaches level 7 and meets all requirements:
  - Reload dialog → "Jedi Knight" now appears
  - Player can select it
```

#### Scenario: Trying to Skip Required Feat
```
Attempt: Click Next on feat selection step without selecting a feat

Result:
- _onNextStep() checks: selectedFeats.length === 0
- Condition is TRUE
- ui.notifications.warn("You must select a feat before continuing!")
- Function returns early (doesn't advance step)
- Dialog stays on feat selection
- Player MUST select a feat to proceed
- No way to force past this check
```

#### Scenario: Selecting Unqualified Talent
```
Attempt: Select "Force Sense" talent without Force Sensitivity

Flow:
1. User clicks talent in tree
2. selectTalent() calls checkTalentPrerequisites()
3. Finds "Requires Force Sensitivity"
4. Check returns { valid: false, reasons: ["Requires Force Sensitivity"] }
5. ui.notifications.warn("Cannot select Force Sense: Requires Force Sensitivity")
6. selectTalent() returns null
7. this.selectedTalent remains unchanged
8. Dialog stays open
9. Talent tree still displayed
```

---

## System Architecture: Why Override Is Impossible

### Two-Phase Validation Strategy

**Phase 1: Pre-filtering** (Prevents seeing invalid options)
```javascript
// During getData():
const availableClasses = getAvailableClasses(actor, pendingData);
// Returns only classes where meetsClassPrerequisites() === true
```

**Phase 2: Runtime Validation** (Prevents selecting invalid options)
```javascript
// During selection event:
const check = checkPrerequisites(selected, actor, pendingData);
if (!check.valid) return null;  // Hard rejection
```

### Why This Works:
1. Invalid items never appear in UI (silent filtering)
2. Even if somehow shown, selection is rejected at handler
3. Rejected selections don't update character data
4. No dialog closes, no stage advances
5. Player must fix underlying issue (train skill, level up, etc.)

---

## Key Files for Understanding Blocking

### Validation Engine
- **Location**: `/scripts/utils/prerequisite-validator.js`
- **Main Methods**:
  - `checkFeatPrerequisites(feat, actor, pendingData)`
  - `checkTalentPrerequisites(talent, actor, pendingData)`
  - `checkClassPrerequisites(classDoc, actor, pendingData)`
  - `filterQualifiedFeats(feats, actor, pendingData)`
  - `filterQualifiedTalents(talents, actor, pendingData)`

### Advancement Flow Control
- **Next/Prev Step Logic**: `/scripts/apps/levelup/levelup-main.js` (Lines 527-646)
- **Blocking Points**: Lines 550-581 (Ability, Feat, Talent validation)
- **Talent Selection Blocking**: `/scripts/apps/levelup/levelup-talents.js` (Lines 460-473)

### CharGen Validation
- **Entry Point**: `/scripts/apps/chargen/chargen-main.js` (line 400)
- **validateCurrentStep()**: Checks name, species, class, droid requirements
- **All validators return false on failure** - blocks progression

---

## Blocking Conditions Reference

| Step | Blocks When | Error Message |
|------|-----------|---------------|
| **Ability Increase** | < 2 points allocated | "You must allocate all 2 ability points..." |
| **Feat Selection** | 0 feats selected | "You must select a feat..." |
| **Talent Selection** | 0 talents selected | "You must select a talent..." |
| **Talent Selection** | Prerequisites unmet | "Cannot select {talent}: {reason}" |
| **Class Selection** | Prerequisites unmet | (Silently filtered - not shown) |
| **CharGen: Name** | Empty/whitespace | "Please enter a character name" |
| **CharGen: Species** | None selected | "Please select a species" |
| **CharGen: Class** | None selected | "Please select a class" |

---

## Admin/GM Considerations

### Current Behavior
- **GMs see same UI as players** - no special override options
- **No permission checks** in advancement code
- **No admin settings** to bypass validation
- **All users follow same rules**

### If You Need to Allow Overrides
The system would require:
1. Adding permission checks: `if (game.user.isGM) { allowBypass = true }`
2. Creating new settings in system.json
3. Modifying validation logic in prerequisite-validator.js
4. Adding "Force Advance" button or skip option
5. Updating UI templates

**Current Status**: None of these exist - system is hard-coded to require prerequisites.

---

## System Philosophy

The advancement system is **"validating but permissive"**:

✓ **Permissive**: Shows only valid choices from the start (silent filtering)
✓ **Validating**: Double-checks choices match prerequisites (runtime validation)
✓ **Informative**: Explains why something is blocked (detailed notifications)
✓ **Modal**: Prevents incomplete/invalid progression (hard blocks)

✗ **Not overridable**: No bypass mechanisms exist
✗ **Not conditional**: All players treated equally (no GM special powers)
✗ **Not flexible**: Can't skip mandatory steps
✗ **Not silent**: All blocks produce notifications

---

## Conclusion

**Can players bypass advancement blocks?** 
- Technically: **No** - validation is hard-coded, no overrides exist
- Programmatically: **No** - error returns null, state doesn't change
- Configurably: **No** - no settings to disable validation
- Conditionally: **No** - all users face same validation

**The only way to unblock advancement is to meet the actual prerequisites** in-game:
- Train required skills
- Increase character level
- Meet ability score requirements
- Acquire necessary feats
- Select prerequisite talents first

This is a security-by-design approach that prevents character advancement exploits while remaining user-friendly.

