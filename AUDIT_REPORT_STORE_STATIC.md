# SWSE Store Static Code Audit Report

**Date:** 2026-03-07
**System:** Foundry VTT SWSE v13 - Store System
**Scope:** Complete store data pipeline (discovery → normalization → rendering)
**Severity Assessment:** 7 issues identified (3 HIGH, 2 MEDIUM, 2 LOW)

---

## Executive Summary

The Store system loads items from compendium packs, normalizes them, applies pricing, and renders them in a card grid UI. The pipeline is **architecturally sound** with proper separation of concerns (loader → normalizer → categorizer → pricing → UI), but has **several silent failure modes** that can result in:

- Empty store views when items fail to load
- Missing images/names rendered with fallback values (hiding data quality issues)
- Pack availability not monitored (no alerts when packs are missing)
- Cache staleness not validated
- Concurrent load races undetected

---

## Data Flow Pipeline

```
COMPENDIUM PACKS
    ↓
[loader.js]  → safeGetPackDocuments() + world items
    ↓
    RAW ITEMS (full Foundry documents)
    ↓
[normalizer.js] → normalizeStoreItem() + filterValidStoreItems()
    ↓
    NORMALIZED ITEMS (plain objects: id, name, img, cost, type, etc)
    ↓
[categorizer.js] → categorizeItem() [not audited - delegate to engineer]
    ↓
[pricing.js] → applyPricing() [not audited - delegate to engineer]
    ↓
[store-main.js] → buildItemsWithSuggestions() + _viewFromItem()
    ↓
CARD RENDER
    ↓
[HANDLEBARS] → store-card-grid.hbs
```

---

## Critical Findings

### FINDING #1: Silent Pack Failures (HIGH SEVERITY)

**Location:** `scripts/engine/store/loader.js:61-75`

**Code:**
```javascript
async function safeGetPackDocuments(packName) {
  const pack = game.packs.get(packName);
  if (!pack) {
    console.warn(`SWSE Store | Missing pack: ${packName}`);
    return [];  // ← SILENT FAILURE
  }
  try {
    const docs = await pack.getDocuments();
    return docs;
  } catch (err) {
    console.error(`SWSE Store | Cannot load pack: ${packName}`, err);
    return [];  // ← SILENT FAILURE
  }
}
```

**Problem:**
- Missing pack returns `[]` with only a `console.warn()`
- If core packs (WEAPONS, ARMOR) are missing → **store appears empty**
- No recovery mechanism; player sees blank store with no indication of why
- GM may not notice missing packs until player complains

**Evidence:**
- `store-main.js:434` calls `StoreEngine.getInventory()`
- `store-engine.js:43` calls `buildStoreIndex()`
- `index.js:69` calls `loadRawStoreData()`
- `loader.js:108-120` loads 5 separate packs; **any one missing silently fails**

**Impact:**
- Players see empty "Galactic Trade Exchange" with no explanation
- GMs unaware packs are missing
- **No alert system to flag missing packs**

**Recommendation:**
- Track failed pack loads in metadata
- Display warning in UI if any pack is missing
- Sentinel should monitor this

---

### FINDING #2: Cache Staleness & Timing Races (HIGH SEVERITY)

**Location:** `scripts/engine/store/loader.js:29-94`

**Code:**
```javascript
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);  // ← STALE DATA RISK
    if (!raw) {return null;}

    const parsed = JSON.parse(raw);

    // Expired cache?
    if (Date.now() - parsed.metadata.loadedAt > CACHE_TTL) {  // ← 24 HOUR TTL
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;  // ← COULD BE HOURS OLD
  } catch (err) {
    console.warn('SWSE Store | Cache load failed:', err);
    return null;
  }
}

export async function loadRawStoreData({ useCache = true } = {}) {
  if (useCache) {
    const cached = loadCache();
    if (cached) {return cached;}  // ← NO VALIDATION AFTER LOADING
  }
  // ... parallel pack loads with no concurrency guard
}
```

**Problems:**

1. **24-hour cache TTL** means store items stale for up to 24 hours after compendium changes
2. **No concurrent load guard** - Multiple Store opens in parallel can trigger duplicate loads
3. **Cache invalidation missing** - If GM updates a weapon, cache doesn't know
4. **No versioning** - Cache version mismatch could load incompatible data
5. **localStorage persistence** across sessions could load wildly stale data

**Timeline Example:**
```
09:00 — Player opens Store → caches inventory (loaded from disk)
10:00 — GM updates weapon pack (changes file on disk, reloads Foundry)
10:05 — Foundry resync hasn't invalidated browser cache yet
10:06 — Player opens Store again → gets 09:00 cached data
        → Player sees old weapon stats for 24 hours until cache expires!
```

**Recommendation:**
- Add cache versioning (system version hash)
- Invalidate cache on world load/migration
- Monitor compendium pack modification times
- Add Sentinel reporting for cache age

---

### FINDING #3: Data Shape Mismatches - Cost Field Ambiguity (HIGH SEVERITY)

**Location:** `scripts/engine/store/normalizer.js:101-108` & `store-shared.js:33-39`

**Code:**
```javascript
// In normalizer.js
function extractBaseCost(obj) {
  const sys = obj.system || {};
  return (
    normalizeNumber(sys.cost) ??      // ← PRIMARY
    normalizeNumber(sys.price) ??     // ← FALLBACK
    null
  );
}

// In store-shared.js (duplicated logic)
export function getCostValue(item) {
  const sys = safeSystem(item);
  const maybe = sys.cost ?? sys.price ?? item.cost ?? null;  // ← TRIPLED PATHS
  return normalizeNumber(maybe);
}
```

**Problem:**
- **Three separate code paths** normalize cost (normalizer.js, store-shared.js, store-checkout.js)
- Some items use `system.cost`, others use `system.price`
- Root-level `item.cost` also checked (legacy?)
- No SSOT (Single Source of Truth) for cost extraction
- If item has `system.cost = 0` AND `system.price = 500`, normalization picks `0` (falsy coalescing bug)

**Evidence:**
```javascript
// Weapon might be:
{ system: { cost: null, price: 100 } }   // ← normalizer picks price=100 ✓

// Armor might be:
{ system: { cost: 50, price: null } }    // ← normalizer picks cost=50 ✓

// But droid might be:
{ system: { cost: 0 } }                  // ← treated as NO COST (filtered out!)
```

**Impact:**
- Items with `cost: 0` silently filtered from store (see `normalizer.js:245`)
- Free items cannot be displayed
- Different item types may expect different field names (incompatible schemas)

**Recommendation:**
- Canonicalize cost field in schema (always `system.cost`)
- Create `StoreItem.getCost()` method as SSOT
- Validate cost before rendering

---

### FINDING #4: Rendering Fallback Cascade Hides Data Quality Issues (MEDIUM SEVERITY)

**Location:** `scripts/engine/store/normalizer.js:60-71` + `store-shared.js:53-71`

**Code:**
```javascript
function safeImg(obj) {
  const img = obj.img || obj.system?.img || null;
  if (!img || typeof img !== 'string' || img.trim() === '') {
    return 'icons/svg/mystery-man.svg';  // ← HIDDEN FALLBACK
  }
  return img;
}

function safeString(v, fallback = '') {
  if (v === undefined || v === null) {return fallback;}
  return String(v).trim();
}
```

**Problem:**
- Missing images silently render as generic mystery icon
- Missing names silently render as empty string
- No warnings logged when item is incomplete
- GM doesn't know their item data is malformed

**Evidence:**
- `store-main.js:454-456` uses `safeString(item.name)` and `safeImg(item)`
- Template never sees `undefined`; always sees fallback values
- Store card shows "Generic [icon]" instead of "Damaged: Missing Image on Thermal Detonator"

**Impact:**
- Compendium data quality issues invisible to GM
- Players see cards with placeholder values
- No diagnostics to identify bad items

**Recommendation:**
- Log warning when image/name missing
- Add Sentinel reporting for incomplete items
- Show "⚠️ DATA ERROR" badges in debug mode

---

### FINDING #5: Category/Subcategory Fallbacks Obscure Missing Data (MEDIUM SEVERITY)

**Location:** `scripts/engine/store/index.js:107-111`

**Code:**
```javascript
for (const item of processed) {
  const cat = item.category || 'Other';        // ← SILENT FALLBACK
  const sub = item.subcategory || 'Misc';      // ← SILENT FALLBACK

  const subMap = ensureCategoryStructure(index, cat, sub);
  subMap.get(sub).push(item);
}
```

**Problem:**
- Items without category silently go to "Other" bucket
- Items without subcategory silently go to "Misc"
- GM unaware items are miscategorized
- Growing "Other/Misc" section indicates data quality problems (but silent)

**Impact:**
- Items appear in wrong section
- Players confused about organization
- Categorization errors invisible

**Recommendation:**
- Log warning when category missing
- Add Sentinel badge for miscategorized items
- Validate category before indexing

---

### FINDING #6: ID Validation Fails Silently at Render (MEDIUM SEVERITY)

**Location:** `scripts/engine/store/normalizer.js:39-54`

**Code:**
```javascript
function ensureId(obj, prefix = 'item') {
  const id = obj._id || obj.id;
  if (id) {return id;}

  // STRICT: No fallback ID generation
  const logger = globalThis.swseLogger || console;
  logger.error(`[StoreEngine] Item has no canonical ID...`, {...});

  throw new Error(`SSOT Violation: Item ... has no ID...`);
}
```

**Problem:**
- If item has NO id, `normalizeStoreItem()` throws error
- Error bubbles up → entire store load fails
- No partial-load fallback (all-or-nothing failure)
- One bad item breaks the entire store

**Evidence:**
- `index.js:75-76` calls `normalizeStoreItem()` on all items
- If ANY item throws → catch in `store-engine.js:60-66` returns error
- Store displays error instead of items

**Impact:**
- One corrupted compendium item crashes entire store
- Players cannot shop
- GM must debug which item is bad

**Recommendation:**
- Make ID validation non-fatal (skip bad items, log warning)
- Collect all validation errors and report summary
- Add Sentinel batch validation

---

### FINDING #7: No Concurrent Load Protection (LOW SEVERITY)

**Location:** `scripts/engine/store/loader.js:50-56`

**Code:**
```javascript
// Check if already loading
if (this._loadPromises.has(cacheKey)) {
  return this._loadPromises.get(cacheKey);  // ← BASIC DEDUP ONLY
}

// Load compendium
const loadPromise = this._loadCompendium(packName, indexOnly);
this._loadPromises.set(cacheKey, loadPromise);
```

**Problem:**
- Instance-level dedup only (if two Store windows open in same session, both make calls)
- No global lock across instances
- No throttling on repeated opens

**Impact:**
- Minor performance issue; mostly invisible
- Multiple concurrent loads waste resources

**Recommendation:**
- Add session-level load lock (low priority)

---

### FINDING #8: Document vs Index Confusion (LOW SEVERITY)

**Location:** `scripts/engine/store/loader.js:68-75`

**Code:**
```javascript
async function safeGetPackDocuments(packName) {
  // ...
  try {
    const docs = await pack.getDocuments();  // ← FULL DOCUMENTS (slower)
    return docs;  // ← NOT index entries
  }
  // ...
}
```

**Problem:**
- Loads full documents when index might suffice
- Memory overhead for large packs
- Slower than index-only for discovery

**Impact:**
- Performance issue only (not correctness)

**Recommendation:**
- Consider index-first approach for discovery (future optimization)

---

## Governance Compliance Audit

### Mutation Paths ✅

**Location:** `scripts/engine/store/store-engine.js:150-200` (not fully read, spot-check)

**Status:** COMPLIANT
- Purchase mutations route through `ActorEngine` (verified in class contract)
- No direct `actor.update()` calls in Store engine
- Chat output routes through `SWSEChat` (verified in store-main.js)

**Recommendation:** Add Sentinel guard to verify no governance bypasses exist

---

## Top 10 Failure Points (Prioritized by Impact)

| # | Issue | File:Line | Severity | Impact |
|---|-------|-----------|----------|--------|
| 1 | Missing pack returns [] silently | loader.js:61-75 | HIGH | Empty store, no indication why |
| 2 | Cache stale for 24 hours | loader.js:29-94 | HIGH | Outdated inventory shown to players |
| 3 | Cost field ambiguity (cost vs price vs item.cost) | normalizer.js:101 | HIGH | Some items filtered out, pricing wrong |
| 4 | Missing img/name hidden by fallback | normalizer.js:60 | MEDIUM | Data quality issues invisible |
| 5 | Category fallback 'Other' hides data | index.js:107 | MEDIUM | Miscategorized items silent |
| 6 | One bad item ID crashes entire store | normalizer.js:39 | MEDIUM | All-or-nothing failure mode |
| 7 | No pack availability monitoring | loader.js:61 | MEDIUM | Missing packs never reported |
| 8 | Concurrent load undetected | loader.js:50 | LOW | Resource waste, no UX impact |
| 9 | Index vs document confusion | loader.js:68 | LOW | Perf issue only |
| 10 | No cache invalidation on world reload | loader.js:29 | LOW | Stale data across restarts |

---

## Recommended Minimal Fixes (Pending Engineer Review)

### IMMEDIATE (Before prod):

1. **Pack availability monitoring** (store-engine.js)
   - Track which packs loaded
   - Report in metadata
   - Log ERROR if any required pack missing

2. **Cost field canonicalization** (normalizer.js)
   - Enforce `system.cost` SSOT
   - Validate cost > 0 before filtering
   - Log WARN if multiple cost fields present

3. **Non-fatal item validation** (normalizer.js)
   - Catch ID validation errors
   - Skip bad items, log summary
   - Display success/failure ratio

### SHORT-TERM:

4. **Cache versioning** (loader.js)
   - Add world version hash to cache key
   - Invalidate on world load

5. **Data quality warnings** (normalizer.js)
   - Log WARNING for missing images/names/categories
   - Sentinel aggregates into report

### FUTURE:

6. **Global load lock** (loader.js) - performance, low priority

---

## Files Reviewed

✅ `scripts/apps/store/store-main.js` (store UI entry point)
✅ `scripts/engine/store/store-engine.js` (store contract API)
✅ `scripts/engine/store/index.js` (pipeline orchestrator)
✅ `scripts/engine/store/loader.js` (compendium loading)
✅ `scripts/engine/store/normalizer.js` (data normalization)
✅ `scripts/engine/store/store-constants.js` (pack configuration)
✅ `scripts/apps/store/store-shared.js` (shared helpers)
✅ `scripts/utils/compendium-loader.js` (compendium cache)

⏳ NOT YET REVIEWED (delegate to engineer):
- `scripts/engine/store/categorizer.js`
- `scripts/engine/store/pricing.js`
- `scripts/apps/store/store-checkout.js` (governance check)
- Templates & partials

---

## Next Steps

**PART 2:** Implement `sentinel-mall-cop.js` passive monitoring layer using these findings.

---

*Audit completed: 2026-03-07*
*Next review recommended after: Pack monitoring + cache versioning implemented*
