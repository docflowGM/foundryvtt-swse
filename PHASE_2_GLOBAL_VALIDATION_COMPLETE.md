# Phase 2: Global Validation - COMPLETE

## Overview

Phase 2 of the chargen architecture gap fix sequence successfully implements global constraint checking across steps. This addresses **Gap #3** from the architecture audit: "No Global Validation of State Consistency".

## Problem Solved

### Before Phase 2
- Steps validated locally only (e.g., "is one background selected?")
- No cross-step constraint checking
- Could create invalid builds (e.g., feat that conflicts with class)
- No way to warn player about build coherence issues
- Validation existed but had no visibility to other steps' choices

### After Phase 2
- **GlobalValidator** checks constraints ACROSS all steps
- Uses buildIntent (Phase 1) to query other steps' selections
- Provides detailed feedback: errors (must fix), warnings (should fix), conflicts (coherence), suggestions
- Integrates with mentor rail for player feedback
- Foundation for preventing invalid builds

## Implementation Details

### 1. GlobalValidator Class
**File:** `scripts/apps/progression-framework/validation/global-validator.js`

Comprehensive constraint checking with six validation categories:

#### Background Compatibility
- Validates background structure is complete
- Warns on incomplete data
- Ready for species/class compatibility rules

#### Feat Legality
- Warns if feats selected without class
- Suggests adding feats
- Framework for feat prerequisite/restriction checks

#### Talent Coherence
- Warns if talents selected without class
- Suggests talent selection
- Framework for class talent tree validation

#### Skill Entitlements
- Sanity check: skills not exceeding reasonable bounds (10)
- Warns on suspicious counts
- Framework for class skill slot enforcement

#### Attribute Validity (ENFORCED)
- **Requires** all 6 abilities present (str, dex, con, int, wis, cha)
- **Requires** scores within 3-20 range
- Warns on unusual scores
- Framework for point buy/standard array validation

#### Language Constraints
- Suggests bonus languages for roleplay
- Warns on excessive languages (>10)
- Framework for feat prerequisite checks

### 2. ProgressionShell Integration
**File:** `scripts/apps/progression-framework/shell/progression-shell.js`

Public API for validation:

```javascript
// Full validation with detailed results
const result = shell.validateBuild(options);
// → { isValid, errors[], warnings[], conflicts[], suggestions[] }

// Simple boolean check
if (shell.isBuildValid()) { ... }

// Get formatted report for UI display
const report = shell.getBuildValidationReport();

// Show feedback via mentor rail with mood indication
shell.showValidationFeedback();
```

### 3. Step Plugin Integration
**File:** `scripts/apps/progression-framework/steps/step-plugin-base.js`

Added helper method for steps to access validation:

```javascript
// In any step's lifecycle method (onStepEnter, getStepData, etc.)
const validation = this.getGlobalValidation(shell);
if (validation.errors.length > 0) {
  // Display warning or adapt UI
}
```

## Validation Result Structure

```javascript
{
  isValid: boolean,              // No blocking errors
  errors: string[],              // Must fix to proceed
  warnings: string[],            // Should fix but can proceed
  conflicts: string[],           // Build coherence issues
  suggestions: string[],         // Recommendations for improvement
}
```

## API Usage Examples

### Shell-Level Validation

```javascript
// Full validation check
const result = shell.validateBuild();
if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
}

// Validate in strict mode (treats warnings as errors)
const strictResult = shell.validateBuild({ strict: true });

// Show feedback to player via mentor
shell.showValidationFeedback();
```

### Step-Level Validation

```javascript
// In a step plugin (e.g., L1Survey or Summary)
async onStepEnter(shell) {
  const validation = this.getGlobalValidation(shell);

  // Adapt UI based on build state
  if (validation.errors.length > 0) {
    this._showValidationWarnings(validation);
  }

  // Provide coaching feedback
  if (validation.suggestions.length > 0) {
    await shell.mentorRail.speak(validation.suggestions[0], 'encouraging');
  }
}
```

## Benefits Unlocked

### Immediate
- ✅ Cross-step constraint awareness
- ✅ Player-visible feedback via mentor
- ✅ Actionable validation messages (errors vs warnings vs suggestions)
- ✅ Extensible rule framework

### For Later Phases
- **Phase 3 (Mid-Chargen Persistence)**: Can save/checkpoint valid builds
- **Phase 4 (BuildAnalysisEngine)**: Can display coherence analysis
- **Phase 5 (Extended Suggestions)**: Can suggest fixes for validation issues
- **Phase 6 (Mode Awareness)**: Can enforce different rules for levelup vs chargen

## Commits

1. `781cf04` - Phase 2: Implement GlobalValidator for cross-step constraints
   - Created GlobalValidator class with 6 validation categories
   - Full API for constraint checking and reporting

2. `20ccb7d` - Phase 2 (cont): Integrate GlobalValidator with ProgressionShell and steps
   - Integrated into shell with public API
   - Added helper methods for steps to access validation

3. `847a171` - Phase 2 (final): Enhance GlobalValidator with practical constraint checks
   - Improved validation rules with actionable checks
   - Enforced critical constraints (all 6 abilities required)
   - Added practical warnings and suggestions

## Implemented Constraints

### Hard Constraints (Errors)
- ✅ All 6 ability scores must be present
- ✅ All ability scores in range 3-20

### Soft Constraints (Warnings)
- ⚠️ Background should be selected when species/class chosen
- ⚠️ Feats recommended for complete build
- ⚠️ Talents recommended for expertise definition
- ⚠️ Skills within reasonable bounds
- ⚠️ Attribute scores in expected ranges

### Recommendations (Suggestions)
- 💡 Consider bonus languages
- 💡 Consider developing talents
- 💡 Consider developing feats
- 💡 Consider selecting skills

## Future Enhancements

These validation rules will be expanded in later phases:

### Feat Validation
- Feat prerequisites (requires other feats, minimum ability scores)
- Class restrictions (some feats not available for some classes)
- Feat conflicts (can't pick both X and Y)

### Talent Validation
- Talent tree availability by class
- Talent prerequisites
- Prestige class requirements

### Skill Validation
- Class skill entitlements (number of slots)
- Cross-class penalties
- Background bonus skills

### Language Validation
- Background bonus languages
- Species bonus languages
- Feat language requirements

### Attribute Validation
- Point buy total validation
- Standard array validation
- Species modifier application

## Test Recommendations

### Manual Testing
- [ ] Start chargen, skip attributes, try to proceed → error on validation
- [ ] Select class but not feats → suggestion displayed via mentor
- [ ] Check validation report after each major selection
- [ ] Verify mentor feedback displays correct errors/warnings/suggestions

### Automated Testing (Future)
- [ ] Test all 6 abilities required
- [ ] Test ability score range validation
- [ ] Test warning generation for missing selections
- [ ] Test suggestion generation
- [ ] Test report formatting

## Status

✅ **COMPLETE** - GlobalValidator is fully implemented and integrated. Ready for display/UX enhancements and additional rule implementation.

---

*Implemented: 2026-03-26*
*Part of: 11-step fix sequence for chargen architecture gaps*
*Depends on: Phase 1 (BuildIntent)*
