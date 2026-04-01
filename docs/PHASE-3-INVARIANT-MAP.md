# PHASE 3: INVARIANT MAP

**Date:** March 29, 2026
**Purpose:** Explicit categorization of what integrity guarantees are truly enforceable

This map clarifies what the system actually guarantees (not just hopes) about actor mutations and derived state.

---

## CATEGORY 1: GUARANTEED INVARIANTS ✅

These are enforced at the code level and will throw errors if violated.

### G1: Every legal mutation triggers recalcAll()
- **Guarantee:** Every mutation through ActorEngine.updateActor() triggers exactly one recalcAll()
- **Where Enforced:** ActorEngine.updateActor() at line 224 → calls recalcAll() at line 332
- **Proof:** Call stack: updateActor → applyActorUpdateAtomic → recalcAll is synchronous in updateActor flow
- **Exception:** None known
- **Blocking:** Yes - throws if recalcAll fails

### G2: system.hp.max is ONLY written by ActorEngine.recomputeHP()
- **Guarantee:** Direct writes to system.hp.max throw error unless:
  - Called from ActorEngine.recomputeHP() with isRecomputeHPCall=true
  - Called from migration with isMigration=true
- **Where Enforced:** ActorEngine.updateActor() lines 273-282
- **Proof:** Check catches `path === 'system.hp.max'` and throws unless authorized
- **Exception:**
  - ActorEngine.recomputeHP(actor, ...)
  - Migrations with { isMigration: true }
- **Blocking:** Yes - throws immediately

### G3: Mutation loops are prevented
- **Guarantee:** If an update triggers cascading updates >5 times per second, system blocks
- **Where Enforced:** ActorEngine._detectUpdateLoop() at line 132
- **Proof:** Tracks update count and blocks if threshold exceeded
- **Exception:** Updates with matching guardKey can skip detection
- **Blocking:** Yes - prevents infinite recursion

### G4: Migrations cannot be nested
- **Guarantee:** While a migration is active for an actor, new ActorEngine calls throw
- **Where Enforced:** ActorEngine.updateActor() lines 254-268
- **Proof:** _activeMigrations Set prevents recursive calls
- **Exception:** Same migration can be retried after previous completes
- **Blocking:** Yes - throws if nested

### G5: Derived values are computed before integrity checks
- **Guarantee:** Integrity checks ALWAYS run AFTER recomputation
- **Where Enforced:** ActorEngine.recalcAll() execution order (lines 43-77)
- **Proof:** DerivedCalculator.computeAll() → ModifierEngine.applyAll() → _checkIntegrity()
- **Exception:** None - always in this order
- **Blocking:** No - integrity checks don't throw

---

## CATEGORY 2: STRICT-MODE ONLY GUARANTEES 🔒

These are enforced only when enforcement level is 'strict' (localhost/127.0.0.1 by default).

### S1: system.derived.* writes outside recompute phase throw error
- **Guarantee:** In strict mode, writes to system.derived.* outside DerivedCalculator phase throw
- **Where Enforced:** ActorEngine._validateDerivedWriteAuthority() at line 72 + MutationInterceptor enforcement
- **Proof:** Checks `actor._isDerivedCalcCycle` and enforces if not set
- **In Normal Mode:** Only logs warning
- **In Strict Mode:** Throws error via MutationInterceptor
- **Exception:** Writes with isDerivedCalculatorCall=true bypass check
- **Blocking:** Yes (in strict mode only)

### S2: Skip flags (_skipIntegrityCheck) are rejected
- **Guarantee:** In strict mode, _skipIntegrityCheck flag is rejected/not allowed
- **Where Enforced:** Could be added to ActorEngine.updateActor() validation
- **Proof:** Currently NO enforcement - this is a gap to fix
- **In Normal Mode:** Allowed (to prevent recursion)
- **In Strict Mode:** Should throw or warn loudly
- **Exception:** PrerequisiteIntegrityChecker uses it for legitimate recursion prevention
- **Blocking:** No (currently)

**PHASE 3 TODO**: Add strict mode rejection of _skipIntegrityCheck

### S3: Recomputation completion is observable
- **Guarantee:** In strict/dev mode, detailed logs show recomputation pipeline execution
- **Where Enforced:** ActorEngine.recalcAll() lines 41-115
- **Proof:** Stage-by-stage logging (RECOMPUTE START/END/FAILED)
- **In Normal Mode:** Minimal logging (not collected)
- **In Strict Mode:** Full pipeline visibility
- **Exception:** None
- **Blocking:** No - purely observational

### S4: Mutation context is required for ActorEngine calls
- **Guarantee:** In strict mode, ActorEngine calls require proper initialization context
- **Where Enforced:** MutationInterceptor.setContext() at line 131
- **Proof:** blockNestedMutations flag causes throw if set
- **In Normal Mode:** Only logs warnings
- **In Strict Mode:** Throws error
- **Exception:** Top-level mutations and cascading through hooks
- **Blocking:** Yes (in strict mode only)

---

## CATEGORY 3: WARNING-ONLY GUARANTEES ⚠️

These are observed and reported but don't block gameplay.

### W1: Prerequisite violations are detected and logged
- **Guarantee:** PrerequisiteIntegrityChecker identifies all items with unsatisfied prerequisites
- **Where Enforced:** PrerequisiteIntegrityChecker.evaluate() - reports to Sentinel
- **Proof:** Checks AbilityEngine.evaluateAcquisition() for each item
- **Blocking:** No - violations are logged but gameplay continues
- **Observable:** Yes - Sentinel shows violations
- **User Impact:** None - silent except in dev logs

### W2: Update loops are warned (not blocked)
- **Guarantee:** Cascade update loops >5 per second are detected and warned
- **Where Enforced:** ActorEngine._detectUpdateLoop() reports to Sentinel
- **Proof:** Tracks stack and logs warning if threshold hit
- **Blocking:** No - warns but allows update
- **Observable:** Yes - Sentinel shows loop warnings
- **User Impact:** Possible performance impact if loop is real

### W3: Derived write violations are logged
- **Guarantee:** Writes to system.derived.* outside DerivedCalculator phase are logged (normal mode)
- **Where Enforced:** ActorEngine._validateDerivedWriteAuthority() and MutationInterceptor
- **Proof:** Logs `[SSOT VIOLATION]` warning message
- **Blocking:** No (in normal mode)
- **Observable:** Yes - warning appears in logs
- **User Impact:** None - data is written despite warning

### W4: Migration-context operations are tracked
- **Guarantee:** Operations marked with isMigration:true are tracked separately for audit
- **Where Enforced:** ActorEngine.updateActor() metadata handling
- **Proof:** meta.origin field recorded for migrations
- **Blocking:** No - just metadata
- **Observable:** Yes - through origin metadata
- **User Impact:** None

---

## CATEGORY 4: NOT YET GUARANTEED ❌

These are not enforced and are known gaps/assumptions in the system.

### N1: Integrity checks actually prevent invalid states
- **Status:** NOT guaranteed
- **Current Behavior:** PrerequisiteIntegrityChecker logs violations but doesn't block
- **Reason:** Designed to be permissive during development
- **Impact:** Invalid abilities can still exist on actors
- **How to Fix:** Add prerequisite enforcement in strict mode or as a separate mode
- **Recommendation:** Keep as warning-only for now (convenience), but make it very visible

### N2: Derived values are never stale
- **Status:** NOT fully guaranteed
- **Current Behavior:** recompute() is called after mutations, but...
- **Risk:** Custom code calling actor.update() directly could bypass recompute
- **Impact:** Derived values could lag behind base values
- **How to Fix:** Phase 2 routing ensures all mutations go through ActorEngine
- **Status After Phase 2:** MUCH better (all routed through ActorEngine)
- **Remaining Risk:** Items or custom code outside ActorEngine might bypass

### N3: Modifier calculations are pure
- **Status:** NOW FIXED (Phase 3)
- **Previous Issue:** ModifierEngine.applyAll() was non-idempotent
- **Fix Applied:** computeModifierBundle() is pure, applyComputedBundle() is single mutation point
- **Guarantee Now:** Modifier calculation returns same values if called twice

### N4: HP formula consistency
- **Status:** NOT guaranteed
- **Current Behavior:** ActorEngine.recomputeHP() calculates based on class/level/CON/bonus
- **Risk:** If inputs are inconsistent, formula might be inconsistent
- **Example:** If class field is corrupted, HP calculation breaks
- **How to Fix:** Would need formula validation before calculation
- **Recommendation:** Document HP formula assumptions clearly

### N5: Skill total accuracy
- **Status:** NOT guaranteed (dependent on ModifierEngine)
- **Current Behavior:** skills[skillKey].total = base + modifiers
- **Risk:** If modifier calculation is wrong, skill total is wrong
- **After Phase 3:** Much safer - ModifierEngine is pure
- **Remaining Risk:** Modifier collection might miss sources

### N6: Defense total accuracy
- **Status:** NOT guaranteed (dependent on ModifierEngine)
- **Current Behavior:** Similar to skills
- **Risk:** Similar to skills
- **After Phase 3:** Much safer with pure ModifierEngine

### N7: Items cannot be modified directly on unowned/world items
- **Status:** NOT guaranteed
- **Current Behavior:** World items CAN be modified directly (and DO in many cases)
- **By Design:** Non-actor-owned items bypass ActorEngine
- **Reason:** Performance and complexity
- **Impact:** World items' integrity not enforced
- **Recommendation:** Keep as-is (acceptable risk for non-owned items)

---

## SUMMARY TABLE

| Invariant | Guaranteed | Strict-Only | Warning | Not-Yet | Phase |
|-----------|-----------|-----------|---------|---------|-------|
| Every mutation triggers recompute | ✅ | — | — | — | 2 |
| HP max sole-writer enforcement | ✅ | — | — | — | 4 |
| Mutation loop prevention | ✅ | — | — | — | 2 |
| Migration nesting prevention | ✅ | — | — | — | 11 |
| Derived recalc before integrity | ✅ | — | — | — | 3 |
| Derived write protection | — | ✅ | ⚠️ | — | 2/3 |
| Skip flags rejection | — | ❌ | — | ✅ | 3 |
| Recompute observability | — | ✅ | — | — | 3 |
| Mutation context requirement | — | ✅ | — | — | 2 |
| Prerequisite detection | — | — | ✅ | — | 2 |
| Update loop detection | — | — | ✅ | — | 2 |
| Derived write logging | — | — | ✅ | — | 2 |
| Modifier purity | ✅ | — | — | — | 3 |
| Integrity enforcement | — | — | — | ❌ | TBD |
| Derived staleness prevention | ✅* | — | — | — | 2 |
| Skill accuracy | — | — | — | ⚠️ | All |
| Defense accuracy | — | — | — | ⚠️ | All |

---

## DERIVED FIELD OWNERSHIP CLARIFICATION

### Who Owns What?

#### ActorEngine Ownership
- `system.hp.max` — SOLE writer via recomputeHP()
- `system.damage` — Damage tracking (managed by ActorEngine)
- Update sequencing and cascading

#### DerivedCalculator Ownership
- `system.derived.attributes.*` — Ability modifiers
- `system.derived.heroicLevel`, `nonheroicLevel` — Level calculations
- `system.derived.forcePoints`, `destinyPoints` — Force/Destiny derived
- `system.derived.initiative` — Base initiative
- `system.derived.hp.base` — HP base value (mirrors system.hp.max)
- `system.derived.bab.base` — Base attack bonus (before modifiers)
- `system.derived.defenses.*.base` — Base defense values
- `system.derived.grappleBonus` — Grapple calculation

#### ModifierEngine Ownership (After Phase 3 Fix)
- `system.derived.hp.adjustment` — HP modifier adjustment
- `system.derived.bab.adjustment` — BAB modifier adjustment
- `system.derived.initiative.adjustment` — Initiative modifier adjustment
- `system.derived.defenses.*.adjustment` — Defense modifier adjustments
- `system.derived.defenses.*.total` — Defense total (base + modifier)
- `system.derived.hp.total` — HP total (base + modifier)
- `system.derived.modifiers.*` — Modifier breakdown for UI
- `system.skills.*.total` — Skill total (base + modifiers)

#### Sheet UI Ownership
- Input validation and protection
- Form filtering of protected fields
- UI display of read-only values

#### Hook-Based Systems
- Follower hooks handle cascading updates
- HP hooks trigger recomputeHP when level/CON changes
- Item equip/use hooks trigger modifier updates

---

## RECOMMENDATIONS FOR PHASE 4+

1. **Strengthen Integrity Enforcement**: Move W1 (prerequisite violations) from warning to blocking in at least one mode
2. **Add Skip-Flag Rejection**: Implement S2 in strict mode
3. **Further Modifier Purity**: Consider making modifier collection async pure as well (currently async with side effects)
4. **HP Formula Documentation**: Document all inputs to HP calculation and validate them before use
5. **Skill Accuracy Verification**: Add test coverage for skill modifier accuracy across all sources

---

**Report Generated:** March 29, 2026
**Status:** Complete for Phase 3 checkpoint
**Next Deliverable:** Phase 3 completion report with all findings
