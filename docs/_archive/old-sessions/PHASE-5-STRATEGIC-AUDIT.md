# PHASE 5 Strategic Audit: Runtime Execution Architecture

**Date:** 2026-02-19
**Status:** Investigation Complete | Decision Point Reached

---

## Executive Summary

**Question:** Can AbilityEngine replace the procedural talent/power execution layer (DarkSidePowers.js + mechanics files)?

**Answer:** **NO** — AbilityEngine is query-only. A new runtime execution layer is required.

**But:** The architecture reveals a critical consolidation opportunity.

---

## Part 1: AbilityEngine Capability Audit

### What AbilityEngine Does
- **Query layer:** Reads abilities, talents, force powers from items
- **Normalization:** Converts raw item data into structured ability objects
- **Filtering:** Selects subsets (talents, force powers, actions by type, etc.)
- **Tagging:** Canonical tagging system for semantic classification

### What AbilityEngine Does NOT Do
- ❌ Runtime execution
- ❌ Resource spending (Force Points, Destiny Points)
- ❌ Damage/healing application
- ❌ Condition shifts
- ❌ ActiveEffect creation
- ❌ Chat message generation
- ❌ Multi-target coordination
- ❌ Conditional effect resolution

### Evidence
**File:** `scripts/engine/abilities/AbilityEngine.js` (472 lines)
- All methods are pure, synchronous, non-mutating
- Comment on line 3: "Phase 2: forceModifier support + selectors (NO resolution logic)"
- Methods: getAbilitiesForActor(), getActions(), getForceModifiers(), getShipManeuvers()
- Zero mutation calls

**AbilityEngine is purely a data query and normalization layer.**

---

## Part 2: Force Power & Talent Schema Audit

### Current Talent Item Schema
**Example: Channel Aggression**
```json
{
  "name": "Channel Aggression",
  "type": "talent",
  "system": {
    "talent_tree": "Dark Side Devotee",
    "benefit": "Deal extra damage equal to 1d6 per class level (maximum 10d6)",
    "description": "...",
    "class": "Force Adept",
    "tree": "Dark Side Devotee"
  },
  "effects": [],
  "flags": {}
}
```

### What's Missing from Schema
❌ Cost/resource requirements
❌ Targeting rules (single/multi-target)
❌ Damage formula (currently `min(level, 10)d6` is hardcoded)
❌ Effect application rules
❌ Condition triggers
❌ On-hit effects
❌ Damage types
❌ Falloff rules

### Current Runtime Logic Location
**Procedural:** `scripts/talents/dark-side-devotee-mechanics.js`
```javascript
static async triggerChannelAggression(actor, targetToken, characterLevel, spendFP = true) {
  // Line 38: const damageDice = Math.min(characterLevel, 10);
  // Line 51-53: await actor.update({ 'system.forcePoints.value': ... })
  // Line 64-65: await targetToken.actor.update({ 'system.hp.value': ... })
  // ...
}
```

**Result:** Talent execution is 100% procedural. No declarative schema. No reusable rules.

---

## Part 3: Scope of Procedural Execution

### All Talent Mechanics Files
| File | Runtime Methods | Lines | Entry Point |
|------|-----------------|-------|-------------|
| DarkSidePowers.js | 14 | 2254 | Macros |
| dark-side-devotee-mechanics.js | 3 | 599 | Macros |
| light-side-talent-mechanics.js | 11 | 1479 | Macros |
| scout-talent-mechanics.js | 16 | 1479 | Macros |
| soldier-talent-mechanics.js | 6 | 799 | Macros |
| scoundrel-talent-mechanics.js | 6 | 626 | Macros |
| noble-talent-mechanics.js | 4 | 636 | Macros |
| prestige-talent-mechanics.js | 0 | 631 | N/A |
| dark-side-talent-mechanics.js | 4 | 372 | Macros |
| squad-actions-mechanics.js | 0 | 105 | N/A |
| **TOTAL** | **~65+ methods** | **~9000 lines** | **Direct macro calls** |

### Execution Pattern (All Files)
```
User Macro
  ↓
Mechanics.triggerX(actor, target, params)
  ↓ (pure computation)
Calculate damage/effect
  ↓ (scattered mutations)
actor.update() #1
actor.update() #2
actor.createEmbeddedDocuments()
targetActor.update()
createChatMessage()
  ↓
Return { success, result }
```

### Key Characteristics
- ✅ Well-structured (static methods, clear APIs)
- ✅ Includes validation (checks resources, talent existence)
- ✅ Has some separation (computation before mutations)
- ❌ Purely procedural (no reusable rules)
- ❌ Scattered mutations (not coordinated)
- ❌ Duplicated patterns (Math.min, Math.max, etc. repeated)
- ❌ Inline calculations (30+ Math expressions in DarkSidePowers alone)

---

## Part 4: Architectural Overlap Analysis

### What Each System Does

#### AbilityEngine
- **Purpose:** Data query and normalization
- **Responsibility:** "What abilities does this actor have?"
- **Scope:** Talents, feats, force powers, actions, ship maneuvers
- **Mutability:** None (pure, sync, read-only)
- **Governance:** N/A

#### TalentEffectEngine (NEW - Phase 5A)
- **Purpose:** Effect computation and planning
- **Responsibility:** "What mutations should this effect apply?"
- **Scope:** Channel Aggression, Channel Anger, Dark Healing, etc.
- **Mutability:** None (pure, returns plan)
- **Governance:** N/A

#### ActorEngine (PHASE 3)
- **Purpose:** Mutation authority and governance
- **Responsibility:** "Execute mutations with Sentinel oversight"
- **Scope:** All actor field updates, embedded document operations
- **Mutability:** Full (coordinated mutations)
- **Governance:** Sentinel (MutationIntegrityLayer)

#### DarkSidePowers.js + Mechanics (PROCEDURAL)
- **Purpose:** ??? (Not clearly defined)
- **Responsibility:** ??? (Mix of everything)
- **Scope:** Dark side talent runtime execution
- **Mutability:** Uncontrolled (direct actor.update() calls)
- **Governance:** None

---

## Part 5: The Real Problem

You have FIVE competing execution/coordination layers:

```
AbilityEngine (query)
  ↓
DarkSidePowers.js (procedural execution)
  ↓
ActorEngine (mutation authority)  ← PHASE 3
  ↓
Sentinel (governance)  ← PHASE 3

ModifierEngine (bonus stacking)  ← PHASE 4
```

**This is NOT a clean architecture.**

The issue:
- **AbilityEngine:** Knows what talents exist (query layer)
- **DarkSidePowers:** Decides what to mutate (execution layer)
- **ActorEngine:** Routes mutations (authority layer)
- **Sentinel:** Validates mutations (governance layer)

**They should be consolidated into ONE coherent path:**

```
Declarative Schema (force power items with rules)
  ↓
AbilityEngine (query + normalize)
  ↓
RuntimeExecutor (compute effect plan)  ← NEW
  ↓
ActorEngine (apply mutations)  ← PHASE 3
  ↓
Sentinel (validate)  ← PHASE 3
```

---

## Part 6: Why DarkSidePowers Exists

**Historical context:**
- DarkSidePowers.js was written as a **standalone procedural system**
- It predates ActorEngine and Sentinel governance
- It has no knowledge of the mutation authority system
- It calls `actor.update()` directly (not through ActorEngine)

**Result:** It's now an orphaned execution layer that bypasses governance.

---

## Part 7: Migration Options

### Option A: Delete DarkSidePowers, Fully Migrate to AbilityEngine-driven Execution
**Feasibility:** ❌ **BLOCKED** — AbilityEngine has NO execution capability.
- Would require completely rebuilding AbilityEngine
- Would mix query and execution concerns
- Bad separation of concerns

### Option B: Expand AbilityEngine to Support Runtime Effects (Not Recommended)
**Feasibility:** ⚠️ **POSSIBLE BUT WRONG** — Mixes concerns.
- AbilityEngine should stay query-only
- Runtime execution is a different responsibility
- Would create God Object pattern

### Option C: Retain DarkSidePowers, Route All Mutations Through ActorEngine (Phase 5A Approach)
**Feasibility:** ✅ **VIABLE** — What we just did with TalentEffectEngine
- TalentEffectEngine (computation) → ActorEngine (mutations) → Sentinel (governance)
- Maintains separation: Query | Compute | Execute | Govern
- Phase 5A is already implementing this pattern
- Scale across all 65+ talent methods

**Recommended: THIS PATH**

### Option D: Create New RuntimeExecutor Layer, Eventually Deprecate DarkSidePowers
**Feasibility:** ✅ **OPTIMAL** — Planned migration path
- **Phase 5A-5B:** Build TalentEffectEngine patterns for all talents
- **Phase 5C:** Audit which DarkSidePowers functions are replaceable
- **Phase 4 / Future:** If ModifierEngine can handle dynamic damage, migrate there
- **Ultimate:** DarkSidePowers.js deprecated, all execution through unified pattern

**This is what we're doing.**

---

## Part 8: Decision Matrix

| Criteria | Migrate to AbilityEngine | Route through ActorEngine | New Layer |
|----------|--------------------------|--------------------------|-----------|
| Preserves query/exec separation | ❌ | ✅ | ✅ |
| Maintains governance | ❌ | ✅ | ✅ |
| Minimal refactoring | ❌ | ✅ | ✅ |
| Scalable to all 65+ talents | ❌ | ✅ | ✅ |
| Works with Phase 4 (ModifierEngine) | ❌ | ✅ | ✅ |
| Allows future migration | ❌ | ✅ | ✅ |

---

## Part 9: Architectural Recommendation

### Recommendation: **Option C + Path to D**

**Phase 5A-5B (NOW):**
- ✅ Use TalentEffectEngine pattern for all procedural talents
- ✅ Route ALL mutations through ActorEngine.applyTalentEffect()
- ✅ DarkSidePowers.js refactored to use TalentEffectEngine
- ✅ All 65+ talent methods follow unified pattern

**Benefits:**
1. Single mutation authority (ActorEngine)
2. Full Sentinel governance
3. Clean separation (compute | execute | govern)
4. No "orphaned" execution layers
5. Ready for Phase 4 (ModifierEngine integration)

**Phase 5C-5D (Later):**
- Evaluate which talents could use declarative rules
- Build minimal schema extensions if needed
- Plan ultimate deprecation of procedural code

**Does NOT require:**
- Changing AbilityEngine (stays query-only)
- Creating declarative schema (yet)
- Rewriting force power system
- Changing talent item structure

---

## Part 10: What We Should NOT Do

❌ **Do NOT** expand AbilityEngine to execute effects
❌ **Do NOT** create parallel execution layers
❌ **Do NOT** route talents through ModifierEngine yet (Phase 4 is later)
❌ **Do NOT** force declarative schema prematurely
❌ **Do NOT** refactor DarkSidePowers without coordinating mutations

---

## Part 11: Status of Phase 5A

**Already Implemented:**
- ✅ TalentEffectEngine (computation layer)
- ✅ ActorEngine.applyTalentEffect() (execution layer)
- ✅ Channel Aggression refactored (proof of concept)
- ✅ Test suite ready
- ⏳ Awaiting Sentinel validation logs

**This IS the right path.**

---

## Part 12: What Changed After Audit

**Before (Scattered):**
```javascript
// Direct mutations, no coordination
await actor.update({FP...});
await target.update({HP...});
```

**After (Phase 5A Pattern):**
```javascript
// Compute → Execute → Govern
const plan = TalentEffectEngine.buildChannelAggressionPlan({...});
const result = ActorEngine.applyTalentEffect(plan);
```

**Advantage:**
- Computation is testable
- Execution is coordinated
- Mutations are governed
- Pattern scales to all 65+ talents

---

## Conclusion

**AbilityEngine cannot replace DarkSidePowers** because:
1. It's a query layer, not an execution layer
2. Mixing these concerns would violate separation
3. ActorEngine already provides the correct execution path

**The solution is NOT to expand AbilityEngine, but to:**
1. ✅ Use TalentEffectEngine for computation (Phase 5A - DONE)
2. ✅ Use ActorEngine for execution (Phase 5A - DONE)
3. ⏳ Scale pattern to all 65+ talents (Phase 5B - NEXT)
4. ⏳ Audit Phase 4 integration (Phase 5C-5D - FUTURE)

**We are on the correct architectural path.**

No parallel systems. Single mutation authority. Full governance.

---

## Appendix: All Files in Scope

**Query Layer:**
- ✅ scripts/engine/abilities/AbilityEngine.js (correct role)

**Procedural Execution (to be refactored):**
- 🔄 scripts/talents/DarkSidePowers.js (2254 lines, 14 methods)
- 🔄 scripts/talents/dark-side-devotee-mechanics.js (599 lines, 3 methods)
- 🔄 scripts/talents/light-side-talent-mechanics.js (1479 lines, 11 methods)
- 🔄 scripts/talents/scout-talent-mechanics.js (1479 lines, 16 methods)
- 🔄 scripts/talents/soldier-talent-mechanics.js (799 lines, 6 methods)
- 🔄 scripts/talents/scoundrel-talent-mechanics.js (626 lines, 6 methods)
- 🔄 scripts/talents/noble-talent-mechanics.js (636 lines, 4 methods)
- 🔄 scripts/talents/dark-side-talent-mechanics.js (372 lines, 4 methods)

**Governance Layer:**
- ✅ scripts/core/mutation/Sentinel.js (correct role)
- ✅ scripts/core/mutation/MutationIntegrityLayer.js (correct role)

**Execution Authority:**
- ✅ scripts/actors/engine/actor-engine.js (correct role)
- ✅ scripts/actors/engine/actor-engine.js::applyTalentEffect() (NEW)

**Computation Layer:**
- ✅ scripts/talents/talent-effect-engine.js (NEW, correct role)

---

**Next Action:** Run Phase5ATests, validate Sentinel logs, proceed with Phase 5B scaling.
