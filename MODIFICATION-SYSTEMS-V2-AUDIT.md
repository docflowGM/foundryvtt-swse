# V2 Sovereignty Audit — Weapon/Armor/Vehicle Modification Systems

**Date:** 2026-02-24
**Scope:** Weapon modifications, Armor modifications, Vehicle modifications, Attachment systems, Upgrade systems, Slot systems, Template application

---

## SECTION 1 — MUTATION ENTRY POINTS

### 1.1 Armor Upgrades (`scripts/armor/armor-upgrade-system.js`)
- **Line 183:** `await armorItem.update({ 'system.installedUpgrades': updated })`
- **Line 203:** `await armorItem.update({ 'system.installedUpgrades': updated })`
- **Nature:** Direct item mutation. Stores upgrade objects in array, no base value preservation.

### 1.2 Weapon/Equipment Upgrades (`scripts/apps/upgrade-app.js`)
- **Line 226:** `await ActorEngine.updateActor(actor, updateData)` — Credits/tokens deducted (V2 compliant)
- **Line 245:** `await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled })` — V2 boundary
- **Line 247:** `await this.item.update({ 'system.installedUpgrades': nextInstalled })` — Direct mutation fallback
- **Line 280:** `await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled })` — Removal, V2 boundary
- **Line 282:** `await this.item.update({ 'system.installedUpgrades': nextInstalled })` — Removal, direct mutation fallback
- **Nature:** Mixed governance. Uses ActorEngine for credits, direct item.update() for upgrades when not embedded or no updateOwnedItem.

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

## SECTION 2 — SOVEREIGNTY VIOLATIONS

### V2 Violation Categories

| Violation | Count | Severity | Files |
|-----------|-------|----------|-------|
| Direct `item.update()` without ActorEngine governance | 4 | HIGH | `armor-upgrade-system.js`, `upgrade-app.js` (2 places) |
| Direct `actor.update()` on vehicles | 16+ | CRITICAL | Combat starship engines, threshold-engine.js |
| Embedded item mutation fallback | 2 | MEDIUM | `upgrade-app.js` (conditional, but exists) |
| Bulk direct stat overrides | 70+ fields | HIGH | Vehicle template handler |
| Unimplemented features (TODO) | 2 | MEDIUM | Gear template system |

### Specific Violations

**VIOLATION 1: Armor Upgrade Direct Mutation**
```js
// armor-upgrade-system.js:183, 203
await armorItem.update({ 'system.installedUpgrades': updated });
```
- **Issue:** Direct item.update(), no ActorEngine governance
- **Consequence:** If actor owns armor, mutation bypasses actor sovereignty
- **Fix:** Route through ActorEngine if owned

**VIOLATION 2: Upgrade App Fallback Mutation**
```js
// upgrade-app.js:247, 282 (lines execute if no updateOwnedItem)
if (actor?.updateOwnedItem && this.item.isEmbedded) {
  await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });
} else {
  await this.item.update({ 'system.installedUpgrades': nextInstalled }); // <- DIRECT MUTATION
}
```
- **Issue:** Fallback path does direct item.update()
- **Consequence:** World/compendium items may work differently than embedded items
- **Fix:** Ensure updateOwnedItem always exists or consistently route through ActorEngine

**VIOLATION 3: Vehicle Combat Systems Bypass ActorEngine**
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

| System | ActorEngine | MutationPlan | ModifierEngine | DerivedCalculator | Atomicity | Removal Symmetry | V2 Score |
|--------|-------------|--------------|-----------------|-------------------|-----------|------------------|----------|
| Armor Upgrades | ✗ (direct item.update) | ✗ | ✓ (reads) | ✗ (writes derived directly) | ✓ | ✗ | 25% |
| Equipment Upgrades | ◐ (mixed) | ✗ | ✓ (reads) | ✗ | ✓ | ✗ | 35% |
| Vehicle Mods | ✓ | ✗ | ✓ (N/A) | ✓ (not used) | ✓ | N/A | 60% |
| Vehicle Templates | ✓ | ✗ | ✗ | ✗ (overrides) | ✓ | N/A | 40% |
| Vehicle Combat | ✗ | ✗ | ✗ | ✗ | ✓ | N/A | 10% |

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

**V2 Compliance Rating: 35%**

**Summary:**
- ✓ ModifierEngine correctly reads upgrades
- ✓ Vehicle Modification UI correctly routes through ActorEngine
- ✗ Armor/Equipment upgrades bypass ActorEngine
- ✗ Vehicle combat systems completely unintegrated (16+ violations)
- ✗ Derived stat handling inconsistent (written as literals, not computed)
- ✗ Atomicity gaps in multi-step operations
- ✗ Removal not symmetrical

**Immediate Actions Required:**
1. Fix vehicle combat engine mutations (CRITICAL)
2. Route armor/equipment upgrades through ActorEngine governance (HIGH)
3. Implement DerivedCalculator for vehicle template application (HIGH)
4. Implement atomicity pattern for credit + upgrade transactions (MEDIUM)

**System is usable but brittle.** Modifications work in normal flow but violate sovereignty at multiple points. Combat operations on vehicles are completely unintegrated with V2 pipeline.
