# Character Generation System - Review Report

**Date:** 2025-11-28
**Branch:** `claude/chargen-review-report-01CRBcahiQD8dise8HrEVEP3`
**Total Code:** ~4,379 lines across 9 core files + 3 application variants

---

## Executive Summary

The character generation system is **architecturally excellent** with a clean modular design, comprehensive features, and multiple UI variants (standard, improved, narrative, template-based). The system handles complex SWSE rules including point-buy abilities, droid construction, multi-level creation, prerequisite validation, and houserule integration.

**Overall Assessment:** Production-ready for general use, but has critical data consistency issues and gaps in error handling that should be addressed before release.

### Strengths
- ✅ Clean modular architecture using composition pattern
- ✅ Three-tier UI system (basic/improved/narrative) for different play styles
- ✅ Comprehensive droid support with budget/system tracking
- ✅ Rich ability generation options (point-buy, 4d6, organic, free build)
- ✅ Prerequisite validation system for feats/talents
- ✅ Template system for quick character creation
- ✅ Houserule integration throughout
- ✅ Multi-level character creation support

### Critical Concerns
- ❌ **NO TEST COVERAGE** - Zero automated tests for chargen
- ❌ Race/species data inconsistency (writes 'race', reads 'species')
- ❌ Error handling gaps in critical paths (actor creation, compendium loading)
- ❌ Validation can be completely bypassed in Free Build mode
- ❌ Multi-level progression lacks feat/talent/skill selection

---

## Recommendations by Priority

### 🔴 CRITICAL (Must Fix Before Release)

#### 1. **Data Model Inconsistency - Race vs Species**
**Location:** `scripts/apps/chargen/chargen-main.js:820`
**Impact:** Data corruption, confusion between chargen and character sheet

```javascript
// CURRENT (WRONG):
system: {
  race: this.characterData.species,  // ❌ Inconsistent property name

// SHOULD BE:
system: {
  species: this.characterData.species,  // ✅ Consistent
```

**Action:**
- Standardize ALL references to use `species` instead of `race`
- Search codebase for `system.race` and migrate to `system.species`
- Add migration script for existing actors if needed

---

#### 2. **Skill Focus Validation Order Bug**
**Location:** `scripts/apps/chargen/chargen-feats-talents.js:42-51`
**Impact:** Players can select Skill Focus for untrained skills

**Problem:**
1. Feat selection happens at step 8
2. Skill training happens at step 10
3. Skill Focus feat checks for trained skills at step 8 (before skills are chosen)
4. Player can have Skill Focus on untrained skill

**Solutions (Choose One):**

**Option A (Recommended):** Move skill selection before feat selection
```javascript
// Change step order: abilities → class → skills → feats → talents
```

**Option B:** Defer Skill Focus selection until after skills step
```javascript
// Mark Skill Focus as "pending" at feat step
// Resolve during skill step or summary step
```

**Option C:** Allow all skills for Skill Focus with validation warning
```javascript
// Warn if selected skill is not trained
// Block finalization if mismatch exists
```

---

#### 3. **Actor Creation Has No Rollback/Error Recovery**
**Location:** `scripts/apps/chargen/chargen-main.js:815-934`
**Impact:** Partial character creation on errors, data loss

**Current Issues:**
- No validation that actor was created successfully
- Embedded document creation could fail halfway through
- Starting features applied AFTER actor creation (can fail silently)
- No retry logic if creation fails

**Action:**
```javascript
async createActor(actorData) {
  let actor;
  try {
    // Create actor
    actor = await Actor.create(actorData);
    if (!actor) {
      throw new Error("Actor creation returned null");
    }

    // Create embedded documents in transaction-like manner
    const createdItems = [];
    try {
      for (const item of itemsToCreate) {
        const created = await actor.createEmbeddedDocuments("Item", [item]);
        createdItems.push(...created);
      }
    } catch (itemError) {
      // Rollback: delete actor if item creation fails
      await actor.delete();
      throw new Error(`Failed to create items: ${itemError.message}`);
    }

    // Verify all required items exist
    const requiredCount = itemsToCreate.length;
    const actualCount = actor.items.size;
    if (actualCount < requiredCount) {
      await actor.delete();
      throw new Error(`Item count mismatch: expected ${requiredCount}, got ${actualCount}`);
    }

    return actor;

  } catch (error) {
    SWSELogger.error("Actor creation failed:", error);
    ui.notifications.error(`Character creation failed: ${error.message}`);
    throw error;
  }
}
```

---

#### 4. **Compendium Loading Failures Are Silent**
**Location:** `scripts/apps/chargen/chargen-main.js:163-236`
**Impact:** Missing critical data, broken chargen, silent errors

**Current Behavior:**
```javascript
if (!pack) {
  SWSELogger.error(`compendium pack "${packName}" not found!`);
  this._packs[k] = [];  // ❌ Continues with empty array
  hasErrors = true;
  continue;
}
```

**Problem:** User doesn't know compendia are missing until they reach selection step and see empty lists.

**Action:**
```javascript
// Block chargen if critical compendia are missing
const criticalPacks = ['species', 'classes', 'feats'];
const missingCritical = [];

for (const [k, packName] of Object.entries(packNames)) {
  const pack = game.packs.get(packName);
  if (!pack) {
    SWSELogger.error(`Compendium pack "${packName}" not found!`);
    if (criticalPacks.includes(k)) {
      missingCritical.push(packName);
    }
    this._packs[k] = [];
    continue;
  }
  // ... load documents
}

// Block chargen if critical packs are missing
if (missingCritical.length > 0) {
  ui.notifications.error(
    `Character generation cannot continue. Missing critical compendium packs: ${missingCritical.join(', ')}`
  );
  this.close();
  return;
}
```

---

#### 5. **Add Minimal Validation in Free Build Mode**
**Location:** `scripts/apps/chargen/chargen-main.js:673-677`
**Impact:** Can create broken characters (0 feats, no droid systems, invalid data)

**Current:** Free Build bypasses ALL validation

**Action:** Add minimal validation even in free build:
```javascript
validateFinalCharacter() {
  const errors = [];

  // Always required
  if (!this.characterData.name || this.characterData.name.trim() === '') {
    errors.push("Character must have a name");
  }

  // Droid-specific minimum validation
  if (this.characterData.isDroid) {
    if (!this.characterData.droidSystems?.locomotion) {
      errors.push("Droids must have a locomotion system");
    }
    if (!this.characterData.droidSystems?.processor) {
      errors.push("Droids must have a processor");
    }
  }

  // Species required for living beings
  if (!this.characterData.isDroid && !this.characterData.species) {
    errors.push("Living characters must have a species");
  }

  // Class required
  if (!this.characterData.classes || this.characterData.classes.length === 0) {
    errors.push("Character must have at least one class");
  }

  if (errors.length > 0 && !this.options.freeBuild) {
    ui.notifications.error(`Validation errors:\n${errors.join('\n')}`);
    return false;
  }

  // In free build, show warnings but allow continuation
  if (errors.length > 0 && this.options.freeBuild) {
    return Dialog.confirm({
      title: "Validation Warnings",
      content: `<p>The following issues were found:</p><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul><p>Continue anyway?</p>`,
    });
  }

  return true;
}
```

---

### 🟠 HIGH PRIORITY (Should Fix Soon)

#### 6. **Multi-Level Creation Lacks Player Choices**
**Location:** `scripts/apps/chargen/chargen-improved.js:369-433`
**Impact:** High-level characters lack customization (no feat/talent/skill choices)

**Current:** Auto-levels characters but only applies HP, no feat/talent/skill selection

**Action (Choose One):**

**Option A:** Document the limitation clearly in UI
```javascript
// Add warning when level > 1 is selected
if (level > 1) {
  ui.notifications.warn(
    "Multi-level creation will auto-apply HP and level progression. " +
    "Feats, talents, and skills will be added automatically. " +
    "Use the level-up system for full customization."
  );
}
```

**Option B:** Integrate with level-up system
```javascript
// After creating level 1 character, call level-up system for each level
for (let i = 2; i <= targetLevel; i++) {
  await this.actor.levelUp({
    interactive: true,  // Show level-up UI for choices
    level: i
  });
}
```

**Option C:** Add bulk selection at summary step
```javascript
// Show all feat/talent/skill choices for levels 2-20 at summary
// Allow bulk selection before finalization
```

---

#### 7. **Template Loading Needs Graceful Fallback**
**Location:** `scripts/apps/chargen/chargen-templates.js:14-30`
**Impact:** Template character creator breaks completely if file missing

**Action:**
```javascript
static async loadTemplates() {
  try {
    const response = await fetch('systems/swse/data/character-templates.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    SWSELogger.error('Failed to load character templates:', error);

    // Provide minimal default templates
    const defaultTemplates = [
      {
        name: "Basic Soldier",
        class: "Soldier",
        level: 1,
        description: "Default template (template file failed to load)"
      }
    ];

    ui.notifications.warn(
      'Character templates could not be loaded. Using default templates.'
    );

    return defaultTemplates;
  }
}
```

---

#### 8. **Prerequisite Validation Edge Cases**
**Location:** `scripts/utils/prerequisite-validator.js`
**Impact:** Some valid feats might be incorrectly filtered out

**Missing Support:**
- OR logic: "Weapon Focus OR Weapon Specialization"
- Complex AND/OR: "STR 13 AND (Melee Weapon Focus OR Unarmed Focus)"
- Skill rank values: "Stealth 5 ranks" (only checks trained/untrained)
- Level-based: "Character level 5+" might not work correctly

**Action:**
- Add test suite for prerequisite parsing
- Extend parser to handle OR logic
- Add skill rank checking (not just trained)
- Document unsupported prerequisite formats

---

#### 9. **Duplicate Feat Check for Level-Up Context**
**Location:** `scripts/apps/chargen/chargen-feats-talents.js:21-25`
**Impact:** Might allow duplicate feats when leveling up existing character

**Current Check:**
```javascript
const alreadySelected = this.characterData.feats.find(f =>
  f.name === feat.name || f._id === feat._id
);
```

**Issue:** Doesn't check `actor.items` if chargen is used for level-up

**Action:**
```javascript
isDuplicateFeat(feat) {
  // Check in-memory characterData
  const inCharData = this.characterData.feats.find(f =>
    f.name === feat.name || f._id === feat._id
  );

  // Check existing actor items if leveling up
  let inActorItems = false;
  if (this.actor) {
    inActorItems = this.actor.items.some(item =>
      item.type === 'feat' &&
      (item.name === feat.name || item.id === feat._id)
    );
  }

  return inCharData || inActorItems;
}
```

---

#### 10. **Add Loading Indicators for Compendium Data**
**Location:** `scripts/apps/chargen/chargen-main.js:163-236`
**Impact:** Poor UX during initial load (appears frozen)

**Action:**
```javascript
async loadCompendia() {
  // Show loading notification
  const loadingNotif = ui.notifications.info(
    "Loading character generation data...",
    { permanent: true }
  );

  try {
    await this._loadPackData();
  } finally {
    // Clear loading notification
    loadingNotif.remove();
  }
}
```

---

### 🟡 MEDIUM PRIORITY (Nice to Have)

#### 11. **Add Test Suite**
**Impact:** No automated validation of critical functionality

**Recommended Tests:**
1. Point-buy budget enforcement
2. 4d6 drop lowest validation
3. Species ability modifier application
4. Droid budget calculation with cost factors
5. Prerequisite validation edge cases
6. Skill Focus selection flow
7. Actor creation and data persistence
8. Free build validation
9. Multi-level progression
10. Template application

**Action:** Create `tests/chargen/` directory with test files:
```
tests/chargen/
  ├── abilities.test.js        # Ability generation
  ├── species.test.js          # Species bonuses
  ├── droid.test.js            # Droid systems
  ├── prerequisites.test.js    # Prerequisite parsing
  ├── validation.test.js       # Step validation
  └── integration.test.js      # Full chargen flow
```

---

#### 12. **Cache Compendium Data Globally**
**Location:** `scripts/apps/chargen/chargen-main.js:163-236`
**Impact:** Performance - reloads all compendia for each new chargen instance

**Action:**
```javascript
// Create singleton cache
class ChargenDataCache {
  static _instance = null;
  static _data = null;
  static _loadPromise = null;

  static async getData() {
    if (this._data) return this._data;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = this._loadCompendia();
    this._data = await this._loadPromise;
    this._loadPromise = null;
    return this._data;
  }

  static async _loadCompendia() {
    // Load all compendia once
    // ...
  }

  static invalidate() {
    this._data = null;
  }
}

// In CharacterGenerator:
async getData() {
  this._packs = await ChargenDataCache.getData();
  // ...
}
```

---

#### 13. **Add Undo/Confirmation for Major Choices**
**Impact:** UX - players can't undo species/class selection without restarting

**Action:**
```javascript
// Add confirmation dialog for major choices
async selectSpecies(speciesId) {
  if (this.characterData.species) {
    const confirmed = await Dialog.confirm({
      title: "Change Species?",
      content: `<p>Changing species will reset ability scores and racial bonuses.</p><p>Continue?</p>`
    });
    if (!confirmed) return;
  }

  // Apply new species
  this._applySpecies(speciesId);
}

// Or add "Back" button to navigate to previous steps
```

---

#### 14. **Droid Budget Display Before Class Selection**
**Location:** `scripts/apps/chargen/chargen-droid.js`
**Impact:** UX - budget changes after purchasing systems

**Current Flow:**
1. Select droid degree/size
2. Open droid builder (budget = 1000)
3. Purchase systems
4. Select class (budget increases by starting credits)
5. User might not have spent optimally

**Action:**
```javascript
// Option A: Show "pending credits" in builder
Budget: 1000cr + (??? class credits pending)

// Option B: Disable builder until class selected
<div class="droid-builder disabled">
  <p>Select a class first to determine your budget</p>
</div>

// Option C: Estimate average and show range
Budget: 1000cr + ~500-2000cr (varies by class)
```

---

#### 15. **Standardize Error Handling Pattern**
**Impact:** Code quality - inconsistent error handling across files

**Current:** Only 24 try/catch blocks across 4,379 lines

**Action:**
```javascript
// Create standard error handler utility
class ChargenErrorHandler {
  static async safeCompendiumLoad(packName) {
    try {
      const pack = game.packs.get(packName);
      if (!pack) throw new Error(`Pack not found: ${packName}`);
      return await pack.getDocuments();
    } catch (error) {
      SWSELogger.error(`Compendium load failed: ${packName}`, error);
      ui.notifications.error(`Failed to load ${packName}`);
      return [];
    }
  }

  static async safeActorOperation(operation, errorMessage) {
    try {
      return await operation();
    } catch (error) {
      SWSELogger.error(errorMessage, error);
      ui.notifications.error(`${errorMessage}: ${error.message}`);
      throw error;
    }
  }
}
```

---

#### 16. **Species Sorting Configuration**
**Location:** `scripts/apps/chargen/chargen-species.js:284-327`
**Impact:** Maintainability - hardcoded source priority

**Current:**
```javascript
// Hardcoded source names
const sourceOrder = {
  'Core Rulebook': 0,
  'Clone Wars Campaign Guide': 1,
  // ... etc
};
```

**Action:** Move to configuration file
```javascript
// data/chargen-config.json
{
  "speciesSourcePriority": [
    "Core Rulebook",
    "Clone Wars Campaign Guide",
    "Knights of the Old Republic Campaign Guide",
    ...
  ]
}
```

---

#### 17. **Narrative Mode Dialogue State Tracking**
**Location:** `scripts/apps/chargen/chargen-narrative.js:64-190`
**Impact:** UX - random dialogues can repeat or feel disjointed

**Action:**
```javascript
// Track shown dialogues to avoid repetition
this.narrativeState = {
  shownDialogues: new Set(),
  currentSequence: 0
};

getDialogue(step, mood) {
  const dialogues = MENTOR_DIALOGUES[step][mood];

  // Filter out already-shown dialogues
  const available = dialogues.filter(d =>
    !this.narrativeState.shownDialogues.has(d)
  );

  // Pick random from available
  const dialogue = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : dialogues[0];  // Fallback to first if all shown

  this.narrativeState.shownDialogues.add(dialogue);
  return dialogue;
}
```

---

#### 18. **Add API Documentation**
**Impact:** Developer experience for extending chargen

**Action:** Create JSDoc comments for public API:
```javascript
/**
 * Character Generator - Main class for SWSE character creation
 *
 * @class CharacterGenerator
 * @extends {FormApplication}
 *
 * @property {Object} characterData - Current character state
 * @property {Object} options - Configuration options
 * @property {boolean} options.freeBuild - Skip validation
 * @property {boolean} options.isNPC - Create non-heroic character
 * @property {number} options.targetLevel - Final character level
 *
 * @example
 * const chargen = new CharacterGenerator({
 *   freeBuild: false,
 *   targetLevel: 5
 * });
 * chargen.render(true);
 */
```

---

### 🟢 LOW PRIORITY (Polish)

#### 19. **Optimize Feat Filtering Performance**
**Impact:** Performance - runs prerequisite check on ALL feats every render

**Action:**
```javascript
// Cache prerequisite validation results
this._featValidationCache = new Map();

getFeatValidity(feat) {
  const cacheKey = `${feat._id}-${JSON.stringify(this.characterData)}`;

  if (this._featValidationCache.has(cacheKey)) {
    return this._featValidationCache.get(cacheKey);
  }

  const result = PrerequisiteValidator.validateFeat(feat, this.characterData);
  this._featValidationCache.set(cacheKey, result);
  return result;
}

// Invalidate cache on data change
onDataChange() {
  this._featValidationCache.clear();
  this.render();
}
```

---

#### 20. **Add Free Build Mode Confirmation**
**Location:** `scripts/apps/chargen/chargen-main.js:634-671`
**Impact:** UX - accidental free build activation

**Action:**
```javascript
async toggleFreeBuild() {
  if (!this.options.freeBuild) {
    const confirmed = await Dialog.confirm({
      title: "Enable Free Build Mode?",
      content: `
        <p><strong>Free Build Mode</strong> removes all validation and restrictions.</p>
        <p>You can:</p>
        <ul>
          <li>Skip required steps</li>
          <li>Set any ability scores</li>
          <li>Ignore prerequisites</li>
          <li>Jump between steps freely</li>
        </ul>
        <p><em>Use with caution!</em></p>
      `
    });
    if (!confirmed) return;
  }

  this.options.freeBuild = !this.options.freeBuild;
  this.render();
}
```

---

#### 21. **Add Search/Filter to Feat Selection**
**Impact:** UX - long feat lists are hard to navigate

**Action:**
```javascript
// Add search input to feat selection template
<input type="text" id="feat-search" placeholder="Search feats...">

// Filter feats in real-time
html.find('#feat-search').on('input', (event) => {
  const searchTerm = event.target.value.toLowerCase();

  html.find('.feat-item').each((i, elem) => {
    const featName = $(elem).find('.feat-name').text().toLowerCase();
    const featDesc = $(elem).find('.feat-description').text().toLowerCase();

    const matches = featName.includes(searchTerm) ||
                   featDesc.includes(searchTerm);

    $(elem).toggle(matches);
  });
});
```

---

#### 22. **Improve Point Buy Visual Feedback**
**Impact:** UX - not clear when at budget limit

**Action:**
```javascript
// Add visual indicator for remaining points
<div class="point-buy-status ${remaining === 0 ? 'at-limit' : ''}">
  <span class="points-remaining">${remaining}</span> points remaining
</div>

// CSS
.point-buy-status.at-limit {
  color: #ff6b6b;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.point-buy-status:not(.at-limit) {
  color: #51cf66;
}
```

---

#### 23. **Add Keyboard Shortcuts**
**Impact:** UX - faster navigation for power users

**Action:**
```javascript
_activateCoreListeners(html) {
  super._activateCoreListeners(html);

  // Add keyboard shortcuts
  html.on('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case 'ArrowRight':
          event.preventDefault();
          this.nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.previousStep();
          break;
        case 'Enter':
          if (this.currentStep === 'summary') {
            event.preventDefault();
            this.createActor();
          }
          break;
      }
    }
  });
}
```

---

#### 24. **Add Character Export/Import**
**Impact:** Feature - share character builds

**Action:**
```javascript
async exportCharacterData() {
  const exportData = {
    version: "1.0",
    characterData: this.characterData,
    timestamp: Date.now()
  };

  const filename = `${this.characterData.name || 'character'}_chargen.json`;
  saveDataToFile(JSON.stringify(exportData, null, 2), 'application/json', filename);
}

async importCharacterData() {
  const file = await uploadJSON();
  if (file.version !== "1.0") {
    ui.notifications.warn("Incompatible character file version");
    return;
  }

  this.characterData = file.characterData;
  this.render();
}
```

---

#### 25. **Add Tooltips for Complex Rules**
**Impact:** UX - new players need guidance

**Action:**
```javascript
// Add tooltip library integration
<div class="ability-score" data-tooltip="
  Ability scores determine your character's basic capabilities.
  The modifier is calculated as (score - 10) / 2.
">
  Strength: <span class="score">14</span> (+2)
</div>
```

---

## Recommended Implementation Order

If addressing these recommendations, suggested order:

### Phase 1: Critical Fixes (1-2 weeks)
1. Fix race/species data inconsistency (#1)
2. Add actor creation error handling (#3)
3. Fix compendium loading errors (#4)
4. Fix Skill Focus validation order (#2)
5. Add minimal free build validation (#5)

### Phase 2: High Priority (2-3 weeks)
6. Add test suite (#11)
7. Document/fix multi-level limitations (#6)
8. Add template loading fallback (#7)
9. Fix duplicate feat checking (#9)
10. Improve prerequisite validation (#8)

### Phase 3: Medium Priority (1-2 weeks)
11. Cache compendium data (#12)
12. Standardize error handling (#15)
13. Add loading indicators (#10)
14. Add undo/confirmation (#13)
15. Fix droid budget UX (#14)

### Phase 4: Polish (ongoing)
16. Configuration-based species sorting (#16)
17. Narrative dialogue tracking (#17)
18. API documentation (#18)
19. Performance optimizations (#19-21)
20. UX improvements (#22-25)

---

## Metrics & Statistics

- **Total Lines of Code:** ~4,379 (core chargen)
- **Test Coverage:** 0% ❌
- **Error Handling:** ~24 try/catch blocks across 9 files
- **Compendium Data:** Loaded fresh for each instance (no caching)
- **Files Modified:** 9 core files + 3 variants + 2 templates
- **Data Files:** 4 JSON files

---

## Conclusion

The character generation system is **well-architected and feature-complete** for SWSE gameplay. The modular design makes it maintainable, and the three UI variants provide excellent flexibility.

**Primary Focus:** Address the 5 critical issues (#1-5) to ensure data integrity and prevent partial character creation failures. The system is already usable, but these fixes will make it production-ready.

**Secondary Focus:** Add test coverage (#11) and improve error handling (#15) to prevent regressions and improve debugging.

**Long-term:** The polish items (#19-25) will significantly improve user experience but are not blocking issues.

---

**Report Generated:** 2025-11-28
**Reviewer:** Claude Code
**Total Recommendations:** 25 (5 Critical, 5 High, 8 Medium, 7 Low)
