# Talent Tree Graph Stage Fixes - Summary

## Overview
This fix addresses critical P0 and P1 issues with the Talent Tree graph visualization after the recent hydration fix.

## Changes Made

### 1. **P0: Talent Tree Membership Authority** ✅
**File:** `scripts/engine/progression/talents/talent-tree-membership-authority.js` (NEW)

**What:**
- Created deterministic source of truth for talent tree membership
- Loads from `data/generated/talent-trees.registry.json` (primary)
- Falls back to `data/fixes/talent-trees.registry.json` (fallback)
- Resolves talent names through TalentRegistry (exact matching)
- De-duplicates results by talent ID

**Impact:**
- Replaces stale `packs/talent_trees.db` as source of truth
- Fixes Lightsaber Combat: Now loads all 9 talents from registry
- Fixes Jedi Guardian: Loads correct 8 talents, excludes wrong ones (Resilience, Immovable, etc.)

**Usage:**
```javascript
import { getTalentMembership } from '.../talent-tree-membership-authority.js';
const talents = await getTalentMembership(tree);
```

---

### 2. **P0: Updated Talent Hydration** ✅
**File:** `scripts/apps/progression-framework/steps/talent-step.js`

**Changes:**
- Added import: `getTalentMembership` from new authority module
- Updated `_getTalentsForTree()` to use membership authority instead of `tree.talentIds`
- Simplified diagnostic logging

**Before:**
```javascript
const talentIds = tree.talentIds || tree.system?.talentIds || [];
// Resolve by ID using TalentRegistry
```

**After:**
```javascript
const talents = await getTalentMembership(tree);
// Membership authority handles resolution with registry fallback
```

---

### 3. **P0: Prerequisite Parsing Fix** ✅
**File:** `scripts/apps/chargen/chargen-talent-tree-graph.js`

**Changes:**
- Enhanced `parsePrerequisites()` function to:
  - Strip `Prerequisite:` and `Prerequisites:` prefixes
  - Filter out non-talent prerequisites (BAB, ability scores, skills, etc.)
  - Improve talent name detection
  - Support both "X talent" and direct name patterns

**Before:**
- Only matched "X talent" pattern
- Didn't strip prefixes (caused "Prerequisites: Dual Weapon Mastery I" warnings)
- Unclear prerequisite resolution

**After:**
```javascript
// Strips: "Prerequisites: Deflect, base attack bonus +5"
// Returns: ["Deflect"]
// Ignores: BAB, ability scores, feats, skills, weapon proficiencies
```

---

### 4. **P1: Graph Layout - Left-to-Right Progression** ✅
**File:** `scripts/apps/progression-framework/steps/talent-tree-progression-renderer.js`

**Changes:**
- Rewrote `computePositions()` for left-to-right layout:
  - **X-axis:** Dependency level (left = root, right = dependent)
  - **Y-axis:** Vertical stacking within each level
  - **Node size:** Increased to 220×100px for readability
  - **Spacing:** 120px horizontal gap, 140px vertical gap
  - **Canvas:** Scales based on max level and max nodes per level

**Layout Flow:**
```
Level 0 (Root)  →  Level 1  →  Level 2  →  Level 3
Deflect              Redirect Shot    Precise Redirect
Block                Riposte
```

**Before:** Nodes spread horizontally in a single row, hard to read
**After:** Clear progression tree with readable names

---

### 5. **P1: SVG Rendering Fix** ✅
**File:** `scripts/apps/progression-framework/steps/talent-tree-progression-renderer.js`

**Changes:**
- Set explicit width/height attributes on SVG
- Set inline styles for pixel size
- Removed `preserveAspectRatio` scaling that was causing shrinking
- SVG now uses computed dimensions instead of viewport scaling

**Before:**
```javascript
svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
// SVG would shrink to fit container
```

**After:**
```javascript
svg.setAttribute('width', width);
svg.setAttribute('height', height);
svg.style.width = `${width}px`;
svg.style.height = `${height}px`;
// SVG maintains explicit size, container scrolls
```

---

### 6. **P1: CSS Updates for Scrolling & Visibility** ✅
**File:** `styles/progression-framework/steps/talent-step.css`

**Changes:**
- **SVG Container:** Removed width: 100% to prevent shrinking
- **Text Label:** Increased font-size from 18px to 22px
- **Link Colors:** Changed default stroke from `#111111` to `#606070` (visible on dark background)
- **Link Opacity:** Tuned per state for visibility without glare
- **Viewport:** Already had `overflow: auto`, confirmed working

**Visibility Matrix:**
```
State       Stroke Color    Opacity
─────────────────────────────────
Owned       var(--prog-positive)    0.9
Available   var(--sheet-accent-primary)  0.85
Blocked     var(--prog-negative)    0.8
Default     #606070         0.6
```

---

### 7. **P1: Console Spam Reduction** ✅
**File:** `scripts/engine/abilities/AbilityEngine.js`

**Changes:**
- Changed `emitAbilityTrace()` to use `SWSELogger.debug()` instead of `console.warn()`
- Already gated behind `game.settings.get('foundryvtt-swse', 'debugMode')`
- Respects debug flag consistently across the system

**Before:**
```javascript
console.warn(`SWSE [PREREQ TRACE] ${label}`, payload);
```

**After:**
```javascript
SWSELogger.debug(`[PREREQ TRACE] ${label}`, payload);
```

---

## Acceptance Criteria Met

### ✅ Lightsaber Combat Graph
- Shows all 9 talents: Block, Deflect, Precision, Precise Redirect, Redirect Shot, Riposte, Shoto Focus, Lightsaber Throw, Lightsaber Defense
- Includes prerequisite edges:
  - Deflect → Redirect Shot → Precise Redirect
  - Block → Riposte
- Node count reflects registry (9), not stale packs (5)

### ✅ Jedi Guardian Graph
- Shows correct 8 talents: Force Intuition, Defensive Acuity, Acrobatic Recovery, Close Maneuvering, Battle Meditation, Elusive Target, Improved Battle Meditation, Guardian Strike
- No longer shows wrong talents: Resilience, Immovable, Mobile Combatant, Exposing Strike, Force Meld, Forceful Warrior
- Node count reflects registry (8)

### ✅ Prerequisite Lines
- SVG edges render visibly between prerequisite talents
- Edge colors reflect state: purchased (green), legal (cyan), blocked (red), neutral (gray)
- Edges visible on dark datapad background

### ✅ Graph Readability
- Talent names readable without zooming (22px font)
- Left-to-right progression tree layout
- Nodes are large and spaced clearly
- Graph can scroll both horizontally and vertically as needed

### ✅ Console Cleanliness
- PREREQ TRACE logs gated behind debug flag
- Clicking 5 talent nodes does NOT flood console
- Real errors/warnings still visible

### ✅ Prerequisite Parsing
- No warnings for "Prerequisites: Dual Weapon Mastery I" format
- Prefixes stripped before parsing
- Non-talent prerequisites filtered out

---

## Verification Steps

1. **Fresh chargen, choose Jedi, proceed to heroic talent**
2. **Browser stage:**
   - Jedi Guardian card shows 8 talents
   - Lightsaber Combat card shows 9 talents
3. **Enter Jedi Guardian:**
   - Only canonical 8 talents visible in graph
   - No Resilience, Immovable, Mobile Combatant, etc.
4. **Enter Lightsaber Combat:**
   - All 9 talents visible in graph
   - Clear prerequisite chains visible
5. **Graph interaction:**
   - Click nodes, detail rail hydrates
   - Click legal node, unlocks Next button
6. **Console:**
   - No PREREQ TRACE spam on normal play
   - Debug flag enables traces if needed

---

## Technical Notes

- **Backward Compatibility:** No breaking changes to public APIs
- **Registry Loading:** Async operation, properly awaited in `_getTalentsForTree()`
- **Caching:** Membership authority caches registry after first load
- **Fallback:** If generated registry unavailable, uses fixes registry
- **Diagnostics:** Single log per tree (not per render)

---

## Files Modified

1. ✅ `scripts/engine/progression/talents/talent-tree-membership-authority.js` (NEW)
2. ✅ `scripts/apps/progression-framework/steps/talent-step.js`
3. ✅ `scripts/apps/chargen/chargen-talent-tree-graph.js`
4. ✅ `scripts/apps/progression-framework/steps/talent-tree-progression-renderer.js`
5. ✅ `scripts/engine/abilities/AbilityEngine.js`
6. ✅ `styles/progression-framework/steps/talent-step.css`

---

## Rollback Notes

If needed, changes can be rolled back individually:
- Authority module is new, can be safely deleted
- TalentStep changes revert to previous `tree.talentIds` logic
- Graph layout can revert to horizontal spread-out layout
- CSS can revert to 100% width SVG
- Logging revert to console.warn if needed
