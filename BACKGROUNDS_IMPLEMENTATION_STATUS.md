# Backgrounds System Implementation Status

## Overview
Implementation of the Backgrounds system from Star Wars Saga Edition: Rebellion Era Campaign Guide

## ✅ COMPLETED

### 1. Data Files
- **data/backgrounds.json** - Complete with:
  - 11 Event backgrounds
  - 11 Occupation backgrounds
  - 24 Core planet backgrounds
  - 40 Homebrew planet backgrounds
  - All with narrative descriptions, skills, and mechanical effects

### 2. Backgrounds Module
- **scripts/apps/chargen/chargen-backgrounds.js** - Complete with:
  - Background loading from JSON
  - Category-based background retrieval
  - Skill selection dialog
  - Skill overlap detection method
  - Background card rendering
  - Ol' Salty narrative dialogue system
  - Event handlers for all background interactions

### 3. CharGen Integration
- **scripts/apps/chargen/chargen-main.js** - Updated with:
  - Background module import and mixing
  - characterData properties for backgrounds
  - Background step in workflow (conditionally shown)
  - Event listeners for background UI
  - Background card rendering on step load

### 4. UI Template
- **templates/apps/chargen.hbs** - Complete with:
  - Background selection step HTML
  - Category tabs (Events, Occupations, Planets)
  - Homebrew planets toggle
  - Ol' Salty narrator comment display
  - Selected background summary view
  - Progress flowchart updated to include background step

### 5. Houserule Settings
- **scripts/houserules/houserule-settings.js** - Added:
  - `enableBackgrounds` - Toggle backgrounds system on/off (default: true)
  - `backgroundSelectionCount` - Choose 1, 2, or 3 backgrounds (default: 1)

### 6. Skills System Integration
- Background skills are added to class skill list (NOT trained immediately)
- Skills can be trained later in the Skills step

## 🚧 IN PROGRESS / TODO

### 1. Skill Overlap Detection Hook
**File:** scripts/apps/chargen/chargen-class.js or chargen-main.js
**Task:** Hook `_checkBackgroundSkillOverlap()` into `_onSelectClass()` method

```javascript
// In _onSelectClass method, after class selection:
if (this.characterData.background) {
  await this._checkBackgroundSkillOverlap(selectedClass);
}
```

### 2. Skills Step Integration
**File:** scripts/apps/chargen/chargen-skills.js
**Tasks:**
- Include background class skills when determining available class skills
- Prevent double-counting if skill is both background and class skill
- Show indicator on skills that came from background

```javascript
// In skills step, get background class skills:
const backgroundSkills = this._getBackgroundClassSkills();
// Merge with class skills without duplicates
```

### 3. Random Background Button
**File:** chargen-backgrounds.js
**Tasks:**
- Add `_onRandomBackground()` method
- Randomly select from enabled categories based on houserule setting
- Show skill selection dialog after random selection
- Add button to template

### 4. Character Sheet Integration
**Files:**
- scripts/data-models/actor-data-model.js (add fields)
- templates/sheets/character-sheet.hbs (add Biography tab fields)

**Tasks:**
- Add `event`, `profession`, and `planetOfOrigin` fields to actor data model
- Display these in Biography tab
- Populate from background data during character creation

### 5. Occupation Bonuses Application
**File:** chargen-backgrounds.js, _applyBackgroundToActor method

**Task:** Apply occupation untrained skill bonuses to actor
```javascript
// For occupation backgrounds:
if (this.characterData.occupationBonus) {
  const bonusData = {
    type: "untrained_background",
    skills: occupationBonus.skills,
    value: occupationBonus.value
  };
  await actor.setFlag('swse', 'occupationBonus', bonusData);
}
```

### 6. Templates Integration
**Note:** User mentioned templates should allow background selection
**Status:** NOT YET STARTED
- Templates currently don't include backgrounds
- Need to add background selection to template system

### 7. Testing Checklist
- [ ] Create character with Event background
- [ ] Create character with Occupation background
- [ ] Create character with Planet background
- [ ] Test homebrew planets toggle
- [ ] Test skill overlap detection
- [ ] Test houserule: backgrounds disabled
- [ ] Test houserule: 2 backgrounds allowed
- [ ] Test houserule: 3 backgrounds allowed
- [ ] Test random background button
- [ ] Verify background appears on character sheet
- [ ] Verify occupation bonuses apply correctly
- [ ] Verify Event abilities appear on character sheet

## KEY DESIGN DECISIONS

### Skills Behavior
✅ **DECISION:** Backgrounds add skills to class skill list, NOT train them immediately
- Players choose which skills during background selection
- Skills are marked as class skills
- Players train them later in Skills step
- If overlap with class, popup offers to reselect

### Houserule Settings
✅ **DECISION:** GMs can control backgrounds via settings
- Enable/disable entirely
- Allow 1, 2, or 3 background selections
- Default: 1 background (as per rulebook)

### Character Sheet Display
🚧 **TODO:** Show backgrounds in Biography tab
- Event backgrounds → "Event" field
- Occupation backgrounds → "Profession" field
- Planet backgrounds → "Planet of Origin" field

## FILES MODIFIED

### New Files
1. data/backgrounds.json
2. scripts/apps/chargen/chargen-backgrounds.js

### Modified Files
1. scripts/apps/chargen/chargen-main.js
2. templates/apps/chargen.hbs
3. scripts/houserules/houserule-settings.js

## NEXT STEPS

1. **Hook skill overlap detection** into class selection
2. **Update skills step** to respect background class skills
3. **Add random background button** to UI and logic
4. **Integrate with character sheet** Biography tab
5. **Apply occupation bonuses** during actor creation
6. **Test end-to-end** with real character creation
7. **Update templates** to include background selection
8. **Final commit and push**

## NOTES FOR CONTINUATION

- All background data is loaded via `_loadBackgrounds()` method
- Background cards are rendered via `_renderBackgroundCards(container)`
- Skill selection uses a Dialog with checkboxes
- Ol' Salty comments change based on category
- Background step only appears if `enableBackgrounds` setting is true
- Multiple background selections (2 or 3) not yet implemented in UI
