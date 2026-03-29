# V2 Sheet Reusable Recipes

**Last Updated:** 2026-03-29
**Status:** COPY-PASTE TEMPLATES FOR BUILDING V2 SHEETS
**Scope:** Common patterns across Character, NPC, Droid, Vehicle sheets

Complete recipes with copy-paste code examples for building new V2 sheet types or extending existing sheets.

---

## Recipe 1: Create a New Sheet Type

Use this when adding a completely new sheet type (e.g., NPC, Droid, Vehicle).

### Step 1: Extend PanelVisibilityManager

```javascript
// scripts/sheets/v2/npc/NPCPanelVisibilityManager.js
import { PanelVisibilityManager as BasePanelVisibilityManager } from '../shared/PanelVisibilityManager.js';

export class PanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // Define which panels appear on which tabs (NPC-specific)
    this.tabPanels = {
      overview: ['portraitPanel', 'biographyPanel', 'healthPanel', 'defensePanel'],
      abilities: ['talentPanel', 'featPanel'],
      inventory: ['inventoryPanel'],
      notes: ['combatNotesPanel']
      // Customize for your sheet type
    };

    // Define conditional panels (panels that only build under certain conditions)
    this.conditionalPanels = {
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'not force sensitive'
      }
      // Add more conditional panels as needed
    };

    // Initialize state after setting mappings
    this._initializePanelState();

    // Set default tab
    this.currentTab = 'overview';
  }

  /**
   * Map data change types to affected panels
   * Override this to customize invalidation for your sheet type
   * @param {string} type - Type of change (item, talent, feat, etc.)
   */
  invalidateByType(type) {
    const invalidationMap = {
      item: ['inventoryPanel'],
      talent: ['talentPanel'],
      feat: ['featPanel'],
      // Customize for your sheet type
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }
}
```

### Step 2: Create Main Sheet Class

```javascript
// scripts/sheets/v2/npc-sheet.js
import { PanelVisibilityManager } from './npc/NPCPanelVisibilityManager.js';
import { UIStateManager } from './shared/UIStateManager.js';
import { PanelDiagnostics } from './shared/PanelDiagnostics.js';
import { NPCPanelContextBuilder } from './npc/NPCPanelContextBuilder.js';
import { PANEL_REGISTRY } from './npc/PANEL_REGISTRY.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class NPCSheet extends HandlebarsApplicationMixin(ActorSheet) {
  static DEFAULT_OPTIONS = {
    id: 'npc-sheet',
    classes: ['npc-sheet'],
    tag: 'form',
    window: {
      icon: 'fas fa-user-secret',
      title: 'NPC Sheet'
    },
    position: {
      width: 600,
      height: 700
    }
  };

  static PARTS = {
    header: { template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-header.hbs' },
    tabs: { template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-tabs.hbs' },
    body: { template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-body.hbs' }
  };

  /** @override */
  async _onRender(context, options) {
    // Initialize managers on first render
    if (!this.visibilityManager) {
      this.visibilityManager = new PanelVisibilityManager(this);
      this.uiStateManager = new UIStateManager(this);
      this.panelDiagnostics = new PanelDiagnostics();
    }

    // Capture UI state before render
    this.uiStateManager.captureState();

    // Determine which panels to build
    const panelsToBuild = this.visibilityManager.getPanelsToBuild(this.actor);

    // Build panel contexts
    const builder = new NPCPanelContextBuilder(this.actor);
    const panelContexts = {};
    for (const panelName of panelsToBuild) {
      this.panelDiagnostics.recordPanelBuild(panelName);
      try {
        panelContexts[panelName] = builder[`build${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`]?.();
        this.visibilityManager.markPanelBuilt(panelName);
      } catch (error) {
        console.error(`Failed to build panel ${panelName}:`, error);
        this.panelDiagnostics.recordError(panelName, error);
      }
    }

    // Record skipped panels for diagnostics
    const panelsSkipped = this.visibilityManager.getPanelsSkipped(this.actor);
    for (const panelName of panelsSkipped) {
      this.panelDiagnostics.recordPanelSkipped(panelName, 'not visible or condition not met');
    }

    // Merge panel contexts into render context
    const renderContext = {
      ...context,
      ...panelContexts
    };

    // Call parent render
    await super._onRender(renderContext, options);

    // Restore UI state after render
    this.uiStateManager.restoreState();

    // Log diagnostics if verbose mode
    if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
      this.panelDiagnostics.logDiagnostics();
    }
  }

  /** @override */
  async _onClose(options) {
    // Clear UI state when sheet closes
    if (this.uiStateManager) {
      this.uiStateManager.clearState();
    }
    if (this.visibilityManager) {
      this.visibilityManager.clearCache();
    }
    await super._onClose(options);
  }

  /**
   * Handle tab changes (triggered by template click or external call)
   * @param {Event} event - Click event from tab button
   */
  _onTabChange(event) {
    const tabName = event.currentTarget.dataset.tab;
    this.visibilityManager.setActiveTab(tabName);
    this.render();
  }
}

// Register the NPC sheet class
Actors.registerSheet('foundryvtt-swse', NPCSheet, { types: ['npc'], makeDefault: true });
```

### Step 3: Create Panel Visibility Tracking (in HTML/Handlebars)

```handlebars
{{!-- templates/v2/npc/npc-sheet-tabs.hbs --}}
<div class="sheet-tabs">
  {{#each tabPanels as |panelNames tabName|}}
    <button class="tab{{#if (eq currentTab tabName)}} active{{/if}}"
            data-tab="{{tabName}}"
            @click="this._onTabChange(event)">
      {{tabName}}
    </button>
  {{/each}}
</div>
```

---

## Recipe 2: Add a Display Panel to Your Sheet

Use this to add a simple read-only informational panel (no rows, no complex structure).

### Step 1: Define Panel in Registry

```javascript
// In your sheet's PANEL_REGISTRY.js
export const PANEL_REGISTRY = [
  // ... other panels
  {
    panelName: 'strengths', // Use camelCase
    displayName: 'Strengths & Weaknesses',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/strengths-panel.hbs',
    builderMethod: 'buildStrengthsPanel',
    validatorMethod: 'validateStrengthsPanel',
    requiredKeys: ['strengths', 'weaknesses'],
    optionalKeys: ['notes'],
    rootSelector: '.strengths-panel',
    svgBacked: false,
    postRenderAssertions: []
  }
  // ... more panels
];
```

### Step 2: Implement Panel Builder

```javascript
// In your NPCPanelContextBuilder.js
buildStrengthsPanel() {
  const panel = {
    strengths: this.actor.system?.strengths || [],
    weaknesses: this.actor.system?.weaknesses || [],
    notes: this.actor.system?.strengthNotes,
    canEdit: this.actor.isOwner
  };

  // Validate contract
  this._validatePanelContext('strengthsPanel', panel);

  return panel;
}
```

### Step 3: Implement Validator

```javascript
// In your PanelValidators.js
export function validateStrengthsPanel(panelData) {
  const errors = [];

  // Check required keys
  if (!Array.isArray(panelData.strengths)) {
    errors.push('strengths must be array');
  }
  if (!Array.isArray(panelData.weaknesses)) {
    errors.push('weaknesses must be array');
  }

  // Check optional keys if present
  if (panelData.notes !== undefined && typeof panelData.notes !== 'string') {
    errors.push('notes must be string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 4: Create Template

```handlebars
{{!-- templates/v2/npc/panels/strengths-panel.hbs --}}
<section class="swse-panel swse-panel--strengths strengths-panel">
  <div class="swse-panel__content">
    <div class="strengths-list">
      <h4>Strengths</h4>
      {{#if strengthsPanel.strengths.length}}
        <ul>
          {{#each strengthsPanel.strengths as |strength|}}
            <li>{{strength}}</li>
          {{/each}}
        </ul>
      {{else}}
        <p class="empty-state">No strengths defined</p>
      {{/if}}
    </div>

    <div class="weaknesses-list">
      <h4>Weaknesses</h4>
      {{#if strengthsPanel.weaknesses.length}}
        <ul>
          {{#each strengthsPanel.weaknesses as |weakness|}}
            <li>{{weakness}}</li>
          {{/each}}
        </ul>
      {{else}}
        <p class="empty-state">No weaknesses defined</p>
      {{/if}}
    </div>

    {{#if strengthsPanel.notes}}
      <div class="notes">
        <p>{{strengthsPanel.notes}}</p>
      </div>
    {{/if}}
  </div>
</section>
```

### Step 5: Wire Into Sheet

1. Add to your `NPCPanelVisibilityManager.tabPanels`
2. Create the panel builder method
3. Create the validator function
4. Create the template

---

## Recipe 3: Add a Ledger Panel (Multiple Rows)

Use this for panels with repeating rows (inventory, talents, feats, etc.).

### Step 1: Define Panel in Registry

```javascript
export const PANEL_REGISTRY = [
  {
    panelName: 'npcTalents',
    displayName: 'NPC Talents',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/npc-talents-panel.hbs',
    builderMethod: 'buildNPCTalentsPanel',
    validatorMethod: 'validateNPCTalentsPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount', 'emptyMessage', 'canEdit'],
    optionalKeys: ['grouped'],
    rootSelector: '.npc-talents-panel',
    svgBacked: false,
    rowContract: {
      id: 'string (unique ID)',
      name: 'string (talent name)',
      source: 'string (source book)',
      canEdit: 'boolean'
    },
    postRenderAssertions: [
      'rowsHaveDataId',    // Check each row has data-row-id
      'rowsHaveDataType'   // Check each row has data-type
    ]
  }
];
```

### Step 2: Create Row Transformer

```javascript
// In your RowTransformers.js
export function transformNPCTalentRow(talentItem) {
  return {
    id: talentItem.id,
    name: talentItem.name,
    source: talentItem.system?.source || 'Unknown',
    tier: talentItem.system?.tier,
    canEdit: talentItem.isOwner
  };
}
```

### Step 3: Implement Panel Builder

```javascript
buildNPCTalentsPanel() {
  // Get all talent items
  const talentItems = this.actor.items.filter(item => item.type === 'talent');

  // Transform to rows
  const entries = talentItems.map(transformNPCTalentRow);

  // Sort by name (normalize)
  entries.sort((a, b) => a.name.localeCompare(b.name));

  // Group by tier if desired
  const grouped = entries.reduce((acc, row) => {
    const tier = row.tier || 'Unknown';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(row);
    return acc;
  }, {});

  const panel = {
    entries,
    hasEntries: entries.length > 0,
    totalCount: entries.length,
    emptyMessage: 'No talents',
    grouped,
    canEdit: this.actor.isOwner
  };

  this._validatePanelContext('npcTalentsPanel', panel);
  return panel;
}
```

### Step 4: Implement Validator

```javascript
export function validateNPCTalentsPanel(panelData) {
  const errors = [];

  // Check required keys
  if (!Array.isArray(panelData.entries)) {
    errors.push('entries must be array');
  }
  if (typeof panelData.hasEntries !== 'boolean') {
    errors.push('hasEntries must be boolean');
  }
  if (typeof panelData.totalCount !== 'number') {
    errors.push('totalCount must be number');
  }

  // Validate each entry matches row contract
  if (Array.isArray(panelData.entries)) {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') {
        errors.push(`entry[${idx}].id must be string`);
      }
      if (typeof entry.name !== 'string') {
        errors.push(`entry[${idx}].name must be string`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 5: Create Template

```handlebars
{{!-- templates/v2/npc/panels/npc-talents-panel.hbs --}}
<section class="swse-panel swse-panel--npc-talents npc-talents-panel">
  <div class="swse-panel__content">
    {{#if npcTalentsPanel.hasEntries}}
      <div class="ledger-entries">
        {{#each npcTalentsPanel.entries as |entry|}}
          <div class="ledger-row" data-row-id="{{entry.id}}" data-type="talent">
            <div class="row-name">{{entry.name}}</div>
            <div class="row-meta">
              {{#if entry.tier}}
                <span class="tier">Tier {{entry.tier}}</span>
              {{/if}}
              {{#if entry.source}}
                <span class="source">{{entry.source}}</span>
              {{/if}}
            </div>
            {{#if entry.canEdit}}
              <button class="delete-row" @click="this._deleteItem(entry.id)">×</button>
            {{/if}}
          </div>
        {{/each}}
      </div>
    {{else}}
      <p class="empty-state">{{npcTalentsPanel.emptyMessage}}</p>
    {{/if}}
  </div>
</section>
```

---

## Recipe 4: Add SVG-Backed Panel (with Frame/Content/Overlay)

Use this for visually decorated panels with SVG background.

### Step 1: Create SVG Background

```svg
<!-- systems/foundryvtt-swse/assets/v2/panels/npc-abilities-frame.svg -->
<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Define your panel frame design -->
  <rect width="300" height="400" fill="url(#bgGradient)" stroke="#00c8ff" stroke-width="2"/>
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#001e28;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000f19;stop-opacity:1" />
    </linearGradient>
  </defs>
</svg>
```

### Step 2: Add to Panel Registry with SVG Backing

```javascript
export const PANEL_REGISTRY = [
  {
    panelName: 'npcAbilities',
    displayName: 'Abilities',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/npc-abilities-panel.hbs',
    builderMethod: 'buildNPCAbilitiesPanel',
    validatorMethod: 'validateNPCAbilitiesPanel',
    requiredKeys: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
    optionalKeys: [],
    rootSelector: '.npc-abilities-panel',
    svgBacked: true,
    svgPath: 'systems/foundryvtt-swse/assets/v2/panels/npc-abilities-frame.svg',
    safeArea: 'inset(40px 30px 30px 30px)',  // CSS inset values
    postRenderAssertions: [
      'svgFramePresent',
      'contentLayerPresent'
    ]
  }
];
```

### Step 3: Create CSS for Panel

```css
/* In v2-npc-specific.css */
.swse-panel--npc-abilities {
  --panel-npc-abilities-min-height: 250px;
  --panel-npc-abilities-aspect-ratio: 1 / 1.4;
  --safe-area-top: 40px;
  --safe-area-right: 30px;
  --safe-area-bottom: 30px;
  --safe-area-left: 30px;
}

.swse-panel--npc-abilities .swse-panel__frame {
  background-image: url('/systems/foundryvtt-swse/assets/v2/panels/npc-abilities-frame.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.swse-panel--npc-abilities .swse-panel__content {
  padding: var(--safe-area-top) var(--safe-area-right)
           var(--safe-area-bottom) var(--safe-area-left);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-content: start;
}

.swse-panel--npc-abilities .ability-score {
  text-align: center;
}

.swse-panel--npc-abilities .ability-label {
  font-size: 0.75rem;
  opacity: 0.7;
}

.swse-panel--npc-abilities .ability-value {
  font-size: 1.5rem;
  font-weight: 700;
}
```

### Step 4: Create Template with Frame/Content/Overlay

```handlebars
{{!-- templates/v2/npc/panels/npc-abilities-panel.hbs --}}
<section class="swse-panel swse-panel--npc-abilities npc-abilities-panel">
  {{!-- SVG Background Layer --}}
  <div class="swse-panel__frame"></div>

  {{!-- Main Content Layer (normal flow) --}}
  <div class="swse-panel__content">
    <div class="ability-score">
      <div class="ability-label">STR</div>
      <div class="ability-value">{{npcAbilitiesPanel.strength}}</div>
    </div>
    <div class="ability-score">
      <div class="ability-label">DEX</div>
      <div class="ability-value">{{npcAbilitiesPanel.dexterity}}</div>
    </div>
    <div class="ability-score">
      <div class="ability-label">CON</div>
      <div class="ability-value">{{npcAbilitiesPanel.constitution}}</div>
    </div>
    <div class="ability-score">
      <div class="ability-label">INT</div>
      <div class="ability-value">{{npcAbilitiesPanel.intelligence}}</div>
    </div>
    <div class="ability-score">
      <div class="ability-label">WIS</div>
      <div class="ability-value">{{npcAbilitiesPanel.wisdom}}</div>
    </div>
    <div class="ability-score">
      <div class="ability-label">CHA</div>
      <div class="ability-value">{{npcAbilitiesPanel.charisma}}</div>
    </div>
  </div>

  {{!-- Overlay Layer (positioned on top) --}}
  <div class="swse-panel__overlay">
    {{!-- Optional: badges, icons, decorative elements --}}
  </div>
</section>
```

---

## Recipe 5: Add Validators and Assertions

Use this to add contract enforcement and post-render validation.

### Step 1: Create Panel Validator

```javascript
// In PanelValidators.js
export function validateMyCustomPanel(panelData) {
  const errors = [];

  // Check all required keys exist and have correct type
  if (typeof panelData.title !== 'string') {
    errors.push('title must be string');
  }

  if (!Array.isArray(panelData.items)) {
    errors.push('items must be array');
  }

  // Check optional keys only if present
  if (panelData.description !== undefined && typeof panelData.description !== 'string') {
    errors.push('description must be string');
  }

  // Return standard validator response
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 2: Wire Validator Into Builder

```javascript
// In your PanelContextBuilder
buildMyCustomPanel() {
  const panel = {
    title: 'My Title',
    items: [],
    description: 'Optional desc'
  };

  // Validates and throws in strict mode, warns otherwise
  this._validatePanelContext('myCustomPanel', panel);

  return panel;
}

// In the base class:
_validatePanelContext(panelName, panelData) {
  const validatorName = `validate${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`;
  const validator = PanelValidators[validatorName];

  if (!validator) {
    console.warn(`No validator found for ${panelName}`);
    return;
  }

  const result = validator(panelData);

  if (!result.valid) {
    const message = `Panel ${panelName} validation failed: ${result.errors.join('; ')}`;

    if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}
```

### Step 3: Create Post-Render Assertions

```javascript
// In PostRenderAssertions.js
export const PostRenderAssertions = {
  /**
   * Check that SVG frame is present and loaded
   */
  svgFramePresent(panelElement, registryEntry) {
    const frameElement = panelElement.querySelector('.swse-panel__frame');
    if (!frameElement) {
      return {
        valid: false,
        error: 'SVG frame element (.swse-panel__frame) not found'
      };
    }

    const computedStyle = window.getComputedStyle(frameElement);
    if (!computedStyle.backgroundImage || computedStyle.backgroundImage === 'none') {
      return {
        valid: false,
        error: 'SVG frame element has no background image'
      };
    }

    return { valid: true };
  },

  /**
   * Check that content layer exists and is a direct child
   */
  contentLayerPresent(panelElement, registryEntry) {
    const contentElement = panelElement.querySelector('.swse-panel__content');
    if (!contentElement) {
      return {
        valid: false,
        error: 'Content layer (.swse-panel__content) not found'
      };
    }

    // Check it's direct child
    if (contentElement.parentElement !== panelElement) {
      return {
        valid: false,
        error: 'Content layer must be direct child of panel'
      };
    }

    return { valid: true };
  },

  /**
   * Check that all ledger rows have required data attributes
   */
  rowsHaveDataId(panelElement, registryEntry) {
    const rows = panelElement.querySelectorAll('.ledger-row');
    const invalid = [];

    rows.forEach(row => {
      if (!row.dataset.rowId) {
        invalid.push(row);
      }
    });

    if (invalid.length > 0) {
      return {
        valid: false,
        error: `${invalid.length} ledger rows missing data-row-id attribute`
      };
    }

    return { valid: true };
  }
};
```

### Step 4: Register Assertions in Panel Registry

```javascript
{
  panelName: 'myCustomPanel',
  // ... other properties ...
  postRenderAssertions: [
    'svgFramePresent',
    'contentLayerPresent'
  ]
}
```

### Step 5: Run Assertions After Render

```javascript
// In your sheet's _onRender method, after super._onRender():
async _onRender(context, options) {
  // ... build panels ...
  await super._onRender(context, options);

  // Run post-render assertions
  for (const panelName of Object.keys(panelContexts)) {
    const registryEntry = PANEL_REGISTRY.find(p => p.panelName === panelName);
    if (!registryEntry || !registryEntry.postRenderAssertions) {
      continue;
    }

    const panelElement = this.element.querySelector(registryEntry.rootSelector);
    if (!panelElement) {
      console.warn(`Panel element not found for ${panelName}`);
      continue;
    }

    for (const assertionName of registryEntry.postRenderAssertions) {
      const assertion = PostRenderAssertions[assertionName];
      if (!assertion) {
        console.warn(`Unknown assertion: ${assertionName}`);
        continue;
      }

      const result = assertion(panelElement, registryEntry);
      if (!result.valid) {
        const message = `Post-render assertion failed for ${panelName}: ${result.error}`;
        if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
          throw new Error(message);
        } else {
          console.warn(message);
        }
      }
    }
  }
}
```

---

## Recipe 6: Enable Strict Mode for Development

Use this to enable strict validation during development (throws errors instead of warnings).

### Step 1: Set Configuration

```javascript
// In your game.js or initialization:
CONFIG.SWSE = CONFIG.SWSE || {};
CONFIG.SWSE.sheets = CONFIG.SWSE.sheets || {};
CONFIG.SWSE.sheets.v2 = {
  strictMode: false  // Set to true during development
};
```

### Step 2: Add Config UI Setting (Optional)

```javascript
// Register a setting if you want togglable strict mode
game.settings.register('foundryvtt-swse', 'sheetStrictMode', {
  name: 'Sheet Strict Mode',
  hint: 'Enable strict validation for sheet development',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false,
  onChange: (value) => {
    CONFIG.SWSE.sheets.v2.strictMode = value;
  }
});
```

### Step 3: Use in Your Builders

```javascript
// Validators automatically use strict mode
_validatePanelContext(panelName, panelData) {
  const validatorName = `validate${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`;
  const validator = PanelValidators[validatorName];

  if (!validator) return;

  const result = validator(panelData);

  if (!result.valid) {
    const message = `Panel ${panelName} validation failed: ${result.errors.join('; ')}`;

    // Uses CONFIG.SWSE.sheets.v2.strictMode automatically
    if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
      throw new Error(message);  // Breaks render
    } else {
      console.warn(message);      // Logs warning only
    }
  }
}
```

---

## Recipe 7: Preserve UI State Across Rerenders

Use this to maintain active tabs, expanded sections, and focused fields.

### Step 1: Instantiate UIStateManager

```javascript
// In your sheet class constructor or first render
async _onRender(context, options) {
  if (!this.uiStateManager) {
    this.uiStateManager = new UIStateManager(this);
  }

  // BEFORE rendering
  this.uiStateManager.captureState();

  // ... build panels ...

  // Call parent render
  await super._onRender(context, options);

  // AFTER rendering
  this.uiStateManager.restoreState();
}
```

### Step 2: Define State Keys

```javascript
// UIStateManager uses these selector patterns:
this.stateKeys = {
  activeTab: '.sheet-tabs button.active',         // Remembers active tab
  expandedSections: '.section.expanded',          // Remembers open sections
  focusedField: 'input:focus, textarea:focus',    // Remembers focused input
  scrollPosition: '.sheet-content'                // Remembers scroll position
};
```

### Step 3: Verify State Persists

After data changes that trigger rerenders:
1. User clicks a tab → tab stays active
2. User scrolls panel → scroll position preserved
3. User expands section → section stays expanded
4. User edits field → field stays focused

---

## Recipes Checklist

When building a new sheet, follow this order:

1. [ ] Create visibility manager (Recipe 1, Step 1)
2. [ ] Create main sheet class (Recipe 1, Step 2)
3. [ ] Add display panels (Recipe 2)
4. [ ] Add ledger panels (Recipe 3)
5. [ ] Add SVG-backed panels if visual design needed (Recipe 4)
6. [ ] Create validators (Recipe 5)
7. [ ] Enable strict mode for development (Recipe 6)
8. [ ] Test state preservation (Recipe 7)
9. [ ] Run `verify-panel-alignment.js` to validate setup
10. [ ] Create migration documentation

---

## Common Patterns

### Pattern: Empty State Messages

```javascript
// In builder
const panel = {
  entries: items.length > 0 ? items : [],
  hasEntries: items.length > 0,
  emptyMessage: items.length === 0 ? 'No items found' : null
};

// In template
{{#if panelName.hasEntries}}
  <div class="entries-list">
    {{#each panelName.entries}}...{{/each}}
  </div>
{{else}}
  <p class="empty-state">{{panelName.emptyMessage}}</p>
{{/if}}
```

### Pattern: Conditional Elements

```handlebars
{{!-- Only show if optional key present --}}
{{#if panelName.optionalKey}}
  <div class="optional-section">{{panelName.optionalKey}}</div>
{{/if}}
```

### Pattern: Edit Mode

```javascript
// In builder
const panel = {
  // ... data ...
  canEdit: this.actor.isOwner
};

// In template
{{#if panelName.canEdit}}
  <button @click="this._deleteItem(id)">Delete</button>
{{/if}}
```

---

## References

- **Architecture:** `V2_SHEET_PLATFORM_ARCHITECTURE.md`
- **Vocabulary:** `SHEET_PLATFORM_VOCABULARY.md`
- **CSS Guide:** `V2_CSS_PRIMITIVES.md`
- **Character Sheet:** `scripts/sheets/v2/character-sheet.js`
- **Shared Layer:** `scripts/sheets/v2/shared/`
