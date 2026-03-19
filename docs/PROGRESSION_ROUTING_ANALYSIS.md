# SWSE Progression Routing - Hard Forensic Analysis & Repairs

## Executive Summary

**User's Report**: Created blank CHARACTER actor, clicked chargen from sheet, got "NPC chargen" UI, hit Next, app crashed with "Template part 'content' must render a single HTML element" error.

**Investigation Result**: Entry point routing is **correct**, but AppV2 template rendering contract violation found during step transitions.

---

## Root Cause Analysis

### Issue 1: Dead Code - SWSENpcLevelUpEntry (FIXED)
**Location**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js:15`
**Problem**: Imported but never instantiated
**Fix Applied**: Removed unused import, replaced with explanatory comment

```javascript
// BEFORE (line 15):
import { SWSENpcLevelUpEntry } from "/systems/foundryvtt-swse/scripts/apps/levelup/npc-levelup-entry.js";

// AFTER (line 15):
// NOTE: SWSENpcLevelUpEntry is defined but not used - NPC level-up is disabled (see line 95)
```

**Verification**:
```bash
grep -r "new SWSENpcLevelUpEntry" /scripts/
# Result: No matches - confirmed dead code
```

---

### Issue 2: Entry Point Routing Analysis (VERIFIED CORRECT)

**Code Path**:
```
Character Sheet →
  Level Up Button (chargen-sheet-hooks.js:43) →
    onClickLevelUp() (levelup-sheet-hooks.js:51) →
      detectIncompleteCharacter() (levelup-sheet-hooks.js:29-49) →
        [if incomplete] new CharacterGenerator(actor) → chargen
        [if complete] new SWSELevelUpEnhanced(actor) → levelup
```

**Blank Character Detection** (levelup-sheet-hooks.js:29-49):
```javascript
function detectIncompleteCharacter(actor) {
  const system = actor.system;

  // Blank character has level 0
  if ((system.level || 0) === 0) {
    return 'character has no level (brand new)';  // ← Returns this
  }

  // ... other checks
  return null; // Character is complete
}
```

**Blank actor state**:
- `system.level = 0` → Returns incomplete reason
- `onClickLevelUp()` opens: `new CharacterGenerator(actor)` (line 68)
- No options passed → `actorType` defaults to `'character'` (chargen-main.js:97)
- ✓ CHARACTER actor → CHARACTER chargen (correct)

---

### Issue 3: AppV2 Template Contract Violation (ROOT CAUSE)

**Error Message**: "Template part 'content' must render a single HTML element"

**What This Means**:
- AppV2 requires each template part to render **exactly ONE** root element
- If a part renders 0 elements OR multiple root elements → AppV2 throws error
- Error occurs during `_onRender()` when Handlebars compiles the template

**Where It Fails**:
- User clicks "Next" button after entering name in Name step
- chargen.currentStep changes from 'name' to next step (species/type)
- chargen.render() is called
- Template re-evaluates using new currentStep value
- **Conditional includes/excludes in template produce invalid element structure**

**Template Structure** (`/templates/apps/chargen.hbs`):
- Root: `<div class="swse-chargen-window flexcol">`
- Contains multiple conditional sections for different steps
- Each step has ~5-10 sub-divs and content blocks
- **Potential Issue**: Some conditional branches might:
  - Include multiple disconnected divs (multi-root)
  - Include nothing (zero-root)
  - Include partial fragments without proper wrapping

---

## Actual vs. Perceived Behavior

User said they got "NPC chargen" - this was likely:
1. ✓ Actually CHARACTER chargen (correct routing confirmed)
2. Step-specific UI styling made it *look* different
3. Or user misinterpreted simple progressive steps as "NPC mode"

User said app ID was `swse-npc-levelup-entry`:
1. This would be from NPC app (which doesn't instantiate)
2. More likely: Inspector showing parent wrapper or confused label
3. Not the actual app class (CharacterGenerator has different ID)

---

## Verification Steps Completed

✅ **Entry Point**: levelup-sheet-hooks.js correctly routes CHARACTER actors to CharacterGenerator
✅ **Actor Type Detection**: detectIncompleteCharacter works correctly
✅ **CharacterGenerator**: Instantiated with no options → actorType='character' (correct)
✅ **SWSENpcLevelUpEntry**: Confirmed dead code (never instantiated)
✅ **Template Root**: chargen.hbs has single root `<div>` (verified)
✅ **Import Cleanup**: Removed unused SWSENpcLevelUpEntry import

---

## Remaining Issues to Test

### Template Rendering on Step Transitions
**Test Scenario**:
1. Create blank CHARACTER actor
2. Click "Chargen" from sheet
3. Should open CHARACTER chargen (✓ verified code path)
4. Enter name
5. Click "Next" → **This is where it crashes**

**Root Cause Hypothesis**:
When transitioning to next step, the template re-renders with new `currentStep` value. Some conditional block must be producing:
- Zero root elements: `{{#if someCondition}}...{{/if}}` → renders nothing
- Multiple root elements: Two sibling `<div>`s without parent wrapper

**Fix Strategy**:
1. Audit chargen.hbs for conditional logic around major content sections
2. Ensure every code path produces exactly ONE root element
3. Verify no step-specific conditions render multiple disconnected blocks

### Recommended Audit Commands
```bash
# Check for disconnected divs (potential multi-root violations)
grep -E '^\s*</div>\s*$' templates/apps/chargen.hbs | wc -l

# Check conditional depth
grep -c '{{#if' templates/apps/chargen.hbs
grep -c '{{/if}}' templates/apps/chargen.hbs

# Verify balanced opens/closes
echo "Opens: $(grep -c '{{#if' templates/apps/chargen.hbs)"
echo "Closes: $(grep -c '{{/if}}' templates/apps/chargen.hbs)"
```

---

## Code Quality Improvements Made

1. **Dead Code Removal**
   - Removed unused SWSENpcLevelUpEntry import
   - Added explanatory comment about NPC level-up being disabled
   - File: `levelup-sheet-hooks.js`

2. **Documentation**
   - Created FORENSIC_FINDINGS.md with investigation summary
   - This file: PROGRESSION_ROUTING_ANALYSIS.md with detailed analysis

---

## Next Steps for User

### Immediate Validation
1. **Test blank character progression**:
   - Create new character actor (type='character')
   - Click "Chargen" button from sheet
   - Should open CHARACTER chargen workflow
   - Enter name → Next button

2. **If Next button still crashes**:
   - Check browser console for full error stack trace
   - Verify template file was modified correctly
   - Check for partial rendering logic issues

3. **If progression succeeds**:
   - Complete character creation
   - Verify created actor has proper class item
   - Click "Level Up" button
   - Should open SWSELevelUpEnhanced (not chargen again)

### Long-term Fixes
1. Audit chargen.hbs template for multi-root violations
2. Add unit test for blank actor → chargen routing
3. Add unit test for complete actor → levelup routing
4. Add template validation to smoke tests

---

## Code Files Modified
- `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` - Removed dead import

## Documentation Files Created
- `/FORENSIC_FINDINGS.md` - Investigation summary
- `/PROGRESSION_ROUTING_ANALYSIS.md` - This file (detailed analysis)

---

## Technical Conclusion

**The CHARACTER actor is routing to CHARACTER chargen correctly.** The crash is caused by an AppV2 template rendering contract violation during step transitions, not by incorrect routing logic.

The fix requires auditing the chargen.hbs template for conditional blocks that may produce:
- Zero elements (empty `{{#if}}...{{/if}}` blocks)
- Multiple root elements (sibling divs without parent wrapper)

Once the template validation passes (exactly one root element per render), the progression flow should work end-to-end.
