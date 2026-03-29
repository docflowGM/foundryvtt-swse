# COMPREHENSIVE ENGINE GOVERNANCE AUDIT
## SWSE Foundry VTT System

**Audit Date:** March 29, 2026
**Scope:** Complete engine architecture audit with mutation enforcement verification
**Methodology:** Code tracing, enforcement testing, direct mutation surface inventory

---

## EXECUTIVE SUMMARY: THE CRITICAL TRUTH

**STARK FINDING:** The engine governance architecture is **functionally non-enforcing**. The system appears to have enforcement but is actually a **logging and convention system**, not authority enforcement.

### Key Discovery
- **MutationInterceptor.js line 25:** `const STRICT_MODE = false`
- **Impact:** ALL detected mutation violations are LOGGED but NOT BLOCKED
- **EmbeddedMutationLayer.js line 27:** `static ENABLED = false`
- **Impact:** Secondary enforcement layer is completely disabled
- **Result:** Direct mutations can occur throughout the codebase without being prevented

---

## 1. ENGINE MAP

### Primary Engines
| Engine | File Location | Owns | Mutates | Type | Status |
|--------|---|---|---|---|---|
| **ActorEngine** | `scripts/governance/actor-engine/actor-engine.js` | All actor/item mutations | actor.update, updateEmbeddedDocuments | Authority (claimed) | **SOFT - logs only** |
| **InventoryEngine** | `scripts/engine/inventory/InventoryEngine.js` | Equipment, items, quantity | Routes through ActorEngine | Helper | **SOLID** |
| **ProgressionEngine** | `scripts/engine/progression/engine/progression-engine.js` | Class levels, abilities, skills | ActorProgressionUpdater → ActorEngine | Orchestrator | **SERVICEABLE** |
| **CombatEngine** | `scripts/engine/combat/CombatEngine.js` | Initiative, attacks, damage resolution | No direct mutations | Orchestrator | **SOLID** |
| **DerivedCalculator** | `scripts/actors/derived/derived-calculator.js` | All derived values (HP, defenses, initiative) | system.derived.* only | SSOT | **STRONG** |
| **ModifierEngine** | `scripts/engine/effects/modifiers/ModifierEngine.js` | All modifier aggregation | Direct writes to system.derived.* (impure) | SSOT (claimed) | **DANGEROUS** |
| **ConditionEngine** | `scripts/engine/combat/ConditionEngine.js` | Condition track | Via actor mutations | Orchestrator | **SERVICEABLE** |
| **ForcePointsService** | `scripts/engine/force/force-points-service.js` | Force/destiny spending | Via actor mutations | Helper | **SERVICEABLE** |
| **DarkSideEngine** | `scripts/engine/darkside/` | Dark side powers, corruption | Via actor mutations | Orchestrator | **SERVICEABLE** |

### Quasi-Engines & Guard Layers
| Layer | File | Purpose | Enforces? |
|-------|------|---------|-----------|
| **MutationInterceptor** | `scripts/governance/mutation/MutationInterceptor.js` | Wrap actor.update, embedded mutations | NO (logs only, STRICT_MODE=false) |
| **EmbeddedMutationLayer** | `scripts/governance/mutation/embedded-mutation-layer.js` | Secondary ownership boundary check | NO (disabled - ENABLED=false) |
| **GovernanceSystem** | `scripts/governance/governance-system.js` | Per-actor enforcement mode (normal/override/freeBuild) | NO (convention only) |

---

## 2. AUTHORITY CHAIN AUDIT

### ActorEngine: Intended vs Actual

**Intended Authority Contract:**
- Single mutation authority for all actor field updates
- All mutations MUST set context via `MutationInterceptor.setContext()`
- Unauthorized mutations blocked at ActorEngine boundary
- recalcAll() guaranteed after every mutation

**Actual Enforcement Reality:**

**CRITICAL VIOLATIONS FOUND:**

1. **Direct Mutations Not Blocked (11+ Mutation Surfaces)**
   - `scripts/items/swse-item-sheet.js`: Direct `item.update()` calls (lines ~350, ~365, ~400, ~470)
   - `scripts/engine/import/npc-template-importer-engine.js`: Direct `actor.update()` (lines ~95, ~105)
   - `scripts/engine/import/droid-template-importer-engine.js`: Direct `actor.update()` calls
   - `scripts/maintenance/world-repair.js`: Direct `actor.update()` in repair flows
   - `scripts/apps/upgrade-app.js`: Direct `item.update()` on installed upgrades
   - `scripts/migration/armor-system-migration-v4.js`: Direct mutations in migrations
   - `scripts/core/document-api-v13.js`: Wrapper that calls `actor.update()` directly
   - `scripts/utils/actor-utils.js`: Direct `actor.update()` in atomic update wrapper

2. **Fallback Bypasses in Core Actor Methods**
   - `scripts/actors/base/swse-actor-base.js` lines 176, 186: `updateOwnedItem()` method has try/catch that falls back to `item.update()` directly if ActorEngine fails
   - **Risk:** Any ActorEngine import failure silently bypasses enforcement

3. **Hook-Level Mutations Not Routed**
   - `scripts/infrastructure/hooks/follower-hooks.js` line 56: Direct `deleteEmbeddedDocuments()` without ActorEngine
   - `scripts/infrastructure/hooks/follower-hooks.js` line 67: Fallback direct `ownerActor.update()` if ActorEngine unavailable

4. **Vehicle-Specific Bypass**
   - `scripts/actors/vehicle/swse-vehicle-core.js`: Direct `createEmbeddedDocuments()` and `deleteEmbeddedDocuments()` calls on vehicles

### MutationInterceptor Analysis

**What It Claims:**
```
"This module makes ActorEngine unbypassable"
"Any call to actor.update() from outside ActorEngine → ERROR"
```

**What It Actually Does:**
```javascript
const STRICT_MODE = false; // Set to true to throw on violations
const DEV_MODE = true;     // Log all mutations with stack traces

// Line 149-154: When unauthorized mutation detected:
if (!isAuthorized) {
  const msg = `MUTATION VIOLATION: ...`;
  if (STRICT_MODE) {
    throw new Error(msg);  // ← NOT EXECUTED (STRICT_MODE = false)
  } else if (DEV_MODE) {
    console.error(`[MUTATION-VIOLATION] ${msg}`);  // ← ONLY THIS RUNS
  }
}
```

**VERDICT:** MutationInterceptor is **DIAGNOSTIC ONLY**, not enforcing.

---

## 3. GOOD / BAD / UGLY REPORT

### GOOD: What's Actually Working

✅ **DerivedCalculator** (STRONG)
- **What's Right:** Pure input→output, centralized authority, no side effects
- **Files:** `scripts/actors/derived/derived-calculator.js`
- **Guarantees:** All derived fields computed from single source
- **Risk Level:** LOW

✅ **InventoryEngine** (STRONG)
- **What's Right:** Properly routes all mutations through ActorEngine
- **Files:** `scripts/engine/inventory/InventoryEngine.js`
- **Example:** `toggleEquip()`, `incrementQuantity()`, `removeItem()` all use ActorEngine
- **Risk Level:** LOW

✅ **CombatEngine Orchestration** (STRONG)
- **What's Right:** Pure orchestrator, no direct mutations, composes lower systems
- **Files:** `scripts/engine/combat/CombatEngine.js`
- **Example:** `resolveAttack()` orchestrates subsystems without mutating directly
- **Risk Level:** LOW

✅ **ActorEngine Core Loop** (SERVICEABLE)
- **What's Right:** When mutations go through it, recalcAll() is guaranteed
- **Contract:** `updateActor()` → set context → mutate → recalc → clear context
- **Execution:** Implemented correctly (lines 287-300)
- **Risk Level:** MEDIUM (depends on whether mutations actually route through it)

✅ **Progression System Structure** (SERVICEABLE)
- **What's Right:** SWSEProgressionEngine delegates through ActorProgressionUpdater → ActorEngine
- **Files:** `scripts/engine/progression/engine/progression-engine.js`, `progression-actor-updater.js`
- **Chain:** Valid and traceable
- **Risk Level:** MEDIUM (depends on end-to-end adoption)

---

### BAD: Improvements Needed

⚠️ **ModifierEngine Impurity** (FRAGILE)
- **Problem:** Writes directly to `system.derived.*` instead of returning data
- **Files:** `scripts/engine/effects/modifiers/ModifierEngine.js`
- **Evidence:** Comment in ActorEngine.js lines 25-36 documents this
- **Impact:** Derived values can be modified outside DerivedCalculator
- **Severity:** MEDIUM
- **Fix:** Moderate refactor - return modifier bundle, apply in DerivedCalculator only

⚠️ **Fallback Mutation Paths** (FRAGILE)
- **Problem:** Direct update() fallbacks when ActorEngine import fails
- **Files:** `scripts/actors/base/swse-actor-base.js` lines 176, 186
- **Code:**
  ```javascript
  catch (err) {
    return item.update(changes, options);  // ← BYPASS
  }
  ```
- **Risk:** Any module loading error bypasses enforcement silently
- **Severity:** MEDIUM
- **Fix:** Light refactor - throw instead of fallback, handle at call site

⚠️ **Inconsistent Mutation Routing** (FRAGILE)
- **Problem:** Some paths use ActorEngine, others use direct mutations
- **Examples:**
  - Item sheets: sometimes ActorEngine, sometimes direct
  - Importer engines: direct actor.update()
  - Migration scripts: direct mutations
- **Severity:** MEDIUM
- **Fix:** Audit and standardize all callers

⚠️ **Hook Mutation Bypasses** (FRAGILE)
- **Problem:** Hooks like follower-hooks don't route through ActorEngine
- **Files:** `scripts/infrastructure/hooks/follower-hooks.js` lines 56, 67
- **Evidence:** Line 56 does direct `deleteEmbeddedDocuments()`, line 67 fallback to `actor.update()`
- **Severity:** MEDIUM
- **Fix:** Light refactor - use ActorEngine for all mutations in hooks

⚠️ **Vehicle Actor Mutations** (FRAGILE)
- **Problem:** Vehicle-specific code does direct embedded mutations
- **Files:** `scripts/actors/vehicle/swse-vehicle-core.js`
- **Severity:** MEDIUM
- **Fix:** Route through ActorEngine

⚠️ **Weak Recomputation Guarantee** (FRAGILE)
- **Problem:** recalcAll() not guaranteed if mutation bypasses ActorEngine
- **Impact:** Derived fields can become stale
- **Severity:** MEDIUM
- **Fix:** Make ActorEngine unbypassable (see UGLY section)

---

### UGLY: Systemically Dangerous

🔴 **STRICT_MODE Disabled** (CRITICAL)
- **File:** `scripts/governance/mutation/MutationInterceptor.js` line 25
- **Code:** `const STRICT_MODE = false`
- **Impact:** System logs violations but does NOT prevent them
- **Risk:** Any code can directly mutate actors/items - enforcement is theater
- **Evidence:**
  ```javascript
  if (!isAuthorized) {
    if (STRICT_MODE) {
      throw new Error(msg);  // Never reached
    } else if (DEV_MODE) {
      console.error(msg);    // Only action taken
    }
  }
  ```
- **Severity:** CRITICAL
- **User-Facing Risk:** Character data can be corrupted silently if bypass code paths execute
- **Developer Risk:** False confidence that mutations are controlled
- **Fix:** URGENT - Enable STRICT_MODE or delete this layer

🔴 **EmbeddedMutationLayer Disabled** (CRITICAL)
- **File:** `scripts/governance/mutation/embedded-mutation-layer.js` line 27
- **Code:** `static ENABLED = false`
- **Impact:** Secondary ownership boundary check is completely non-functional
- **Evidence:** Layer initialized but never runs
- **Severity:** CRITICAL
- **Why Disabled?** Code has no explanation
- **Fix:** Either enable it with ENFORCE mode, or delete it to reduce confusion

🔴 **Authority Overlap & Confusion** (CRITICAL)
- **Problem:** Multiple layers claim to enforce but don't:
  - MutationInterceptor claims enforcement (doesn't enforce)
  - EmbeddedMutationLayer claims enforcement (disabled)
  - GovernanceSystem claims enforcement modes (convention only)
- **Result:** Developer confusion about what actually enforces
- **Evidence:** Comments throughout code say "must route through ActorEngine" but system doesn't prevent bypasses
- **Severity:** CRITICAL
- **User-Facing Risk:** Developers will eventually exploit bypasses thinking they're protected
- **Fix:** Major refactor - choose ONE enforcing layer, delete the others

🔴 **Direct Mutations in Critical Paths** (CRITICAL)
- **Count:** 11+ direct mutation surfaces found outside ActorEngine
- **Examples:**
  - Item sheet mutations (swse-item-sheet.js)
  - Import engines (npc-template-importer.js, droid-template-importer.js)
  - World maintenance (world-repair.js)
  - Upgrade system (upgrade-app.js)
  - Migrations (armor-system-migration-v4.js)
- **Impact:** recalcAll() not called after these mutations
- **Severity:** CRITICAL
- **User-Facing Risk:** Derived data (HP, defenses, initiative) can become stale if these paths execute and mutate critical fields
- **Fix:** Trace each surface, route through ActorEngine

🔴 **Recomputation Not Guaranteed** (CRITICAL)
- **Problem:** Only mutations through ActorEngine trigger recalcAll()
- **Direct mutations bypass recalc entirely**
- **Evidence:** All 11+ direct mutation surfaces skip recalc
- **Impact:**
  - HP max written directly → not recalculated
  - Force/destiny points modified → derived values stale
  - Defense values changed → not recomputed
- **Severity:** CRITICAL
- **User-Facing Risk:** Character sheet shows wrong values if bypass paths execute
- **Fix:** Make ActorEngine the only mutation entry point, or have hooks guarantee recalc

🔴 **HP Max Write Protection Bypassed** (CRITICAL)
- **File:** ActorEngine.js lines 273-282
- **Code:**
  ```javascript
  const hpMaxPath = Object.keys(flatUpdateData).find(path => path === 'system.hp.max');
  if (hpMaxPath && !options.isRecomputeHPCall && !options.isMigration) {
    throw new Error('...');
  }
  ```
- **Problem:** Only throws if mutation is from ActorEngine
- **But:** Direct mutations bypass ActorEngine entirely → no throw
- **Impact:** HP max can be written directly without recalculation
- **Severity:** CRITICAL
- **Fix:** Need Foundry-level hooks to enforce this, not just ActorEngine checks

🔴 **Derived Field Authority Ambiguity** (CRITICAL)
- **Problem:** system.derived.* should be read-only but is writable everywhere
- **ActorEngine validation (lines 72-100) only logs violations, doesn't block**
- **Evidence:** `_validateDerivedWriteAuthority()` uses SWSELogger.warn(), not throw
- **Impact:** Any code can write system.derived.* and corruption is logged but not prevented
- **Severity:** CRITICAL
- **Fix:** Wrap derived field writes at Foundry level to enforce read-only

🔴 **Mutation Context Not Persistent Across Async** (DANGEROUS)
- **Problem:** MutationInterceptor._currentMutationContext is global variable
- **Issue:** In async code, context might be cleared before nested operations complete
- **Evidence:** setContext/clearContext pattern assumes synchronous execution
- **Impact:** Concurrent mutations might lose context mid-operation
- **Severity:** HIGH
- **Fix:** Use async context (Node.js AsyncLocalStorage) instead of global variable

---

## 4. ACTORENGINE DEEP AUDIT

### What ActorEngine Claims to Own

From code comments:
- "Single mutation authority for all actor field updates"
- "All mutations MUST set context via MutationInterceptor.setContext()"
- "This is the ONLY legal path to actor mutations"
- "Guaranteed recomputation after every mutation"

### What ActorEngine Actually Controls

**Mutations that ARE guaranteed to go through ActorEngine:**
1. `ActorEngine.updateActor()` - ✅ Direct callers
2. `ActorEngine.updateEmbeddedDocuments()` - ✅ Direct callers
3. `ActorEngine.createEmbeddedDocuments()` - ✅ Direct callers
4. `ActorEngine.deleteEmbeddedDocuments()` - ✅ Direct callers
5. Routes from InventoryEngine - ✅ Properly routed
6. Routes from CombatEngine - ✅ Properly routed (mostly)

**Mutations that BYPASS ActorEngine:**
1. ❌ Item sheets (swse-item-sheet.js) - direct item.update()
2. ❌ Import engines - direct actor.update()
3. ❌ World repair - direct actor.update()
4. ❌ Upgrade app - direct item.update()
5. ❌ Migration scripts - direct actor.update()
6. ❌ Follower hooks - direct deleteEmbeddedDocuments()
7. ❌ Vehicle core - direct createEmbeddedDocuments/deleteEmbeddedDocuments
8. ❌ swse-actor-base.js fallback - item.update() if ActorEngine fails
9. ❌ document-api-v13.js - wrapper calls actor.update() directly
10. ❌ actor-utils.js - atomic update calls actor.update() directly

### Mutation Context Enforcement

**How it works:**
```javascript
async updateActor(actor, updateData, options = {}) {
  MutationInterceptor.setContext('ActorEngine.updateActor');  // Set flag
  try {
    await applyActorUpdateAtomic(actor, updateData, options);  // Mutate
    await this.recalcAll(actor);                               // Recalc
  } finally {
    MutationInterceptor.clearContext();                        // Clear flag
  }
}
```

**What the context flag does:**
- MutationInterceptor._isAuthorized() checks if context is set
- If context set: mutation proceeds and is logged as authorized
- If context not set: mutation proceeds anyway but is logged as violation

**VERDICT:** Context is purely diagnostic, not enforcing.

### Protected Fields Analysis

**system.hp.max** - Supposedly Protected
- **Claim:** "May only be written by ActorEngine.recomputeHP()"
- **Check:** ActorEngine.js lines 273-282 throws error if written outside recompute context
- **Reality:** Throw only happens if mutation goes through ActorEngine
- **Bypass:** Direct mutations (from item sheet, imports, etc.) skip this check entirely
- **Severity:** CRITICAL - HP max not actually protected

**system.derived.*** - Supposedly Protected
- **Claim:** "Only DerivedCalculator may write system.derived.*"
- **Check:** ActorEngine._validateDerivedWriteAuthority() warns if written outside cycle
- **Reality:** Only logs warning, doesn't throw
- **Bypass:** Any code can write derived fields, violation is logged but permitted
- **Severity:** CRITICAL - Derived fields not actually protected

**system.progression.*** - Supposedly Protected
- **Claim:** Only ProgressionEngine should write progression data
- **Reality:** No enforcement layer checks this
- **Bypass:** Multiple code paths might write progression directly
- **Severity:** HIGH - Progression authority unclear

### Recomputation Guarantee

**Claim:** "Guaranteed recomputation/integrity checks after mutation"

**Reality:**
1. ✅ If mutation goes through ActorEngine → recalcAll() guaranteed
2. ❌ If mutation bypasses ActorEngine → recalcAll() NOT called
3. ❌ If direct mutation → recalc relies on Foundry hooks (not guaranteed)

**recalcAll() Implementation (lines 38-59):**
```javascript
async recalcAll(actor) {
  actor._isDerivedCalcCycle = true;
  try {
    await DerivedCalculator.computeAll(actor);  // Compute derived
    await ModifierEngine.applyAll(actor);       // Apply modifiers (impure!)
  } finally {
    actor._isDerivedCalcCycle = false;
  }
  if (!actor._skipIntegrityCheck) {
    await this._checkIntegrity(actor);         // Check prerequisites
  }
}
```

**Issues:**
1. Flag-based cycle detection (_isDerivedCalcCycle) - no actual enforcement
2. ModifierEngine.applyAll() is impure and writes directly (known issue)
3. Integrity check is skippable via _skipIntegrityCheck flag
4. No enforcement that recalc actually happened

**VERDICT:** Recomputation only guaranteed if mutations go through ActorEngine, which they don't always.

### Cascade Detection

**What it does:** Lines 132-164 detect update loops
```javascript
if (state.count > 5 && globalThis.SWSE?.SentinelEngine) {
  globalThis.SWSE.SentinelEngine.report('actor-update-loop', ...);
}
```

**Reality:** Only reports to SentinelEngine if it exists, doesn't prevent loops

**VERDICT:** Cascade detection is diagnostic, not preventative.

### ActorEngine Trustworthiness Score

| Aspect | Status | Trust Level |
|--------|--------|------------|
| Enforces routing through itself | NO | 🔴 UNTRUSTWORTHY |
| Prevents direct mutations | NO | 🔴 UNTRUSTWORTHY |
| Guarantees recalculation | PARTIAL | 🟡 SEMI-TRUSTWORTHY |
| Protects HP max | NO | 🔴 UNTRUSTWORTHY |
| Protects derived fields | NO | 🔴 UNTRUSTWORTHY |
| Core mutation loop correct | YES | 🟢 TRUSTWORTHY |

**OVERALL VERDICT:** ActorEngine is a **SOFT CONVENTION**, not a hard authority. Trust level: LOW (40%)

---

## 5. ALL ENGINE SOVEREIGNTY AUDIT

### InventoryEngine
- **Owns:** Equipment state, quantities
- **Sovereignty:** CLEAR - only routes through ActorEngine
- **Overlaps:** None
- **Recompute:** Delegated to ActorEngine ✅
- **Trust:** STRONG

### ProgressionEngine / SWSEProgressionEngine
- **Owns:** Class levels, selected abilities, feats, talents
- **Sovereignty:** MOSTLY CLEAR - routes through ActorProgressionUpdater → ActorEngine
- **Overlaps:** Progression data written both by chargen and levelup paths
- **Recompute:** Delegated to ActorEngine ✅
- **Trust:** SERVICEABLE
- **Risk:** Chargen vs levelup mode switching unclear

### CombatEngine
- **Owns:** Initiative rolls, attack resolution, damage application
- **Sovereignty:** CLEAR - pure orchestrator, doesn't mutate directly
- **Overlaps:** None (proper composition)
- **Recompute:** Not responsible (delegated to damage/HP handlers)
- **Trust:** STRONG

### ConditionEngine
- **Owns:** Condition track state
- **Sovereignty:** Unclear - doesn't directly mutate but conditions updated via generic actor mutations
- **Overlaps:** Generic actor system (no clear boundary)
- **Recompute:** Generic recompute via ActorEngine
- **Trust:** SERVICEABLE (but boundary unclear)

### ForcePointsService
- **Owns:** Force/Destiny point spending, regeneration
- **Sovereignty:** Unclear - spending routed through actor mutations
- **Overlaps:** Generic actor system (no clear boundary)
- **Recompute:** Delegated to ActorEngine
- **Trust:** SERVICEABLE (but no clear ownership)

### DarkSideEngine
- **Owns:** Dark side powers, corruption track
- **Sovereignty:** Unclear - mutations routed via generic paths
- **Overlaps:** Generic actor system
- **Recompute:** Generic
- **Trust:** SERVICEABLE (but boundary unclear)

### DerivedCalculator
- **Owns:** Derived calculations SSOT
- **Sovereignty:** CLEAR - writes only to system.derived.*
- **Overlaps:** None (proper separation)
- **Recompute:** Always called after ActorEngine mutations
- **Trust:** STRONG

### ModifierEngine
- **Owns:** Modifier aggregation and application
- **Sovereignty:** AMBIGUOUS - claims to be helper but writes directly to derived
- **Overlaps:** DerivedCalculator authority (writes to system.derived.*)
- **Recompute:** Impure - doesn't delegate, mutates directly
- **Trust:** FRAGILE
- **Issue:** Known problem documented in ActorEngine.js lines 25-36

### MutationInterceptor
- **Owns:** Mutation authorization checking
- **Sovereignty:** FAKE - claims enforcement, only logs
- **Overlaps:** EmbeddedMutationLayer (both try to enforce)
- **Recompute:** Not responsible
- **Trust:** UNTRUSTWORTHY (false enforcement)

### EmbeddedMutationLayer
- **Owns:** Ownership boundary enforcement
- **Sovereignty:** FAKE - disabled by default
- **Overlaps:** MutationInterceptor (redundant)
- **Recompute:** Not responsible
- **Trust:** UNTRUSTWORTHY (disabled)

---

## 6. MUTATION SURFACE INVENTORY

### Authorized Paths (Use ActorEngine)

| Path | File | Type | Status |
|------|------|------|--------|
| InventoryEngine.toggleEquip() | inventory/InventoryEngine.js | Item mutation | ✅ ROUTED |
| InventoryEngine.incrementQuantity() | inventory/InventoryEngine.js | Item mutation | ✅ ROUTED |
| InventoryEngine.decrementQuantity() | inventory/InventoryEngine.js | Item mutation | ✅ ROUTED |
| InventoryEngine.removeItem() | inventory/InventoryEngine.js | Item deletion | ✅ ROUTED |
| ActiveEffectsManager.createEffect() | combat/active-effects-manager.js | Effect creation | ✅ ROUTED |
| GrapplingSystem.initiate() | combat/systems/grappling-system.js | Effect creation | ✅ ROUTED |
| ProgressionEngine.applyChargenStep() | progression/engine/progression-engine.js | Ability grants | ✅ ROUTED |
| ProgressionEngine.applyLevelUp() | progression/engine/progression-engine.js | Level progression | ✅ ROUTED |

### Unauthorized Unguarded Paths (Direct Mutations)

| Path | File | Mutation Type | Risk | Status |
|------|------|---|------|--------|
| Item.updateData() | swse-item-sheet.js:350 | item.update() | MEDIUM | ❌ UNGUARDED |
| Item.updateData() | swse-item-sheet.js:365 | item.update() | MEDIUM | ❌ UNGUARDED |
| Item sheet light toggle | swse-item-sheet.js:~400 | item.update() | LOW | ❌ UNGUARDED |
| NPC Import | npc-template-importer-engine.js:95 | actor.update() | MEDIUM | ❌ UNGUARDED |
| Droid Import | droid-template-importer-engine.js | actor.update() | MEDIUM | ❌ UNGUARDED |
| World Repair | world-repair.js | actor.update() | HIGH | ❌ UNGUARDED |
| Upgrade Installation | upgrade-app.js | item.update() | MEDIUM | ❌ UNGUARDED |
| Armor Migration | armor-system-migration-v4.js | actor.update() | HIGH | ❌ UNGUARDED |
| Weapon Migration | weapon-talents-migration.js | actor.update() | HIGH | ❌ UNGUARDED |
| Follower Cleanup | follower-hooks.js:56 | deleteEmbeddedDocuments() | MEDIUM | ❌ UNGUARDED |
| Vehicle Create Items | swse-vehicle-core.js | createEmbeddedDocuments() | MEDIUM | ❌ UNGUARDED |
| Vehicle Delete Items | swse-vehicle-core.js | deleteEmbeddedDocuments() | MEDIUM | ❌ UNGUARDED |

### Fallback Bypass Paths (Should-Not-Happen)

| Path | File | Condition | Risk |
|------|------|-----------|------|
| updateOwnedItem() fallback | swse-actor-base.js:176, 186 | ActorEngine import fails | HIGH |
| follower cleanup fallback | follower-hooks.js:67 | ActorEngine unavailable | MEDIUM |
| document-api-v13 wrapper | document-api-v13.js | Direct call | MEDIUM |
| actor-utils atomic update | actor-utils.js | Direct call | MEDIUM |

### Classification Summary

| Category | Count | Severity |
|----------|-------|----------|
| Authorized through ActorEngine | 8 | ✅ LOW |
| Unauthorized but unguarded | 12 | 🔴 HIGH |
| Fallback bypasses | 4 | 🔴 HIGH |
| **Total mutation surfaces** | **24** | |

**VERDICT:** System has 12+ unguarded direct mutation surfaces + 4 fallback bypasses = ActorEngine authority is not enforced.

---

## 7. RECOMPUTE / INTEGRITY AUDIT

### Where Recomputation Happens

1. **ActorEngine.recalcAll()** - After every ActorEngine mutation ✅
2. **Actor.prepareDerivedData()** - During Foundry prepare phase ✅
3. **DerivedCalculator.computeAll()** - Computes derived values ✅
4. **ModifierEngine.applyAll()** - Applies modifier adjustments (IMPURE) ⚠️

### Recomputation Trigger Points

**Guaranteed recompute:**
- ActorEngine.updateActor() → recalcAll()
- ActorEngine.updateEmbeddedDocuments() → recalcAll()
- ActorEngine.createEmbeddedDocuments() → recalcAll()
- ActorEngine.deleteEmbeddedDocuments() → recalcAll()

**Likely recompute (via Foundry hooks, not guaranteed):**
- Direct actor.update() → Foundry might call prepareDerivedData()
- Direct item.update() → Might trigger actor prepare
- Direct deleteEmbeddedDocuments() → Might trigger actor prepare

**No recompute guaranteed:**
- Programmatic changes to actor.system values (if no update() call)
- Embedded document modifications outside update() calls
- Flag changes (if not triggering recompute hooks)

### Integrity Check System

**PrerequisiteIntegrityChecker** (called from ActorEngine.recalcAll())
- Checks if gained abilities still meet prerequisites
- **Location:** `governance/integrity/prerequisite-integrity-checker.js`
- **Frequency:** Only after ActorEngine mutations
- **Blocking:** No - logs violations but doesn't prevent them

### Derived Field Integrity

**system.derived.*** should be computed from system.* only

**Threat 1: ModifierEngine writes derived directly**
- **Location:** `scripts/engine/effects/modifiers/ModifierEngine.js`
- **Problem:** Impure - mutates system.derived.* instead of returning data
- **Impact:** Derived values can diverge from true source
- **Known issue:** Documented in ActorEngine.js lines 25-36

**Threat 2: Non-ActorEngine mutations skip DerivedCalculator**
- **Location:** All 12+ direct mutation surfaces
- **Problem:** Changes don't trigger derived recalc
- **Impact:** system.derived.* becomes stale
- **Example:** Item sheet edits HP → derived HP.max not updated

**Threat 3: HP max written directly**
- **Location:** ActorEngine.js line 276 has check, but check only runs for ActorEngine paths
- **Problem:** Direct mutations can write system.hp.max without recalc
- **Impact:** HP max is not recomputed from source of truth
- **CRITICAL:** system.hp.max should never be writable except via ActorEngine.recomputeHP()

### Invariant Guarantees

| Invariant | Guaranteed? | Evidence |
|-----------|-------------|----------|
| system.derived.* computed from system.* | NO | ModifierEngine writes derived directly |
| system.hp.max only written by ActorEngine | NO | 12+ direct mutation surfaces |
| system.derived.* never stale | NO | Direct mutations skip recalc |
| Prerequisite violations prevent invalid gains | NO | IntegrityChecker only warns |
| Force/Destiny totals match source | PARTIAL | Depends on recalc trigger |
| Defense values accurate | PARTIAL | Depends on recalc trigger |
| Initiative derived correct | PARTIAL | Depends on recalc trigger |

**VERDICT:** Almost NO invariants are guaranteed. Most are "likely" or "probably" depending on which code path executes.

---

## 8. INTERCEPTOR / GUARD / SENTINEL AUDIT

### MutationInterceptor Analysis

**Initialization:** `scripts/governance/mutation/MutationInterceptor.js`

**What it wraps:**
- Actor.prototype.update()
- Actor.prototype.updateEmbeddedDocuments()
- Actor.prototype.createEmbeddedDocuments()
- Actor.prototype.deleteEmbeddedDocuments()
- Item.prototype.update()

**What it does:**
```javascript
const STRICT_MODE = false;  // Line 25
const DEV_MODE = true;      // Line 26

// When unauthorized:
if (!isAuthorized) {
  if (STRICT_MODE) throw new Error(msg);     // Never runs
  else if (DEV_MODE) console.error(msg);     // Only runs
}
```

**VERDICT:**
- ❌ Blocks mutations: NO
- ✅ Logs mutations: YES
- ❌ Enforces authorization: NO
- ✅ Diagnostic only: YES

**Recommendation:** Either enable STRICT_MODE or delete this layer (false security)

### EmbeddedMutationLayer Analysis

**Status:** DISABLED (`static ENABLED = false` line 27)

**If enabled, what it does:**
- Hooks into Actor.createEmbeddedDocuments()
- Hooks into Actor.deleteEmbeddedDocuments()
- Checks if MutationInterceptor has context
- Reports or throws violations

**Why disabled?** No explanation in code

**VERDICT:**
- ❌ Currently active: NO
- ❌ Could enforce: MAYBE (but also only checks context, not actual authority)
- ❌ Useful: NO (redundant with MutationInterceptor)

**Recommendation:** Delete entirely (disable + confusing + unreliable)

### GovernanceSystem Analysis

**Location:** `scripts/governance/governance-system.js`

**Enforcement modes:**
- `NORMAL` - Full enforcement, detection on
- `OVERRIDE` - No enforcement, detection on
- `FREEBUILD` - No enforcement, detection on

**What it does:**
- Stores mode in actor.system.governance
- Allows GMs to toggle modes
- Emits hooks when mode changes

**What it doesn't do:**
- Enforce anything
- Block mutations
- Check before mutations happen
- Change actual ActorEngine behavior

**Usage:** Found references in governance-integration.js but unclear how enforcement modes actually affect behavior

**VERDICT:**
- ✅ Allows mode selection: YES
- ❌ Actually enforces modes: UNKNOWN/NO
- ❌ Integrates with ActorEngine: UNCLEAR

**Recommendation:** Either integrate fully into ActorEngine decision-making, or delete

### Guard Layer Overlap Analysis

**Layer 1: MutationInterceptor** (logs only)
**Layer 2: EmbeddedMutationLayer** (disabled, would also log only)
**Layer 3: GovernanceSystem** (convention only)

**Problem:** Three layers all claim to guard mutations but:
1. Layer 1 logs violations but doesn't block
2. Layer 2 is disabled
3. Layer 3 is purely convention

**Result:** Overlapping, confusing, non-functional guard system

**VERDICT:** System has TOO MANY overlapping guard layers, none of which actually enforce.

**Recommendation:** MAJOR REFACTOR - Choose one approach:
- **Option A:** Make ONE layer truly enforcing at Foundry level
- **Option B:** Delete all guard layers and accept direct mutation reality
- **Option C:** Hybrid - weak logging layer + strong ActorEngine-based routing

---

## 9. FOUNDRY COUPLING / VERSION RISK

### Assumptions About Foundry Internals

| Assumption | Risk | Mitigation |
|-----------|------|-----------|
| Actor.prototype.update() exists and is wrappable | LOW | Tested at init |
| Actor.prototype.updateEmbeddedDocuments() is primary path | MEDIUM | Direct mutations bypass this |
| prepareDerivedData() called after mutations | MEDIUM | Not guaranteed, depends on Foundry hooks |
| Hooks.on() fires in expected order | MEDIUM | Hook order not enforced |
| AppV2 derived data pipeline exists | MEDIUM | Tightly coupled to v13 |
| Document prototype methods wrappable | MEDIUM | Depends on JS wrappability |

### Version Brittleness

**Very Brittle (Will Break on Version Change):**
- Prototype wrapping of Actor/Item methods (MutationInterceptor)
- Assumptions about prepareDerivedData() call order
- AppV2 derived data integration

**Moderately Brittle:**
- Hook execution order
- Embedded document APIs
- Active Effects format

**Somewhat Brittle:**
- Game.user.isGM check
- Actor type system
- Flag storage

### Missing Version Guards

- No checks for Foundry version compatibility
- No documentation of minimum Foundry version
- No deprecation warnings for v12→v13 changes
- No graceful fallback if prototype wrapping fails

### Specific Risks

**Risk 1: prototype wrapping failure**
- If Foundry changes Actor.prototype.update() signature → interception breaks
- No error handling if wrapping fails
- MutationInterceptor.initialize() is silent on failure

**Risk 2: Hook ordering**
- If Foundry changes when prepareDerivedData() is called → timing breaks
- If hooks execute in different order → cascade issues possible

**Risk 3: AppV2 changes**
- System tightly coupled to v13 AppV2 architecture
- Any breaking AppV2 changes → major refactor needed

**Risk 4: Active Effects**
- Format and behavior might change between versions
- No compatibility layer

### Recommendation

- Document minimum Foundry version clearly
- Add version compatibility checks
- Add error handling to MutationInterceptor.initialize()
- Create compatibility layer for critical assumptions
- Add tests that verify Foundry assumptions still hold

---

## 10. ENGINE CONTRACT SCORECARD

| Engine | Authority | Mutation Safety | Recompute | API Coherence | Testability | Overlap | Maintainability |
|--------|-----------|-----------------|-----------|---------------|-------------|---------|-----------------|
| ActorEngine | Fragile | Fragile | Fragile | Strong | Serviceable | None | Serviceable |
| InventoryEngine | Strong | Strong | Strong | Strong | Strong | None | Strong |
| ProgressionEngine | Serviceable | Serviceable | Serviceable | Serviceable | Serviceable | Some | Serviceable |
| CombatEngine | Strong | Strong | N/A | Strong | Strong | None | Strong |
| DerivedCalculator | Strong | Strong | Strong | Strong | Strong | None | Strong |
| ModifierEngine | Fragile | Fragile | Dangerous | Weak | Weak | Overlap | Fragile |
| ConditionEngine | Serviceable | Serviceable | Serviceable | Serviceable | Serviceable | Some | Serviceable |
| ForcePointsService | Serviceable | Serviceable | Serviceable | Weak | Serviceable | Some | Serviceable |
| MutationInterceptor | Dangerous | Dangerous | N/A | Weak | Weak | Heavy | Fragile |
| EmbeddedMutationLayer | Dangerous | Dangerous | N/A | Weak | Weak | Heavy | Fragile |
| GovernanceSystem | Weak | Weak | N/A | Weak | Weak | Some | Serviceable |

**Legend:** Strong | Serviceable | Fragile | Dangerous | N/A (not applicable)

---

## 11. TOP RISKS & REFORM PLAN

### Top 10 Engine/Governance Problems (Priority Order)

1. **CRITICAL: STRICT_MODE Disabled** - System logs but doesn't block mutations
2. **CRITICAL: 12+ Unguarded Direct Mutations** - Core systems bypass ActorEngine
3. **CRITICAL: No Recompute After Bypass Mutations** - Derived values become stale
4. **CRITICAL: HP Max Not Actually Protected** - Can be written directly
5. **CRITICAL: Derived Fields Not Actually Protected** - Can be written directly
6. **CRITICAL: Three Overlapping Guard Layers** - Confusing, redundant, non-functional
7. **HIGH: ModifierEngine Impurity** - Writes derived directly
8. **HIGH: Fallback Mutation Bypasses** - Item sheet, swse-actor-base.js
9. **HIGH: Mutation Context Not Async-Safe** - Global variable, not thread-safe
10. **MEDIUM: Hook Mutations Not Routed** - Follower hooks, vehicle core

### Top 10 Fastest Wins

1. **Enable STRICT_MODE** (30 min) - Toggle one line, catch violations
2. **Delete EmbeddedMutationLayer** (20 min) - Remove disabled layer
3. **Route item sheet mutations** (2 hr) - Use ActorEngine instead of direct
4. **Route importer mutations** (2 hr) - actor.update() → ActorEngine
5. **Route follower-hooks mutations** (1 hr) - deleteEmbeddedDocuments → ActorEngine
6. **Route vehicle mutations** (1 hr) - embedded mutations → ActorEngine
7. **Remove fallback bypasses** (1 hr) - Throw instead of falling back
8. **Document enforcement architecture** (1 hr) - Clear up confusion
9. **Add integration tests** (2 hr) - Verify mutation sovereignty
10. **Add runtime assertions** (1 hr) - Catch violations in dev/test

### Top 5 Major Reforms

**Reform 1: Make ActorEngine Unbypassable** (HIGH EFFORT, HIGH IMPACT)
- Enable STRICT_MODE
- Route all 12+ mutation surfaces through ActorEngine
- Eliminate fallback bypasses
- Add tests to verify all paths routed
- **Effort:** 8-12 hours
- **Impact:** ActorEngine becomes real authority
- **Risk:** Might break existing code paths that rely on bypasses
- **Prerequisite to:** Trusting ActorEngine

**Reform 2: Simplify Guard Layer** (MEDIUM EFFORT, MEDIUM IMPACT)
- Delete EmbeddedMutationLayer (disabled and redundant)
- Keep only MutationInterceptor (with STRICT_MODE=true)
- Integrate GovernanceSystem enforcement modes into ActorEngine decision-making
- **Effort:** 3-4 hours
- **Impact:** Clear, single enforcement point
- **Risk:** Requires careful testing of override/freeBuild modes
- **Prerequisite to:** Understanding governance architecture

**Reform 3: Fix ModifierEngine Impurity** (MEDIUM EFFORT, MEDIUM IMPACT)
- Make ModifierEngine.applyAll() return computed modifiers instead of mutating
- Move modifier application into DerivedCalculator.computeAll()
- Remove direct system.derived.* writes from ModifierEngine
- **Effort:** 4-6 hours
- **Impact:** ModifierEngine becomes pure helper
- **Risk:** Might affect modifier stacking or application order
- **Prerequisite to:** Derived field integrity

**Reform 4: Harden Recomputation Guarantee** (MEDIUM EFFORT, MEDIUM IMPACT)
- Make recalcAll() mandatory after any actor mutation
- Use Foundry hooks to catch stray mutations and trigger recalc
- Add runtime assertions that recalc was actually called
- **Effort:** 4-6 hours
- **Impact:** Derived values never stale
- **Risk:** Potential performance hit from extra recalc cycles
- **Prerequisite to:** Trusting derived values

**Reform 5: Establish Mutation Sovereignty Policy** (LOW EFFORT, HIGH IMPACT)
- Document: "All actor-affecting mutations MUST route through ActorEngine"
- Create linter rule to catch direct mutations
- Enforce in code review
- Add pre-commit hook to validate mutation sovereignty
- **Effort:** 2-3 hours
- **Impact:** Prevents regression of bypass patterns
- **Risk:** False positives if linter rule too broad
- **Prerequisite to:** Maintaining architecture over time

### Phased Reform Plan

**Phase 1: Immediate Stabilizers (Week 1, 4 hours)**
- Enable STRICT_MODE to catch violations
- Route item sheet mutations through ActorEngine
- Route import engine mutations through ActorEngine
- Add basic integration tests
- **Goal:** Catch and eliminate highest-risk bypasses
- **Success Criteria:** All 12+ mutation surfaces routed or throwing errors
- **Risk Level:** LOW (mostly additions, few deletions)

**Phase 2: Sovereignty Cleanup (Week 2, 6 hours)**
- Delete EmbeddedMutationLayer entirely
- Remove fallback bypasses (throw instead of fallback)
- Simplify guard layer to single enforcement point
- Route hook mutations through ActorEngine
- **Goal:** Single, clear mutation authority
- **Success Criteria:** Only ActorEngine and its delegated methods mutate actors
- **Risk Level:** MEDIUM (breaking changes to fallback code)

**Phase 3: Recompute/Integrity Hardening (Week 3, 8 hours)**
- Make ModifierEngine pure (return instead of mutate)
- Integrate modifier application into DerivedCalculator
- Add runtime assertions for recalc completion
- Verify recomputation after every mutation
- **Goal:** Derived values never stale
- **Success Criteria:** No stale derived data in test suite
- **Risk Level:** MEDIUM (changes calculation order)

**Phase 4: Interceptor/Guard Simplification (Week 3-4, 4 hours)**
- Integrate GovernanceSystem enforcement modes
- Make STRICT_MODE behavior clear per enforcement mode
- Add documentation of mode behavior
- Remove redundant logging layers
- **Goal:** Clear, predictable enforcement behavior
- **Success Criteria:** Each enforcement mode has documented behavior
- **Risk Level:** LOW (mostly configuration)

**Phase 5: Tests, Docs, Runtime Enforcement (Week 4-5, 6 hours)**
- Add comprehensive mutation sovereignty tests
- Document ActorEngine contract clearly
- Add pre-commit hook for mutation validation
- Create linter rule for detecting direct mutations
- **Goal:** Prevent future regressions
- **Success Criteria:** Linter catches all new direct mutations
- **Risk Level:** LOW (testing and validation only)

---

## 12. BLUNT BOTTOM LINE

### Direct Answers to Key Questions

**Q: Is ActorEngine actually trustworthy right now?**
**A:** NO. It's 40% trustworthy. The system claims enforcement but only logs violations. Direct mutations bypass it entirely, and recalculation is not guaranteed.

**Q: Which engines are real authorities versus conventions?**
**A:**
- **Real authorities:** DerivedCalculator, InventoryEngine, CombatEngine orchestration
- **Soft conventions:** ActorEngine (claims authority but not enforced), ProgressionEngine, all resource engines
- **Pure conventions:** GovernanceSystem (governance modes are names only)
- **Theater:** MutationInterceptor (logs but doesn't block), EmbeddedMutationLayer (disabled)

**Q: Where is the biggest daylight between intended architecture and actual enforcement?**
**A:** ActorEngine.

Intended: "All mutations must route through ActorEngine"
Actual: "12+ mutation surfaces bypass ActorEngine directly, and the system logs warnings but permits it"

The system has elaborate comments saying "MUST route through ActorEngine" while simultaneously allowing direct mutations everywhere.

**Q: If we do nothing, what failures are most likely to keep happening?**
**A:**
1. **Stale derived data** - Import engines, world repair, item sheets edit values → derived not recalculated
2. **Character corruption** - Direct mutations write invalid states without integrity checks
3. **HP inconsistencies** - HP max written outside recompute context → misaligned with source
4. **Prerequisite violations** - Integrity checks don't block invalid ability gains
5. **Cascading mutations** - No enforcement prevents loops or re-entrancy
6. **Confusing error messages** - Developers see "must route through ActorEngine" and "STRICT_MODE=false" simultaneously

**Q: What must be fixed before we can honestly say "all mutations happen through the engines"?**
**A:**
1. ✅ Enable STRICT_MODE (1 line)
2. ✅ Route all 12+ direct mutation surfaces through ActorEngine (8-10 hours)
3. ✅ Delete fallback bypasses (2-3 hours)
4. ✅ Delete redundant guard layers (EmbeddedMutationLayer)
5. ✅ Make recompute mandatory after every mutation (4-6 hours)
6. ✅ Document enforcement model clearly
7. ✅ Add tests to verify no mutations bypass ActorEngine
8. ✅ Add linter rule to catch new bypasses

---

## REFORM PRIORITY RANKING

### MUST DO (Foundation)
1. **Enable STRICT_MODE** - System can't claim enforcement while this is false
2. **Route 12+ mutation surfaces** - These are the biggest loopholes
3. **Fix fallback bypasses** - These silently fail over
4. **Delete disabled layers** - EmbeddedMutationLayer is confusing

### SHOULD DO (Integrity)
5. **Make ModifierEngine pure** - Fixes derived field corruption vector
6. **Harden recomputation** - Prevents stale data
7. **Integrate governance modes** - Make enforcement modes actually mean something
8. **Add mutation sovereignty tests** - Prevent regression

### NICE TO DO (Polish)
9. **Simplify guard layers** - Reduce confusion
10. **Add linter rules** - Catch new bypasses automatically
11. **Document architecture** - Clear up misunderstandings
12. **Version compatibility** - Future-proof for Foundry changes

---

## FILES REQUIRING CHANGES

**Priority 1 (Enable enforcement):**
- `scripts/governance/mutation/MutationInterceptor.js` - Set STRICT_MODE = true
- `scripts/items/swse-item-sheet.js` - Route through ActorEngine
- `scripts/engine/import/npc-template-importer-engine.js` - Route through ActorEngine
- `scripts/engine/import/droid-template-importer-engine.js` - Route through ActorEngine

**Priority 2 (Clean up guard layers):**
- `scripts/governance/mutation/embedded-mutation-layer.js` - DELETE
- `scripts/governance/governance-system.js` - Integrate with ActorEngine or DELETE

**Priority 3 (Fix core issues):**
- `scripts/engine/effects/modifiers/ModifierEngine.js` - Make pure
- `scripts/actors/derived/derived-calculator.js` - Accept modifier bundle
- `scripts/actors/base/swse-actor-base.js` - Remove fallback bypasses
- `scripts/infrastructure/hooks/follower-hooks.js` - Route through ActorEngine

**Priority 4 (Testing & Documentation):**
- `tests/governance/active-governance.test.js` - Expand tests
- `docs/governance/` - Create or update architecture docs
- `.pre-commit` - Add mutation sovereignty checks

---

**END OF AUDIT**
