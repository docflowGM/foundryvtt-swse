# Character Generation Architecture

## Invariants (Immutable Constraints)

These are the core rules that define chargen's design. Violations cause bugs or performance issues.

```javascript
// Invariant 1: During chargen, no Documents are created
// All state exists as snapshots and patches
// Document creation only happens at finalize()

// Invariant 2: All progression changes are patches
// Never mutate characterData directly
// Always use ProgressionEngine to compute deltas

// Invariant 3: ActiveEffects are applied only at finalize
// Effects are not created/tested during preview
// EffectSanitizer handles any rogue effects

// Invariant 4: UI never decides legality
// Chargen displays suggestions based on ProgressionEngine
// Engine is the source of truth for what's valid

// Invariant 5: AppV2 lifecycle owns rendering
// State drives render, not vice versa
// Never change state inside _onRender

// Invariant 6: Blank chargen screens indicate missing data, not UI bugs
// Empty packs (species, classes, feats) fail-fast at load time
// Never silently render empty steps
// Fix root cause: ensure compendia are installed and loaded

// Invariant 7: Actors are never created without required progression data
// Name, abilities, class, and species (or droid systems) are non-negotiable
// _assertCharacterComplete() enforces this before actor creation
// Violations are caught and reported with explicit errors

// Invariant 8: Derived data is computed by the Actor, not the UI
// Character sheet reads actor.system.derived only
// Derived values are populated in prepareDerivedData() post-creation
// No fallback rendering if derived data is missing
```

## Architecture Diagram

```
[ChargenMainDialog]
  └─ state: snapshot + pending selections
  └─ handlers: _onSelectClass, _onSelectFeat, etc.
      └─ validate via ProgressionEngine
      └─ update snapshot
      └─ render()

[ProgressionEngine] ← source of truth
  └─ computeEligibility(snapshot) → {valid options}
  └─ applyPatch(snapshot, patch) → {new snapshot}
  └─ validate(snapshot) → {errors? | ok}

[ChargenFinalizer] ← ONE boundary
  └─ finalize(snapshot) → {Actor}
  └─ creates Items (and ONLY here)
  └─ sanitizes effects
  └─ validates actor

[EffectSanitizer] ← cleanup layer
  └─ preCreateItem hook
  └─ preUpdateItem hook
  └─ removes invalid types
  └─ (catches rogue effects)
```

## Data Flow

### Selection Flow
```
User clicks "Select Feat" (UI)
  ↓
_onSelectFeat(feat) handler
  ↓
Validate: progression.validate(snapshot + feat)
  ↓
If valid:
  - Apply patch to snapshot
  - Update this.characterData
  - Call this.render(false)
  ↓
render() updates HTML with new state
```

### Finalization Flow
```
User clicks "Finish"
  ↓
_onFinish() handler
  ↓
ChargenFinalizer.finalize(snapshot)
  ↓
  1. Build actor data
  2. Create actor
  3. Build items with sanitized effects
  4. Create items via createEmbeddedDocuments
  5. Validate actor
  ↓
Return actor to caller
```

## File Responsibilities

### `chargen-main.js`
- Application lifecycle
- Event handlers
- State rendering
- Step navigation

### `chargen-templates.js`
- Load template definitions
- Apply template patches to snapshots
- Build featured selections

### `chargen-finalizer.js`
- Single document creation boundary
- Item building from snapshot
- Effect sanitization
- Validation

### `chargen-dev-guards.js`
- Dev-mode assertions
- Architectural constraint checks
- Violation logging

### `CHARGEN_ARCHITECTURE.md` (this file)
- Design documentation
- Invariants
- Data flows

## Common Patterns

### ✅ Adding a selection handler
```javascript
async _onSelectFeat(featId) {
  // 1. Get the feat data
  const feat = ... // from pack

  // 2. Validate
  const valid = await this.progressionEngine.validate(
    this.characterData,
    { action: 'addFeat', feat }
  );
  if (!valid) {
    ui.notifications.warn("Cannot add feat");
    return;
  }

  // 3. Update snapshot
  this.characterData = await this.progressionEngine.applyPatch(
    this.characterData,
    { action: 'addFeat', feat }
  );

  // 4. Re-render
  this.render(false);
}
```

### ❌ Never do this
```javascript
// ❌ Never create documents during preview
await actor.createEmbeddedDocuments('Item', [feat]);

// ❌ Never change state in _onRender
async _onRender() {
  this.currentStep = "next"; // WRONG!
}

// ❌ Never trust user input for validity
if (selectedFeat.valid) { ... } // Engine decides, not item

// ❌ Never apply effects during chargen
effect.type = "feat-effect"; // Will be stripped
```

## Testing

### Unit tests should verify:
- ProgressionEngine decisions are consistent
- Patches apply cleanly
- Finalization creates valid actors
- Effects are sanitized

### Integration tests should verify:
- End-to-end character creation
- Template application
- No validation errors on finalize
- All items are created correctly

## Migration Notes

### From V1 (FormApplication)
- Remove `getData()` - use `_prepareContext()` instead
- Remove `_updateObject()` - use event handlers
- Remove item creation during form submission - use finalizer

### From pre-v13 Foundry
- Remove custom effect types - EffectSanitizer handles it
- Remove `document.update()` calls on preview - snapshot only
- Add explicit validation calls before state changes

## Debugging

### "Character stuck at step X"
- Check chargen.currentStep
- Check if step is in `_getSteps()`
- Check error logs for validation failures

### "Effects not applying"
- Check chargen-templates.js - are effects being stripped?
- Check finalization - is ChargenFinalizer being called?
- Check EffectSanitizer logs

### "Validation error on finalize"
- Check item data in snapshot
- Check ActiveEffect.type values
- Use `EffectSanitizer.sanitizeDocumentData()`

## See Also
- `scripts/progression/` - ProgressionEngine
- `scripts/core/effect-sanitizer.js` - Effect validation
- `packs/` - Compendium data
