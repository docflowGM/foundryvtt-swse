# Architectural Violation Categorization

**Date:** 2026-02-09
**Phase:** Phase 3 (Structural Boundary Enforcement)
**Total Initial Audit:** 77 violations identified

---

## Executive Summary

Initial architectural audit identified 77 potential violations across the suggestion system and broader engine infrastructure. This document categorizes them into four buckets and establishes a **governance policy** for Phase 3 closure.

**Decision:** Only Bucket 1 violations block Phase-3 completion. All other buckets are tracked but explicitly deferred.

---

## Four Violation Buckets

### 🟥 Bucket 1: True Phase-3 Boundary Violations (MUST FIX)

**Definition:** ENGINE imports UI logic, ENGINE branches on UI flow, UI mutates documents directly from engine, ENGINE returns presentation data.

**Status:**
- ✅ **Suggestion Engine:** COMPLETE
  - Removed MentorSurvey imports (ENGINE → UI)
  - Separated presentation data (202 lines removed)
  - Created dumb UI mapping layer

- ⏳ **Progression Engine:** IN SCOPE (next)
  - Identified but not yet fixed
  - Similar pattern to Suggestion Engine (expected 2-5 violations)

- ⏹️ **Other imports:** Deferred (ClassSuggestionEngine, MetaTuning)
  - Not structural leaks (utility functions, form inheritance)

**Estimated count:** ~5-10 violations (high-priority, small cluster)

**Phase-3 closure criteria:**
- ✅ No ENGINE imports of UI modules
- ✅ No hardcoded presentation data in engines
- ✅ No ENGINE-initiated DOM manipulation
- ⏳ After Progression Engine fix: ALL criteria met

---

### 🟨 Bucket 2: Structural Hygiene / Phase-4 Optimization (TRACK, DEFER)

**Definition:** Code that works but could be cleaner: duplicated constants, magic strings, utilities defined in wrong layer, engines thicker than necessary.

**Examples:**
- ARCHETYPE_DATA, THEME_SIGNALS duplicated across multiple files
- BASE_CLASSES constant in levelup UI (should be in data layer)
- calculateTotalBAB utility in levelup UI (called from engine)
- Older suggestion engines with verbose heuristics

**Estimated count:** ~50-60 violations (noise mostly, refinement opportunity)

**Why deferred:**
- Don't fix while Phase 3 is open (scope creep risk)
- These don't block correctness
- Better handled in Phase 4 (refactoring pass)

**Policy:** Track these in code comments, schedule for Phase 4.

---

### 🟦 Bucket 3: Legacy Code Guarded by Phase-3 Contracts (IGNORE)

**Definition:** Old patterns, deprecated flows, code paths that *would* be violations but are now wrapped/gated safely by Phase-3 contracts.

**Examples:**
- Old mentor flow code (now wrapped by BuildIntent)
- Legacy progression paths (gated behind deprecation flags)
- MetaTuning.js (is actually a UI form class, not an engine misusing UI)

**Estimated count:** ~10-15 violations (false alarms, already safe)

**Why ignored:**
- Phase-3 contracts already protect against misuse
- No action needed unless violations fire at runtime
- Will naturally clean up when legacy paths are removed

**Policy:** Do nothing. Document that these are safe.

---

### 🟩 Bucket 4: Scanner Noise / False Positives (IGNORE PERMANENTLY)

**Definition:** Comments, test helpers, dev-only tools, archived code, defensive guards that *look* like violations but aren't.

**Examples:**
- Comments referencing old patterns
- Test utility files
- Archived code blocks
- Conditional guards for "if this were used, it would be bad" scenarios

**Estimated count:** ~5-10 violations (noise)

**Why ignored:**
- Not actionable
- Not security risks
- Burden of tracking > benefit of cleaning

**Policy:** Do not chase these.

---

## Governance Policy: Phase-3 Closure

### ✅ What blocks Phase-3 closure:
- Bucket 1 violations only
- All ENGINE → UI boundary imports eliminated
- All presentation data removed from engines
- All Bucket 1 items verified in scope

### ✅ What does NOT block Phase-3 closure:
- Bucket 2 (hygiene)
- Bucket 3 (guarded legacy)
- Bucket 4 (noise)

### ✅ Phase-3 completion criteria:

After **Suggestion Engine** and **Progression Engine** are fixed:

```
✓ No ENGINE imports of ../apps/* (except guarded legacy)
✓ No ENGINE imports of ../ui/* (except guarded legacy)
✓ No hardcoded strings (icon, css, reason) in engines
✓ All presentation data moved to UI layer
✓ All behavioral intent divorced from presentation
✓ Suggestion Engine SSOT → ENGINE → UI verified clean
✓ Progression Engine SSOT → ENGINE → UI verified clean
```

At that point, **Phase 3 is DONE**, and all remaining items become Phase-4 work (optional, lower priority).

---

## Remaining Bucket-1 Scope: Progression Engine

**Files to audit:**
- scripts/engine/progression.js (or progression directory)

**Expected violations:**
- ENGINE → UI imports (similar to Suggestion Engine)
- Possible hardcoded progression descriptions/strings
- Possible UI-flow branching

**Next steps:**
1. Scan for ENGINE → UI imports in progression
2. Extract data contract
3. Replace UI coupling with actor data flags
4. Verify no behavior change
5. Commit as single, scoped change

---

## Reference: Bucket Mapping for Future Contributors

When new violations are discovered:

| Finding | Bucket | Action |
|---------|--------|--------|
| "ENGINE imports from apps/" | 1 🟥 | Fix immediately |
| "ENGINE returns icon/CSS" | 1 🟥 | Fix immediately |
| "Magic string defined twice" | 2 🟨 | Track for Phase 4 |
| "Old code path still works" | 3 🟦 | Document as safe |
| "Comment mentions removed code" | 4 🟩 | Ignore |

---

## Sign-off

This categorization represents the **governance policy for Phase 3**.

- ✅ Recorded: 2026-02-09
- ✅ Scope: Clear
- ✅ Status: Suggestion Engine complete, Progression Engine next
- ✅ Closure: After Progression Engine, Phase 3 is complete

No further violations will be addressed until Phase 3 boundaries are verified clean.
