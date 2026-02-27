# Phase 1: Store System Audit — SSOT → Engine → UI Compliance

**Status:** Analysis Complete
**Date:** 2026-02-10
**Scope:** Full store system (scripts/apps/store/*, scripts/engine/store/*, related compendiums)

---

## CRITICAL VIOLATIONS

### 1. Business Logic in UI Layer

**Location:** `scripts/apps/store/store-checkout.js`

| Violation | Line(s) | Move To |
|-----------|---------|---------|
| Credit sufficiency check | 194–196 | StoreEngine.canPurchase() |
| Credit deduction | 200–201, 272–273 | StoreEngine.purchase() |
| Cost calculation calls | 61, 110, 152 | Engine (pricing policy) |
| Actor mutation | 201, 273 | Engine (atomic transaction) |
| Droid/vehicle purchase validation | 245–258, 298–315 | StoreEngine.canPurchase() |

**Impact:**
- No centralized purchase authority
- Credit checks scattered across multiple functions
- Risk of partial transactions
- Violates "engine owns invariants" principle

---

### 2. Direct Compendium Access (SSOT Bypass)

**Location:** `scripts/apps/store/store-checkout.js`, `scripts/apps/store/store-inventory.js`

| Location | Pattern | Violation |
|----------|---------|-----------|
| `addDroidToCart()` line 98 | `game.packs.get('foundryvtt-swse.droids')` | UI reading SSOT directly |
| `buyDroid()` line 239 | `game.packs.get('foundryvtt-swse.droids')` | Hardcoded pack name |
| `store-inventory.js` lines 26–37 | Direct `game.packs` + `game.items` queries | No engine intermediary |

**Impact:**
- UI depends on compendium structure/names
- No filtering, validation, or policy enforcement
- Inventory changes require UI code changes
- Violates "engine is SSOT proxy" principle

**Required:** All compendium reads must go through `StoreEngine.getInventory()`

---

### 3. Pricing Logic in UI

**Location:** `scripts/apps/store/store-pricing.js`, called from `store-checkout.js`

| Issue | Line(s) | Problem |
|-------|---------|---------|
| Markup/discount from settings | 17–18 | `game.settings.get()` in business logic |
| Markup applied inline | 16–20 | No policy object; no audit trail |
| Used vehicle discount | 151–152 | Hardcoded 0.5 multiplier in UI |
| Cost normalization | 27–60 | ID repair + cost calc mixed |

**Impact:**
- Business rules (markup, discount) read from settings in UI
- No way to apply per-NPC, per-faction, or dynamic pricing
- Used pricing hardcoded (not policy-driven)
- Violates "engine owns business rules" principle

**Required:**
- Pricing policies must be defined in engine
- Settings should only configure engine initialization
- `StoreEngine.getInventory()` returns pre-priced inventory

---

### 4. Name-Based and String-Based Item Lookups

**Location:** Multiple files

| Pattern | File | Line(s) | Problem |
|---------|------|---------|---------|
| Hardcoded pack name | `store-checkout.js` | 98, 239 | `'foundryvtt-swse.droids'` |
| Hardcoded pack name | `store-checkout.js` | 98, 239 | `'foundryvtt-swse.vehicles'` (implicit) |
| Fallback ID gen | `store-pricing.js` | 39, 80 | `fallback-${name}` IDs |
| Item ID fuzzy search | `store-checkout.js` | 37–42 | Searches both `.id` and `._id` |

**Impact:**
- No way to add new packs without code changes
- Fallback IDs prevent purchase (line 47–48)
- Fragile; breaks if compendium names change
- Violates "engine defines SSOT locations" principle

**Required:**
- Engine must know all valid pack names/locations
- No string-based item lookup
- IDs must be canonical and validated at load time

---

### 5. Direct Actor Mutation

**Location:** `scripts/apps/store/store-checkout.js`

| Function | Pattern | Problem |
|----------|---------|---------|
| `buyService()` | `await globalThis.SWSE.ActorEngine.updateActor(actor, ...)` | Line 201 |
| `buyDroid()` | `await globalThis.SWSE.ActorEngine.updateActor(store.actor, ...)` | Line 273 |

**Impact:**
- UI bypasses centralized purchase logic
- No atomic transaction guarantee
- Partial state possible (credit deducted, item not granted)
- Violates "engine executes atomic transactions" principle

**Required:**
- ALL actor updates must be coordinated by `StoreEngine.purchase()`
- Items + credits changed atomically
- No UI calls to `ActorEngine` directly for purchases

---

### 6. AppV2 Lifecycle Issues

**Location:** `scripts/apps/store/store-main.js`

| Issue | Pattern | Problem |
|-------|---------|---------|
| Cart state stored on actor flag | `_loadCartFromActor()`, line 118 | Persists transient UI state |
| Manual re-render calls | `store.render()` line 285 | UI state management unclear |
| Cart not cleared after purchase | `checkout()` | No reset signal back to UI |

**Impact:**
- Cart may persist across sessions unexpectedly
- No clean separation between app state and document state
- Re-renders required after each operation
- Violates "UI is declarative" principle

**Required:**
- Cart must be in-memory only (app instance)
- `purchase()` returns structured result
- UI updates declaratively based on purchase response

---

## ARCHITECTURAL ASSESSMENT

### SSOT Status: **BROKEN**
- Compendiums are authoritative but not enforced
- Engine doesn't act as intermediary
- UI reads compendiums directly
- No single "store index" object

### Engine Responsibility: **NONE (Currently Missing)**
- No centralized purchase authority
- No pricing policy object
- No inventory filtering/normalization
- No transaction atomicity guarantee
- No audit trail

### UI Responsibility: **OVER-EXTENDED**
- Implements credit checks (business logic)
- Reads compendiums directly (SSOT bypass)
- Mutates actors (violates AppV2 lifecycle)
- Contains pricing calculations (business logic)
- Manages its own state without engine feedback

---

## REQUIRED MIGRATIONS

### Phase 2: Engine Implementation

Must implement `StoreEngine` with:
```javascript
StoreEngine.getInventory(options)
  → builds normalized index from SSOT (compendiums)
  → applies pricing policies
  → returns filtered, categorized, priced inventory

StoreEngine.canPurchase(context)
  → validates actor eligibility
  → checks credit sufficiency
  → enforces legality/availability
  → returns structured {success, canPurchase, reason}

StoreEngine.purchase(context)
  → executes ATOMIC transaction (deduct credits + grant items)
  → emits audit log
  → returns {success, transactionId, error}
```

### Phase 3: SSOT Hardening

Must normalize store compendiums:
- [ ] Remove embedded logic from item metadata
- [ ] Standardize cost fields
- [ ] Add availability/legality metadata
- [ ] Eliminate name-based assumptions
- [ ] Ensure all items have canonical IDs

### Phase 4: UI Refactoring

Must remove from `store-main.js`, `store-checkout.js`:
- [ ] All credit checks → call `StoreEngine.canPurchase()`
- [ ] All cost calculations → use engine-provided prices
- [ ] All compendium reads → call `StoreEngine.getInventory()`
- [ ] All actor updates → call `StoreEngine.purchase()`
- [ ] All purchase logic → delegate to engine

Must keep in UI (helpers, display):
- `store-shared.js` - sanitization, display helpers
- `store-filters.js` - UI-side search/filter (NOT business logic)
- `store-constants.js` - UI configuration
- `dialogue/rendarr-dialogue.js` - NPC flavor

---

## VIOLATIONS SUMMARY

| Category | Count | Severity |
|----------|-------|----------|
| Business logic in UI | 8 | CRITICAL |
| Direct SSOT access | 3 | CRITICAL |
| Hardcoded strings | 5 | HIGH |
| Missing engine authority | 3 | CRITICAL |
| Actor mutation patterns | 2 | CRITICAL |
| AppV2 lifecycle issues | 2 | MEDIUM |

**Total Blockers:** 8 CRITICAL violations preventing SSOT → Engine → UI compliance

---

## NEXT: Phase 2 — Engine Implementation

The StoreEngine must become the single authority for:
1. Inventory access (compendium reads)
2. Purchase eligibility (credit, legality)
3. Transaction execution (atomic credit + item change)
4. Price calculation (policy-driven, not settings)

All violations listed above will be resolved by implementing and using the engine's public API.
