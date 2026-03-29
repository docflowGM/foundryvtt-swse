# CRITICAL MUTATION ENFORCEMENT AUDIT
## Focused Deep-Dive: Why The System Is Not Actually Enforcing Mutations

**Date:** March 29, 2026
**Focus:** The enforcement fiction - what appears to be control vs. actual reality

---

## EXECUTIVE FINDING

The SWSE engine governance system **does NOT actually enforce mutations**. It creates an elaborate appearance of enforcement while permitting unauthorized mutations throughout the codebase.

**The Evidence:**
- MutationInterceptor logs violations but doesn't block them
- EmbeddedMutationLayer is disabled
- 12+ direct mutation surfaces exist and are not prevented
- System comments claim enforcement that doesn't exist

---

## THE SMOKING GUN: STRICT_MODE = FALSE

### File: scripts/governance/mutation/MutationInterceptor.js

```javascript
Line 25: const STRICT_MODE = false;  // ← This is the problem
Line 26: const DEV_MODE = true;
```

### What This Line Does

When unauthorized mutations are detected:

```javascript
if (!isAuthorized) {
  const msg = `MUTATION VIOLATION: ${caller} called actor.update() directly...`;

  if (STRICT_MODE) {
    throw new Error(msg);  // ← Line 150: This NEVER runs (STRICT_MODE = false)
  } else if (DEV_MODE) {
    console.error(`[MUTATION-VIOLATION] ${msg}`);  // ← Line 152: This is the ONLY action
  }
}
```

**Result:**
- Unauthorized mutations are LOGGED as console.error()
- But they are NOT BLOCKED
- The mutation proceeds regardless

### Real-World Impact

**Code Path: Item sheet edit**
```javascript
// scripts/items/swse-item-sheet.js line 350
await this.item.update(changes);  // ← Direct update, no ActorEngine
```

**What Happens:**
1. MutationInterceptor.hasContext() returns false (not going through ActorEngine)
2. Check at line 144 detects: `if (!isAuthorized)`
3. Creates error message about violation
4. STRICT_MODE is false, so goes to DEV_MODE branch
5. Logs: `[MUTATION-VIOLATION] Item.update() called directly`
6. **MUTATION PROCEEDS ANYWAY**
7. No recalculation happens
8. Derived values become stale

**From Developer Perspective:**
- No error thrown
- No exception caught
- Code completes normally
- Developer has no idea they violated the contract

---

## THE DISABLED LAYER: EmbeddedMutationLayer

### File: scripts/governance/mutation/embedded-mutation-layer.js

**Line 27:** `static ENABLED = false`

### What This Is Supposed To Do

EmbeddedMutationLayer is a SECOND enforcement layer that would:
1. Hook into Actor.createEmbeddedDocuments()
2. Hook into Actor.deleteEmbeddedDocuments()
3. Check if MutationInterceptor context is set
4. Block or report unauthorized mutations

### Why It's Disabled

**There is no explanation in the code.** Just a boolean set to false.

### Actual Status

- Initialization code exists but never runs (ENABLED = false)
- Hook installation code exists but is skipped
- Any checks it would do are bypassed
- It's a backup enforcement layer that's completely turned off

### Impact

One less layer protecting against mutations. A developer could create a test path that triggers EmbeddedMutationLayer hooks and find... nothing stops them.

---

## THE 12 UNGUARDED MUTATION SURFACES

Here are the specific locations where mutations happen WITHOUT going through ActorEngine:

### 1-4: Item Sheet (swse-item-sheet.js)
```javascript
// Line 350
await this.item.update(changes);

// Line 365
await this.item.update(changes);

// Line ~400
await this.item.update({ 'flags.swse.emitLight': enabled });

// Line ~470
await this.item.update(foundry.utils.flattenObject(data));
```
**Risk:** Item properties modified without triggering actor recomputation

### 5-6: NPC/Droid Importers
```javascript
// npc-template-importer-engine.js line 95
await actor.update({ 'system.biography': biographyText });

// droid-template-importer-engine.js (similar)
await actor.update({ 'system.biography': biographyText });
```
**Risk:** Actor data modified during import without recalculation

### 7: World Repair Maintenance
```javascript
// scripts/maintenance/world-repair.js
await actor.update(fixes);
```
**Risk:** This runs during world maintenance, could apply invalid fixes

### 8-9: Upgrade App
```javascript
// scripts/apps/upgrade-app.js
await this.item.update({ 'system.installedUpgrades': nextInstalled });
```
**Risk:** Upgrades modified without actor recomputation

### 10-11: Armor/Weapon Migrations
```javascript
// armor-system-migration-v4.js
await actor.update(updates);

// weapon-talents-migration.js
await actor.update(updates);
```
**Risk:** Migration applies directly without validation or recomputation

### 12: Follower Cleanup Hook
```javascript
// follower-hooks.js line 56
await follower.deleteEmbeddedDocuments('Item', toDelete);
```
**Risk:** Items deleted without actor recomputation

---

## THE FALLBACK BYPASS PROBLEM

Even code that TRIES to use ActorEngine has fallback bypasses:

### File: scripts/actors/base/swse-actor-base.js

```javascript
async updateOwnedItem(item, changes, options = {}) {
  if (!item) return null;

  // Unowned items update normally
  if (!item.isOwned || item.parent?.id !== this.id) {
    return item.update(changes, options);  // ← Direct update for unowned items
  }

  try {
    const ActorEngine = await import(...ActorEngine.js...).then(m => m.ActorEngine);
    const update = { _id: item.id, ...changes };
    const [updated] = await ActorEngine.updateOwnedItems(this, [update], options);
    return updated ?? null;
  } catch (err) {
    // ← FALLBACK: If ActorEngine fails to load or throws
    return item.update(changes, options);  // ← Direct update, no error reported
  }
}
```

**The Vulnerability:**
1. If ActorEngine module fails to load → fallback to direct update()
2. If ActorEngine.updateOwnedItems() throws → fallback to direct update()
3. Exception is silently caught and buried
4. Developer using this function has NO IDEA it failed

**Worse:** Line 176 (for unowned items) also does direct update() without any attempt to use ActorEngine

---

## WHAT SHOULD BE HAPPENING

### Intended Flow
```
Code System → ActorEngine.updateActor(actor, data, options)
           → MutationInterceptor.setContext()
           → actor.update(data, options) [now authorized]
           → recalcAll()
           → MutationInterceptor.clearContext()
```

### Actual Flow (When Bypasses Trigger)
```
Code System → actor.update(data, options) [unauthorized]
           → MutationInterceptor detects: !isAuthorized
           → Logs: [MUTATION-VIOLATION] ...
           → But mutation continues anyway
           → NO recalcAll()
           → Derived values stale
           → Developer never notices
```

---

## ENFORCEMENT AUDIT BY PATH

| Mutation Surface | Route | Goes Through ActorEngine? | Gets Recalculated? | STRICT_MODE Blocks? |
|---|---|---|---|---|
| Item sheet edit | direct item.update() | ❌ NO | ❌ NO | ❌ NO (STRICT_MODE=false) |
| Import engine | direct actor.update() | ❌ NO | ❌ NO | ❌ NO |
| World repair | direct actor.update() | ❌ NO | ❌ NO | ❌ NO |
| Follower cleanup | direct deleteEmbeddedDocuments() | ❌ NO | ❌ NO | ❌ NO |
| Vehicle mutations | direct createEmbeddedDocuments() | ❌ NO | ❌ NO | ❌ NO |
| Upgrade app | direct item.update() | ❌ NO | ❌ NO | ❌ NO |
| Migration scripts | direct actor.update() | ❌ NO | ❌ NO | ❌ NO |
| InventoryEngine paths | via ActorEngine | ✅ YES | ✅ YES | ✅ YES |
| ProgressionEngine paths | via ActorEngine | ✅ YES | ✅ YES | ✅ YES |
| CombatEngine paths | mostly via ActorEngine | ✅ MOSTLY | ✅ MOSTLY | ✅ MOSTLY |

**Summary:** ~5 good paths, ~12 bad paths. System is 30% compliant.

---

## WHAT ACTUALLY PROTECTS ACTOR INTEGRITY RIGHT NOW?

**Answer: Nothing enforces it. Only convention.**

The system relies on:
1. Developers knowing they should use ActorEngine
2. Code reviews catching direct mutations
3. Luck that stale derived values don't cause visible bugs
4. logging warnings (which developers might not see)

**No automated enforcement exists.** The system is honor-system, not enforced.

---

## PROOF: RUN THIS IN DEV CONSOLE

```javascript
// Go to any actor
const actor = game.actors.getName("Test Character");

// Direct mutation (should be blocked by "enforcement")
await actor.update({ "system.attributes.str.base": 8 });

// Check for error → NONE
// Check console → [MUTATION-VIOLATION] message appears
// Check actor data → UPDATE SUCCEEDED

// Check derived values
console.log(actor.system.derived.attributes.str.mod);  // Might be stale!
```

**Result:** Mutation succeeds. No error thrown. No exception caught. Derived values might be wrong.

---

## THE COMMENT-CODE GAP

**What the code COMMENTS say:**

```javascript
// Line 14-19 (MutationInterceptor.js):
/**
 * This module:
 * 1. Wraps Actor.prototype.update and embedded document methods
 * 2. Enforces that ONLY ActorEngine can mutate actors
 * 3. Prevents nested mutations with transaction guard
 * ...
 * Contract:
 * - Any call to actor.update() from outside ActorEngine → ERROR
 * - Any call to actor.updateEmbeddedDocuments() from outside ActorEngine → ERROR
 * - Direct mutation is IMPOSSIBLE
 */
```

**What the code ACTUALLY does:**

```javascript
// Line 25-26:
const STRICT_MODE = false;  // Enforcement disabled
const DEV_MODE = true;      // Logging only

// Line 149-154:
if (!isAuthorized) {
  if (STRICT_MODE) {  // ← NEVER TRUE
    throw new Error(msg);
  } else if (DEV_MODE) {  // ← ALWAYS TRUE
    console.error(msg);  // ← Only logs, doesn't block
  }
}
```

**The comment says:** "Direct mutation is IMPOSSIBLE"
**The code says:** "Direct mutation is logged but not blocked"

These statements are incompatible. The comment is false.

---

## THE FIX

To actually enforce mutations, choose ONE of:

### Option A: Enable STRICT_MODE (1 minute)
```javascript
// Change line 25 from:
const STRICT_MODE = false;

// To:
const STRICT_MODE = true;

// Now violations throw instead of log
```

**Pros:**
- Immediate enforcement
- One-line fix
- All 12 unauthorized paths will throw errors

**Cons:**
- Will break existing code (migrations, imports, item sheets)
- Need to fix all 12 surfaces
- Can't selectively disable for override mode

**Effort to fix all surfaces:** 6-8 hours

### Option B: Delete This Layer Entirely (1 minute)
```javascript
// Delete MutationInterceptor initialization and this entire file
// Accept that direct mutations happen
// Focus on recomputation guarantees via other means
```

**Pros:**
- Removes false security
- Stops deceiving developers

**Cons:**
- System becomes explicitly uncontrolled
- Need alternative enforcement strategy

### Option C: Hybrid Approach
```javascript
// Keep STRICT_MODE = false for production
// But make it respect enforcement mode from GovernanceSystem
// If enforcement mode is "NORMAL" → throw on violations
// If enforcement mode is "OVERRIDE" → permit violations
```

**Pros:**
- Respects governance modes
- Selective enforcement

**Cons:**
- More complex logic
- Per-actor enforcement adds overhead

---

## RECOMMENDATION

**IMMEDIATE (This Week):**
1. Set `STRICT_MODE = true` in MutationInterceptor.js
2. Fix the 12 unguarded surfaces to use ActorEngine or accept the thrown error
3. Remove fallback bypasses (throw instead of silently falling back)
4. Disable EmbeddedMutationLayer entirely (delete or comment)

**WHY THIS ORDER:**
- Enable enforcement first (catches the bad paths)
- Fix bad paths one by one (use ActorEngine)
- Clean up disabled layers (remove confusion)
- Document what's actually enforced (update comments)

**SUCCESS CRITERIA:**
- No `[MUTATION-VIOLATION]` messages in dev console
- All 12+ surfaces routed through ActorEngine
- STRICT_MODE = true
- Comments match actual behavior

**TIME ESTIMATE:** 8-10 hours total
**COMPLEXITY:** Medium (mostly rerouting, some refactoring)
**RISK:** Medium (breaking changes to fallback code)

---

## CONCLUSION

The current system is **security theater**: it appears to enforce mutations but actually permits them. This creates false confidence while real vulnerabilities exist.

The choice is:
1. **Enable real enforcement** (break existing bypasses, fix them properly)
2. **Accept uncontrolled mutations** (delete the false enforcement layers, document reality)
3. **Do nothing** (keep the dangerous status quo)

Option 1 is recommended.

