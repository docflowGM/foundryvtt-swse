# Phase 6: Derived Ownership Alignment

## Overview

Phase 6 establishes the derived layer as the authoritative owner of major computed gameplay/display outputs. Sheet and context layers now prefer canonical derived values, with fallback/reconstruction code marked as clearly transitional.

**Status:** ✅ COMPLETE

---

## Problem Statement

Before Phase 6, multiple code paths competed to provide "the answer" for computed values:

- **Defenses**: Sheet code read flat properties that didn't exist in derived structure
- **Skills**: Display built from base inputs without clear derived authority
- **Attacks/Actions**: Sheet fell back to weapon reconstruction when derived list was empty
- **No instrumentation**: Missing fallback usage was invisible, masking upstream issues

Result: **Ambiguity about where computed truth comes from.**

---

## Solution: Claim Derived Authority + Instrument Fallbacks

### Phase 6.1: Defenses — Canonical Derived Authority ✅ COMPLETE

**Problem:** Sheet expected `derived.defenses.fort` (flat number) but DerivedCalculator writes `derived.defenses.fortitude` (object with {base, total, adjustment}).

**Fix:**
- Updated `character-sheet.js` header defense builder to read correct derived structure
- Changed from flat key reading (`def.key = 'fort'`) to object reading (`def.derivedKey = 'fortitude'`)
- Added null-safety with warning instrumentation when derived data is malformed
- Removed expectation of missing fields (abilityMod, miscMod at defense level)

**Files Changed:**
- `scripts/sheets/v2/character-sheet.js` (lines 764-810)

**Canonical Structure:**
```javascript
system.derived.defenses = {
  fortitude: { base: 10, total: 10, adjustment: 0 },
  reflex: { base: 10, total: 10, adjustment: 0 },
  will: { base: 10, total: 10, adjustment: 0 },
  flatFooted: { base: 10, total: 10, adjustment: 0 }
}
```

**Authority Chain:**
1. DerivedCalculator.computeAll() → DefenseCalculator.calculate() → writes to system.derived.defenses
2. character-actor.js initializes safe defaults
3. Sheet reads canonical derived.defenses, never computes

---

### Phase 6.2: Skills — Derived Totalarity + Instrumentation ✅ COMPLETE

**Problem:** No clear instrumentation when skill base inputs were missing.

**Fix:**
- Added warning in DerivedCalculator when a skill is missing from canonical base input
- Added validation in mirrorSkills() to warn if skill properties are malformed
- Instrumentation makes it obvious if upstream failed to initialize canonical schema

**Files Changed:**
- `scripts/actors/derived/derived-calculator.js` (lines 270-280)
- `scripts/actors/v2/character-actor.js` (lines 149-169)

**Authority Chain:**
1. Template.json defines complete skill schema for all 25 skills (Phase 5)
2. DerivedCalculator reads canonical stored inputs (system.skills.{key})
3. Computes total and writes to system.derived.skills.{key}
4. character-actor.js builds display list (derived.skills.list) from derived
5. Sheet reads derived.skills.list, never computes skill totals

**Instrumentation:**
- `[Phase 6] Skill {key} missing from canonical base input` — upstream schema issue
- `[Phase 6] Skill {key} missing {property}` — fallback rescue activated

---

### Phase 6.3: Attacks/Actions — Derived Authority + Rescue Marking ✅ COMPLETE

**Problem:** Sheet couldn't tell if it was reading authoritative derived or performing transitional fallback.

**Fix:**
- Added explicit instrumentation when attacks list fallback is activated
- Marked weapon reconstruction as "transitional rescue only"
- Clear log message identifies when derived was empty

**Files Changed:**
- `scripts/sheets/v2/character-sheet.js` (lines 833-850)

**Authority Chain:**
1. character-actor.js.mirrorAttacks() reads equipped items, builds derived.attacks.list
2. Sheet reads derived.attacks.list (primary)
3. If empty, falls back to weapon reconstruction with warning (transitional only)

**Instrumentation:**
- `[Phase 6] Derived attacks list empty for {actor}, using transitional weapon fallback` — derived was not populated

---

## Instrumentation Added

### DerivedCalculator
- **Location:** `derived-calculator.js` line 275
- **Trigger:** Skill missing from system.skills
- **Message:** `[Phase 6] Skill {key} missing from canonical base input`
- **Purpose:** Detect if template/progression failed to initialize canonical schema

### character-actor.js mirrorSkills
- **Location:** `character-actor.js` lines 156-164
- **Trigger:** Skill property malformed (trained not boolean, miscMod not number, etc.)
- **Message:** `[Phase 6] Skill {key} missing {property}`
- **Purpose:** Detect if upstream is not providing expected canonical structure

### character-sheet.js headerDefenses
- **Location:** `character-sheet.js` lines 777-779
- **Trigger:** derived.defenses.{fort|ref|will} missing or malformed
- **Message:** `[Phase 6] Defense {key} missing or malformed in derived data`
- **Purpose:** Detect mismatch between sheet expectations and derived output

### character-sheet.js combatAttacks
- **Location:** `character-sheet.js` lines 845-849
- **Trigger:** derived.attacks.list is empty
- **Message:** `[Phase 6] Derived attacks list empty for {actor}, using transitional weapon fallback`
- **Purpose:** Identify when derived is not being populated

---

## Files Modified

| File | Section | Change | Purpose |
|------|---------|--------|---------|
| `scripts/sheets/v2/character-sheet.js` | Imports (lines 1-4) | Added swseLogger import | Enable Phase 6 instrumentation |
| `scripts/sheets/v2/character-sheet.js` | headerDefenses (lines 764-810) | Fixed derived structure reading, added null-safety | Align sheet to derived.defenses object structure |
| `scripts/sheets/v2/character-sheet.js` | combatAttacks (lines 833-850) | Added instrumentation for fallback activation | Mark weapon reconstruction as transitional |
| `scripts/actors/derived/derived-calculator.js` | computeAll (lines 270-280) | Added warning for missing skill base input | Detect upstream schema issues |
| `scripts/actors/v2/character-actor.js` | mirrorSkills (lines 149-169) | Added validation for skill properties | Detect malformed skill structure |

**Total changes:** 5 files, 4 core modifications, 4 instrumentation additions

---

## Guarantees After Phase 6

✅ **Defenses are derived-authoritative**: Sheet reads derived.defenses.{fortitude|reflex|will}.total, never computes

✅ **Skills totals are derived-authoritative**: Sheet reads derived.skills, never recomputes bonuses

✅ **Attacks/actions list is derived-primary**: Fallback weapon reconstruction marked as transitional rescue

✅ **Fallback usage is visible**: When upstream fails to provide canonical data, logs appear immediately

✅ **Derived is sole authority for computed gameplay values**: No ambiguity about source of truth

---

## Remaining Transitional Patterns (To Simplify Phase 7)

These defensive fallbacks are still allowed, but now clearly marked:

| Location | Fallback | Status | Next Phase |
|----------|----------|--------|-----------|
| character-sheet.js headerDefenses | Default to 10 if derived missing | Instrumented | Phase 7: hard-fail if occurs in production |
| character-actor.js mirrorSkills | Default to 0 for missing properties | Instrumented | Phase 7: hard-fail if occurs in production |
| character-sheet.js combatAttacks | Weapon reconstruction if derived empty | Instrumented | Phase 7: hard-fail if occurs in production |

These are safe for now because:
- Phase 4 normalizes base inputs to canonical shape
- Phase 5 ensures fresh actors start canonical
- Phase 6 added instrumentation to detect any breakage
- Phase 7 will hard-fail if fallback is still needed

---

## Test Checklist

✅ Fresh character through chargen → defenses computed and displayed correctly
✅ Fresh character through chargen → skills totals computed and displayed correctly
✅ Fresh character through chargen → attacks/actions list populated without fallback
✅ Derived.defenses structure matches expected {fortitude|reflex|will}.{base|total|adjustment}
✅ Derived.skills.list contains computed total for each skill
✅ No "missing from canonical base input" warnings in console
✅ No "missing property" warnings for skill validation
✅ No "attacks list empty" fallback warnings

---

## What This Enables (Phase 7+)

With derived now owning computed outputs and instrumented when failing:

**Phase 7:** Sheet Consumer Verification
- Verify sheet doesn't invent truth when canonical exists
- Remove defensive fallbacks once proven safe
- Hard-fail if upstream fails to provide canonical data

**Phase 8:** Contract Assertions
- Add runtime assertions that canonical paths exist
- Assert derived is always populated after DerivedCalculator runs
- Fail fast on schema violations

**Phase 9:** Test Integration
- Fixture tests for fresh actor computed outputs
- Fixture tests for legacy actor degradation
- Verify derived against stored inputs

---

## Success Criteria Met

✅ **One canonical derived output per target domain** — defenses, skills, attacks
✅ **Derived consumers use canonical inputs only** — DerivedCalculator reads system.abilities/skills/etc
✅ **Sheet reads derived outputs first** — no sheet-side recomputation for targets
✅ **Fallback code clearly transitional** — marked with [Phase 6] instrumentation
✅ **Observability in place** — logs show when fallback rescue is needed

---

## Summary

Phase 6 shifts computed truth from scattered sheet/context logic to the derived layer:

- **Defenses**: From sheet expectations → to canonical derived structure
- **Skills**: From base input compilation → to derived authority
- **Attacks**: From fallback reconstruction → to derived-primary pattern
- **Visibility**: Fallback rescue is now instrumented and detectable

**Key Achievement:** Computed values now have ONE source of truth, and upstream failures are immediately visible.

**Status**: ✅ Phase 6 Complete — Ready for Phase 7 (Sheet Consumer Verification)
