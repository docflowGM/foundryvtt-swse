# PARTIAL AND SUBPARTIAL CONTRACT STANDARD

**Version 1.0**
**Status: Active Governance**
**Effective Date: Phase 9**
**Last Updated: 2026-03-29**

---

## EXECUTIVE SUMMARY

This document defines the formal contract that governs how all panels are decomposed into partials (top-level render units) and subpartials (child render units) in the V2 sheet architecture. This contract prevents drift, enables reuse, and ensures consistency across current and future sheet types.

A partial is **not a visual component**—it is a **data contract** that specifies:
- Canonical data ownership
- Allowed context roots
- Required validation
- Naming conventions
- Dependencies on other partials or row transformers

This contract is **enforceable** through code-level validation, pre-commit hooks, and CI/CD checks. It is **mandatory** for all new partials and subpartials added to the V2 platform.

---

## PART I: CANONICAL PARTIAL OWNERSHIP MODEL

### Definition: What Is a Partial?

A **partial** is a top-level render unit owned by exactly one panel context and responsible for rendering a discrete, reusable section of a panel.

Characteristics:
- Has one canonical owning **panel context root** (e.g., `healthPanel`, `inventoryPanel`)
- Produced by one **panel context builder** (e.g., `buildHealthPanel()`)
- Validated by one **panel validator** (e.g., `validateHealthPanel()`)
- Rendered by one **template partial** (e.g., `health-panel.hbs`)
- Referenced in **PANEL_REGISTRY** with complete metadata
- **May be reused** across sheet types if contract is identical

### Definition: What Is a Subpartial?

A **subpartial** is a child render unit that **never owns data independently**. It receives data from exactly one of three sources:

1. **Parent Panel Root**: Inherits structure from the owning partial
   - Example: `healthPanel.display` → `health-display-subpartial.hbs`
   - The subpartial consumes a declared property of the parent panel context

2. **Explicit Row/Item Object**: Receives structured data passed from parent partial
   - Example: A ledger row subpartial receives `{id, name, qty, ...}`
   - The row structure is defined by a **row transformer** (e.g., `transformInventoryRow()`)

3. **Dedicated Sub-View-Model**: Receives a nested context explicitly created by parent builder
   - Example: `inventoryPanel.filter` → `inventory-filter-subpartial.hbs`
   - The sub-view-model is declared in PANEL_REGISTRY and built by parent builder

Characteristics:
- **Cannot invent independent context** without explicit design approval
- **Must declare** which data source it uses (documented in parent partial registry)
- **Must receive data explicitly** (passed as parameter, not found through global search)
- **Cannot depend on sibling subpartials**
- **Cannot directly access** actor/system/global context unless parent partial explicitly allows and documents

### Ownership Rules (Non-Negotiable)

**CR-1.1: One Panel, One Context Root**
- A partial is owned by exactly one panel context
- Example: `healthPanel` is owned by `buildHealthPanel()`, not shared with combat panel or defense panel
- If two panels need the same data shape, they inherit from a **reusable transformer**, not a shared context root

**CR-1.2: No Partial Rummaging**
- Partials (and their subpartials) do NOT search through global sheet context for data
- All data needed by a partial must be in its declared context root or explicitly passed
- Exception: Reading CONFIG or system.json rules (allowed, read-only)

**CR-1.3: Subpartials Are Not Independent**
- A subpartial cannot declare its own independent context model
- A subpartial must declare which parent it depends on and what data structure it expects
- Violation: Subpartial inventing a new ledger entry shape not defined by parent

**CR-1.4: Parent Always Responsible for Child Accuracy**
- If a parent partial builds malformed data for a subpartial, the parent builder is at fault
- The subpartial validator can reject invalid data, but the parent builder must produce correct data
- Consequence: Parent builders must call child validators before rendering

**CR-1.5: Data Flow Is Explicit**
- Every data dependency is documented
- Parent → Subpartial data flow is tracked in registry or builder comments
- Hidden context dependencies are forbidden

---

## PART II: NAMING CONTRACT STANDARD

### Convention: Panel and Partial Names

All naming follows a strict **kebab-case ↔ camelCase** mapping:

**Rule NC-2.1: Panel-Level Naming**
```
Builder:     buildHealthPanel()
Context Key: healthPanel
Validator:   validateHealthPanel()
Template:    health-panel.hbs
Registry:    PANEL_REGISTRY.panels.healthPanel
CSS Root:    .swse-panel--health
```

**Pattern:**
- Builder method: `build<PascalCaseName>Panel()`
- Context key: `<camelCaseName>Panel`
- Template file: `<kebab-case-name>-panel.hbs`
- Validator function: `validate<PascalCaseName>Panel()`
- Registry entry: `panels.<camelCaseName>Panel`
- CSS root class: `.swse-panel--<kebab-case-name>`

**Examples:**
```
Inventory Panel:
  buildInventoryPanel() → inventoryPanel → inventory-panel.hbs
  validateInventoryPanel() → .swse-panel--inventory

Ability Scores Panel:
  buildAbilityScoresPanel() → abilityScoresPanel → ability-scores-panel.hbs
  validateAbilityScoresPanel() → .swse-panel--ability-scores

Droid Modification Points Panel:
  buildDroidModPointsPanel() → droidModPointsPanel → droid-mod-points-panel.hbs
  validateDroidModPointsPanel() → .swse-panel--droid-mod-points
```

**Rule NC-2.2: Subpartial Naming**
```
Subpartial template: <kebab-case-name>-subpartial.hbs
Subpartial context key: <camelCaseName>Subpartial (if nested context)
CSS root class: .swse-subpartial--<kebab-case-name>
```

**Pattern:**
- File: `<kebab-case-purpose>-subpartial.hbs` (not `item.hbs` or `row.hbs`, but `inventory-row-subpartial.hbs`)
- Context key (if nested): `<camelCaseName>Subpartial`
- CSS root: `.swse-subpartial--<kebab-case-name>`

**Examples (Good):**
```
inventory-row-subpartial.hbs (renders one inventory item)
health-display-subpartial.hbs (renders health bars/numbers in health panel)
ability-score-subpartial.hbs (renders one ability score in abilities panel)
droid-protocol-subpartial.hbs (renders one droid protocol)
feat-summary-subpartial.hbs (renders feat summary header)
```

**Examples (Bad):**
```
✗ row.hbs (too vague, unclear what row)
✗ item.hbs (ambiguous, is it inventory item or ledger item?)
✗ display.hbs (unclear what's displayed)
✗ detail.hbs (not specific about which details)
```

**Rule NC-2.3: Row Transformer Naming**
```
Function: transform<SourceType>Row()
Example: transformInventoryItemRow() transforms actor.items to ledger row
Example: transformDroidProtocolRow() transforms protocol object to display row
```

Pattern:
- `transform<SourceType>Row(sourceObject, actorContext?)`
- Returns standardized row shape with id, name, img, type, tags, display, flags
- Documented with @example showing input → output

**Rule NC-2.4: Forbidden Naming Patterns**

These are auto-rejected on review:
```
✗ Panels: healthBar, defenseBox, inventoryList (use panel name)
✗ Subpartials: component, ui, detail, row without qualifier
✗ Transformers: parse, prep, format (use transform<Type>Row)
✗ Validators: check, test, is<property> (use validate<Name>)
✗ Abbreviations in formal names: invPanel, dmgPanel, abilPanel (spell out)
```

---

## PART III: CONTEXT CONTRACT

### Rule CT-3.1: Top-Level Partial Context

A top-level partial **receives data from exactly one source: its panel context root**.

```javascript
// CORRECT: Partial receives complete panel context
healthPanel = {
  currentHealth: 25,
  maxHealth: 50,
  woundThreshold: 10,
  isDamaged: true,
  display: { format: 'absolute', showThreshold: true }
}

// CORRECT: Subpartial receives explicit nested property
healthPanel.display → health-display-subpartial.hbs
```

```javascript
// WRONG: Partial reaches into global context
// ✗ template uses: {{actor.system.health.value}}
// ✗ builder uses: let currentHealth = actor.system.health.value (in template logic)
// ✗ template uses fallback: {{healthPanel.health ?? actor.system.health.value}}
```

**Rule CT-3.2: Ledger/List Partial Context**

A ledger partial receives an `entries` array where **each entry is produced by a row transformer**.

```javascript
// CORRECT: Inventory ledger
inventoryPanel = {
  entries: [
    {id: 'item-1', name: 'Blaster', qty: 1, weight: 2, ...}, // row transformer output
    {id: 'item-2', name: 'Thermal Detonator', qty: 1, weight: 0.5, ...},
  ],
  hasEntries: true,
  emptyState: 'No items',
  filter: {active: 'all'}, // optional filter context
  controls: {canAdd: true, canRemove: true} // optional
}

// Subpartial receives one row from entries
{{#each entries}}
  {{>inventory-row-subpartial this}}
{{/each}}
```

**Rule CT-3.3: Row Subpartial Context**

A row subpartial **receives exactly one row object** produced by a row transformer. It **does not reach back into actor.system**.

```javascript
// inventory-row-subpartial.hbs receives:
{
  id: 'item-123',
  uuid: '...',
  name: 'Blaster Rifle',
  img: 'path/to/image.png',
  type: 'weapon',
  qty: 1,
  weight: 2,
  cost: 500,
  rarity: 'common',
  cssClass: 'inventory-row--weapon',
  canEdit: true,
  canDelete: true,
  display: { highlight: false, showRarity: true }
}

// CORRECT: Use properties passed in row
<div class="{{cssClass}}">{{name}}</div>

// WRONG: Reach into parent or global
// ✗ {{actor.items.find(i => i.id === id).some.property}}
// ✗ {{inventoryPanel.actor.system.items[0]}}
```

**Rule CT-3.4: SVG-Backed Partial Context**

An SVG-backed partial receives:
- SVG metadata (dimensions, safe areas, anchor points)
- Layer structure (frame, content, overlay)
- Control definitions for socketed elements

```javascript
// droidPortraitPanel (SVG-backed)
{
  imagePath: 'path/to/droid.svg',
  dimensions: { width: 300, height: 400 },
  safeArea: { x: 50, y: 50, width: 200, height: 300 },
  layers: {
    frame: { opacity: 1, zIndex: 1 },
    content: { opacity: 1, zIndex: 2 },
    overlay: { opacity: 0.8, zIndex: 3 }
  },
  anchors: {
    'droid-status': {x: 10, y: 10, rotation: 0, icon: 'icon-path'},
    'restriction-badge': {x: 280, y: 10, rotation: 0, icon: 'icon-path'}
  },
  controls: {canEdit: false, canRotate: false}
}
```

**Rule CT-3.5: Utility Subpartial Context**

A utility subpartial (shared UI component, not tied to a specific row or parent) receives **explicit parameters** and **does not assume parent context**.

Example: A "confirmation dialog" subpartial
```javascript
{
  title: 'Delete Item?',
  message: 'This cannot be undone.',
  actions: [
    {label: 'Delete', action: 'delete-confirmed', cssClass: 'btn-danger'},
    {label: 'Cancel', action: 'cancel', cssClass: 'btn-default'}
  ],
  canDismiss: true
}
```

**Rule CT-3.6: Forbidden Context Patterns**

These patterns are automatically rejected:

```javascript
// WRONG: Hybrid context dependence (partial uses both parent context and global)
// ✗ Uses {{inventoryPanel.items}} AND reaches into {{actor.system.items}}
// ✗ Uses {{healthPanel.currentHealth}} AND calculates {{actor.system.health.value + modifier}}

// WRONG: Partial-to-partial dependency (one partial reads another's context)
// ✗ defensePanel uses {{healthPanel.isDamaged}} for conditional rendering
// ✗ talentPanel uses {{abilityPanel.strength}} for validation display

// WRONG: Undocumented fallback paths
// ✗ {{inventoryPanel.entries ?? actor.items}}
// ✗ {{row.name || parent.actor.name}}

// WRONG: Lazy context resolution in template
// ✗ {{#if inventoryPanel}} {{else}} show global items {{/if}}

// WRONG: Subpartial assuming parent structure
// ✗ Inventory row subpartial uses: {{../../inventoryPanel.filter.active}}
```

---

## PART IV: LEDGER AND ROW CONTRACT

### Rule LR-4.1: Standard Ledger Panel Structure

All ledger-style panels follow this schema:

```javascript
ledgerPanel = {
  // Data
  entries: [row, row, row],        // Array of standardized row objects
  hasEntries: boolean,              // True if entries.length > 0
  emptyState: string,               // "No items", "No talents", etc.

  // Optional: Grouping
  grouped: {                        // If entries are grouped
    'talent-type-1': [row, row],
    'talent-type-2': [row]
  },
  groupBy: 'type' | 'rarity' | etc., // How grouping was applied

  // Optional: Metadata
  stats: {                          // Aggregate stats if applicable
    totalCount: 5,
    totalWeight: 15,
    uniqueTypes: ['weapon', 'armor']
  },

  // Optional: Controls
  controls: {
    canAdd: boolean,                // Can user add new entry
    canRemove: boolean,             // Can user remove entry
    canEdit: boolean,               // Can user edit entry
    canSort: boolean,               // Can user sort entries
    canFilter: boolean              // Can filtering UI shown
  },

  // Optional: Filter/Search State
  filter: {
    active: 'all' | 'equipped' | 'favorited' | etc.,
    searchTerm: string,
    sort: {field: 'name', direction: 'asc'}
  }
}
```

**Rule LR-4.2: Standard Row Transformer Output**

Every row produced by a row transformer has this minimum structure:

```javascript
row = {
  // Identification (Always required)
  id: string,                       // Unique ID in current context
  uuid: string,                     // Foundry UUID or system UUID

  // Display (Always required)
  name: string,                     // Human-readable name
  img: string,                      // Image path or fallback URL
  type: string,                     // Item type, talent type, etc.
  cssClass: string,                 // CSS class for styling (e.g., 'row--weapon')

  // Tags/Categories (Optional but recommended)
  tags: string[],                   // ['equipped', 'favorite', 'restricted']
  rarity: string,                   // 'common', 'rare', 'legendary' etc.

  // Permissions (Always required)
  canEdit: boolean,                 // Can user edit this row
  canDelete: boolean,               // Can user delete this row

  // Display Values (Context-specific, documented)
  display: {
    // Examples:
    qty: number,                    // For inventory
    weight: number,                 // For inventory
    cost: number,                   // For inventory
    bonus: string,                  // For talents/feats
    range: string,                  // For combat abilities
    ...
  },

  // Flags (Optional, developer-specific state)
  flags: {
    isNew: boolean,
    isDirty: boolean,
    isLocked: boolean,
    ...
  }
}
```

**Rule LR-4.3: Row Transformer Function Contract**

Every row transformer:

1. **Takes source object + optional actor context**
   ```javascript
   function transformInventoryItemRow(item, actor) { ... }
   function transformDroidProtocolRow(protocol) { ... }
   ```

2. **Produces standardized row**
   ```javascript
   return {
     id, uuid, name, img, type, cssClass, tags, canEdit, canDelete,
     display: { /* context-specific */ },
     flags: { /* optional */ }
   }
   ```

3. **Is idempotent** (produces same output for same input)

4. **Handles edge cases** (undefined properties → fallback values)
   ```javascript
   const row = {
     name: item.name || '[Unnamed]',
     img: item.img || 'icons/svg/mystery-man.svg',
     type: item.type || 'miscellaneous',
     ...
   }
   ```

5. **Is documented** with @example showing input/output
   ```javascript
   /**
    * Transform inventory item to ledger row
    * @param {object} item Actor.items[i]
    * @param {Actor} actor Parent actor
    * @returns {object} Standardized row
    * @example
    * const item = {name: 'Blaster', type: 'weapon', quantity: 1, ...}
    * const row = transformInventoryItemRow(item, actor)
    * // row.name === 'Blaster', row.canEdit === true, etc.
    */
   ```

**Rule LR-4.4: Row Subpartial Structure**

A subpartial that renders a row:

1. **Receives one row object as context** (passed via `{{> subpartial row}}`)
2. **Uses only row properties** (documented in transformer return)
3. **Cannot reach into parent ledger panel context**
4. **Can use shared UI helpers** (buttons, icons, etc.)

Example: `inventory-row-subpartial.hbs`
```handlebars
<div class="inventory-row {{cssClass}}" data-item-id="{{id}}">
  <div class="row-left">
    <img src="{{img}}" alt="{{name}}" class="item-icon">
    <span class="item-name">{{name}}</span>
    {{#if tags}}
      <span class="item-tags">
        {{#each tags}}<span class="tag">{{this}}</span>{{/each}}
      </span>
    {{/if}}
  </div>
  <div class="row-right">
    <span class="item-qty">×{{display.qty}}</span>
    <span class="item-weight">{{display.weight}} kg</span>
    {{#if canEdit}}
      <button class="btn-edit" data-action="edit-item" data-id="{{id}}">Edit</button>
    {{/if}}
  </div>
</div>
```

---

## PART V: SVG-BACKED PARTIAL CONTRACT

### Rule SV-5.1: SVG Partial Ownership Model

An SVG-backed partial:
- **Has one SVG file** as the primary render layer
- **Defines explicit safe areas** (regions where UI controls are safe)
- **Declares anchor points** (where socketed subpartials attach)
- **Uses frame/content/overlay structure** (visual layering)
- **Never uses "normal flow but positioned close"** for art-dependent controls

### Rule SV-5.2: Frame/Content/Overlay Pattern

All SVG-backed partials follow this layer structure:

```
SVG File (droid-portrait.svg)
├─ <g id="frame">              ← Background art, non-interactive
│  └─ <image src="droid.png"/>
├─ <g id="content">            ← Main interactive content (health bars, stats)
│  └─ [Bound by safe area geometry]
└─ <g id="overlay">            ← Top-level controls, status badges, icons
   └─ [Socketed at explicit anchor points]
```

**Rule SV-5.3: Safe Area Definition**

SVG-backed partials must declare a safe area:

```javascript
// droidPortraitPanel
{
  imagePath: 'path/to/droid.svg',
  dimensions: { width: 300, height: 400 },
  safeArea: {
    x: 50,           // Left margin from SVG origin
    y: 50,           // Top margin from SVG origin
    width: 200,      // Usable width for controls
    height: 300,     // Usable height for controls
    description: 'Central area excluding droid head and arms'
  }
}
```

**Rule SV-5.4: Anchor Points and Socketing**

SVG-backed partials declare anchor points where subpartials attach:

```javascript
anchors: {
  'status-badge': {
    x: 280,                    // X position in SVG coordinate space
    y: 10,                     // Y position
    rotation: 0,               // Rotation in degrees
    size: {width: 30, height: 30},
    allowedSubpartials: ['droid-status-badge'],
    required: true
  },
  'restriction-display': {
    x: 10,
    y: 380,
    rotation: 0,
    size: {width: 280, height: 20},
    allowedSubpartials: ['restriction-label-subpartial'],
    required: false
  }
}
```

**Rule SV-5.5: SVG Subpartial Contract**

A subpartial that attaches to an SVG anchor:

1. **Knows its anchor point** (documented in parent partial registry)
2. **Respects size constraints** (does not overflow allocated size)
3. **Uses absolute positioning** or contained layout
4. **Does not reposition or resize itself**
5. **Declares what it needs** (anchor name, size assumptions, rotation assumptions)

Example: `droid-status-badge-subpartial.hbs`
```handlebars
<!--
  Attaches to 'status-badge' anchor
  Expected dimensions: 30×30px
  Rotation: 0°
  Content: Single icon + optional label
-->
<div class="droid-status-badge {{cssClass}}" style="width: 30px; height: 30px;">
  <svg viewBox="0 0 30 30">
    <circle r="15" cx="15" cy="15" class="status-background {{statusClass}}"/>
    <text x="15" y="15" text-anchor="middle" class="status-icon">{{icon}}</text>
  </svg>
</div>
```

**Rule SV-5.6: Forbidden SVG Patterns**

These patterns are auto-rejected:

```javascript
// WRONG: Controls positioned relative to SVG visual elements without anchor definition
// ✗ "Status badge goes in top-right corner next to the head" (no anchor point)

// WRONG: Subpartial resizing itself based on content
// ✗ "Badge expands if status text is long" (violates fixed anchor size)

// WRONG: Absolute positioning outside anchor system
// ✗ Template uses: style="position: absolute; top: 10px; left: 10px;"

// WRONG: SVG element sharing between partials
// ✗ droidPortrait and droidCombat both expect to modify same SVG <g id="status">

// WRONG: Dynamic SVG generation in templates
// ✗ Template creates new <circle> elements based on actor data (should be layer structure)
```

---

## PART VI: DEPENDENCY CONTRACT

### Rule DP-6.1: Allowed Dependencies

**Allowed: Parent Partial → Child Subpartial**
```javascript
// Parent builds data, passes to child
inventoryPanel.entries → {{> inventory-row-subpartial row}}
healthPanel.display → {{> health-bar-subpartial healthPanel.display}}
```

**Allowed: Reusable Row Transformers**
```javascript
// Portrait panel uses transformInventoryItemRow
// NPC sheet reuses same transformer
// Droid sheet reuses same transformer
→ No code duplication, shared transformer function
```

**Allowed: Shared UI Utilities**
```javascript
// Partials use documented UI helpers
{{> button-component label=action cssClass="btn-primary"}}
{{> icon-component name="alert" size="small"}}
{{> confirmation-dialog confirmMessage="Delete?" onConfirm=action}}
```

**Allowed: Reading System Configuration**
```javascript
// Partials can read CONFIG or game rules (read-only)
{{#if CONFIG.SWSE.featureForcePowers}}
  {{> force-powers-subpartial}}
{{/if}}
```

**Allowed: Conditional Rendering Based on Own Data**
```javascript
// Partial uses its own context to conditionally show subpartials
{{#if healthPanel.isDamaged}}
  {{> damage-indicator-subpartial healthPanel}}
{{/if}}
```

### Rule DP-6.2: Forbidden Dependencies

**Forbidden: Subpartial Reaching Into Parent Panel Context**
```javascript
// WRONG
// inventory-row-subpartial.hbs uses: {{../../inventoryPanel.filter.active}}
// inventory-row-subpartial.hbs uses: {{../hasEntries}}

// RIGHT: Parent passes filter state as row property
// Parent transforms: inventoryPanel.filter.active → row.isFiltered
// Subpartial uses: {{isFiltered}}
```

**Forbidden: Cross-Partial Dependencies**
```javascript
// WRONG
// defensePanel uses {{healthPanel.isDamaged}}
// combatPanel uses {{abilityScoresPanel.strengthModifier}}

// RIGHT: If combat needs strength modifier:
// 1. combatPanel builder gets strength from actor.system directly
// 2. OR abilityScoresPanel exports a transformer combatPanel can call
// 3. (But never reaches into abilityScoresPanel context at runtime)
```

**Forbidden: Sibling Subpartial Dependencies**
```javascript
// WRONG
// inventory-row-subpartial uses data from companion-item-subpartial

// RIGHT: Parent partial coordinates both subpartials
// inventoryPanel builds data for both
// inventory-row-subpartial and companion-item-subpartial both receive parent-built data
```

**Forbidden: Subpartial Reaching Into Global/System Context**
```javascript
// WRONG
// inventory-row-subpartial.hbs uses: {{actor.system.items.find(i => i.id === itemId)}}

// RIGHT: Parent transformer produces all needed data in row object
// Subpartial uses only row properties
```

**Forbidden: Undocumented Context Assumptions**
```javascript
// WRONG
// droid-protocol-subpartial assumes {{skillBonus}} exists in context
// (Nowhere documented where skillBonus comes from)

// RIGHT: Parent builder explicitly calculates and passes skillBonus
// Parent registry documents: "droid-protocol-subpartial expects row.skillBonus"
// Subpartial uses: {{skillBonus}} with confidence
```

### Rule DP-6.3: Exception Process for Dependencies

If a subpartial genuinely needs to access parent data beyond its row/explicit property:

1. **Document the exception** in parent panel registry:
   ```javascript
   // PANEL_REGISTRY.panels.inventoryPanel
   subpartials: {
     'inventory-row': {
       dataSource: 'row', // Normal
       allowedParentAccess: ['filter.active', 'controls.canRemove'], // Exception
       reason: 'Row needs to know if filter is active to style self'
     }
   }
   ```

2. **Get approval** from lead architect

3. **Mark in code** clearly:
   ```handlebars
   <!-- EXCEPTION-DP-6.3: Access filter from parent -->
   <!-- Reason: Row styling depends on filter state -->
   <div class="inventory-row {{#if ../../filter.active}}filtered{{/if}}">
   ```

4. **Review quarterly** (is exception still needed?)

---

## PART VII: VALIDATION CONTRACT

### Rule VD-7.1: Panel-Level Validation

Every panel must have a validator that:

1. **Returns {valid: boolean, errors: string[]}**
2. **Checks all required keys** in panel context
3. **Validates required key types** (is entries an array?)
4. **Checks subpartial readiness** (if subpartials declared, they exist)
5. **Runs in Strict Mode** (throws on failure) and Production Mode (logs warnings)

```javascript
function validateInventoryPanel(inventoryPanel) {
  const errors = [];

  // Required structure
  if (!Array.isArray(inventoryPanel.entries)) {
    errors.push('inventoryPanel.entries must be array');
  }
  if (typeof inventoryPanel.hasEntries !== 'boolean') {
    errors.push('inventoryPanel.hasEntries must be boolean');
  }
  if (typeof inventoryPanel.emptyState !== 'string') {
    errors.push('inventoryPanel.emptyState must be string');
  }

  // Validate row shape if entries exist
  if (inventoryPanel.entries.length > 0) {
    const firstRow = inventoryPanel.entries[0];
    const rowErrors = validateInventoryRow(firstRow);
    if (!rowErrors.valid) {
      errors.push(`Row validation failed: ${rowErrors.errors[0]}`);
    }
  }

  return {valid: errors.length === 0, errors};
}
```

### Rule VD-7.2: Row-Level Validation

Every row transformer must have a validator that:

1. **Checks required fields** (id, uuid, name, img, type, cssClass, canEdit, canDelete)
2. **Validates display object shape** (context-specific fields)
3. **Checks for required flags** if applicable
4. **Is called by parent validator** before rendering rows

```javascript
function validateInventoryRow(row) {
  const errors = [];

  // Required fields
  const required = ['id', 'uuid', 'name', 'img', 'type', 'cssClass', 'canEdit', 'canDelete'];
  for (const field of required) {
    if (!(field in row) || row[field] === undefined) {
      errors.push(`Row missing required field: ${field}`);
    }
  }

  // Display object
  if (!row.display || typeof row.display !== 'object') {
    errors.push('Row.display must be object');
  } else {
    if (typeof row.display.qty !== 'number') {
      errors.push('Row.display.qty must be number');
    }
    if (typeof row.display.weight !== 'number') {
      errors.push('Row.display.weight must be number');
    }
  }

  return {valid: errors.length === 0, errors};
}
```

### Rule VD-7.3: Subpartial-Level Validation (Optional)

If a subpartial has complex validation needs, it may have a validator:

```javascript
// droid-protocol-subpartial validator
function validateDroidProtocolSubpartial(row) {
  const errors = [];

  // Check subpartial-specific requirements
  if (row.type !== 'protocol') {
    errors.push('Droid protocol subpartial expects row.type === "protocol"');
  }
  if (!('skillBonus' in row.display)) {
    errors.push('Droid protocol row must have display.skillBonus');
  }

  return {valid: errors.length === 0, errors};
}
```

Called by parent validator:
```javascript
function validateDroidPanel(droidPanel) {
  // ... panel-level checks ...

  // Validate rows with subpartial validators
  for (const protocol of droidPanel.protocols) {
    const subpartialErrors = validateDroidProtocolSubpartial(protocol);
    if (!subpartialErrors.valid) {
      errors.push(...subpartialErrors.errors);
    }
  }

  return {valid: errors.length === 0, errors};
}
```

### Rule VD-7.4: Post-Render Assertions for Subpartials

If a subpartial has DOM structure that must be verified after render, declare assertions in parent registry:

```javascript
// PANEL_REGISTRY entry
{
  name: 'inventoryPanel',
  subpartials: [
    {
      name: 'inventory-row-subpartial',
      template: 'templates/v2/character/panels/subpartials/inventory-row-subpartial.hbs',
      postRenderAssertions: [
        {
          selector: '.inventory-row',
          expectation: (el) => el.querySelector('.item-icon') !== null,
          errorMessage: 'Inventory row missing item icon'
        }
      ]
    }
  ]
}
```

---

## PART VIII: PARTIAL REGISTRY AND MANIFEST

### Rule RM-8.1: Extended PANEL_REGISTRY Entry

Each panel in PANEL_REGISTRY declares:

1. **Basic metadata** (name, type, builder, validator, template)
2. **Context contract** (required/optional keys, structure)
3. **Subpartials list** (all subpartials used by this panel)
4. **Row transformer** (if ledger-style)
5. **Assertions** (post-render validation)
6. **Ownership** (sheet type, tab assignment)

Example structure:
```javascript
PANEL_REGISTRY.panels.inventoryPanel = {
  // Identity
  name: 'inventoryPanel',
  type: 'ledger',
  sheet: 'character',
  tabs: ['inventory'],

  // Implementation
  builderName: 'buildInventoryPanel',
  validatorName: 'validateInventoryPanel',
  templatePath: 'templates/v2/character/panels/inventory-panel.hbs',

  // Data contract
  contextContract: {
    required: ['entries', 'hasEntries', 'emptyState'],
    optional: ['controls', 'filter', 'stats', 'grouped'],
    structure: {
      entries: 'array of row objects (see rowTransformer)',
      hasEntries: 'boolean',
      emptyState: 'string',
      controls: '{canAdd, canRemove, canEdit, canSort, canFilter}',
      filter: '{active, searchTerm, sort}'
    }
  },

  // Row transformer
  rowTransformer: 'transformInventoryItemRow',
  rowContract: {
    required: ['id', 'uuid', 'name', 'img', 'type', 'cssClass', 'canEdit', 'canDelete'],
    optional: ['tags', 'rarity', 'flags'],
    displayFields: ['qty', 'weight', 'cost']
  },

  // Subpartials
  subpartials: [
    {
      name: 'inventory-row-subpartial',
      templatePath: 'templates/v2/character/panels/subpartials/inventory-row-subpartial.hbs',
      dataSource: 'row', // 'row' | 'parent-property' | 'nested-context'
      dataSourcePath: 'undefined', // For 'row' type, undefined means row itself
      description: 'Renders one inventory item row',
      validatorName: 'validateInventoryRow',
      requiredParentProperties: ['cssClass', 'display.qty', 'display.weight']
    }
  ],

  // Assertions
  postRenderAssertions: [
    {
      selector: '.swse-panel--inventory',
      expectation: (el) => el.querySelector('.inventory-rows') !== null,
      errorMessage: 'Inventory panel missing rows container'
    }
  ],

  // Reusability
  reusableBy: ['npc', 'droid'], // Which sheet types can reuse this panel
  reusability: 'full', // 'full' | 'partial' | 'none'

  // Notes
  notes: 'Reused by NPC and droid sheets unchanged. Uses shared row transformer.'
};
```

### Rule RM-8.2: Subpartial Manifest

Subpartials are indexed in a manifest for discovery:

```javascript
SUBPARTIAL_MANIFEST = {
  'inventory-row-subpartial': {
    panel: 'inventoryPanel',
    sheet: 'character',
    template: 'templates/v2/character/panels/subpartials/inventory-row-subpartial.hbs',
    dataSource: 'row',
    validatorName: 'validateInventoryRow',
    reusableBy: ['npc', 'droid']
  },
  'health-bar-subpartial': {
    panel: 'healthPanel',
    sheet: 'character',
    template: 'templates/v2/character/panels/subpartials/health-bar-subpartial.hbs',
    dataSource: 'parent-property',
    dataSourcePath: 'healthPanel.display',
    validatorName: undefined, // Optional validator
    reusableBy: ['npc', 'droid']
  },
  // ... more subpartials
};
```

### Rule RM-8.3: Registry Queries

The manifest enables discovery:

```javascript
// What panel owns this subpartial?
const ownerPanel = SUBPARTIAL_MANIFEST['inventory-row-subpartial'].panel;
// → 'inventoryPanel'

// What subpartials does inventory panel use?
const subpartials = PANEL_REGISTRY.panels.inventoryPanel.subpartials;
// → [{name: 'inventory-row-subpartial', ...}]

// Is this row subpartial reusable?
const canReuse = SUBPARTIAL_MANIFEST['inventory-row-subpartial'].reusableBy.includes('droid');
// → true

// What data does this subpartial expect?
const dataSource = SUBPARTIAL_MANIFEST['inventory-row-subpartial'].dataSource;
// → 'row'
```

---

## PART IX: GOVERNANCE AND CONTRIBUTOR RULES

### Rule CG-9.1: What Every New Partial Must Include

Before a new panel partial is considered complete:

```
✅ Builder method: build<Name>Panel()
✅ Validator function: validate<Name>Panel()
✅ Template file: <name>-panel.hbs
✅ PANEL_REGISTRY entry with complete metadata
✅ CSS root class: .swse-panel--<name>
✅ Documentation of context contract
✅ Tested in Strict Mode (no errors)
✅ Backwards compatible (old actor data loads)
✅ Post-render assertions if complex DOM structure
```

### Rule CG-9.2: What Every New Subpartial Must Include

Before a new subpartial is considered complete:

```
✅ Template file: <purpose>-subpartial.hbs
✅ Declared in parent PANEL_REGISTRY entry (subpartials array)
✅ Documented data source (row | parent-property | nested-context)
✅ CSS root class: .swse-subpartial--<name>
✅ Validator function (required if complex, optional if simple)
✅ Does NOT reach into parent panel context unless exception approved
✅ If row subpartial: Uses row transformer output, no custom queries
✅ Tested with sample data in Strict Mode
```

### Rule CG-9.3: Naming Rules (Required)

```
Panels:   build<PascalCase>Panel() → <kebab-case>-panel.hbs → .swse-panel--<kebab-case>
Subpartials: (purpose)-subpartial.hbs → .swse-subpartial--<kebab-case>
Transformers: transform<SourceType>Row()
Validators: validate<PanelName>Panel() | validate<RowType>Row()
```

### Rule CG-9.4: Context Rules (Required)

```
✅ Top-level partial reads from one panel context root
✅ Subpartial receives data explicitly (passed as {{> partial data}})
✅ Row subpartials receive row transformer output, nothing else
✅ No hybrid context (partial doesn't use both panel context and actor.system)
✅ No sibling dependencies (Panel A doesn't read Panel B context)
✅ No hidden fallback paths ({{value ?? actor.system.value}})
```

### Rule CG-9.5: Validation Rules (Required)

```
✅ Panel validator checks all required keys and types
✅ Row validator checks all row fields and display properties
✅ Parent validator calls child validators before rendering
✅ Strict Mode test passes (no validation errors)
✅ Post-render assertions defined for complex DOM structures
```

### Rule CG-9.6: SVG Rules (If Applicable)

```
✅ SVG partial declares safe areas
✅ SVG partial declares anchor points with size/rotation constraints
✅ SVG subpartials respect anchor size (no overflow)
✅ Uses frame/content/overlay layer structure
✅ Socketed subpartials positioned at declared anchors, not absolute positioning
```

### Rule CG-9.7: Forbidden Patterns (Auto-Reject)

```
✗ Template directly accesses actor.system (when panel context should provide data)
✗ Subpartial reaches into parent panel context beyond single property
✗ Row subpartial queries actor.items for custom data
✗ Partial-to-partial dependency (Panel A uses Panel B context)
✗ Undocumented context assumptions
✗ Hybrid context dependence
✗ Cross-sheet context reuse without documented compatibility
✗ SVG controls using absolute positioning instead of anchors
✗ Row transformer not idempotent
```

### Rule CG-9.8: Exception Process

If a new partial cannot follow the contract:

1. **Document the constraint** in GitHub issue
   ```
   Title: Exception Request - [Partial Name] - [Rule Break]
   Body: Why does [partial] need to [violate rule CG-9.7.X]?
   ```

2. **Propose mitigation** (how will you compensate for broken rule?)

3. **Get approval** from lead architect + relevant sheet maintainers

4. **Mark in code** clearly:
   ```javascript
   // EXCEPTION-CG-9.8: Reached into parent context (Issue #XYZ)
   // Mitigation: Validation runs separately, result cached
   ```

5. **Review quarterly** (can exception be removed?)

---

## PART X: ENFORCEMENT HOOKS

### Rule EH-10.1: Pre-Commit Template Validation

Before commit allowed, hook validates:

```bash
npm run validate:partials
# Checks:
# ✓ All templates use correct naming
# ✓ Panel templates don't directly access actor.system
# ✓ Subpartials declared in parent registry
# ✓ No orphaned template files
```

### Rule EH-10.2: Registry Consistency Audit

Audit runs on PR:

```bash
npm run audit:registry
# Checks:
# ✓ Each panel has builder, validator, template
# ✓ Builder and validator names match registry
# ✓ Template file exists at declared path
# ✓ CSS classes defined for panel and subpartials
# ✓ Subpartials declared in manifest
```

### Rule EH-10.3: Strict Mode Enforcement

Validator runs before render:

```javascript
// In PanelContextBuilder._prepareContext()
const result = validateInventoryPanel(inventoryPanel);
if (!result.valid) {
  if (CONFIG.SWSE.sheets.v2.strictMode) {
    throw new Error(`Panel validation failed: ${result.errors.join('; ')}`);
  } else {
    console.warn(`Panel validation warning: ${result.errors.join('; ')}`);
  }
}
```

### Rule EH-10.4: Dependency Checking (Lint Helper)

Optional linter for forbidden patterns:

```javascript
// scripts/tools/v2-partial-linter.js
// Scans templates for:
// ✗ Direct actor.system access
// ✗ Cross-partial context references
// ✗ Undocumented context assumptions
// Runs: npm run lint:partials (optional)
```

---

## SUMMARY: THE PARTIAL CONTRACT AT A GLANCE

| Aspect | Rule | Requirement |
|--------|------|-------------|
| **Ownership** | CR-1.x | One panel, one context root; subpartials never independent |
| **Naming** | NC-2.x | Strict kebab-case ↔ camelCase mapping; no abbreviations |
| **Context** | CT-3.x | Top-level reads panel root; subpartials receive explicit data |
| **Ledger/Row** | LR-4.x | Standardized row shape; transformers idempotent |
| **SVG** | SV-5.x | Safe areas, anchor points, frame/content/overlay layers |
| **Dependencies** | DP-6.x | Parent→child allowed; cross-partial forbidden |
| **Validation** | VD-7.x | Panel validator + row validator + optional subpartial validator |
| **Registry** | RM-8.x | PANEL_REGISTRY + SUBPARTIAL_MANIFEST for discovery |
| **Governance** | CG-9.x | Checklist for new partials; forbidden patterns list |
| **Enforcement** | EH-10.x | Pre-commit, audit, strict mode, optional lint |

---

## NEXT STEPS

This contract is **now active**. All future partial/subpartial work must comply. See:
- **PARTIAL_SUBPARTIAL_GOVERNANCE.md** (contributor rules)
- **PARTIAL_RECIPES.md** (how-to guides)
- **PARTIAL_NAMING_CONVENTIONS.md** (reference card)
- **ROW_TRANSFORMER_STANDARD.md** (row shape details)
- **SVG_BACKED_PARTIAL_STANDARD.md** (SVG rules)

---

**Contract Version:** 1.0
**Effective:** Phase 9 onwards
**Maintained By:** Architecture Team
**Last Review:** 2026-03-29
**Next Review:** 2026-06-29 (quarterly)
