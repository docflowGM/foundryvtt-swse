# SWSE Store Visual Contract (v13, AppV2)

**Status:** Locked
**Last Updated:** 2026-02-10
**Enforcement:** Architecture, no exceptions

---

## 1. CORE MANDATE

The **SWSE Store displays goods via Aurebesh glyphs, not images.**

This is not a styling choice. It is an **architectural commitment**.

### Why?

* **Thematic:** Rendarr's Exchange is a foreign system, not a shopping catalog
* **Performance:** Zero image loading, instant render
* **Accessibility:** Text-based classification (readable by assistive tech)
* **Maintainability:** No asset management required
* **Intentionality:** Every visual element serves narrative purpose

### What This Means

* ❌ No item images will ever be added back
* ❌ No "fallback to images if glyphs fail"
* ❌ No "optional image display" setting
* ✅ Glyphs are the permanent visual system

---

## 2. THE GLYPH SYSTEM (SSOT)

### Canonical Source

**File:** `scripts/apps/store/store-glyph-map.js`

**Never duplicate. Never infer. Never runtime-guess.**

### Mapping (Locked)

| Item Type | Category | Glyph | Meaning |
|-----------|----------|-------|---------|
| weapon | melee | `T` | Vertical blade-like form |
| weapon | ranged | `A` | Angular, projectile trajectory |
| armor | any | `Eo` | Shield enclosure digraph |
| vehicle | any | `Sh` | Horizontal mass digraph |
| droid | any | `Oo` | Eyes, sensors digraph |
| equipment | any | `O` | Generic utility circle |
| unknown | any | `?` | Error indicator |

### Resolution Contract

```javascript
resolveStoreGlyph(category: string, itemType: string, useAurebesh: boolean)
  → { aurebesh, ascii, label, text }
```

**Resolution Rule:**
1. Inspect `itemType` (weapon, armor, vehicle, droid, equipment)
2. For weapons, inspect `category` (melee vs ranged)
3. Look up in `STORE_GLYPHS` object (static lookup)
4. Return appropriate glyph
5. Default to `O` if unrecognized

**Resolution Rule VIOLATION:**
- ❌ Inferring glyph from item name
- ❌ Using item `system.img` as fallback
- ❌ Runtime heuristics
- ❌ Category-specific guessing

---

## 3. PRESENTATION LAYER (CSS ONLY)

### Typography Authority

**Fonts are chosen in CSS, never in JavaScript.**

### Aurebesh Toggle

```css
/* When setting is TRUE */
.store-aurebesh-enabled .store-glyph {
  font-family: 'Aurebesh', monospace;
}

/* When setting is FALSE (accessibility) */
.store-aurebesh-disabled .store-glyph {
  font-family: Consolas, 'Courier New', monospace;
}
```

### Enforcement Rule

If you see this in code:

```javascript
// ❌ WRONG
element.style.fontFamily = 'Aurebesh';
```

**This is a violation.** Fix it immediately.

Correct pattern:

```javascript
// ✅ CORRECT
element.classList.add('store-aurebesh-enabled');
// Font is applied by CSS
```

### Styling Authority

**File:** `styles/apps/store-cards.css`

**Sections:**
- `.glyph-panel` — container with grid background
- `.store-glyph` — large Aurebesh text, green glow
- Hover effects (scale, enhanced glow)
- Suggestion tier coloring
- Accessibility rules

**Permitted Modifications:**
- ✅ Adjust glyph size (5rem baseline)
- ✅ Change glow color / intensity
- ✅ Add hover animations
- ✅ Adjust grid background
- ✅ Update for new suggestion tiers

**Forbidden Modifications:**
- ❌ Add images or image fallbacks
- ❌ Hardcode fonts in CSS for specific glyphs
- ❌ Add inline styles to override class rules
- ❌ Create per-item CSS rules (all cards use same styling)

---

## 4. RENDERING PIPELINE (NO EXCEPTIONS)

### Data Flow (Locked)

```
StoreEngine (normalized items)
    ↓
_buildItemsWithSuggestions()
  ├─ For each item:
  │   ├─ Resolve: resolveStoreGlyph(category, type, useAurebesh)
  │   └─ Set: view.glyph = glyph text
  │
  └─ Return: [{...glyph, ...}, ...]
    ↓
store-card-grid.hbs
  ├─ Render: <div class="store-glyph">{{this.glyph}}</div>
  ├─ NO images anywhere
  ├─ Glyph marked aria-hidden="true"
  ↓
store-cards.css
  └─ Apply: font, size, glow, hover, tier effects
```

### Contract Guarantees

* **Glyphs are deterministic:** Same item type + category = always same glyph
* **No async:** Glyphs never fetch data or load external resources
* **No engine coupling:** StoreEngine never knows about glyphs
* **No AppV2 changes:** Lifecycle untouched
* **Pure presentation:** No game logic touches glyph decisions

---

## 5. ACCESSIBILITY COMPLIANCE

### Screen Readers

Glyph is marked `aria-hidden="true"`:

```html
<div class="store-glyph" aria-hidden="true">T</div>
```

**Why:** Glyph is decorative. Item `name` and `price` provide all semantic information.

Screen reader output:

```
"Beskar Armor, 500 credits"
```

User sees:

```
[Eo]
Beskar Armor
500 ₢
```

Both are accurate; both serve their medium.

### Accessibility Settings Respected

- ✅ `prefers-reduced-motion` → no scale/glow on hover
- ✅ `prefers-contrast: more` → brighter colors, thicker borders
- ✅ `prefers-color-scheme: light` → inverted palette
- ✅ Aurebesh toggle → Consolas fallback when disabled
- ✅ Skip overlay setting → visual loading overlay can be disabled

---

## 6. FUTURE-PROOFING RULES

### If Someone Proposes "Add Images Back"

**Response:** Refer to this contract. Section 1 explains why that violates the system.

### If Someone Proposes "Images as Optional"

**Response:** There is no "optional" mode. Glyphs are always rendered. Images are never added.

### If Someone Proposes "Rarity-Based Images"

**Response:** Rarity is expressed via glyph glow color and intensity (CSS). Not images.

### If Someone Proposes "Custom Glyphs Per Item"

**Response:** All glyphs resolve via `store-glyph-map.js`. No exceptions. No per-item overrides.

### If Someone Needs a New Glyph

**Process:**
1. Identify new item type or category
2. Propose glyph in `store-glyph-map.js`
3. Update table (Section 2 of this document)
4. Update template (no other changes needed)
5. CSS automatically applies

---

## 7. COMPLIANCE CHECKLIST

### For Code Reviews

- [ ] No `<img>` tags in Store templates
- [ ] No `img` attributes in Store item views
- [ ] All glyphs come from `store-glyph-map.js`
- [ ] No hardcoded fonts in JavaScript
- [ ] Font choices are CSS classes only
- [ ] Glyph in template has `aria-hidden="true"`
- [ ] `aria-label` or descriptive text present on card
- [ ] No inline styles on glyph elements
- [ ] No per-item CSS rules created
- [ ] Accessibility settings respected in CSS

### For New Features

- [ ] Does this add images? → REJECT
- [ ] Does this hardcode fonts? → REJECT
- [ ] Does this add per-item glyph logic? → REJECT
- [ ] Does this modify glyph selection? → REQUIRE glyph-map.js update + this doc update

---

## 8. PERMANENT RECORD: Why Glyphs, Not Images

### Original Decision (2026-02-10)

**Problem:** Store UI was mixing presentation concerns (images) with architecture concerns (categories, pricing).

**Solution:** Glyphs as pure classification. Text carries all information.

**Benefits:**
1. **Performance:** No image loading, instant render
2. **Thematic:** Alien system (Aurebesh), not Earth catalog
3. **Accessibility:** Everything readable without images
4. **Maintainability:** No asset pipeline needed
5. **Consistency:** All items treated equally (no "special" item images)
6. **Durability:** Never becomes outdated (glyphs are timeless)

**Non-Negotiable:**
- Glyphs will not be replaced with images
- Glyphs will not be made optional
- Glyphs will not be hidden in any UI mode
- Glyphs will not be per-item or custom

---

## 9. DOCUMENTATION ANCHORS

### Related Files

* **Glyph Logic:** `scripts/apps/store/store-glyph-map.js`
* **Glyph Styling:** `styles/apps/store-cards.css`
* **Template:** `templates/apps/store/store-card-grid.hbs`
* **View Building:** `scripts/apps/store/store-main.js` (method `_buildItemsWithSuggestions`)

### Related Decisions

* **Services Architecture:** `scripts/engine/store/SERVICES_ARCHITECTURE.md`
* **Loading Overlay:** `scripts/apps/store/store-loading-overlay.js`
* **Audit Trail:** See git commits tagged with "audit-store-entities"

---

## 10. CHANGE HISTORY

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-10 | Contract locked | Initial implementation of glyph system |

---

## FINAL STATEMENT

> **This Store shows classification, not photography.**
> **Glyphs are identity. Text is truth.**
> **This contract prevents regression and preserves intent.**

**Signed:** Architecture, 2026-02-10
**Enforcement:** Mandatory for all Store system modifications

---

**Related Session:** https://claude.ai/code/session_012QmxWrpAvRrpWq3kZKuE49
