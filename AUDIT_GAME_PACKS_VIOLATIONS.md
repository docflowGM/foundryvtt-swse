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

## Fix Order

### Step 1: Create TalentRegistry
**File:** `scripts/registries/talent-registry.js`
**Pattern:** Copy FeatRegistry structure, adapt for talent data
**Estimated Impact:** 150-200 lines

### Step 2: Update SuggestionEngine.js
**File:** `scripts/engines/suggestion/SuggestionEngine.js`
**Lines:** 1210-1211
**Change:** Replace game.packs with FeatRegistry/TalentRegistry
```javascript
// Before
const itemPack = item.type === 'feat'
    ? game.packs.get('foundryvtt-swse.feats')
    : game.packs.get('foundryvtt-swse.talents');

// After
const registryEntry = item.type === 'feat'
    ? FeatRegistry.getByName(item.name)
    : TalentRegistry.getByName(item.name);
```

### Step 3: Update ForcePowerEngine.js
**File:** `scripts/engines/progression/engine/force-power-engine.js`
**Lines:** 41, 188, 225, 249, 265
**Changes:**
- Line 41 (fallback): Use FeatRegistry.getById()
- Line 188 (technique lookup): Use ForceRegistry.getByType('technique')
- Line 225 (secret lookup): Use ForceRegistry.getByType('secret')
- Lines 249, 265 (choice creation): Use registry.getAll()

### Step 4: Update ForceProgression.js
**File:** `scripts/engines/progression/engine/force-progression.js`
**Lines:** 188, 225, 249, 265
**Changes:** Same pattern as ForcePowerEngine

### Step 5: Audit CompendiumResolver Callers
**File:** `scripts/engines/suggestion/CompendiumResolver.js` and callers
**Purpose:** Ensure CompendiumResolver is only used for template resolution, not scoring
**Action:** Document restricted use or move if needed

### Step 6: Update DataPreloader
**File:** `scripts/core/data-preloader.js`
**Change:** Add FeatRegistry and TalentRegistry initialization
```javascript
import { FeatRegistry } from '../registries/feat-registry.js';
import { TalentRegistry } from '../registries/talent-registry.js';

// In _preloadType():
if (type === 'feats') {
    await FeatRegistry.initialize();
}
if (type === 'talents') {
    await TalentRegistry.initialize();
}
```

---

## Verification Checklist

After fixes:

- [ ] No `game.packs.get()` calls during scoring pipeline
- [ ] All item lookups during evaluation use registry APIs
- [ ] SuggestionEngine has zero game.packs references
- [ ] ForcePowerEngine uses ForceRegistry exclusively
- [ ] CompendiumResolver only used for template/reference resolution
- [ ] TalentRegistry initialized on system ready
- [ ] All registry APIs return normalized, consistent data
- [ ] No async operations during synchronous scoring

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

