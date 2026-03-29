# PHASE 3: RECOMPUTE & INTEGRITY HARDENING — WORKING DOCUMENT

**Date Started:** March 29, 2026
**Status:** IN PROGRESS — Planning and Architecture Analysis

---

## ARCHITECTURE BASELINE (From Phase 1-2 Audit)

### Recomputation Pipeline
```
Legal Mutation via ActorEngine.updateActor()
  ↓
actor.update(sanitized)  [Foundry mutation]
  ↓
recalcAll(actor)  [SINGLE RECOMPUTATION CALL]
  ├─ DerivedCalculator.computeAll()
  ├─ ModifierEngine.applyAll()  ⚠️ IMPURE - mutates directly
  └─ PrerequisiteIntegrityChecker.evaluate()  [WARNING-ONLY]
```

### Known Issues
1. **ModifierEngine Impurity** - Mutates system.derived.* directly instead of returning computed bundle
2. **Soft Enforcement** - system.derived.* writes only warn, don't block (by design)
3. **Integrity Checks are Warning-Only** - PrerequisiteIntegrityChecker observational, non-blocking
4. **Trust-Based Flags** - _skipIntegrityCheck, isMigration rely on caller responsibility

---

## PHASE 3 OBJECTIVES

### Priority 1: MUST DO
- [ ] Fix ModifierEngine impurity (return computed bundle instead of mutating)
- [ ] Make recompute observable in dev/strict mode (logs, assertions, test helpers)
- [ ] Clarify derived field ownership in code (document who owns what)
- [ ] Create invariant map (categorize guarantees vs. warnings)

### Priority 2: SHOULD DO
- [ ] Decide on derived write protection level (warning-only or block?)
- [ ] Strengthen integrity check UX (clearer violation reporting)
- [ ] Re-test Phase 2 surfaces under hardened model

### Priority 3: NICE TO HAVE
- [ ] Add Sentinel integration for observable mutation journey
- [ ] Improve integrity violation error messages
- [ ] Add test helper assertions for recompute verification

---

## CRITICAL FINDINGS FROM AUDIT

### 1. ModifierEngine is IMPURE (Phase 2C Issue)

**Current Behavior (WRONG):**
```javascript
// ModifierEngine.applyAll() mutates directly:
static async applyAll(actor, modifierMap, allModifiers = []) {
  // DIRECTLY MUTATES:
  skillData.total = Math.max(0, base + modifier);
  defense.total = Math.max(1, base + modifier);
  derived.hp.total = Math.max(1, hpBase + hpModifier);
  derived.bab = (derived.bab || 0) + babModifier;
  // ... etc
}
```

**Design Problems:**
- Non-idempotent (calling twice produces different results)
- Corrupts shape of system.derived values (writes numbers where objects expected)
- Writes directly to system.skills.*.total (not derived field)
- Makes it hard to trace where modifier values come from

**Planned Fix (Phase 3):**
```javascript
// Return computed bundle instead of mutating
static computeAll(actor, modifierMap, allModifiers = []) {
  return {
    skills: { [skillKey]: { total: computed } },
    defenses: { [defenseKey]: { total: computed, adjustment: modifier } },
    hp: { total: computed, adjustment: modifier },
    bab: computed,
    initiative: computed,
    speed: computed,
    modifiers: { breakdown, all: allModifiers }
  };
}
```

Then apply in DerivedCalculator context only:
```javascript
const modifierBundle = await ModifierEngine.computeAll(actor, ...);
// Apply bundle to derived values (authorized during _isDerivedCalcCycle)
Object.assign(actor.system.derived.defenses[key], modifierBundle.defenses[key]);
```

### 2. Integrity Checks Are WARNING-ONLY

**Current State:**
- PrerequisiteIntegrityChecker.evaluate() is observational
- Reports violations to Sentinel (visible in logs)
- Does NOT throw or block gameplay
- By design: permissive during development

**Questions for Phase 3:**
- Should blocking prerequisites be actually blocking in strict mode?
- What about invalid gained abilities?
- Stale derived state?

**Likely Decision:**
Keep warning-only during dev (convenience), but make it observable and clear in logs.

### 3. Derived Write Protection Is SOFT

**Current State:**
```javascript
_validateDerivedWriteAuthority(changes, actor, options = {}) {
  if (derivedPaths.length > 0 &&
      !actor._isDerivedCalcCycle &&  // Only allow during recompute
      !options.isDerivedCalculatorCall) {
    SWSELogger.warn(`[SSOT VIOLATION] Attempted direct write...`);  // WARNING only
  }
}
```

**Design Rationale:**
- By design, not blocking (for compatibility)
- Protected by UI filtering instead
- Soft enforcement during dev

**Phase 3 Decision Needed:**
- Keep soft (warning-only) or harden to blocking?
- Recommendation: Keep soft in NORMAL/LOG_ONLY, harden in STRICT mode

### 4. Recomputation IS Guaranteed by Name

**But the story is muddied by:**
- Soft derived write protection
- ModifierEngine impurity (non-idempotent)
- Observability (hard to prove it happens)
- Skip flags (can suppress integrity checks)

---

## DERIVED FIELD OWNERSHIP MAP (Preliminary)

| Category | Base Owner | Derived Owner | Authority |
|----------|-----------|---------------|-----------|
| **Ability Modifiers** | Actor.system.abilities.* | DerivedCalculator | system.derived.attributes.* |
| **HP Max** | ActorEngine.recomputeHP() | ActorEngine (SSOT) | system.hp.max (hardened) |
| **HP Total** | System + Modifiers | DerivedCalculator + ModifierEngine | system.derived.hp.total |
| **BAB** | DerivedCalculator | DerivedCalculator + ModifierEngine | system.derived.bab |
| **Defenses** | DerivedCalculator | DerivedCalculator + ModifierEngine | system.derived.defenses.*.total |
| **Skills** | Trained + Modifiers | ModifierEngine | system.skills.*.total |
| **Initiative** | DEX mod + Modifiers | DerivedCalculator + ModifierEngine | system.derived.initiative |
| **Modifier Breakdown** | ModifierEngine.getAllModifiers() | ModifierEngine | system.derived.modifiers |

---

## INVARIANT MAP (TO BE COMPLETED)

### Guaranteed Invariants
- [ ] Every legal mutation through ActorEngine triggers exactly one recalcAll()
- [ ] HP max can ONLY be set via ActorEngine.recomputeHP()
- [ ] system.derived.* is only written during recalc cycle
- [ ] Modifier aggregation is deterministic

### Strict-Mode Only
- [ ] Derived write violations throw error (not warn)
- [ ] Skip flags are rejected (strict enforcement of integrity)
- [ ] Recompute completion observable in logs

### Warning-Only (Observed, Not Blocking)
- [ ] Prerequisite violations reported to Sentinel
- [ ] Update loop detected and warned
- [ ] Non-idempotent modifier application logged

### Not Yet Guaranteed
- [ ] Integrity checks actually block gameplay (permissive by design)
- [ ] Derived values are never stale
- [ ] All modifier calculations are pure

---

## FILES TO MODIFY (Preliminary)

### Priority 1
- `scripts/engine/effects/modifiers/ModifierEngine.js` - Fix impurity
- `scripts/actors/derived/derived-calculator.js` - Apply modifier bundle
- `scripts/governance/actor-engine/actor-engine.js` - Add observability

### Priority 2
- `scripts/governance/mutation/MutationInterceptor.js` - Harden derived write checks
- `scripts/governance/integrity/prerequisite-integrity-checker.js` - Improve reporting
- `tests/mutation-sovereignty.test.js` - Add recompute verification tests

### Priority 3
- `scripts/governance/sentinel.js` - Add structured recompute logging
- `scripts/core/settings.js` - Add observability toggle

---

## NEXT STEPS

1. **Wait for Plan Agent** - Detailed implementation strategy
2. **Implement Priority 1** - ModifierEngine fix + observability
3. **Hardening & Testing** - Derived write protection, re-test Phase 2 surfaces
4. **Documentation** - Complete invariant map, ownership clarity

---

**Last Updated:** March 29, 2026
**Planning Status:** Awaiting detailed implementation plan from Plan Agent

