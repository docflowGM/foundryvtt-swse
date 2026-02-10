# Phase 5C+5D: Chargen Cards & Suggestion Reconciliation

## Overview

Two complementary phases to complete v2 chargen finalization:
- **Phase 5C**: Improve chargen card UX and data display
- **Phase 5D**: Unify suggestion engines under single tier system

## Phase 5C: Chargen Card Finalization

### Current Status

**Cards Implemented (6/7):**
- ✅ Species: Overlay with abilities, skills, traits
- ✅ Class: Flip cards with hit die, BAB, defenses, level progression
- ✅ Background: Flip cards with skills, languages, special abilities
- ✅ Feats: Flip cards with prerequisites, benefits, tier badge
- ✅ Talents: Flip cards with tree position, level unlock, tier badge
- ✅ Starship Maneuvers: Flip cards with description, DC, prerequisites

**Cards Missing (1/7):**
- ❌ Force Powers: List-based, no card UI
- ❌ Skills: List-based, no card UI
- ❌ Languages: List-based, no card UI

**Suggestion Badges:**
- Currently: Only feats and talents show tier badges
- Target: All selectable items show tier badges (consistency)

### Implementation: Phase 5C

#### STEP 1: Force Power Cards (HIGH IMPACT, SMALL SCOPE)
**File**: `scripts/apps/chargen/chargen-force-powers.js`
**Current**: List rendering
**Target**: Flip card UI matching feats/talents

```javascript
// Convert from list to card grid
// Front: Power name, level, description
// Back: Full mechanics, prerequisites, scaling
// Badge: Suggestion tier (using UNIFIED_TIERS)
```

**Effort**: 2-3 hours (copy pattern from feats/talents)
**Impact**: Makes Force chargen more premium, consistent UX

#### STEP 2: Standardize Card Rendering (MEDIUM SCOPE)
**Files**: All `chargen-*.js` card bindings
**Current**: Each has inline HTML + jQuery binding
**Target**: Template-based, centralized

Create `/scripts/apps/chargen/components/chargen-card-renderer.js`:
```javascript
class ChargenCardRenderer {
  static renderFlipCard(item, tier, onClick) {
    // Standardized flip card with:
    // - Front: name + icon + brief
    // - Back: full description + mechanics
    // - Badge: tier indicator
    // - Buttons: select, read (opens compendium)
  }

  static renderListCard(item, tier) {
    // Standardized list item with minimal UI
  }
}
```

**Effort**: 3-4 hours (refactor existing patterns)
**Impact**: Easier to maintain, consistent look/feel

#### STEP 3: Add Suggestion Badges to All Cards (SMALL SCOPE)
**Files**: All card rendering
**Target**: Show UNIFIED_TIERS badge (icon + color + label)

```javascript
// On every card:
// - Teal gem: Strong synergy (TIER 3)
// - Blue star: Ability match (TIER 2)
// - Green check: Thematic fit (TIER 1)
// - Gray circle: Available (TIER 0)
```

**Effort**: 1-2 hours (add badge div + styling)
**Impact**: Makes suggestions visible, explains recommendations

### Phase 5C Deliverables

1. **Force Power flip cards** - Full parity with feats/talents
2. **Standardized card renderer** - Template-based, DRY
3. **Suggestion badges** - All items show tier
4. **Documentation** - Card component reference

---

## Phase 5D: Suggestion Engine Reconciliation

### Current State

**6 Specialized Suggestion Engines:**
1. `SuggestionEngine` - Feats & talents (TIERS: 0-6 custom)
2. `ClassSuggestionEngine` - Classes (TIERS: 0-5 custom)
3. `BackgroundSuggestionEngine` - Backgrounds (TIERS: 0-3 custom)
4. `ForceOptionSuggestionEngine` - Powers, secrets, techniques (TIERS: 0-5 custom)
5. `Level1SkillSuggestionEngine` - L1 skills (simple scoring)
6. `AttributeIncreaseSuggestionEngine` - Ability score gains (simple scoring)

**Problem:**
- Each has its own tier definitions
- Inconsistent tier semantics
- Can't compare suggestions across types
- Hard to understand why something was suggested

**Solution:** UNIFIED_TIERS (created in Phase 5C+5D foundation)

### Implementation: Phase 5D

#### STEP 1: Refactor SuggestionEngine (CORE ENGINE)
**File**: `scripts/engine/SuggestionEngine.js`
**Target**: Map existing logic → UNIFIED_TIERS

```javascript
import { UNIFIED_TIERS } from './suggestion-unified-tiers.js';

// Current:
// - PRESTIGE_PREREQ = 6
// - CHAIN_CONTINUATION = 4
// - CLASS_SYNERGY = 1
// - FALLBACK = 0

// New:
// - PRESTIGE_PREREQUISITE = 6
// - PATH_CONTINUATION = 4
// - CATEGORY_SYNERGY = 3
// - THEMATIC_FIT = 1
// - AVAILABLE = 0

class SuggestionEngine {
  static calculateTier(feat, actor, buildIntent) {
    if (this._isPrestigePrereq(feat, buildIntent)) {
      return UNIFIED_TIERS.PRESTIGE_PREREQUISITE;
    }
    if (this._isContinuingPath(feat, actor)) {
      return UNIFIED_TIERS.PATH_CONTINUATION;
    }
    if (this._hasClassSynergy(feat, actor)) {
      return UNIFIED_TIERS.CATEGORY_SYNERGY;
    }
    return UNIFIED_TIERS.AVAILABLE;
  }
}
```

**Effort**: 2-3 hours
**Impact**: Foundation for all other engines

#### STEP 2: Refactor ClassSuggestionEngine
**File**: `scripts/engine/ClassSuggestionEngine.js`
**Task**: Map CLASS_SYNERGY → CATEGORY_SYNERGY, etc.
**Effort**: 1 hour

#### STEP 3: Refactor BackgroundSuggestionEngine
**File**: `scripts/engine/BackgroundSuggestionEngine.js`
**Task**: Map ABILITY_SYNERGY → ABILITY_SYNERGY, CLASS_SYNERGY → CATEGORY_SYNERGY
**Effort**: 1 hour

#### STEP 4: Refactor ForceOptionSuggestionEngine
**File**: `scripts/engine/ForceOptionSuggestionEngine.js`
**Task**: Align PRESTIGE_ALIGNED → PRESTIGE_QUALIFIED_NOW
**Effort**: 1 hour

#### STEP 5: Refactor Skill & Ability Engines
**Files**: `Level1SkillSuggestionEngine.js`, `AttributeIncreaseSuggestionEngine.js`
**Task**: Convert scores to UNIFIED_TIERS (0-6)
**Effort**: 1-2 hours

#### STEP 6: Update SuggestionEngineCoordinator
**File**: `scripts/engine/SuggestionEngineCoordinator.js`
**Task**: Import UNIFIED_TIERS, verify all engines use it
**Effort**: 30 min

#### STEP 7: Add Unit Tests
**New file**: `tests/suggestion-tiers.test.js`
**Tests**:
- Each engine produces consistent tiers
- Tier assignments are deterministic
- Comparisons work across engines
**Effort**: 2 hours

### Phase 5D Deliverables

1. **Unified tier system** - All engines use `UNIFIED_TIERS`
2. **Refactored engines** - All map local logic → unified tiers
3. **Unit tests** - Verify tier determinism
4. **Documentation** - Tier semantics reference

---

## Critical Fixes (Both Phases)

### Chargen Lookup Patterns

**HIGH PRIORITY**: Fix hardcoded name lookups

```javascript
// WRONG (will fail on rename):
docs.find(d => d.name === 'Block')
docs.find(d => d.name === 'Lightsaber')

// RIGHT (defensive):
docs.find(d => d._id === id || d.name === fallbackName)
```

**Locations**:
- `chargen-feats-talents.js`: Lines 555, 557 (Block/Deflect)
- `chargen-class.js`: Line 484 (Lightsaber)
- `chargen-force-powers.js`: Lines 74, 176 (class name lookups)

**Fix Strategy**:
1. Store item IDs in constants (not names)
2. Use defensive lookup: ID first, name fallback
3. Add comments explaining why both are needed

### Compendium V2 Compliance in Chargen

**Status**: 80% complete (Phase 5B fixed compendium data)
**Remaining**: Chargen code needs to use IDs consistently

**Audit Results**:
- Most lookups already use ID|name pattern ✓
- 4 hardcoded name lookups need fixing
- Force powers don't have card UI yet
- Suggestion badges missing from some cards

---

## Timeline & Effort Estimate

### Phase 5C (Chargen Cards)
- STEP 1: Force Power Cards - **2-3 hours**
- STEP 2: Standardize Card Rendering - **3-4 hours**
- STEP 3: Add Suggestion Badges - **1-2 hours**
- **Total: 6-9 hours**

### Phase 5D (Suggestion Unification)
- STEP 1: Refactor SuggestionEngine - **2-3 hours**
- STEPS 2-5: Refactor other engines - **4-5 hours**
- STEP 6: Coordinator update - **30 min**
- STEP 7: Unit tests - **2 hours**
- **Total: 9-11 hours**

### Total: 15-20 hours

---

## Execution Order

**Recommended approach:**

1. **Foundation** (DONE): Create UNIFIED_TIERS ✓
2. **Quick win**: Fix hardcoded lookups (30 min)
3. **5C Phase 1**: Add Force Power cards (3 hours)
4. **5C Phase 2**: Standardize rendering (4 hours)
5. **5D Phase 1**: Refactor SuggestionEngine (3 hours)
6. **5D Phase 2**: Refactor remaining engines (5 hours)
7. **5D Phase 3**: Add unit tests (2 hours)

---

## Success Criteria

### Phase 5C
- [ ] Force powers show flip cards (parity with feats)
- [ ] All cards use standardized rendering
- [ ] All items show suggestion tier badges
- [ ] No hardcoded item name lookups
- [ ] Chargen works after compendium item rename

### Phase 5D
- [ ] All 6 engines use UNIFIED_TIERS
- [ ] Tier assignments consistent across engines
- [ ] Unit tests pass (determinism verified)
- [ ] Documentation explains tier semantics
- [ ] Chargen + level-up suggestions identical when applicable

---

## Next Session

Start with:
1. Fix hardcoded lookups (quick win)
2. Begin 5C Phase 1 (Force Power cards)

This delivers immediate chargen improvements while setting up infrastructure for full Phase 5D in a future session.
