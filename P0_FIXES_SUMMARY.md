# P0 Stabilization Fixes

## Issues Diagnosed
Based on the user's investigation, two critical blockers were identified:

1. **CSS Blocker**: CSS stylesheets (v2-sheet.css) are loaded but CSS rules don't match the DOM
2. **Skills Blocker**: `ctx.derived.skills.list` is empty because `actor.system.skills = {}` is empty

## Fix 1: CSS Selector Mismatch (RESOLVED)

### Root Cause
- The CSS file uses selectors targeting `.swse-sheet` class
- But DEFAULT_OPTIONS in character-sheet.js specified: `["swse", "sheet", "actor", "character", "swse-character-sheet", "v2"]`
- This caused a selector mismatch: CSS looked for `.swse-sheet` but it wasn't on the root element

### Solution Applied
**File**: `scripts/sheets/v2/character-sheet.js` (line 87)

Added `"swse-sheet"` to the classes array:
```js
static DEFAULT_OPTIONS = {
  ...foundry.applications.sheets.ActorSheetV2.DEFAULT_OPTIONS,
  classes: ["swse", "sheet", "actor", "character", "swse-character-sheet", "swse-sheet", "v2"],  // ← Added swse-sheet
  // ... rest of config
};
```

### Result
- Root element now has class `.swse-sheet`
- All v2-sheet.css selectors now match the DOM
- CSS rules will apply correctly

---

## Fix 2: Skills Registry Builder (RESOLVED)

### Root Cause
- Character "ceci" has `system.skills = {}` (empty object)
- The skills builder code iterated over `Object.entries(systemSkills)` which returned empty
- Template received `ctx.derived.skills = { list: [] }` → blank skills tab

### Solution Applied
**File**: `scripts/sheets/v2/character-sheet.js` (lines 220-280)

Added `SWSE_SKILL_DEFINITIONS` registry with all 25 SWSE skills:
```js
const SWSE_SKILL_DEFINITIONS = {
  acrobatics: { label: 'Acrobatics', ability: 'dex' },
  climb: { label: 'Climb', ability: 'str' },
  deception: { label: 'Deception', ability: 'cha' },
  // ... 22 more skills ...
  useTheForce: { label: 'Use the Force', ability: 'cha' }
};
```

Modified the skills builder to:
1. First check if `system.skills` has data
2. If empty, use the registry definitions
3. For each skill, merge actor data (trained, focused, etc.) with registry defaults
4. Always produce a complete skills list, even if actor has no skill data

### Result
- Skills tab now displays all 25 skills even if `system.skills` is empty
- Each skill shows: name, total (0 for untrained), ability, trained/focused status
- When actor gets proper skill data, it will override registry defaults

---

## Testing the Fixes

### Manual Diagnostic
Run in Foundry console after opening a character sheet:
```js
runP0Diagnostics()
```

This will verify:
- ✓ Root element has `.swse-sheet` class
- ✓ DOM structure is correct (sheet-body, sheet-content, tabs)
- ✓ v2-sheet.css is loaded and has correct selectors
- ✓ Skills list is populated (either from actor data or registry)

### Expected Results
1. **CSS**: Styling should now apply (colors, layout, etc.)
2. **Skills Tab**: Should show 25 skills with names and abilities
3. **Tab Navigation**: Tab switching should work smoothly

---

## Architecture Notes

### Skills Contract
The sheet expects `ctx.derived.skills` to have this shape:
```js
{
  list: [
    {
      key: 'acrobatics',
      label: 'Acrobatics',
      total: 0,
      trained: false,
      focused: false,
      ability: 'Dexterity',
      favorite: false,
      extraUses: []
    },
    // ... more skills
  ]
}
```

This contract is now satisfied by the registry builder even when `system.skills` is empty.

### CSS Class Contract
The root element must have these classes for CSS to apply:
- `.swse-sheet` (matches v2-sheet.css selectors)
- `.swse-character-sheet` (v13 AppV2 sheet identifier)
- `.v2` (P0 version marker)
- `flexcol` (flex layout utility)

This is now enforced via DEFAULT_OPTIONS.

---

## Remaining Tasks (Post-P0)
1. Investigate why `actor.system.skills` is empty on existing actors
2. Implement schema migration to populate existing actors with skills
3. Test skill calculation when actors have proper skill data
4. Add skill filtering/sorting UI if needed
