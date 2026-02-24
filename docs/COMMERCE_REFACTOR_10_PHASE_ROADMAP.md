# Commerce System Refactor: 10-Phase Strategic Roadmap

## Vision

Transform the commerce pipeline from **mutation chaos** → **centralized mutation** → **atomic mutation**.

The store, vehicle builder, droid builder, and starship builder will share a **single sovereign transaction pathway** with proper atomicity, rollback, and placement routing.

---

## 10-Phase Execution Plan

### 🔷 Phase 1 — Mutation Boundary Stabilization
**Duration:** 1 session
**Scope:** Surgical, minimal, foundation-only

**Goal:** Stop mutation leaks from `itemGrantCallback`

**Changes:**
- ✅ Change `itemGrantCallback` signature: `() => void` → `() => MutationPlan[]`
- ✅ Remove `await createActor()` from callback
- ✅ Remove direct `actor.update()` from callback
- ✅ Return MutationPlans instead of mutating
- ✅ Update `StoreEngine.purchase()` to apply returned plans via `ActorEngine`

**Affected Files:**
- `scripts/engines/store/store-engine.js` — Update `purchase()` method
- `scripts/apps/store/store-checkout.js` — Update `itemGrantCallback` implementations
- `scripts/apps/store/store-checkout.js` — Modify `buyVehicle()`, `buyDroid()`

**Not Changed (Yet):**
- ❌ Credit deduction still happens before callback (atomicity fix in Phase 4)
- ❌ Ownership assignment not yet abstracted (PlacementRouter in Phase 6)
- ❌ TransactionEngine not introduced yet
- ❌ StoreEngine core logic remains

**Verification:**
- Store checkout still works (items, droids, vehicles purchased)
- Cart still persists
- Credits still deducted
- No new bugs introduced

**Risk Level:** LOW — Mutation is now routed through ActorEngine, which is tested

---

### 🔷 Phase 2 — ActorEngine Create Support
**Duration:** 1 session
**Scope:** Extend MutationPlan schema

**Goal:** Enable ActorEngine to create actors atomically via MutationPlan

**Changes:**
- ✅ Add `create.actors` bucket to MutationPlan
- ✅ Update merge logic to handle `create` operations
- ✅ Implement `ActorEngine.applyMutationPlan()` phase: CREATE → DELETE → SET → ADD
- ✅ Ensure temporary IDs resolve correctly
- ✅ Ensure transaction semantics (all or nothing)

**Affected Files:**
- `scripts/governance/actor-engine/actor-engine.js`
- `scripts/governance/actor-engine/mutation-plan.js`
- `scripts/governance/actor-engine/mutation-compiler.js`

**Not Changed (Yet):**
- ❌ Commerce system doesn't use this yet
- ❌ Atomicity across multiple actors still partial

**Verification:**
- Create single actor via MutationPlan
- Create multiple actors via MutationPlan
- Rollback works (no partial creation)
- Temporary IDs resolve

**Risk Level:** MEDIUM — New ActorEngine capability, needs testing

---

### 🔷 Phase 3 — LedgerService Extraction
**Duration:** 1 session
**Scope:** Separate validation from mutation

**Goal:** Decouple credit logic from transaction execution

**Changes:**
- ✅ Create `LedgerService` class
- ✅ Extract credit validation into `LedgerService.validateCredit(actor, cost)`
- ✅ Create `LedgerService.createCreditPlan(actor, cost)` — returns MutationPlan (credits delta only)
- ✅ Remove direct `actor.update({ credits })` from StoreEngine
- ✅ Remove direct credit mutations from anywhere in store layer

**Affected Files:**
- `scripts/engines/store/ledger-service.js` (NEW)
- `scripts/engines/store/store-engine.js` — Remove credit mutation
- `scripts/engines/store/store-transaction-engine.js` — Use LedgerService

**Not Changed (Yet):**
- ❌ TransactionEngine still doesn't exist
- ❌ Merge logic still sequential

**Verification:**
- Credit validation works
- Credit plan returns MutationPlan
- No direct actor.update in store layer

**Risk Level:** MEDIUM — Refactors existing logic, needs integration tests

---

### 🔷 Phase 4 — TransactionEngine Introduction
**Duration:** 2 sessions
**Scope:** Centralize and atomicize

**Goal:** Create sovereign transaction orchestrator with atomicity

**Changes:**
- ✅ Implement `TransactionEngine.execute(cart, purchaser, options)`
- ✅ Orchestrate: validate → compile plans → merge → apply
- ✅ Move credit deduction INSIDE transaction boundary
- ✅ Apply all plans atomically via single `ActorEngine.applyMutationPlan()` call
- ✅ Implement rollback (refund credits if actor creation fails)
- ✅ Replace `StoreEngine.purchase()` call with `TransactionEngine.execute()`

**Phases:**
1. Validate all items, purchaser, credits (read-only)
2. Compile grant plans (Items, Droids, Vehicles)
3. Compile credit plan (LedgerService)
4. Compile placement plans (PlacementRouter — will exist by Phase 6)
5. Merge all plans
6. Apply atomically via ActorEngine
7. If any step fails: rollback and return error

**Affected Files:**
- `scripts/engines/store/transaction-engine.js` (NEW)
- `scripts/apps/store/store-checkout.js` — Use TransactionEngine
- `scripts/engines/store/store-engine.js` — Remove purchase logic (delegate to TransactionEngine)

**Not Changed (Yet):**
- ❌ PlacementRouter doesn't exist yet (hardcoded routing continues)
- ❌ VehicleBuilder still uses old system.vehicle config pattern

**Verification:**
- Single-item purchases work
- Multi-item purchases work
- Failure cases: partial state impossible
- Refund happens on failure
- Atomicity tests pass

**Risk Level:** HIGH — Core commerce rewrite, comprehensive testing required

---

### 🔷 Phase 5 — VehicleFactory Implementation
**Duration:** 1 session
**Scope:** Convert Starship Builder to factory pattern

**Goal:** Stop storing ghost config on character; compile to actor on-demand

**Changes:**
- ✅ Create `VehicleFactory` class
- ✅ Builder returns `buildSpec` only (not config on character)
- ✅ `VehicleFactory.createFromBuildSpec(spec)` → returns MutationPlan
- ✅ Remove `system.vehicle` storage from character
- ✅ Remove `SWSEVehicleHandler.applyVehicleTemplate()` from critical path
- ✅ Integrate with TransactionEngine (Phase 4 completed first)

**Affected Files:**
- `scripts/engines/vehicles/vehicle-factory.js` (NEW)
- `scripts/apps/vehicle-modification-app.js` — Return buildSpec, not persist config
- `scripts/apps/vehicle-modification-manager.js` — Support factory compilation

**Not Changed (Yet):**
- ❌ PlacementRouter still doesn't exist
- ❌ Droid builder not yet refactored

**Verification:**
- Starship builder workflow still works (from UI perspective)
- Vehicle created when purchase completes
- Config no longer pollutes character schema
- Vehicle has all required fields (category, domain, derived fields)

**Risk Level:** MEDIUM — High UX impact, needs careful testing

---

### 🔷 Phase 6 — PlacementRouter Introduction
**Duration:** 1 session
**Scope:** Remove hardcoded ownership, enable routing

**Goal:** Abstract placement logic for any purchaser type

**Changes:**
- ✅ Implement `PlacementRouter.route(purchaser, templateType, context)`
- ✅ Routes:
  - Character/Droid/NPC → possessions (embedded in actor)
  - Vehicle (purchaser is vehicle) → hangar collection
  - NPC → NPC inventory (future: faction ownership)
- ✅ Remove hardcoded `ownership = { [game.user.id]: 3 }` assignments
- ✅ Return placement metadata (not mutations — just routing decision)
- ✅ Integrate with TransactionEngine (Phase 4 completed first)

**Affected Files:**
- `scripts/engines/store/placement-router.js` (NEW)
- `scripts/apps/store/store-checkout.js` — Use router instead of hardcoding ownership
- `scripts/engines/store/transaction-engine.js` — Consult PlacementRouter

**Not Changed (Yet):**
- ❌ Vehicle hangar collection doesn't exist yet (separate phase)
- ❌ Faction ownership system not implemented

**Verification:**
- Character purchases work
- NPC purchases work (if purchaser is NPC)
- Droid purchases work
- Vehicle purchases work
- Routing logic is testable independently
- No hardcoded ownership in commerce layer

**Risk Level:** MEDIUM — Changes actor ownership semantics, needs full test suite

---

### 🔷 Phase 7 — Droid Factory Refactor
**Duration:** 1 session
**Scope:** Align droid builder with vehicle builder

**Goal:** Unified factory pattern for both Droids and Vehicles

**Changes:**
- ✅ Create `DroidFactory` class
- ✅ Convert droid creation to MutationPlan factory
- ✅ Remove direct `Actor.create()` from droid builder
- ✅ Integrate droid purchases with TransactionEngine
- ✅ Droid builder returns buildSpec (like vehicle builder)

**Affected Files:**
- `scripts/engines/droids/droid-factory.js` (NEW)
- `scripts/apps/store/store-checkout.js` — Use factory for droids
- `scripts/apps/chargen/chargen-main.js` — Support factory pattern

**Not Changed (Yet):**
- ❌ Custom droid approval workflow not yet refactored

**Verification:**
- Store droid purchases work
- Custom droid builder workflow works
- Droid and vehicle purchases follow same pipeline
- No direct actor creation

**Risk Level:** MEDIUM — Affects droid builder workflow, needs careful testing

---

### 🔷 Phase 8 — Remove Legacy Paths
**Duration:** 1 session
**Scope:** Delete old, now-unused code

**Goal:** Eliminate mutation chaos completely

**Changes:**
- ✅ Delete `StoreEngine.purchase()` (replaced by TransactionEngine)
- ✅ Delete old callback implementations
- ✅ Delete refund logic (now handled atomically)
- ✅ Delete direct actor.update calls from store layer
- ✅ Delete `SWSEVehicleHandler.applyVehicleTemplate()` usage in purchase path
- ✅ Delete `system.vehicle` config storage from character schema

**Affected Files:**
- `scripts/engines/store/store-engine.js` — Remove purchase() method
- `scripts/apps/store/store-checkout.js` — Remove old callbacks
- `scripts/actors/vehicle/swse-vehicle-handler.js` — Remove from critical path
- Vehicle data model migration (remove system.vehicle)

**Not Changed (Yet):**
- ❌ Any non-purchase usage of these functions (unlikely)

**Verification:**
- All tests still pass
- No references to deleted functions remain
- Commerce layer is now singular in mutation path

**Risk Level:** LOW — Only deleting already-replaced code

---

### 🔷 Phase 9 — Integration Testing & Simulation
**Duration:** 2 sessions
**Scope:** Comprehensive multi-scenario validation

**Goal:** Ensure atomicity, rollback, and correctness across all scenarios

**Test Scenarios:**
- ✅ Single item purchase (cheap, common case)
- ✅ Single droid purchase
- ✅ Single vehicle purchase
- ✅ Multi-item purchase (item + droid + vehicle)
- ✅ Vehicle purchase with hangar placement
- ✅ NPC purchaser
- ✅ Vehicle purchasing another vehicle (hangar)
- ✅ Actor creation failure → credits refunded, no partial state
- ✅ Credit insufficient → rejected pre-emptively
- ✅ Cart revalidation → stale items removed
- ✅ Concurrent purchases → locked per actor

**Test Coverage:**
- Unit tests for factories
- Unit tests for PlacementRouter
- Unit tests for LedgerService
- Integration tests for TransactionEngine
- Scenario tests for multi-item combos

**Affected Files:**
- `tests/commerce/` (NEW)
- `tests/store/` (NEW)
- `tests/transaction/` (NEW)

**Not Changed (Yet):**
- ❌ UI layer (separate from logic)

**Verification:**
- All scenarios pass
- No partial state corruption detected
- Conflict detection works
- Rollback is transparent

**Risk Level:** LOW — Pure testing, no mutation changes

---

### 🔷 Phase 10 — UI Finalization
**Duration:** 1 session
**Scope:** Polish user experience

**Goal:** Ensure error messages, feedback, and visual consistency

**Changes:**
- ✅ Polish error handling (detailed messages)
- ✅ Implement success feedback
- ✅ Clear cart on successful purchase
- ✅ Re-render sheets after purchase
- ✅ Show hangar tab (if vehicle purchased)
- ✅ Handle edge cases (actor no longer exists, insufficient permissions, etc.)

**Affected Files:**
- `scripts/apps/store/store-main.js` — Re-render logic
- `scripts/apps/store/store-checkout.js` — Error/success messaging
- `templates/apps/store/` — UI feedback

**Verification:**
- User sees clear success/failure messages
- Cart clears on success
- Actor sheets re-render
- Hangar shows vehicles
- No console errors

**Risk Level:** LOW — UI polish only, no logic changes

---

## Phase Dependencies

```
Phase 1 (Mutation Boundary)
  ↓
Phase 2 (ActorEngine Create)
  ↓
Phase 3 (LedgerService)
  ↓
Phase 4 (TransactionEngine) ← Core foundation
  ├─ Phase 5 (VehicleFactory)
  ├─ Phase 6 (PlacementRouter)
  ├─ Phase 7 (DroidFactory)
  └─ Phase 8 (Remove Legacy)
  ↓
Phase 9 (Integration Testing)
  ↓
Phase 10 (UI Finalization)
```

---

## Success Criteria (Final State)

After Phase 10:

✅ **No direct Actor.create() in commerce layer**
✅ **No hardcoded ownership** (routing abstracted)
✅ **All mutations via ActorEngine**
✅ **All actor creation returns MutationPlans**
✅ **Credit deduction is atomic with actor creation**
✅ **Rollback is guaranteed** (no partial state)
✅ **Supports any purchaser type** (character, droid, NPC, vehicle, faction)
✅ **Supports any target placement** (inventory, embedded, hangar, faction)
✅ **Comprehensive test coverage**
✅ **Clean, readable code** (no legacy paths)

---

## Risk Management

**If Phase 4 is blocked:**
- Phases 1-3 are still valuable stabilization
- Can halt after Phase 4 and integrate later
- Won't break existing behavior

**If Phase 6 (PlacementRouter) encounters edge cases:**
- Can use temporary hardcoded routing
- Doesn't block later phases
- Will be addressed in Phase 6+

**If Phase 9 (Testing) fails:**
- Return to earlier phases
- Fix issues incrementally
- Do not skip to Phase 10

---

## Rollback Plan (If Needed)

Each phase is independently reversible:
- Phase 1: Revert itemGrantCallback changes
- Phase 2: Revert ActorEngine.applyMutationPlan()
- Phase 3: Revert LedgerService, restore StoreEngine
- Phase 4: Revert TransactionEngine, restore StoreEngine.purchase()

Git branches will preserve the ability to revert at any point.

---

## Timeline Estimate

**Aggressive (focused work):** 10 sessions
**Comfortable (testing-focused):** 15 sessions
**Conservative (comprehensive testing):** 20 sessions

---

## Next Immediate Action

**Phase 1 implementation** (see companion doc: PHASE_1_IMPLEMENTATION_PLAN.md)

This is a surgical, minimal fix that:
- Stops mutation leaks
- Introduces no new systems
- Keeps existing behavior
- Prepares foundation for Phase 2+
