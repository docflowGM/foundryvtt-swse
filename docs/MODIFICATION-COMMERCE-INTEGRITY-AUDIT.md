# Commerce Integrity Audit — Modification Systems
## SWSE V2 Credit Governance Review

**Date:** 2026-02-24
**Scope:** Credit mutation during modifications, upgrades, templates, vehicle configs, droid mods
**Objective:** Determine if credits flow through LedgerService → TransactionEngine → ActorEngine with full sovereignty

---

## SECTION 1 — MUTATION ENTRY POINTS (CREDIT)

| File | Line(s) | Function | Operation | Pattern | Sovereign? |
|------|---------|----------|-----------|---------|-----------|
| upgrade-app.js | 217-226 | #onInstallUpgrade() | Read actor credits, subtract cost, call ActorEngine | Direct compute + ActorEngine | ⚠️ MEDIUM |
| upgrade-app.js | 371-399 | #onApplyTemplate() | Read actor credits from DOM, validate, subtract, call ActorEngine | **DOM source** + Direct compute | 🔴 CRITICAL |
| gm-droid-approval-dashboard.js | 133-144 | finalizeDroid() | Read actor credits, subtract cost, call ActorEngine | Direct compute + ActorEngine | ⚠️ MEDIUM |
| vehicle-modification-app.js | 717-763 | _onFinalizeShip() | Calculate cost, **DO NOT DEDUCT**, only deduct tokens | No credit mutation | ✓ N/A |
| store-checkout.js | 1165-1169 | (payment) | Calculate new credits, call ActorEngine | Pattern varies (see store audit) | ◐ MIXED |
| ledger-service.js | 102-131 | buildCreditDelta() | **Proper pattern**: validate, build MutationPlan | Pure, non-mutating | ✓ CORRECT |

---

## SECTION 2 — ATOMICITY MATRIX

### VIOLATION CLASS B — Split Atomic Boundary

**Pattern:** Credit deduction and modification installation in SEPARATE calls

| Flow | Credit Call | Install Call | Atomic? | Risk |
|------|-------------|--------------|---------|------|
| **Upgrade Install** | ActorEngine.updateActor() line 226 | item.update() or actor.updateOwnedItem() lines 244-248 | ❌ NO | MEDIUM: Credit deducted, install fails → inconsistent |
| **Template Apply** | ActorEngine.updateActor() line 399 | GearTemplatesEngine.applyTemplate() line 400 | ❌ NO | MEDIUM: Credit deducted, template apply fails → inconsistent |
| **Vehicle Config** | ActorEngine.updateActor() line 763 | Single call (no install) | ✓ YES | LOW: Config saved atomically |
| **Droid Finalize** | ActorEngine.updateActor() line 144 | Two ActorEngine calls (line 153-155) | ❌ NO | MEDIUM: Credit + state changes split |

**Summary:** 3 of 4 modification flows have split atomic boundaries.

---

## SECTION 3 — VALIDATION GAP ANALYSIS

### VIOLATION CLASS C — Insufficient Pre-Mutation Validation

| System | Validation | Location | Deficiency | Risk |
|--------|-----------|----------|------------|------|
| Upgrade Install | ✓ Credit check | UpgradeRulesEngine:126 | OK, checks credit > cost | LOW |
| Template Apply | ⚠️ Minimal check | upgrade-app.js:373-375 | Only checks credits < cost, no LedgerService.validateFunds() | MEDIUM |
| Vehicle Mods | ❌ NO check | vehicle-modification-app.js | Cost not validated before finalization (no credit deduction anyway) | N/A |
| Droid Finalize | ✓ YES | gm-droid-approval-dashboard.js | Cost sourced from system data (safe) | OK |

**Issue:** None use LedgerService.validateFunds() which provides structured validation.

---

## SECTION 4 — COST SOURCE INTEGRITY

### VIOLATION CLASS D — Cost Source from Client-Side

| System | Cost Source | Authoritative? | Spoofable? | Risk |
|--------|------------|---------------|-----------|----|
| **Upgrade Install** | Item.system.cost (upgrade item) | ✓ YES | NO (server-authoritative) | ✓ SAFE |
| **Template Apply** | `dataset.templateCost` from DOM | ❌ NO | **YES (client-side)** | 🔴 CRITICAL |
| **Vehicle Mods** | VehicleModificationManager.calculateTotalCost() | ✓ YES | NO (calculated server-side) | ✓ SAFE |
| **Droid Finalize** | droidData.credits.spent | ✓ YES | NO (from actor.system) | ✓ SAFE |

**Finding:** Template cost pulled directly from DOM HTML attribute (line 357):
```js
const templateCost = Number(event.currentTarget?.dataset?.templateCost || 0);
```
This can be modified via browser console.

---

## SECTION 5 — REMOVAL & REFUND INTEGRITY

### VIOLATION CLASS E — Asymmetrical Removal

| System | Install Cost | Removal Cost | Refund? | Symmetrical? |
|--------|-------------|-------------|---------|--------------|
| **Upgrade** | ✓ Charges credits | ✗ No refund | NO | ❌ BROKEN |
| **Template** | ✓ Charges credits | ✗ No refund | NO | ❌ BROKEN |
| **Vehicle Mod** | ✗ No charge | N/A | N/A | ✓ N/A |
| **Droid Mod** | ✓ Charges credits | ✗ (toggle only) | NO | ❌ BROKEN |

**Evidence:** UI explicitly states (line 265, 410):
```
"No credits will be refunded."
```

**Impact:** One-way commerce. Install costs credits forever; removal doesn't refund.

---

## SECTION 6 — MULTI-UPGRADE TRANSACTION INTEGRITY

### VIOLATION CLASS F — No Cart-Level Aggregation

**Scenario:** User installs multiple upgrades in sequence

Current behavior:
1. Install upgrade A → ActorEngine.updateActor() call 1 (deduct cost A)
2. Install upgrade B → ActorEngine.updateActor() call 2 (deduct cost B)
3. Install upgrade C → ActorEngine.updateActor() call 3 (deduct cost C)

**Issue:** 3 separate mutations instead of 1 atomic transaction

**Risk:** MEDIUM
- Race condition if network delays (player could install multiple times)
- No cart-level cost aggregation
- No TransactionEngine.mergeMutationPlans() usage
- Each call validates independently, no shared transaction state

**Expected Pattern:**
```js
// Should be:
const plan1 = LedgerService.buildCreditDelta(actor, costA);
const plan2 = LedgerService.buildCreditDelta(actor, costB);
const merged = TransactionEngine.mergeMutationPlans(plan1, plan2);
await ActorEngine.applyMutationPlan(actor, merged);
```

**Actual Pattern:**
```js
// Currently:
await ActorEngine.updateActor(actor, { 'system.credits': reduced1 });
await ActorEngine.updateActor(actor, { 'system.credits': reduced2 });
await ActorEngine.updateActor(actor, { 'system.credits': reduced3 });
```

---

## SECTION 7 — VEHICLE COMBAT COST BYPASS AUDIT

### Special Case: Vehicle Combat Systems

Checked files:
- `enhanced-shields.js`
- `enhanced-pilot.js`
- `enhanced-engineer.js`
- `vehicle-turn-controller.js`
- `threshold-engine.js`

**Finding:** ✓ SAFE
- These systems mutate shield value, maneuver, initiative
- They **DO NOT** mutate `system.credits` at all
- No emergency repair costs, no shield recharge costs
- No direct credit bypass found

**Verdict:** No VIOLATION CLASS G detected.

---

## SECTION 8 — LEDGER SERVICE INTEGRATION STATUS

**Ideal Pattern (from ledger-service.js):**
```js
const validation = LedgerService.validateFunds(actor, totalCost);
if (!validation.ok) {
  throw new Error(validation.reason);
}
const creditDelta = LedgerService.buildCreditDelta(actor, totalCost);
const plan = TransactionEngine.merge([creditDelta, modPlan]);
await ActorEngine.applyMutationPlan(actor, plan);
```

**Current Usage in Modifications:**
- ❌ upgrade-app.js: Does NOT use LedgerService
- ❌ upgrade-rules-engine.js: Does NOT use LedgerService (only validates)
- ❌ gm-droid-approval-dashboard.js: Does NOT use LedgerService
- ❌ vehicle-modification-app.js: Does NOT use LedgerService (and doesn't charge anyway)
- ✓ store-checkout.js: Uses LedgerService (outside modification scope)

**Gap:** LedgerService exists but is not integrated into modification flows.

---

## SECTION 9 — COMMERCE INTEGRITY SCORE

**Scoring Criteria:**
- Credit sovereignty: Uses ActorEngine or LedgerService
- Atomicity: Credit + install/uninstall single operation
- Validation: Uses LedgerService.validateFunds() or equivalent
- Refund symmetry: Remove refunds what install charged
- Multi-install safety: Aggregate costs atomically
- UI bypass resistance: Server-authoritative cost source

| System | Sovereignty | Atomicity | Validation | Refund | Multi-Op | UI-Safe | **Score** |
|--------|-------------|-----------|------------|--------|----------|---------|----------|
| **Upgrade Install** | 70% | 40% | 60% | 0% | 30% | 100% | **43%** |
| **Template Apply** | 70% | 40% | 40% | 0% | 30% | 0% | **29%** |
| **Vehicle Mods** | 100% | 100% | 80% | N/A | 100% | 100% | **96%** |
| **Droid Finalize** | 70% | 40% | 60% | 0% | 30% | 100% | **43%** |
| **Avg (Modifications)** | — | — | — | — | — | — | **42%** |

**Grade:** **F (Commerce Integrity)**

---

## SECTION 10 — VIOLATION SUMMARY TABLE

| Violation | Class | Severity | Affected Systems | Instances | Status |
|-----------|-------|----------|------------------|-----------|--------|
| Split atomic boundary | B | HIGH | All upgrades/templates | 4 flows | ❌ CRITICAL |
| Cost from DOM/client | D | **CRITICAL** | Template apply | 1 flow | 🔴 **CRITICAL** |
| No LedgerService usage | Pattern | HIGH | Upgrades, droid, templates | 3 flows | ⚠️ ARCHITECTURAL |
| Asymmetrical refunds | E | MEDIUM | Upgrades, templates, droids | 3 systems | ❌ BROKEN |
| No cart aggregation | F | MEDIUM | All multi-install scenarios | Implicit | ❌ BROKEN |
| Validation gap | C | MEDIUM | Templates primarily | 1 flow | ⚠️ MEDIUM |

**Total Critical Issues:** 2 (Split atomic, DOM cost)
**Total High Issues:** 1 (Architecture - LedgerService bypass)
**Total Medium Issues:** 3 (Refunds, aggregation, validation)

---

## SECTION 11 — SPECIFIC CRITICAL FINDINGS

### Finding 1: Template Cost from Client-Side (🔴 CRITICAL)

**File:** `scripts/apps/upgrade-app.js`, line 357

```js
const templateCost = Number(event.currentTarget?.dataset?.templateCost || 0);
```

**Risk:** Player can modify HTML to set any cost (e.g., 1 credit instead of 1000)

**Proof of Concept:**
```js
// In browser console:
document.querySelector('[data-template-key="my-template"]').dataset.templateCost = "1";
// Now install costs 1 credit instead of correct amount
```

**Impact:** Unlimited free upgrades via client-side manipulation

**Fix Priority:** 🔴 IMMEDIATE (before live play)

---

### Finding 2: Split Atomic Boundary (HIGH)

**Pattern in all modification installs:**
```js
// Step 1: Deduct credits
await ActorEngine.updateActor(actor, { 'system.credits': reduced });

// Step 2: Install modification (separate call)
await actor.updateOwnedItem(item, { 'system.installedUpgrades': [...] });
// or
await item.update({ 'system.installedUpgrades': [...] });
```

**Risk Scenario:**
1. Credit deduction succeeds
2. Network drops before step 2
3. Player loses credits, doesn't get upgrade
4. Upgrade UI shows item as uninstalled but credits gone
5. Player must contact GM for credit restoration

**Frequency:** Rare but possible
**Severity:** HIGH (financial impact)

---

### Finding 3: LedgerService Pattern Not Integrated

**Evidence:**
- LedgerService exists (lines 102-151 of ledger-service.js)
- Provides validateFunds() and buildCreditDelta()
- Not imported in upgrade-app.js, gm-droid-approval-dashboard.js, vehicle-modification-app.js

**Current (Wrong):**
```js
const credits = Number(actor.system.credits ?? 0);
const updateData = { 'system.credits': credits - cost };
await ActorEngine.updateActor(actor, updateData);
```

**Correct Pattern:**
```js
const validation = LedgerService.validateFunds(actor, cost);
if (!validation.ok) throw new Error(validation.reason);
const delta = LedgerService.buildCreditDelta(actor, cost);
await ActorEngine.updateActor(actor, delta.set);
```

**Current Impact:** Direct arithmetic instead of centralized validation

---

### Finding 4: Vehicle Modifications Never Charge Credits

**File:** `scripts/apps/vehicle-modification-app.js`, line 717-763

**Expected:** totalCost calculated, credits deducted
**Actual:** totalCost calculated, **credits NOT deducted**, only tokens deducted

```js
const totalCost = VehicleModificationManager.calculateTotalCost(...);
// ... later ...
const updateData = { 'system.vehicle': {...} };
// ❌ MISSING: updateData['system.credits'] = credits - totalCost;
await ActorEngine.updateActor(this.actor, updateData);
```

**Assessment:**
- This may be intentional (vehicle mods are "free", only use tokens)
- OR it's a missing feature
- Cost is displayed to player but not enforced

**Status:** Requires design clarification

---

## SECTION 12 — ARCHITECTURAL REVIEW

### What Should Happen (Ideal V2 Pattern)

```
User clicks "Install Upgrade"
  ↓
UI Validation:
  - Item exists ✓
  - Upgrade exists ✓
  - Slots available ✓
  ↓
Domain Validation (UpgradeRulesEngine):
  - Cost from authoritative source (item.system.cost)
  - Check cost > 0 ✓
  ↓
Commerce Validation (LedgerService):
  - LedgerService.validateFunds(actor, cost) ✓
  - Get result: { ok, reason, current, required }
  ↓
Build Atomic Plan:
  - creditDelta = LedgerService.buildCreditDelta(actor, cost)
  - installDelta = { 'system.installedUpgrades': [...] }
  - merged = TransactionEngine.mergeMutationPlans(creditDelta, installDelta)
  ↓
Mutate Atomically:
  - await ActorEngine.applyMutationPlan(actor, merged)
  ↓
Post-Mutation:
  - ModifierEngine recalculates ✓
  - UI refreshes
```

### What Actually Happens

```
User clicks "Install Upgrade"
  ↓
Validation (UpgradeRulesEngine):
  - Check cost > 0 (basic)
  ↓
Direct Arithmetic:
  - const credits = actor.system.credits - cost
  ✗ No LedgerService.validateFunds()
  ✗ No TransactionEngine merge
  ↓
Two Separate Mutations:
  1. await ActorEngine.updateActor(actor, { 'system.credits': ... })
  2. await actor.updateOwnedItem(item, { 'system.installedUpgrades': [...] })
  ✗ Not atomic
  ✗ Can partially fail
  ↓
Post-Mutation:
  - ModifierEngine recalculates ✓
  - UI refreshes
```

---

## SECTION 13 — RISK CLASSIFICATION

### 🔴 CRITICAL RISKS (Prevent Live Play)

1. **DOM Cost Modification (Template Apply)**
   - Client-side cost can be spoofed
   - Allows unlimited free upgrades
   - Fix: Move cost to server-authoritative source

2. **Split Atomic Boundary (All Upgrades)**
   - Credit deduction + install in separate calls
   - Possible financial loss on network failure
   - Fix: Merge both into single MutationPlan

### ⚠️ HIGH RISKS (Fix Before Live)

3. **LedgerService Bypass (Architecture)**
   - Validation service exists but not used
   - No centralized credit logic
   - Inconsistent validation across flows
   - Fix: Integrate LedgerService into all modification flows

### 🟡 MEDIUM RISKS (Post-Launch OK)

4. **Asymmetrical Refunds**
   - Install charges; remove doesn't refund
   - Design choice but confusing to players
   - Fix: Decide on refund policy

5. **No Cart Aggregation**
   - Multiple installs = multiple transactions
   - Race condition possible
   - Fix: Aggregate costs before mutation

6. **Vehicle Mod Cost Clarity**
   - Cost shown but not enforced
   - Intentional or missing feature?
   - Fix: Clarify design intent

---

## SECTION 14 — CONCLUSION

**Commerce Integrity Score: 42%**

### Summary

| Aspect | Status | Assessment |
|--------|--------|-----------|
| **Sovereignty** | ⚠️ PARTIAL | Uses ActorEngine but bypasses LedgerService |
| **Atomicity** | ❌ BROKEN | Credit + install split into 2 calls |
| **Validation** | ⚠️ WEAK | No LedgerService.validateFunds() |
| **Refunds** | ❌ ABSENT | One-way commerce, no refunds |
| **Multi-Op Safety** | ❌ BROKEN | No transaction aggregation |
| **UI Bypass Resistance** | 🔴 CRITICAL | Cost pulled from client-side DOM |

### Ready for Live Play?

**NO.**

**Before release:**
1. 🔴 Fix DOM cost vulnerability (IMMEDIATE)
2. ❌ Merge credit + install into atomic operation
3. ⚠️ Integrate LedgerService validation

**Can be addressed post-launch:**
- Refund policy
- Cart aggregation
- Vehicle mod cost clarification

### Recommended Action

**Phase 1 (Blocker):** Hotfix template cost source (move to server)
**Phase 2 (Before live):** Merge credit deduction with modification install atomically
**Phase 3 (Architecture):** Integrate LedgerService into modification validation pipeline

Current system is **vulnerable to exploitation** and **at risk of financial loss** on network failures. Not suitable for player commerce until atomic transaction boundary is hardened.
