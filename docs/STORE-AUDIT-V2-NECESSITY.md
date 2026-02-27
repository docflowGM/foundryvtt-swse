# STORE SYSTEM AUDIT REPORT — V2 Necessity & Consolidation

**Date:** 2026-02-10
**Scope:** All store-related JS files
**Audit Method:** Responsibility mapping + architectural compliance check

---

## CRITICAL FINDINGS

### 1. MASSIVE REDUNDANCY: store-inventory.js Duplicates Entire Engine

**Status:** CRITICAL VIOLATION

`store-inventory.js` replicates 100% of the engine pipeline:
- Loader: `game.items.filter()` + `game.packs.get()` → engine/loader.js does this
- Normalizer: Filter by ID, validate → engine/normalizer.js does this
- Categorizer: `categorizeEquipment()` + weapon sorting → engine/categorizer.js does this
- Pricing: `addFinalCost()` + `addActorFinalCost()` → engine/pricing.js does this

**Why This Exists:** Pre-refactor, UI owned inventory management. Now redundant with engine pipeline.

**Consequence:**
- UI loads inventory twice (engine load + store-inventory load)
- Two sources of truth (engine index vs. UI categories)
- Maintenance burden: changes must propagate to both

---

### 2. DUPLICATE PRICING LOGIC: store-pricing.js vs. engine/pricing.js

**Status:** CRITICAL VIOLATION

`store-pricing.js` contains:
- `calculateFinalCost()` - Reads game.settings directly (should be in engine initialization)
- `addFinalCost()` + `addActorFinalCost()` - Replicates engine pricing pipeline
- `getStoreMarkup()` + `getStoreDiscount()` - Settings getters (should be engine constants)

`engine/pricing.js` already does all of this.

**Consequence:**
- Pricing calculated twice
- Settings read in UI (architectural violation)
- Fallback ID generation in UI (`fallback-${name}`) instead of engine validation

---

### 3. NAME-BASED CATEGORIZATION: weapon-categorization.js

**Status:** ANTI-V2 PATTERN

`categorizeWeapon()` function:
```javascript
if (name.toLowerCase().includes('grenade')) return 'explosives';
if (name.toLowerCase().includes('pistol')) return 'ranged-pistols';
```

**Violation:** Engine should categorize by `item.type` + system metadata, NOT name parsing.

**Consequence:**
- Fragile (renamed items break categorization)
- Not SSOT-compliant (categorization inferred from name, not data)
- Duplicates engine/categorizer.js responsibility

---

### 4. HARDCODED SERVICES DATA: store-inventory.js (lines 136–209)

**Status:** UI-ONLY DATA STORED IN "INVENTORY LOADER"

Services (dining, lodging, medical, transport, upkeep, vehicle rental) are hardcoded as static data.

**Why Problem:**
- Services are NOT inventory (not from compendiums)
- Services cost is data, not dynamic
- Should be in UI layer only (not "inventory management")
- Currently mixed with item/actor loading logic

**Consequence:**
- Conceptual confusion (services ≠ items)
- Makes UI think services come from inventory (they don't)
- Hard to extend (add new service category = edit loading logic)

---

## FILE-BY-FILE AUDIT

### File: `scripts/apps/store/store-main.js`

**Status:** Required (UI-only)
**Classification:** UI Orchestration
**Responsibilities:**
- ApplicationV2 lifecycle
- Cart management (transient UI state)
- Template context building
- Event delegation

**Current Issues:**
- None architectural (correct AppV2 pattern)
- Imports `store-checkout.js` (which now delegates to engine ✓)

**V2 Violations:** None
**Recommended Action:** Keep as-is. Already refactored in Phase 4.

---

### File: `scripts/apps/store/store-checkout.js`

**Status:** Required (but reduced)
**Classification:** UI Event Handlers + Item Grants
**Responsibilities:**
- Handle "add to cart" clicks (UI state mutation)
- Handle "purchase" clicks (delegate to engine, then handle results)
- Create actors from purchase (UI presentation responsibility)
- Display notifications (UI affordance)

**Current Issues:**
- ✓ Already refactored (Phase 4) to delegate to engine
- Still imports old `store-pricing.js` for `calculateFinalCost()`
- Still imports old helpers for actor creation ✓ (correct)

**V2 Violations:** Import of deprecated `calculateFinalCost` (see below)
**Recommended Action:**
- Remove import: `import { calculateFinalCost } from './store-pricing.js'`
- Replace calls to `calculateFinalCost()` with engine-provided prices
- Pricing now comes from engine inventory, NOT recalculated

---

### File: `scripts/apps/store/store-inventory.js`

**Status:** DELETE (Entirely Redundant)
**Classification:** v1 Inventory Loader (Superseded by Engine)
**Responsibilities:**
- Load items from world + compendiums → ENGINE does this (loader.js)
- Filter by ID → ENGINE does this (normalizer.js)
- Categorize items → ENGINE does this (categorizer.js)
- Apply pricing → ENGINE does this (pricing.js)
- Hardcode services → SHOULD BE UI ONLY

**Current Issues:**
- **Completely redundant with engine pipeline**
- Loads all items twice (performance issue)
- Reads game.settings for pricing (should be engine)
- Generates fallback IDs (anti-pattern, should fail at load)
- Mixes compendium data with static services data

**V2 Violations:**
- Violates "Engine owns data pipeline"
- Violates "UI is declarative"
- Reading settings outside engine

**Why It Exists:**
- Pre-refactor, this WAS how inventory was loaded
- Engine pipeline (loader/normalizer/categorizer/pricing) now owns this entire responsibility

**Recommended Action:** DELETE entirely
- Replace in `store-main.js` with call to `StoreEngine.getInventory()`
- Move services data to UI constants or separate file
- Remove all imports of this module

---

### File: `scripts/apps/store/store-pricing.js`

**Status:** DELETE (Mostly Redundant)
**Classification:** Pricing Helpers (Duplicates Engine)
**Responsibilities:**
- Calculate final cost → ENGINE does this (engine/pricing.js)
- Add rarity class → ENGINE does this
- Generate fallback IDs → BAD PATTERN (engine should validate at load)
- Getter functions for markup/discount → Should be engine initialization

**Current Issues:**
- `calculateFinalCost()`: Reads `game.settings` directly (architectural violation)
- `addFinalCost()` + `addActorFinalCost()`: Replicates engine work
- Fallback ID generation: Prevents purchase (anti-pattern)
- No rarity metadata pre-calculation in engine

**V2 Violations:**
- UI reads settings (should be engine)
- Pricing calculated twice
- ID repair in UI (should be engine validation)

**Recommended Action:**
- DELETE entire file
- Remove all imports
- Engine pricing is final source of truth
- If UI needs to recalculate (shouldn't), import from engine

---

### File: `scripts/apps/store/store-shared.js`

**Status:** Required (UI Helpers)
**Classification:** Defensive Utility Functions + Dialogue
**Responsibilities:**
- `normalizeNumber()` - Cost parsing (UI display)
- `getCostValue()` - Safe number extraction (UI display)
- `getCostDisplay()` - Formatted output (UI display)
- `safeString()`, `safeImg()`, `safeSystem()` - Input sanitization (UI)
- `tryRender()` - Error handling for templates (UI)
- `isValidItemForStore()` - UI validation filter
- Rendarr dialogue - Pure UI flavor

**Current Issues:**
- `normalizeNumber()` + `getCostValue()` - Only needed if UI calculates prices
- Once engine owns pricing, these become LESS necessary (still OK for display)
- Could be consolidated with UI constants

**V2 Violations:** None (these are pure UI helpers)
**Recommended Action:** Keep but mark helpers as "UI display only"
- These are safe helpers, not business logic
- Once store-pricing.js deleted, clarify these are display-only
- Could add comment: "// These format engine-provided prices for display"

---

### File: `scripts/apps/store/store-filters.js`

**Status:** Required (UI-only)
**Classification:** DOM Filtering + UI Affordances
**Responsibilities:**
- Apply availability filter (DOM visibility toggle)
- Apply search filter (DOM show/hide)
- Switch panels (UI state)
- Display empty messages (UI affordance)

**Current Issues:**
- None (pure UI, correctly layered)

**V2 Violations:** None
**Recommended Action:** Keep as-is. Already AppV2 compliant.

---

### File: `scripts/apps/store/store-id-fixer.js`

**Status:** Keep but Reduce (Diagnostic Utility)
**Classification:** Maintenance Tool
**Responsibilities:**
- Scan for items with missing IDs
- Fix missing IDs (repair utility)
- Report on ID issues

**Current Issues:**
- Scans for missing IDs after they've already been loaded
- Engine should prevent this at load time (validate in normalizer.js)
- Still useful for diagnosing compendium issues

**V2 Violations:** None (utility, not core logic)
**Recommended Action:** Keep but document as "diagnostic tool"
- Should become less necessary as engine validates at load
- Keep for GM debugging (can run on demand)
- Add note: "This should not be needed if compendium IDs are canonical"

---

### File: `scripts/apps/store/weapon-categorization.js`

**Status:** Reduce (Move to Engine)
**Classification:** Business Logic (Categorization Policy)
**Responsibilities:**
- `categorizeWeapon()` - Classify weapon by name patterns

**Current Issues:**
- **NAME-BASED LOGIC (Anti-V2 Pattern)**
  ```javascript
  if (name.toLowerCase().includes('grenade')) return 'explosives';
  if (name.toLowerCase().includes('pistol')) return 'ranged-pistols';
  ```
- Should use `item.type` + system metadata instead
- Duplicates engine categorization logic

**V2 Violations:**
- Categorization inferred from name (not SSOT)
- Business logic in UI layer
- Duplicates engine/categorizer.js

**Why Problem:**
- Weapons renamed → categorization breaks
- No SSOT enforcement (category comes from name parsing, not data)
- Not future-proof (new weapon types require code changes)

**Recommended Action:** MOVE TO ENGINE
- Engine/categorizer.js should handle ALL weapon categorization
- Use `item.type` + `item.system.category` (if exists) as primary source
- Fallback to weapon.system.range + properties only if needed
- Delete UI function entirely

---

### File: `scripts/apps/store/dialogue/rendarr-dialogue.js`

**Status:** Keep but Consolidate
**Classification:** Pure UI Flavor (NPC Dialogue)
**Responsibilities:**
- `getRendarrLine()` - Select random NPC dialogue by category
- Dialogue arrays for all shop categories

**Current Issues:**
- Already consolidated into one file ✓
- Import is correct (from store-shared.js via `getRendarrLine()` wrapper)

**V2 Violations:** None
**Recommended Action:** Keep as-is. Flavour text is correctly separated.

---

### File: `scripts/apps/store/store-constants.js` (UI)

**Status:** Keep (UI Configuration)
**Classification:** Constants + Compendium References
**Responsibilities:**
- `STORE_PACKS` - Compendium pack names
- `WEAPON_SUBCATEGORIES` - UI categorization
- `AVAILABILITY_TYPES` - Filter options
- `STORE_CONFIG` - UI settings
- `MIN_COSTS` - UI display

**Current Issues:**
- Duplicates `scripts/engine/store/store-constants.js` for STORE_PACKS
- UI should use engine constants, not duplicate them

**V2 Violations:** Duplicated STORE_PACKS (engine owns this)
**Recommended Action:** Reduce to UI-only
- REMOVE: `STORE_PACKS` (import from engine instead)
- REMOVE: `MIN_COSTS` (move to engine rules)
- KEEP: `WEAPON_SUBCATEGORIES`, `AVAILABILITY_TYPES`, `STORE_CONFIG` (UI display options)
- UPDATE IMPORTS: Replace `from './store-constants.js'` with `from '../../engines/store/store-constants.js'`

---

## GLOBAL FINDINGS

### Redundancy Summary

| Module | Exists In | Also In Engine? | Status |
|--------|-----------|-----------------|--------|
| Inventory Loading | store-inventory.js | engine/loader.js | REDUNDANT |
| Item Normalization | store-inventory.js | engine/normalizer.js | REDUNDANT |
| Item Categorization | store-inventory.js + weapon-categorization.js | engine/categorizer.js | REDUNDANT |
| Pricing | store-pricing.js | engine/pricing.js | REDUNDANT |
| Rarity Class | store-pricing.js | engine/pricing.js | REDUNDANT |
| STORE_PACKS | store-constants.js | engine/store-constants.js | DUPLICATED |

### Under-Engineering

**Gap:** Engine doesn't calculate rarity class or apply to inventory
- `engine/pricing.js` only applies finalCost
- Should also add `rarityClass` + `rarityLabel` to output
- Currently only added in UI (store-pricing.js)

**Gap:** Engine doesn't enforce ID canonicity strictly
- Generates fallback IDs instead of failing
- Should fail loudly if item has no ID (require GM fix in compendium)

---

## FINAL RECOMMENDATIONS

### Files to DELETE (Entirely)
1. **`store-inventory.js`** - Engine owns inventory pipeline
   - Move services data to separate file or constants
   - Replace calls in store-main.js with `StoreEngine.getInventory()`

2. **`store-pricing.js`** - Engine owns pricing
   - UI helpers for display (getCostDisplay) → move to store-shared.js
   - Remove all `addFinalCost()` calls (engine pre-calculates)

### Files to REDUCE
1. **`store-constants.js`** (UI layer)
   - Remove: STORE_PACKS (duplicate from engine)
   - Remove: MIN_COSTS (move to engine)
   - Keep: WEAPON_SUBCATEGORIES, AVAILABILITY_TYPES, STORE_CONFIG
   - Update imports to use engine constants

2. **`store-id-fixer.js`** (Utility)
   - Keep for diagnostics but mark as "should not be needed"
   - Document that engine validation should prevent ID issues

3. **`weapon-categorization.js`**
   - Move `categorizeWeapon()` to engine (replace name-based logic)
   - Delete from UI layer

### Files to KEEP (As-Is)
1. **`store-main.js`** - Already correct (AppV2 orchestration)
2. **`store-checkout.js`** - Already refactored (delegates to engine)
3. **`store-filters.js`** - UI filtering is correct
4. **`store-shared.js`** - Defensive helpers + dialogue (OK)
5. **`dialogue/rendarr-dialogue.js`** - Pure flavour

### Engine Gaps to Close

1. **Rarity Calculation:** Add `rarityClass` + `rarityLabel` to engine output
   - `engine/pricing.js` should calculate based on `system.availability`
   - Return in final inventory object

2. **Weapon Categorization:** Replace name-based logic
   - Use `item.type` + `item.system.category` + `item.system.range`
   - Remove name pattern matching

3. **ID Validation:** Enforce canonicity
   - Fail loudly if ID missing (don't generate fallbacks)
   - Require GM to fix compendium

4. **Services Data:** Move out of inventory
   - Should be in UI constants or separate data file
   - Services are NOT inventory items

---

## CONSOLIDATION CHECKLIST

```
Phase 6 (Post-Audit Cleanup):

[ ] Delete store-inventory.js entirely
    [ ] Move services data to scripts/apps/store/store-services.js
    [ ] Update store-main.js to call StoreEngine.getInventory()
    [ ] Remove all imports of loadInventoryData()

[ ] Delete store-pricing.js entirely
    [ ] Move getCostDisplay() to store-shared.js (UI display helper)
    [ ] Remove all imports of pricing functions
    [ ] Ensure engine-provided prices used everywhere

[ ] Move weapon-categorization.js to engine
    [ ] Refactor categorizeWeapon() in engine/categorizer.js
    [ ] Replace name-based logic with type + system metadata
    [ ] Delete weapon-categorization.js from UI

[ ] Reduce store-constants.js (UI)
    [ ] Remove STORE_PACKS, MIN_COSTS
    [ ] Import from engine instead
    [ ] Keep UI-only config

[ ] Update engine/pricing.js
    [ ] Add rarity class calculation
    [ ] Include in final inventory object
    [ ] No fallback IDs (fail on missing ID)

[ ] Keep verified correct
    [ ] store-main.js ✓
    [ ] store-checkout.js ✓
    [ ] store-filters.js ✓
    [ ] store-shared.js ✓
    [ ] dialogue/rendarr-dialogue.js ✓
```

---

## TRUST VERIFICATION

After consolidation, system should have:
- ✓ ONE loader (engine/loader.js)
- ✓ ONE normalizer (engine/normalizer.js)
- ✓ ONE categorizer (engine/categorizer.js)
- ✓ ONE pricing engine (engine/pricing.js)
- ✓ ONE constants source for SSOT (engine/store-constants.js)
- ✓ UI purely declarative (calls engine, displays results)
- ✓ No name-based categorization
- ✓ No duplicate pricing logic
- ✓ No SSOT bypass

**Result: Genuine SSOT → Engine → UI architecture**
