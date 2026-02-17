# Character Generation & Level-Up System Review

**Review Date:** 2025-11-21
**Reviewer:** Claude
**System Version:** SWSE FoundryVTT System

---

## Executive Summary

The character generation and level-up system is **well-architected with sophisticated features**, including:
- ✅ Comprehensive prerequisite validation
- ✅ Dynamic step navigation based on character state
- ✅ Mentor narration system for immersion
- ✅ Support for both living beings and droids
- ✅ Multi-classing and prestige class support
- ✅ Retroactive calculations for ability increases

However, there are **critical bugs**, **structural inefficiencies**, and **UX friction points** that need addressing.

---

## 🐛 Critical Bugs

### 1. **Level 0 Character Creation Path is Broken**
**Location:** `levelup-main.js:81-109, 729-910`
**Severity:** 🔴 **CRITICAL**

**Issue:** The level-up system includes paths for level 0 characters (species/attributes selection), but `_onCompleteLevelUp()` doesn't handle initial actor creation. This path will fail when trying to complete.

**Current Code:**
```javascript
// Line 86-87
const isLevel0 = (this.actor.system.level || 0) === 0;
this.currentStep = isLevel0 ? 'species' : 'class';
```

**Problem:** If `actor.system.level === 0`, the system goes through species → attributes → class steps, but `_onCompleteLevelUp` assumes the actor already exists and just updates it.

**Fix:** Remove level 0 creation from LevelUp entirely. Use CharacterGenerator for new character creation.

---

### 2. **Pending Skills Structure Mismatch Causes Validation Failures**
**Location:** `prerequisite-validator.js:349-350` and `levelup-main.js:92, 407`
**Severity:** 🟠 **HIGH**

**Issue:** Skill prerequisite validation expects `pendingSkills` to be an array of objects with a `key` property, but `selectedSkills` in levelup is an array of strings.

**Current Code:**
```javascript
// prerequisite-validator.js:349-350
const pendingSkills = pendingData.selectedSkills || [];
const isPendingTrained = pendingSkills.some(s => s.key === skillKey);

// levelup-main.js:407
this.selectedSkills = [skill]; // skill is a string, not {key: "skillName"}
```

**Fix:** Standardize skill selection data structure across both systems:
```javascript
this.selectedSkills = [{ key: skillName, name: skillName }];
```

---

### 3. **Multiclass Bonus Step Navigation Bug**
**Location:** `levelup-main.js:542-555`
**Severity:** 🟠 **HIGH**

**Issue:** `_onNextStep()` always navigates to 'multiclass-bonus' after class selection, even when not multiclassing, potentially showing a blank screen.

**Current Code:**
```javascript
switch (this.currentStep) {
  case 'class':
    this.currentStep = 'multiclass-bonus'; // Always goes here!
    break;
  case 'multiclass-bonus':
    // Determines actual next step
```

**Fix:** Determine if multiclass bonus applies BEFORE setting step:
```javascript
case 'class':
  const isMulticlassing = /* check logic */;
  const isBase = isBaseClass(this.selectedClass.name);
  if (isMulticlassing && isBase) {
    this.currentStep = 'multiclass-bonus';
  } else if (getsAbilityIncr) {
    this.currentStep = 'ability-increase';
  } // ... continue chain
  break;
```

---

### 4. **Feat Availability Doesn't Update After Ability Increases**
**Location:** `levelup-main.js:156-164`
**Severity:** 🟡 **MEDIUM**

**Issue:** When a character increases an ability score (e.g., STR 12 → 14), feats requiring that score don't become available until the next render. Feat data is loaded once and not refreshed.

**Fix:** Re-load and re-filter feats after ability score changes:
```javascript
_onAbilityIncrease(event) {
  // ... existing logic ...
  this.abilityIncreases[ability]++;

  // Re-filter feats with new ability scores
  if (this.featData) {
    await this._loadFeats(); // Refresh qualified feats
  }

  this.render();
}
```

---

### 5. **Race/Species Data Inconsistency**
**Location:** `chargen-main.js:494, levelup-main.js:289-297`
**Severity:** 🟡 **MEDIUM**

**Issue:** CharacterGenerator uses `species` property but writes it to actor as `race`:
```javascript
// chargen-main.js:494
race: this.characterData.species,
```

**Problem:** This causes confusion and potential data loss when reading/writing species information.

**Fix:** Standardize on one term (preferably `species` for modern inclusivity) and update all references.

---

### 6. **No Duplicate Feat Prevention**
**Location:** `levelup-feats.js:selectBonusFeat()`, `chargen-feats-talents.js`
**Severity:** 🟡 **MEDIUM**

**Issue:** The system doesn't check if the character already has a feat before allowing selection, potentially allowing duplicates.

**Fix:** Add duplicate checking:
```javascript
async _onSelectBonusFeat(event) {
  const featId = event.currentTarget.dataset.featId;
  const feat = /* get feat */;

  // Check for duplicates
  const alreadyHas = this.actor.items.some(i =>
    i.type === 'feat' && i.name === feat.name
  );
  const alreadySelected = this.selectedFeats.some(f => f.name === feat.name);

  if (alreadyHas || alreadySelected) {
    ui.notifications.warn(`You already have ${feat.name}!`);
    return;
  }

  // ... continue with selection
}
```

---

### 7. **Talent Prerequisite Parsing Breaks on Comma-Containing Names**
**Location:** `prerequisite-validator.js:58`
**Severity:** 🟡 **MEDIUM**

**Issue:** Talents like "Move Light Object, Move Massive Object" have commas in their names, but prerequisites are parsed by splitting on commas.

**Current Code:**
```javascript
const prereqTalentNames = prereqString.split(',').map(p => p.trim());
```

**Fix:** Use a more sophisticated parsing approach or standardize prerequisite format to use a different delimiter (e.g., semicolon or pipe).

---

### 8. **Missing Compendium Loading Error Handling**
**Location:** `chargen-main.js:107-143`
**Severity:** 🟡 **MEDIUM**

**Issue:** If a compendium fails to load, the system silently continues with an empty array, leading to confusing blank selection screens.

**Current Code:**
```javascript
this._packs[k] = [];
```

**Fix:** Show user-friendly error messages:
```javascript
catch (err) {
  SWSELogger.error(`Failed to load pack ${packName}:`, err);
  this._packs[k] = [];
  ui.notifications.error(`Failed to load ${k} data. Some options may be unavailable.`);
}
```

---

### 9. **Droid Shop Credits Not Applied to Final Actor**
**Location:** `chargen-main.js:490-568`, `chargen-droid.js`
**Severity:** 🟡 **MEDIUM**

**Issue:** Droid characters purchase systems in the droid builder, spending credits, but the final actor is created with the default starting credits (1000), not the remaining balance.

**Fix:** Apply spent credits when creating actor:
```javascript
credits: this.characterData.isDroid
  ? this.characterData.droidCredits.remaining
  : this.characterData.credits || 1000
```

---

### 10. **Point Buy Validation Missing for Level 0 Attributes**
**Location:** `levelup-main.js:304-325`
**Severity:** 🟢 **LOW**

**Issue:** When confirming attributes for a level 0 character, there's no validation that the point buy was valid or that all abilities are within acceptable ranges.

**Fix:** Add validation before confirming:
```javascript
async _onConfirmAttributes(event) {
  event.preventDefault();

  // Validate point buy
  const totalCost = this._calculatePointBuyCost(this.abilityScores);
  if (totalCost > 32) {
    ui.notifications.warn("You've exceeded the point buy budget!");
    return;
  }

  // ... continue
}
```

---

## 🏗️ Structure Improvements

### 1. **Consolidate Character Creation Logic**
**Priority:** 🔴 **HIGH**

**Current State:** Level 0 character creation is split between `CharacterGenerator` and `SWSELevelUpEnhanced`, leading to duplicated code and confusion.

**Recommendation:**
- **Remove** all level 0 logic from `levelup-main.js`
- **Use** `CharacterGenerator` exclusively for creating new characters
- **Use** `SWSELevelUpEnhanced` exclusively for leveling existing characters
- **Add** a clear entry point: "Create Character" vs "Level Up"

**Benefits:**
- Single source of truth for character creation
- Reduced code duplication
- Clearer mental model for developers
- Easier to maintain and test

---

### 2. **Extract Validation into a Centralized Service**
**Priority:** 🟠 **HIGH**

**Current State:** Validation logic is scattered across:
- `prerequisite-validator.js` (444 lines)
- `levelup-validation.js` (119 lines)
- `levelup-feats.js` (inline checks)
- `chargen-feats-talents.js` (inline checks)

**Recommendation:** Create a `ValidationService` class:

```javascript
class ValidationService {
  // Centralized validation methods
  static validateFeatSelection(feat, character, pendingData) { }
  static validateTalentSelection(talent, character, pendingData) { }
  static validateClassSelection(classDoc, character, pendingData) { }
  static validateSkillAllocation(skills, character, classData) { }
  static validateAbilityAllocation(abilities, method, pointBuy) { }

  // Filtering methods
  static getQualifiedFeats(allFeats, character, pendingData) { }
  static getQualifiedTalents(allTalents, character, pendingData) { }
  static getQualifiedClasses(allClasses, character) { }
}
```

**Benefits:**
- Single source of truth for validation rules
- Easier to test validation logic independently
- Consistent validation across CharGen and LevelUp
- Better error messages with context

---

### 3. **Move Hardcoded Prerequisites to Configuration**
**Priority:** 🟠 **HIGH**

**Current State:** 60+ prestige class prerequisites are hardcoded in `levelup-validation.js:16-64`

**Recommendation:** Create `/data/prestige-class-prerequisites.json`:

```json
{
  "Ace Pilot": {
    "level": 7,
    "skills": ["Pilot"],
    "feats": ["Vehicular Combat"],
    "description": "Character Level 7, Trained in Pilot, Vehicular Combat"
  },
  "Jedi Knight": {
    "bab": 7,
    "skills": ["Use the Force"],
    "feats": ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
    "other": ["Member of The Jedi"],
    "description": "BAB +7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Member of The Jedi"
  }
}
```

**Benefits:**
- Easier to maintain and update prerequisites
- Can be edited by non-programmers
- Supports modding and house rules
- Version control friendly

---

### 4. **Implement State Machine for Step Navigation**
**Priority:** 🟡 **MEDIUM**

**Current State:** Step navigation uses nested if/else chains in `_onNextStep()` and `_onPrevStep()` (100+ lines of conditional logic)

**Recommendation:** Use a state machine pattern:

```javascript
class LevelUpStateMachine {
  constructor(character, selections) {
    this.character = character;
    this.selections = selections;
    this.steps = this._buildStepFlow();
    this.currentIndex = 0;
  }

  _buildStepFlow() {
    const steps = ['class'];

    if (this._needsMulticlassBonus()) steps.push('multiclass-bonus');
    if (this._needsAbilityIncrease()) steps.push('ability-increase');
    if (this._needsBonusFeat()) steps.push('feat');
    if (this._needsTalent()) steps.push('talent');

    steps.push('summary');
    return steps;
  }

  next() { /* move forward */ }
  previous() { /* move back */ }
  canProceed() { /* validate current step */ }
}
```

**Benefits:**
- Linear, predictable flow
- Easier to debug and test
- Can visualize entire flow
- Supports dynamic step insertion

---

### 5. **Separate Presentation from Logic**
**Priority:** 🟡 **MEDIUM**

**Current State:** Templates (`levelup.hbs`, `chargen.hbs`) contain:
- 500+ lines of inline CSS
- Complex conditional logic
- Business rules (e.g., "core classes only")

**Recommendation:**
- Move all CSS to external stylesheets
- Create computed properties for complex conditions
- Move filtering logic to getData()

```javascript
getData() {
  const context = super.getData();

  // Computed properties for template
  context.computed = {
    showMulticlassBonus: this._shouldShowMulticlassBonus(),
    availableCoreClasses: this._getAvailableCoreClasses(),
    isStepValid: this._isCurrentStepValid(),
    canProceed: this._canProceedToNextStep()
  };

  return context;
}
```

**Benefits:**
- Templates become declarative
- Easier to style and maintain
- Logic can be unit tested
- Better performance (cached computations)

---

### 6. **Add Comprehensive JSDoc Type Definitions**
**Priority:** 🟢 **LOW**

**Current State:** Some files have JSDoc, others don't. Type information is inconsistent.

**Recommendation:** Add comprehensive types:

```javascript
/**
 * @typedef {Object} CharacterData
 * @property {string} name - Character name
 * @property {boolean} isDroid - Whether character is a droid
 * @property {Object.<string, AbilityScore>} abilities - Ability scores
 * @property {Array<ItemData>} feats - Selected feats
 * @property {Array<ItemData>} talents - Selected talents
 */

/**
 * Select a feat for the character
 * @param {string} featId - The feat's ID
 * @param {CharacterData} character - Current character data
 * @param {Object} pendingData - Pending selections
 * @returns {Promise<ItemData|null>} The selected feat or null if invalid
 */
async function selectFeat(featId, character, pendingData) {
  // ...
}
```

**Benefits:**
- Better IDE autocomplete
- Catch type errors early
- Self-documenting code
- Easier onboarding for new developers

---

### 7. **Implement Event-Based Module Communication**
**Priority:** 🟢 **LOW**

**Current State:** Modules call each other directly (tight coupling)

**Recommendation:** Use events for loose coupling:

```javascript
// Instead of:
await applyClassFeatures(this.selectedClass, classLevel, this.actor);

// Use:
Hooks.call('swse.classSelected', {
  actor: this.actor,
  class: this.selectedClass,
  level: classLevel
});
```

**Benefits:**
- Modules can be developed independently
- Easier to add new features
- Better testability
- Supports third-party extensions

---

## 🎨 UI/UX Improvements

### 1. **Add Visual Progress Indicator**
**Priority:** 🔴 **HIGH**

**Current State:** Users see "Step: class" text but don't know how many steps remain or where they are in the process.

**Recommendation:** Add a progress bar/stepper component:

```html
<div class="step-progress">
  <div class="step completed" data-step="class">
    <div class="step-number">1</div>
    <div class="step-label">Class</div>
  </div>
  <div class="step active" data-step="feat">
    <div class="step-number">2</div>
    <div class="step-label">Feat</div>
  </div>
  <div class="step pending" data-step="talent">
    <div class="step-number">3</div>
    <div class="step-label">Talent</div>
  </div>
  <div class="step pending" data-step="summary">
    <div class="step-number">4</div>
    <div class="step-label">Summary</div>
  </div>
</div>
```

**Benefits:**
- Users know how fa-regular they've come
- Reduces anxiety about process length
- Can click steps to jump back
- Professional appearance

---

### 2. **Add Search and Filter Functionality**
**Priority:** 🔴 **HIGH**

**Current State:** With 60+ prestige classes, 200+ feats, and numerous talents, users must scroll through long lists to find options.

**Recommendation:** Add search and filter UI:

```html
<div class="selection-controls">
  <input type="text"
         class="search-input"
         placeholder="Search feats..."
         data-search-target=".feat-card">

  <div class="filter-options">
    <label><input type="checkbox" value="combat"> Combat</label>
    <label><input type="checkbox" value="force"> Force</label>
    <label><input type="checkbox" value="skill"> Skill</label>
  </div>

  <div class="sort-options">
    <select class="sort-select">
      <option value="name">Alphabetical</option>
      <option value="prerequisites">By Prerequisites</option>
      <option value="type">By Type</option>
    </select>
  </div>
</div>
```

**Benefits:**
- Dramatically faster selection
- Reduces cognitive load
- Helps users discover relevant options
- Professional UX standard

---

### 3. **Real-Time Validation Feedback**
**Priority:** 🟠 **HIGH**

**Current State:** Users must click "Next" to discover they haven't met requirements. Error only shows as a warning notification.

**Recommendation:** Show validation state inline:

```html
<div class="validation-indicator">
  <i class="fa-solid fa-check-circle valid"></i>
  <i class="fa-solid fa-exclamation-triangle invalid"></i>
  <span class="validation-message">Select a feat to continue</span>
</div>

<button class="next-step" disabled="{{unless canProceed 'disabled'}}">
  Next <i class="fa-solid fa-arrow-right"></i>
</button>
```

**Benefits:**
- Immediate feedback
- Reduces frustration
- Clear expectations
- Guides users proactively

---

### 4. **Enhanced Prerequisite Display**
**Priority:** 🟠 **HIGH**

**Current State:** Prerequisites are shown as plain text. Users can't easily see what they're missing.

**Recommendation:** Color-code prerequisites based on whether they're met:

```html
<div class="feat-prerequisites">
  <span class="prereq met" title="✓ You meet this requirement">
    <i class="fa-solid fa-check"></i> BAB +7
  </span>
  <span class="prereq unmet" title="✗ You need 2 more BAB">
    <i class="fa-solid fa-times"></i> BAB +9 (You have +7)
  </span>
  <span class="prereq met">
    <i class="fa-solid fa-check"></i> Force Sensitivity
  </span>
</div>
```

**Benefits:**
- Instantly see what's blocking selection
- Encourages planning ahead
- Reduces user questions
- More informative than simple filtering

---

### 5. **Add Comparison Mode for Options**
**Priority:** 🟡 **MEDIUM**

**Current State:** Users must open multiple dialogs or remember details to compare classes, feats, or talents.

**Recommendation:** Add comparison panel:

```html
<div class="comparison-panel">
  <div class="compare-item" data-item-id="{{id}}">
    <h4>Jedi Knight</h4>
    <dl>
      <dt>Hit Die:</dt><dd>1d10</dd>
      <dt>BAB:</dt><dd>Fast (+1/level)</dd>
      <dt>Prerequisites:</dt><dd>BAB +7, Force Sensitivity...</dd>
    </dl>
    <button class="btn-remove-compare">Remove</button>
  </div>
  <div class="compare-item">...</div>
</div>

<button class="btn-add-to-compare" data-item-id="{{id}}">
  <i class="fa-solid fa-balance-scale"></i> Compare
</button>
```

**Benefits:**
- Informed decision-making
- Reduces back-and-forth
- Professional feature
- Helps new players learn

---

### 6. **Persistent Preview Panel**
**Priority:** 🟡 **MEDIUM**

**Current State:** Users don't see how their selections affect final stats until the summary screen.

**Recommendation:** Add a sidebar showing live stats:

```html
<aside class="character-preview">
  <h4>{{characterName}}</h4>
  <div class="preview-section">
    <h5>Abilities</h5>
    <ul>
      <li>STR: 14 (+2) <span class="change">+2 from Human</span></li>
      <li>DEX: 16 (+3)</li>
      <!-- ... -->
    </ul>
  </div>
  <div class="preview-section">
    <h5>Defenses</h5>
    <ul>
      <li>Fort: 15 <span class="change">+2 from class</span></li>
      <!-- ... -->
    </ul>
  </div>
  <div class="preview-section">
    <h5>Skills</h5>
    <ul>
      <li>Perception: +8 <span class="change">Trained</span></li>
      <!-- ... -->
    </ul>
  </div>
</aside>
```

**Benefits:**
- See immediate impact of choices
- Reduces summary screen surprises
- Encourages experimentation
- Feels more responsive

---

### 7. **Improve Talent Tree Visualization**
**Priority:** 🟡 **MEDIUM**

**Current State:** Talent trees are shown as lists. Hierarchical relationships aren't visual.

**Recommendation:** Use a flowchart-style visualization with SVG connections:

```html
<svg class="talent-tree" viewBox="0 0 800 600">
  <g class="talent-node" data-talent="Improved Initiative">
    <rect class="node-box available" />
    <text class="node-label">Improved Initiative</text>
    <line class="prerequisite-line" x1="400" y1="100" x2="400" y2="200" />
  </g>
  <g class="talent-node selected">
    <rect class="node-box selected" />
    <text class="node-label">Force Perception</text>
  </g>
</svg>
```

**Benefits:**
- Clear prerequisite relationships
- Encourages planning builds
- Visually appealing
- Industry standard for talent/skill trees

---

### 8. **Add Keyboard Navigation**
**Priority:** 🟡 **MEDIUM**

**Current State:** All interactions require mouse clicks.

**Recommendation:** Support keyboard shortcuts:
- `Tab` / `Shift+Tab` - Navigate between options
- `Enter` / `Space` - Select highlighted option
- `Arrow Keys` - Navigate grid layouts
- `/` - Focus search input
- `Ctrl+Z` - Undo last selection
- `Escape` - Close dialog

**Benefits:**
- Faster for power users
- Accessibility requirement
- Professional standard
- Better UX on laptops

---

### 9. **Mobile Responsive Design**
**Priority:** 🟢 **LOW**

**Current State:** Dialog is fixed-width (800px) and doesn't adapt to small screens.

**Recommendation:** Make responsive with media queries:

```css
@media (max-width: 768px) {
  .levelup-dialog {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none;
  }

  .species-grid,
  .class-grid,
  .feat-grid {
    grid-template-columns: 1fr; /* Single column on mobile */
  }

  .mentor-panel {
    position: static; /* Move from sidebar to top */
  }
}
```

**Benefits:**
- Works on tablets
- Better accessibility
- Future-proofing
- Professional standard

---

### 10. **Add Accessibility Features (ARIA, Screen Readers)**
**Priority:** 🟢 **LOW** (but important for compliance)

**Current State:** No ARIA labels or screen reader support.

**Recommendation:** Add semantic HTML and ARIA:

```html
<div role="progressbar"
     aria-valuenow="2"
     aria-valuemin="1"
     aria-valuemax="4"
     aria-label="Step 2 of 4: Feat Selection">
  <!-- progress indicator -->
</div>

<button aria-label="Select Jedi class"
        aria-describedby="jedi-description">
  <span id="jedi-description" class="sr-only">
    Jedi class. Hit die 1d10. Force-sensitive class with lightsaber proficiency.
  </span>
  <i class="fa-solid fa-jedi" aria-hidden="true"></i> Jedi
</button>
```

**Benefits:**
- Legal compliance (ADA, WCAG)
- Usable by visually impaired users
- Better SEO
- Professional standard

---

## 🔄 Flow Improvements

### 1. **Auto-Skip Inapplicable Steps**
**Priority:** 🔴 **HIGH**

**Current State:** Navigation logic tries to show steps even when they don't apply, potentially showing empty screens.

**Recommendation:** Build step list dynamically based on character state:

```javascript
_buildStepSequence() {
  const steps = ['class'];

  // Only add steps that actually apply
  if (this._isMulticlassing() && isBaseClass(this.selectedClass?.name)) {
    steps.push('multiclass-bonus');
  }

  if (getsAbilityIncrease(this.actor.system.level + 1)) {
    steps.push('ability-increase');
  }

  if (getsBonusFeat(this.selectedClass, this.actor)) {
    steps.push('feat');
  }

  if (getsTalent(this.selectedClass, this.actor)) {
    steps.push('talent');
  }

  steps.push('summary');
  return steps;
}
```

**Benefits:**
- Cleaner experience
- Fewer bugs
- Faster progression
- No empty screens

---

### 2. **Parallel Selections for Independent Choices**
**Priority:** 🟠 **HIGH**

**Current State:** Feat → Talent → Skills must be done sequentially, even though they're independent.

**Recommendation:** Combine independent selections into one step:

```html
<section class="step-combined-selections">
  <h3>Make Your Selections</h3>

  <div class="selection-group">
    <h4>Choose Your Bonus Feat</h4>
    <div class="feat-grid"><!-- feat options --></div>
  </div>

  <div class="selection-group">
    <h4>Choose Your Talent</h4>
    <div class="talent-tree"><!-- talent options --></div>
  </div>

  <div class="validation-summary">
    <p class="{{if featSelected 'valid' 'invalid'}}">
      {{if featSelected '✓' '○'}} Feat selected
    </p>
    <p class="{{if talentSelected 'valid' 'invalid'}}">
      {{if talentSelected '✓' '○'}} Talent selected
    </p>
  </div>

  <button class="next-step" disabled="{{unless allValid 'disabled'}}">
    Continue
  </button>
</section>
```

**Benefits:**
- Faster completion
- Reduces steps by ~30%
- More flexible workflow
- Modern UX pattern

---

### 3. **Implement Draft Saving / Resume Later**
**Priority:** 🟠 **HIGH**

**Current State:** If the dialog is closed, all progress is lost.

**Recommendation:** Auto-save to actor flags:

```javascript
// Auto-save every 30 seconds or on step change
_autoSave() {
  const draft = {
    currentStep: this.currentStep,
    selectedClass: this.selectedClass?.id,
    selectedFeats: this.selectedFeats.map(f => f.id),
    selectedTalent: this.selectedTalent?.id,
    abilityIncreases: this.abilityIncreases,
    timestamp: Date.now()
  };

  this.actor.setFlag('swse', 'levelUpDraft', draft);
}

// Restore on open
constructor(actor, options = {}) {
  super(actor, options);

  const draft = actor.getFlag('swse', 'levelUpDraft');
  if (draft && (Date.now() - draft.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours
    Dialog.confirm({
      title: 'Resume Level Up?',
      content: 'You have an unfinished level-up. Resume where you left off?',
      yes: () => this._restoreDraft(draft),
      no: () => this._clearDraft()
    });
  }
}
```

**Benefits:**
- No lost progress
- Reduces frustration
- Allows research/planning
- Professional feature

---

### 4. **Split Summary Into Review + Confirm**
**Priority:** 🟡 **MEDIUM**

**Current State:** Summary step has "Complete Level Up" button that immediately applies changes. No going back.

**Recommendation:** Two-step confirmation:

```javascript
// Step 1: Review (can go back)
<section class="step-review">
  <h3>Review Your Choices</h3>
  <div class="review-summary">
    <!-- Show all selections -->
  </div>
  <button class="prev-step">Go Back & Change</button>
  <button class="next-step">Looks Good - Confirm</button>
</section>

// Step 2: Finalize (point of no return)
<section class="step-finalize">
  <h3>Ready to Level Up?</h3>
  <div class="final-confirmation">
    <p><strong>⚠️ This cannot be undone!</strong></p>
    <p>Your character will be permanently updated.</p>
  </div>
  <button class="prev-step">Wait, Go Back</button>
  <button class="complete-levelup">Confirm & Apply Changes</button>
</section>
```

**Benefits:**
- Reduces mistakes
- Clear point of no return
- Matches user expectations
- Professional pattern

---

### 5. **Add Build Recommendations for New Players**
**Priority:** 🟡 **MEDIUM**

**Current State:** New players are overwhelmed by choices and don't know what's "good".

**Recommendation:** Offer guided builds:

```javascript
<div class="build-suggestions">
  <h4>Not sure what to choose? Try these builds:</h4>

  <button class="build-template" data-build="tank">
    <i class="fa-solid fa-shield-alt"></i>
    <h5>Tank Build</h5>
    <p>High HP, good defenses, melee focus</p>
    <span class="build-selections">
      +2 CON, +2 STR | Improved Damage Threshold | Armor Specialist
    </span>
  </button>

  <button class="build-template" data-build="sniper">
    <i class="fa-solid fa-crosshairs"></i>
    <h5>Sniper Build</h5>
    <p>Long-range precision damage</p>
    <span class="build-selections">
      +2 DEX | Point Blank Shot | Deadeye
    </span>
  </button>

  <button class="build-template" data-build="force-user">
    <i class="fa-solid fa-hand-sparkles"></i>
    <h5>Force User Build</h5>
    <p>Enhanced Force powers</p>
    <span class="build-selections">
      +2 WIS, +2 CHA | Skill Focus (Use the Force) | Force Perception
    </span>
  </button>
</div>
```

**Benefits:**
- Reduces decision paralysis
- Educates new players
- Faster character creation
- Encourages experimentation

---

### 6. **Add Contextual Help & Rules Text**
**Priority:** 🟡 **MEDIUM**

**Current State:** Users must reference external rulebooks to understand options.

**Recommendation:** Embed rules text in tooltips and help panels:

```html
<div class="feat-card" data-help="combat-feats">
  <h5>Point Blank Shot</h5>
  <button class="btn-help" aria-label="Show rules">
    <i class="fa-solid fa-question-circle"></i>
  </button>
</div>

<!-- Help panel -->
<div class="help-panel" data-help-id="combat-feats">
  <h4>Combat Feats</h4>
  <p>Combat feats improve your effectiveness in battle. Most require Base Attack Bonus prerequisites.</p>
  <h5>Point Blank Shot</h5>
  <p><strong>Prerequisites:</strong> None</p>
  <p><strong>Benefit:</strong> You get a +1 bonus on attack rolls and damage rolls with ranged weapons at ranges of up to 6 squares.</p>
  <p><strong>Source:</strong> SWSE Core Rulebook, p. 87</p>
</div>
```

**Benefits:**
- Self-contained experience
- Faster decision-making
- Educational for new players
- Reduces external lookups

---

### 7. **Improved Undo/Redo Functionality**
**Priority:** 🟡 **MEDIUM**

**Current State:** Users can only go back one step at a time, and selections are lost when going back.

**Recommendation:** Implement history stack:

```javascript
class SelectionHistory {
  constructor() {
    this.past = [];
    this.present = null;
    this.future = [];
  }

  record(state) {
    this.past.push(this.present);
    this.present = foundry.utils.deepClone(state);
    this.future = [];
  }

  undo() {
    if (this.past.length === 0) return null;
    this.future.unshift(this.present);
    this.present = this.past.pop();
    return this.present;
  }

  redo() {
    if (this.future.length === 0) return null;
    this.past.push(this.present);
    this.present = this.future.shift();
    return this.present;
  }
}
```

**Benefits:**
- Encourages experimentation
- Reduces anxiety about choices
- Professional feature
- Better UX

---

### 8. **Add Post-Creation Onboarding**
**Priority:** 🟢 **LOW**

**Current State:** After character creation, users are dropped into the character sheet with no guidance.

**Recommendation:** Show a quick tutorial overlay:

```html
<div class="onboarding-overlay">
  <div class="onboarding-card">
    <h3>🎉 Character Created!</h3>
    <p>Here's what to do next:</p>
    <ol>
      <li><i class="fa-solid fa-shopping-bag"></i> Visit the <button class="link-shop">Shop</button> to buy equipment</li>
      <li><i class="fa-solid fa-book"></i> Review your <button class="link-features">class features</button></li>
      <li><i class="fa-solid fa-dice-d20"></i> Learn how <button class="link-rolling">rolling works</button></li>
      <li><i class="fa-solid fa-users"></i> Join your GM's game!</li>
    </ol>
    <button class="btn-dismiss">Got it, thanks!</button>
    <label>
      <input type="checkbox" name="dont-show-again">
      Don't show this again
    </label>
  </div>
</div>
```

**Benefits:**
- Reduces confusion
- Guides new players
- Showcases features
- Professional onboarding

---

### 9. **Smooth Transition to Character Sheet**
**Priority:** 🟢 **LOW**

**Current State:** Dialog closes abruptly and character sheet opens separately.

**Recommendation:** Animated transition with highlights:

```javascript
async _onCompleteLevelUp() {
  // ... apply changes ...

  // Fade out dialog
  this.element.addClass('fade-out');
  await new Promise(resolve => setTimeout(resolve, 300));
  this.close();

  // Open sheet with highlights
  const sheet = this.actor.sheet;
  sheet.render(true, {
    highlights: {
      items: this.selectedFeats.concat([this.selectedTalent]),
      stats: ['hp', 'level', 'abilities']
    }
  });

  // Flash new additions
  setTimeout(() => {
    sheet.element.find('.new-item').addClass('flash-highlight');
  }, 500);
}
```

**Benefits:**
- Professional polish
- Shows what changed
- Feels more connected
- Reduces disorientation

---

### 10. **Add "What's Changed" Summary in Chat**
**Priority:** 🟢 **LOW**

**Current State:** Chat message shows new level and selections, but doesn't highlight what's different.

**Recommendation:** Enhanced chat message with delta view:

```html
<div class="level-up-chat-message">
  <h3>{{actor.name}} reached Level {{newLevel}}!</h3>

  <div class="changes-summary">
    <h4>What's New:</h4>
    <ul>
      <li class="change-hp">
        <i class="fa-solid fa-heart"></i> HP: {{oldHP}} → <strong>{{newHP}}</strong> (+{{hpGain}})
      </li>
      <li class="change-bab">
        <i class="fa-solid fa-fist-raised"></i> BAB: +{{oldBAB}} → <strong>+{{newBAB}}</strong>
      </li>
      <li class="change-abilities">
        <i class="fa-solid fa-arrow-up"></i> STR +2, WIS +2
      </li>
      <li class="change-feat">
        <i class="fa-solid fa-star"></i> New Feat: <strong>{{feat.name}}</strong>
      </li>
      <li class="change-talent">
        <i class="fa-solid fa-gem"></i> New Talent: <strong>{{talent.name}}</strong>
      </li>
    </ul>
  </div>

  <button class="btn-view-sheet" data-actor-id="{{actor.id}}">
    View Character Sheet <i class="fa-solid fa-external-link-alt"></i>
  </button>
</div>
```

**Benefits:**
- Clear communication to GM/players
- Creates shared moment
- Good record keeping
- Professional presentation

---

## 📊 Priority Matrix

### Bugs to Fix (In Order)
1. 🔴 Level 0 character creation path (CRITICAL)
2. 🟠 Pending skills structure mismatch (HIGH)
3. 🟠 Multiclass bonus navigation bug (HIGH)
4. 🟡 Feat availability not updating (MEDIUM)
5. 🟡 Race/species inconsistency (MEDIUM)
6. 🟡 No duplicate feat prevention (MEDIUM)
7. 🟡 Talent prerequisite parsing (MEDIUM)
8. 🟡 Missing compendium error handling (MEDIUM)
9. 🟡 Droid credits not applied (MEDIUM)
10. 🟢 Point buy validation (LOW)

### Structure Improvements (In Order)
1. 🔴 Consolidate character creation logic
2. 🟠 Extract validation to centralized service
3. 🟠 Move prerequisites to configuration
4. 🟡 Implement state machine for navigation
5. 🟡 Separate presentation from logic
6. 🟢 Add comprehensive JSDoc types
7. 🟢 Implement event-based communication

### UI/UX Improvements (In Order)
1. 🔴 Add visual progress indicator
2. 🔴 Add search and filter functionality
3. 🟠 Real-time validation feedback
4. 🟠 Enhanced prerequisite display
5. 🟡 Add comparison mode
6. 🟡 Persistent preview panel
7. 🟡 Improve talent tree visualization
8. 🟡 Add keyboard navigation
9. 🟢 Mobile responsive design
10. 🟢 Accessibility features (ARIA)

### Flow Improvements (In Order)
1. 🔴 Auto-skip inapplicable steps
2. 🟠 Parallel selections for independent choices
3. 🟠 Draft saving / resume later
4. 🟡 Split summary into review + confirm
5. 🟡 Build recommendations
6. 🟡 Contextual help & rules text
7. 🟡 Undo/redo functionality
8. 🟢 Post-creation onboarding
9. 🟢 Smooth transition to character sheet
10. 🟢 "What's changed" chat summary

---

## 🎯 Recommended Implementation Phases

### Phase 1: Critical Fixes (1-2 weeks)
**Goal:** Fix breaking bugs and major UX issues

- ✅ Fix level 0 character creation path
- ✅ Fix pending skills structure mismatch
- ✅ Fix multiclass bonus navigation
- ✅ Consolidate character creation logic
- ✅ Add visual progress indicator
- ✅ Add search and filter functionality

**Impact:** System becomes stable and usable for production

---

### Phase 2: Core Improvements (2-3 weeks)
**Goal:** Improve structure and common workflows

- ✅ Extract validation to centralized service
- ✅ Move prerequisites to configuration
- ✅ Real-time validation feedback
- ✅ Enhanced prerequisite display
- ✅ Auto-skip inapplicable steps
- ✅ Draft saving / resume later

**Impact:** Development becomes easier, users have fewer frustrations

---

### Phase 3: Polish & Features (2-3 weeks)
**Goal:** Add professional features and polish

- ✅ Implement state machine for navigation
- ✅ Parallel selections for independent choices
- ✅ Add comparison mode
- ✅ Persistent preview panel
- ✅ Build recommendations
- ✅ Contextual help

**Impact:** System feels professional and polished

---

### Phase 4: Nice-to-Haves (1-2 weeks)
**Goal:** Add finishing touches

- ✅ Improve talent tree visualization
- ✅ Keyboard navigation
- ✅ Mobile responsive design
- ✅ Accessibility features
- ✅ Post-creation onboarding
- ✅ Smooth transitions

**Impact:** System exceeds user expectations

---

## 🧪 Testing Recommendations

### Unit Tests Needed
```javascript
describe('PrerequisiteValidator', () => {
  it('should validate ability score prerequisites correctly');
  it('should validate BAB prerequisites correctly');
  it('should validate class level prerequisites correctly');
  it('should handle missing prerequisites gracefully');
});

describe('LevelUpStateMachine', () => {
  it('should build correct step sequence for multiclass character');
  it('should skip inapplicable steps');
  it('should validate transitions between steps');
});
```

### Integration Tests Needed
```javascript
describe('Level Up Flow', () => {
  it('should complete level up for base class');
  it('should handle multiclass with feat choice');
  it('should handle ability increases correctly');
  it('should apply retroactive HP from CON increase');
});

describe('Character Generation Flow', () => {
  it('should create living character with all selections');
  it('should create droid character with systems');
  it('should validate point buy correctly');
});
```

### Manual Test Scenarios
1. **Level 0 → 1** (new character creation via level-up)
2. **Level 1 → 2** (first real level-up)
3. **Level 3 → 4** (ability increase level)
4. **Level 6 → 7** (milestone feat level)
5. **Multiclass into prestige class** (complex prerequisites)
6. **Close dialog mid-process** (draft saving)
7. **Navigate back and forth** (state preservation)
8. **Search and filter** (performance with large datasets)

---

## 📝 Documentation Needs

1. **Developer Documentation**
   - Architecture overview
   - State flow diagrams
   - API reference
   - Testing guide

2. **User Documentation**
   - Character creation guide
   - Level-up guide
   - Troubleshooting common issues
   - Video tutorials

3. **Code Comments**
   - Complex validation logic
   - State transitions
   - Retroactive calculations
   - Edge cases

---

## 🎬 Conclusion

The character generation and level-up system is **impressively comprehensive** with sophisticated features like mentor narration, dynamic step flows, and retroactive calculations. However, it suffers from:

1. **Critical bugs** that can break workflows
2. **Structural complexity** that makes maintenance difficult
3. **UX friction** that frustrates users
4. **Missing polish** expected in modern applications

By addressing the issues outlined in this review, particularly the **Phase 1 and Phase 2 items**, the system can become:
- ✅ **Stable and reliable**
- ✅ **Easy to maintain**
- ✅ **Delightful to use**
- ✅ **Professional quality**

**Estimated Total Effort:** 6-10 weeks for complete implementation of all recommendations.

**Recommended Next Steps:**
1. Fix critical bugs (Level 0 path, skills mismatch, navigation)
2. Add progress indicator and search functionality
3. Consolidate character creation logic
4. Extract validation service
5. Implement draft saving

---

*End of Review Document*
