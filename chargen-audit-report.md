# Character Generation System Audit Report

## Executive Summary

**Audit Date:** 2026-01-11
**Total Buttons Audited:** 55+
**Critical Bugs Found:** 2
**Minor Issues Found:** 3
**Status:** ⚠️ ISSUES FOUND - Requires fixes

---

## ✅ Button Handlers - All Working

All button event handlers are properly registered and have corresponding handler methods in the module files. The chargen system uses a modular architecture with Object.assign to mix in handlers from specialized modules.

### Navigation Buttons
- ✅ `.next-step` → `_onNextStep` (chargen-main.js:729)
- ✅ `.prev-step` → `_onPrevStep` (chargen-main.js:794)
- ✅ `.chevron-step.clickable` → `_onJumpToStep` (chargen-main.js:804)
- ✅ `.finish` → `_onFinish` (chargen-main.js:1056)
- ✅ `.free-build-toggle` → `_onToggleFreeBuild` (chargen-main.js:833)

### Type & Droid Selection (DroidModule)
- ✅ `.select-type` → `_onSelectType` (chargen-droid.js)
- ✅ `.select-degree` → `_onSelectDegree` (chargen-droid.js)
- ✅ `.select-size` → `_onSelectSize` (chargen-droid.js)
- ✅ `.import-droid-btn` → `_onImportDroid` (chargen-droid.js)
- ✅ `.build-later-droid` → `_onBuildLater` (chargen-droid.js)

### Droid Builder (DroidModule)
- ✅ `.shop-tab` → `_onShopTabClick` (chargen-droid.js)
- ✅ `.accessory-tab` → `_onAccessoryTabClick` (chargen-droid.js)
- ✅ `.purchase-system` → `_onPurchaseSystem` (chargen-droid.js)
- ✅ `.remove-system` → `_onRemoveSystem` (chargen-droid.js)

### Species Selection (SpeciesModule)
- ✅ `.preview-species` → `_onPreviewSpecies` (chargen-species.js)
- ✅ `#species-confirm-btn` → `_onConfirmSpecies` (chargen-species.js)
- ✅ `#species-back-btn` / `#species-close-btn` → `_onCloseSpeciesOverlay` (chargen-species.js)
- ✅ `#species-overlay` click → `_onSpeciesOverlayBackdropClick` (chargen-species.js)
- ✅ `.species-filter-select` → `_onSpeciesFilterChange` (chargen-species.js)
- ✅ `.clear-species-filters` → `_onClearSpeciesFilters` (chargen-species.js)

### Near-Human Builder (SpeciesModule)
- ✅ `.open-near-human-builder` → `_onOpenNearHumanBuilder` (chargen-species.js)
- ✅ `.trait-btn` → `_onSelectNearHumanTrait` (chargen-species.js)
- ✅ `.sacrifice-btn` / `.sacrifice-radio` → `_onSelectNearHumanSacrifice` (chargen-species.js)
- ✅ `.variant-checkbox` → `_onToggleNearHumanVariant` (chargen-species.js)
- ✅ `.ability-plus-btn` / `.ability-minus-btn` → `_onAdjustNearHumanAbility` (chargen-species.js)
- ✅ `#near-human-randomize-btn` → `_onRandomizeNearHuman` (chargen-species.js)
- ✅ `#near-human-confirm-btn` → `_onConfirmNearHuman` (chargen-species.js)
- ✅ `#near-human-back-btn` / `#near-human-close-btn` → `_onCloseNearHumanOverlay` (chargen-species.js)
- ✅ `#near-human-overlay` click → `_onNearHumanOverlayBackdropClick` (chargen-species.js)

### Class Selection (ClassModule)
- ✅ `.select-class` / `.class-choice-btn` → `_onSelectClass` (chargen-class.js)
- ✅ `[name="class_select"]` change → `_onClassChanged` (chargen-class.js)

### Background Selection (BackgroundsModule)
- ✅ `.random-background-btn` → `_onRandomBackground` (chargen-backgrounds.js)
- ✅ `.change-background-btn` → `_onChangeBackground` (chargen-backgrounds.js)
- ✅ Background cards → `_onSelectBackground` (chargen-backgrounds.js)

### Abilities Step (AbilitiesModule)
- ✅ Abilities UI binding → `_bindAbilitiesUI` (chargen-abilities.js)
- ✅ Ability adjustment buttons bound in module

### Skills Selection (SkillsModule)
- ✅ `.skill-select` change → `_onSkillSelect` (chargen-skills.js)
- ✅ `.train-skill-btn` → `_onTrainSkill` (chargen-skills.js)
- ✅ `.untrain-skill-btn` → `_onUntrainSkill` (chargen-skills.js)
- ✅ `.reset-skills-btn` → `_onResetSkills` (chargen-skills.js)

### Languages Selection (LanguagesModule)
- ✅ `.select-language` → `_onSelectLanguage` (chargen-languages.js)
- ✅ `.remove-language` → `_onRemoveLanguage` (chargen-languages.js)
- ✅ `.reset-languages-btn` → `_onResetLanguages` (chargen-languages.js)
- ✅ `.add-custom-language-btn` → `_onAddCustomLanguage` (chargen-languages.js)

### Feats & Talents Selection (FeatsTalentsModule)
- ✅ `.select-feat` → `_onSelectFeat` (chargen-feats-talents.js)
- ✅ `.remove-feat` → `_onRemoveFeat` (chargen-feats-talents.js)
- ✅ `.select-talent-tree` → `_onSelectTalentTree` (chargen-feats-talents.js)
- ✅ `.back-to-talent-trees` → `_onBackToTalentTrees` (chargen-feats-talents.js)
- ✅ `.select-talent` → `_onSelectTalent` (chargen-feats-talents.js)

### Force Powers Selection (ForcePowersModule)
- ✅ `.select-power` → `_onSelectForcePower` (chargen-force-powers.js)
- ✅ `.remove-power` → `_onRemoveForcePower` (chargen-force-powers.js)

### Starship Maneuvers Selection (StarshipManeuversModule)
- ✅ `.select-maneuver` → `_onSelectStarshipManeuver` (chargen-starship-maneuvers.js)
- ✅ `.remove-maneuver` → `_onRemoveStarshipManeuver` (chargen-starship-maneuvers.js)

### Finalization
- ✅ `.open-shop-btn` → `_onOpenShop` (chargen-main.js:1076)
- ✅ Character name input binding
- ✅ Target level input binding

---

## ❌ Critical Bugs Found

### Bug #1: Missing Validation for Required Steps

**Severity:** HIGH
**Impact:** Users can proceed through chargen without selecting required items

**Issue:**
The `_validateCurrentStep()` method (lines 880-976) only validates these steps:
- name
- type
- degree (droid)
- size (droid)
- droid-final
- species
- abilities
- class

**Missing Validation:**
- ❌ **background** step - No validation to ensure a background is selected
- ❌ **feats** step - No validation to ensure minimum feats are selected
- ❌ **talents** step - No validation to ensure minimum talents are selected
- ❌ **skills** step - No validation to ensure correct number of trained skills
- ❌ **force-powers** step - No validation to ensure required Force powers are selected
- ❌ **starship-maneuvers** step - No validation to ensure required maneuvers are selected

**Root Cause:**
The switch statement in `_validateCurrentStep` doesn't have cases for these steps, allowing users to click "Next" without completing them.

**Recommended Fix:**
Add validation cases for all required steps:

```javascript
case "background":
  // Background is optional in the rules, but we should validate if enforced by settings
  if (game.settings.get('foundryvtt-swse', 'requireBackground') && !this.characterData.background) {
    ui.notifications.warn("Please select a background.");
    return false;
  }
  break;

case "skills":
  const trainedCount = Object.values(this.characterData.skills || {}).filter(s => s.trained).length;
  const requiredCount = this.characterData.trainedSkillsAllowed || 0;
  if (trainedCount < requiredCount) {
    ui.notifications.warn(`You must train ${requiredCount} skills (currently trained: ${trainedCount}).`);
    return false;
  }
  break;

case "feats":
  const selectedFeatsCount = (this.characterData.feats || []).length;
  const requiredFeats = this.characterData.featsRequired || 1;
  if (selectedFeatsCount < requiredFeats) {
    ui.notifications.warn(`You must select ${requiredFeats} feat(s) (currently selected: ${selectedFeatsCount}).`);
    return false;
  }
  break;

case "talents":
  const selectedTalentsCount = (this.characterData.talents || []).length;
  // Level 1 characters get 1 talent
  const requiredTalents = 1;
  if (selectedTalentsCount < requiredTalents) {
    ui.notifications.warn(`You must select ${requiredTalents} talent (currently selected: ${selectedTalentsCount}).`);
    return false;
  }
  break;

case "force-powers":
  const selectedPowersCount = (this.characterData.powers || []).length;
  const requiredPowers = this._getForcePowersNeeded();
  if (selectedPowersCount < requiredPowers) {
    ui.notifications.warn(`You must select ${requiredPowers} Force power(s) (currently selected: ${selectedPowersCount}).`);
    return false;
  }
  break;

case "starship-maneuvers":
  const selectedManeuversCount = (this.characterData.starshipManeuvers || []).length;
  const requiredManeuvers = this._getStarshipManeuversNeeded();
  if (selectedManeuversCount < requiredManeuvers) {
    ui.notifications.warn(`You must select ${requiredManeuvers} starship maneuver(s) (currently selected: ${selectedManeuversCount}).`);
    return false;
  }
  break;
```

---

### Bug #2: Dynamic Steps Not Recalculated on Back Navigation

**Severity:** MEDIUM
**Impact:** Chevron progress indicator may become out of sync; force-powers/starship-maneuvers steps may persist incorrectly

**Issue:**
The `_getSteps()` method dynamically adds "force-powers" and "starship-maneuvers" steps based on character state:
- Line 709: Adds "force-powers" if `forceSensitive && !isDroid && _getForcePowersNeeded() > 0`
- Line 714: Adds "starship-maneuvers" if `_getStarshipManeuversNeeded() > 0`

**Problem:**
If a user:
1. Selects Force Sensitivity feat → "force-powers" step appears
2. Goes back and removes Force Sensitivity feat
3. Clicks "Next"

The "force-powers" step will be removed from the steps array, but the chevron indicators and step index may become out of sync.

**Root Cause:**
`_getSteps()` is called on every render, but the `currentStep` string may not exist in the newly calculated steps array, causing navigation issues.

**Recommended Fix:**
Add validation in `_onNextStep` and `_onPrevStep` to handle step array changes:

```javascript
async _onPrevStep(event) {
  event.preventDefault();
  const steps = this._getSteps();
  const idx = steps.indexOf(this.currentStep);

  // If current step is not in steps array (due to dynamic changes), find nearest valid step
  if (idx < 0) {
    // Find the last completed step before the current position
    const allPossibleSteps = ["name", "type", "degree", "size", "droid-builder", "species",
      "abilities", "class", "background", "skills", "languages", "feats", "talents",
      "force-powers", "starship-maneuvers", "droid-final", "summary", "shop"];
    const currentIdx = allPossibleSteps.indexOf(this.currentStep);
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (steps.includes(allPossibleSteps[i])) {
        this.currentStep = allPossibleSteps[i];
        await this.render();
        return;
      }
    }
  }

  if (idx > 0) {
    this.currentStep = steps[idx - 1];
    await this.render();
  }
}
```

---

## ⚠️ Minor Issues Found

### Issue #1: Commented-Out Handler References

**Location:** chargen-main.js:583, 585
**Issue:** Two handlers are referenced but commented out:
- Line 583: `_onSelectNearHumanAdaptation` - Method not implemented
- Line 585: `_onAdjustNearHumanAttribute` - Replaced by `_onAdjustNearHumanAbility`

**Impact:** Low - These are correctly commented out and have replacements
**Action:** Remove commented code in future cleanup

---

### Issue #2: No Validation for Background Skills Selection

**Location:** Background step
**Issue:** When a background is selected, it provides trained skills, but there's no validation to ensure the user has selected the background's trained skills.

**Impact:** Low - Background skills are typically applied automatically
**Action:** Verify that background skill application is working correctly

---

### Issue #3: Race Guard on Droid Creation

**Location:** chargen-main.js:766-781
**Issue:** The `_creatingActor` flag prevents re-entry, but if actor creation fails partway through, the flag may not be reset properly.

**Impact:** Low - The finally block should handle this, but worth testing
**Action:** Add comprehensive error testing for actor creation failures

---

## 🔧 Recommended Actions

### Priority 1 (Critical)
1. ✅ Add validation cases for all required steps (background, skills, feats, talents, force-powers, starship-maneuvers)
2. ✅ Add step synchronization logic to handle dynamic step changes

### Priority 2 (Medium)
3. Test background skill application flow
4. Add automated tests for actor creation error scenarios
5. Verify chevron indicator updates correctly on step changes

### Priority 3 (Low)
6. Remove commented-out code (lines 583, 585)
7. Add JSDoc comments to all handler methods
8. Consider refactoring `_validateCurrentStep` to use a validation registry pattern

---

## 📊 Progression Flow Analysis

### Normal PC Flow (Living Character)
```
name → type → species → abilities → class → background → skills →
languages → feats → talents → [force-powers*] → [starship-maneuvers*] →
summary → shop
```

### Droid PC Flow
```
name → type → degree → size → droid-builder → abilities → class →
background → skills → languages → feats → talents →
[starship-maneuvers*] → droid-final → summary → shop
```

### NPC Flow
```
name → type → [species/droid sequence] → abilities → skills →
languages → feats → summary
```

### Level-Up Flow
```
class → feats → talents → skills → languages → summary
```

**Notes:**
- Steps marked with `*` are conditionally added based on character choices
- Languages step is auto-skipped if no additional languages available (line 752-763)
- Droid characters cannot access Force-related steps
- Free Build mode allows jumping between any steps freely

---

## ✅ System Strengths

1. **Modular Architecture:** Clean separation of concerns with dedicated modules for each step
2. **Data Caching:** ChargenDataCache prevents redundant compendium loads
3. **Suggestion Engine Integration:** Provides intelligent feat/talent/skill recommendations
4. **Error Handling:** Comprehensive try-catch blocks with rollback on actor creation failure
5. **Free Build Mode:** Power-user feature for advanced character creation
6. **Auto-Skip Logic:** Smart auto-skip for languages step when not needed
7. **Near-Human Builder:** Sophisticated custom species builder
8. **Droid Builder:** Full droid customization system with credits tracking

---

## 📝 Testing Checklist

After applying fixes:

### Critical Path Testing
- [ ] Create a living character through full chargen flow
- [ ] Create a droid character through full chargen flow
- [ ] Create a Force-sensitive character (ensure force-powers step appears)
- [ ] Create a character with Starship Tactics (ensure starship-maneuvers step appears)
- [ ] Create an NPC through chargen
- [ ] Level up an existing character

### Validation Testing
- [ ] Try to skip background step without selection
- [ ] Try to skip skills step without training required skills
- [ ] Try to skip feats step without selecting required feats
- [ ] Try to skip talents step without selecting a talent
- [ ] Try to proceed from force-powers step without selecting powers
- [ ] Try to proceed from starship-maneuvers step without selecting maneuvers

### Dynamic Step Testing
- [ ] Select Force Sensitivity feat → verify force-powers step appears
- [ ] Remove Force Sensitivity feat → verify force-powers step disappears
- [ ] Select Starship Tactics feat → verify starship-maneuvers step appears
- [ ] Remove Starship Tactics feat → verify starship-maneuvers step disappears
- [ ] Navigate backwards after dynamic step changes

### Edge Cases
- [ ] Enable Free Build mode and verify all validations are bypassed
- [ ] Disable Free Build mode and verify validations work
- [ ] Test languages auto-skip with 0 additional languages
- [ ] Test actor creation failure and recovery
- [ ] Test Near-Human builder validation
- [ ] Test droid builder credit calculations

---

## Files to Modify

1. `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
   - Add validation cases to `_validateCurrentStep()` (after line 973)
   - Add step synchronization logic to `_onPrevStep()` (after line 794)
   - Add step synchronization logic to `_onNextStep()` (after line 729)

2. Optional: Remove commented code (lines 583, 585)

---

## Conclusion

The chargen system is well-architected with all button handlers properly connected. However, there are **2 critical bugs** related to validation and step synchronization that should be fixed to ensure a smooth user experience. The recommended fixes are straightforward and low-risk.

**Overall Assessment:** ⚠️ Good foundation with critical validation gaps that need addressing.
