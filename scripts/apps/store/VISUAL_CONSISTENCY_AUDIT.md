# Visual Consistency Audit — SWSE Store System

**Date:** 2026-02-10
**Scope:** Glyph system isolation and metaphor consistency
**Status:** ✅ CLEAN — No conflicts detected

---

## 1. AUDIT FINDINGS

### 1.1 Glyph Usage (SSOT Compliance)

**Scope:** Where glyphs appear in templates

| Location | Files | Status |
|----------|-------|--------|
| Store cards | `store-card-grid.hbs` | ✅ ONLY glyph location |
| Other templates | (searched all) | ✅ ZERO glyph usage elsewhere |
| Styles | `store-cards.css` | ✅ ONLY glyph styling |

**Finding:** Glyphs are used exclusively in Store cards. No metaphor bleed into other UI systems.

---

### 1.2 Image Usage (Allowed Contexts)

**Contexts where images ARE used (and should remain):**

| Context | Purpose | Status |
|---------|---------|--------|
| Character sheets | Actor portraits (user-facing) | ✅ CORRECT |
| NPC sheets | NPC portraits | ✅ CORRECT |
| Vehicle sheets | Vehicle portraits | ✅ CORRECT |
| Droid sheets | Droid portraits | ✅ CORRECT |
| Inventory tabs | Item art (visual reference) | ✅ CORRECT |
| Chargen wizard | Character preview images | ✅ CORRECT |
| Levelup app | Visual feedback (portraits) | ✅ CORRECT |
| Mentor dialogs | Mentor portraits | ✅ CORRECT |
| Rendarr (Store) | Merchant NPC portrait | ✅ CORRECT |

**Finding:** Images are used for actor/NPC/vehicle portraits and item art. This is correct and NOT in conflict with glyph system (glyphs are CLASSIFICATION, not portraits).

---

### 1.3 Classification Systems (No Conflicts)

**Store classification:** Glyphs (SSOT via `store-glyph-map.js`)

**Other classification systems:**
- Character sheets: Type-based conditional rendering (`eq item.type "weapon"`)
- Inventory: Item icons + names (visual reference, not classification)
- Chargen: Step-based UI (not classified via visuals)

**Finding:** No conflicting classification systems. Each uses its own appropriate method.

---

### 1.4 Marketplace Metaphor Consistency

**Rendarr's Exchange metaphor:**

| Element | Location | Status |
|---------|----------|--------|
| Merchant NPC | `rendarrImage` (portrait) | ✅ Consistent |
| Loading overlay | Aurebesh-first bootstrap | ✅ Consistent |
| Product cards | Glyph-based classification | ✅ Consistent |
| Dialogue | Rendarr merchant lines | ✅ Consistent |
| Services | Contextual expenses (flavor text) | ✅ Consistent |

**Finding:** All Store elements reinforce "foreign system" metaphor. Zero conflicts.

---

## 2. VIOLATION CHECKLIST

### No Image References in Store Cards

```
✅ store-card-grid.hbs: NO <img> tags for products
✅ store-cards.css: NO background-image for products
✅ store-main.js: NO .img field passed to template
```

### No Conflicting Glyphs Elsewhere

```
✅ Item sheets: No glyphs used
✅ Character sheets: No glyphs used
✅ NPC sheets: No glyphs used
✅ Inventory: No glyphs used
```

### No Mixed Metaphors

```
✅ Store: Foreign/alien (Aurebesh glyphs)
✅ Sheets: Familiar/Foundry standard (images)
✅ No bleed between systems
```

---

## 3. RISK ASSESSMENT

### Low Risk (Current State)

- **Images in other UIs:** Expected and correct
- **Glyphs in Store only:** Isolated, no propagation risk
- **Classification metaphors:** Each UI uses appropriate method
- **Accessibility:** Glyphs marked aria-hidden, text preserved

### Future Risk Points (To Monitor)

- ❌ **If:** Someone adds images to Store cards as "fallback"
  - **Prevention:** Visual Contract (STORE_VISUAL_CONTRACT.md)

- ❌ **If:** Glyphs are copy-pasted to other UIs
  - **Prevention:** Glyph map is Store-specific, not exported generally

- ❌ **If:** New Marketplace features use images instead of glyphs
  - **Prevention:** Visual Contract Section 6

---

## 4. RECOMMENDATIONS

### No Changes Required

The codebase is **clean and consistent**. No regressions detected.

### Optional: Cross-Reference Documentation

Add one line to related files to prevent future confusion:

```markdown
<!-- In character-sheet.hbs or item-sheet.hbs -->
<!-- NOTE: Images here (actor portraits) are distinct from Store -->
<!-- glyphs (product classification). See STORE_VISUAL_CONTRACT.md -->
```

---

## 5. CONCLUSION

✅ **VISUAL CONSISTENCY: VERIFIED**

- Glyph system is isolated to Store cards
- No conflicting metaphors
- Images are used appropriately elsewhere
- Classification systems are independent
- Architecture is clean and extensible

**No violations detected. Ready for Phase 2 (glyph reuse) and Phase 3 (rarity effects).**

---

**Related:** STORE_VISUAL_CONTRACT.md, store-glyph-map.js
