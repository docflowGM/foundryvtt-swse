# Background Skill Hydration Fix - Complete Summary

## Problem
When a player selected a background like "Conspiracy" in the chargen progression, the Skills step did not show the background skill options (Deception, Stealth, Use Computer). Instead, only class skills were visible.

**Root Cause**: In `background-pending-context-builder.js`, the diagnostic logging attempted to access `context.classSkills.length` on line 102, but the `classSkills` property was never added to the context object. This caused the function to throw an error, which was caught and resulted in `createEmptyPendingContext()` being returned, eliminating all background grants before the Skills step could consume them.

## Solution
Three coordinated fixes across two files:

### 1. background-pending-context-builder.js

#### Fix 1A: Add backgroundSkillOptions field
**Lines 70-101**: Before building the context object, collect all background skill options into a new field:

```javascript
// Build pending skill choices from backgrounds
const pendingChoices = _buildPendingBackgroundChoices(ledger);

// Extract all background skill options (union of all allowed skills from pending choices)
const backgroundSkillOptions = new Set();
for (const choice of pendingChoices) {
  if (choice?.allowedSkills && Array.isArray(choice.allowedSkills)) {
    choice.allowedSkills.forEach(skill => backgroundSkillOptions.add(skill));
  }
}
```

Then add to context object:
```javascript
backgroundSkillOptions: Array.from(backgroundSkillOptions),
```

#### Fix 1B: Fix diagnostic logging
**Lines 114-122**: Replace the buggy diagnostic that referenced non-existent properties with safe ones:

```javascript
SWSELogger.log('[BackgroundPendingContext] Built context:', {
  selectedCount: context.selectedIds.length,
  multiMode: context.multiMode,
  backgroundSkillOptionCount: context.backgroundSkillOptions.length,
  classSkillChoiceCount: context.classSkillChoices.length,
  languageCount: context.languages?.fixed?.length || 0,
  pendingChoiceCount: context.pendingChoices?.length || 0,
  unresolvedCount: context.unresolved?.length || 0
});
```

All these properties now safely exist in the context object, so no error is thrown.

#### Fix 1C: Update empty context
**Line 231**: Add `backgroundSkillOptions: [],` to `createEmptyPendingContext()` return object.

#### Fix 1D: Update merge function
**Line 267**: Add `backgroundSkillOptions: backgroundContext.backgroundSkillOptions,` and `pendingChoices: backgroundContext.pendingChoices,` to the merged background object.

### 2. skills-step.js

#### Fix 2A: Harden _getBackgroundSkillRefs
**Lines 799-868**: Replace the simple, fragile implementation with a hardened version that:

1. **Tries multiple context sources** (with fallbacks):
   - Primary: `shell.progressionSession.currentPendingBackgroundContext`
   - Fallback 1: `shell.progressionSession.pendingState.background`
   - Fallback 2: `shell.buildIntent.background`

2. **Uses safe null checks**: All property accesses use optional chaining (`?.`) and default to empty arrays

3. **Collects from two sources**:
   - Preferred: `backgroundSkillOptions` (the new field we added)
   - Fallback: `pendingChoices` (for backward compatibility)

4. **Adds diagnostic logging**: Tracks what context was found and what skills were collected

```javascript
swseLogger.debug('[SkillsStep] Background skill resolution:', {
  foundContext: !!pendingContext,
  pendingChoiceCount: pendingChoices.length,
  backgroundSkillOptionCount: backgroundSkillOptions.length,
  contextKeys: Object.keys(pendingContext || {}).slice(0, 10),
});
```

#### Fix 2B: Add missing _formatSkillCard method
**Lines 281-295**: Added the missing method that formats skill objects for template display:

```javascript
_formatSkillCard(skill, suggestedIds = new Set()) {
  const selectionState = this._getSkillSelectionState(skill);
  const isSuggested = suggestedIds.has(skill.id) || suggestedIds.has(skill.key);

  return {
    ...skill,
    isTrained: selectionState?.trained === true,
    badgeLabel: isSuggested ? 'Suggested' : null,
  };
}
```

This ensures skills are properly formatted with:
- Training state (`isTrained`)
- Suggestion badge (`badgeLabel`)
- All existing properties (`...skill` including `isClassSkill`, `isBackgroundSkill`, etc.)

## Behavior Changes

### Before Fix
- Selected background → No background skills shown in Skills step
- Only class skills visible in Skills step
- Background skill options lost due to error in context building

### After Fix
- Selected background (e.g., Conspiracy) → Background skills appear in Skills step
- Background skills (Deception, Stealth, Use Computer) display with "Background" chip tag
- Skills are trainable as background class skills
- Proper diagnostic logging tracks context resolution
- No console errors during background context building

## Testing Scenario

**Acceptance Test**: In chargen progression:

1. Choose Class: **Jedi**
2. Choose Background: **Conspiracy**
3. Proceed to **Skills** step

**Expected Result**:
- Left panel shows "Training Summary" with skill slots
- Center panel shows available skills including:
  - Jedi class skills (Acrobatics, Deception, Use Computer, etc.)
  - **Background skills from Conspiracy** (Deception, Stealth, Use Computer) labeled with "Background" chip
- Player can train Stealth as a background skill option
- No console errors or warnings

## Diagnostic Aids

The fixed code includes targeted logging that helps diagnose future issues:

1. **Background context building** (`background-pending-context-builder.js:114-122`):
   - Logs: backgroundSkillOptionCount, classSkillChoiceCount, languageCount, pendingChoiceCount
   - Helps verify all background grants are collected

2. **Skills step resolution** (`skills-step.js:824-829`):
   - Logs: foundContext, pendingChoiceCount, backgroundSkillOptionCount, contextKeys
   - Helps diagnose if context is missing or incomplete

3. **Collected refs** (`skills-step.js:860-864`):
   - Logs: count and sample of collected background skill refs
   - Helps verify background skills made it through to template

Enable with debug mode setting: `game.settings.set('foundryvtt-swse', 'debugMode', true)`

## Files Modified

1. `scripts/engine/progression/backgrounds/background-pending-context-builder.js`
   - Added backgroundSkillOptions field building
   - Fixed diagnostic logging
   - Updated empty context and merge function

2. `scripts/apps/progression-framework/steps/skills-step.js`
   - Hardened _getBackgroundSkillRefs with multiple context sources
   - Added missing _formatSkillCard method

## Related Systems

This fix integrates with:
- **BackgroundGrantLedger**: Already builds skills correctly; this fix ensures they're passed through
- **skills-work-surface.hbs template**: Already has structure for background skill chips; this fix ensures data flows through
- **ProgressionSession**: Background context now properly persists through multiple sources
- **SuggestionService**: Can now recommend background skills when they're visible

## RAW Behavior Preserved

This fix maintains RAW (Rules As Written) behavior:
- No auto-training of background skills
- Background skills presented as chooseable options in Skills step
- Player must explicitly train background skills
- Skills step shows skills as "Background" and "Class" with proper chip tags
