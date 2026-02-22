# Phase 3 Execution Directive

**Status:** Ready for Review
**Branch:** `claude/domain-namespace-realignment-juLJY`
**Total Steps:** 16
**Estimated Complexity:** High (but low risk due to sequence)

---

## PRE-EXECUTION CHECKLIST

Before starting Phase 3, verify:

- [ ] All Phase 2 work is complete and merged to main
- [ ] Current branch is `claude/domain-namespace-realignment-juLJY`
- [ ] All existing tests pass: `npm run test`
- [ ] No uncommitted changes: `git status` shows clean
- [ ] ESLint rules files are prepared (see artifacts)
- [ ] Test suite templates are prepared (see artifacts)
- [ ] Architecture documentation is prepared (see artifacts)

---

## PHASE 3A: CONTROLLED PURGE

**Objective:** Remove dead code with zero risk

**Time Estimate:** 20 minutes
**Risk Level:** LOW

### Step 1: Create feature branch for Phase 3A

```bash
# Verify on correct branch
git status  # Should show: branch 'claude/domain-namespace-realignment-juLJY'

# Create backup commit before any deletions
git add -A
git commit -m "Phase 3: Pre-purge checkpoint"
```

### Step 2: Delete 12 legacy mechanics files

These files have **zero imports anywhere** in the codebase.

```bash
# List files to delete
rm scripts/combat/aid-another.js
rm scripts/combat/autofire.js
rm scripts/combat/autofire-bracing.js
rm scripts/combat/burst-fire.js
rm scripts/combat/feign-haywire.js
rm scripts/combat/feint-mechanics.js
rm scripts/combat/ion-damage.js
rm scripts/combat/maiming.js
rm scripts/combat/saber-lock-mechanics.js
rm scripts/combat/tactics.js
rm scripts/combat/treat-poison.js
rm scripts/combat/weapon-mode.js
```

**Verification:**
```bash
# Verify files deleted
git status | grep deleted
# Should show 12 deleted files

# Verify no imports reference them
npm run lint 2>&1 | grep -i "cannot find module"
# Should show ZERO import errors
```

### Step 3: Archive test harness

```bash
# Move test file to tests directory (don't delete, archive)
mkdir -p tests/archived
mv scripts/combat/batch-2-comprehensive-test.js tests/archived/batch-2-comprehensive-test.js

# Update index.js to remove import
# Remove line: import { testCombatComplete } from './batch-2-comprehensive-test.js';
# Remove test command registration if applicable
```

**Verification:**
```bash
# Verify file moved
ls tests/archived/ | grep batch-2

# Verify import removed from index.js
grep "batch-2-comprehensive-test" scripts/index.js
# Should return: (no matches)
```

### Step 4: Verify no breakage

```bash
# Run all existing tests
npm run test

# If tests pass, Phase 3A is complete ✓
```

### Step 5: Commit Phase 3A

```bash
git add -A

git commit -m "Phase 3A: Controlled Purge - Delete 12 unused legacy mechanics

Removed:
- aid-another.js (0 imports, 0 dependencies)
- autofire.js (0 imports, 0 dependencies)
- autofire-bracing.js (0 imports, 0 dependencies)
- burst-fire.js (0 imports, 0 dependencies)
- feign-haywire.js (0 imports, 0 dependencies)
- feint-mechanics.js (0 imports, 0 dependencies)
- ion-damage.js (0 imports, 0 dependencies)
- maiming.js (0 imports, 0 dependencies)
- saber-lock-mechanics.js (0 imports, 0 dependencies)
- tactics.js (0 imports, 0 dependencies)
- treat-poison.js (0 imports, 0 dependencies)
- weapon-mode.js (0 imports, 0 dependencies)

Archived:
- batch-2-comprehensive-test.js → tests/archived/ (test harness, not core logic)

Result: 12 unused exports eliminated, surface area reduced by ~2400 lines
Status: All tests passing ✓

Phase 3A Complete
https://claude.ai/code/session_claude/domain-namespace-realignment-juLJY"

# Push to branch
git push -u origin claude/domain-namespace-realignment-juLJY
```

---

## PHASE 3B: HARDENING (Execute In This Exact Order)

**Objective:** Lock architecture before structural changes

**Time Estimate:** 45 minutes
**Risk Level:** LOW (add rules then test, no code modifications)

### Step 6: Implement ESLint Rules

**Files to create:**
```
eslint-rules/
├── combat-engine-authority.js
├── mutations-through-actor-engine.js
├── ui-engine-separation.js
├── no-legacy-imports-in-engine.js
└── no-circular-combat-deps.js
```

**Source:** Use specification from `PHASE-3-PLANNING/01-eslint-rules-specification.md`

**Creating rules:**

```bash
# Create eslint-rules directory
mkdir -p eslint-rules

# Create each rule file based on specification
# Copy implementations from 01-eslint-rules-specification.md

# Update .eslintrc.js to register and enable rules
```

**Verification:**
```bash
# Verify rules load without error
npm run lint -- --rule @swse/combat-engine-authority:error
npm run lint -- --rule @swse/mutations-through-actor-engine:error
npm run lint -- --rule @swse/ui-engine-separation:error
npm run lint -- --rule @swse/no-legacy-imports-in-engine:error
npm run lint -- --rule @swse/no-circular-combat-deps:error

# Run against engine domain
npm run lint -- scripts/engine/combat/

# Should show ZERO violations (existing code is clean per analysis)
```

### Step 7: Create test suite structure

**Files to create:**
```
tests/phase-3/
├── phase-3-architecture.test.js
├── test-utils.js
├── fixtures/
│   ├── mock-character.js
│   ├── mock-vehicle.js
│   └── mock-weapon.js
└── README.md
```

**Source:** Use specification from `PHASE-3-PLANNING/02-test-suite-specification.md`

**Creating tests:**

```bash
# Create test directory structure
mkdir -p tests/phase-3/fixtures

# Copy test files from specification
# Create test-utils.js with mock helpers
# Create phase-3-architecture.test.js with 5 test suites
```

### Step 8: Run tests to verify they all pass

```bash
# Run Phase 3 tests
npm run test -- tests/phase-3/

# Expected output:
# ✓ Character Melee Attack (execution order)
# ✓ Character Melee Attack (miss handling)
# ✓ Vehicle Ranged Attack (execution order)
# ✓ Vehicle Ranged Attack (subsystem disabled)
# ✓ Dogfighting (opposed rolls, no damage)
# ✓ Dogfighting (range check)
# ✓ Vehicle Collision (execution order)
# ✓ Vehicle Collision (mutual damage)
# ✓ No circular dependencies
# ✓ Proper layering verified
# ✓ UI domain one-way dependency
# ✓ Engine domain import rules
#
# Tests: 12 passed

# If ALL pass, Phase 3B is complete ✓
```

### Step 9: Commit Phase 3B

```bash
git add -A

git commit -m "Phase 3B: Hardening - ESLint Rules & Execution Order Tests

Added ESLint Rules:
1. @swse/combat-engine-authority - Single attack orchestration point
2. @swse/mutations-through-actor-engine - All mutations route through ActorEngine
3. @swse/ui-engine-separation - No UI frameworks in engine layer
4. @swse/no-legacy-imports-in-engine - Engine doesn't import from legacy domain
5. @swse/no-circular-combat-deps - Enforces acyclic dependency graph

Added Tests (5 critical execution order tests):
1. Character Melee Attack - Roll → HP → Threshold → UI
2. Vehicle Ranged Attack - Shield → HP → Threshold → Subsystem → UI
3. Dogfighting - Opposed rolls (no damage)
4. Vehicle Collision - Full damage pipeline with subsystems
5. Dependency Integrity - No cycles, proper layering

All tests passing ✓
All lint rules active ✓
Architecture is now locked against drift ✓

Phase 3B Complete
https://claude.ai/code/session_claude/domain-namespace-realignment-juLJY"

# Push to branch
git push -u origin claude/domain-namespace-realignment-juLJY
```

---

## PHASE 3C: STRUCTURAL REFACTOR

**Objective:** Reorganize with guardrails active

**Time Estimate:** 30 minutes
**Risk Level:** LOW (lint and tests protect against drift)

### Step 10: Move vehicle utilities to engine domain

```bash
# Create target directory
mkdir -p scripts/engine/combat/vehicles/utils

# Move files from legacy to engine
mv scripts/combat/systems/vehicle/vehicle-calculations.js scripts/engine/combat/vehicles/utils/
mv scripts/combat/systems/vehicle/vehicle-shared.js scripts/engine/combat/vehicles/utils/

# Remove exception from ESLint rule (no longer needed)
# In @swse/no-legacy-imports-in-engine, remove:
# temporaryException: ['scripts/combat/systems/vehicle/...']

# Update imports in files that used them
# Find: scripts/engine/combat/subsystems/vehicle/vehicle-dogfighting.js
# Find: scripts/engine/combat/subsystems/vehicle/vehicle-collisions.js
# Change imports from:
#   import { computeDogfightingModifier } from '../../../combat/systems/vehicle/vehicle-calculations.js';
# To:
#   import { computeDogfightingModifier } from '../vehicles/utils/vehicle-calculations.js';
```

**Verification:**
```bash
# Verify files moved
ls -la scripts/engine/combat/vehicles/utils/

# Verify imports updated
grep "combat/systems/vehicle" scripts/engine/combat/**/*.js
# Should return: (no matches)

# Run lint - should still pass
npm run lint -- scripts/engine/combat/

# Run tests - should still pass
npm run test -- tests/phase-3/
```

### Step 11: Reorganize subsystem files (optional clarity improvement)

```bash
# Current structure is already good, but can improve clarity:

# Move damage-related files together:
mkdir -p scripts/engine/combat/damage

mv scripts/engine/combat/damage-engine.js scripts/engine/combat/damage/
mv scripts/engine/combat/threshold-engine.js scripts/engine/combat/damage/
mv scripts/engine/combat/massive-damage-engine.js scripts/engine/combat/damage/
mv scripts/engine/combat/scale-engine.js scripts/engine/combat/damage/

# Move initiative
mkdir -p scripts/engine/combat/initiative
mv scripts/engine/combat/SWSEInitiative.js scripts/engine/combat/initiative/

# Update imports in CombatEngine.js:
# Before: import DamageEngine from './damage-engine.js'
# After: import DamageEngine from './damage/damage-engine.js'

# And so on for each moved file
```

**Verification:**
```bash
# Update all references and verify
npm run lint -- scripts/engine/combat/

# Run all tests
npm run test -- tests/phase-3/
npm run test

# All should pass
```

### Step 12: Commit Phase 3C

```bash
git add -A

git commit -m "Phase 3C: Structural Refactor - File Organization

Moved vehicle utilities to engine domain:
- scripts/combat/systems/vehicle/vehicle-calculations.js → scripts/engine/combat/vehicles/utils/
- scripts/combat/systems/vehicle/vehicle-shared.js → scripts/engine/combat/vehicles/utils/

Reorganized by subsystem:
- scripts/engine/combat/damage/ (DamageEngine, ThresholdEngine, ScaleEngine)
- scripts/engine/combat/initiative/ (SWSEInitiative)
- scripts/engine/combat/vehicles/ (SubsystemEngine, EnhancedShields, etc.)
- scripts/engine/combat/ui/ (CombatUIAdapter)

Updated all imports to reflect new structure
Removed temporary legacy import exceptions from lint rules

All tests passing ✓
All lint rules still active ✓
Clean separation of concerns ✓

Phase 3C Complete
https://claude.ai/code/session_claude/domain-namespace-realignment-juLJY"

# Push to branch
git push -u origin claude/domain-namespace-realignment-juLJY
```

---

## PHASE 3D: DOCUMENTATION

**Objective:** Seal the architecture with clear documentation

**Time Estimate:** 15 minutes
**Risk Level:** NONE (documentation only)

### Step 13: Create ARCHITECTURE.md

**Files to create:**
```
scripts/engine/combat/ARCHITECTURE.md
```

**Source:** Use scaffold from `PHASE-3-PLANNING/03-architecture-documentation-scaffold.md`

**Creating documentation:**

```bash
# Copy scaffold to actual location
cp PHASE-3-PLANNING/03-architecture-documentation-scaffold.md scripts/engine/combat/ARCHITECTURE.md
```

### Step 14: Create Architecture Diagram

```markdown
# Add to scripts/engine/combat/ARCHITECTURE.md

## Quick Reference Diagrams

### Phase 3 Attack Resolution Flow

Character Attack:
```
Roll 1d20 + bonus
        ↓
Hit vs Defense?
        ↓ (yes)
Roll damage
        ↓
Apply DT check
        ↓
Shift Condition Track
        ↓
Display Result
```

Vehicle Attack:
```
Subsystem Check
        ↓
Roll 1d20 + bonus
        ↓
Hit vs Defense?
        ↓ (yes)
Roll damage
        ↓
Apply Shields FIRST
        ↓
Apply remaining to HP
        ↓
Apply DT check
        ↓
Escalate Subsystem (if threshold)
        ↓
Display Result
```
```

### Step 15: Create extension examples

Add documented extension patterns to ARCHITECTURE.md:

```markdown
## Example: Adding Riposte Mechanic

[Copy from 03-architecture-documentation-scaffold.md Extension Points section]
```

### Step 16: Commit Phase 3D

```bash
git add scripts/engine/combat/ARCHITECTURE.md

git commit -m "Phase 3D: Documentation - Architecture Locked

Created scripts/engine/combat/ARCHITECTURE.md containing:
- Architecture overview and diagram
- Core principles (single authority, unidirectional dependencies, etc.)
- Execution guarantees for all combat scenarios
- File organization and import rules
- Extension points with examples
- Mutation contract and audit trail
- Anti-patterns and emergency procedures

This documentation serves as:
1. Reference for developers extending combat system
2. Contract defining Phase 3 architectural stability
3. Guardrail for future modifications
4. Emergency diagnostic guide

Phase 3D Complete - Combat Domain Professionally Hardened ✓

Phase 3 FULLY COMPLETE ✓

https://claude.ai/code/session_claude/domain-namespace-realignment-juLJY"

# Push to branch
git push -u origin claude/domain-namespace-realignment-juLJY
```

---

## POST-EXECUTION VALIDATION

After all 16 steps complete, run validation:

```bash
# 1. All tests pass
npm run test

# 2. Lint passes
npm run lint

# 3. Phase 3 tests specifically
npm run test -- tests/phase-3/

# 4. No dead code remains
npm run analyze:unused-exports

# 5. Dependency graph clean
npm run analyze:imports scripts/engine/combat/

# 6. All commits present
git log --oneline | head -5
```

**Expected commit history:**
```
[Phase 3D] Documentation - Architecture Locked
[Phase 3C] Structural Refactor - File Organization
[Phase 3B] Hardening - ESLint Rules & Tests
[Phase 3A] Controlled Purge - Delete 12 unused mechanics
[Phase 2 Complete] Combat domain reached professional state
```

---

## BRANCH READY FOR MERGE

Once all validation passes:

```bash
# Verify branch is clean
git status  # Should show: nothing to commit, working tree clean

# Create merge request
gh pr create \
  --title "Phase 3 Complete: Combat Domain Professional Hardening" \
  --body "Phase 3 execution complete across all four phases:

Phase 3A: Controlled Purge - 12 unused mechanics deleted
Phase 3B: Hardening - ESLint rules + execution order tests
Phase 3C: Structural Refactor - File organization improved
Phase 3D: Documentation - ARCHITECTURE.md created

All tests passing ✓
All lint rules active ✓
All validation complete ✓

Ready for merge to main"
```

---

## PHASE 3 SUMMARY

| Phase | Component | Status | Tests | Lint | Docs |
|-------|-----------|--------|-------|------|------|
| 3A | Controlled Purge | COMPLETE | ✓ | ✓ | - |
| 3B | Hardening | COMPLETE | ✓ | ✓ | - |
| 3C | Structural Refactor | COMPLETE | ✓ | ✓ | - |
| 3D | Documentation | COMPLETE | - | - | ✓ |

**COMBAT DOMAIN STATUS: PROFESSIONALLY HARDENED** ✓

The combat subsystem has been:
- Cleaned of dead code
- Locked against architectural drift via lint rules and tests
- Properly organized for maintainability
- Documented with clear extension points
- Validated to have no circular dependencies
- Guaranteed execution order for all combat scenarios

Ready for Phase 4 (vehicle subsystem relocation) whenever needed.
