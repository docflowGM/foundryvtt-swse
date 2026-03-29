# PARTIAL AND SUBPARTIAL GOVERNANCE RULES

**For All V2 Sheet Contributors and Maintainers**

---

## QUICK REFERENCE

### For Adding a New Panel Partial

```
1. Naming:
   - Method: build<PanelName>Panel()
   - Context: <panelName>Panel
   - File: <panel-name>-panel.hbs
   - CSS: .swse-panel--<panel-name>

2. Implementation (Checklist):
   ✅ Builder method in [Sheet]PanelContextBuilder.js
   ✅ Validator function in [Sheet]PanelValidators.js
   ✅ PANEL_REGISTRY entry with full metadata
   ✅ Template file at correct path
   ✅ CSS root class defined
   ✅ Strict Mode test passes (no errors)
   ✅ Post-render assertions if complex DOM

3. Data Model:
   - Read from one panel context root (builder output)
   - All data comes from builder, not template lookups
   - Validation runs before render

4. Submit:
   - Commit message: "Phase X: Add [sheet type] [panel name] panel"
   - PR description: Reference issue, show registry entry
   - Run pre-commit checks before submitting
```

### For Adding a Subpartial to a Panel

```
1. Determine data source:
   - Row: Subpartial receives one item from ledger entries
   - Parent Property: Subpartial receives nested panel context property
   - Nested Context: Subpartial receives sub-view-model from parent builder

2. Naming:
   - File: <purpose>-subpartial.hbs
   - CSS: .swse-subpartial--<purpose>
   - Validator (if needed): validate<Purpose>Subpartial()

3. Implementation:
   ✅ Template file created
   ✅ Declared in parent PANEL_REGISTRY.subpartials array
   ✅ Data source documented (row | parent-property | nested-context)
   ✅ Validator if data is complex
   ✅ Tested with sample data

4. Key Rule:
   - DO NOT reach into parent panel context unless data explicitly passed
   - DO NOT reach into actor.system when row data is sufficient
   - DO declare all dependencies

5. Submit:
   - Commit message: "Phase X: Add [subpartial name] subpartial to [panel name]"
   - Update parent PANEL_REGISTRY entry
   - Validate parent registry entry is syntactically correct
```

### If You Need to Break a Rule

```
1. Document: Why does this partial need to break [rule]?
2. Propose: How will you mitigate the broken rule?
3. Request: Open GitHub issue, assign to lead architect
4. Approve: Get sign-off from lead architect + maintainers
5. Mark: Add EXCEPTION comment in code with issue reference
6. Review: In quarterly maintenance, re-evaluate exception
```

---

## DETAILED GOVERNANCE

### Governance #1: Ownership and Scope

**Rule G1.1: Every Partial Has One Owner**
- A panel partial is owned by exactly one panel context builder
- If two panels need similar data, they each have their own builder (or use a shared transformer)
- Example: If character AND droid both need health display, both have own healthPanel, but may share row transformer

**Rule G1.2: Subpartials Never Invent Independent Context**
- A subpartial receives data from parent, not from global/actor/system
- If subpartial genuinely needs independence, it should be a separate panel, not a subpartial
- Example: A "character summary" that exists across multiple sheets should be a panel, not a subpartial

**Rule G1.3: Reusable Panels Must Be Contract-Identical**
- If character and NPC both use "inventory panel," they must have:
  - Same builder output shape
  - Same validator rules
  - Same template (or identical templates)
  - Same row transformer
- If any of these differs, create separate panels and document why

**Rule G1.4: Subpartial Accountability**
- Parent partial is responsible for subpartial correctness
- If subpartial renders wrong, parent's builder/validator is at fault
- Subpartial validator can reject invalid data, but parent builder must not produce it

---

### Governance #2: Naming Conventions

**Rule G2.1: Use Strict Naming, No Abbreviations**

✅ Good naming:
```
buildInventoryPanel
buildAbilityScoresPanel
buildDroidModificationPointsPanel
validateAbilityScoresPanel
transformInventoryItemRow
inventory-panel.hbs
ability-scores-subpartial.hbs
.swse-panel--inventory
.swse-subpartial--ability-score
```

❌ Bad naming:
```
buildInvPanel        ← Abbreviation
buildAbilPanel       ← Abbreviation
buildDroidModPanel   ← Abbreviation
validateAbil         ← Incomplete
formatInvRow         ← Wrong verb (not 'transform')
inv-panel.hbs        ← Abbreviation
ability.hbs          ← Plural-singular confusion
.ability-display     ← Missing panel/subpartial prefix
```

**Rule G2.2: Panel Naming Pattern**
```
builder()    → buildHealthPanel
context key  → healthPanel
validator()  → validateHealthPanel
template     → health-panel.hbs
css root     → .swse-panel--health
registry     → PANEL_REGISTRY.panels.healthPanel
```

**Rule G2.3: Subpartial Naming Pattern**
```
template                → <purpose>-subpartial.hbs
css root                → .swse-subpartial--<purpose>
validator (if needed)   → validate<Purpose>Subpartial()
declared in parent      → PANEL_REGISTRY.panels.parentPanel.subpartials
```

Examples:
```
✅ inventory-row-subpartial.hbs (renders one row in ledger)
✅ health-bar-subpartial.hbs (renders health bar in health panel)
✅ condition-slot-subpartial.hbs (renders one condition slot)
❌ row.hbs (too vague)
❌ item-display.hbs (ambiguous context)
```

**Rule G2.4: Row Transformer Naming**
```
transformInventoryItemRow()    ← source type + Row
transformAbilityScoreRow()     ← source type + Row
transformDroidProtocolRow()    ← source type + Row
```

---

### Governance #3: Context Rules

**Rule G3.1: No Reaching Into Global Context**

✅ CORRECT: Partial reads from panel context
```javascript
// buildHealthPanel returns:
{
  currentHealth: 25,
  maxHealth: 50,
  isDamaged: true,
  conditions: [{id, name, icon}, ...]
}

// Template uses:
{{healthPanel.currentHealth}}
{{healthPanel.maxHealth}}
{{#each healthPanel.conditions}}
  {{>condition-slot-subpartial this}}
{{/each}}
```

❌ WRONG: Partial reaches into actor.system
```javascript
// Template uses:
{{actor.system.health.value}}
{{actor.system.health.max}}
{{#each actor.system.conditions}}
```

❌ WRONG: Hybrid context (uses both panel and global)
```javascript
// Template uses:
{{healthPanel.currentHealth}} AND {{actor.system.health.max}}
{{#if healthPanel.isDamaged}} ... {{actor.system.conditions}} ... {{/if}}
```

**Rule G3.2: Subpartials Receive Explicit Data**

✅ CORRECT: Parent passes data to subpartial
```handlebars
{{#each healthPanel.conditions}}
  {{>condition-slot-subpartial this}}
{{/each}}
```

Condition subpartial receives:
```javascript
{id, name, icon, severity}
```

❌ WRONG: Subpartial reaches into parent context
```handlebars
<!-- In condition-slot-subpartial.hbs -->
{{../../healthPanel.isDamaged}}  ← Forbidden (undeclared parent dependency)
{{../actorName}}                  ← Forbidden (reaching into parent)
```

**Rule G3.3: Row Subpartials Use Transformer Output, Nothing Else**

✅ CORRECT: Row transformer produces row, subpartial uses row
```javascript
// Transformer produces:
{
  id: 'item-1',
  name: 'Blaster',
  img: 'path/to/blaster.png',
  qty: 1,
  weight: 2,
  rarity: 'common'
}

// Subpartial uses:
{{name}} {{qty}} ×{{weight}}kg
```

❌ WRONG: Subpartial queries actor data for row details
```handlebars
<!-- inventory-row-subpartial reaches into actor -->
{{actor.items.find(i => i.id === itemId).description}}
```

❌ WRONG: Row subpartial assumes parent context
```handlebars
<!-- inventory-row-subpartial assumes filter exists -->
{{#if ../../inventoryPanel.filter.active}}
  <span class="filtered">{{name}}</span>
{{/if}}
```

**Rule G3.4: Ledger Panels Must Provide All Row Data in Builder**

Inventory panel builder MUST produce:
```javascript
{
  entries: [
    {id, uuid, name, img, type, qty, weight, rarity, canEdit, canDelete, display: {qty, weight}}
  ],
  hasEntries: true/false,
  emptyState: "No items in inventory",
  controls: {canAdd, canRemove}
}
```

NOT rely on subpartial to fetch or compute missing row fields.

---

### Governance #4: Validation and Contracts

**Rule G4.1: Every Panel Must Have a Validator**

```javascript
function validateHealthPanel(healthPanel) {
  const errors = [];

  // Check required structure
  if (typeof healthPanel.currentHealth !== 'number') {
    errors.push('currentHealth must be number');
  }
  if (typeof healthPanel.maxHealth !== 'number') {
    errors.push('maxHealth must be number');
  }
  if (!Array.isArray(healthPanel.conditions)) {
    errors.push('conditions must be array');
  }

  // Check sub-objects
  if (healthPanel.conditions.length > 0) {
    const firstCondition = healthPanel.conditions[0];
    if (!('id' in firstCondition) || !('name' in firstCondition)) {
      errors.push('condition missing required fields (id, name)');
    }
  }

  return {valid: errors.length === 0, errors};
}
```

Called by builder before rendering:
```javascript
const healthPanel = buildHealthPanel(actor);
const validation = validateHealthPanel(healthPanel);

if (!validation.valid) {
  if (CONFIG.SWSE.sheets.v2.strictMode) {
    throw new Error(`Health panel invalid: ${validation.errors.join('; ')}`);
  } else {
    console.warn(`Health panel warning: ${validation.errors.join('; ')}`);
  }
}

context.panels.healthPanel = healthPanel;
```

**Rule G4.2: Row Validators Check Shape**

```javascript
function validateInventoryRow(row) {
  const errors = [];
  const required = ['id', 'uuid', 'name', 'img', 'type', 'cssClass', 'canEdit', 'canDelete'];

  for (const field of required) {
    if (!(field in row)) {
      errors.push(`Row missing required field: ${field}`);
    }
  }

  if (!row.display || typeof row.display.qty !== 'number') {
    errors.push('Row.display.qty must be number');
  }

  return {valid: errors.length === 0, errors};
}
```

Called by parent panel validator:
```javascript
function validateInventoryPanel(inventoryPanel) {
  const errors = [];

  if (!Array.isArray(inventoryPanel.entries)) {
    errors.push('entries must be array');
  } else {
    // Validate first row as sample
    if (inventoryPanel.entries.length > 0) {
      const rowVal = validateInventoryRow(inventoryPanel.entries[0]);
      if (!rowVal.valid) {
        errors.push(`Row validation failed: ${rowVal.errors[0]}`);
      }
    }
  }

  return {valid: errors.length === 0, errors};
}
```

**Rule G4.3: Post-Render Assertions Verify DOM**

For panels with complex DOM structure:
```javascript
// In PANEL_REGISTRY entry
{
  name: 'inventoryPanel',
  postRenderAssertions: [
    {
      selector: '.swse-panel--inventory',
      expectation: (el) => el.querySelector('.inventory-rows') !== null,
      errorMessage: 'Missing inventory rows container'
    },
    {
      selector: '.inventory-row',
      expectation: (el) => el.querySelector('.item-icon') !== null,
      errorMessage: 'Inventory row missing item icon'
    }
  ]
}
```

---

### Governance #5: SVG-Backed Partials

**Rule G5.1: SVG Partials Must Declare Safe Areas**

```javascript
// droidPortraitPanel
{
  imagePath: 'path/to/droid.svg',
  dimensions: {width: 300, height: 400},
  safeArea: {
    x: 50,
    y: 50,
    width: 200,
    height: 300,
    description: 'Central droid body, excluding head/arms'
  }
}
```

**Rule G5.2: Use Frame/Content/Overlay Layers**

SVG file structure:
```xml
<svg id="droid-portrait-svg" width="300" height="400">
  <g id="frame">
    <!-- Background art, non-interactive -->
    <image x="0" y="0" href="droid-art.png"/>
  </g>

  <g id="content">
    <!-- Main interactive content, constrained to safe area -->
    <g class="droid-health-bars">
      <rect x="50" y="50" width="200" height="20"/>
    </g>
  </g>

  <g id="overlay">
    <!-- Top-level controls, socketed at anchor points -->
    <g id="status-badge-anchor" x="280" y="10" width="30" height="30"/>
  </g>
</svg>
```

**Rule G5.3: Declare Anchor Points and Constraints**

```javascript
anchors: {
  'status-badge': {
    x: 280,
    y: 10,
    rotation: 0,
    size: {width: 30, height: 30},
    allowedSubpartials: ['droid-status-badge'],
    required: true
  }
}
```

**Rule G5.4: Socketed Subpartials Respect Constraints**

SVG subpartial (droid-status-badge-subpartial.hbs):
```handlebars
<!-- Socketed at anchor 'status-badge' (30×30px) -->
<div class="droid-status-badge" style="width: 30px; height: 30px;">
  <!-- Icon or status indicator, constrained to 30×30 -->
</div>
```

Not allowed:
```handlebars
<!-- ❌ Overflowing anchor size -->
<div class="droid-status-badge" style="width: 50px; height: 50px;">
```

---

### Governance #6: Forbidden Patterns

These patterns cause automatic PR rejection.

**FP-1: Direct actor.system Access in Template**

```handlebars
❌ WRONG
{{actor.system.health.value}}
{{actor.system.skills.acrobatics.bonus}}
{{actor.items[0].name}}

✅ RIGHT (when data available in panel context)
{{healthPanel.currentHealth}}
{{skillsPanel.acrobatics.bonus}}
{{inventoryPanel.entries[0].name}}
```

**FP-2: Subpartial Reaching Into Undeclared Parent**

```handlebars
❌ WRONG
{{../../inventoryPanel.filter.active}}
{{../hasEntries}}
{{parentContext.someField}}

✅ RIGHT (if filter state needed in row)
<!-- Parent passes filter state to row -->
{{isFiltered}}
```

**FP-3: Hybrid Context (Partial Uses Both Panel and Global)**

```handlebars
❌ WRONG
{{#if healthPanel.isDamaged}}
  {{actor.system.conditions}}
{{/if}}

✅ RIGHT (panel context has all data)
{{#if healthPanel.isDamaged}}
  {{#each healthPanel.conditions}}
    {{name}}
  {{/each}}
{{/if}}
```

**FP-4: Row Subpartial Querying Actor Data**

```handlebars
❌ WRONG
<!-- inventory-row-subpartial -->
{{actor.items.find(i => i.id === itemId).description}}

✅ RIGHT (transformer produced description)
{{description}}
```

**FP-5: Panel-to-Panel Dependency**

```javascript
❌ WRONG
// defensePanel context builder uses:
const damageModifier = context.panels.healthPanel.damageModifier;

✅ RIGHT (each panel gets what it needs from actor)
// defensePanel builder calculates from actor.system
```

**FP-6: Undocumented Context Assumptions**

```handlebars
❌ WRONG
<!-- No doc saying where 'skillBonus' comes from -->
{{skillBonus}}

✅ RIGHT
<!-- Parent PANEL_REGISTRY declares this -->
<!-- Subpartial receives: {skillBonus, ...} -->
{{skillBonus}}
```

**FP-7: SVG Controls Using Absolute Positioning**

```handlebars
❌ WRONG
<div style="position: absolute; top: 280px; left: 10px;">
  <!-- Status badge at fixed position -->
</div>

✅ RIGHT
<!-- Socketed at declared anchor 'status-badge' -->
<div class="socketed-at-anchor-status-badge">
  <!-- Positioned by anchor system, not absolute position -->
</div>
```

---

### Governance #7: Strict Mode Behavior

In **development/testing**:
```
CONFIG.SWSE.sheets.v2.strictMode = true

→ Contract violations throw errors
→ Validators fail loudly
→ Render stops on validation failure
→ Useful for: Finding bugs before release
```

In **production**:
```
CONFIG.SWSE.sheets.v2.strictMode = false

→ Contract violations logged as warnings
→ Validators produce warnings, don't block render
→ Sheets degrade gracefully
→ Useful for: Players who have modified/incompatible data
```

---

### Governance #8: Registry and Documentation

Every new panel MUST have PANEL_REGISTRY entry:

```javascript
PANEL_REGISTRY.panels.newPanel = {
  // Identity
  name: 'newPanel',
  type: 'display', // 'display' | 'ledger' | 'svg'
  sheet: 'character',

  // Implementation
  builderName: 'buildNewPanel',
  validatorName: 'validateNewPanel',
  templatePath: 'templates/v2/character/panels/new-panel.hbs',

  // Data contract
  contextContract: {
    required: ['fieldA', 'fieldB'],
    optional: ['fieldC'],
    description: 'What this panel displays'
  },

  // Subpartials (if any)
  subpartials: [
    {
      name: 'new-subpartial',
      template: 'templates/.../new-subpartial.hbs',
      dataSource: 'row', // How data enters subpartial
      validatorName: 'validateNewRow',
      description: 'What this subpartial renders'
    }
  ],

  // Post-render checks
  postRenderAssertions: [/* ... */],

  // Reusability
  reusableBy: ['npc', 'droid'],
  reusability: 'full', // 'full' | 'partial' | 'none'

  notes: 'Any special notes about this panel'
};
```

---

### Governance #9: Code Review Checklist for Partials

When reviewing a PR that adds/modifies panels or subpartials:

```
NAMING
  ☐ Builder method is buildXxxPanel() (for panels) or transformer/validator are properly named
  ☐ Context key is xxxPanel (for panels)
  ☐ Template file is xxx-panel.hbs or xxx-subpartial.hbs
  ☐ CSS root classes follow .swse-panel-- or .swse-subpartial--
  ☐ No abbreviations

CONTEXT CONTRACT
  ☐ Panel reads from one context root (builder output)
  ☐ Subpartial receives data explicitly (passed as parameter)
  ☐ Row subpartial uses transformer output, not custom queries
  ☐ No hybrid context (template doesn't use both panel context and actor.system)
  ☐ No undocumented context assumptions

VALIDATION
  ☐ Panel has validator function
  ☐ Validator returns {valid: boolean, errors: string[]}
  ☐ Row validator checks all required fields if ledger panel
  ☐ Post-render assertions defined for complex DOM
  ☐ Strict Mode test passes (no validation errors)

REGISTRY
  ☐ PANEL_REGISTRY entry exists with complete metadata
  ☐ Required keys match builder output
  ☐ Subpartials declared in registry (if any)
  ☐ Template path points to actual file
  ☐ Reusability documented

SVG (if applicable)
  ☐ Safe area defined
  ☐ Anchor points with size constraints
  ☐ Frame/content/overlay layers used
  ☐ Subpartials respect anchor constraints

FORBIDDEN PATTERNS
  ☐ No direct actor.system access in templates
  ☐ No cross-partial dependencies
  ☐ No subpartial reaching into parent context
  ☐ No undeclared fallback paths
  ☐ No row transformation in template (should be in builder)

TESTING
  ☐ Strict Mode test passes
  ☐ Backwards compatible (old actor data loads)
  ☐ Sample data tested (if complex ledger)
  ☐ No console errors

DOCUMENTATION
  ☐ Builder method has JSDoc
  ☐ Validator function has JSDoc
  ☐ Context contract documented
  ☐ Subpartials documented in registry
  ☐ If new sheet type, MIGRATION_ROADMAP updated
```

---

## EXCEPTION PROCESS

If you believe a partial genuinely cannot follow the contract:

### Step 1: Document the Constraint
```
GitHub Issue Title:
Exception Request - [Partial Name] - [Rule Break]

Body:
## Partial/Panel
[health panel | inventory-row subpartial | etc.]

## Rule Being Broken
[Which governance rule #G, FP, etc.]

## Why Is This Necessary?
[Why does this partial need to break the rule?]

## Proposed Mitigation
[How will you compensate for breaking the rule?]
Example: "Row subpartial needs parent filter state, so parent builder will explicitly pass it as row.isFiltered instead of reaching up the context tree"

## Risk Assessment
[What could go wrong if this exception is granted?]
```

### Step 2: Get Approval
- Requires approval from:
  - Lead architect (decision authority)
  - Relevant sheet maintainers
- Do not implement until approved

### Step 3: Mark in Code
```javascript
// EXCEPTION-G3.2: Subpartial accesses parent context (Issue #1234)
// Mitigation: Parent explicitly passes filter state as row property
// Expires: Until Issue #1234 closed or 2026-09-29
```

### Step 4: Review Quarterly
- In maintenance sprints, re-evaluate exceptions
- Is mitigation still effective?
- Can the exception be removed?
- Should it be renewed or revoked?

---

## SUMMARY

**When adding a partial/subpartial, ask yourself:**

1. **Naming:** Am I following the naming pattern (noabbreviations)?
2. **Ownership:** Does this have exactly one data source?
3. **Context:** Will this partial read only from its declared context?
4. **Validation:** Do I have a validator that checks the contract?
5. **Registry:** Have I updated PANEL_REGISTRY with full metadata?
6. **Forbidden:** Am I avoiding the 7 forbidden patterns?
7. **SVG (if applicable):** Do I have safe areas and anchor points?
8. **Strict Mode:** Does this pass strict mode tests?

If YES to all: Submit PR.
If NO to any: Fix before submitting, or request exception.

**Questions?**
- See PARTIAL_SUBPARTIAL_CONTRACT.md (formal specification)
- See PARTIAL_RECIPES.md (how-to examples)
- See PARTIAL_NAMING_CONVENTIONS.md (naming reference)
- Ask lead architect in GitHub issue

---

**Version:** 1.0
**Effective:** Phase 9 onwards
**Last Updated:** 2026-03-29
