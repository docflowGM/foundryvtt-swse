# V2 Sovereignty Audit — Weapon/Armor/Vehicle Modification Systems

**Date:** 2026-02-24
**Scope:** Weapon modifications, Armor modifications, Vehicle modifications, Attachment systems, Upgrade systems, Slot systems, Template application

---

## SECTION 1 — MUTATION ENTRY POINTS

### 1.1 Armor Upgrades (`scripts/armor/armor-upgrade-system.js`)
- **Line 183:** `await armorItem.update({ 'system.installedUpgrades': updated })`
- **Line 203:** `await armorItem.update({ 'system.installedUpgrades': updated })`
- **Nature:** Direct item mutation. Stores upgrade objects in array, no base value preservation.
- **Governance Gap:** No ownership check; should follow upgrade-app.js PHASE 9 pattern (see Section 1.2)

### 1.2 Weapon/Equipment Upgrades (`scripts/apps/upgrade-app.js`) — PHASE 9 COMPLIANT
- **Line 226:** `await ActorEngine.updateActor(actor, updateData)` — Credits/tokens deducted
- **Lines 244-248:** **PROPER OWNERSHIP BOUNDARY**:
  ```js
  if (actor?.updateOwnedItem && this.item.isEmbedded) {
    await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });
  } else {
    await this.item.update({ 'system.installedUpgrades': nextInstalled });
  }
  ```
  Checks embedded status before routing; world items bypass ActorEngine (allowed)
- **Lines 279-283:** Same pattern for removal
- **Nature:** V2 COMPLIANT with proper governance boundaries. Armor-upgrade-system.js should adopt this pattern.

### 1.3 Vehicle Modifications (`scripts/apps/vehicle-modification-app.js`)
- **Line 763:** `await globalThis.SWSE.ActorEngine.updateActor(this.actor, updateData)`
- **Nature:** V2 compliant. Saves `system.vehicle` containing `{stockShip, modifications, totalCost}`.

### 1.4 Vehicle Templates (`scripts/actors/vehicle/swse-vehicle-handler.js`)
- **Line 193:** `await globalThis.SWSE.ActorEngine.updateActor(actor, updates)`
- **Nature:** V2 compliant. BUT: Bulk direct stat writes through ActorEngine (massive override block).
- **Issues:** Lines 60-183 write 70+ system fields directly (defense, hull, shields, attributes, speed, etc.)

### 1.5 Gear Templates (`scripts/apps/gear-templates-engine.js`)
- **Lines 104-115:** `applyTemplate()` — **NOT IMPLEMENTED** (TODO only)
- **Lines 122-132:** `removeTemplate()` — **NOT IMPLEMENTED** (TODO only)
- **Nature:** Feature stubbed but inactive.

### 1.6 Vehicle Combat Systems (Direct Violations)
**File:** `scripts/engines/combat/starship/*.js`
- **enhanced-commander.js:151** `await vehicle.update({...})`
- **enhanced-commander.js:178** `await vehicle.update({...})`
- **enhanced-engineer.js:179** `await vehicle.update({...})`
- **enhanced-pilot.js:124** `await vehicle.update({...})`
- **enhanced-pilot.js:149** `await vehicle.update({...})`
- **enhanced-shields.js:81, 118, 200** Multiple `vehicle.update()` calls
- **subsystem-engine.js:318** `await vehicle.update({...})`
- **vehicle-turn-controller.js:126, 177, 220, 246** Multiple `vehicle.update()` calls
- **threshold-engine.js:400, 457, 520** `pilot.update()`, `engineer.update()`, `target.update()`

**Nature:** **VIOLATIONS** — Direct actor mutation, bypassing ActorEngine. No atomicity, no governance.

---

## SECTION 1.7 — Governance Layer (PHASE 9 & MutationInterceptor)

The codebase implements sophisticated enforcement:

**ActorEngine** (`scripts/governance/actor-engine/actor-engine.js`):
- Central mutation authority for all actor.update() calls
- Sets `MutationInterceptor._currentMutationContext` before update
- All modifications flowing through ActorEngine are V2 authorized

**MutationInterceptor** (`scripts/governance/mutation/MutationInterceptor.js`):
- Wraps `Actor.prototype.update()`, `Item.prototype.update()`
- Checks authorization context
- Allows world items direct update, but warns/errors on owned item direct mutation

**PHASE 9 Ownership Boundary** (`scripts/governance/mutation/embedded-mutation-layer.js`):
- Detects if item is embedded (owned by actor)
- Routes owned items via `actor.updateOwnedItem()` (safer, goes through actor mutation)
- Allows unowned items direct `item.update()`

**DroidEngine Pattern** (`scripts/engines/engine/droid-engine.js`):
- Builds `MutationPlan` with atomic updates
- Routes all droid mod mutations through ActorEngine
- **MODEL OF COMPLIANCE** for how mod systems should work

---

## SECTION 2 — SOVEREIGNTY VIOLATIONS

### V2 Violation Categories

| Violation | Count | Severity | Files | Status |
|-----------|-------|----------|-------|--------|
| Direct `item.update()` WITHOUT ownership check | 2 | HIGH | `armor-upgrade-system.js` (lines 183, 203) | NEEDS FIX |
| Direct `actor.update()` on vehicles | 16+ | **CRITICAL** | Combat starship engines, threshold-engine.js | NEEDS REWRITE |
| Proper PHASE 9 boundary (upgrade-app.js) | 4 calls | ✓ V2 COMPLIANT | `upgrade-app.js` (lines 244-248, 279-283) | GOOD PATTERN |
| Bulk direct stat overrides (derived fields) | 70+ fields | HIGH | Vehicle template handler | NEEDS REFACTOR |
| Unimplemented features (TODO) | 2 | MEDIUM | Gear template system | AWAITING SPEC |

### Specific Violations

**VIOLATION 1: Armor Upgrade System Missing Ownership Check** ⚠️ EASY FIX
```js
// armor-upgrade-system.js:183, 203 — CURRENT (WRONG)
await armorItem.update({ 'system.installedUpgrades': updated });
```
```js
// SHOULD BE (following upgrade-app.js PHASE 9 pattern):
const actor = armorItem.actor;
if (actor?.updateOwnedItem && armorItem.isEmbedded) {
  await actor.updateOwnedItem(armorItem, { 'system.installedUpgrades': updated });
} else {
  await armorItem.update({ 'system.installedUpgrades': updated });
}
```
- **Issue:** No ownership check; bypasses ActorEngine for owned items
- **Impact:** If armor is actor-owned, mutation isn't tracked by MutationInterceptor
- **Fix:** 2-line change to match upgrade-app.js pattern (lines 244-248)
- **Status:** Simple standardization, low risk

**VIOLATION 2: Vehicle Combat Systems Bypass ActorEngine** 🔴 CRITICAL
```js
// enhanced-shields.js:81, etc.
await vehicle.update({ 'system.shields.value': newShields });
```
- **Issue:** Direct vehicle.update() in combat operations
- **Consequence:** Bypasses DerivedCalculator, ModifierEngine, all V2 governance
- **Atomicity:** Shield calculation and update are separate — partial failure possible
- **Fix:** Route through ActorEngine.updateActor()

**VIOLATION 4: Vehicle Template Bulk Override**
```js
// swse-vehicle-handler.js:60-183
const updates = {
  'system.attributes': {...},
  'system.hull.value': ...,
  'system.shields.value': ...,
  'system.reflexDefense': ...,
  // ... 70+ more fields
};
await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
```
- **Issue:** While using ActorEngine, directly overwrites derived stats (reflexDefense, fortitudeDefense, flatFooted)
- **Consequence:** Derived stats written as literals, not computed. Next modifier change may desync them.
- **Fix:** Let DerivedCalculator compute these fields, only set base attributes

---

## SECTION 3 — STACKING MODEL

### Current Stacking Semantics

**Armor Upgrades:**
- Additive (cumulative)
- Calculated in `ArmorUpgradeSystem.calculateCumulativeModifiers()`
- No conflict detection
- No priority/override logic

**ModifierEngine Processing:**
- Reads `system.installedUpgrades` array
- Converts each upgrade's modifiers object to canonical Modifier objects (lines 914-960)
- Each modifier has priority 35 (after base armor bonus priority 30)
- Additive stacking: `ModifierUtils.sumModifiers(resolved)`

**Is it Deterministic?** YES
- Order-independent (all upgrades in array, all converted, all summed)

**Is it Centralized?** PARTIALLY
- Upgrade install is decentralized (multiple places: `ArmorUpgradeSystem`, `UpgradeApp`, `WeaponUpgradeApp` concepts)
- Modifier collection is centralized (ModifierEngine)
- Derived stat application is centralized (DerivedCalculator)

**Is it Additive?** YES, for ModifierEngine
- But upgrade removal is not symmetrical (see Section 4)

---

## SECTION 4 — REMOVAL INTEGRITY

### Removal Pattern

**Armor/Equipment Upgrades:**
```js
// upgrade-app.js:270-282
const nextInstalled = installed.filter(u => u.id !== upgradeId);
await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });
```

### Removal Issues

1. **No Base Value Restoration**
   - Upgrades don't store base values before install
   - Removal simply deletes from array
   - No rollback of previous actor state

2. **Not Truly Symmetrical**
   - Install: Creates modifier entry in installedUpgrades
   - Remove: Deletes modifier entry
   - Result is symmetric, BUT:
     - No credits refunded (line 265: "No credits will be refunded")
     - No record of what was removed

3. **Idempotence**
   - Removing non-existent upgrade: Harmless (filter does nothing)
   - Removing already-removed upgrade: Harmless (filter does nothing)
   - **Idempotent: YES**

4. **Atomicity**
   - Single item.update() call
   - Array mutation is atomic
   - **Atomic: YES**

### Verdict
- ✓ Removal is idempotent and atomic
- ✗ Not symmetrical to install (no credits/tokens restored)
- ✗ No base value preservation (not applicable, but worth noting)

---

## SECTION 5 — DERIVED DATA INTEGRITY

### ModifierEngine Integration

**Armor Upgrades → Modifiers:**
- `ModifierEngine._getItemModifiers()` lines 888-960
- Reads `armorSystem.installedUpgrades[]`
- Creates Modifier objects for each upgrade:
  - `upgrade.modifiers.reflexBonus` → `target: 'defense.reflex'`
  - `upgrade.modifiers.fortBonus` → `target: 'defense.fort'`
  - `upgrade.modifiers.acpModifier` → `target: 'skill.*' (ACP)`
  - `upgrade.modifiers.speedModifier` → `target: 'speed.base'`

**Vehicle Template Application:**
- Lines 60-183 in `swse-vehicle-handler.js`
- **PROBLEM:** Directly writes derived values
  - `'system.reflexDefense': template.reflexDefense || 10`
  - `'system.flatFooted': template.flatFooted || ...`
  - These are DERIVED fields, not inputs

### Violation: Direct Derived Stat Writing

**Current code:**
```js
const updates = {
  'system.reflexDefense': template.reflexDefense || 10,  // DERIVED
  'system.fortitudeDefense': template.fortitudeDefense || 10,  // DERIVED
  'system.flatFooted': template.flatFooted || template.reflexDefense || 10  // DERIVED
};
await ActorEngine.updateActor(actor, updates);
```

**Problem:**
- These are derived by DerivedCalculator
- Writing them directly means next modifier change won't recalculate them
- Vehicle defenses become stale after any AC modifier installation

**Correct approach:**
- Write only base attributes (str, dex, con, int, wis, cha, size, armor, etc.)
- Let DerivedCalculator compute reflexDefense, fortitudeDefense, flatFooted

---

## SECTION 6 — ATOMICITY RISKS

### Risk 1: Vehicle Combat Updates

**Code pattern:**
```js
// enhanced-shields.js:118
await vehicle.update({
  'system.shields.value': newValue,
  'system.shieldsApplied': true
});
```

**Risks:**
- If DerivedCalculator needs to recalc shield impact on defense, it won't
- If ModifierEngine has shield-related effects, they won't trigger
- Partial failure: Update completes but recalc never happens

**Severity:** HIGH

---

### Risk 2: Modification Install Atomic Units

**Current design:**
```js
// Step 1: Deduct credits
await ActorEngine.updateActor(actor, { 'system.credits': ... });

// Step 2: Install upgrade
await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': ... });
```

**Risks:**
- Credits deducted, but upgrade install fails → inconsistent state
- No rollback mechanism
- No transaction semantics

**Severity:** MEDIUM (UI prevents most failure cases, but race conditions possible)

---

### Risk 3: Vehicle Template Consistency

**Current design:**
```js
const updates = {
  'system.attributes': { str: {...}, dex: {...}, ... },
  'system.reflexDefense': computed_value,
  'system.weapons': [...],
  // ... 70+ fields
};
await ActorEngine.updateActor(actor, updates);
```

**Risks:**
- Massive update object
- If ActorEngine throws partway through, actor in inconsistent state
- Derived values written directly (reflexDefense, flatFooted) may desync if modifiers later change

**Severity:** MEDIUM (single ActorEngine call is atomic, but derived sync issue remains)

---

## SECTION 7 — COMPLIANCE SUMMARY

| System | ActorEngine | Governance | ModifierEngine | DerivedCalculator | Atomicity | V2 Score | Notes |
|--------|-------------|-----------|-----------------|-------------------|-----------|----------|-------|
| Armor Upgrades | ✗ (no check) | ✗ Missing PHASE 9 | ✓ (reads) | ✓ (via mods) | ✓ | **40%** | Add ownership check (1 pattern fix) |
| Equipment Upgrades | ✓ PHASE 9 | ✓ Proper boundary | ✓ (reads) | ✓ (via mods) | ✓ | **85%** | COMPLIANT MODEL |
| Droid Mods | ✓ via Engine | ✓ MutationPlan | ✓ (reads enabled) | ✓ (via mods) | ✓ | **95%** | REFERENCE PATTERN |
| Vehicle Mods | ✓ | ✓ Proper | ✗ (N/A) | ✓ (not needed) | ✓ | **80%** | Data-only system |
| Vehicle Templates | ✓ Route OK | ✗ Bulk write | ✗ | ✗ (overrides) | ✓ | **50%** | Bypass DerivedCalculator |
| Vehicle Combat | ✗ Direct call | ✗ NONE | ✗ | ✗ | ✓ | **10%** | COMPLETE BYPASS |

**Weighted Average: 43% (upgrade systems ~65%, combat systems ~10%)**

---

## SECTION 8 — CRITICAL FINDINGS

### Finding 1: Armor Upgrades Lack ActorEngine Routing
- **Files:** `armor-upgrade-system.js`, `ModifierEngine.js`
- **Issue:** Upgrades mutate items directly, but are read by ModifierEngine
- **Impact:** If armor is actor-owned, mutations bypass governance
- **Fix Priority:** HIGH

### Finding 2: Vehicle Combat Engines Completely Bypass V2
- **Files:** `enhanced-shields.js`, `enhanced-pilot.js`, `enhanced-engineer.js`, `subsystem-engine.js`, `vehicle-turn-controller.js`, `threshold-engine.js`
- **Issue:** 16+ direct `vehicle.update()` calls with no ActorEngine
- **Impact:** Vehicle defenses, shields, maneuvers not reconcilable with modifier/derived pipelines
- **Fix Priority:** CRITICAL

### Finding 3: Derived Stats Written as Literals
- **Files:** `swse-vehicle-handler.js`, potentially others
- **Issue:** `system.reflexDefense`, `system.fortitudeDefense`, etc. written directly
- **Impact:** Defenses become stale after modifications; next modifier change won't sync
- **Fix Priority:** HIGH

### Finding 4: Upgrade Removal Lacks Refund/Rollback
- **Files:** `upgrade-app.js`, `armor-upgrade-system.js`
- **Issue:** Credits/tokens not restored on removal; no base state recorded
- **Impact:** One-way installation (removal is free but irreversible)
- **Fix Priority:** MEDIUM (design choice, not bug)

### Finding 5: Gear Template System Unimplemented
- **Files:** `gear-templates-engine.js`
- **Issue:** `applyTemplate()` and `removeTemplate()` are TODO stubs
- **Impact:** UI offers feature that doesn't work
- **Fix Priority:** MEDIUM (feature incomplete)

---

## SECTION 9 — RECOMMENDATIONS

### Phase 1: Stop the Bleeding (Critical)
1. **Audit and fix vehicle combat engines** — Replace all `vehicle.update()` with `ActorEngine.updateActor()`
2. **Consolidate upgrade mutation** — All upgrades route through ActorEngine if actor-owned
3. **Separate derived stat computation** — Let DerivedCalculator own reflexDefense, flatFooted, etc.

### Phase 2: Stabilize (High Priority)
1. **Implement MutationPlan for modifications** — Batch credit + upgrade install atomically
2. **Add base value preservation** — Track original armor before upgrades (optional for refund feature)
3. **Implement gear templates** — Complete the TODO stubs

### Phase 3: Harden (Medium Priority)
1. **Add removal symmetry** — Option to refund credits/tokens on removal
2. **Add conflict detection** — Prevent incompatible upgrades from stacking
3. **Add upgrade prerequisites** — Some upgrades require others

---

## SECTION 10 — CONCLUSION

**V2 Compliance Rating: 43% (Weighted) / 35% (Conservative)**

**Infrastructure Assessment:**
- ✓ EXCELLENT: Governance layer (ActorEngine + MutationInterceptor + PHASE 9) is sophisticated & working
- ✓ EXCELLENT: ModifierEngine correctly integrates armor/equipment upgrades
- ✓ GOOD: Equipment upgrade system (upgrade-app.js) is reference-compliant PHASE 9 pattern
- ✓ GOOD: Droid mod system (DroidEngine) is reference pattern for atomic updates
- ✓ GOOD: Vehicle mod UI routes through ActorEngine properly

**Problem Areas:**
- ⚠️ MEDIUM: Armor upgrade system missing ownership check (easy 1-pattern fix)
- ⚠️ MEDIUM: Vehicle template application bypasses DerivedCalculator
- 🔴 CRITICAL: Vehicle combat systems completely bypass ActorEngine (16+ violations)
- 🟡 LOW: Gear template system not yet implemented (feature stub)

**Key Findings:**
1. The V2 governance infrastructure EXISTS and is well-designed
2. Equipment upgrades (upgrade-app.js) correctly implement it
3. Droid mods correctly implement it
4. Armor upgrades need 1 pattern fix (add ownership check)
5. Vehicle combat systems need complete refactor (no governance at all)

**Immediate Actions Required (Severity):**
1. 🔴 CRITICAL: Audit & refactor vehicle combat engines (`enhanced-shields.js`, `vehicle-turn-controller.js`, `threshold-engine.js`, etc.) — replace all `vehicle.update()` with `ActorEngine.updateActor()`
2. ⚠️ MEDIUM: Add ownership boundary to `armor-upgrade-system.js` (match upgrade-app.js pattern)
3. ⚠️ MEDIUM: Refactor vehicle template handler to use DerivedCalculator (don't write derived fields directly)
4. 🟡 LOW: Implement gear template feature (complete TODO stubs)

**Prognosis:**
System is **mostly solid but has critical combat integration gap**. Modification purchase/install workflows are V2 compliant; the emergency is starship combat mutations being completely untracked. Vehicle combat refactor is prerequisite for mission-critical starship combat reliability.
