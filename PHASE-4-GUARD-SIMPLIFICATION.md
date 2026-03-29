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

## CURRENT UNDERSTANDING (Pre-Audit)

### Known Active Layers
1. **MutationInterceptor.js** - Primary enforcement, setEnforcementLevel(level)
2. **ActorEngine.recalcAll()** - Observable pipeline, integrity checks
3. **ActorEngine.updateActor()** - Mutation routing, recompute trigger
4. **ActorEngine._validateDerivedWriteAuthority()** - Derived field protection
5. **PrerequisiteIntegrityChecker.evaluate()** - Prerequisite validation
6. **Phase 2 Routing** - 16 mutation surfaces routed through ActorEngine

### Likely Redundancies to Investigate
- Multiple layers checking authorization?
- Dead "GovernanceSystem" placeholders?
- EmbeddedMutationLayer still disabled?
- Hook-based guards overlapping with MutationInterceptor?

### Unknowns Waiting for Audit
- What helpers/wrappers still bypass ActorEngine?
- Are there misleading comments about enforcement?
- What test coverage actually exists?
- What modes are documented vs real?

---

## NEXT STEPS

Await audit results, then proceed with simplification tasks in order.

**Estimated Remaining Work:** 3-4 commits, focused documentation
