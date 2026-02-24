# 🔥 DAMAGE MITIGATION SUBSYSTEM AUDIT — V2 GOVERNANCE REVIEW

**Date**: 2026-02-23
**Status**: 🔴 CRITICAL — Cross-cutting vulnerability detected
**Scope**: Damage Resolution Engine, SR/DR/Temp HP, Mutation Integrity
**Authority**: V2 Architectural Compliance

---

## 📋 EXECUTIVE SUMMARY

**Finding**: Damage mitigation is **partially centralized but architecturally fractured**:

1. ✅ **Temp HP**: COMPLIANT — Correct order (bonus → temp → HP)
2. ✅ **Mutations**: COMPLIANT — ActorEngine enforces centralized control
3. ✅ **DamageResolutionEngine**: COMPLIANT — Pure calculation, no mutation
4. ❌ **SR (Shield Rating)**: NON-COMPLIANT — Stored at ITEM level, not derived; no centralized mitigation
5. ❌ **DR (Damage Reduction)**: NON-COMPLIANT — Exists in vehicle schema but never applied in combat
6. ❌ **Direct HP Mutations**: VIOLATION — DarkSidePowers applies damage via inline math
7. ⚠️ **Duplication**: Energy Shield logic duplicated across tools, not integrated into combat

**Risk**: Damage can bypass mitigation, allowing arbitrary HP subtraction outside the locked order.

---

## 🔍 PHASE 1 AUDIT FINDINGS

### 1️⃣ ILLEGAL DAMAGE MATH — DIRECT VIOLATIONS

**Location**: `scripts/talents/DarkSidePowers.js`

**Violations Found**:

| Line | Method | Violation | Severity |
|------|--------|-----------|----------|
| 237 | `const newHp = Math.max(0, actor.system.hp?.value - dmg.damage);` | Direct HP subtraction + missing mutation batch | 🔴 CRITICAL |
| 313 | `const newHp = Math.max(0, targetToken.actor.system.hp.value - damageAmount);` | Direct HP subtraction | 🔴 CRITICAL |
| 1237 | `const newHp = Math.max(0, targetActor.system.hp.value - damageAmount);` | Direct HP subtraction | 🔴 CRITICAL |

**Root Cause**: These locations compute HP but never call ActorEngine or any mutation authority. The result is computed but NOT applied via locked mutation pipeline.

**Impact**:
- Damage can apply without threshold check
- Damage can apply without SR/DR mitigation
- Temp HP can be bypassed
- No mutation audit trail

---

### 2️⃣ SHIELD RATING (SR) — NON-COMPLIANT ARCHITECTURE

**Current Implementation**:

```
Item (Armor type="shield")
  ├─ system.shieldRating (base SR value)
  ├─ system.currentSR (active SR after activation)
  └─ system.equipped (equipped flag)
```

**Location**: `scripts/data-models/item-data-models.js:177-178`

**Problems**:

1. **SR stored at ITEM level, NOT ACTOR derived**
   - Should be: `actor.system.derived.shield.current`, `actor.system.derived.shield.max`
   - Currently: `item.system.currentSR` (cannot be queried system-wide)
   - **Violation**: DerivedCalculator (V2 authority) never computes SR

2. **No centralized SR collection**
   - Item sheet manually sets `currentSR = shieldRating` on activation
   - Location: `scripts/items/swse-item-sheet.js:122`
   - **Violation**: UI-level state mutation (not ActorEngine)

3. **SR never applied in damage pipeline**
   - DamageResolutionEngine: No SR mitigation
   - DamageEngine: No SR reference
   - ThresholdEngine: No SR check
   - **Violation**: Locked order demands SR BEFORE DT check

4. **Energy Shields not formalized**
   - No dedicated item type `energyShield`
   - Categorized via tools: `categorize-shields.js`, `add-current-sr.js`, `update-shield-proficiencies.js`
   - **Violation**: Tool-driven data transformation (not declarative schema)

5. **SR degradation rule never implemented**
   - RAW: "If damage > SR, reduce SR by 5"
   - Currently: No logic for SR recovery or degradation
   - **Violation**: Incomplete rules implementation

**Tools Creating Duplication**:
- `tools/add-current-sr.js` — Migrates currentSR field
- `tools/categorize-shields.js` — Identifies energy shields by name regex
- `tools/update-shield-proficiencies.js` — Adds proficiency flags
- **All bypass ActorEngine**

---

### 3️⃣ DAMAGE REDUCTION (DR) — UNUSED INFRASTRUCTURE

**Current State**:

- **Character schema**: No DR field
- **Vehicle schema**: `system.damageReduction` (NumberField, no rules)
- **Calculation**: `scripts/engines/combat/vehicles/utils/vehicle-calculations.js:computeVehicleDefensiveStats()`
  - Reads `system.damageReduction` but returns only
  - Never called in damage application
- **Combat integration**: Zero integration

**Violations**:

1. **DR computed but never applied**
   - Function exists but unreferenced
   - Vehicle DR exists but unused in DamageEngine

2. **No DR legality rules**
   - Highest source selection: Not enforced
   - Lightsaber bypass: No logic
   - Stacking prevention: No validation

3. **Divided by actor type**
   - Characters: No DR support
   - Vehicles: Has field, not applied
   - Droids: Unclear

---

### 4️⃣ TEMP HP — COMPLIANT

**Location**: `scripts/actors/base/swse-actor-base.js:105-152`

**Status**: ✅ CORRECT ORDER

```
1. Bonus HP consumed first (line 115-119)
2. Temp HP consumed second (line 122-126)
3. Real HP taken last (line 129-132)
4. ActorEngine mutation (line 138-143)
```

**Compliance**:
- ✅ Correct mitigation order
- ✅ Uses ActorEngine for mutation
- ✅ Pure calculation before mutation
- ✅ No inline subtraction

---

### 5️⃣ DAMAGE RESOLUTION ENGINE — COMPLIANT (BUT INCOMPLETE)

**Location**: `scripts/engines/combat/damage-resolution-engine.js`

**Status**: ✅ Pure calculation, no mutation, correct pipeline

**Pipeline**:
```
1. Collect Bonus HP (ModifierEngine)
2. Subtract damage: Bonus HP → Real HP
3. Check Damage Threshold
4. Calculate Condition Track impact
5. Return result (no mutation)
```

**Issue**: **No SR/DR mitigation step**
- Should be: Bonus HP → SR → DR → Temp HP → Real HP
- Currently: Bonus HP → Real HP (skips SR/DR entirely)

---

### 6️⃣ MUTATION INTEGRITY — COMPLIANT

**Authority**: `scripts/governance/actor-engine/actor-engine.js`

**Status**: ✅ Enforced centralized control

- ✅ ActorEngine required for all actor mutations
- ✅ MutationInterceptor validates context
- ✅ All damage tools route through ActorEngine
- ✅ Transaction metadata support for guards

**Exception**: DarkSidePowers computes but doesn't apply (line 237, 313, 1237)

---

### 7️⃣ DUPLICATION — CONSOLIDATION TARGETS

| Target | Files | Issue |
|--------|-------|-------|
| **Shield Activation** | `item-sheet.js` + `add-current-sr.js` | Two paths for SR state |
| **Energy Shield Identification** | `categorize-shields.js` + name regex | Fragile string matching |
| **Shield Rating Calculation** | No centralized SR; split across item/tool | Derived missing |
| **Damage Application** | `DamageEngine` + `DarkSidePowers` + `talent-effect-engine.js` | Multiple paths |

---

## 🛡 LOCKED DAMAGE ORDER — VIOLATIONS SUMMARY

**Required Order**:
```
1️⃣ Roll damage (RollCore)
2️⃣ Apply SR
3️⃣ Apply DR
4️⃣ Apply Temp HP
5️⃣ Apply remaining damage to HP
6️⃣ Apply threshold / condition logic
7️⃣ Commit mutation via ActorEngine
```

**Current Implementation**:
```
✅ 1️⃣ Roll damage (implemented in scripts/combat/rolls/damage.js)
❌ 2️⃣ Apply SR (MISSING)
❌ 3️⃣ Apply DR (MISSING)
❌ 4️⃣ Apply Temp HP (in wrong actor — bonus consumed first!)
❌ 5️⃣ Apply HP (correct in actor-base.js)
⚠️ 6️⃣ Threshold (separate pipeline, not integrated)
✅ 7️⃣ Commit mutation (via ActorEngine)
```

**Critical**: SR must reduce damage BEFORE DT check. Currently, DT uses full damage, bypassing SR entirely.

---

## 📊 VIOLATION CATALOG

### 🔴 CRITICAL VIOLATIONS

| ID | Issue | File | Line | Fix Effort |
|----|-------|------|------|-----------|
| V1 | Direct HP subtraction (3x) | DarkSidePowers.js | 237,313,1237 | Medium |
| V2 | SR not derived at actor level | item-data-models.js | 177-178 | High |
| V3 | SR never applied in damage | damage-resolution-engine.js | — | High |
| V4 | DR exists but never applied | vehicle-calculations.js | — | Medium |
| V5 | Damage order not enforced | multiple | — | High |

### ⚠️ ARCHITECTURAL ISSUES

| ID | Issue | Files | Impact |
|----|-------|-------|--------|
| A1 | SR state at item level, not derived | item-sheet.js, add-current-sr.js | Cannot query total SR from actor |
| A2 | Tool-driven schema migration | categorize-shields.js, tools/ | Fragile; no single source of truth |
| A3 | Duplication across damage paths | DamageEngine, DarkSidePowers, TalentEffectEngine | Inconsistent behavior |
| A4 | Temp HP order wrong (bonus first) | swse-actor-base.js | Contradicts locked order |

---

## 🏛 COMPLIANCE MATRIX

| Component | Status | Notes |
|-----------|--------|-------|
| DamageResolutionEngine | ✅ Compliant | Pure, no mutation |
| ActorEngine Mutations | ✅ Compliant | Centralized control |
| Temp HP | ✅ Mostly Compliant | Order wrong (bonus first) |
| SR/DR | ❌ Non-Compliant | Not integrated |
| DarkSidePowers | ❌ Non-Compliant | Direct mutations |
| Energy Shields | ⚠️ Partially Compliant | Item-level, not derived |
| Threshold Engine | ✅ Compliant | Pure, independent |

---

## 🚨 RECOMMENDED FIXES (PHASE 2 IMPLEMENTATION)

### Fix #1: Create DamageMitigationManager (Pure)
- Orchestrates: SR → DR → Temp HP → HP in strict order
- Returns structured result, no mutation
- Called BEFORE ActorEngine

### Fix #2: Refactor SR to Actor-Derived
- `system.derived.shield = { current, max, source }`
- Computed at prepareDerivedData time
- Energy Shields register SR via ModifierEngine

### Fix #3: Implement DR Resolver
- Extract DR from actor/vehicle
- Apply highest source (no stacking)
- Enforce lightsaber bypass

### Fix #4: Fix Damage Application Order
- Bonus HP first
- SR second
- DR third
- Temp HP fourth
- Real HP fifth

### Fix #5: Fix DarkSidePowers
- Use DamageEngine or new DamageMitigationManager
- Remove all inline HP subtraction
- Route through ActorEngine

### Fix #6: Add CI Governance Rules
- Block `damage -=` in commits
- Block direct `system.hp` writes outside ActorEngine
- Block new damage implementations outside DamageMitigationManager

---

## 📈 METRICS

| Metric | Value |
|--------|-------|
| Files reviewed | 75+ |
| Illegal damage mutations found | 3 |
| SR-related tool scripts | 3 |
| DR-related functions unused | 1 |
| Consolidated damage paths needed | 1 |
| Energy Shield item type missing | 1 |
| Shield Recovery action validation needed | 1 |

---

## ✅ NEXT STEPS

1. **Approve audit findings** ← YOU ARE HERE
2. Implement DamageMitigationManager (subsystem)
3. Refactor SR to derived layer
4. Implement DR resolver
5. Fix DarkSidePowers violations
6. Validate Shield Recovery action wiring
7. Add CI governance rules
8. Run full integration tests
9. Commit & push to branch

---

## 🔐 SIGN-OFF

**Audit Status**: COMPLETE
**Violations Found**: 5 CRITICAL + 4 ARCHITECTURAL
**Recommendation**: PROCEED TO PHASE 2 IMPLEMENTATION
**Next Review**: After DamageMitigationManager integration

---

*Audit conducted per V2 Governance Framework — Section 3: Combat Systems Integrity*
