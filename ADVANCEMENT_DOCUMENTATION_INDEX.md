# Character Advancement System - Complete Documentation Index

## Quick Navigation

This directory contains comprehensive documentation of the level-up and character generation (advancement) systems for Foundry VTT SWSE system.

### Documents Created

1. **ADVANCEMENT_SECURITY_SUMMARY.md** (9.5 KB) - START HERE
   - Quick answers to all 5 key questions
   - Executive summary with evidence
   - Key blocking conditions table
   - Perfect for quick reference

2. **LEVELUP_CHARGEN_ANALYSIS.md** (29 KB) - COMPREHENSIVE GUIDE
   - 13 detailed sections covering everything
   - Complete file structure and class documentation
   - Validation system explanation
   - Detailed function flow examples
   - System architecture patterns
   - Complete settings reference
   - 1,815 lines of in-depth analysis

3. **ADVANCEMENT_FLOW_DIAGRAMS.md** (30 KB) - VISUAL REFERENCE
   - ASCII flowcharts for each major system
   - Level-up flow (start to finish)
   - Validation flow (both phases)
   - Character generation flow
   - Prerequisite decision tree
   - Perfect for understanding system flow visually

---

## Key Findings Summary

### Question 1: Where is the level-up system implemented?
**Answer**: `/scripts/apps/levelup/levelup-main.js` (SWSELevelUpEnhanced class)
- Entry point: Character Sheet `.level-up` button
- 8 support files in `/scripts/apps/levelup/` directory
- Multi-step dialog with prerequisite validation

### Question 2: How does character generation work?
**Answer**: `/scripts/apps/chargen/chargen-main.js` (CharacterGenerator class)
- 10 steps for living characters (name → shop)
- 11 steps for droids (add degree/size selection)
- Same prerequisite validation as level-up system
- Shared PrerequisiteValidator class

### Question 3: What validation/error checks occur during advancement?
**Answer**: 9 types of prerequisites checked:
1. Ability Scores (STR 13, DEX 15+)
2. Base Attack Bonus (BAB +7)
3. Character Level (Level 5)
4. Class Level (Soldier 1)
5. Skill Training (Trained in Mechanics)
6. Force Sensitivity (feat or class-based)
7. Feat Prerequisites (named feats)
8. Talent Prerequisites (required talents)
9. Prestige Class Prerequisites (60+ hardcoded classes)

**Hard Blocking Points**:
- Ability increases: MUST allocate 2 points
- Feat selection: MUST select if required
- Talent selection: MUST select if required
- CharGen name/species/class: MUST select

### Question 4: Can players override errors or blocks during advancement?
**Answer**: NO - Zero override mechanisms exist

**Evidence**:
- 0 GM permission checks in code
- 0 bypass flags or settings
- 0 try-catch exceptions to skip validation
- 0 admin override buttons
- All players treated identically

**How It Works**:
```javascript
if (!check.valid) {
  ui.notifications.warn("Cannot select...");
  return null;  // HARD STOP
}
// No conditions like: if (!game.user.isGM) { bypass }
```

### Question 5: What happens when advancement is blocked?
**Answer**: Scenarios with detailed flows included

The system uses **"validating but permissive"** philosophy:
- Phase 1: Silent pre-filtering (invalid options don't appear)
- Phase 2: Runtime validation (selections double-checked)
- User feedback: Specific notifications explaining blocks
- User action: Dialog stays open to retry or fix issue

---

## File Organization in Code

```
/home/user/foundryvtt-swse/

DOCUMENTATION (NEW):
├── ADVANCEMENT_DOCUMENTATION_INDEX.md ← YOU ARE HERE
├── ADVANCEMENT_SECURITY_SUMMARY.md
├── LEVELUP_CHARGEN_ANALYSIS.md
└── ADVANCEMENT_FLOW_DIAGRAMS.md

LEVEL-UP SYSTEM:
scripts/apps/levelup/
├── levelup-main.js (Multi-step orchestration)
├── levelup-validation.js (Prerequisite rules)
├── levelup-class.js (Class selection)
├── levelup-feats.js (Feat loading/selection)
├── levelup-talents.js (Talent tree visualization)
├── levelup-skills.js (Skill training)
├── levelup-shared.js (Utilities - HP calc, BAB, defenses)
└── levelup-force-powers.js (Placeholder)

CHARACTER GENERATION:
scripts/apps/chargen/
├── chargen-main.js (Multi-step orchestration)
├── chargen-shared.js (Utilities)
├── chargen-droid.js (Droid builder)
├── chargen-species.js (Species selection)
├── chargen-class.js (Class selection)
├── chargen-abilities.js (Point buy system)
├── chargen-skills.js (Skill training)
└── chargen-feats-talents.js (Feat/talent selection)

VALIDATION ENGINE (BOTH SYSTEMS):
scripts/utils/
└── prerequisite-validator.js (PrerequisiteValidator class)

ENTRY POINTS:
scripts/actors/character/
└── swse-character-sheet.js (Level-up button, line 160)

WRAPPERS:
scripts/apps/
├── swse-levelup.js (Legacy wrapper)
└── swse-levelup-enhanced.js (Enhanced wrapper)
```

---

## Key Classes

### SWSELevelUpEnhanced
- **File**: `scripts/apps/levelup/levelup-main.js`
- **Type**: FormApplication
- **Purpose**: Multi-step level-up dialog
- **Steps**: 9 (species, attributes, class, multiclass, ability, feat, talent, skills, summary)
- **Key Methods**:
  - `getData()` - Loads and filters options
  - `_onSelectClass()` - Handles class selection
  - `_onCompleteLevelUp()` - Applies advancement to actor

### CharacterGenerator
- **File**: `scripts/apps/chargen/chargen-main.js`
- **Type**: Application
- **Purpose**: Full character creation wizard
- **Steps**: 10-11 depending on type
- **Key Methods**:
  - `_validateCurrentStep()` - Blocks progression
  - `_createActor()` - Creates new actor
  - `_finalizeCharacter()` - Calculates derived values

### PrerequisiteValidator
- **File**: `scripts/utils/prerequisite-validator.js`
- **Type**: Static utility class
- **Purpose**: Prerequisite checking engine
- **Key Methods**:
  - `checkFeatPrerequisites()`
  - `checkTalentPrerequisites()`
  - `checkClassPrerequisites()`
  - `filterQualifiedFeats()`
  - `filterQualifiedTalents()`
  - `_parsePrerequisites()`
  - `_checkSinglePrerequisite()`

---

## How to Use This Documentation

### For Quick Understanding
1. Read **ADVANCEMENT_SECURITY_SUMMARY.md** (10 min)
2. Review the blocking conditions table
3. Look at "What happens when blocked" scenarios

### For Complete Understanding
1. Read **ADVANCEMENT_SECURITY_SUMMARY.md** (overview)
2. Read **LEVELUP_CHARGEN_ANALYSIS.md** (comprehensive - 30 min)
3. Check specific sections as needed
4. Reference code comments in the actual files

### For Visual Learners
1. Study **ADVANCEMENT_FLOW_DIAGRAMS.md**
2. Follow one complete flow (e.g., "Complete Valid Level-Up Flow")
3. See how validation works in visual format
4. Understand decision points and blocking

### For Code Implementation
1. Relevant section in LEVELUP_CHARGEN_ANALYSIS.md
2. Review actual code files mentioned
3. Check PrerequisiteValidator for validation patterns
4. Look at examples in "Detailed Function Flow Examples"

---

## Validation System Deep Dive

### Two-Phase Strategy

**Phase 1: Pre-Filtering (getData)**
- Loads all items from compendium
- Checks prerequisites for each item
- Filters to only isQualified: true items
- Result: Invalid items never appear in UI

**Phase 2: Runtime Validation (Selection)**
- User clicks item (even if somehow shown)
- Handler calls check function again
- Double-check prerequisites
- Result: Invalid selections are rejected

### Validation Pattern

```javascript
// Pattern used everywhere in system:

// Phase 1 (in getData/loadFeats):
const filtered = filterQualifiedFeats(feats, actor, pendingData);
context.availableFeats = filtered.filter(f => f.isQualified);

// Phase 2 (in handler):
const check = checkFeatPrerequisites(feat, actor, pendingData);
if (!check.valid) {
  ui.notifications.warn(`Cannot select: ${check.reasons.join(', ')}`);
  return null;  // Selection rejected
}

// If valid:
this.selectedFeats.push(feat);
return feat;
```

---

## Prerequisite Types Supported

| Type | Pattern | Example | Check |
|------|---------|---------|-------|
| Ability | "STR 13" | "Strength 15+" | actor.abilities.str.total >= 15 |
| BAB | "BAB +5" | "Base Attack Bonus +7" | actor.system.bab >= 7 |
| Level | "Level 5" | "Character level 12" | actor.system.level >= 12 |
| Class | "Soldier 1" | "Jedi 3" | actor.classLevel[className] >= level |
| Skill | "Trained in X" | "Use the Force" | actor.skills[skillKey].trained === true |
| Force | "Force Sensitivity" | Force Sensitivity | actor has feat OR class has flag |
| Feat | "Power Attack" | "Spring Attack" | actor.items has feat by name |
| Talent | "Novice" | "Master" | actor.items has talent by name |
| Prestige | Hardcoded | Jedi Knight | Matches complete prerequisite string |

---

## Error Messages Reference

### Warning Messages (User Must Fix)
- "You must allocate all 2 ability points before continuing!"
- "You must select a feat before continuing!"
- "You must select a talent before continuing!"
- "Cannot select {item}: {reason}"

### Error Messages (System Problem)
- "Species compendium not found!"
- "Failed to complete level up. See console for details."

### Info Messages (Success)
- "Species selected: {name}"
- "Selected feat: {name}"
- "+1 to STR (Total increases: 1/2)"

---

## Settings That Affect Advancement

| Setting | Key | Options | Default |
|---------|-----|---------|---------|
| Multiclass Bonus | multiclassBonusChoice | "feat" or "skill" | varies |
| Talent Trees | talentTreeRestriction | "current" or "any" | varies |
| Ability Increase | abilityIncreaseMethod | "flexible" or "standard" | "flexible" |
| HP Generation | hpGeneration | "maximum", "average", "roll", "average_minimum" | "average" |
| Max HP Levels | maxHPLevels | number | 1 |
| Point Buy Pool | livingPointBuyPool | 25-30 | 25 |
| Point Buy Pool | droidPointBuyPool | number | 20 |

**Important**: No settings exist to disable validation or allow overrides.

---

## For Developers/Maintainers

### To Add Override Capability (if needed):
1. Add permission check in prerequisite-validator.js:
   ```javascript
   if (game.user.isGM && game.settings.get("swse", "allowBypass")) {
     return { valid: true, reasons: [] };
   }
   ```

2. Create setting in system.json:
   ```json
   "allowBypass": { "type": Boolean, "default": false }
   ```

3. Update templates to show override button for GM

4. Modify handlers to check override flag

**Current Status**: None of these exist - system is fully restrictive

### To Modify Validation:
- Edit: `/scripts/utils/prerequisite-validator.js`
- Edit: `/scripts/apps/levelup/levelup-validation.js` (for prestige classes)
- Edit: Prerequisite fields in compendium documents

### To Add New Prerequisite Type:
1. Add pattern to `_parsePrerequisitePart()` in prerequisite-validator.js
2. Add handler case to `_checkSinglePrerequisite()`
3. Add check function like `_checkNewType()`
4. Document in this file

---

## Conclusion

The advancement system in SWSE for Foundry VTT is **secure by design**:
- Validation is hard-coded and comprehensive
- Overrides don't exist (no way to bypass)
- Blocking is enforced consistently
- User feedback is clear and specific
- Players must meet actual prerequisites to advance

This prevents character advancement exploits while remaining user-friendly through clear messaging and non-punitive blocking (dialog stays open to fix issues).

---

**Document Generated**: 2025-11-20
**System Analyzed**: Foundry VTT SWSE Module (Star Wars Saga Edition)
**Analysis Scope**: Complete level-up and character generation systems
**Total Documentation**: 1,815 lines + diagrams
