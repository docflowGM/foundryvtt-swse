# Extension Recipes: How to Safely Extend the SWSE V2 Sheet

**Last Updated:** 2026-03-29
**Target Audience:** Developers adding new features to the character sheet
**Confidence:** These patterns have been validated through 18 existing panels

This document provides step-by-step recipes for the most common extension tasks.

---

## Recipe 1: Add a New Display Panel

**Difficulty:** MEDIUM | **Time:** 30-45 minutes
**Example:** Adding a "Biography Extra" panel to show detailed character background

### Step 1: Define the Panel in PANEL_REGISTRY

File: `scripts/sheets/v2/context/PANEL_REGISTRY.js`

```javascript
  biographyExtraPanel: {
    name: 'Biography Extra',
    type: 'display',          // display, ledger, or control
    svgBacked: false,         // true if uses SVG frame/content/overlay
    structure: 'text blocks with expandable sections',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/biography-extra-panel.hbs',
    builder: 'buildBiographyExtraPanel',
    validator: 'validateBiographyExtraPanel',
    requiredKeys: [
      'backgroundStory',
      'motivations',
      'fears'
    ],
    optionalKeys: [
      'goals',
      'secrets',
      'canEdit'
    ],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.biography-extra-panel',
      optionalElements: {
        '.biography-section': '1..3'
      }
    }
  }
```

**Key Points:**
- `type` must be 'display', 'ledger', or 'control'
- `builder` and `validator` names must match the exact pattern
- `requiredKeys` are data that MUST exist (validation will fail without them)
- `optionalKeys` are data that MAY exist (template checks before using)
- If SVG-backed, set `svgBacked: true` and include SVG structure in assertions

### Step 2: Create the Template

File: `templates/actors/character/v2/partials/biography-extra-panel.hbs`

```handlebars
<section class="swse-panel swse-panel--biography-extra biography-extra-panel">

  <!-- If SVG-backed, add frame/content/overlay structure -->
  <!-- For non-SVG panels, structure is simpler -->

  <div class="swse-panel__content">
    <header class="section-bar">
      <h3 class="section-header">Background & Motivations</h3>
      {{#if biographyExtraPanel.canEdit}}
        <button type="button" class="btn-small" data-action="edit-biography">Edit</button>
      {{/if}}
    </header>

    {{#if biographyExtraPanel.backgroundStory}}
      <div class="biography-section" data-section="background">
        <h4>Background Story</h4>
        <p>{{biographyExtraPanel.backgroundStory}}</p>
      </div>
    {{/if}}

    {{#if biographyExtraPanel.motivations}}
      <div class="biography-section" data-section="motivations">
        <h4>Motivations</h4>
        <p>{{biographyExtraPanel.motivations}}</p>
      </div>
    {{/if}}

    {{#if biographyExtraPanel.fears}}
      <div class="biography-section" data-section="fears">
        <h4>Fears & Weaknesses</h4>
        <p>{{biographyExtraPanel.fears}}</p>
      </div>
    {{/if}}

    {{#if biographyExtraPanel.goals}}
      <div class="biography-section" data-section="goals">
        <h4>Goals</h4>
        <p>{{biographyExtraPanel.goals}}</p>
      </div>
    {{/if}}
  </div>

</section>
```

**Key Points:**
- Root element MUST have ID or data attribute matching panel name
- Panel name prefix in class helps with styling: `swse-panel--biography-extra`
- Use `{{panelName.key}}` to access panel context data
- Check `{{#if panel.optionalKey}}` before using optional data
- Each section should have a `data-section` or ID for state management

### Step 3: Create the Builder

File: `scripts/sheets/v2/context/PanelContextBuilder.js` - add this method:

```javascript
  /**
   * Build the biography extra panel context
   *
   * Contract: biographyExtraPanel
   * - backgroundStory: string
   * - motivations: string
   * - fears: string
   * - goals: string (optional)
   * - secrets: string (optional)
   * - canEdit: boolean
   */
  buildBiographyExtraPanel() {
    // Extract data from actor (read from system, not from flat context)
    const bioExtra = this.actor.system?.bioExtra || {};

    const panel = {
      // REQUIRED data
      backgroundStory: bioExtra.backgroundStory || '',
      motivations: bioExtra.motivations || '',
      fears: bioExtra.fears || '',

      // OPTIONAL data
      goals: bioExtra.goals || undefined,
      secrets: bioExtra.secrets || undefined,

      // PERMISSIONS
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('biographyExtraPanel', panel);

    return panel;
  }
```

**Key Points:**
- Extract data from `this.actor.system` or `this.derived` (actor's official data)
- DO NOT create derived data in the builder (builders should normalize, not compute)
- Return required keys ALWAYS (even if empty string)
- Return optional keys as `undefined` if not present (template checks with `{{#if}}`)
- Call `_validatePanelContext()` to enforce contract
- Add JSDoc comment describing the contract

### Step 4: Create the Validator

File: `scripts/sheets/v2/context/PanelValidators.js` - add this function:

```javascript
/**
 * Validate biographyExtraPanel contract
 */
export function validateBiographyExtraPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('biographyExtraPanel is null/undefined');
    return { valid: false, errors };
  }

  // Validate REQUIRED keys
  if (typeof panelData.backgroundStory !== 'string') {
    errors.push('backgroundStory must be string');
  }
  if (typeof panelData.motivations !== 'string') {
    errors.push('motivations must be string');
  }
  if (typeof panelData.fears !== 'string') {
    errors.push('fears must be string');
  }

  // Validate OPTIONAL keys (if present, must be correct type)
  if (panelData.goals !== undefined && typeof panelData.goals !== 'string') {
    errors.push('goals must be string');
  }
  if (panelData.secrets !== undefined && typeof panelData.secrets !== 'string') {
    errors.push('secrets must be string');
  }

  // Validate permissions
  if (typeof panelData.canEdit !== 'boolean') {
    errors.push('canEdit must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

Then add to the `validatePanel` function's validators map:

```javascript
export function validatePanel(panelKey, panelData) {
  const validators = {
    // ... existing validators ...
    biographyExtraPanel: validateBiographyExtraPanel  // ADD THIS LINE
  };
  // ... rest of function ...
}
```

**Key Points:**
- Validate that required keys are present and correct type
- For optional keys, only validate type if present (use `!== undefined` check)
- Return `{ valid: true/false, errors: string[] }`
- Be specific in error messages ("must be string", not "invalid")

### Step 5: Add Type Definitions (JSDoc)

File: `scripts/sheets/v2/context/PanelTypeDefinitions.js` - add after other display panels:

```javascript
/**
 * Biography Extra Panel Context
 * Displays extended background, motivations, and character goals
 * @typedef {Object} BiographyExtraPanelContext
 * @property {string} backgroundStory - Character's origin and background
 * @property {string} motivations - What drives the character
 * @property {string} fears - Character's fears and weaknesses
 * @property {string} goals - Character's long-term goals (optional)
 * @property {string} secrets - Hidden secrets (optional)
 * @property {boolean} canEdit - Whether bio can be edited
 */
```

Then add to the `AllPanelContexts` typedef:

```javascript
/**
 * All Panel Contexts Combined
 * @typedef {Object} AllPanelContexts
 * @property {/* ... existing panels ... */}
 * @property {BiographyExtraPanelContext} biographyExtraPanel  // ADD THIS
 */
```

### Step 6: Update the Builder's buildAllPanels() Method

File: `scripts/sheets/v2/context/PanelContextBuilder.js` - update buildAllPanels():

```javascript
  buildAllPanels() {
    return {
      // ... existing panels ...
      biographyExtraPanel: this.buildBiographyExtraPanel()  // ADD THIS LINE
    };
  }
```

### Step 7: Include Panel in Main Template

File: `templates/actors/character/v2/character-sheet.hbs` - add to appropriate section:

```handlebars
<!-- In the biography/personal tab section -->
{{> "systems/foundryvtt-swse/templates/actors/character/v2/partials/biography-extra-panel.hbs"}}
```

### Step 8: Add Tab Mapping (if on hidden tab)

File: `scripts/sheets/v2/PanelVisibilityManager.js`:

```javascript
this.tabPanels = {
  // ... existing tabs ...
  biography: ['biographyPanel', 'biographyExtraPanel']  // ADD biographyExtraPanel
};
```

### Step 9: Test

```javascript
// In browser console on character sheet:

// 1. Verify panel appears
const panel = document.querySelector('.biography-extra-panel');
console.log('Panel rendered:', !!panel);

// 2. Check context data
console.log('Panel data:', window.lastContext?.biographyExtraPanel);

// 3. Verify validation passes (strict mode)
// CONFIG.SWSE.strictMode = true; then rerender
```

### Checklist

- [ ] Panel added to PANEL_REGISTRY
- [ ] Template created with correct root element
- [ ] Builder created and returns required keys
- [ ] Validator created and added to validatePanel
- [ ] JSDoc typedef added
- [ ] buildAllPanels() updated
- [ ] Template included in main sheet
- [ ] Tab mapping updated (if needed)
- [ ] Run verify-panel-alignment.js - shows 0 issues
- [ ] Test in normal and strict modes
- [ ] Test visibility (tab switching)

---

## Recipe 2: Add a New Ledger Panel

**Difficulty:** MEDIUM-HIGH | **Time:** 45-60 minutes
**Example:** Adding "Equipment Upgrades" panel to show armor/weapon upgrades

The main difference from Recipe 1:

### Differences for Ledger Panels

1. **Registry definition:**
```javascript
equipmentUpgradesPanel: {
  type: 'ledger',  // Not 'display'!
  // ... other fields ...
  rowContract: {
    type: 'EquipmentUpgradeRow',
    shape: ['id', 'itemId', 'name', 'slotType', 'cost']
  }
}
```

2. **Builder returns ledger contract:**
```javascript
buildEquipmentUpgradesPanel() {
  const upgrades = (this.actor.system?.equipmentUpgrades || []).map(upgrade => ({
    id: upgrade.id || '',
    itemId: upgrade.itemId || '',
    name: upgrade.name || '',
    slotType: upgrade.slotType || 'general',
    cost: upgrade.cost || 0
  }));

  const panel = {
    entries: upgrades,
    hasEntries: upgrades.length > 0,
    totalCount: upgrades.length,
    emptyMessage: 'No equipment upgrades installed.',
    canEdit: this.sheet.isEditable
  };

  this._validatePanelContext('equipmentUpgradesPanel', panel);
  return panel;
}
```

3. **Template uses ledger rows:**
```handlebars
{{#each equipmentUpgradesPanel.entries}}
  <div class="ledger-row" data-item-id="{{this.id}}">
    <span class="col-name">{{this.name}}</span>
    <span class="col-type">{{this.slotType}}</span>
    <span class="col-cost">{{this.cost}} credits</span>
  </div>
{{/each}}
```

4. **Add row transformer** (if needed):
File: `scripts/sheets/v2/context/RowTransformers.js`

```javascript
export function transformEquipmentUpgradeRow(upgradeData) {
  return {
    id: upgradeData.id || '',
    itemId: upgradeData.itemId || '',
    name: upgradeData.name || '',
    slotType: upgradeData.slotType || 'general',
    cost: upgradeData.cost || 0,
    canEdit: true
  };
}
```

---

## Recipe 3: Add Validation to an Existing Panel

**Difficulty:** EASY | **Time:** 10-15 minutes
**Example:** Add validation that health panel HP isn't negative

### Step 1: Update Validator

File: `scripts/sheets/v2/context/PanelValidators.js`:

```javascript
export function validateHealthPanel(panelData) {
  const errors = [];

  // ... existing validation ...

  // ADD: Check HP values are non-negative
  if (panelData.hp.value < 0) {
    errors.push('HP.value cannot be negative');
  }
  if (panelData.hp.max <= 0) {
    errors.push('HP.max must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 2: Test

Open sheet in strict mode and verify validation runs:
```javascript
CONFIG.SWSE.strictMode = true;
actor.render();  // Should warn or error if validation fails
```

---

## Recipe 4: Add a Post-Render Assertion

**Difficulty:** MEDIUM | **Time:** 20-30 minutes
**Example:** Verify armor panel SVG background is present

### Step 1: Add Assertion to Registry

File: `scripts/sheets/v2/context/PANEL_REGISTRY.js`:

```javascript
armorSummaryPanel: {
  // ... existing definition ...
  postRenderAssertions: {
    critical: false,
    rootSelector: '.armor-summary-panel',
    requiredElements: {
      '.swse-panel__frame': '1',     // SVG background frame
      '.armor-summary': '0..1'       // Armor display (1 or 0 if not equipped)
    }
  }
}
```

### Step 2: Implement in PostRenderAssertions

File: `scripts/sheets/v2/context/PostRenderAssertions.js`:

```javascript
_assertArmorSummaryStructure(root) {
  const errors = [];
  const frame = root.querySelector('.swse-panel__frame');
  if (!frame) {
    errors.push('Missing SVG background frame');
  }
  // SVG should have image element
  const bgImage = frame?.querySelector('image');
  if (bgImage && !bgImage.href.baseVal?.includes('svg')) {
    errors.push('Frame SVG not properly loaded');
  }
  return errors;
}
```

---

## Recipe 5: Optimize a Slow Panel Builder

**Difficulty:** MEDIUM | **Time:** 30-45 minutes
**Example:** Equipment panel iterates through 500 items

### Problem
```javascript
buildEquipmentPanel() {
  // SLOW: Iterates all items every render
  const equipment = this.actor.items
    .filter(item => ['weapon', 'armor', 'equipment'].includes(item.type))
    .map(item => ({/* ...normalize... */}))
    .sort((a, b) => {/* ...complex sort... */});
  // ...
}
```

### Solution 1: Cache at Builder Level

```javascript
  buildEquipmentPanel() {
    // Check if cache is valid (hasn't been invalidated)
    if (this._equipmentPanelCache && this._equipmentCacheValid) {
      return this._equipmentPanelCache;
    }

    // Build only if cache invalid
    const equipment = this._buildEquipmentList();  // Extract to separate method

    // Store and mark valid
    this._equipmentPanelCache = { entries: equipment, hasEntries: equipment.length > 0 };
    this._equipmentCacheValid = true;

    return this._equipmentPanelCache;
  }

  _buildEquipmentList() {
    // ... normalize and sort ...
  }
```

### Solution 2: Use Visibility Manager to Skip

If this panel is expensive and not always visible, register it as lazy:

```javascript
// In character-sheet.js constructor:
this.visibilityManager.conditionalPanels.heavyEquipmentPanel = {
  condition: (actor) => actor.items.length > 50,  // Only build if many items
  reason: 'not enough items to warrant complexity'
};
```

---

## Recipe 6: Add UI State Preservation to a Panel

**Difficulty:** EASY-MEDIUM | **Time:** 15-25 minutes
**Example:** Remember which ledger rows are expanded

### Step 1: Mark Expandable Rows

Update template to use data attributes:

```handlebars
{{#each equipmentLedgerPanel.allEquipment}}
  <div class="ledger-row"
       data-expandable="true"
       data-item-id="{{this.id}}"
       data-expanded="false">
    {{!-- row content --}}
  </div>
{{/each}}
```

### Step 2: Wire Up Expansion Handler

File: `character-sheet.js` activateListeners method:

```javascript
activateListeners(html, options) {
  // ... existing listeners ...

  html.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-expandable="true"]');
    if (row) {
      const isExpanded = row.dataset.expanded === 'true';
      row.dataset.expanded = !isExpanded;
      row.classList.toggle('expanded', !isExpanded);

      // Save to UI state manager
      const itemId = row.dataset.itemId;
      this.uiStateManager.setRowExpanded(itemId, !isExpanded);
    }
  }, { signal: options.signal });
}
```

### Step 3: Test

- Expand rows
- Rerender or switch tabs
- Verify expansion state is preserved

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: Accessing Flat Context Instead of Panel Context
**Wrong:**
```handlebars
{{equipment.length}}  <!-- Trying to access flat context -->
```

**Right:**
```handlebars
{{inventoryPanel.entries.length}}  <!-- Access through panel -->
```

### Pitfall 2: Forgetting to Add Panel to buildAllPanels()
**Symptom:** Panel builder never called, always undefined
**Fix:** Add `panelName: this.buildPanelName()` to the return object

### Pitfall 3: Not Handling Optional Keys
**Wrong:**
```handlebars
<p>{{panel.optionalField}}</p>  <!-- If missing, renders "undefined" -->
```

**Right:**
```handlebars
{{#if panel.optionalField}}
  <p>{{panel.optionalField}}</p>
{{/if}}
```

### Pitfall 4: Panel Builder Returning Wrong Shape
**Wrong:**
```javascript
// Builder returns array instead of object with "entries" key
buildTalentPanel() {
  return this.actor.items.filter(i => i.type === 'talent');
}
```

**Right:**
```javascript
buildTalentPanel() {
  const entries = this.actor.items.filter(i => i.type === 'talent');
  return {
    entries,
    hasEntries: entries.length > 0,
    canEdit: this.sheet.isEditable
  };
}
```

### Pitfall 5: Validator Rejecting Valid Optional Data
**Wrong:**
```javascript
// Requires optional field even when it's undefined
if (!panelData.optionalField || typeof panelData.optionalField !== 'string') {
  errors.push('optionalField must be string');
}
```

**Right:**
```javascript
// Only validate if present
if (panelData.optionalField !== undefined && typeof panelData.optionalField !== 'string') {
  errors.push('optionalField must be string');
}
```

### Pitfall 6: Not Testing with verify-panel-alignment.js
**After adding panel:**
```bash
node scripts/verify-panel-alignment.js
```
Should show 0 issues and new panel in list.

---

## Testing Your Extension

### Manual Testing Checklist
- [ ] Panel appears on sheet
- [ ] Data displays correctly
- [ ] Optional fields show/hide correctly
- [ ] Validation passes in strict mode
- [ ] UI state persists (if applicable)
- [ ] Panel hides on correct tab
- [ ] No console errors
- [ ] verify-panel-alignment.js shows 0 issues

### Automated Testing Pattern
```javascript
describe('MyNewPanel', () => {
  it('builds successfully', () => {
    const builder = new PanelContextBuilder(actor, sheet);
    const panel = builder.buildMyNewPanel();
    expect(panel.entries).toBeDefined();
    expect(panel.hasEntries).toBeBoolean();
  });

  it('passes validation', () => {
    const panel = { entries: [], hasEntries: false, canEdit: true };
    const result = validateMyNewPanel(panel);
    expect(result.valid).toBe(true);
  });
});
```

---

## Getting Help

**Panel doesn't appear:**
1. Check PANEL_REGISTRY entry exists
2. Verify builder name matches pattern
3. Run `verify-panel-alignment.js`
4. Check browser console for errors

**Data shows undefined:**
1. Verify template uses correct panel name: `{{panelName.key}}`
2. Check builder returns all required keys
3. In strict mode, check validation errors
4. Inspect browser console

**Performance issue:**
1. Check PanelDiagnostics logs: `panelDiagnostics.logDiagnostics()`
2. If panel is slow and not always visible, add to conditional panels
3. Cache expensive computations if they don't change frequently

---

