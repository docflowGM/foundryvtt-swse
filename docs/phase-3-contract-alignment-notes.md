# Phase 3: Contract Alignment Implementation Notes

## Overview

Phase 3 is where we stopped documenting and started making real contract corrections. This document records the first high-leverage domain fixes that eliminate schema mismatches and reduce fallback dependence.

## Phase 3A: Abilities Contract Alignment

### Problem Statement

The ability schema had multiple competing paths with unclear authority:

- **Progression writes**: `system.abilities.<key>.value` (non-canonical)
- **Template defines**: `system.abilities.<key>.{base, racial, temp, total, mod}`
- **Derived reads from**: `system.attributes` (wrong path!)
- **Sheet expects**: `system.abilities.<key>.{base, racial, temp}` (correct)
- **ActorEngine reads**: `.value`, `.score`, `.total`, `.mod` (fallback chain)

This created a chain of fallback logic throughout the system, with no clear single source of truth.

### Canonical Schema Decision

**Stored ability values** (source of truth for gameplay):
```
system.abilities.<key> = {
  base: <number>,      // Primary write target - updated by progression
  racial: <number>,    // Racial bonus - set during chargen
  temp: <number>,      // Temporary modifier - manual edit field
  total: <number>,     // Computed: base + racial + temp + enhancement
  mod: <number>        // Computed modifier: (total - 10) / 2, floored
}
```

**Derived ability modifiers** (computed output):
```
system.derived.attributes.<key> = {
  base: <number>,
  racial: <number>,
  enhancement: <number>,
  temp: <number>,
  total: <number>,
  mod: <number>
}
```

**Display path** (sheet reads here):
- `system.abilities.<key>.{base, racial, temp}` for input fields
- `system.derived.attributes.<key>.{total, mod}` for computed displays

### Changes Made

#### 1. Progression Finalizer (progression-finalizer.js:399)

**Before:**
```javascript
set[`system.abilities.${key}.value`] = Number(val);
```

**After:**
```javascript
// Canonical stored ability path is system.abilities.<key>.base
// Progression writes base values here; derived computes modifiers and totals
if (key && Number.isFinite(Number(val))) {
  set[`system.abilities.${key}.base`] = Number(val);
}
```

**Effect**: New progression now writes to canonical `.base` instead of deprecated `.value`.

---

#### 2. Derived Calculator (derived-calculator.js:100-112)

**Before:**
```javascript
const attributes = actor.system.attributes || {};
for (const [key, ability] of Object.entries(attributes)) {
  // ... computation ...
}
```

**After:**
```javascript
// Canonical stored abilities path is system.abilities.<key>.{base, racial, temp}
// Derived computes totals and modifiers, written to system.derived.attributes.<key>
const abilities = actor.system.abilities || {};
for (const [key, ability] of Object.entries(abilities)) {
  // ... computation ...
}
```

**Effect**: Derived now reads from `system.abilities` (correct) instead of `system.attributes` (non-existent).

---

#### 3. ActorEngine Normalization (actor-engine.js)

Added `_normalizeAbilityPaths()` method to handle legacy `.value` paths during mutation:

```javascript
// If a mutation includes system.abilities.<key>.value,
// automatically convert it to system.abilities.<key>.base
// This allows old data/code to work without immediate migration
```

**Effect**: Temporary compatibility bridge for legacy actors and old code paths that might still write `.value`.

**Logging**: Legacy path conversions are logged with warning level for Phase 4 audit.

---

#### 4. Test Updates

Updated all test expectations to use canonical `.base` path:

- `phase-1-single-truth-apply.test.js`: Lines 151-152
- `phase-2-prerequisite-sovereignty.test.js`: Lines 228, 244
- `phase-3-scenario-reconciliation.test.js`: Lines 136, 542, 544

**Pattern**: Changed all `system.abilities.*.value` expectations to `system.abilities.*.base`.

---

#### 5. Suggestion Engine Updates (AttributeIncreaseScorer.js)

Updated ability score reading to prefer canonical `.base` but support legacy `.value`:

```javascript
// Phase 3A: Canonical path is .base, but support legacy .value for migration
str: abilities.str?.base ?? abilities.str?.value ?? 10,
```

Updated hypothetical actor creation to use `.base`:

```javascript
// Phase 3A: Canonical ability path is .base, not deprecated .value
str: { ...actor.system.abilities.str, base: hypotheticalScores.str },
```

**Effect**: Suggestion engine works with both old and new paths, prefers canonical.

---

## Runtime Behavior

### Fresh Character Flow

1. Progression finalizer runs during chargen
2. Writes mutations with `system.abilities.str.base = 15` (canonical path)
3. ActorEngine applies mutation (no normalization needed)
4. Derived calculator runs, reads `system.abilities.str.base`
5. Computes and writes `system.derived.attributes.str.{total, mod}`
6. Sheet renders from both paths (inputs from `.base`, displays from `.derived`)

### Legacy Character Flow

1. Existing actor has `system.abilities.str.value = 15` (old path)
2. Progression applies update with new `system.abilities.str.base = 18`
3. ActorEngine detects legacy `.value` path (if present) and normalizes it to `.base`
4. Both old and new are handled without breakage
5. Derived calculator uses canonical `.base` path

### Fallback Behavior (Temporary)

- Sheet form still accepts edits to any path component
- Derived calculator falls back if `.base` is missing (computes from `.value` if present)
- ActorEngine normalization bridges the gap automatically
- No immediate migration required for existing actors

---

## Risks and Mitigations

### Risk 1: Existing actors with only `.value` path
**Mitigation**: ActorEngine normalization automatically converts `.value` → `.base` on next mutation.

### Risk 2: Legacy code still writing `.value`
**Mitigation**: ActorEngine normalization catches and converts. Logged as warning for Phase 4 audit.

### Risk 3: Sheet calculations expecting `.value`
**Mitigation**: Template defines `.base` as primary, sheet already uses it. Fallback support ensures compatibility.

### Risk 4: Progression still writing old path
**Mitigation**: Fixed in this phase. Tests verify canonical path is written.

---

## What Was NOT Changed in Phase 3A

- **Did not remove** `.value` from existing actors (migration deferred to Phase 10)
- **Did not rewrite** all fallback logic in sheets (kept temporary fallbacks)
- **Did not migrate** all existing actors (happens on-demand via ActorEngine normalization)
- **Did not change** UI behavior (purely structural schema fix)
- **Did not refactor** broader systems (isolated to abilities domain only)

---

## Verification Checklist

✅ Progression finalizer writes to canonical `.base`
✅ Derived calculator reads from `system.abilities`, not `system.attributes`
✅ ActorEngine normalizes legacy `.value` to `.base`
✅ Tests updated to expect canonical path
✅ Suggestion engine reads from canonical path (with fallback)
✅ Schema is documented in contract and ownership matrix
✅ No UI behavior changes
✅ Fallback support remains for legacy actors
✅ Code comments mark legacy/transitional paths clearly
✅ Minimal instrumentation added (warnings on normalization)

---

## Next Steps

### Phase 3B: Class Identity Alignment
- Choose primary stored representation (embedded class item + progression.classLevels)
- Remove redundant scalar paths (system.class, system.className, system.classes)
- Update derived identity display to prefer primary source

### Phase 3C: Skills Object Shape
- Ensure template defines full skill object shape
- Update progression to initialize all expected properties
- Ensure derived and sheet can rely on stable shape

### Phase 3D: XP/Resources Naming
- Align form/context to one canonical naming (system.xp.total)
- Keep compatibility bridge for legacy paths
- Consistent naming across all contexts

---

## Legacy Path Status

| Path | Status | Replacement |
|------|--------|------------|
| `system.abilities.<key>.value` | ❌ Deprecated | `system.abilities.<key>.base` |
| `system.attributes` | ❌ Wrong path | `system.abilities` |
| `system.abilities.<key>.base` | ✅ Canonical | — |
| `system.abilities.<key>.{racial,temp}` | ✅ Canonical | — |
| `system.derived.attributes.<key>` | ✅ Canonical derived | — |

---

## Files Modified

- `scripts/apps/progression-framework/shell/progression-finalizer.js` (1 change)
- `scripts/actors/derived/derived-calculator.js` (1 change)
- `scripts/governance/actor-engine/actor-engine.js` (2 changes + 1 new method)
- `scripts/engine/suggestion/AttributeIncreaseScorer.js` (2 changes)
- `scripts/apps/progression-framework/testing/phase-1-single-truth-apply.test.js` (2 changes)
- `scripts/apps/progression-framework/testing/phase-2-prerequisite-sovereignty.test.js` (2 changes)
- `scripts/apps/progression-framework/testing/phase-3-scenario-reconciliation.test.js` (3 changes)

**Total changes**: 14 specific code modifications across 7 files, all focused on abilities domain alignment.

---

## Summary

Phase 3A successfully aligned the abilities schema by:

1. **Establishing canonical path**: `system.abilities.<key>.base` as primary write target
2. **Fixing write sources**: Progression now writes to canonical path only
3. **Fixing read sources**: Derived reads from correct `system.abilities` (not `system.attributes`)
4. **Adding compatibility**: ActorEngine normalization bridges legacy `.value` paths transparently
5. **Updating tests**: All test expectations now use canonical paths
6. **Documenting clearly**: Code comments mark legacy/transitional paths

The system now has **one clear source of truth for ability values** while maintaining backward compatibility through temporary normalization. New characters use clean canonical paths. Existing actors can be migrated on-demand during Phase 4-10.

**Status**: ✅ Phase 3A Complete — Ready for Phase 3B (Class Identity)
