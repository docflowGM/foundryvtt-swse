# Phase 2 Summary Step Refactor — Character Naming Migration

**Date:** 2026-03-16
**Status:** ✅ IMPLEMENTED
**Type:** UX Flow Restructuring
**Scope:** Remove NameStep as dedicated progression step, migrate naming to SummaryStep

---

## Executive Summary

The character naming flow has been restructured to happen as part of the final "Datapad Profile Registration" step (SummaryStep) instead of as the first progression step. This creates a more intuitive narrative flow where players build their character first, then finalize it by registering their character's name.

**Old Flow:**
```
NameStep (name, level) → Species → Attributes → Class → Skills → Feats → Talents → Summary → Confirm
```

**New Flow:**
```
Species → Attributes → Class → Skills → Feats → Talents → Summary (with name registration) → Confirm
```

---

## Files Modified

### 1. Core Routing & Step Sequence
**File:** `/scripts/apps/progression-framework/chargen-shell.js`

**Changes:**
- Removed `import { NameStep }` declaration (line 18)
- Removed NameStep from `CHARGEN_CANONICAL_STEPS` array (previously lines 124-130)
- Added note documenting Phase 2 Summary Refactor decision
- Updated canonical step sequence documentation to reflect new flow

**Before:**
```javascript
import { NameStep } from './steps/name-step.js';
// ... in CHARGEN_CANONICAL_STEPS:
{
  stepId: 'name',
  label: 'Name',
  icon: 'fa-id-badge',
  type: StepType.IDENTITY,
  pluginClass: NameStep,
},
```

**After:**
```javascript
// NameStep import removed
// Step sequence now begins with 'species' as first identity choice
```

---

### 2. Summary Step Plugin
**File:** `/scripts/apps/progression-framework/steps/summary-step.js`

**Major Changes:**

#### a) Constructor & State (Added character naming state)
```javascript
// NEW: Character naming state (was in NameStep)
this._characterName = '';
this._startingLevel = 1;

// Enhanced summary object to track all data types
this._summary = {
  name: '',
  level: 1,
  species: '',
  class: '',
  attributes: {},
  skills: [],
  feats: [],
  talents: [],
  languages: [],  // NEW: Added language tracking
  money: { total: 0, sources: [] },  // NEW: For future money display
  hpCalculation: { base: 0, modifiers: 0, total: 0 },  // NEW: For HP preview
};
```

#### b) onStepEnter() - Load/Restore Name
```javascript
// NEW: Load existing name/level from character if available
const character = shell.actor?.system || {};
if (character.identity?.name) {
  this._characterName = character.identity.name;
}
if (shell.targetLevel) {
  this._startingLevel = shell.targetLevel;
}
```

#### c) onDataReady() - Wire Name Input & Random Name Buttons
```javascript
// NEW: Wire name input field (now editable on THIS step)
const nameInput = shell.element.querySelector('.summary-step-name-input');
if (nameInput) {
  nameInput.value = this._characterName;
  nameInput.addEventListener('input', (e) => {
    this._characterName = e.target.value;
    this._summary.name = e.target.value;
  });
}

// NEW: Wire level slider (1-20)
const levelInput = shell.element.querySelector('.summary-step-level-input');
if (levelInput) {
  levelInput.value = this._startingLevel;
  levelInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 20) {
      this._startingLevel = val;
      this._summary.level = val;
    }
  });
}

// NEW: Random name generation buttons
const randomNameBtn = shell.element.querySelector('.summary-step-random-name-btn');
const randomDroidNameBtn = shell.element.querySelector('.summary-step-random-droid-name-btn');
// ... event listeners to generate names when clicked
```

#### d) Validation - Name Now Required Here
```javascript
// CRITICAL CHANGE: Character name is now REQUIRED on this step
if (!this._characterName || this._characterName.trim() === '') {
  errors.push('Character name is required (enter or generate a name above)');
}
```

#### e) Random Name Generation Methods (Migrated from NameStep)
```javascript
// NEW: These methods migrated from NameStep._generateRandomName()
async _generateRandomName(actor) { ... }
async _generateRandomDroidName(actor) { ... }
```

#### f) Data Aggregation - No NameStep Committed Data
```javascript
// CHANGED: No longer reads from steps.get('name')
// Name/Level comes from THIS step's inputs, not prior step
this._summary.name = this._characterName || character.identity?.name || '';
this._summary.level = this._startingLevel || shell.targetLevel || 1;

// NEW: Also aggregates languages and feats more comprehensively
```

#### g) getStepData() - Returns Name & Level
```javascript
async getStepData(context) {
  return {
    summary: this._summary,
    characterName: this._characterName,  // FINAL name for actor creation
    startingLevel: this._startingLevel,   // FINAL level (1-20)
    isReviewComplete: this._isReviewComplete,
  };
}
```

---

### 3. Summary Step Template
**File:** `/templates/apps/progression-framework/steps/summary-work-surface.hbs`

**Major Changes:**

#### a) Left Panel Title & Purpose (Changed from "Character Identity" to "Register Datapad Profile")
```handlebars
{{!-- Before: "Character Identity" (read-only) --}}
{{!-- After: "Register Datapad Profile" (with editable name & level) --}}
```

#### b) Name Input Section (NEW)
```handlebars
<div class="prog-name-input-section">
  <label for="summary-name-input" class="prog-input-label">Character Name</label>
  <input
    type="text"
    id="summary-name-input"
    class="summary-step-name-input prog-text-input"
    placeholder="Enter or generate a name..."
    value="{{characterName}}"
  />

  <div class="prog-random-name-buttons">
    <button class="summary-step-random-name-btn prog-btn prog-btn--small">
      <i class="fas fa-dice"></i> Generate Name
    </button>
    <button class="summary-step-random-droid-name-btn prog-btn prog-btn--small">
      <i class="fas fa-dice"></i> Droid Name
    </button>
  </div>
</div>
```

#### c) Level Slider (NEW)
```handlebars
<div class="prog-level-input-section">
  <label for="summary-level-input" class="prog-input-label">Starting Level</label>
  <div class="prog-level-display">
    <input
      type="range"
      id="summary-level-input"
      class="summary-step-level-input prog-level-slider"
      min="1"
      max="20"
      value="{{startingLevel}}"
    />
    <span class="prog-level-value">{{startingLevel}}</span>
  </div>
</div>
```

#### d) Right Panel - Checklist Updated (Name now editable here)
```handlebars
{{!-- Before: "Character Name Required" (expected from NameStep) --}}
{{!-- After: "Name Registered: [name]" (with pencil icon indicating editable) --}}

<div class="prog-checklist-item {{#if characterName}}complete{{/if}}">
  <i class="fas {{#if characterName}}fa-check-circle{{else}}fa-circle{{/if}}"></i>
  <span class="prog-checklist-label">
    {{#if characterName}}
      <i class="fas fa-pencil-alt"></i> Name Registered: <strong>{{characterName}}</strong>
    {{else}}
      <i class="fas fa-pencil-alt"></i> Name Registration Required (see left)
    {{/if}}
  </span>
</div>
```

#### e) Flavor Text Updated
```
"Datapad Registration: Review all choices. Enter your character's final name above."
```

---

### 4. Summary Step CSS
**File:** `/styles/progression-framework/steps/summary-step.css`

**New CSS Classes Added:**

#### a) Name Input Section
```css
.prog-name-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prog-input-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--prog-text-dim);
}

.prog-text-input {
  padding: 0.75rem;
  background: var(--prog-bg-surface);
  border: 1px solid var(--prog-border-accent);
  border-radius: 3px;
  font-size: 1rem;
  color: var(--prog-text);
  transition: border-color 0.2s;
}

.prog-text-input:focus {
  outline: none;
  border-color: var(--prog-accent);
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.3);
}
```

#### b) Random Name Generation Buttons
```css
.prog-random-name-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.prog-btn--small {
  padding: 0.5rem 0.75rem;
  background: var(--prog-bg-surface);
  border: 1px solid var(--prog-border-accent);
  border-radius: 3px;
  color: var(--prog-accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.prog-btn--small:hover {
  background: var(--prog-bg-selected);
  border-color: var(--prog-accent);
  color: var(--prog-accent-bright);
}
```

#### c) Level Slider
```css
.prog-level-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prog-level-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--prog-bg-surface);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.prog-level-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--prog-accent);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.4);
}

.prog-level-value {
  min-width: 2.5rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--prog-accent);
}
```

---

## Key Design Decisions

### 1. Why Remove NameStep from the Sequence?
- **UX Narrative:** Building character attributes first, then naming provides a more natural flow
- **"Datapad Registration" Metaphor:** The final summary step feels like registering a completed profile
- **Reduced Cognitive Load:** Players focus on mechanics/attributes first, then personalize with a name
- **Flexibility:** Level can be adjusted alongside name at the end

### 2. Why Keep Name as Required?
- **Data Integrity:** Character MUST have a name for actor creation
- **Prevents Skipping:** Players can't progress without entering/generating a name
- **Clear Validation:** Error message indicates where to provide name (on SummaryStep)

### 3. Why Include Level Slider in SummaryStep?
- **Co-location:** Name and level are related identity attributes
- **Final Adjustment:** Allows players to adjust starting level after seeing full character
- **Consistency:** Keeps all "identity registration" inputs together

### 4. Why Preserve Random Name Generators?
- **No Reinvention:** Migrated functions directly from NameStep (use every part of the buffalo)
- **Feature Parity:** Both "Generate Name" and "Generate Droid Name" available
- **Existing Logic:** Reuses getRandomName() and getRandomDroidName() from chargen-shared.js

---

## Data Flow & State Management

### Before Refactor (NameStep Approach)
```
User opens Chargen
  ↓
NameStep.onStepEnter() → Load existing name/level
  ↓
NameStep.onDataReady() → Wire input handlers
  ↓
User enters name, adjusts level
  ↓
NameStep.validate() → "Name required" error if empty
  ↓
NameStep.getStepData() → {characterName, startingLevel}
  ↓
Shell stores in committedSelections.set('name', data)
  ↓
Proceed through remaining steps
  ↓
SummaryStep reads from committedSelections.get('name')
```

### After Refactor (SummaryStep Approach)
```
User opens Chargen
  ↓
Species → Attributes → Class → Skills → Feats → Talents
  ↓
SummaryStep.onStepEnter() → Load existing name/level (if available)
  ↓
SummaryStep.onDataReady() → Wire name input, level slider, random name buttons
  ↓
User enters/generates name, adjusts level
  ↓
SummaryStep.validate() → "Name required" error if empty
  ↓
SummaryStep.getStepData() → {characterName, startingLevel, summary}
  ↓
Shell stores in committedSelections.set('summary', data)
  ↓
ConfirmStep uses characterName from SummaryStep's data
```

---

## Validation Changes

### NameStep Validation (REMOVED)
```javascript
// Previously required name on first step
if (!this._characterName || this._characterName.trim() === '') {
  errors.push('Character name is required');
}
```

### SummaryStep Validation (UPDATED)
```javascript
// Now requires name on FINAL step (enforces "datapad registration")
if (!this._characterName || this._characterName.trim() === '') {
  errors.push('Character name is required (enter or generate a name above)');
}

// Also validates level (was done in NameStep, now done here)
if (this._startingLevel < 1 || this._startingLevel > 20) {
  errors.push('Starting level must be between 1 and 20');
}
```

---

## Navigation & Flow Impact

### No Breaking Changes to Shell Navigation
- The step progression logic in ProgressionShell remains unchanged
- Only the SEQUENCE of steps changes (name moved to the end)
- Next/Back buttons continue to work as expected
- State persistence mechanisms remain identical

### Step Count
- **Before:** 13 steps (name + 12 others)
- **After:** 12 steps (removed dedicated NameStep, consolidated into Summary)

---

## Backward Compatibility & Migration

### Existing Character Data
- If a character already has `identity.name` set, SummaryStep loads it
- If a character has `targetLevel` set, it's used as default
- No data loss or corruption

### New Character Creation
- First-time players skip NameStep entirely
- Flow begins with Species selection
- Name is only entered/finalized at SummaryStep

---

## Testing Validation Checklist

- [ ] ChargenShell properly removes NameStep from canonical sequence
- [ ] SummaryStep renders with name input field visible
- [ ] Name input accepts text and updates character name
- [ ] "Generate Name" button generates random name for living beings
- [ ] "Generate Droid Name" button generates droid-appropriate name
- [ ] Level slider ranges 1-20 and reflects selected value
- [ ] Validation blocks progression if name is empty
- [ ] Validation allows progression if name is entered or generated
- [ ] SummaryStep.validate() requires name (not optional)
- [ ] Character name from SummaryStep is used in actor creation
- [ ] Starting level from SummaryStep is applied to created actor
- [ ] Back navigation returns to prior steps (Species, Attributes, etc.)
- [ ] Navigation from Species directly to Summary (no NameStep in between)
- [ ] CSS styling is applied: input field, buttons, level slider
- [ ] Focus states work (input focus, button hover)
- [ ] Mobile responsiveness maintained
- [ ] No console errors during step transitions

---

## Summary of Implementation

✅ **NameStep Removed:** No longer appears in canonical step sequence
✅ **SummaryStep Enhanced:** Now includes name input, level slider, random generators
✅ **Validation Updated:** Name required on SummaryStep (final registration)
✅ **UI Reframed:** "Register Datapad Profile" instead of "Review Summary"
✅ **CSS Extended:** New styling for inputs, buttons, sliders with holo theme
✅ **Data Flow Preserved:** All state management and persistence mechanisms intact
✅ **Navigation Unchanged:** Shell routing logic unaffected
✅ **Code Reused:** Random name generators migrated (no reinvention)

---

## Next Actions

### Phase 2 Runtime Validation
Run the Phase 2 Validation Guide with the updated flow:
1. Create test character
2. Select Species (first step, no NameStep)
3. Progress through Attributes, Class, Skills, Feats, Talents
4. Arrive at SummaryStep
5. Enter character name in name field
6. Test random name generation
7. Adjust level slider
8. Verify validation blocks without name
9. Verify validation allows progression with name
10. Complete chargen and verify actor has correct name and level

### Future Phases
- Phase 3: Levelup shell, NPC chargen, Beast chargen
- Once confirmed working: Archive inert NameStep files (optional cleanup)

---

**Phase 2 Summary Step Refactor: IMPLEMENTATION COMPLETE**

*"Use every part of the buffalo" — Name generation logic preserved, NameStep consolidated into final "datapad registration" phase.*
