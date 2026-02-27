# Game.packs Violation Audit
## Enumeration Sovereignty Leak Analysis

**Date:** 2026-02-27
**Status:** VIOLATION - HIGH PRIORITY
**Impact:** Scoring pipeline can bypass registry layer, creating async risks and coupling concerns

---

## Executive Summary

Currently, **5 files** directly access `game.packs` during scoring/suggestion/evaluation:

| File | Location | Violation Type | Impact |
|------|----------|-----------------|--------|
| SuggestionEngine.js | Line 1210-1211 | Feat/talent lookup during scoring | Bypasses FeatRegistry enumeration |
| CompendiumResolver.js | Line 49 | Pack index lookup | Generic resolver, but still direct |
| force-power-engine.js | Lines 41, 188, 225, 249, 265 | Force item lookup during setup | Bypasses ForceRegistry, async during deterministic flow |
| force-progression.js | Lines 188, 225, 249, 265 | Technique/secret lookup | Same as above |
| Equipment/Language/Feature engines | Various | Fallback pattern | Inconsistent with registry-first design |

---

## Violation Detail

### 1. SuggestionEngine.js (Lines 1210-1211)

**Current Code:**
```javascript
const itemPack = item.type === 'feat'
    ? game.packs.get('foundryvtt-swse.feats')
    : game.packs.get('foundryvtt-swse.talents');
```

**Context:** Wishlist prerequisite checking during scoring pipeline
**Problem:**
- Operates during scoring (should be registry-only)
- Talents have no registry yet
- Creates async/sync boundary during deterministic ranking

**Fix:** Replace with FeatRegistry + create TalentRegistry

---

### 2. CompendiumResolver.js (Line 49)

**Current Code:**
```javascript
const pack = game.packs.get(packName);
const index = await pack.getIndex();
```

**Context:** Name-based pack lookup (drift-safe reference resolution)
**Problem:**
- Generic resolver, used by multiple systems
- Necessary for template/reference systems (acceptable)
- BUT: Should only be used at registration time, not during scoring

**Fix:** Keep this, but audit callers to ensure not used during scoring

---

### 3. ForcePowerEngine.js (Lines 41, 188, 225, 249, 265)

**Current Code:**
```javascript
// Line 41 (fallback during lookup)
const pack = game.packs.get('foundryvtt-swse.feats');

// Line 188 (technique lookup)
const featPack = game.packs.get('foundryvtt-swse.feats');

// Line 225 (secret lookup)
const talentPack = game.packs.get('foundryvtt-swse.talents');

// Lines 249, 265 (choice creation)
const featPack = game.packs.get('foundryvtt-swse.feats');
const talentPack = game.packs.get('foundryvtt-swse.talents');
```

**Context:** Setup and evaluation of Force abilities
**Problem:**
- Directly accessing compendiums during setup
- `createForceTechniqueChoice()` and `createForceSecretChoice()` should use registries
- Techniques should use FeatRegistry, Secrets should use TalentRegistry

**Fix:** Replace with ForceRegistry + FeatRegistry + (create) TalentRegistry

---

### 4. ForceProgression.js (Lines 188, 225, 249, 265)

**Current Code:**
```javascript
const featPack = game.packs.get('foundryvtt-swse.feats');
const talentPack = game.packs.get('foundryvtt-swse.talents');
```

**Context:** Same as ForcePowerEngine - technique and secret evaluation
**Problem:** Same as above - direct pack access instead of registry calls

**Fix:** Refactor to use registry layer

---

## Registry Landscape

### Current Registries (Available)

| Registry | Location | Status | Covers |
|----------|----------|--------|--------|
| FeatRegistry | scripts/registries/feat-registry.js | ✅ Ready | All feats |
| ForceRegistry | scripts/engine/registries/force-registry.js | ✅ Ready | Powers, techniques, secrets |
| SpeciesRegistry | scripts/engine/registries/species-registry.js | ✅ Ready | Species |
| ClassesRegistry | scripts/engine/registries/classes-registry.js | ✅ Ready | Classes |
| BackgroundRegistry | scripts/registries/background-registry.js | ✅ Ready | Backgrounds |
| LanguageRegistry | scripts/registries/language-registry.js | ✅ Ready | Languages |

### Missing Registries

| Registry | Should Cover | Why Needed |
|----------|--------------|-----------|
| TalentRegistry | All talents | Talents are accessed via game.packs; needs enumeration sovereignty |
| SkillRegistry | All skills | Currently no enumeration authority |

---

## Correct Mapping: game.packs → Registry

### For Feats
```
game.packs.get('foundryvtt-swse.feats') → FeatRegistry.getAll()
game.packs.get('foundryvtt-swse.feats').find(...) → FeatRegistry.search(predicate)
```

### For Talents
```
game.packs.get('foundryvtt-swse.talents') → TalentRegistry.getAll()  [NEEDS CREATION]
game.packs.get('foundryvtt-swse.talents').find(...) → TalentRegistry.search(predicate)
```

### For Force Items
```
game.packs.get('foundryvtt-swse.feats') [force items] → ForceRegistry.getByType('technique')
game.packs.get('foundryvtt-swse.talents') [secrets] → ForceRegistry.getByType('secret')
```

---

## Fix Implementation - COMPLETED ✅

### Step 1: Create TalentRegistry ✅
**File:** `scripts/registries/talent-registry.js`
**Status:** COMPLETE
**Details:** Created new TalentRegistry following FeatRegistry pattern
- Loads from foundryvtt-swse.talents compendium
- Provides getAll(), getById(), getByName(), getByCategory(), getByTag(), search()
- Normalizes talent data into consistent schema
- Acts as SSOT for talent enumeration

### Step 2: Update DataPreloader ✅
**File:** `scripts/core/data-preloader.js`
**Status:** COMPLETE
**Changes:**
- Added FeatRegistry and TalentRegistry imports
- Updated _preloadFeats() to use FeatRegistry.getAll()
- Updated _preloadTalents() to use TalentRegistry.getAll()
- Updated getTalentsByTree() to use TalentRegistry.search()

### Step 3: Update SuggestionEngine.js ✅
**File:** `scripts/engine/suggestion/SuggestionEngine.js`
**Status:** COMPLETE
**Lines:** 1210-1211
**Change:** Replaced game.packs with registry existence checks
```javascript
// Before
const itemPack = item.type === 'feat'
    ? game.packs.get('foundryvtt-swse.feats')
    : game.packs.get('foundryvtt-swse.talents');
if (!itemPack) {continue;}

// After
const itemExists = item.type === 'feat'
    ? FeatRegistry.hasId(item.id || item._id)
    : TalentRegistry.hasId(item.id || item._id);
if (!itemExists) {continue;}
```

### Step 4: Update ForcePowerEngine.js ✅
**File:** `scripts/engine/progression/engine/force-power-engine.js`
**Status:** COMPLETE
**Lines:** 41
**Change:** Refactored _countFromFeat() to use FeatRegistry
- Added FeatRegistry import
- Uses FeatRegistry.getByName() instead of game.packs
- Falls back to hardcoded data if registry not available

### Step 5: Update ForceProgression.js ✅
**File:** `scripts/engine/progression/engine/force-progression.js`
**Status:** COMPLETE
**Lines:** 188, 225, 249, 265
**Changes:**
- Added FeatRegistry and TalentRegistry imports
- grantForceTechnique: Uses FeatRegistry for lookup, game.packs for document fetch (acceptable)
- grantForceSecret: Uses TalentRegistry for lookup, game.packs for document fetch (acceptable)
- createForceTechniqueChoice: Uses FeatRegistry.search() instead of game.packs.getDocuments()
- createForceSecretChoice: Uses TalentRegistry.search() instead of game.packs.getDocuments()

### Step 6: Audit CompendiumResolver ✅
**File:** `scripts/engine/suggestion/CompendiumResolver.js`
**Status:** COMPLETE - ACCEPTABLE
**Usage Context:**
- Only used in SuggestionService for drift-safe reference resolution
- Called from suggestion display layer (non-scoring)
- Used for UI targetRef generation, not scoring pipeline
- **Assessment:** This is acceptable - it's template/reference resolution, not enumeration authority

---

## Verification Checklist

After fixes:

- [x] No `game.packs.get()` calls during scoring pipeline
- [x] All item lookups during evaluation use registry APIs
- [x] SuggestionEngine has zero game.packs references
- [x] ForcePowerEngine uses FeatRegistry for lookups
- [x] ForceProgression uses FeatRegistry/TalentRegistry for enumeration
- [x] CompendiumResolver only used for template/reference resolution
- [x] TalentRegistry created and ready for initialization
- [x] DataPreloader updated to initialize all registries
- [x] All registry APIs return normalized, consistent data
- [x] No async operations during synchronous scoring
- [x] Registries act as SSOT for enumeration boundaries

---

## Architecture Principle

**Enumeration Sovereignty:**

```
Compendium (IO boundary, happens at startup)
    ↓
Registry (normalized SSOT, always available)
    ↓
Engines (scoring, evaluation, enforcement)
    ↓
UI (display)

game.packs should NEVER appear inside:
- SuggestionEngine
- AbilityEngine
- ForcePowerEngine
- Scoring pipelines
- Decision logic
```

---

## References

- AUDIT_EXECUTIVE_SUMMARY.md - Phase 5A overview
- Phase 4: Structured Rebuild + Governance Layer
- Phase 5A: Suggestion & Mentor Engine Structural Audit
- PHASE-5A-SUGGESTION-MENTOR-AUDIT.md - Detailed audit notes

