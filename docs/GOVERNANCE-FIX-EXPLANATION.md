# Governance-Aware Form Persistence Fix

## Problem

The form persistence chain was completing successfully (reaching ActorEngine.updateActor), but failing with:
```
[HP SSOT Violation] system.hp.max may only be written by ActorEngine.recomputeHP()
```

This is not a bug in the persistence bridge — it's correct governance enforcement. The form was attempting to submit a field that is protected by SSOT (Single Source of Truth) constraints.

## Root Cause

**ActorEngine governance enforces two categories of protected fields:**

1. **Derived Fields** (`system.derived.*`)
   - Can ONLY be written by `DerivedCalculator` (math computation phase)
   - Form should never attempt to update these
   - These are calculated values, not user input

2. **HP Max** (`system.hp.max`)
   - Can ONLY be written by `ActorEngine.recomputeHP()`
   - NOT user-editable directly
   - But depends on factors that ARE user-editable:
     - `system.hp.bonus` ✓ User can edit
     - `system.hp.value` ✓ User can edit (current HP)
     - `system.attributes.con.*` ✓ User can edit (affects mod)
     - `system.level` ✓ User can edit (affects progression)

## The Fix

**Added `_filterProtectedFields()` method to character sheet:**

```javascript
/**
 * Filter out fields that are protected by SSOT (Single Source of Truth) governance.
 * - system.derived.* → Only DerivedCalculator may write these
 * - system.hp.max → Only ActorEngine.recomputeHP() may write this
 *
 * The form should allow editing DEPENDENCIES (which trigger recalculation via hooks):
 * - Attributes (CON, STR, etc.) are allowed
 * - Level is allowed
 * - HP bonus is allowed
 * - HP value is allowed
 *
 * HP max will be automatically recalculated via hooks when dependencies change.
 */
_filterProtectedFields(expanded) {
  // ... removes system.derived.* and system.hp.max before submission
}
```

**Modified `_onSubmitForm()` to filter before ActorEngine call:**

```javascript
// Before: await ActorEngine.updateActor(this.actor, expanded);

// After:
const filtered = this._filterProtectedFields(expanded);
await ActorEngine.updateActor(this.actor, filtered);
```

## How It Works

### User edits HP bonus on the form:
```
User edits: system.hp.bonus = 5
Form collects: { "system.hp.bonus": 5 }
Filter checks: Not protected → passes through
Submit to: ActorEngine.updateActor()
Hook fires: HP dependency changed
Hook calls: ActorEngine.recomputeHP()
Result: system.hp.max automatically recalculated ✓
```

### User tries to edit HP max on the form (hypothetical):
```
User edits: system.hp.max = 999 (invalid)
Form collects: { "system.hp.max": 999 }
Filter checks: IS protected (SSOT violation)
Filter removes: { } (empty after filtering)
Submit to: ActorEngine.updateActor() with nothing
Result: HP max is NOT overwritten; stays correct ✓
```

### User edits CON (affects HP mod):
```
User edits: system.attributes.con.base = 12 (was 10)
Form collects: { "system.attributes.con.base": 12 }
Filter checks: Not protected → passes through
Submit to: ActorEngine.updateActor()
Hook fires: Attribute changed
Hook calls: ActorEngine.recomputeHP()
Result: HP max recalculated with new CON modifier ✓
```

## What Changed

**Before the fix:**
- Form submitted ALL collected data directly to ActorEngine
- ActorEngine rejected with "HP SSOT Violation" if hp.max was present
- Persistence failed entirely, nothing was saved

**After the fix:**
- Form filters out protected fields before submission
- Protected fields stay correct (managed by governance layer)
- Editable fields are submitted normally
- Hooks trigger automatic recalculation of protected fields
- Persistence succeeds for all valid fields

## Testing Checklist

Run the test protocol in `TEST-PERSISTENCE-WITH-GOVERNANCE.md`:

```
✓ Text field persistence (name, notes)
✓ Numeric field persistence (HP value, bonus, credits)
✓ Checkbox persistence (skills trained, focus)
✓ Textarea persistence (biography)
✓ HP max filtering (protected field not overwritten)
✓ HP dependency updates (CON edit triggers recomputation)
✓ No governance violations in console
✓ All values persist after sheet close/reopen
```

## Key Architectural Points

1. **Forms are for user INPUT only**
   - Editable fields: user attributes, choices, current values
   - Non-editable fields: calculated/derived/governance-protected

2. **Governance enforces data consistency**
   - Can't write HP max directly → only through recomputeHP()
   - Can't write derived values → only through DerivedCalculator
   - Can't write integrity-protected fields → only through validation layers

3. **Hooks trigger recalculation**
   - When user changes HP bonus → hook detects change → triggers recomputeHP()
   - When user changes CON → hook detects change → triggers recomputeHP()
   - When user changes level → hook detects change → triggers recomputeHP()
   - System stays consistent automatically

4. **Filter is transparent to user**
   - User edits normally
   - Protected fields are silently filtered (logged for debugging)
   - Protected fields are auto-recalculated correctly
   - No error messages, no confusing behavior

## No Side Effects

The filtering is performed **only in the form persistence path** (`_onSubmitForm`):
- Other code paths (programmatic updates, migrations, etc.) are unaffected
- ActorEngine governance still enforces constraints everywhere
- Forms just respect the governance constraints proactively
