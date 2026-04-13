# Phase 5: Default Initialization Cleanup

## Overview

Phase 5 ensures fresh actors start with **canonical stored object shape** for all required domains, eliminating under-specified empty objects that require downstream rescue logic.

**Status:** ✅ COMPLETE

---

## Problem Statement

Before Phase 5, template.json had critical initialization gaps:

- **Skills domain**: `"skills": {}` (completely empty, zero structure)
- Abilities, XP, defenses, HP: Already correct from Phase 3

The empty skills object meant:
1. Fresh actors created without progression had no skill structure
2. Derived calculator couldn't compute skill totals (missing base properties)
3. Sheet fell back to defensive defaults for every skill field
4. No single source of truth for skill properties

---

## Solution: Complete Template Schema Definition

### Phase 5.1: Skills Object Initialization ✅ COMPLETE

**Changed:** `template.json` lines 141-178 (Actor base template)

**Before:**
```json
"skills": {}
```

**After:**
```json
"skills": {
  "acrobatics": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "climb": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "deception": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "endurance": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "gatherInformation": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "initiative": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "jump": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeBureaucracy": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeGalacticLore": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeLifeSciences": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgePhysicalSciences": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeSocialSciences": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeTactics": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "knowledgeTechnology": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "mechanics": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "perception": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "persuasion": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "pilot": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "ride": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "stealth": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "survival": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "swim": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "treatInjury": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "useComputer": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" },
  "useTheForce": { "trained": false, "miscMod": 0, "focused": false, "selectedAbility": "" }
}
```

**Canonical Structure**: Each skill object now has:
- `trained: false` — User training selection
- `miscMod: 0` — Misc modifiers
- `focused: false` — Skill focus feat
- `selectedAbility: ""` — Ability for skill check (derives if empty)

**Skill List Source**: Derived from form.js FORM_FIELD_SCHEMA (lines 55-79) which is the authoritative list of form-editable skills.

---

### Phase 5.2: Abilities Domain ✅ VERIFIED CORRECT

**Status**: Already correct from Phase 3A. Template already defines canonical structure:
```json
"abilities": {
  "str": { "base": 10, "racial": 0, "temp": 0, "total": 10, "mod": 0 },
  ...
}
```

**No changes needed** — fresh actors already start with canonical ability shape.

---

### Phase 5.3: XP/Resources Domain ✅ VERIFIED CORRECT

**Status**: Already correct from Phase 3D. Template defines:
```json
"xp": {
  "total": 0
}
```

**No changes needed** — fresh actors already use canonical XP naming.

---

### Phase 5.4: Defenses Domain ✅ VERIFIED CORRECT

**Status**: Already correct. Template defines complete structure:
```json
"defenses": {
  "fortitude": { "base": 10, "misc": 0, "total": 10, "ability": 0, "class": 0, "armorMastery": 0, "modifier": 0 },
  "reflex": { ... },
  "will": { ... },
  "flatFooted": { "total": 10 }
}
```

**No changes needed** — fresh actors already start with canonical defense structure.

---

### Phase 5.5: HP/Condition Containers ✅ VERIFIED CORRECT

**Status**: Already correct. Template defines:
```json
"hp": { "value": 10, "max": 10, "temp": 0 },
"conditionTrack": { "current": 0, "persistent": false }
```

**No changes needed** — fresh actors already have these containers.

---

## Verification

### Before Phase 5
```javascript
// Fresh actor created (no progression)
actor.system.skills  // → {} (empty, no properties)
actor.system.skills.athletics  // → undefined
actor.system.skills.athletics.trained  // → undefined (sheet needs fallback)
```

### After Phase 5
```javascript
// Fresh actor created (no progression)
actor.system.skills  // → {acrobatics: {...}, climb: {...}, ...}
actor.system.skills.acrobatics  // → {trained: false, miscMod: 0, focused: false, selectedAbility: ""}
actor.system.skills.acrobatics.trained  // → false (canonical, no fallback needed)
```

---

## Impact

### What No Longer Needs Fallback Logic
- DerivedCalculator can trust `system.skills.{key}.{trained|miscMod|focused|selectedAbility}` exists
- Sheet form fields for skills always have backing stored data
- Derived skill total computation has guaranteed base properties

### What Now Starts Canonical
- **All 25 SWSE skills** (acrobatics through useTheForce)
- **All skill properties** (trained, miscMod, focused, selectedAbility)
- **Safe defaults** (false, 0, 0, "") that match Phase 1 contract

### Downstream Benefits
- Phase 6 can remove defensive fallbacks from DerivedCalculator
- Phase 7 can simplify sheet skill rendering (no null checks for structure)
- Phase 8 contract assertions can hard-fail on missing skill properties

---

## Files Modified

| File | Change | Scope |
|------|--------|-------|
| `template.json` | Lines 141-178: Skills object initialization | Actor base template |

**Total changes**: 1 file, 1 section, 38 new lines (25 skills × canonical structure)

---

## Legacy Paths Status

No legacy paths deprecated in Phase 5. All work is additive (adding missing canonical structure).

**Transitional patterns** (to be removed Phase 7):
- Sheet defensive fallbacks for skill properties (acceptable temporarily)
- DerivedCalculator skill total fallback chain (safe while template is guaranteed)

---

## Testing Checklist

✅ Fresh actor created → system.skills populated with all 25 skills
✅ Each skill object has {trained, miscMod, focused, selectedAbility}
✅ All properties initialized to canonical defaults (false, 0, 0, "")
✅ Skills are editable (form.js schema still intact)
✅ Progression still writes trained flag correctly
✅ DerivedCalculator can compute skill totals from guaranteed structure
✅ No schema validation errors in template.json

---

## Guarantees After Phase 5

✅ **Fresh actors start canonical**: Zero empty objects in skills domain
✅ **Complete structure guaranteed**: All properties present for every skill
✅ **Safe defaults provided**: No undefined properties in stored path
✅ **Progression can build on it**: Finalizer only enriches canonical structure
✅ **Derived can rely on it**: DerivedCalculator reads guaranteed canonical paths
✅ **Sheet can trust it**: Form and display don't need structural fallbacks

---

## Next Phase (Phase 6): DerivedCalculator Hardening

With fresh actors now guaranteed to have canonical stored shape:

1. Remove fallback chains from DerivedCalculator that mask missing properties
2. Simplify skill total computation (no defensive ??)
3. Add assertions that canonical paths are present
4. Verify derived output is deterministic

---

## Summary

Phase 5 moves skills domain from **ambiguous empty objects** to **complete canonical structure**. Fresh actors now begin with all 25 skills fully initialized, matching Phase 1 contract specification.

**Key Achievement**: No more zero-initialization ambiguity. Template is the source of truth for default actor shape.

**Status**: ✅ Phase 5 Complete — Ready for Phase 6 (DerivedCalculator Hardening)
