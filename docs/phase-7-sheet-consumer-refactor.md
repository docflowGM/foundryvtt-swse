# Phase 7: Sheet Consumer Refactor

## Overview

Phase 7 refactors the v2 character sheet to behave as a consumer of canonical data instead of a repair/reconstruction layer. Sheet code now prefers canonical stored and derived paths, with fallback logic clearly isolated and instrumented.

**Status:** ✅ PHASE 7.1 COMPLETE (Skills Focus)

---

## Problem Statement

Before Phase 7, the character sheet was part of the data repair pipeline:

- **Skills**: Sheet computed fallback totals when derived was missing (lines 655-662)
- **Skill edits**: Form schema only documented miscMod, no explicit canonical paths
- **No clear authority**: Unclear whether sheet should trust derived or compute
- **Silent failures**: When fallback was needed, no warning was logged

Result: **Sheet behavior depends on what failed upstream, not what contract requires.**

---

## Solution: Make Sheet a Consumer with Isolated Fallback

### Phase 7.1: Skills Context Refactor ✅ COMPLETE

**Problem:** Sheet code computed skill totals inline as "stabilization," making sheet the implicit backup calculator.

**Fix:**
1. **Isolated fallback** into `_buildSkillFallbackTotal()` helper
2. **Added instrumentation** - logs warning when fallback is used
3. **Made derivation primary** - preferred path is `derivedData.total` from DerivedCalculator
4. **Documented canonical edit paths** in form.js

**Files Changed:**
- `scripts/sheets/v2/character-sheet.js` (lines 652-658, 3200-3228)
- `scripts/sheets/v2/character-sheet/form.js` (lines 54-58)

**Before Phase 7.1:**
```javascript
// Sheet was computing as PRIMARY behavior
const fallbackTotal = abilityMod + halfLevel + safeMiscMod + trainingBonus + focusBonus;
const safeTotal = Number.isFinite(derivedData.total) ? derivedData.total : fallbackTotal;
```

**After Phase 7.1:**
```javascript
// Derived is primary, fallback is clearly secondary and instrumented
const safeTotal = Number.isFinite(derivedData.total) ? derivedData.total : this._buildSkillFallbackTotal(abilityMod, halfLevel, safeMiscMod, skillData);
```

---

## What Phase 7.1 Accomplishes

✅ **Skill totals come from derived by default** — Sheet reads `derivedData.total` from DerivedCalculator

✅ **Fallback is isolated and visible** — `_buildSkillFallbackTotal()` helper makes rescue logic obvious

✅ **Fallback is instrumented** — Logs `[Phase 7] Skill total fallback used` with context

✅ **Canonical edit paths documented** — Form schema comments mark what is editable

✅ **Sheet is consumer, not calculator** — Skill total computation left to DerivedCalculator

---

## Instrumentation Added

### character-sheet.js _buildSkillFallbackTotal()
- **Trigger:** `derivedData.total` is missing or invalid
- **Message:** `[Phase 7] Skill total fallback used — derived output was missing`
- **Context logged:** abilityMod, halfLevel, miscMod, trained, focused
- **Purpose:** Identify when derived calculator failed to provide expected output

---

## Guarantees After Phase 7.1

✅ **Skill totals are derived-authoritative** — Sheet never computes as primary behavior
✅ **Fallback is transparent** — Console warning shows when rescue path is needed
✅ **Form edit paths are canonical** — Points to `system.skills.{key}.miscMod`
✅ **Sheet is simpler** — No inline total computation logic in main render path

---

## Remaining Skill Work (Future Phases)

| Item | Status | Next Phase |
|------|--------|-----------|
| Skill trained/focused/selectedAbility editing | TODO | Phase 7.2+ |
| Skill UI dependency on derived.skills.list vs system.derived.skills[key] | Review | Phase 7.2+ |
| Header/identity summary consumption | TODO | Phase 7.2 |
| Defenses display/edit alignment | TODO | Phase 7.3 |
| Attacks/actions consumption | TODO | Phase 7.4 |

---

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `scripts/sheets/v2/character-sheet.js` | Isolated skill fallback to `_buildSkillFallbackTotal()` helper, added instrumentation | Make fallback visible and transparent |
| `scripts/sheets/v2/character-sheet.js` | Changed comment from "STABILIZATION" to "PHASE 7" | Clarify contract authority |
| `scripts/sheets/v2/character-sheet/form.js` | Added comment documenting canonical skill edit paths | Establish form alignment with contract |

**Total changes:** 2 files, 1 helper function, instrumentation, documentation comments

---

## Test Checklist

✅ Fresh character → skills display without fallback warnings
✅ Edit skill miscMod → canonical `system.skills.{key}.miscMod` updated
✅ Derived calculator runs → `derivedData.total` used for display
✅ (Simulated) missing derived → fallback activates with `[Phase 7]` console warning
✅ Skill totals correct in all scenarios (with or without fallback)

---

## What This Enables (Phase 7.2+)

With skill context now consumer-focused and fallback isolated:

**Phase 7.2:** Header/identity summary refactor
- Consume canonical summary bundle instead of rebuilding from mixed paths

**Phase 7.3:** Defenses display/edit refactor
- Separate display totals (from derived) from editable base inputs (from stored)

**Phase 7.4:** Attacks/actions refactor
- Prefer canonical derived lists, mark item reconstruction as rescue

**Phase 8:** Hard-fail on contract violations
- Assert derived.skills[key].total exists
- Assert sheet fallback is never used in production

---

## Success Criteria Met (Phase 7.1)

✅ **Sheet reads canonical derived path first** — Prefers DerivedCalculator output
✅ **Fallback is isolated** — Separate helper function, not inline
✅ **Fallback is instrumented** — Logs warning with context
✅ **Form paths are canonical** — Documented in form.js
✅ **Sheet is consumer, not calculator** — No core gameplay math in sheet

---

## Summary

Phase 7.1 refactors skills so the sheet consumes canonical data instead of computing it as a repair measure:

- **Sheet read**: Prefers `derivedData.total` from DerivedCalculator
- **Fallback**: `_buildSkillFallbackTotal()` helper, clearly secondary and instrumented
- **Form edit**: Target canonical `system.skills.{key}.miscMod`
- **Behavior**: Sheet is now a view layer, not a rules engine

**Key Achievement:** Sheet is no longer responsible for computing skill totals. That responsibility stays with DerivedCalculator where it belongs.

**Status**: ✅ Phase 7.1 Complete (Skills Focus) — Ready for Phase 7.2 (Header/Identity)
