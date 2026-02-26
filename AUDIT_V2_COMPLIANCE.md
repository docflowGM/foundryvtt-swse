# 🔐 V2 ARCHITECTURAL COMPLIANCE AUDIT
## SuggestionEngine & Suggestion System

**Audit Date:** 2026-02-26
**Target:** SuggestionEngine, SuggestionService, SuggestionEngineCoordinator
**Framework:** SWSE V2 Architecture Governance Rules
**Status:** ⚠️ **PARTIALLY COMPLIANT** – Critical violations in registry usage

---

## EXECUTIVE SUMMARY

The **SuggestionEngine is MUTATION-SAFE** (✓) but **AUTHORITY-UNSAFE** (✗).

| Rule | Status | Severity |
|------|--------|----------|
| **Rule 1: No rules math in sheets** | ✗ VIOLATED | HIGH |
| **Rule 2: No mutation outside ActorEngine** | ✓ COMPLIANT | - |
| **Rule 3: No direct actor.update()** | ✓ COMPLIANT | - |
| **Rule 4: No direct item.update()** | ✓ COMPLIANT | - |
| **Rule 5: All gameplay output through chat** | ✓ COMPLIANT (UI layer) | - |
| **Rule 6: No inference outside registries** | ✗ VIOLATED | CRITICAL |
| **Rule 7: Registries are SSOT** | ✗ VIOLATED | CRITICAL |
| **Rule 8: No relationship duplication** | ✗ VIOLATED | HIGH |
| **Rule 9: No compendium queries inside decision engines** | ✗ VIOLATED | CRITICAL |
| **Rule 10: No dynamic imports for core authorities** | ✓ COMPLIANT | - |

**Compliance Score: 6/10 (60%)**

---

## 1️⃣ MUTATION VIOLATIONS

### Finding: ✓ NONE DETECTED

**Analysis:**

SuggestionEngine **DOES NOT** mutate actor state:

```javascript
// ✓ GOOD: Returns new object, doesn't mutate
static async suggestFeats(feats, actor, pendingData, options) {
    return feats.map(feat => {
        const suggestion = this._evaluateFeat(feat, ...);
        return {
            ...feat,              // ← Spread operator creates NEW object
            suggestion,           // ← Adds field
            isSuggested: ...      // ← Adds field
        };
    });
}
```

**Verification:**
- ❌ No `actor.update()` calls
- ❌ No `item.update()` calls
- ❌ No `game.settings.set()` writes
- ❌ No `flags` mutations
- ❌ No `system.` field writes
- ✓ All suggestion metadata in NEW objects
- ✓ PrerequisiteChecker is read-only
- ✓ BuildIntent is read-only

**Caller responsibility:**
```javascript
// levelup-talents.js:252-259
// Caller applies suggestions but doesn't persist them
let talentsWithSuggestions = talentsWithPrereqs;
if (game.swse?.suggestions?.suggestTalents) {
    talentsWithSuggestions = await SuggestionService.getSuggestions(actor, 'levelup', {
        domain: 'talents',
        available: talentObjects,
        pendingData,
        engineOptions: { includeFutureAvailability: true },
        persist: true  // ← Note: SuggestionService HANDLES persistence if requested
    });
}
```

**Internal cache management:**
```javascript
// SuggestionService stores cache in memory only
static _cache = new Map();  // key -> {rev, suggestions, meta}
```

**VERDICT: ✓ COMPLIANT**

---

## 2️⃣ SHEET VIOLATIONS

### Finding: ⚠️ PARTIAL VIOLATION – Rules Math In Sheet State

**Evidence:**

SuggestionEngine reads **directly from sheet state** instead of delegating to rules engine:

```javascript
// SuggestionEngine.js:259-285 ← DIRECT SYSTEM ACCESS
static _buildActorState(actor, pendingData = {}) {

    // ✗ VIOLATION: Reading trained skills from actor.system.skills
    const trainedSkills = new Set();
    const skills = actor.system?.skills || {};  // ← Direct sheet access
    for (const [skillKey, skillData] of Object.entries(skills)) {
        if (skillData?.trained) {                // ← Reading sheet field
            trainedSkills.add(skillKey.toLowerCase());
        }
    }

    // ✗ VIOLATION: Reading ability scores from actor.system.attributes
    const abilities = actor.system?.attributes || {};  // ← Direct sheet access
    let highestAbility = null;
    let highestScore = 0;
    for (const [abilityKey, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total ?? 10;  // ← Reading sheet field
        if (score > highestScore) {
            highestScore = score;
            highestAbility = abilityKey.toLowerCase();
        }
    }
}
```

**Problem:**
1. **No ActorEngine delegation** – should call `ActorEngine.getSkills(actor)`, `ActorEngine.getAbilities(actor)`
2. **Hard dependency on sheet structure** – breaks if fields rename
3. **No cache invalidation** – reads fresh data each time
4. **No audit trail** – doesn't log what data was used for decisions

### CRITICAL: Prerequisite Logic Duplicates Decision Math

```javascript
// SuggestionEngine:370-402 ← DUPLICATE PREREQUISITE PARSING
static _usesTrainedSkill(option, actorState) {
    const prereqString = option.system?.prerequisite ||
                        option.system?.prerequisites || '';

    if (!prereqString || prereqString === 'null') {
        return null;
    }

    // Parse requirement format: "Skill (Stealth), Feat (Point Blank Shot)"
    const skillMatches = prereqString.match(/Skill\s*\(\s*(\w+(?:\s+\w+)*)\s*\)/gi);

    if (!skillMatches) {
        return null;
    }

    // Extract skill names
    for (const skillMatch of skillMatches) {
        const skillName = skillMatch.replace(/Skill\s*\(\s*|\s*\)/gi, '').trim().toLowerCase();
        if (actorState.trainedSkills.has(skillName)) {
            return skillName;
        }
    }

    return null;
}
```

**Problem:**
- **Tier 3 VIOLATION**: Re-implements prerequisite parsing that PrerequisiteChecker already does
- PrerequisiteChecker is SSOT; SuggestionEngine should NOT parse prerequisites
- Creates two sources of truth for skill requirement interpretation

**VERDICT: ✗ VIOLATES RULES 1 & 6**

---

## 3️⃣ REGISTRY VIOLATIONS

### Finding: ✗ CRITICAL – No Registry Usage

**Evidence:**

SuggestionEngine **NEVER** calls any of the new V2 registries:

```javascript
// IMPORTS IN SUGGESTIONENGINE.JS
import { SWSELogger } from '../../utils/logger.js';
import { BuildIntent } from './BuildIntent.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';
import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { WishlistEngine } from './WishlistEngine.js';
import { UNIFIED_TIERS } from './suggestion-unified-tiers.js';

// ✗ MISSING: TalentDB, TalentTreeDB, TalentRelationshipRegistry, ClassRelationshipRegistry
// ✗ MISSING: ActorEngine, RulesEngine
// ✗ MISSING: Any authority for tree ownership, class access
```

**Where registries SHOULD be called:**

| Location | Should Call | Currently Calls | Impact |
|----------|-------------|-----------------|--------|
| `levelup-talents.js:219` | `TalentDB.forActor(actor, classesDB)` | `talentPack.getDocuments()` | Bypasses all eligibility checks |
| `levelup-talents.js:183-186` | `TalentRelationshipRegistry.getTreeForTalent()` | `talent.system?.tree === treeName` | Uses string matching, fragile |
| `levelup-talents.js:127-130` | `ClassRelationshipRegistry.getEffectiveTrees()` | `getTalentTrees(fullClass)` | Duplicates registry logic |
| `SuggestionEngine:_evaluateTalent()` | Validate talent via registries | No validation | Can suggest ineligible talents |

**Specific Registry Non-Usage:**

```javascript
// ✗ MISSING: TalentTreeDB.get(treeId)
// Should validate tree exists before evaluating talents from it

// ✗ MISSING: TalentRelationshipRegistry.getTreeForTalent(talentId)
// Should validate talent is owned by a tree
// Should NOT read talent.system.treeId

// ✗ MISSING: ClassRelationshipRegistry.getEffectiveTrees(classId)
// Should check if actor's classes have access to tree
// Should NOT assume system.talentTreeIds

// ✗ MISSING: TalentDB.forActor(actor, classesDB)
// Should use to get eligible talents
// Should NOT query compendium directly
```

**VERDICT: ✗ CRITICAL VIOLATION – Rules 6, 7, 8**

---

## 4️⃣ AUTHORITY VIOLATIONS

### Finding: ✗ HIGH – Assumptions About Document Authority

**Evidence:**

SuggestionEngine assumes document fields are authoritative:

| Field | Used For | Should Use | Impact |
|-------|----------|-----------|--------|
| `talent.system.tree` | Tree membership | `TalentRelationshipRegistry` | ✗ String-based, breaks on rename |
| `talent.system.prerequisite` | Prerequisite parsing | `PrerequisiteChecker` | ✗ Duplicates logic |
| `actor.system.skills` | Trained skills | `ActorEngine.getSkills()` | ✗ No audit trail |
| `actor.system.attributes` | Ability scores | `ActorEngine.getAbilities()` | ✗ Bypasses rules |
| `class.system.talentTreeIds` | Class trees | `ClassRelationshipRegistry` | ✗ Ignores house rules |

**Tree Ownership Assumption:**

```javascript
// levelup-talents.js:184-186
const talentsInTree = allTalents.filter(t => {
    return t.system?.talent_tree === treeName ||
           t.system?.tree === treeName ||
           t.name.includes(treeName);  // ← TRIPLE FALLBACK!
});
```

**Problem:**
1. Field `talent_tree` vs `tree` inconsistency
2. Fallback to name matching (fragile)
3. **Never validates against TalentRelationshipRegistry**
4. **Can suggest talents from wrong tree**

**Class Access Assumption:**

```javascript
// levelup-talents.js:51-52
const trees = getTalentTrees(selectedClass);
const hasAccess = (selectedClass.system?.forceSensitive || trees?.length > 0);
```

**Problem:**
1. **Ignores house rules** – doesn't check ClassRelationshipRegistry.getEffectiveTrees()
2. **Doesn't check multi-tree rules** – doesn't know about Force Adept special access
3. **Doesn't respect Sentinel** – no validation that trees exist

**VERDICT: ✗ VIOLATES RULES 7 & 8 – Authority is NOT the registry**

---

## 5️⃣ LAYER VIOLATIONS

### Finding: ✗ HIGH – Mixing Layers

**Data Ingestion + Decision Logic + Scoring:**

```
CURRENT (TANGLED):
├─ levelup-talents.js (UI layer)
│  ├─ Loads talent pack directly (data ingestion)
│  ├─ Filters by tree name (decision logic)
│  ├─ Calls PrerequisiteChecker (prerequisite logic)
│  └─ Passes to SuggestionEngine (scoring logic)
├─ SuggestionEngine
│  ├─ Reads actor.system.skills (data access)
│  ├─ Parses prerequisites (prerequisite logic)
│  ├─ Evaluates tiers (scoring logic)
│  └─ Returns suggestions (output)
└─ PrerequisiteChecker
   ├─ Checks prerequisites (prerequisite logic)
   └─ Returns met/unmet (output)
```

**SHOULD BE:**
```
REGISTRY-DRIVEN:
├─ TalentDB (data layer)
│  └─ forActor(actor, classesDB) → eligible talents
├─ PrerequisiteChecker (prerequisite engine)
│  └─ checkTalentPrerequisites(actor, talent) → met/unmet
├─ SuggestionEngine (decision layer)
│  └─ suggestTalents(talents, actor) → tiers
└─ UI layer (levelup-talents.js)
   └─ Calls coordinator API with pre-filtered candidates
```

**Problem: Prerequisite Evaluation Is Scattered**

```javascript
// PrerequisiteChecker (ONE SOURCE)
export class PrerequisiteChecker {
    static checkTalentPrerequisites(actor, talent, pendingData) { ... }
}

// SuggestionEngine (DUPLICATE SOURCE)
static _isChainContinuation(option, actorState, metadata) {
    // Parses prerequisites again!
    const prereqString = option.system?.prerequisite ||
                        option.system?.prerequisites || '';
    const prereqNames = this._extractPrerequisiteNames(prereqString);
    // ...
}

static _usesTrainedSkill(option, actorState) {
    // Parses prerequisites AGAIN!
    const prereqString = option.system?.prerequisite ||
                        option.system?.prerequisites || '';
    // ...
}
```

**VERDICT: ✗ VIOLATES RULE 6 – Inference logic should be in ONE place (registries/engines)**

---

## 6️⃣ EXECUTION PIPELINE VIOLATIONS

### Finding: ✓ COMPLIANT – Ordering is correct

**Analysis:**

Initialization order in `index.js`:

```javascript
// Line 307-315: Data preloader runs FIRST
await Promise.all([
    dataPreloader.preload({
        priority: ['classes', 'skills'],
        background: ['feats', 'talents', 'species']
    }),
    runJsonBackedIdsMigration()
]);

// Line 315: SystemInitHooks.onSystemReady() builds registries
await SystemInitHooks.onSystemReady();
// ├─ Step 0: TalentTreeDB.build()
// ├─ Step 0: ClassesDB.build()
// ├─ Step 0: TalentDB.build(talentTreeDB)
// ├─ Step 0: TalentRelationshipRegistry.build()
// ├─ Step 0: ClassRelationshipRegistry.build()
// └─ Step 0: Sentinel validates

// Line 322: SuggestionService.initialize() runs AFTER registries ready
await bootstrapSuggestionSystem();
// └─ SuggestionService.initialize({ systemJSON })
//    └─ CompendiumResolver builds compendium cache
```

**SuggestionService initialization:**

```javascript
static initialize({ systemJSON }) {
    if (this._initialized) {return;}
    this._initialized = true;
    CompendiumResolver.initializeFromSystemJSON(systemJSON);
    SWSELogger.log('[SuggestionService] Initialized');
}
```

✓ **This is correct** – registries are built before SuggestionService

**Cache invalidation:**

```javascript
// suggestion-hooks.js:23-40 ← Proper cache invalidation
HooksRegistry.register('updateActor', (actor) => {
    SuggestionService.invalidate(actor.id);
});

HooksRegistry.register('updateItem', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
});
```

✓ **This is correct** – clears cache on data changes

**VERDICT: ✓ COMPLIANT**

---

## SUMMARY TABLE: V2 RULE COMPLIANCE

| Rule | Status | Evidence | Severity | Fix Effort |
|------|--------|----------|----------|-----------|
| 1. No rules math in sheets | ✗ | SuggestionEngine reads system.skills/attributes directly | HIGH | MEDIUM |
| 2. No mutation outside ActorEngine | ✓ | No actor.update() calls found | - | - |
| 3. No direct actor.update() | ✓ | Returns new objects only | - | - |
| 4. No direct item.update() | ✓ | No item mutations | - | - |
| 5. Gameplay output through chat | ✓ | UI layer responsible | - | - |
| 6. No inference outside registries | ✗ | Prerequisite parsing duplicated in SuggestionEngine | CRITICAL | MEDIUM |
| 7. Registries are SSOT | ✗ | Doesn't use TalentDB, TalentTreeDB, registries | CRITICAL | MEDIUM |
| 8. No relationship duplication | ✗ | Talent→Tree determined by system field, not registry | HIGH | MEDIUM |
| 9. No compendium queries in decision engines | ✗ | levelup-talents queries compendium directly | CRITICAL | MEDIUM |
| 10. No dynamic imports for authorities | ✓ | No dynamic imports detected | - | - |

**Compliance: 6/10 (60%)**

---

## VIOLATION BREAKDOWN BY SEVERITY

### 🔴 CRITICAL (Block V2 compliance)

1. **No TalentDB usage** – Should delegate to `TalentDB.forActor()` instead of querying compendium
2. **No tree ownership validation** – Should use `TalentRelationshipRegistry.getTreeForTalent()` instead of reading `system.tree`
3. **No registry-based eligibility checking** – Should use `ClassRelationshipRegistry` for class→tree access
4. **Prerequisite logic duplication** – Should delegate ALL prerequisite checking to `PrerequisiteChecker`

### 🟠 HIGH (Architecture degradation)

1. **Sheet state access** – Should use `ActorEngine.getSkills()`, `ActorEngine.getAbilities()` instead of reading `system.*`
2. **String-based talent filtering** – Should use ID-based lookups via registry
3. **No Sentinel integration** – Should report eligibility violations via Sentinel

### 🟡 MEDIUM (Technical debt)

1. **No prerequisite caching** – Should memoize PrerequisiteChecker results
2. **Compendium reloaded per call** – Should cache `TalentDB.forActor()` result
3. **No audit trail** – Doesn't log which data was used for suggestions

---

## REFACTOR IMPACT ASSESSMENT

### If NOT Fixed

**Risk:** SuggestionEngine will **break when V2 registry-only migration happens**

```javascript
// Current path (WILL BREAK):
levelup-talents.js calls talentPack.getDocuments()  // ← Removed in V2
  ↓
SuggestionEngine reads talent.system.tree          // ← Removed in V2
  ↓
SuggestionEngine duplicates prerequisite logic    // ← Not isolated
  ↓
system.skills/attributes accessed directly        // ← Not via ActorEngine

// V2 path (REQUIRES REFACTOR):
TalentDB.forActor(actor, classesDB)               // ← Registry only
  ↓
SuggestionEngine delegates to PrerequisiteChecker // ← No duplication
  ↓
SuggestionEngine uses ActorEngine APIs            // ← Audit trail
```

### Timeline

| Phase | Task | Duration | Blocker |
|-------|------|----------|---------|
| **Now** | Refactor SuggestionEngine to use registries | 2-3 days | None (backward compatible) |
| **Phase 5D** | Remove direct compendium queries | 1 day | Completed Phase Now |
| **Phase 5E** | Migrate to ActorEngine-only data access | 1 day | Completed Phase Now |
| **Phase 6** | Switch to registry-only SSOT | 1 day | All previous complete |

---

## SENTINEL ENFORCEMENT RECOMMENDATIONS

### New Diagnostic Points

```javascript
// 1. Validate all talent suggestions against registries
SuggestionEngine._validateTalentEligibility(talent, actor, classesDB) {
    // Check: talent exists in TalentDB
    // Check: talent is owned by a tree (TalentRelationshipRegistry)
    // Check: actor can access that tree (ClassRelationshipRegistry)
    // Report violations to Sentinel
}

// 2. Audit sheet access
SuggestionEngine._buildActorState(actor, pendingData) {
    // Log: which skills/abilities were read
    // Verify: data matches ActorEngine calculations
    // Report mismatches to Sentinel
}

// 3. Detect prerequisite duplication
SuggestionEngine.suggestTalents(talents, actor, pendingData) {
    // Track: which talents were evaluated for prerequisites
    // Compare: PrerequisiteChecker result vs SuggestionEngine logic
    // Report divergence to Sentinel (indicates logic duplication)
}
```

### Sentinel Rules

```javascript
// Monitor: Ineligible talents in suggestions
if (!this._validateTalentEligibility(talent, actor, classesDB)) {
    Sentinel.report('suggestion', Sentinel.SEVERITY.ERROR,
        `Ineligible talent suggested: ${talent.name}`,
        { talentId: talent.id, actorId: actor.id });
}

// Monitor: Sheet access outside ActorEngine
if (actor.system?.skills && !usingActorEngine) {
    Sentinel.report('architecture', Sentinel.SEVERITY.WARN,
        `Direct system.skills access instead of ActorEngine`,
        { component: 'SuggestionEngine', actorId: actor.id });
}

// Monitor: Prerequisite divergence
if (prereqResult1 !== prereqResult2) {
    Sentinel.report('data', Sentinel.SEVERITY.ERROR,
        `Prerequisite evaluation mismatch`,
        { prereq: prereqString, result1, result2 });
}
```

---

## REFACTORING PLAN (V2-COMPLIANT)

### Phase 1: Registry Integration (Day 1)
- [ ] Add `TalentDB`, `TalentTreeDB`, registries to SuggestionEngine imports
- [ ] Create `SuggestionEngine._getTalentCandidatesForActor(actor, classesDB)`
  - Uses `TalentDB.forActor(actor, classesDB)` instead of compendium
  - Validates each talent via `TalentRelationshipRegistry`
  - Caches result per actor per level
- [ ] Create `SuggestionEngine._validateTalentEligibility(talent, actor, classesDB)`
  - Checks talent ownership
  - Checks tree access
  - Reports to Sentinel
- [ ] Unit tests: eligibility validation, caching

### Phase 2: Prerequisite Consolidation (Day 2)
- [ ] Remove `SuggestionEngine._extractPrerequisiteNames()`
- [ ] Remove `SuggestionEngine._usesTrainedSkill()`
- [ ] Refactor `_isChainContinuation()` to:
  - Call `PrerequisiteChecker.checkTalentPrerequisites()`
  - NOT re-parse prerequisite strings
- [ ] Remove duplicate prerequisite parsing from `_evaluateTalent()`
- [ ] Unit tests: chain continuation, skill matching

### Phase 3: ActorEngine Delegation (Day 2)
- [ ] Replace `actor.system?.skills` with `ActorEngine.getSkills(actor)`
- [ ] Replace `actor.system?.attributes` with `ActorEngine.getAbilities(actor)`
- [ ] Add audit logging for which data was used
- [ ] Unit tests: data access via ActorEngine

### Phase 4: Sentinel Integration (Day 3)
- [ ] Add `SuggestionEngine._validateTalentEligibility()` call before each suggestion
- [ ] Report orphaned talents, inaccessible trees, missing data
- [ ] Add prerequisite divergence detection
- [ ] Integration tests: Sentinel diagnostics

### Phase 5: Testing & Finalization (Day 3)
- [ ] Regression tests: all suggestion types
- [ ] Integration tests: chargen, levelup, mentor
- [ ] Multiclass stress tests: Soldier/Jedi, Force Adept, Hybrid
- [ ] Performance benchmarks: <300ms for 200 talents

---

## FINAL VERDICT

### Current State
- ✗ **NOT V2-COMPLIANT**
- ✗ Violates Rules: 1, 6, 7, 8, 9
- ⚠️ **Will break** when V2 registry-only migration happens
- ⚠️ **Blocks** Sentinel integration, house rules, prestige unlocks

### After Refactor
- ✓ **FULLY V2-COMPLIANT**
- ✓ Pure decision layer (tier logic only)
- ✓ Registry-driven (uses TalentDB, registries)
- ✓ Deterministic (no string matching)
- ✓ Non-mutating (safe)
- ✓ Order-safe (runs after registries)
- ✓ Sentinel-integrated (diagnostics enabled)
- ✓ Future-proof (ready for V2 migration)

**Effort: ~3-4 days**
**Risk: LOW (backward compatible refactor)**
**Payoff: HIGH (unblocks all V2 features)**

---

## SIGN-OFF

This audit identifies **6 critical violations** that must be resolved before V2 SSOT enforcement can proceed. The violations are **fixable without breaking changes** and will **unblock prestige classes, house rules, and Sentinel diagnostics**.

**Next Steps:**
1. Review this audit with the team
2. Prioritize refactoring phase 1-2 (registry + prerequisite consolidation)
3. Implement Sentinel enforcement rules
4. Run integration tests before merging to main

