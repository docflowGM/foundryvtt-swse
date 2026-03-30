# PHASE 4: GUARD LAYER SIMPLIFICATION — WORKING DOCUMENT

**Date:** March 29, 2026
**Status:** IN PROGRESS — Governance audit underway

---

## PHASE 4 MISSION

Transform the governance system from "layered and historically messy" to "one clear enforcement story."

Post-Phase 3, we have:
- ✅ Real enforcement (strict mode throws, normal mode warns)
- ✅ Observable recomputation pipeline
- ✅ Documented invariants (62 items)
- ✅ All 16 Phase 2 surfaces routed correctly

Phase 4 is about:
- Auditing ALL governance layers currently active
- Identifying and removing redundancy/dead code
- Simplifying confusing guard layers
- Proving sovereignty through tests (not just architecture)
- Documenting the final enforcement chain
- Adding runtime diagnostics

---

## PHASE 4 TASKS

### TASK 1: Audit Current Governance Chain
**Agent:** Exploring (in progress)
**Scope:** Map all active layers, redundancies, dead code
**Deliverable:** Governance layer map

### TASK 2: Simplify Guard Layer Architecture
**Status:** Pending audit results
**Scope:** Remove/retire/consolidate layers based on audit
**Key Decisions:** EmbeddedMutationLayer, GovernanceSystem modes, overlapping checks

### TASK 3: Normalize Enforcement Mode Behavior
**Status:** Pending
**Scope:** Document normal/strict/override modes with explicit contracts
**Deliverable:** PHASE-4-ENFORCEMENT-MODES.md

### TASK 4: Harden Mutation Sovereignty Tests
**Status:** Pending
**Scope:** Add comprehensive tests proving sovereignty claims
**Deliverable:** phase-4-mutation-sovereignty.test.js

### TASK 5: Add Sentinel Governance Diagnostics
**Status:** Pending
**Scope:** Structured runtime reporting for mutations
**Deliverable:** Enhanced Sentinel integration

### TASK 6: Build Mutation Governance Truth Table
**Status:** Pending
**Scope:** Reference artifact mapping all mutation types
**Deliverable:** PHASE-4-MUTATION-TRUTH-TABLE.md

### TASK 7: Close Helper/Wrapper Ambiguity
**Status:** Pending
**Scope:** Audit and clarify actor-utils, document-api, helpers
**Deliverable:** Simplified helper layer with clear authority

### TASK 8: Add Compliance Assertions
**Status:** Pending
**Scope:** Anti-regression guardrails for future changes
**Deliverable:** Compliance check infrastructure

---

## AUDIT FINDINGS (COMPLETED)

### Critical Issues Found

1. **MutationInterceptor Defaults to log_only Mode**
   - Default hardcoded at line 48: `let ENFORCEMENT_LEVEL = 'log_only'`
   - In this mode: **ALL mutations are allowed** (just logged)
   - STRICT mode exists but is NOT active by default
   - Result: Enforcement is disabled by default, not enabled

2. **EmbeddedMutationLayer is Redundant & Disabled**
   - Initialized but `ENABLED = false` (line 27)
   - Duplicates MutationInterceptor checks
   - Only checks if context is set (MutationInterceptor already does this)
   - Recommendation: **REMOVE entirely**

3. **Multiple Dead Code Paths**
   - 4x `if (false) MutationIntegrityLayer...` (never triggered)
   - 8x `suppressRecalc` support (never set anywhere)
   - `blockNestedMutations` policy (never violated)
   - Recommendation: **DELETE**

4. **Misleading Comments About Enforcement**
   - "PHASE 1: Actually throws in strict mode" (but doesn't by default)
   - "Only legal path to mutations" (there are alternatives through ActorEngine)
   - "MUST route through ActorEngine" (should be "SHOULD route")
   - Recommendation: **FIX to match actual behavior**

5. **Tests Don't Verify STRICT Mode**
   - All tests run in log_only or normal mode
   - No tests verify that STRICT mode throws on unauthorized mutations
   - Recommendation: **ADD comprehensive STRICT mode test suite**

### Actual Governance Chain (As It Works Now)

In default log_only mode:
```
User Code → actor.update()
         → MutationInterceptor wrapper
         → Check enforcement level (log_only)
         → In log_only: Allow and continue
         ✅ Mutation succeeds (just logged)
```

Correct authorized path:
```
User Code → ActorEngine.updateActor()
         → MutationInterceptor.setContext()
         → actor.update() [AUTHORIZED]
         → recalcAll()
         → clearContext()
```

### Governance Layers Status

| Layer | Active | Default | Issue | Action |
|---|---|---|---|---|
| MutationInterceptor | ✅ YES | log_only | Enforcement disabled | **Fix default** |
| EmbeddedMutationLayer | ❌ Disabled | WARNING | ENABLED=false, redundant | **REMOVE** |
| ActorEngine context | ✅ YES | N/A | Works correctly | KEEP |
| Dead code paths | ❌ Never | N/A | if(false) blocks | **DELETE** |
| GovernanceSystem | ✅ YES | normal | Separate concern | Keep, document |

---

## PHASE 4 ACTION ITEMS (READY TO EXECUTE)

### FIX 1: Enable Enforcement by Default

Change MutationInterceptor.js line 48:
- **Before:** `let ENFORCEMENT_LEVEL = 'log_only'`
- **After:** `let ENFORCEMENT_LEVEL = null` (set by initialize())

### FIX 2: Remove Redundant Layer

Delete EmbeddedMutationLayer:
- Remove from scripts/governance/mutation/
- Remove initialization from index.js line 313
- All functionality already in MutationInterceptor

### FIX 3: Delete Dead Code

Remove from MutationInterceptor.js:
- 4x `if (false) MutationIntegrityLayer...` blocks
- 8x `suppressRecalc` support code
- `blockNestedMutations` check if never set

### FIX 4: Fix Misleading Comments

Update actor-engine.js and MutationInterceptor.js:
- "Only legal path" → "Primary authorized path"
- "MUST route through ActorEngine" → "SHOULD route"
- Clarify that log_only mode allows everything

### FIX 5: Add STRICT Mode Tests

Create phase-4-mutation-sovereignty-strict.test.js:
- Test that unauthorized mutations throw in STRICT
- Test that ActorEngine path is authorized
- Test mode transitions
- Test recomputation runs

---

## NEXT STEPS

Execute simplifications immediately:
1. **Commit 1:** Fix enforcement default + remove dead code
2. **Commit 2:** Remove EmbeddedMutationLayer
3. **Commit 3:** Add STRICT mode tests
4. **Commit 4:** Update documentation (fix comments)
5. **Commit 5:** Complete mutation truth table
6. **Final:** Phase 4 completion report

**Estimated Work:** 5-6 commits, focused cleanups
