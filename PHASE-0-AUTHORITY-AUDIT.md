# 🔍 PHASE 0: ENGINE AUTHORITY AUDIT REPORT

**Date**: 2026-02-25
**Scope**: Complete engine landscape and progression system architecture
**Objective**: Identify authorities, overlaps, dependencies, and consolidation targets before refactor

---

## 📊 EXECUTIVE SUMMARY

| Finding | Count | Status |
|---------|-------|--------|
| Total engine-like files | 76+ | Audit complete |
| Progression system files | ~40 | Fragmented |
| Legacy V1 files (to delete) | 4 | ~1,946 lines |
| XP authority conflicts | 2 systems | Critical duplication |
| ActorEngine usage | ✅ Active | Good |
| DerivedCalculator usage | ✅ Active | Good |
| Parallel feature engines | 8+ | Need consolidation |
| Proxy re-exports | 3+ | Confusing |

---

## 1️⃣ ENGINE INVENTORY & AUTHORITY MAP

### **TIER 1: SOVEREIGN ENGINES** ✅
These engines have clear, distinct authority and should be preserved.

| Engine | Location | Authority | Status | Lines |
|--------|----------|-----------|--------|-------|
| **ActorEngine** | `/scripts/governance/actor-engine/` | SOLE actor mutation authority | ✅ KEEP | ~200 |
| **DerivedCalculator** | `/scripts/actors/derived/derived-calculator.js` | Derived stats computation | ✅ KEEP | ~150 |
| **XPSystem** | `/scripts/engine/shared/xp-system.js` | XP math & level determination | ✅ KEEP | ~75 |
| **CombatEngine** | `/scripts/engines/combat/` | Combat resolution (damage, etc) | ✅ KEEP | Multiple |
| **RollEngine** | `/scripts/engine/roll-engine.js` | Dice roll mechanics | ✅ KEEP | ~100 |
| **EncumbranceEngine** | `/scripts/engine/encumbrance/` | Weight/carry mechanics | ✅ KEEP | ~150 |

---

### **TIER 2: PROGRESSION ORCHESTRATION** ⚠️
These files form the progression system but are fragmented and need consolidation.

#### **2A: Legacy Architecture (DELETE)**
```
/scripts/engines/progression/
  ├─ ProgressionSession.js           [863 lines] - LEGACY V1, unused
  ├─ ProgressionCompiler.js           [511 lines] - LEGACY V1, unused
  ├─ ProgressionEngineV2.js           [419 lines] - LEGACY V1, parallel variant
  └─ RuleEngine.js                    [153 lines] - LEGACY V1, rule application
```

**Verdict**: **DELETE ENTIRELY**. These are from old architecture, replaced by progression-engine-instance.js.

---

#### **2B: Current Orchestration (CONSOLIDATE)**
```
/scripts/engines/progression/engine/
  ├─ progression-engine.js            [366 lines] - Backward compat layer
  ├─ progression-engine-instance.js   [353 lines] - ACTIVE instance-based engine
  ├─ progression-actor-updater.js     [~100 lines] - Actor mutation wrapper
  ├─ progression-patch.js             [~50 lines]  - Patch builder
  └─ apply-progression-patch.js       [~50 lines]  - Patch applicator
```

**Current Flow**:
```
ProgressionEngine (backward compat)
  → SWSEProgressionEngine (instance-based)
    → ActorProgressionUpdater.finalize()
    → Apply patches via direct actor.update()
```

**Problem**: ProgressionEngine patches are applied DIRECTLY (not via ActorEngine).

**Action**: Route all mutations through ActorEngine.

---

#### **2C: Feature Handlers (CONSOLIDATE)**
```
/scripts/engines/progression/engine/
  ├─ feature-dispatcher.js            [273 lines] - Routes feature types to handlers
  ├─ feat-engine.js                   [???]      - Feat grant/selection logic
  ├─ force-power-engine.js            [~100]     - Force power granting
  ├─ force-secret-engine.js           [~100]     - Force secret granting
  ├─ force-technique-engine.js        [~100]     - Force technique granting
  ├─ language-engine.js               [285 lines] - Language granting
  └─ equipment-engine.js              [294 lines] - Equipment granting
```

**Current Status**: Handlers directly mutate actor via item creation.

**Problem**: Should be pure, delegating to registries + ActorEngine.

**Action**: Convert to pure feature resolvers, let ActorEngine handle item creation.

---

### **TIER 3: DATA & UTILITY SYSTEMS**
```
/scripts/engines/progression/
  ├─ data/progression-data.js         [283 lines] - Class features registry
  ├─ prerequisites/                   [???]      - Prerequisite validation
  ├─ feats/                           [???]      - Feat system
  ├─ force/                           [???]      - Force system
  ├─ talents/                         [???]      - Talent system
  ├─ skills/                          [???]      - Skill system
  ├─ utils/                           [???]      - Utilities
  └─ integration/                     [???]      - Post-progression finalization
```

---

## 2️⃣ DUPLICATION MAP

### **CRITICAL OVERLAP: XP Authority**

| Concern | Current Owner(s) | Lines | Problem |
|---------|-----------------|-------|---------|
| **Level from XP** | xp-engine.js (xp-system re-export) + xp-system.js | 100+ | ✅ Re-export only, OK |
| **XP thresholds** | xp-constants.js + xp-system.js | 50+ | ⚠️ DUPLICATE |
| **CL to XP** | xp-constants.js + xp-system.js | 30+ | ⚠️ DUPLICATE |
| **Encounter XP** | xp-engine.js | 50+ | ⚠️ Check if in xp-system |

**Resolution**: Delete xp-constants.js entirely. Consolidate all XP math into xp-system.js.

---

### **CRITICAL OVERLAP: Actor Mutation**

| Concern | Current Owner | Problem |
|---------|----------------|---------|
| Actor.update() calls | ActorEngine + ProgressionEngine directly | ⚠️ DUAL AUTHORITY |
| Item creation | Feature handlers + ActorEngine | ⚠️ NEEDS DELEGATION |
| System mutations | ActorProgressionUpdater | ⚠️ NEEDS DELEGATION |
| Derived recalc | DerivedCalculator + ActorEngine | ✅ OK (ActorEngine orchestrates) |

**Resolution**: ALL actor writes go through ActorEngine.updateActor(), no exceptions.

---

### **CRITICAL OVERLAP: Feature Math**

| Feature Type | Current Handler | Problem |
|--------------|-----------------|---------|
| Feats | feat-engine.js | ⚠️ Calculates bonuses? Should registry only |
| Force powers | force-power-engine.js | ⚠️ Calculates bonuses? Should registry only |
| Force secrets | force-secret-engine.js | ⚠️ Calculates bonuses? Should registry only |
| Talents | (in progression engine) | ⚠️ Scattered |
| Languages | language-engine.js | ⚠️ Scattered |
| Equipment | equipment-engine.js | ⚠️ Scattered |

**Resolution**: All feature logic becomes pure data lookup. Math (bonuses, modifiers) → AbilityEngine.

---

## 3️⃣ HIDDEN DEPENDENCIES

### **What does ProgressionEngine currently call?**

```javascript
ProgressionEngine.applyChargenStep()
  → SWSEProgressionEngine.doAction()
    → ForcePowerEngine (force power triggering)
    → ActorProgressionUpdater.finalize()
      → DIRECTLY mutates actor via actor.update() ❌ SHOULD GO THROUGH ActorEngine
    → feature-dispatcher.js
      → Various *-engine.js files
        → DIRECTLY create items on actor ❌ SHOULD DELEGATE
```

---

### **What currently calls ProgressionEngine?**

```
chargen-main.js
  → ProgressionEngine.applyChargenStep()

levelup-main.js
  → ProgressionEngine.applyLevelUp()

manual-step-processor.js
  → ProgressionEngine.*
```

---

### **What currently calls ActorEngine?**

```
swse-actor-base.js
  → ActorEngine.updateActor() ✅ Correct

base-actor.js
  → ActorEngine.updateActor() ✅ Correct

chargen UI
  → ActorEngine.updateActor() ✅ Correct

ProgressionEngine
  → DIRECTLY actor.update() ❌ WRONG

Feature handlers
  → DIRECTLY actor.createEmbeddedDocuments() ❌ WRONG
```

---

## 4️⃣ AUTHORITY BOUNDARIES (CURRENT vs CORRECT)

### **ActorEngine Authority**

| Responsibility | Current | Should Be |
|---|---|---|
| Direct actor.update() | ✅ Yes | ✅ ONLY ONE |
| Item creation | ❌ Feature handlers | ✅ ActorEngine only |
| Item deletion | ❌ Unclear | ✅ ActorEngine only |
| Derived recalc | ✅ Yes | ✅ Yes |
| Validation | ❌ No | ⚠️ Consider |

**Missing**: ActorEngine.createItem(), ActorEngine.deleteItem()

---

### **ProgressionEngine Authority (SHOULD BE)**

| Responsibility | Current | Should Be |
|---|---|---|
| Compute level delta | ✅ Yes | ✅ Yes |
| Request grants | ✅ Yes | ✅ Yes |
| Validate selections | ✅ Partial | ✅ Full |
| Build patch | ✅ Yes (messy) | ✅ Atomic only |
| Call ActorEngine | ❌ NO | ✅ ONLY WAY |
| Direct actor.update() | ✅ YES | ❌ NEVER |
| Create items | ✅ YES (via handlers) | ❌ NEVER (delegate to ActorEngine) |

---

### **DerivedCalculator Authority**

| Responsibility | Current | Correct? |
|---|---|---|
| Compute modifiers | ✅ Yes | ✅ Yes |
| Store in system.derived | ✅ Yes | ✅ Yes |
| Called by ActorEngine | ✅ Yes | ✅ Yes |

**Status**: ✅ Sovereign

---

### **XPSystem Authority**

| Responsibility | Current | Correct? |
|---|---|---|
| Level thresholds | ✅ xp-system.js | ✅ Yes |
| determineLevelFromXP | ✅ xp-system.js (re-exported by xp-engine) | ✅ Yes |
| CL to XP | ❓ xp-constants.js OR xp-system.js? | ❌ DUPLICATE |
| Encounter XP | ❓ xp-engine.js | ⚠️ Check |

**Status**: ⚠️ Mostly good, needs xp-constants.js deletion

---

## 5️⃣ DELEGATION MODEL

### **What ProgressionEngine SHOULD call**

**Phase: Preparation**
```javascript
const currentLevel = XPSystem.determineLevelFromXP(actor.system.xp);
const targetLevel = actor.system.level;
```

**Phase: Compute Grants**
```javascript
const grants = ClassRegistry.getGrantsForLevel(classId, targetLevel);
const autogrants = AutoGrantResolver.resolve(grants, actor);
```

**Phase: Feature Resolution**
```javascript
const featuresResolved = FeatureResolver.resolveAllFeatures(grants, actor);
// Returns pure data: { feats: [...], talents: [...], etc }
// NO mutations, NO side effects
```

**Phase: Selection Validation**
```javascript
ValidationEngine.validateSelections(userSelections, actor, availableOptions);
```

**Phase: Patch Building**
```javascript
const patch = PatchBuilder.buildAtomicPatch(
  autogrants,
  userSelections,
  featuresResolved,
  actor
);
// Patch is pure data object: { system: {...}, items: [...], flags: {...} }
```

**Phase: Application**
```javascript
await ActorEngine.updateActor(actor, patch);
// ActorEngine ONLY authority for mutations
```

---

## 6️⃣ CURRENT VS CORRECT ARCHITECTURE

### **CURRENT (FRAGMENTED)**
```
ProgressionEngine
  ├─ SWSEProgressionEngine.doAction()
  │   ├─ FeatEngine.apply() ← Direct mutation
  │   ├─ ForceEngine.apply() ← Direct mutation
  │   ├─ LanguageEngine.apply() ← Direct mutation
  │   └─ ActorProgressionUpdater.finalize() ← Direct actor.update()
  └─ ProgressionSession/Compiler (LEGACY, unused)
```

### **CORRECT (SOVEREIGN)**
```
ProgressionEngine
  ├─ Determine levels
  ├─ Request ClassRegistry grants
  ├─ Call FeatureResolver (pure)
  ├─ Call ValidationEngine
  ├─ Call PatchBuilder (pure)
  └─ ActorEngine.updateActor(patch) ← ONLY mutation path
```

---

## 7️⃣ REGISTRY ASSESSMENT

### **What registries exist?**

```
/scripts/registries/
  ├─ background-registry.js
  ├─ class-registry.js (?)
  ├─ feat-registry.js (?)
  ├─ force-registry.js (?)
  └─ ... (needs scan)
```

**Action Required**: Full registry audit needed for Phase 1.

---

## 8️⃣ FILES TO DELETE (V1 LEGACY)

```
/scripts/engines/progression/
  ├─ ProgressionSession.js           [863 lines]
  ├─ ProgressionCompiler.js          [511 lines]
  ├─ ProgressionEngineV2.js          [419 lines]
  ├─ RuleEngine.js                   [153 lines]
  ├─ xp-constants.js                 [~50 lines]
  └─ xp-engine.js                    [~50 lines, but only as re-export wrapper]
```

**Total**: ~2,000 lines of dead code.

---

## 9️⃣ FILES TO CONSOLIDATE

### **Progression Orchestration**
```
KEEP:       progression-engine-instance.js (rename to progression-engine.js)
DELETE:     progression-engine.js (legacy compat layer - route imports to instance)
CONSOLIDATE: progression-actor-updater.js into PatchBuilder
CONSOLIDATE: apply-progression-patch.js into ActorEngine
```

### **Feature Handlers**
```
CONVERT TO PURE RESOLVERS:
  - feat-engine.js                      → FeatResolver
  - force-power-engine.js               → ForceResolver
  - force-secret-engine.js              → ForceSecretResolver
  - force-technique-engine.js           → ForceTechniqueResolver
  - language-engine.js                  → LanguageResolver
  - equipment-engine.js                 → EquipmentResolver
  - starship-maneuver-engine.js         → StarshipManeuverResolver
  - talents/talent-engine.js            → TalentResolver
```

**Result**: All become pure data lookup + delegation to FeatureResolver.

---

## 🔟 MUTATION AUTHORITY ENFORCEMENT

### **Who can call actor.update()?**

**CURRENT**: Anyone (ActorEngine, ProgressionEngine, Feature handlers, etc.)

**SHOULD BE**: ONLY ActorEngine.updateActor()

### **Who can create items?**

**CURRENT**: Feature handlers directly call actor.createEmbeddedDocuments()

**SHOULD BE**: ActorEngine.createItem() only

### **Required new ActorEngine methods**

```javascript
ActorEngine.createItem(actor, itemData)
ActorEngine.deleteItem(actor, itemId)
ActorEngine.createItems(actor, itemDataArray)
ActorEngine.deleteItems(actor, itemIdArray)
```

---

## 1️⃣1️⃣ AUTHORITY MATRIX (FINAL MAPPED STATE)

| Concern | Sovereign Authority | Current State | Drift | Action |
|---------|-------------------|---|---|---|
| XP math | XPSystem (shared/xp-system.js) | xp-engine.js (wrapper) + xp-constants | Minor | Delete xp-constants, route imports to xp-system |
| Level determination | XPSystem | ✅ xp-system.js | None | ✅ Keep |
| Level-up orchestration | ProgressionEngine | ✅ progression-engine-instance.js | Some | Refactor to use ActorEngine for all mutations |
| Class grants | ClassRegistry | ? | Unknown | Audit registries |
| Feature data | Registries (feat, force, etc) | Scattered | High | Consolidate to pure registries |
| Feature math | AbilityEngine | ❌ Scattered in handlers | High | Move to AbilityEngine |
| Actor mutation | ActorEngine | ❌ Multiple callers | CRITICAL | PHASE 1: Lock down |
| Item creation | ActorEngine | Feature handlers do it | CRITICAL | PHASE 1: New methods |
| Derived stats | DerivedCalculator | ✅ Correct | None | ✅ Keep |
| Validation | ValidationEngine | Scattered | High | Consolidate to single authority |

---

## 1️⃣2️⃣ RECOMMENDED CONSOLIDATION SEQUENCE

### **Phase 1: Mutation Lock**
- Add ActorEngine.createItem(), deleteItem() methods
- Route ALL actor.update() calls through ActorEngine (add tracing)
- Make direct mutations impossible (throw error)

### **Phase 2: Feature Resolver**
- Create FeatureResolver as pure data lookup
- Convert all *-engine.js to pure registries
- Test feature grants work through resolver

### **Phase 3: ProgressionEngine Refactor**
- Refactor ProgressionEngine to call FeatureResolver
- Build atomic patches only
- Use ActorEngine for ALL mutations

### **Phase 4: Legacy Deletion**
- Delete ProgressionSession, ProgressionCompiler, ProgressionEngineV2, RuleEngine
- Delete xp-constants.js
- Delete xp-engine.js or make it a pure re-export

### **Phase 5: Validation Consolidation**
- Move all validation logic to single authority
- Validate before patch building

### **Phase 6: Registry Audit**
- Full scan of all feature registries
- Ensure they are pure data
- No external dependencies

### **Phase 7: Documentation**
- Write PROGRESSION_ARCHITECTURE.md
- Define all sovereignty guarantees
- Create enforcement rules

---

## 📋 BLOCKERS & UNKNOWNS

| Item | Impact | Status |
|------|--------|--------|
| How many tests depend on old ProgressionEngine? | High | Need scan |
| Do feature handlers have side effects? | Critical | Need analysis |
| Are *-engine.js files calculating bonuses? | Critical | Need analysis |
| Where is ValidationEngine? | High | Need to locate |
| Full registry structure? | High | Need to audit |
| Are there direct actor writes in hooks? | Critical | Need scan |

---

## ✅ READINESS FOR PHASE 1

**Status**: 🟨 **YELLOW** — Audit complete, but need to answer blockers.

**Before proceeding to Phase 1 (XP Authority Collapse)**:
1. ☐ Scan for all actor.update() calls
2. ☐ Identify all feature handler side effects
3. ☐ List all test dependencies
4. ☐ Audit all registries
5. ☐ Create ValidationEngine or locate existing

---

## 📌 KEY FINDINGS

1. **ActorEngine is already sovereign** ✅ — But not fully utilized
2. **XPSystem is almost there** ✅ — Just needs xp-constants.js deletion
3. **ProgressionEngine is fragmented** ⚠️ — Needs major refactor
4. **Feature handlers directly mutate** 🔴 — Critical, must delegate
5. **Legacy V1 is still present** 🔴 — ~2,000 lines of dead code
6. **No central FeatureResolver** 🔴 — Feature logic is scattered
7. **No single ValidationEngine** 🔴 — Validation is scattered
8. **Mutation authority is loose** 🔴 — Multiple callers can write actors

---

## 🎯 NEXT STEPS

**Option A**: Proceed with Phase 1 (XP Authority) immediately
**Option B**: Answer blockers first, then Phase 1
**Option C**: Deep dive into one subsystem (e.g., registries) first

**Recommendation**: Answer blockers (scan for actor writes, feature side effects, test dependencies) before Phase 1.

---

**Report Generated**: 2026-02-25
**Audit Scope**: Complete engine landscape
**Status**: Ready for Phase 1 with blockers resolved
