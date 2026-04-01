# Phase 7: Design System & Reusable Platform - Audit & Strategy

**Date:** 2026-03-29
**Status:** IN PROGRESS
**Objective:** Extract SWSE V2 character sheet recovery into reusable sheet platform architecture

---

## 1. AUDIT: What Should Become Reusable?

### Category A: CLEARLY REUSABLE (Move to Shared)

These patterns are generic, proven, and immediately useful for other sheets.

#### A1. Panel Registry & Contract System
**Current:** `scripts/sheets/v2/context/PANEL_REGISTRY.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Completely generic (doesn't reference character-specific data)
- Used by all 18 panels successfully
- Defines panel metadata, requirements, assertions
- Can be used by NPC, droid, vehicle sheets with zero modification
- Reduces coupling between sheets and panels

**Extraction Plan:**
```
scripts/sheets/v2/context/PANEL_REGISTRY.js
  ↓
scripts/sheets/v2/shared/PanelRegistry.js (or core/panel-registry.js)
```

**Character-Sheet Impact:**
```javascript
// Before
import { PANEL_REGISTRY } from './context/PANEL_REGISTRY.js';

// After
import { PANEL_REGISTRY } from './shared/PANEL_REGISTRY.js';
// (no code change, just import path)
```

---

#### A2. Panel Builder Pattern & Base Class
**Current:** `scripts/sheets/v2/context/PanelContextBuilder.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Base class structure is generic (builder + normalizer pattern)
- Character-specific builders should subclass this
- All 18 panels follow same builder pattern
- Other sheets can reuse architecture

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/PanelContextBuilder.js (abstract base)
Keep: scripts/sheets/v2/context/PanelContextBuilder.js (character-specific subclass)
```

**Base Class:**
```javascript
export class PanelContextBuilder {
  constructor(actor, sheetInstance) { ... }
  _validatePanelContext(panelKey, panelData) { ... }
  // Abstract: buildAllPanels() {}
  // Concrete: individual builders don't belong here
}
```

**Character Subclass:**
```javascript
export class CharacterPanelBuilder extends PanelContextBuilder {
  buildHealthPanel() { ... }
  buildTalentPanel() { ... }
  // ... all 18 builders
}
```

---

#### A3. Panel Validator Pattern & Framework
**Current:** `scripts/sheets/v2/context/PanelValidators.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Validation framework is generic
- validatePanel() router is universal
- Individual validators are character-specific but follow same pattern
- Can be reused for NPC validators, etc.

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/PanelValidator.js (framework)
Keep: scripts/sheets/v2/context/PanelValidators.js (character validators)
```

---

#### A4. Row Transformer Pattern
**Current:** `scripts/sheets/v2/context/RowTransformers.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Pattern is completely generic
- Used for all 9 row types consistently
- Other sheets will need row transformation too
- No character-specific logic in the pattern

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/RowTransformer.js (framework)
Keep: scripts/sheets/v2/context/RowTransformers.js (character row transformers)
```

---

#### A5. Post-Render Assertion Runner
**Current:** `scripts/sheets/v2/context/PostRenderAssertions.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Assertion runner is generic
- Individual assertions are character-specific
- Pattern scales to other sheets
- DOM validation is universal need

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/PostRenderAssertions.js (runner framework)
Keep: scripts/sheets/v2/context/PostRenderAssertions.js (character assertions)
```

---

#### A6. UIStateManager
**Current:** `scripts/sheets/v2/UIStateManager.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Completely generic
- Not character-specific at all
- Any sheet could use this
- Solves universal problem (preserve UI state)

**Extraction Plan:**
```
Move: scripts/sheets/v2/UIStateManager.js
  ↓
scripts/sheets/v2/shared/UIStateManager.js
```

---

#### A7. PanelVisibilityManager
**Current:** `scripts/sheets/v2/PanelVisibilityManager.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Pattern is generic (visibility tracking + lazy loading)
- Character-specific: tabPanels mapping, conditionalPanels conditions
- Other sheets can subclass and customize

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/PanelVisibilityManager.js (base)
Keep: scripts/sheets/v2/PanelVisibilityManager.js (character-specific subclass)
```

---

#### A8. PanelDiagnostics
**Current:** `scripts/sheets/v2/PanelDiagnostics.js`
**Status:** ✅ EXTRACT
**Rationale:**
- Completely generic profiling/diagnostics
- Not character-specific
- All sheets benefit from performance tracking

**Extraction Plan:**
```
Move: scripts/sheets/v2/PanelDiagnostics.js
  ↓
scripts/sheets/v2/shared/PanelDiagnostics.js
```

---

#### A9. SVG-Backed Panel Contract & Helpers
**Current:** Documented in `PANEL_REGISTRY.js`, implemented in templates
**Status:** ✅ EXTRACT
**Rationale:**
- Frame/content/overlay structure is universal
- CSS geometry variables are reusable
- SVG layout contract is generic
- Other sheets will use same pattern

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/SVGPanelContract.js
  - Frame/content/overlay validators
  - Safe area helpers
  - Geometry variable validators

Create: styles/sheets/v2/shared/panel-layout-primitives.css
  - Base panel classes
  - Frame/content/overlay structure
  - SVG integration
  - Geometry variable conventions
```

---

### Category B: MOSTLY REUSABLE WITH CUSTOMIZATION (Extract Base, Keep Overrides)

These have generic patterns but character-specific details that subclasses should customize.

#### B1. Form Submission Coordinator
**Current:** Scattered in `character-sheet.js`
**Status:** ⚠️ EXTRACT BASE
**Rationale:**
- Debounce pattern is generic
- Form coercion is SWSE-specific
- Can extract generic framework

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/FormSubmissionCoordinator.js
  - Generic: debounce, listener setup, validation hooks
  - Override: actual form coercion logic

Keep: character-sheet.js
  - Character-specific form coercion
  - SWSE field schema
```

---

#### B2. Ledger Panel Contract
**Current:** Implemented across all ledger panels
**Status:** ✅ EXTRACT
**Rationale:**
- Contract structure is generic (entries, hasEntries, totalCount, etc.)
- Used successfully by 8 ledger panels
- Other sheets have same needs

**Extraction Plan:**
```
Create: scripts/sheets/v2/shared/LedgerPanelContract.js
  - Defines ledger panel shape
  - Validators for ledger structure
  - Empty-state patterns
```

---

### Category C: INTENTIONALLY CHARACTER-SPECIFIC (Keep Local)

These should remain character-sheet-local.

#### C1. All Character-Specific Builders
**Current:** In `PanelContextBuilder`
**Status:** 🔒 KEEP LOCAL
**Files:**
- buildHealthPanel, buildTalentPanel, buildFeatPanel, etc.
- All 18 builder methods specific to character data structure

**Rationale:** These read from `actor.system.talent`, `actor.system.health`, etc., which are SWSE-character-specific.

#### C2. All Character-Specific Validators
**Current:** In `PanelValidators.js`
**Status:** 🔒 KEEP LOCAL
**Rationale:** Validate character-specific contracts (HealthPanel must have hp.value, etc.)

#### C3. Character Sheet CSS/Styling
**Current:** `styles/sheets/v2/character-sheet.css` and partials
**Status:** 🔒 KEEP LOCAL (mostly)
**Extraction:** Extract generic primitives, keep character-specific overrides

#### C4. Character Manifest/Architecture
**Current:** `SHEET_MANIFEST.md`, `CONTRIBUTING_TO_SHEET.md`
**Status:** 🔒 KEEP LOCAL
**Extraction:** Create `SHEET_PLATFORM_ARCHITECTURE.md` (shared), keep character docs

---

### Category D: NEEDS CLARIFICATION (Requires Decision)

#### D1. Strict Mode Integration
**Current:** `CONFIG.SWSE.strictMode` checked throughout code
**Status:** ⚠️ STANDARDIZE
**Decision Needed:**
- Should this be `CONFIG.SWSE.sheets.v2.strictMode`?
- Or generic `CONFIG.sheets.v2.strictMode`?
- Document in platform vocabulary

#### D2. Tab System / Visibility Model
**Current:** Hard-coded tab names in PanelVisibilityManager
**Status:** ⚠️ ABSTRACT
**Extraction Plan:**
- Create generic visibility model
- Allow sheets to define their own tab/panel mappings
- Document contract for visibility subclasses

---

## 2. PROPOSED SHARED INFRASTRUCTURE STRUCTURE

```
scripts/sheets/v2/
├── shared/                                  # ← NEW: Shared platform layer
│   ├── PanelRegistry.js                    # Generic registry loader
│   ├── PanelContextBuilder.js              # Abstract base builder
│   ├── PanelValidator.js                   # Generic validator framework
│   ├── PanelVisibilityManager.js           # Base visibility pattern
│   ├── PanelDiagnostics.js                 # Performance tracking
│   ├── UIStateManager.js                   # State persistence
│   ├── PostRenderAssertions.js             # Assertion runner framework
│   ├── RowTransformer.js                   # Row transformation framework
│   ├── SVGPanelContract.js                 # SVG panel helpers
│   ├── LedgerPanelContract.js              # Ledger panel contract
│   ├── FormSubmissionCoordinator.js        # Generic form coordinator
│   └── constants/
│       ├── panel-types.js                  # Enum: display, ledger, control
│       └── validation-error-codes.js       # Standard error definitions
│
├── character/                               # ← Character-sheet specific
│   ├── character-sheet.js
│   ├── context/
│   │   ├── PanelContextBuilder.js          # CharacterPanelBuilder extends shared base
│   │   ├── PanelValidators.js              # Character-specific validators
│   │   ├── RowTransformers.js              # Character-specific row transformers
│   │   ├── PostRenderAssertions.js         # Character-specific assertions
│   │   └── PanelTypeDefinitions.js
│   ├── PanelVisibilityManager.js           # Character-specific visibility mapping
│   └── recipes/
│       └── character-panel-template.js     # Example for character-specific panels
│
├── npc/                                     # ← Would be created in Phase 7b
│   ├── npc-sheet.js
│   ├── context/
│   │   ├── NPCPanelBuilder.js              # extends shared PanelContextBuilder
│   │   └── NPCPanelValidators.js
│   └── migration-status.md                 # What's done, what's not
│
└── droid/                                   # ← Would be created in Phase 7c
    ├── droid-sheet.js
    └── context/
        └── [similar structure to NPC]

styles/sheets/v2/
├── shared/                                  # ← NEW: Shared CSS primitives
│   ├── panel-layout-primitives.css         # Base panel/frame/content/overlay
│   ├── geometry-variables.css              # Reusable CSS custom properties
│   ├── empty-state-patterns.css            # Reusable empty-state styling
│   └── ledger-primitives.css               # Reusable ledger/list styling
│
└── character/
    ├── character-sheet.css                 # Character-specific overrides
    └── [specific partials]
```

---

## 3. SHARED VOCABULARY (Design System Terms)

**To Be Documented:**

### Structural Terms
- **Panel** - A discrete view model for a sheet section
- **Panel Registry** - Single source of truth for all panel metadata
- **Panel Builder** - Transforms actor data into panel view model
- **Panel Validator** - Enforces panel contract
- **Panel Context** - The normalized data object a panel receives
- **Ledger Panel** - Panel displaying tabular data (rows)
- **Display Panel** - Read-only informational panel
- **Control Panel** - Interactive panel with buttons/inputs

### Layout Terms
- **Frame** - SVG background layer (visual container)
- **Content** - Main content layer (normal DOM flow)
- **Overlay** - Positioned elements over content/frame
- **Safe Area** - Region safe from SVG overlays
- **Slot** - Named anchor point for overlaid elements
- **Safe Area Variables** - CSS custom properties defining safe regions

### Contract Terms
- **Panel Contract** - Set of required/optional keys a panel must provide
- **Row Contract** - Shape of individual ledger rows
- **SVG Panel Contract** - Expected frame/content/overlay structure
- **UI State Contract** - What state a panel can persist

### Operational Terms
- **Strict Mode** - Development mode enforcing contracts and throwing errors
- **Post-Render Assertion** - Validation of rendered DOM structure
- **Panel Visibility** - Whether a panel is visible/built this render
- **Cache Validity** - Whether cached panel data is current
- **UI State** - Interactive state (tabs, expansions) persisted across rerenders

### Pattern Terms
- **Row Transformer** - Normalizes actor items into panel rows
- **Lazy Building** - Skip building hidden panels
- **Conditional Panel** - Panel that only exists if condition met
- **Panel Visibility Manager** - Tracks visibility, caching, conditional logic

---

## 4. REUSABLE CSS/UI PRIMITIVES

### Base Panel Structure
```css
.swse-panel {
  /* Base panel styling (shared) */
}

.swse-panel__frame {
  /* SVG background layer (shared) */
}

.swse-panel__content {
  /* Content flow (shared) */
}

.swse-panel__overlay {
  /* Positioned layer (shared) */
}
```

### State Classes (Shared)
```css
.panel--visible { ... }
.panel--hidden { ... }
.section--expanded { ... }
.section--collapsed { ... }
.state--healthy { ... }
.state--warning { ... }
.state--critical { ... }
```

### Ledger Primitives (Shared)
```css
.ledger-panel { ... }
.ledger-row { ... }
.ledger-row.expanded { ... }
.ledger-header { ... }
.ledger-footer { ... }
.col-name { ... }
.col-value { ... }
```

### Geometry Variables (Shared)
```css
:root {
  --panel-min-height: 150px;
  --panel-max-width: 600px;
  --overlay-z-index: 10;
  --safe-area-padding: 20px;
  --ledger-row-height: 32px;
}
```

---

## 5. MIGRATION ROADMAP

### Phase 7a: Character Sheet Refactor (Extract Shared Layer)
**Effort:** 2-3 hours
**Complexity:** MEDIUM
**Status:** This phase
**Tasks:**
1. Create scripts/sheets/v2/shared/ directory
2. Move/extract reusable files
3. Update imports in character-sheet.js
4. Verify all 18 panels still work
5. Document shared platform vocabulary

### Phase 7b: NPC Sheet Migration
**Current Status:** NPC sheet exists but likely has old architecture
**Effort:** 4-6 hours
**Complexity:** MEDIUM-HIGH
**Prerequisites:** Phase 7a shared layer complete
**Migration Path:**
1. Audit current NPC sheet architecture
2. Identify which panels can reuse character panel code
3. Identify which panels need NPC-specific builders
4. Create NPCPanelBuilder extending shared base
5. Migrate NPC sheet to use PANEL_REGISTRY
6. Document NPC-specific contracts

### Phase 7c: Droid Sheet Migration
**Current Status:** Droid sheet exists but likely old architecture
**Effort:** 3-4 hours (less complex than NPC)
**Complexity:** MEDIUM
**Prerequisites:** Phase 7a shared layer, Phase 7b NPC migration
**Migration Path:**
- Similar to NPC but droid-specific panels

### Phase 7d: Vehicle/Starship Sheets (Future)
**Current Status:** Not yet refactored
**Effort:** 6-8 hours
**Complexity:** HIGH (different data model)
**Prerequisites:** All above complete
**Note:** Deferred to Phase 7d or later

---

## 6. NAMING CONSISTENCY AUDIT

### Current Issues to Fix

**Panel Naming:**
- ✅ healthPanel (consistent)
- ✅ talentPanel (consistent)
- ⚠️ But verify all new sheets use same pattern

**CSS Classes:**
- ✅ swse-panel-- prefix (consistent)
- ✅ .swse-panel__frame/content/overlay (BEM, consistent)
- ⚠️ Character sheet specific, but design pattern is reusable

**File Naming:**
- ✅ PanelContextBuilder.js (PascalCase, consistent)
- ✅ PanelVisibilityManager.js (consistent)
- ⚠️ Establish convention: Builders end in "Builder", Managers end in "Manager"

**Variable Naming:**
- ✅ panelName, panelKey, panelData (consistent)
- ✅ entries, hasEntries, totalCount (ledger contract, consistent)
- ⚠️ Establish: row/rows, item/items standard across sheets

**Standardize:**
- All new sheets: panelName pattern, not panelId
- All validators: validateXPanel pattern
- All builders: buildXPanel pattern
- All rows: XRow pattern (TalentRow, FeatRow, etc.)

---

## 7. SHARED TESTS/VALIDATION

### What Should Be Tested in Shared Layer

```javascript
// Shared tests (scripts/sheets/v2/shared/__tests__/)
├── PanelRegistry.test.js
│   - Registry can be loaded
│   - Registry has required fields for each panel
│   - Panel builder name follows pattern
├── PanelValidator.test.js
│   - Validates required keys exist
│   - Allows optional keys missing
│   - Reports errors correctly
├── UIStateManager.test.js
│   - Captures state from DOM
│   - Restores state to DOM
│   - Clear removes all state
├── PanelVisibilityManager.test.js
│   - Visibility tracking works
│   - Conditional panels evaluated
│   - Cache validity tracked
└── SVGPanelContract.test.js
    - Frame/content/overlay structure validated
    - Geometry helpers work
    - Safe areas computed correctly
```

---

## 8. FUTURE ARCHITECTURE MAP

```
V2 Sheet Platform Architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────┐
│  Sheets Layer (Game-Specific)               │
├─────────────────────────────────────────────┤
│ Character | NPC | Droid | Vehicle | [Future]│
│                                              │
│ Each implements:                             │
│ - XSheetPanelBuilder extends Base           │
│ - XSheetPanelValidators (specific)          │
│ - XSheetVisibilityManager extends Base      │
│ - X-specific CSS overrides                  │
│ - X-specific recipes/docs                   │
└──────────────────┬──────────────────────────┘
                   │ uses
┌──────────────────┴──────────────────────────┐
│  Shared V2 Platform Layer                   │
├─────────────────────────────────────────────┤
│ • PanelRegistry (generic)                   │
│ • PanelContextBuilder (base)                │
│ • PanelValidator (framework)                │
│ • RowTransformer (framework)                │
│ • PanelVisibilityManager (base)             │
│ • UIStateManager                            │
│ • PanelDiagnostics                          │
│ • PostRenderAssertions (runner)             │
│ • FormSubmissionCoordinator (base)          │
│ • SVGPanelContract                          │
│ • LedgerPanelContract                       │
│ • Shared CSS/layout primitives              │
│ • Platform vocabulary/types                 │
└──────────────────┬──────────────────────────┘
                   │ uses
┌──────────────────┴──────────────────────────┐
│  Foundry/System Integration Layer           │
├─────────────────────────────────────────────┤
│ • ActorEngine                               │
│ • Item/Actor transformations                │
│ • Foundry Application V2 base               │
│ • Form submission pipeline                  │
└─────────────────────────────────────────────┘
```

---

## 9. DELIVERABLES CHECKLIST

### Phase 7a (THIS PHASE)
- [ ] Audit complete (this document)
- [ ] Shared layer directory structure created
- [ ] Reusable files extracted to shared/
- [ ] Character-sheet imports updated
- [ ] All character panels still work (0 issues)
- [ ] Vocabulary document created
- [ ] CSS primitives extracted
- [ ] Formation migration roadmap
- [ ] Naming conventions standardized
- [ ] Shared test/validation framework added
- [ ] Architecture map created

### Phase 7b-7d (Future)
- [ ] NPC sheet migration
- [ ] Droid sheet migration
- [ ] Vehicle/starship sheets (if applicable)

---

## 10. NEXT STEPS (THIS SESSION)

1. ✅ Audit (THIS DOCUMENT)
2. Create shared layer directory structure
3. Extract reusable components
4. Update character-sheet imports
5. Create platform vocabulary doc
6. Extract CSS primitives
7. Create architecture map
8. Document naming conventions
9. Create reusable recipes

