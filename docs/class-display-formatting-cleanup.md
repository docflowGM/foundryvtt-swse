# Class Display Formatting Cleanup

## Objective

Establish a unified, order-preserving class display formatter for the v2 sheet that respects the actor's actual class progression sequence without any heroic-first reordering.

## Problem

Multiple code paths existed for building class display strings:
1. `character-actor.js:buildClassDisplay()` — private function, used for derived.identity.classDisplay
2. `character-sheet/context.js:buildClassDisplay()` — exported async function, never called (dead code)

The dead code in context.js could lead to confusion about the canonical source.

## Solution

### Canonical Source

**Character-actor.js** owns the class display formatter:
- `buildClassDisplay(classLevels, fallbackClassName)` is the single authoritative builder
- Reads from `system.progression?.classLevels` (array of {class, level} entries)
- Formats each entry as `"ClassName Level"`
- Joins entries with `" / "`
- **Preserves exact actor class progression order — no sorting**

### Where It's Used

1. **Actor Computation** (character-actor.js)
   - `mirrorIdentity()` calls `buildClassDisplay()` to populate `system.derived.identity.classDisplay`

2. **Header Display** (persistent-header.hbs)
   - Line 268: `{{classDisplay}}` reads from context variable
   - Context variable comes from `derived.identity?.classDisplay` (character-sheet.js:776)

3. **Biography Panel** (PanelContextBuilder)
   - Uses `buildIdentityViewModel()` which includes `classDisplay`
   - `buildIdentityViewModel()` reads from `derived.identity.classDisplay`

### Examples

| Actor | Class Progression | Display |
|-------|-------------------|---------|
| Ceci | Jedi 1 → Jedi 2 → Jedi 3 → Jedi 4, Scoundrel 1 | `Jedi 4 / Scoundrel 1` |
| Jaron | Nonheroic 1 → Nonheroic 2 → Nonheroic 3 | `Nonheroic 3` |
| Paule | Nonheroic 1 → Nonheroic 2, Scoundrel 1 → Scoundrel 2 → Scoundrel 3, Soldier 1 | `Nonheroic 2 / Scoundrel 3 / Soldier 1` |

Note: Order reflects exact progression sequence. If character multiclassed as Scoundrel after reaching Jedi 4, display is `Jedi 4 / Scoundrel 1`, not rearranged.

## Implementation Details

### buildClassDisplay() Contract

```javascript
/**
 * PHASE 7: Build canonical class display string (multiclass format: "Jedi 3 / Soldier 2")
 *
 * CANONICAL BUILDER for all identity/class summary displays — sheet reads system.derived.identity.classDisplay,
 * never rebuilds it.
 *
 * CRITICAL CONTRACT:
 * - Preserves exact actor class progression order (no heroic-first sorting)
 * - Formats as "ClassName Level" joined by " / "
 * - Used by mirrorIdentity() to populate system.derived.identity.classDisplay
 * - Sheet displays consume derived.identity.classDisplay or buildIdentityViewModel()
 */
```

### Dead Code Removed

Removed `buildClassDisplay()` from `scripts/sheets/v2/character-sheet/context.js`:
- Was exported but never imported or called
- Used async import which was unnecessary
- Duplicated logic from character-actor.js version

## Files Modified

| File | Changes |
|------|---------|
| `scripts/actors/v2/character-actor.js` | Enhanced comments on buildClassDisplay(), clarified contract |
| `scripts/sheets/v2/character-sheet.js` | Added comments explaining canonical source, no heroic-first sorting |
| `scripts/sheets/v2/character-sheet/context.js` | Removed dead buildClassDisplay() function |

## Display Surfaces Using classDisplay

1. **Header Class Selector**
   - Template: `templates/partials/actor/persistent-header.hbs:268`
   - Variable: `{{classDisplay}}`
   - Source: `character-sheet.js:776` reads from `derived.identity?.classDisplay`

2. **Biography Panel Class Display**
   - Uses `buildIdentityViewModel()` which includes `classDisplay`
   - Source: Same `derived.identity.classDisplay`

**Both surfaces read the same canonical source.**

## Contract Guarantees

✅ Single formatter used everywhere  
✅ Order preserved exactly (no heroic-first sorting)  
✅ Format consistent: "ClassName Level" with " / " joins  
✅ No ad-hoc string building in templates or multiple places  
✅ Canonical source documented with explicit contract  

## Success Criteria Met

✅ Dead code removed  
✅ Canonical source clearly identified  
✅ Order-preservation documented  
✅ No heroic-first sorting logic present  
✅ All display surfaces unified  
✅ Comments explain the contract  

## Notes for Future Developers

- Do NOT add heroic-first sorting logic
- Do NOT rebuild class display strings in templates
- Do NOT create new display formatters
- Always read from `system.derived.identity.classDisplay` or use `buildIdentityViewModel()`
- If a new display surface needs class information, add it to `buildIdentityViewModel()` or use its result directly
