# SWSE Progression UI Refactor — Current Status & Execution Plan

## Executive Summary

The **new progression shell architecture is 80% complete**. The sophisticated ProgressionShell framework exists and many steps are migrated. The refactor task is to:

1. **Complete first-wave step migration** (Name, Skills, Summary)
2. **Consolidate CSS** around the holo-theme reference
3. **Ensure numeric colors** are applied globally
4. **Deprecate the monolithic chargen.hbs** fallback

---

## Current State

### ✅ What Exists

**Architecture Layer:**
- `ProgressionShell` class (sophisticated 6-region framework)
  - mentor-rail, progress-rail, utility-bar, work-surface, details-panel, action-footer
  - Step plugin pattern (ProgressionStepPlugin base class)
  - ConditionalStepResolver for dynamic steps
  - Focus vs commit selection model
- `ChargenShell` entry point (extends ProgressionShell)
- Activated via `useNewProgressionShell` game setting

**Migrated Steps (9 complete):**
- AttributeStep (with point-buy, standard-roll, organic-roll methods)
- BackgroundStep
- ClassStep
- FeatStep (GeneralFeat, ClassFeat)
- LanguageStep
- TalentStep (with talent-tree browser/graph variants)
- SpeciesStep
- DroidBuilderStep
- ConfirmStep

**Force/Specialty Steps (3):**
- ForceSecretStep
- ForcePowerStep
- ForceSecretStep
- StarshipManeuverStep

**Visual Foundation:**
- `holo-theme.css` (dark/cyan/glow, numeric colors)
- `progression-shell.css` (6-region layout)
- Step-specific CSS files
- CSS variables for colors and spacing

---

### ❌ What's Missing

**First-Wave Steps (3 gaps):**
1. **NameStep** — doesn't exist in new framework
   - Old stub exists at `/scripts/apps/chargen/steps/name-step.js`
   - Minimal (only builds patch, no UI)
2. **SkillsStep** — doesn't exist at all
3. **SummaryStep** — doesn't exist at all

**Old System Fallback:**
- Monolithic `chargen.hbs` (328 lines) is still the default
  - Handles name + abilities with full templates
  - Has catchall placeholder for unmigrated steps
  - Prevents 100% adoption of new shell

---

## Refactor Plan

### Phase 1: First-Wave Migration

#### Task 1: Create NameStep Plugin
**Location:** `/scripts/apps/progression-framework/steps/name-step.js`

**Structure:**
```javascript
import { ProgressionStepPlugin } from './step-plugin-base.js';

export class NameStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._characterName = '';
  }

  // Implement all required abstract methods:
  // - onStepEnter()
  // - getStepData() → {name: string}
  // - validate() → {isValid, errors, warnings}
  // - renderWorkSurface() → renders to work-surface region
}
```

**Template:** `/templates/apps/progression-framework/steps/name-work-surface.hbs`
- Character name input
- Random name button (connect to existing random-name logic)
- Starting level input
- Help text in right panel

**Left Panel:** Character Overview (name, level, species, class)
**Center Panel:** Name/Level inputs + random buttons
**Right Panel:** Details about identity anchor

#### Task 2: Create SkillsStep Plugin
**Location:** `/scripts/apps/progression-framework/steps/skills-step.js`

**Data Model:**
```
{
  trainedSkills: {skill_id: {isSelected: boolean, classSkill: boolean}},
  selectedCount: number,
  allowedCount: number,
  classSkillBonus: number
}
```

**Template:** `/templates/apps/progression-framework/steps/skills-work-surface.hbs`
- Filterable skill list
- Class skill indicator
- Trained skills counter (X/Y selected)
- Rank input (if applicable)

**Left Panel:** Skills summary, trained count
**Center Panel:** Skill selection browser
**Right Panel:** Skill details, class skill info

#### Task 3: Create SummaryStep Plugin
**Location:** `/scripts/apps/progression-framework/steps/summary-step.js`

**Data Model:**
```
{
  name: string,
  level: number,
  species: string,
  class: string,
  attributes: {str, dex, con, int, wis, cha},
  skills: {trained_count, language_count},
  feats: {starting_feat_name},
  talents: {general, class},
  // readonly review data
}
```

**Template:** `/templates/apps/progression-framework/steps/summary-work-surface.hbs`
- Full character summary review
- Completion checklist
- "Back to start" or "Edit [step]" buttons
- Proceed to finalization button

**Left Panel:** Character identity card (name, level, species, class, portrait)
**Center Panel:** Complete progression summary (all steps reviewed)
**Right Panel:** Rules summary or next steps guidance

#### Task 4: Integrate Steps into ChargenShell
**File:** `/scripts/apps/progression-framework/chargen-shell.js`

Add steps to `CHARGEN_CANONICAL_STEPS`:
```javascript
{
  stepId: 'name',
  label: 'Identity',
  icon: 'fa-user',
  pluginClass: NameStep,
},
{
  stepId: 'skills',
  label: 'Skills',
  icon: 'fa-book-open',
  pluginClass: SkillsStep,
},
{
  stepId: 'summary',
  label: 'Review',
  icon: 'fa-list-check',
  pluginClass: SummaryStep,
},
```

Update progress rail to show all canonical steps.

---

### Phase 2: CSS Consolidation

#### Task 1: Verify Numeric Colors
**Files to check:**
- `holo-theme.css` — confirm variables exist
- All step CSS files — confirm color classes applied

**Numeric Color Rule:**
```css
.swse-positive { color: var(--prog-color-positive); } /* bright green */
.swse-negative { color: var(--prog-color-negative); } /* bright red */
.swse-zero { color: var(--prog-color-zero); } /* bright yellow */
```

#### Task 2: Consolidate Step CSS
- Identify orphaned or duplicate styles
- Merge conflicting CSS stacks
- Ensure all steps use holo-theme variables
- Remove old chargen.css patches if no longer needed

---

### Phase 3: Testing & Handoff

#### Task 1: Verify Shell Activation
- Confirm `useNewProgressionShell` setting works
- Test chargen flow with all first-wave steps
- Verify mentor header updates
- Verify step rail navigation
- Verify footer progression state

#### Task 2: Deprecate Old Monolith
- Keep chargen.hbs as fallback (for safety)
- Document deprecation path
- Note in chargen-main.js that new shell is preferred

#### Task 3: Documentation
- Architecture summary (this document + diagrams)
- Plugin creation guide (for future step devs)
- CSS theming guide (variables and conventions)
- Step-by-step validation checklist

---

## Reference Implementation

### AttributeStep Pattern (Use as Reference)

**Plugin (`attribute-step.js`):**
- Stores state (method, base scores, modifiers, focused ability, pool)
- Implements all ProgressionStepPlugin methods
- Handles complex logic (point buy calculations, rolling methods)
- Emits data in getStepData()

**Template (`attribute-work-surface.hbs`):**
- Method selector buttons (point-buy, standard, organic)
- Conditional sections based on method
- Ability rows with increment/decrement UI
- Progress bar for point buy status
- Semantic markup with data attributes for JS binding

**CSS (`attribute-step.css`):**
- Grid layout for ability rows
- Button states and hover
- Active method indicator
- Numeric color classes (`swse-positive`, `swse-negative`, `swse-zero`)
- Uses holo-theme variables for colors/spacing

**JS Bindings:**
- Data attributes for selectors: `data-method`, `data-ability-row`
- Action hooks in footer for next/prev/confirm
- No hardcoded IDs — uses class selectors for resilience

---

## File Checklist

### New Files to Create
```
/scripts/apps/progression-framework/steps/
  name-step.js
  skills-step.js
  summary-step.js

/templates/apps/progression-framework/steps/
  name-work-surface.hbs
  skills-work-surface.hbs
  summary-work-surface.hbs

/styles/progression-framework/steps/
  name-step.css
  skills-step.css
  summary-step.css
```

### Files to Modify
```
/scripts/apps/progression-framework/chargen-shell.js
  → Add NameStep, SkillsStep, SummaryStep imports
  → Add to CHARGEN_CANONICAL_STEPS array

/styles/progression-framework/progression-framework.css
  → Import new step CSS files

/styles/progression-framework/holo-theme.css
  → Verify numeric color variables exist

/scripts/apps/chargen/chargen-main.js
  → Document new shell preference (comment only)
```

### Files to Deprecate (Keep as Fallback)
```
/templates/apps/chargen.hbs
  → Keep functional but mark for deprecation
  → Add comment: "Fallback only. Use ProgressionShell."

/scripts/apps/chargen/steps/name-step.js
  → Keep but mark deprecated
```

---

## Success Criteria (Phase 1)

- [ ] NameStep plugin created and integrated
- [ ] SkillsStep plugin created and integrated
- [ ] SummaryStep plugin created and integrated
- [ ] All first-wave steps render in new shell layout
- [ ] Mentor header displays correctly
- [ ] Step rail shows all 7 canonical steps
- [ ] Utility bar shows current state
- [ ] 3-column layout (left rail | center | right rail) renders
- [ ] Footer shows progression state
- [ ] Numeric colors apply (green/red/yellow)
- [ ] CSS is consolidated and uses holo-theme variables
- [ ] No console errors or broken bindings
- [ ] Existing chargen behavior preserved

---

## Next Steps

1. **Build NameStep** — simplest first-wave step (text input + level)
2. **Build SkillsStep** — reference the existing skill selection logic from chargen
3. **Build SummaryStep** — read-only review of all prior steps
4. **Integrate into ChargenShell** — add to canonical sequence
5. **CSS verification** — ensure holo-theme is applied globally
6. **Test flow** — end-to-end chargen with all 7 steps
7. **Document** — architecture guide + plugin creation template

---

## Notes

- **Preserve Runtime Behavior:** Don't break existing JS bindings. Reuse data attributes and class selectors.
- **No Duplicate Shells:** One ProgressionShell for all modes (chargen, levelup, NPC, beast, templates).
- **CSS Strategy:** Consolidate, don't patch. Use holo-theme variables as source of truth.
- **Partials Pattern:** Each step's work-surface is a partial. Shell owns layout; steps own content.
- **Mentor Guidance:** Step plugins can integrate with mentor-step-integration.js for dynamic guidance.

---

**Status:** Ready for Phase 1 implementation
**Last Updated:** 2026-03-16
