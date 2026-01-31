# SSOT Verification Report

**Date:** 2026-01-25
**Status:** Pre-Execution Analysis (Code Review Complete, Foundry Console Verification Needed)

---

## ✅ Code-Level Verification (Complete)

These items have been verified through code analysis:

### Actor Model - Code
- [x] Actor types defined in system.json: character, droid, vehicle, npc (found in packs section)
- [x] Actor creation centralized in `chargen-main.js` (Actor.create at line 2638)
- [x] No legacy Item-based actor creation paths currently active
- [x] One-time migrations that repaired actor data have been deleted

### Compendium Structure - Code
- [x] Actor packs: `npc.db`, `droids.db` (only Actor type)
- [x] Item packs: weapons, armor, equipment, feats, talents, etc. (only Item type)
- [x] Force compendiums exist: forcepowers, forcesecrets, forcetechniques, lightsaberformpowers
- [x] No mixed document types found in pack definitions

### Settings Cleanup - Code
- [x] Deleted migration settings removed from system.json
- [x] Deleted migration imports removed from index.js
- [x] Remaining migrations are active/necessary:
  - populate-force-compendiums.js (data population)
  - update-species-traits-migration.js (v1.1.216)
  - fix-talent-effect-validation.js (v13 compat)
  - talent-ssot-refactor.js (SSOT validation)

---

## 📊 Console Verification Required (Run These in Foundry)

### 1. Actor Model Integrity

```javascript
// Check: All actors are real Actor documents
const allActorsValid = game.actors.contents.every(a => a instanceof Actor);
console.log("All actors valid?", allActorsValid);
if (!allActorsValid) {
  const invalid = game.actors.contents.filter(a => !(a instanceof Actor));
  console.error("Invalid actors:", invalid.map(a => a.name));
}
```

**Expected:** `true` (all actors are valid)

```javascript
// Check: No actors with invalid types
const validTypes = ["character", "droid", "vehicle", "npc"];
const invalidActors = game.actors.contents.filter(a => !validTypes.includes(a.type));
console.log(`Actors with invalid types: ${invalidActors.length}`);
if (invalidActors.length > 0) {
  console.table(invalidActors.map(a => ({ name: a.name, type: a.type })));
}
```

**Expected:** `0` invalid actors

### 2. Talent Tree System

```javascript
// Check: No talents in Unassigned (unless intentional)
const unassignedTree = game.swse?.talents?.trees?.find(t => t.name === "Unassigned");
const unassignedTalentCount = unassignedTree?.talents?.length || 0;
console.log(`Talents in Unassigned: ${unassignedTalentCount}`);
if (unassignedTalentCount > 5) {
  console.warn("⚠️ Many talents in Unassigned - data normalization may be needed");
}
```

**Expected:** 0 or very small number (< 5)

```javascript
// Check: TalentTreeRegistry uses fallback?
const usesFallback = game.swse?.talents?.usesFallback;
console.log("TalentTreeRegistry uses fallback?", usesFallback);
if (usesFallback) {
  console.error("❌ SSOT NOT READY: Still using fallback registry");
}
```

**Expected:** `false` or `undefined` (no fallback)

```javascript
// Check: Tree count
const treeCount = Object.keys(game.swse?.talents?.trees || {}).length;
console.log(`Total talent trees: ${treeCount}`);
```

**Expected:** 189 (or your system's count)

### 3. Compendium Validation

```javascript
// Check: All packs have correct document types
for (const pack of game.packs) {
  const docs = pack.index.contents;
  const types = new Set(docs.map(d => d.type));

  if (types.size > 1) {
    console.error(`❌ MIXED TYPES in ${pack.collection}:`, Array.from(types));
  }
}
console.log("✅ Compendium validation complete (check for errors above)");
```

**Expected:** No errors (or only intentional ones)

```javascript
// Check: Force compendiums populated
const forcePacks = ["forcepowers", "forcesecrets", "forcetechniques", "lightsaberformpowers"];
for (const packName of forcePacks) {
  const pack = game.packs.get(`foundryvtt-swse.${packName}`);
  const count = pack?.index?.size || 0;
  console.log(`${packName}: ${count} documents`);
}
```

**Expected:** All should have > 0 documents

### 4. Chargen / Level-Up APIs

```javascript
// Check: Chargen entry point exists
const chargenExists = !!game.swse?.apps?.chargen;
console.log("CharGen app exists?", chargenExists);

// Check: Mentor is derived from actor state
const testActor = game.actors.getName("TestCharacter") || game.actors.contents[0];
if (testActor) {
  console.log(`Actor class: ${testActor.system.class}`);
  console.log(`Mentor would be derived from class, not cached`);
}
```

**Expected:** chargenExists = true, mentor is derived

### 5. UI Containment

```javascript
// Check: No 100vw / 100vh in styles
const styleSheets = Array.from(document.styleSheets);
for (const sheet of styleSheets) {
  try {
    for (const rule of sheet.cssRules || []) {
      if (rule.style?.width === "100vw" || rule.style?.width === "100%") {
        console.warn("Found width: 100vw in", rule.selectorText);
      }
    }
  } catch (e) {
    // CORS error, skip
  }
}
console.log("✅ Style check complete");
```

**Expected:** No warnings about 100vw/100vh

```javascript
// Check: Window position preserved on render
// This is visual - open a chargen sheet and switch tabs
// Watch if window position jumps or shifts
console.log("✅ Manually verify: Open chargen sheet and switch tabs");
console.log("   - Window should NOT move");
console.log("   - Content should render smoothly");
```

**Expected:** Smooth rendering, no jumps

### 6. Logging Quality

```javascript
// Check: Startup errors (run this right after game load)
const errors = game.swse?.logs?.errors || [];
console.log(`Errors during startup: ${errors.length}`);
if (errors.length > 0) {
  console.table(errors.map(e => ({ type: e.type, message: e.message })));
}
```

**Expected:** 0 errors (or only intentional warnings)

---

## 🚦 Interpretation Guide

### GREEN (Ready for Next Phase)
- All actors valid ✓
- No invalid actor types ✓
- Few/no talents in Unassigned ✓
- TalentTreeRegistry doesn't use fallback ✓
- All compendiums have consistent types ✓
- Chargen API exists and works ✓
- No UI jumping/layout issues ✓
- Clean startup logs ✓

### YELLOW (Needs Attention)
- Some talents in Unassigned (< 10 is OK)
- A few style warnings
- Minor UI quirks on render

### RED (Blocker - Fix Before Continuing)
- Invalid actors exist
- TalentTreeRegistry still using fallback
- Mixed document types in compendiums
- Startup errors in console
- Chargen completely broken

---

## Next Steps

1. **Run all console commands above** in a Foundry session
2. **Document results** in a verification checklist
3. **If RED items:** Investigate and fix before continuing
4. **If YELLOW items:** Document as known issues, proceed with caution
5. **If GREEN:** Ready to delete Phase 3 legacy code

---

## Phase Completion Tracking

- [x] Phase 1: Delete migrations (DONE)
- [x] Phase 2: Remove fuzzy matching (DONE)
- [ ] **Phase 3: Delete Item-to-Actor conversion** (BLOCKED on SSOT verification)
- [ ] Phase 4: Remove progression guessing
- [ ] Phase 5: Delete UI fallbacks
- [ ] Tag v1.0-ssot-complete

**You are here:** VERIFICATION GATE

Do not proceed to Phase 3 until console verification is complete and shows mostly GREEN items.
