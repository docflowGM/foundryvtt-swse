# V2 Sheet Platform Architecture Map

**Last Updated:** 2026-03-29
**Status:** OFFICIAL ARCHITECTURE SPECIFICATION
**Phase:** Phase 7a - Design System Consolidation

This document defines the complete architecture of the V2 sheet platform, showing how the shared layer, sheet-specific layers, and SWSE game logic separate and interact.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Foundry VTT System (SWSE)                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│              V2 Sheet Platform Layer (Reusable)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Shared Infrastructure (scripts/sheets/v2/shared/)       │   │
│  │  ├─ PanelVisibilityManager.js (base class)              │   │
│  │  ├─ UIStateManager.js (state preservation)              │   │
│  │  ├─ PanelDiagnostics.js (performance tracking)          │   │
│  │  └─ [Future: Panel validators, row transformers, etc.]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Shared Styles (styles/sheets/v2-shared-primitives.css) │   │
│  │  ├─ Layout foundation (flexcol contract)                │   │
│  │  ├─ Panel structure (frame/content/overlay)             │   │
│  │  ├─ Component primitives (stat chip, buttons, tags)     │   │
│  │  ├─ Ledger row patterns (generic row structure)         │   │
│  │  ├─ Opacity/hierarchy standards                         │   │
│  │  ├─ Drag & drop feedback                                │   │
│  │  └─ CSS custom properties (colors, spacing, radius)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Shared Vocabulary (SHEET_PLATFORM_VOCABULARY.md)        │   │
│  │  ├─ Panel, Panel Registry, Panel Builder, Validator      │   │
│  │  ├─ Panel Context, Panel Template                        │   │
│  │  ├─ Ledger Panel, Display Panel, Row Transformer        │   │
│  │  ├─ SVG-Backed Panel, Frame/Content/Overlay Pattern     │   │
│  │  ├─ Lazy Building, Cache Validity, Conditional Panel    │   │
│  │  ├─ Strict Mode, Post-Render Assertion                  │   │
│  │  └─ Naming conventions across all sheets                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Universal Patterns (EXTENSION_RECIPES.md)              │   │
│  │  ├─ Recipe: Add Panel to Sheet                          │   │
│  │  ├─ Recipe: Add Ledger Panel                            │   │
│  │  ├─ Recipe: Add SVG-Backed Panel                        │   │
│  │  ├─ Recipe: Add Validators & Assertions                 │   │
│  │  ├─ Recipe: Optimize Panel Builder                      │   │
│  │  ├─ Recipe: Preserve UI State                           │   │
│  │  └─ Recipe: Add New Sheet Type                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│            Sheet-Type-Specific Layers (Concrete)                 │
│                                                                   │
│  ┌─────────────────────┐ ┌─────────────────────────────────────┤
│  │   CHARACTER SHEET   │ │  NPC SHEET (Phase 7b)               │
│  │                     │ │  Vehicle, Droid... (Phase 7c+)      │
│  │  ┌─────────────────┤ │                                       │
│  │  │ Shared Base ────┼─┼──┐                                   │
│  │  │ PanelVisibility │ │  │                                   │
│  │  │ Manager         │ │  │                                   │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │                                   │
│  │  ┌─────────────────┤ │  │   Shared Base                     │
│  │  │ Character       │ │  │   PanelVisibilityManager          │
│  │  │ PanelVisibility │ │  │   (override for NPC mappings)     │
│  │  │ Manager         │ │  │                                   │
│  │  │ (18 panels,     │ │  │   NPC Visibility Manager          │
│  │  │  8 tabs)        │ │  │   (override for NPC mappings)     │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │   ┌──────────────────────────┐   │
│  │  ┌─────────────────┤ │  │   │ Shared Builders          │   │
│  │  │ Character Panel │ │  │   │ ├─ Health Panel          │   │
│  │  │ Builders (18)   │ │  │   │ ├─ Inventory Panel       │   │
│  │  │ ├─ buildHealth  │ │  │   │ └─ [Reusable panels]     │   │
│  │  │ ├─ buildTalent  │ │  │   └──────────────────────────┘   │
│  │  │ ├─ buildFeat    │ │  │                                   │
│  │  │ ├─ buildInventory │ │  │   NPC-Specific Builders         │
│  │  │ └─ ... (15 more)│ │  │   ├─ buildNPCHeader             │
│  │  └─────────────────┤ │  │   ├─ buildNPCTalents (adapted)   │
│  │                     │ │  │   └─ ... (adapted as needed)     │
│  │  ┌─────────────────┤ │  │                                   │
│  │  │ Character Panel │ │  │   NPC Validators                 │
│  │  │ Validators (18) │ │  │   (reuse or customize)            │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │   NPC Styles                     │
│  │  ┌─────────────────┤ │  │   (v2-npc-specific.css)          │
│  │  │ Character Panel │ │  │   + shared primitives            │
│  │  │ Templates (18)  │ │  │                                   │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │   NPC Templates                  │
│  │  ┌─────────────────┤ │  │   (reuse or customize)            │
│  │  │ Character Panel │ │  │                                   │
│  │  │ Registry        │ │  │   NPC Panel Registry              │
│  │  │ (PANEL_REGISTRY)│ │  │   (define NPC panels)             │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │                                   │
│  │  ┌─────────────────┤ │  │                                   │
│  │  │ SWSE Character  │ │  │   SWSE NPC Game Logic            │
│  │  │ Game Logic      │ │  │   ├─ Talent rules                │
│  │  │ (Panel Builders)│ │  │   ├─ Force sensitivity check     │
│  │  │ ├─ Talent tier  │ │  │   └─ [NPC-specific rules]        │
│  │  │ ├─ Force powers │ │  │                                   │
│  │  │ ├─ Dark side    │ │  │                                   │
│  │  │ ├─ Combat rules │ │  │                                   │
│  │  │ └─ ... SWSE     │ │  │                                   │
│  │  │   game-specific │ │  │                                   │
│  │  │   calculations  │ │  │                                   │
│  │  └─────────────────┤ │  │                                   │
│  │                     │ │  │                                   │
│  │  ┌─────────────────┤ │  │                                   │
│  │  │ Character Styles│ │  │                                   │
│  │  │ (character-     │ │  │                                   │
│  │  │  specific.css)  │ │  │                                   │
│  │  │ + shared        │ │  │                                   │
│  │  │ primitives      │ │  │                                   │
│  │  └─────────────────┤ │  │                                   │
│  └─────────────────────┘ └─────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    Actor Data (system)
```

---

## Layered Components

### Layer 0: Foundry VTT
- Provides: Application framework, document store, rendering engine
- We extend: `HandlebarsApplicationMixin`, `foundry.applications.api`

### Layer 1: V2 Sheet Platform (Shared)

**Location:** `scripts/sheets/v2/shared/`

**Components:**

1. **PanelVisibilityManager (Base Class)**
   - Generic visibility tracking
   - Lazy building logic
   - Cache validity management
   - Conditional panel evaluation
   - Type-based invalidation (override in subclass)
   - Usage: Subclassed by Character, NPC, Droid, etc.

2. **UIStateManager**
   - Preserves interactive state across rerenders
   - Captures: active tabs, expanded sections, focused fields, scroll position
   - Transparent to sheet logic
   - Usage: Every V2 sheet instantiates

3. **PanelDiagnostics**
   - Tracks builder execution time per panel
   - Logs panel skip reasons
   - Provides performance profiling
   - Usage: Every V2 sheet instantiates

4. **Shared Primitives (Future)**
   - Base validators for common panels
   - Common row transformers
   - Shared template partials
   - Base panel builders for universal panels

---

### Layer 2: Shared Styles

**Location:** `styles/sheets/v2-shared-primitives.css`

**Components:**
- Layout foundation (flexcol contract)
- Panel structure (frame/content/overlay)
- Component primitives (stat chip, buttons, tags)
- Ledger row patterns
- Opacity/hierarchy standards
- Drag & drop feedback
- CSS custom properties (colors, spacing, radius)

**Usage:** All V2 sheets load this first

---

### Layer 3: Shared Vocabulary & Recipes

**Locations:**
- `SHEET_PLATFORM_VOCABULARY.md` - Terminology definitions
- `EXTENSION_RECIPES.md` - Copy-paste recipes
- `V2_CSS_PRIMITIVES.md` - Style extraction guide

**Usage:** Reference when building new sheets or panels

---

### Layer 4: Sheet-Type-Specific Layers

#### Character Sheet (Phase 5-6 Complete)

**Location:** `scripts/sheets/v2/`

**Components:**
- **PanelVisibilityManager** (character-sheet.js) - Subclass defining:
  - `tabPanels` mapping (primary, gear, talents, combat, force, starship, social, notes)
  - `conditionalPanels` (forcePowersPanel, starshipManeuversPanel)
  - `invalidateByType()` override for character-specific panels

- **PanelContextBuilder** - 18 panel builders:
  - Display panels: health, defense, biography, portrait, darkSide, secondWind
  - Ledger panels: inventory, talent, feat, maneuver, languages, racialAbilities, armorSummary, equipmentLedger
  - Combat/Special: forcePowers, starshipManeuvers, relationships, combatNotes

- **PanelValidators** - 18 validators enforcing contracts

- **PostRenderAssertions** - DOM validation after render

- **PANEL_REGISTRY** - Registry defining all 18 panels with metadata

- **Styles** - Character-specific CSS:
  - Character grid layout (2-column)
  - Combat flip cards
  - Action economy display
  - Character-specific panel styling

- **Templates** - 18 Handlebars partials for character panels

- **Game Logic in Panel Builders:**
  - Talent tier calculation
  - Force power filtering
  - Dark side point tracking
  - Combat rule application
  - Skill/attack bonus calculation
  - Condition rendering

---

## Data Flow: Panel Building Lifecycle

```
1. Sheet opens or data changes
   ↓
2. visibilityManager.getPanelsToBuild(actor)
   ├─ Check visibility (current tab)
   ├─ Check cache validity
   └─ Check conditional logic (force-sensitive, etc.)
   ↓
3. For each panel to build:
   ├─ Builder transforms actor data → normalized context
   ├─ Builder applies SWSE game logic (talent calc, etc.)
   ├─ Validator enforces panel contract
   └─ visibilityManager.markPanelBuilt()
   ↓
4. All panel contexts collected
   ↓
5. UIStateManager.captureState()
   (Save current active tab, focused field, scroll, etc.)
   ↓
6. Handlebars renders template with all panel contexts
   ├─ Template reads from {{panelName.key}}
   ├─ Template checks optional keys with {{#if}}
   └─ Template is generic, reusable
   ↓
7. DOM updated
   ↓
8. PostRenderAssertions validate DOM structure
   ├─ Frame element present (if SVG)
   ├─ Content layer has expected children
   ├─ Ledger rows have data attributes
   └─ Root element matches registry selector
   ↓
9. UIStateManager.restoreState()
   (Restore tab, focused field, scroll, etc.)
   ↓
10. PanelDiagnostics.logDiagnostics()
    (Show build times, skip reasons if verbose mode)
```

---

## Separation of Concerns

### What Lives in Shared Infrastructure

✅ **Visibility Management** - Generic panel visibility tracking
✅ **Lazy Building** - Caching and rebuild logic
✅ **UI State Preservation** - Interactive state across rerenders
✅ **Performance Diagnostics** - Builder timing, skip tracking
✅ **Layout Patterns** - Frame/content/overlay, flexcol contract
✅ **Component Primitives** - Generic buttons, tags, stat chips
✅ **Validation Framework** - Contract enforcement structure
✅ **CSS Foundation** - Colors, spacing, typography, primitives

### What Lives in Sheet-Specific Layers

✅ **Tab/Panel Mappings** - Which panels appear on which tabs (Character, NPC differ)
✅ **Conditional Logic** - When panels build (force-sensitive, vehicle type, etc.)
✅ **Panel Builders** - Transform actor data → context (game-specific)
✅ **Game Logic** - Talent calculation, Force powers, combat rules, etc.
✅ **Panel Registry** - Define which panels exist for this sheet type
✅ **Templates** - Handlebars partials (reusable but need sheet-specific one per panel)
✅ **Validators** - Panel contract enforcement (can reuse if no customization)
✅ **Assertions** - Post-render DOM validation
✅ **Styles** - Sheet-specific CSS (layout, colors, icons, etc.)

### What Should NOT Live Anywhere Else

❌ **Actor Mutation** - Builders never mutate actor data
❌ **Rendering** - Only happens in templates, not in builders/validators
❌ **Foundry API Calls** - Keep in top-level sheet methods, not builders
❌ **Dialog Creation** - Not in panel builders
❌ **Event Binding** - Not in validators or transformers

---

## Migration Paths for Other Sheet Types

### NPC Sheet (Phase 7b)

**Reusable from Character:**
- UIStateManager (as-is)
- PanelDiagnostics (as-is)
- Panel builders: health, inventory, languages (with customization)
- Panel validators: (with customization)
- Shared primitives CSS
- Frame/content/overlay patterns

**Customization Needed:**
- PanelVisibilityManager subclass (different tabs/panels)
- NPC-specific builders (NPC talents differ from character talents)
- NPC-specific validators
- NPC-specific templates
- NPC-specific styles

**Timeline:** Create NPCPanelBuilder, NPCVisibilityManager, migrate 5-8 reusable panels first

### Droid Sheet (Phase 7c)

**Likely Reusable:**
- UIStateManager (as-is)
- PanelDiagnostics (as-is)
- Shared primitives CSS
- Some ledger panels (inventory, perhaps modified)

**Likely Customization:**
- Droid-specific visibility manager
- Droid-specific game rules (droid talents, programming, etc.)
- Droid-specific panel builders
- Droid-specific templates

**Timeline:** Similar to NPC, but assess reusability after NPC complete

### Vehicle/Starship Sheet (Phase 7d)

**Likely Different:**
- Vehicle-specific visibility manager
- Different panel types (crew, systems, weapons, maneuvers)
- Vehicle-specific game logic
- Vehicle-specific templates

**Likely Reusable:**
- UIStateManager
- PanelDiagnostics
- Some shared primitives

---

## Technical Design Decisions

### 1. Why Subclass PanelVisibilityManager?

**Question:** Why not make visibility mappings data-driven?

**Answer:** Subclassing allows:
- Type checking on conditional logic
- IDE autocomplete for `invalidateByType(type)`
- Clear separation of sheet-specific concerns
- Override opportunity for custom invalidation logic

**Data-driven alternative:** Would require schema definition per sheet, more complex setup.

### 2. Why Not Share Panel Builders?

**Question:** Can't we just make builders more generic?

**Answer:** Builders are where game logic lives:
- Talent tiers, Force calculations, combat bonuses
- These differ significantly between actor types
- Sharing builders would require passing "game rule function" parameter
- More maintainable to customize per sheet

**Shared part:** The pattern (read actor → normalize → validate → return)

### 3. Why CSS Custom Properties?

**Question:** Why not use Sass variables?

**Answer:** CSS Custom Properties allow:
- Runtime customization per actor type
- Dynamic theme switching
- Easier overrides in sheet-specific CSS
- Browser DevTools inspection

**Drawback:** No nesting/mixins, but cleaner separation.

### 4. Why Frame/Content/Overlay Pattern?

**Question:** Why not just use absolute positioning everywhere?

**Answer:**
- Frame provides SVG background
- Content flows naturally (no manual layout)
- Overlay can position badges, icons on top
- Maintains semantic HTML
- Works with panel scrolling

---

## Test Strategy

### Shared Layer Tests
```
tests/sheets/v2/shared/
├── PanelVisibilityManager.test.js
├── UIStateManager.test.js
└── PanelDiagnostics.test.js
```

### Character Sheet Tests
```
tests/sheets/v2/character/
├── PanelVisibilityManager.test.js (subclass-specific)
├── PanelContextBuilder.test.js
├── PanelValidators.test.js
└── PANEL_REGISTRY.test.js
```

### Style Tests
```
tests/sheets/v2/
├── css-primitives.test.js (shared classes)
└── layout-contract.test.js (flexcol enforcement)
```

---

## Performance Characteristics

### Build Time (Typical Character with 18 panels)
- Lazy loading OFF: 5-15ms per render
- Lazy loading ON: 2-5ms per render (60% reduction)
- With strict mode assertions: +1-2ms overhead

### Memory
- PanelVisibilityManager: ~2KB base + 200 bytes per panel
- UIStateManager: ~5KB per sheet instance
- PanelDiagnostics: ~3KB per sheet instance
- Panel contexts: 5-50KB depending on actor (normalized arrays)

### Render Responsiveness
- Tab switching: < 50ms (only visible panels rebuild)
- Data change: 2-5ms (selective panel invalidation)
- Keyboard input: No blocking (debounced form updates)

---

## Future Extensions

### Proposed: Control Panels
- Interactive, button-heavy panels
- Different validation contract
- Different template pattern

### Proposed: Socket Panels
- Panels with named slots for draggable items
- Built-in drop validation
- Drag preview support

### Proposed: Accordion Panels
- Nested collapsible sections
- State preservation for expanded/collapsed
- Lazy rendering of section content

### Proposed: Tabbed Panels
- Panels containing internal tabs
- Internal tab state preserved
- Useful for complex multi-view panels

---

## Deliverables Checklist

### Phase 7a (Current)
- [x] Audit shared vs character-specific components
- [x] Create shared layer directory structure
- [x] Move UIStateManager to shared
- [x] Move PanelDiagnostics to shared
- [x] Create base PanelVisibilityManager in shared
- [x] Update character sheet imports
- [x] Verify all 18 panels still work (verify-panel-alignment.js)
- [x] Define formal vocabulary (SHEET_PLATFORM_VOCABULARY.md)
- [x] Standardize CSS primitives (V2_CSS_PRIMITIVES.md)
- [ ] Create V2 Sheet Platform Architecture Map (THIS DOCUMENT)
- [ ] Create reusable recipes for future sheets
- [ ] Create migration roadmap for NPC sheet
- [ ] Create migration roadmap for droid sheet
- [ ] Add platform-level tests/validation

### Phase 7b (Next)
- [ ] Create NPC sheet using shared layer
- [ ] Adapt PanelVisibilityManager for NPC
- [ ] Create NPC panel builders (reuse + customize)
- [ ] Validate that shared layer works for NPC
- [ ] Document NPC-specific patterns

### Phase 7c (Following)
- [ ] Create Droid sheet using shared layer
- [ ] Similar process as NPC

### Phase 7d (Optional)
- [ ] Vehicle sheet migration

---

## References

- **Shared Layer:** `scripts/sheets/v2/shared/`
- **Character Sheet:** `scripts/sheets/v2/character-sheet.js`, `scripts/sheets/v2/context/`
- **Vocabulary:** `SHEET_PLATFORM_VOCABULARY.md`
- **Recipes:** `EXTENSION_RECIPES.md`
- **CSS Guide:** `V2_CSS_PRIMITIVES.md`
- **Phase 6 Audit:** `PHASE_6_AUDIT.md`
- **Phase 7 Audit:** `PHASE_7_AUDIT.md`
