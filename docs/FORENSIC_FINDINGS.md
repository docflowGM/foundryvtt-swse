# SWSE Progression Routing - Forensic Investigation Findings

## Summary
Investigation into CHARACTER actor routing to NPC progression revealed multiple critical issues in the progression entry point system.

## Issue 1: Dead Code - SWSENpcLevelUpEntry Never Instantiated
**File**: `/scripts/apps/levelup/npc-levelup-entry.js`
**Problem**:
- `SWSENpcLevelUpEntry` is imported in levelup-sheet-hooks.js (line 15) but NEVER instantiated anywhere
- App class defined with id `swse-npc-levelup-entry` but has no code path to create it
- Imported at line 15 of levelup-sheet-hooks.js but never used

**Status**: VERIFIED - Dead code confirmed
**Repair**: Remove unused import to reduce confusion

## Issue 2: Entry Point Routing - CHARACTER actors must route to CHARACTER chargen
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js`
**Current Code** (lines 51-101):
```javascript
async function onClickLevelUp(app) {
  const actor = app?.actor ?? app?.document;
  if (!actor) return;

  SWSELogger.log(`[LevelUp Routing] Actor type: "${actor.type}"`);

  if (actor.type === 'character') {
    const incompleteReason = detectIncompleteCharacter(actor);
    if (incompleteReason) {
      // Routes to chargen
      const { default: CharacterGenerator } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
      new CharacterGenerator(actor).render(true);
      return;
    }

    // Routes to SWSELevelUpEnhanced
    const dialog = new SWSELevelUpEnhanced(actor);
    dialog.render(true);
    return;
  }

  if (actor.type === 'npc') {
    ui?.notifications?.info?.('NPC level-up is currently disabled');
    return;
  }
}
```

**Analysis**:
- CharacterGenerator created with actor parameter only (no options)
- Defaults to actorType='character' (correct per chargen-main.js line 97)
- Should produce CHARACTER chargen workflow

## Issue 3: CharacterGenerator Template Rendering
**File**: `/scripts/apps/chargen/chargen-main.js` (lines 336-340)
```javascript
static PARTS = {
  content: {
    template: 'systems/foundryvtt-swse/templates/apps/chargen.hbs'
  }
};
```

**Template**: `/templates/apps/chargen.hbs` (33,336 bytes - very large)
- Starts with single root: `<div class="swse-chargen-window flexcol">`
- POTENTIAL ISSUE: On step transitions, template might render multiple partial includes without wrapper

**User's Error**: "Template part 'content' must render a single HTML element"
- Indicates AppV2 contract violation: content part must produce exactly ONE root element
- Crash occurred on Next button click (step transition)
- Suggests template fragment includes without proper root element wrapper

## Issue 4: CharacterGenerator Step Transitions
**Files**:
- `/scripts/apps/chargen/chargen-main.js` (line 181-182 defines steps)
- Dynamic step rendering via currentStep state
- Next/Confirm buttons trigger step changes

**Potential Cause of Crash**:
When user clicks Next button after Name step:
1. chargen.currentStep changes from 'name' to next step
2. chargen.render() is called
3. Template re-evaluates conditional blocks based on currentStep
4. Some step-specific partial or fragment might include multiple root elements OR zero elements

## Root Cause Hypothesis
User's actual experience:
1. ✓ Blank character actor → opened chargen (correct routing)
2. ✓ Entered name in Name step → validated
3. ✗ Clicked Next → template rendering failed with "must render single element"
4. ✗ App displayed with ID 'swse-npc-levelup-entry' (confusing - might be inspector label or wrapper reference)

The "NPC chargen" appearance was likely:
- Different UI styling due to step-specific conditionals, OR
- User interpreted simple step progression UI as "NPC mode"

The crash was:
- AppV2 template contract violation during step transition
- chargen.hbs partial includes not properly wrapped for multi-root protection

## Verification Steps Needed
1. Check chargen.hbs for multi-root violations in conditional step blocks
2. Verify each step render path produces single root element
3. Test actual character actor progression from blank state
4. Confirm incomplete character detection works as designed
5. Verify SWSELevelUpEnhanced opens correctly for complete characters

## Code Paths Verified
✓ levelup-sheet-hooks.js → onClickLevelUp is entry point
✓ detectIncompleteCharacter returns reason for blank actors
✓ CharacterGenerator(actor) with no options defaults to 'character' mode
✓ CharacterGeneratorApp exists but is unused dead code
✓ SWSENpcLevelUpEntry is defined but never instantiated
✓ Correct entry point registered in ui-hooks.js line 50

## Critical Discovery
The user's report of getting 'swse-npc-levelup-entry' app ID despite selecting chargen from CHARACTER sheet indicates:
- Either the chargen template is rendering incorrectly with wrong element structure, OR
- The appId display is a red herring (inspector showing parent app ID)

The actual root cause is likely AppV2 template contract violation in chargen step rendering.
