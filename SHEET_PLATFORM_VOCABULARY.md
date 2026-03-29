# V2 Sheet Platform Vocabulary

**Last Updated:** 2026-03-29
**Status:** OFFICIAL TERMINOLOGY FOR ALL V2 SHEETS
**Scope:** Shared platform layer + all sheet types (Character, NPC, Droid, etc.)

This document defines the standard vocabulary for the SWSE V2 sheet platform. All sheets, documentation, and code should use these terms consistently.

---

## Architectural Layer Terms

### Shared Platform Layer
The reusable infrastructure that all sheet types build upon.
- **Location:** `scripts/sheets/v2/shared/`
- **Scope:** Generic, sheet-agnostic patterns
- **Reused by:** Character, NPC, Droid, Vehicle, and any future sheets

### Sheet-Specific Layer
Implementation for a particular sheet type.
- **Examples:** Character, NPC, Droid, Vehicle
- **Location:** `scripts/sheets/v2/<sheet-type>/`
- **Contains:** Game-specific builders, validators, panel mappings

### Game Logic Layer
SWSE-specific rules and data transformations.
- **Examples:** Talent calculation, armor bonuses, Force points
- **Should be:** In panel builders, not in shared infrastructure
- **Should NOT be:** In validators, row transformers, or base managers

---

## Core Structural Concepts

### Panel
**Definition:** A discrete, normalized view model for a sheet section.

**Characteristics:**
- Has a unique name (e.g., `healthPanel`, `inventoryPanel`)
- Defines required and optional data keys
- Has a builder that creates it from actor data
- Has a validator that enforces its contract
- Has a corresponding template partial for rendering

**Examples:**
- Display panels: `healthPanel`, `biographyPanel`, `defensePanel`
- Ledger panels: `inventoryPanel`, `talentPanel`, `featPanel`
- Control panels: (hypothetical, not yet used)

**Not to be confused with:** "Sheet sections" (broader UI areas), "UI components" (specific HTML elements)

---

### Panel Registry
**Definition:** Single source of truth defining all panel metadata.

**Contains:**
- Panel name
- Display name
- Type (display, ledger, control)
- Template path
- Builder method name
- Validator method name
- Required keys (must exist in panel context)
- Optional keys (may be present)
- Row contract (for ledger panels)
- Post-render assertions (for DOM validation)
- SVG backing (if applicable)

**File:** `scripts/sheets/v2/context/PANEL_REGISTRY.js` (character) + shared base

**Use:** Every panel must be registered. Verification tool: `verify-panel-alignment.js`

---

### Panel Context
**Definition:** The normalized data object a panel receives from its builder.

**Structure:**
```javascript
{
  // Required keys (always present)
  requiredKey1: value,
  requiredKey2: value,

  // Optional keys (may be present, template checks before using)
  optionalKey: value || undefined,

  // Permissions
  canEdit: boolean
}
```

**Characteristics:**
- Flat object (no deep nesting)
- All arrays pre-normalized (sorted, filtered, grouped as needed)
- All numbers pre-formatted (no calculations in templates)
- All strings pre-processed (no .trim(), .toLowerCase(), etc.)
- All collections explicit (empty arrays, not undefined)

**Not to be confused with:** "Sheet context" (the entire context object), "Raw actor data"

---

### Panel Builder
**Definition:** Function that transforms actor data into a panel context.

**Naming Convention:** `build<PanelName>()` or `build<PanelName>Panel()`

**Signature:**
```javascript
buildHealthPanel() {
  const panel = {
    // normalized data
  };
  this._validatePanelContext('healthPanel', panel);
  return panel;
}
```

**Characteristics:**
- Reads from `this.actor.system`, `this.derived`, or `this.system`
- Never mutates actor data
- Normalizes all data (sorting, filtering, formatting)
- Calls `_validatePanelContext()` to enforce contract
- Returns object matching panel registry contract

**Responsibility:** Normalize actor data into render-ready form

**Not responsible for:** Game logic (calculations), validation (done by validator)

---

### Panel Validator
**Definition:** Function that enforces a panel context contract.

**Naming Convention:** `validate<PanelName>()`

**Signature:**
```javascript
export function validateHealthPanel(panelData) {
  const errors = [];
  // Check required keys
  if (typeof panelData.hp.value !== 'number') {
    errors.push('hp.value must be number');
  }
  return { valid: errors.length === 0, errors };
}
```

**Characteristics:**
- Registered in `validatePanel()` router
- Returns `{ valid: boolean, errors: string[] }`
- Specific error messages (helps debugging)
- Checks all required keys are present and correct type
- Checks optional keys only if present

**Behavior:**
- Normal mode: Validates, logs warnings on failure
- Strict mode: Validates, throws errors on failure

**Not responsible for:** Game logic validation (that's in builders)

---

### Panel Template
**Definition:** Handlebars partial that renders a panel using its context.

**Naming Convention:** `<panel-name>-panel.hbs` or `<panel-name>-panel.hbs`

**Characteristics:**
- Reads from `{{panelName.key}}` (never from flat context)
- Checks optional keys with `{{#if panelName.optionalKey}}`
- Has root element matching registry rootSelector
- Uses SVG frame/content/overlay if svgBacked

**Structure:**
```handlebars
<section class="swse-panel swse-panel--<name> <name>-panel">
  {{#if svgBacked}}
    <div class="swse-panel__frame"></div>
  {{/if}}
  <div class="swse-panel__content">
    {{!-- panel content --}}
  </div>
  {{#if svgBacked}}
    <div class="swse-panel__overlay"></div>
  {{/if}}
</section>
```

---

## Data Structure Concepts

### Ledger Panel
**Definition:** Panel displaying tabular data with multiple rows.

**Contract Requirements:**
```javascript
{
  entries: Array,                    // Array of row objects
  hasEntries: boolean,              // entries.length > 0
  totalCount: number,               // entries.length
  emptyMessage: string,             // Message if no entries
  grouped: object,                  // Optional: grouped entries
  canEdit: boolean                  // Can add/remove rows
}
```

**Row Contract:**
Each row type (TalentRow, FeatRow, etc.) has defined shape:
```javascript
{
  id: string,
  name: string,
  // type-specific fields
  canEdit: boolean
}
```

**Examples:**
- `inventoryPanel` - Items with name, type, quantity, weight
- `talentPanel` - Talents with name, tier, source
- `featPanel` - Feats with name, benefit, source

---

### Display Panel
**Definition:** Read-only informational panel.

**Contract:**
- Any required keys
- `canEdit: boolean` optional
- No special structure

**Examples:**
- `healthPanel` - HP, damage, conditions
- `biographyPanel` - Character background
- `defensePanel` - Defense values

---

### Row Transformer
**Definition:** Function that normalizes actor items into panel rows.

**Signature:**
```javascript
export function transformTalentRow(talentItem) {
  return {
    id: talentItem.id,
    name: talentItem.name,
    tier: talentItem.system?.tier,
    // ... more fields
  };
}
```

**Used by:** Ledger panel builders to normalize multiple items

**Characteristics:**
- Pure function (no side effects)
- Returns object matching row contract
- Handles missing data gracefully (defaults)

---

## Layout & Rendering Concepts

### SVG-Backed Panel
**Definition:** Panel with SVG background image (frame).

**Structure:**
```handlebars
<section class="swse-panel svg-panel-frame">
  <div class="swse-panel__frame"></div>     <!-- SVG background -->
  <div class="swse-panel__content"></div>   <!-- Main content -->
  <div class="swse-panel__overlay"></div>   <!-- Positioned elements -->
</section>
```

**CSS Classes:**
- `.swse-panel__frame` - SVG background layer
- `.swse-panel__content` - Normal flow content
- `.swse-panel__overlay` - Positioned over content

**Geometry Variables:**
```css
--panel-<name>-min-height: 200px;
--panel-<name>-aspect-ratio: 1 / 1.2;
--panel-<name>-safe-area: inset(30px);
```

---

### Safe Area
**Definition:** Region within SVG panel safe from overlay elements.

**Use:** Padding for text/content to avoid overlapping SVG decorations.

**Definition Methods:**
- CSS inset property: `inset(top right bottom left)`
- Variables: `--safe-area-top`, `--safe-area-right`, etc.

**Example:**
```css
.swse-panel__content {
  padding: var(--safe-area-top) var(--safe-area-right)
           var(--safe-area-bottom) var(--safe-area-left);
}
```

---

### Frame/Content/Overlay Pattern
**Definition:** Standard layout structure for SVG-backed panels.

**Components:**
1. **Frame** - SVG image (background, visual container)
2. **Content** - HTML content in normal DOM flow
3. **Overlay** - Positioned HTML elements (positioned absolutely/relatively)

**Order:** Frame → Content → Overlay (back to front)

**When to use:** Any panel with SVG background

**When NOT to use:** Simple panels with no visual decoration

---

## Operational Concepts

### Panel Visibility
**Definition:** Whether a panel is currently visible/active on screen.

**Tracking:** `PanelVisibilityManager.panelState[panelName].visible`

**Determined by:** Current active tab (sheets define tab→panel mappings)

**Impact:** Invisible panels can be skipped during building (lazy loading)

---

### Lazy Building
**Definition:** Skip building panels that aren't currently visible.

**Benefit:** ~60% render time reduction in typical use

**Implementation:**
```javascript
// Character sheet defines tab→panel mappings
const visiblePanels = visibilityManager.getPanelsToBuild(actor);
for (const panelName of visiblePanels) {
  panelContexts[panelName] = builder.build<PanelName>();
}
```

**Invalidation:** When user switches tabs, hidden panels rebuild on demand

---

### Cache Validity
**Definition:** Whether a cached panel context is current with actor data.

**Tracked by:** `PanelVisibilityManager.panelState[panelName].cacheValid`

**Invalidated when:**
- Data of type that affects panel changes
- Explicit invalidation via `invalidateByType()`
- Sheet detects data change

**Reset when:** Sheet closes

---

### Conditional Panel
**Definition:** Panel that only exists if condition met.

**Examples:**
- `forcePowersPanel` - only if actor is force-sensitive
- `starshipManeuversPanel` - only if actor is a vehicle

**Definition:**
```javascript
this.conditionalPanels = {
  forcePowersPanel: {
    condition: (actor) => actor.system?.forceSensitive === true,
    reason: 'not force sensitive'
  }
};
```

**Behavior:**
- Not built if condition false
- Not visible in UI if condition false
- Re-evaluated every render

---

### Strict Mode
**Definition:** Development mode enforcing contracts and throwing errors.

**Configuration:** `CONFIG.SWSE.sheets.v2.strictMode = true`

**Behavior:**
- Panel validators throw on contract violations (instead of warning)
- Post-render assertions run and throw on DOM mismatches
- Additional diagnostics logged
- Performance warnings at thresholds

**Use:** During development and testing

---

### Post-Render Assertion
**Definition:** Validation that rendered DOM matches expected structure.

**Examples:**
- Frame element present and has SVG image
- Content layer has expected child elements
- Ledger rows have data attributes
- Panel root element matches registry selector

**Runner:** `PostRenderAssertions.runAll()`

**Behavior:**
- Logs warnings on mismatch
- Throws errors in strict mode

---

### UI State
**Definition:** Interactive state preserved across rerenders.

**Examples:**
- Active tab
- Expanded/collapsed sections
- Focused form field
- Scroll position
- Filter/search state

**Manager:** `UIStateManager`

**Lifecycle:**
1. User interacts (expand section, switch tab)
2. State captured in DOM
3. Data change triggers rerender
4. State restored to DOM after rerender

---

### Panel Diagnostics
**Definition:** Performance tracking and observability.

**Tracked:**
- Builder execution time per panel
- Which panels built vs skipped
- Validation timing
- Errors during build

**Usage:**
```javascript
panelDiagnostics.logDiagnostics();  // Show summary
```

**Output:**
- Silent in normal mode
- Verbose in dev/strict modes

---

## Naming Conventions

### Panel Names
Format: `<type><name>Panel`

Examples:
- `healthPanel` (health + panel)
- `talentPanel` (talent + panel)
- `inventoryPanel` (inventory + panel)

**Consistent across all sheets.**

---

### Builder Methods
Format: `build<PanelName>()`

Examples:
- `buildHealthPanel()`
- `buildTalentPanel()`
- `buildInventoryPanel()`

**Discoverable:** Method name derived from panel registry name.

---

### Validator Functions
Format: `validate<PanelName>()`

Examples:
- `validateHealthPanel()`
- `validateTalentPanel()`

**Registration:** Added to `validatePanel()` router map.

---

### Row Types
Format: `<Type>Row`

Examples:
- `InventoryRow` (item in inventory)
- `TalentRow` (talent known by character)
- `FeatRow` (feat taken by character)

**JSDoc typedef:** Every row type documented with @typedef

---

### CSS Classes
Format: `.swse-panel--<name>` or `.swse-panel__<part>`

Examples:
- `.swse-panel--health` (health panel)
- `.swse-panel--talent` (talent panel)
- `.swse-panel__frame` (frame layer, BEM part)
- `.swse-panel__content` (content layer)
- `.swse-panel__overlay` (overlay layer)

**Methodology:** BEM (Block Element Modifier)

---

## Do's and Don'ts

### DO:
✅ Use standard terminology from this document
✅ Extend shared base classes
✅ Document custom terminology in your sheet
✅ Follow naming conventions consistently
✅ Validate panels with official validators
✅ Use SVG-backed panels for visual designs
✅ Keep game logic in builders/panels, not shared code

### DON'T:
❌ Invent new names for existing concepts
❌ Copy shared code instead of extending
❌ Mix game logic into shared infrastructure
❌ Create panels without registry entries
❌ Validate in builders (that's validator's job)
❌ Store game logic in row transformers
❌ Use undefined terminology in code comments

---

## Future Extensions

This vocabulary may be extended for:
- **Control panels** (interactive, button-heavy panels)
- **Socket panels** (panels with named slots for draggable items)
- **Accordion panels** (nested collapsible sections)
- **Tabbed panels** (panels containing internal tabs)

When adding new concepts, document them here and follow existing conventions.

---

## References

- **Shared Layer:** `scripts/sheets/v2/shared/`
- **Character Sheet:** `scripts/sheets/v2/character/`
- **Platform Architecture:** `V2_SHEET_PLATFORM_ARCHITECTURE.md`
- **Extension Recipes:** `EXTENSION_RECIPES.md`
- **Phase 7 Audit:** `PHASE_7_AUDIT.md`

