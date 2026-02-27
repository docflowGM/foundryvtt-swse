# Tier Resolution Unification Audit
## Cross-Engine Tier Consistency Analysis

**Date:** 2026-02-27
**Status:** INCONSISTENT - CONSOLIDATION NEEDED
**Impact:** Invisible drift between suggestion engines, no single tier authority

---

## Executive Summary

Currently **7 suggestion engines** have custom tier definitions instead of using UNIFIED_TIERS:

| Engine | File | Custom Tiers | Status |
|--------|------|--------------|--------|
| SuggestionEngine | suggestion/SuggestionEngine.js | SUGGESTION_TIERS (maps to UNIFIED_TIERS) | ✅ Uses UNIFIED_TIERS |
| Force Secrets | progression/engine/force-secret-suggestion-engine.js | FORCE_SECRET_TIERS | ❌ Custom |
| Force Techniques | progression/engine/force-technique-suggestion-engine.js | FORCE_TECHNIQUE_TIERS | ❌ Custom |
| Attributes | suggestion/AttributeIncreaseSuggestionEngine.js | ATTRIBUTE_TIERS | ❌ Custom |
| Backgrounds | suggestion/BackgroundSuggestionEngine.js | BACKGROUND_SUGGESTION_TIERS | ⚠️ Partial (uses UNIFIED_TIERS for some) |
| Classes | suggestion/ClassSuggestionEngine.js | CLASS_SUGGESTION_TIERS | ⚠️ Partial |
| Force Options | suggestion/ForceOptionSuggestionEngine.js | FORCE_OPTION_TIERS | ❌ Custom |
| Level 1 Skills | suggestion/Level1SkillSuggestionEngine.js | LEVEL1_SKILL_TIERS | ❌ Custom |

---

## Problem: Why Tier Fragmentation Matters

### Invisible Drift

**User Experience:**
- Same character sees different tier priorities for different item types
- Feat sorted as TIER 4, but similar talent sorted as TIER 2
- No consistent decision-making across suggestion UI

**Architectural Risk:**
- Mentor bias wiring assumes single tier authority
- If mentor bias adjusts scores differently per engine, tier mapping becomes inconsistent
- Sentinel can't enforce tier consistency

### Example of Drift

```javascript
// SuggestionEngine (correct tier mapping)
SUGGESTION_TIERS.CHAIN_CONTINUATION: 4

// ForceOptionSuggestionEngine (custom tier)
FORCE_OPTION_TIERS = {
  AVAILABLE: 0,
  CHAIN_CONTINUATION: 3  // DIFFERENT!
}

// Same character, same build, same continuation pattern
// But different tier assignments
```

---

## Custom Tier Definitions (Detailed)

### 1. FORCE_SECRET_TIERS
**File:** `scripts/engines/progression/engine/force-secret-suggestion-engine.js`
**Defined As:**
```javascript
export const FORCE_SECRET_TIERS = {
  AVAILABLE_FIT: 0,
  SPECIALIZED: 1,
  SPEC_TRAINING: 2,
  CORE_PATH: 3
}
```
**Problem:**
- Only 4 tiers (UNIFIED has 7)
- Named differently (AVAILABLE_FIT vs AVAILABLE)
- No prestige tier (6)
- No path continuation tier (4)

**Mapping to UNIFIED:**
- AVAILABLE_FIT → UNIFIED_TIERS.AVAILABLE (0)
- SPECIALIZED → UNIFIED_TIERS.THEMATIC_FIT (1)
- SPEC_TRAINING → UNIFIED_TIERS.ABILITY_SYNERGY (2)
- CORE_PATH → UNIFIED_TIERS.CATEGORY_SYNERGY (3)

### 2. FORCE_TECHNIQUE_TIERS
**File:** `scripts/engines/progression/engine/force-technique-suggestion-engine.js`
**Defined As:**
```javascript
export const FORCE_TECHNIQUE_TIERS = {
  AVAILABLE: 0,
  SPECIALIZED: 1,
  POWER_BASED: 2,
  TECHNIQUE_CHAIN: 3
}
```
**Problem:**
- Only 4 tiers
- No prestige tier
- TECHNIQUE_CHAIN should be PATH_CONTINUATION (tier 4)

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- SPECIALIZED → UNIFIED_TIERS.THEMATIC_FIT (1)
- POWER_BASED → UNIFIED_TIERS.ABILITY_SYNERGY (2)
- TECHNIQUE_CHAIN → UNIFIED_TIERS.PATH_CONTINUATION (4)

### 3. ATTRIBUTE_TIERS
**File:** `scripts/engines/suggestion/AttributeIncreaseSuggestionEngine.js`
**Defined As:**
```javascript
export const ATTRIBUTE_TIERS = {
  AVAILABLE: 0,
  MATCHES_BUILD: 1,
  HIGH_PRIORITY: 2
}
```
**Problem:**
- Only 3 tiers
- BUILD matching is secondary, not primary
- No chain/continuation concept

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- MATCHES_BUILD → UNIFIED_TIERS.ABILITY_SYNERGY (2)
- HIGH_PRIORITY → UNIFIED_TIERS.CATEGORY_SYNERGY (3)

### 4. BACKGROUND_SUGGESTION_TIERS
**File:** `scripts/engines/suggestion/BackgroundSuggestionEngine.js`
**Defined As:**
```javascript
export const BACKGROUND_SUGGESTION_TIERS = {
  AVAILABLE: 0,
  CLASS_SYNERGY: 2,
  CLASS_MATCH: 3
}
```
**Problem:**
- Partial custom (some code uses UNIFIED_TIERS)
- Missing tier 1 (THEMATIC_FIT)
- Inconsistent usage

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- CLASS_SYNERGY → UNIFIED_TIERS.ABILITY_SYNERGY (2)
- CLASS_MATCH → UNIFIED_TIERS.CATEGORY_SYNERGY (3)

### 5. CLASS_SUGGESTION_TIERS
**File:** `scripts/engines/suggestion/ClassSuggestionEngine.js`
**Defined As:**
```javascript
export const CLASS_SUGGESTION_TIERS = {
  AVAILABLE: 0,
  SYNERGY: 1,
  PRESTIGE_READY: 3,
  PRESTIGE_REQUIREMENT: 4
}
```
**Problem:**
- PRESTIGE_REQUIREMENT should be tier 6, not 4
- PRESTIGE_READY should be tier 5, not 3
- SYNERGY is vague (which tier?)

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- SYNERGY → UNIFIED_TIERS.THEMATIC_FIT (1)
- PRESTIGE_READY → UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW (5)
- PRESTIGE_REQUIREMENT → UNIFIED_TIERS.PRESTIGE_PREREQUISITE (6)

### 6. FORCE_OPTION_TIERS
**File:** `scripts/engines/suggestion/ForceOptionSuggestionEngine.js`
**Defined As:**
```javascript
export const FORCE_OPTION_TIERS = {
  AVAILABLE: 0,
  SYNERGY: 1,
  SPECIALIZATION: 2,
  POWER_CHAIN: 3
}
```
**Problem:**
- Only 4 tiers
- POWER_CHAIN should be PATH_CONTINUATION (4)
- SPECIALIZATION is vague

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- SYNERGY → UNIFIED_TIERS.THEMATIC_FIT (1)
- SPECIALIZATION → UNIFIED_TIERS.ABILITY_SYNERGY (2)
- POWER_CHAIN → UNIFIED_TIERS.PATH_CONTINUATION (4)

### 7. LEVEL1_SKILL_TIERS
**File:** `scripts/engines/suggestion/Level1SkillSuggestionEngine.js`
**Defined As:**
```javascript
export const LEVEL1_SKILL_TIERS = {
  AVAILABLE: 0,
  CLASS_MATCH: 1,
  PRIMARY_CLASS_SKILL: 2
}
```
**Problem:**
- Only 3 tiers
- CLASS_MATCH is weak (tier 1)
- No synergy tiers

**Mapping to UNIFIED:**
- AVAILABLE → UNIFIED_TIERS.AVAILABLE (0)
- CLASS_MATCH → UNIFIED_TIERS.THEMATIC_FIT (1)
- PRIMARY_CLASS_SKILL → UNIFIED_TIERS.CATEGORY_SYNERGY (3)

---

## UNIFIED_TIERS Authority

**Current:** `scripts/engines/suggestion/suggestion-unified-tiers.js`

**Strength:**
- 7-tier hierarchy (0-6)
- Complete metadata (labels, colors, icons, descriptions)
- Tier validation function
- Helper functions (getTierBadge, getTierMetadata, compareTiers)
- Designed for cross-engine consistency

**What's Missing:**
- Enforcement - no system prevents custom tier definitions
- Documentation - no guide for engine developers
- Migration path - no tooling to upgrade engines

---

## Consolidation Strategy

### Phase 1: Remove Custom Tier Constants
Delete or deprecate:
- FORCE_SECRET_TIERS
- FORCE_TECHNIQUE_TIERS
- ATTRIBUTE_TIERS
- BACKGROUND_SUGGESTION_TIERS
- CLASS_SUGGESTION_TIERS
- FORCE_OPTION_TIERS
- LEVEL1_SKILL_TIERS

### Phase 2: Replace with UNIFIED_TIERS Imports
Each engine imports:
```javascript
import { UNIFIED_TIERS } from '../../engines/suggestion/suggestion-unified-tiers.js';
```

### Phase 3: Update Tier Assignment Logic
Replace all tier assignments:
```javascript
// Before
let tier = FORCE_SECRET_TIERS.CORE_PATH;

// After
let tier = UNIFIED_TIERS.CATEGORY_SYNERGY;  // Mapped from CORE_PATH
```

### Phase 4: Update Tier Metadata Access
Standardize metadata retrieval:
```javascript
import { getTierMetadata } from '../../engines/suggestion/suggestion-unified-tiers.js';

// In engine
const metadata = getTierMetadata(tier);
suggestion.icon = metadata.icon;
suggestion.color = metadata.color;
```

---

## Fix Order

### Step 1: Audit Each Engine's Tier Logic
**Purpose:** Understand what each custom tier means semantically
**Output:** Mapping document (tier → UNIFIED_TIER)

### Step 2: Update ForceSecretSuggestionEngine
**File:** `scripts/engines/progression/engine/force-secret-suggestion-engine.js`
**Changes:**
- Remove FORCE_SECRET_TIERS constant
- Import UNIFIED_TIERS
- Replace tier assignments per mapping table
- Use getTierMetadata() for UI metadata

### Step 3: Update ForceTechniqueSuggestionEngine
**File:** `scripts/engines/progression/engine/force-technique-suggestion-engine.js`
**Changes:** Same as Force Secrets

### Step 4: Update AttributeIncreaseSuggestionEngine
**File:** `scripts/engines/suggestion/AttributeIncreaseSuggestionEngine.js`
**Changes:** Same pattern

### Step 5: Update BackgroundSuggestionEngine
**File:** `scripts/engines/suggestion/BackgroundSuggestionEngine.js`
**Changes:**
- Remove BACKGROUND_SUGGESTION_TIERS
- Consolidate mixed UNIFIED_TIERS usage
- Ensure consistency

### Step 6: Update ClassSuggestionEngine
**File:** `scripts/engines/suggestion/ClassSuggestionEngine.js`
**Changes:** Same pattern

### Step 7: Update ForceOptionSuggestionEngine
**File:** `scripts/engines/suggestion/ForceOptionSuggestionEngine.js`
**Changes:** Same pattern

### Step 8: Update Level1SkillSuggestionEngine
**File:** `scripts/engines/suggestion/Level1SkillSuggestionEngine.js`
**Changes:** Same pattern

### Step 9: Add TierResolver Enforcement
**Purpose:** Prevent future custom tier definitions
**Action:** Create/update linting rules or documentation

### Step 10: Verification & Testing
**Checklist:**
- All suggestion engines produce same tier for equivalent items
- UI displays consistent tier metadata
- No references to deprecated tier constants remain
- All tier values are 0-6

---

## Verification Checklist

After unification:

- [ ] Zero custom tier constants in codebase
- [ ] All engines import UNIFIED_TIERS
- [ ] All tier assignments use UNIFIED_TIERS constants
- [ ] All tier metadata uses getTierMetadata()
- [ ] UI displays consistent colors/icons across engines
- [ ] Equivalent items get same tier across all engines
- [ ] Mentor bias wiring has single tier authority
- [ ] TierResolver can validate consistency

---

## Architecture Principle

**Single Tier Authority:**

```
SuggestionEngine     ForceSecretEngine     AttributeEngine
       ↓                    ↓                     ↓
    TIER 4              TIER 4                  TIER 4
       ↑                    ↑                     ↑
       └────────────────────┴─────────────────────┘
                 ↓
        UNIFIED_TIERS (authority)
                 ↓
      getTierMetadata (UI consistency)
```

Currently:
```
SuggestionEngine     ForceSecretEngine     AttributeEngine
  (uses TIER 4)    (uses CUSTOM_TIER 3)   (uses CUSTOM_TIER 2)
                        ↑
                  INVISIBLE DRIFT
```

---

## References

- UNIFIED_TIERS definition: `scripts/engines/suggestion/suggestion-unified-tiers.js`
- SuggestionEngine mapping: `scripts/engines/suggestion/SuggestionEngine.js` (lines 41-50)
- AUDIT_GAME_PACKS_VIOLATIONS.md - Completed enumeration sovereignty fix
- Phase 5A: Suggestion & Mentor Engine Structural Audit

