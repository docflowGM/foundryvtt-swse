# Performance & UX Improvement Recommendations

## Executive Summary

This document provides a comprehensive analysis of the Foundry VTT Star Wars Saga Edition (SWSE) system, identifying performance bottlenecks and user experience improvements. The codebase is well-structured with ~72 application files, ~82 templates, and sophisticated systems for character progression, combat, and stores.

**Key Findings:**
- Multiple N+1 query patterns causing redundant item filtering
- Missing debounce on rapid-fire events causing excessive re-renders
- Deep cloning of large data structures where shallow copies would suffice
- Accessibility gaps in forms and drag-drop interactions
- Missing loading states during async operations
- Inconsistent empty state handling

---

## Table of Contents

1. [Critical Performance Issues](#1-critical-performance-issues)
2. [Medium Priority Performance Issues](#2-medium-priority-performance-issues)
3. [UX Improvements - High Priority](#3-ux-improvements---high-priority)
4. [UX Improvements - Medium Priority](#4-ux-improvements---medium-priority)
5. [Code Architecture Improvements](#5-code-architecture-improvements)
6. [Quick Wins](#6-quick-wins)

---

## 1. Critical Performance Issues

### 1.1 N+1 Query Pattern in Character Sheet

**File:** `scripts/actors/character/swse-character-sheet.js`

**Problem:** Multiple independent `actor.items.filter()` calls in `getData()` iterating the same collection.

**Lines 99-192:**
```javascript
const feats = actor.items.filter(i => i.type === "feat");           // Line 99
context.forceSecrets = feats.filter(f => f.name.toLowerCase()...);   // Line 100
context.forceTechniques = feats.filter(f => f.name.toLowerCase()...);// Line 101
const talents = actor.items.filter(i => i.type === "talent");        // Line 106
const allPowers = actor.items.filter(i => ["forcepower"...]);        // Line 114
const classes = actor.items.filter(i => i.type === "class");         // Line 192
```

**Recommendation:** Single-pass item categorization:
```javascript
// In getData():
const itemsByType = new Map();
for (const item of actor.items) {
  const type = item.type;
  if (!itemsByType.has(type)) itemsByType.set(type, []);
  itemsByType.get(type).push(item);
}

const feats = itemsByType.get("feat") || [];
const talents = itemsByType.get("talent") || [];
const powers = itemsByType.get("forcepower") || itemsByType.get("force-power") || [];
const classes = itemsByType.get("class") || [];
```

**Impact:** Reduces O(n * k) to O(n) where k = number of filter operations.

---

### 1.2 Repeated Item Filtering in DerivedCalculator

**File:** `scripts/progression/engine/derived-calculator.js`

**Problem:** Each calculation method independently filters feats.

**Lines 156, 199, 228, 244, 265:**
```javascript
actor.items.filter(i => i.type === 'feat').forEach(feat => {...}); // Line 156
actor.items.filter(i => i.type === 'feat').forEach(feat => {...}); // Line 199
const forceTrainingFeats = actor.items.filter(i => i.type === 'feat'...); // Line 228
const initiativeFeats = actor.items.filter(i => i.type === 'feat'...);    // Line 244
actor.items.filter(i => i.type === 'feat').forEach(feat => {...}); // Line 265
```

**Recommendation:** Cache feats at the start of `recalculate()`:
```javascript
static recalculate(actor) {
  // Pre-cache frequently accessed collections
  const _cachedFeats = actor.items.filter(i => i.type === 'feat');
  const _cachedFeatNames = new Set(_cachedFeats.map(f => f.name.toLowerCase()));

  // Pass cached data to individual calculators
  // ...
}
```

**Impact:** 5x reduction in filter operations per actor recalculation.

---

### 1.3 Missing Debounce on Defense Input Changes

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 234-237:**
```javascript
html.find(".defense-input-sm, .defense-select-sm").change(ev => {
    this.actor.prepareData();  // Heavy calculation
    this.render();             // Full re-render
});
```

**Problem:** Each keystroke triggers full data preparation and re-render.

**Recommendation:**
```javascript
import { debounce } from '../../utils/performance-utils.js';

// In activateListeners:
const debouncedDefenseChange = debounce((ev) => {
    this.actor.prepareData();
    this.render();
}, 300);

html.find(".defense-input-sm, .defense-select-sm").change(debouncedDefenseChange);
```

**Note:** The system already has excellent debounce/throttle utilities in `scripts/utils/performance-utils.js` (lines 14-58) but they're underutilized.

---

### 1.4 Deep Cloning Large Data Structures

**File:** `scripts/apps/chargen/chargen-main.js`

**Lines 224, 322:**
```javascript
this._packs = foundry.utils.deepClone(cachedPacks);  // Line 224
context.packs = foundry.utils.deepClone(this._packs); // Line 322
```

**Problem:** Deep cloning compendium packs (potentially thousands of items) on every getData call.

**Recommendation:**
```javascript
// Use structural sharing or lazy cloning
this._packs = Object.freeze(cachedPacks); // Immutable reference

// Only clone when modifying
context.packs = {
  species: this._packs.species, // Read-only reference
  classes: this._packs.classes,
  // Only clone if mutations are needed for filtering
  feats: needsFiltering ? [...this._packs.feats] : this._packs.feats,
};
```

---

## 2. Medium Priority Performance Issues

### 2.1 Repeated toLowerCase() in Loops

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 100-101:**
```javascript
context.forceSecrets = feats.filter(f => f.name.toLowerCase().includes("force secret"));
context.forceTechniques = feats.filter(f => f.name.toLowerCase().includes("force technique"));
```

**Recommendation:** Pre-compute lowercase names:
```javascript
const featsWithLowerNames = feats.map(f => ({
  feat: f,
  lowerName: f.name.toLowerCase()
}));

context.forceSecrets = featsWithLowerNames
  .filter(f => f.lowerName.includes("force secret"))
  .map(f => f.feat);
```

---

### 2.2 Store Map Reconstruction After Sorting

**File:** `scripts/apps/store/store-main.js`

**Lines 164-179:**
```javascript
_sortAllGroups(){
  for (const [bucketName, map] of Object.entries(this.groupedItems)) {
    // Sort items within categories
    for (const [cat, arr] of map.entries()) {
      arr.sort(...);
      map.set(cat, arr);  // Unnecessary - arrays are mutated in place
    }
    // Reconstruct entire Map just to sort keys
    const sortedKeys = Array.from(map.keys()).sort(...);
    const newMap = new Map();
    for (const k of sortedKeys) newMap.set(k, map.get(k));
    this.groupedItems[bucketName] = newMap;
  }
}
```

**Recommendation:** Sort keys without Map reconstruction:
```javascript
_sortAllGroups() {
  for (const map of Object.values(this.groupedItems)) {
    // In-place sort of arrays
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.costValue ?? Infinity) - (b.costValue ?? Infinity) || a.name.localeCompare(b.name));
    }
    // Note: Map iteration order is insertion order, but for display we can
    // use sorted keys during template rendering instead of restructuring
  }
}
```

---

### 2.3 Multiple jQuery find() Chains

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 209-292:** Multiple `html.find()` calls for event binding.

**Recommendation:** Use event delegation:
```javascript
activateListeners(html) {
  const root = html[0];

  // Single delegated listener for click events
  root.addEventListener('click', (event) => {
    const target = event.target;

    if (target.matches('.roll-attributes-btn')) return this._onRollAttributes(event);
    if (target.matches('.feat-roll')) return this._onFeatRoll(event);
    if (target.matches('.feat-attack')) return this._onFeatAttack(event);
    // ... etc
  });
}
```

---

### 2.4 querySelectorAll in Scroll Position Save/Restore

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 63-78:** DOM queries on every render cycle.

**Recommendation:** Cache scroll container references:
```javascript
_cacheScrollContainers() {
  if (this._scrollContainers) return;
  const root = this.element?.[0];
  if (!root) return;
  this._scrollContainers = root.querySelectorAll('.sheet-body, .tab');
}

_saveScrollPositions() {
  this._cacheScrollContainers();
  // Use cached references
}
```

---

## 3. UX Improvements - High Priority

### 3.1 Missing Loading States

**Problem:** Async operations lack visual feedback.

**Affected Files:**
- `scripts/actors/character/swse-character-sheet.js` - `getData()`, `_onSubmit()`
- `scripts/apps/chargen/chargen-main.js` - `_loadData()`, `_createActor()`
- `scripts/apps/store/store-main.js` - `_loadAllPacks()`

**Recommendation:** Add loading indicator component:
```javascript
// In template:
{{#if loading}}
<div class="swse-loading-overlay">
  <i class="fas fa-spinner fa-spin"></i>
  <span>{{loadingMessage}}</span>
</div>
{{/if}}

// In JS:
async _loadData() {
  this._loading = true;
  this._loadingMessage = "Loading character data...";
  this.render(false);

  try {
    // ... load data
  } finally {
    this._loading = false;
    this.render();
  }
}
```

---

### 3.2 Silent Error Handling

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 377-381:**
```javascript
} catch (err) {
  console.warn("Progression engine failed, using fallback:", err);
  // User sees no notification!
}
```

**Problem:** Errors logged to console but users see nothing.

**Recommendation:**
```javascript
} catch (err) {
  console.warn("Progression engine failed, using fallback:", err);
  ui.notifications.warn("Using fallback mode. Some features may be limited.");
}
```

---

### 3.3 Missing Empty State in Inventory Tab

**File:** `templates/actors/character/tabs/inventory-tab.hbs`

**Current (Lines 10-30):**
```handlebars
<div class="inventory-list">
{{#each equipment as |item|}}
  <!-- item rows -->
{{/each}}
</div>
```

**Recommendation:**
```handlebars
<div class="inventory-list">
{{#if equipment.length}}
  {{#each equipment as |item|}}
    <!-- item rows -->
  {{/each}}
{{else}}
  <div class="empty-state">
    <i class="fas fa-box-open"></i>
    <p>No equipment yet.</p>
    <p class="hint">Drag items here or click "Add Equipment" to get started.</p>
  </div>
{{/if}}
</div>
```

---

### 3.4 Accessibility: Missing ARIA Associations

**File:** `templates/items/base/item-sheet.hbs`

**Problem:** Form fields lack proper label associations.

**Example fix:**
```handlebars
<div class="form-group">
  <label for="item-properties">Properties</label>
  <input type="text"
         id="item-properties"
         name="system.properties"
         value="{{system.properties}}"
         aria-describedby="properties-help"/>
  <small id="properties-help">Separate multiple properties with commas</small>
</div>
```

---

### 3.5 Missing Keyboard Alternatives for Drag-Drop

**Files with draggable elements:**
- `templates/apps/chargen/ability-rolling.hbs`
- `templates/actors/character/tabs/force-tab.hbs`
- `templates/apps/nonheroic-units-browser.hbs`

**Recommendation:** Add keyboard equivalents:
```handlebars
<div class="draggable-item"
     draggable="true"
     tabindex="0"
     role="button"
     aria-label="Drag {{item.name}} to assign, or press Enter to select">
  {{item.name}}
</div>
```

```javascript
// In JS:
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    this._handleItemSelection(e);
  }
});
```

---

## 4. UX Improvements - Medium Priority

### 4.1 Missing Form Validation Feedback

**File:** `templates/apps/levelup.hbs`

**Problem:** Form inputs have min/max but no visual feedback when invalid.

**Recommendation:**
```css
input:invalid {
  border-color: var(--swse-error-color, #ff6b6b);
  background-color: rgba(255, 107, 107, 0.1);
}

input:invalid + .validation-message {
  display: block;
  color: var(--swse-error-color);
  font-size: 0.85em;
}
```

---

### 4.2 Missing Drag Visual Feedback

**Problem:** No visual indication when dragging or hovering over drop zones.

**Recommendation (CSS):**
```css
.draggable-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.drop-zone.drag-over {
  background-color: rgba(100, 200, 100, 0.2);
  border: 2px dashed var(--swse-primary-color);
}
```

**Recommendation (JS):**
```javascript
element.addEventListener('dragstart', (e) => {
  e.target.classList.add('dragging');
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
```

---

### 4.3 Fixed Window Sizes Don't Adapt

**File:** `scripts/actors/character/swse-character-sheet.js`

**Lines 41-42:**
```javascript
width: 800,
height: 900,
```

**Recommendation:**
```javascript
width: Math.min(800, window.innerWidth - 100),
height: Math.min(900, window.innerHeight - 100),
```

Or use CSS max-width/max-height in stylesheets.

---

### 4.4 Missing ARIA Live Regions for Dynamic Updates

**File:** `templates/apps/store/store.hbs`

**Problem:** Cart count updates without screen reader announcement.

**Recommendation:**
```handlebars
<div class="cart-summary" aria-live="polite" aria-atomic="true">
  Cart: {{cartItemCount}} items ({{cartTotal}} credits)
</div>
```

---

## 5. Code Architecture Improvements

### 5.1 Centralized Item Categorization Utility

Create a shared utility for the common pattern of categorizing actor items:

**New File:** `scripts/utils/item-categorizer.js`
```javascript
export class ItemCategorizer {
  constructor(items) {
    this._byType = new Map();
    this._byName = new Map();

    for (const item of items) {
      // By type
      if (!this._byType.has(item.type)) {
        this._byType.set(item.type, []);
      }
      this._byType.get(item.type).push(item);

      // By lowercase name for fast lookups
      this._byName.set(item.name.toLowerCase(), item);
    }
  }

  getByType(type) {
    return this._byType.get(type) || [];
  }

  hasName(name) {
    return this._byName.has(name.toLowerCase());
  }

  filterByNameContains(type, substring) {
    const lower = substring.toLowerCase();
    return this.getByType(type).filter(i =>
      i.name.toLowerCase().includes(lower)
    );
  }
}
```

---

### 5.2 Leverage Existing CacheManager

**File:** `scripts/core/cache-manager.js`

The system has an excellent cache manager that's underutilized.

**Recommendation:** Use it for compendium data:
```javascript
import { getCache } from '../core/cache-manager.js';

const compendiumCache = getCache('compendiums', {
  ttl: 300000, // 5 minutes
  maxSize: 50
});

async function getSpecies() {
  return compendiumCache.getOrCompute('species', async () => {
    const pack = game.packs.get('foundryvtt-swse.species');
    return pack.getDocuments();
  });
}
```

---

### 5.3 Use Performance Monitor for Diagnostics

**File:** `scripts/utils/performance-utils.js`

The system has a `PerformanceMonitor` class (lines 285-326) that's available but unused.

**Recommendation:** Add performance logging in development:
```javascript
import { perfMonitor } from '../utils/performance-utils.js';

async getData() {
  return perfMonitor.measureAsync('CharacterSheet.getData', async () => {
    // ... existing code
  });
}
```

---

## 6. Quick Wins

### 6.1 Batch Actor Updates

Instead of multiple `actor.update()` calls, batch them:

```javascript
// Before (multiple round-trips):
await actor.update({ "system.hp.value": newHp });
await actor.update({ "system.forcePoints.value": newFp });

// After (single round-trip):
await actor.update({
  "system.hp.value": newHp,
  "system.forcePoints.value": newFp
});
```

---

### 6.2 Use requestAnimationFrame for DOM Updates

For animations and UI updates:

```javascript
import { rafThrottle } from '../utils/performance-utils.js';

const throttledScroll = rafThrottle(() => {
  // Update scroll-dependent UI
});

element.addEventListener('scroll', throttledScroll);
```

---

### 6.3 Lazy Load Heavy Modules

Use dynamic imports for rarely-used features:

```javascript
// Before:
import { TalentTreeVisualizer } from '../apps/talent-tree-visualizer.js';

// After:
async _openTalentTree() {
  const { TalentTreeVisualizer } = await import('../apps/talent-tree-visualizer.js');
  new TalentTreeVisualizer().render(true);
}
```

---

### 6.4 Add prefers-reduced-motion Support

**File:** `styles/core/swse-base.css`

The system already has this (good!), but expand it:

```css
@media (prefers-reduced-motion: reduce) {
  .swse *,
  .swse *::before,
  .swse *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | N+1 queries in character sheet | Medium | High |
| P0 | Missing debounce on inputs | Low | High |
| P0 | Loading states for async ops | Medium | High |
| P1 | DerivedCalculator caching | Medium | Medium |
| P1 | Deep clone optimization | Low | Medium |
| P1 | Silent error handling | Low | Medium |
| P1 | Empty states consistency | Low | Medium |
| P2 | Event delegation | Medium | Medium |
| P2 | ARIA accessibility | Medium | Medium |
| P2 | Drag-drop visual feedback | Low | Low |
| P3 | Performance monitoring | Low | Low |
| P3 | Keyboard alternatives | Medium | Low |

---

## Conclusion

The SWSE system is well-architected with good separation of concerns and existing performance utilities. The main opportunities are:

1. **Leverage existing utilities** - The system has excellent debounce, throttle, caching, and performance monitoring tools that are underutilized.

2. **Optimize hot paths** - Character sheet `getData()` and `DerivedCalculator.recalculate()` are called frequently and would benefit most from optimization.

3. **Consistent UX patterns** - Adding loading states, empty states, and better error feedback would significantly improve user experience.

4. **Accessibility improvements** - ARIA attributes and keyboard alternatives would make the system more inclusive.

The recommendations in this document are ordered by impact and effort, allowing incremental improvements without major refactoring.
