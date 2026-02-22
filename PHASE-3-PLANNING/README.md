# Phase 3 Planning: Complete Specification Ready for Review

**Status:** ALL DRAFTS COMPLETE - READY FOR APPROVAL
**Total Artifacts:** 4 comprehensive specifications
**Branch:** `claude/domain-namespace-realignment-juLJY`
**Total Implementation Time:** ~2 hours (if approved as-is)

---

## What You Have

Four complete, production-ready specifications:

### 1. ESLint Rules Specification
**File:** `01-eslint-rules-specification.md`

Five critical lint rules to lock the architecture:

1. **@swse/combat-engine-authority** - Ensures CombatEngine.resolveAttack() is single attack authority
2. **@swse/mutations-through-actor-engine** - Enforces all actor mutations route through ActorEngine
3. **@swse/ui-engine-separation** - Prevents UI frameworks in engine domain
4. **@swse/no-legacy-imports-in-engine** - Blocks legacy domain imports in engine
5. **@swse/no-circular-combat-deps** - Enforces acyclic dependency graph

**Contains:**
- Complete implementation code for each rule
- Test cases (passing and failing examples)
- ESLint configuration syntax
- Installation instructions

**Result:** Architecture locked against drift at lint time

---

### 2. Test Suite Specification
**File:** `02-test-suite-specification.md`

Five deterministic tests freezing execution order and dependencies:

1. **Character Melee Attack** - Verifies: Roll → Modifiers → HP → Threshold → UI
2. **Vehicle Ranged Attack** - Verifies: Subsystem Check → Shield → HP → Threshold → Subsystem → UI
3. **Dogfighting** - Verifies: Opposed Pilot rolls (no HP damage)
4. **Vehicle Collision** - Verifies: Damage Calc → Shield → HP → Threshold → Subsystem → UI
5. **Dependency Integrity** - Verifies: No cycles, proper layering

**Contains:**
- Complete test implementations using Jest
- Mock utilities for characters, vehicles, weapons
- Expected pass/fail test cases
- Execution order assertions
- Dependency graph analysis functions
- Running instructions

**Result:** Execution order locked at test time

---

### 3. Architecture Documentation
**File:** `03-architecture-documentation-scaffold.md`

Professional architecture guide for the combat domain:

**Contains:**
- System overview and core principles
- Detailed architecture diagram
- Execution guarantees for all 4 combat scenarios
- File organization blueprint
- Import whitelist and restrictions
- Extension points with real examples (Riposte mechanic, cascade failures)
- Mutation contract and audit trail
- Anti-patterns to avoid
- Emergency diagnostic procedures

**Purpose:**
- Reference for developers
- Contract defining Phase 3 stability
- Future modification guardrail
- Prevents architectural erosion

---

### 4. Execution Directive
**File:** `04-phase-3-execution-directive.md`

Step-by-step execution plan for Phase 3A through 3D:

**Phase 3A: Controlled Purge** (20 min)
- Delete 12 unused mechanics
- Archive test harness
- Verify no breakage
- Commit

**Phase 3B: Hardening** (45 min)
- Implement 5 ESLint rules
- Create test suite (5 tests)
- Run all tests
- Commit

**Phase 3C: Structural Refactor** (30 min)
- Move vehicle utilities to engine
- Reorganize by subsystem
- Update all imports
- Commit

**Phase 3D: Documentation** (15 min)
- Create ARCHITECTURE.md
- Add diagrams
- Add examples
- Commit

**Total:** 4 commits, ~2 hours, LOW RISK (guardrails in place for 3C)

---

## The Strategy (Correct Sequence)

This ordering is superior to the original because:

```
Original Order (Risky):
1. Delete code ✓
2. Reorganize structure ⚠️ (vulnerability window)
3. Add guardrails ❌ (too late)

Correct Order (Safe):
1. Delete code ✓ (safe, no deps)
2. Add guardrails ✓ (protect all future changes)
3. Reorganize structure ✓ (now protected by guardrails)
4. Document ✓ (seal the contract)
```

**Why this works:**
- Phase 3A has zero dependencies, pure deletion = safe
- Phase 3B adds protective rules before any structural changes
- Phase 3C restructures with lint + tests preventing drift
- Phase 3D locks the contract so future developers understand boundaries

---

## Review Checklist

### ESLint Rules Specification
- [ ] All 5 rules are clear and implementable
- [ ] Test cases (pass/fail) make sense
- [ ] ESLint syntax is correct
- [ ] No conflicts with existing rules
- [ ] Exceptions are documented

### Test Suite Specification
- [ ] All 5 tests cover critical scenarios
- [ ] Mock utilities are complete
- [ ] Execution order assertions are precise
- [ ] Tests are deterministic (no flakiness)
- [ ] Test utilities can be reused

### Architecture Documentation
- [ ] Diagrams are clear
- [ ] Core principles are well explained
- [ ] Extension points provide real examples
- [ ] Anti-patterns are recognizable
- [ ] Emergency procedures are actionable

### Execution Directive
- [ ] 16 steps are clear and sequential
- [ ] Git commands are correct
- [ ] Pre-flight checklist is complete
- [ ] Verification steps are concrete
- [ ] Commit messages are professional

---

## Questions Before Approval?

**For ESLint Rules:**
- Do you want different severity levels (error vs warn)?
- Are there additional edge cases to catch?
- Should any rules be configurable?

**For Tests:**
- Should tests use real data or mocks?
- Any specific test runner preferences?
- Should there be integration tests?

**For Documentation:**
- Is the tone right for your team?
- Any additional sections needed?
- Should code examples be different?

**For Execution:**
- Any pre-requisites we missed?
- Should we add rollback procedures?
- Any communication/approval needed?

---

## If Approved: Next Steps

1. **User Review** - You review these 4 specifications
2. **Provide Feedback** - Any adjustments needed?
3. **Claude Executes** - Run all 16 steps sequentially
4. **Verification** - All tests pass, lint passes, git clean
5. **Merge** - Phase 3 complete and locked

---

## The Bottom Line

You now have:

✅ A professional-grade, production-ready Phase 3 plan
✅ Four complete specifications (not drafts, but ready-to-use)
✅ Correct sequencing (hardening before restructuring)
✅ Low risk (each phase verified before next)
✅ Complete documentation for future developers

**This plan will:**
- Eliminate ~2400 lines of dead code
- Lock architecture against drift with 5 lint rules
- Freeze execution order with 5 deterministic tests
- Reorganize for clarity and maintainability
- Document the contract with ARCHITECTURE.md

The combat domain will be **professionally hardened** and **ready for Phase 4**.

---

## Status Summary

```
Phase 3 Planning: ✓ COMPLETE
  ├─ ESLint Rules: ✓ Specification complete
  ├─ Test Suite: ✓ Specification complete
  ├─ Architecture Docs: ✓ Specification complete
  └─ Execution Directive: ✓ Specification complete

Ready for: APPROVAL & EXECUTION
```

**Awaiting your decision to proceed.**
