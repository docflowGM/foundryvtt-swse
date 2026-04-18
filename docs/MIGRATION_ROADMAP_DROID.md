# Droid Sheet Migration Roadmap (Phase 7c) — SUPERSEDED

> **⚠️ SUPERSEDED — HISTORICAL REFERENCE ONLY**
>
> This roadmap proposed a separate panelized droid sheet at
> `scripts/sheets/v2/droid/DroidSheet.js`, backed by
> `DroidPanelContextBuilder`, `DroidPanelValidators`,
> `DroidPanelVisibilityManager`, and a per-panel `PANEL_REGISTRY.js`.
>
> **That parallel implementation was removed in Phase 3C.** The structural
> goals described below (panel-shaped context, row contracts, registry
> diagnostics, panel partials, listener lifecycle cleanup) were applied
> directly to the live-registered droid sheet via Phases 2 / 3A / 3B / 3C.
>
> The live droid sheet is:
>
>   - `scripts/sheets/v2/droid-sheet.js`
>   - `scripts/sheets/v2/droid-sheet/context-builder.js`
>   - `scripts/sheets/v2/droid-sheet/listeners.js`
>   - `scripts/sheets/v2/droid-sheet/panel-registry.js`
>   - `templates/actors/droid/v2/droid-sheet.hbs` + `partials/*`
>
> Do not resurrect any of the removed dormant paths. This document is kept
> for historical context only.

**Last Updated:** 2026-03-29
**Status:** SUPERSEDED BY PHASES 2 / 3A / 3B / 3C (live path)
**Phase:** Phase 7c (retired — live path is authoritative)

Detailed step-by-step roadmap for migrating the existing Droid sheet to the V2 platform architecture.

---

## Executive Summary

The Droid sheet is significantly different from Character and NPC sheets due to droid-specific game rules (protocols, customizations, programming, etc.). This roadmap describes:

- Reusing character/NPC infrastructure where compatible
- Creating droid-specific panel builders and validators
- Defining droid visibility manager with custom tab mappings
- Adding droid-specific panels (customizations, protocols, etc.)
- Validating that shared primitives work for droid data

**Timeline:** 2-3 weeks after Phase 7b complete

**Estimated Effort:** 50-70 developer hours (higher than NPC due to game logic differences)

---

## Phase 7c Schedule

```
├─ Week 1: Assessment & Analysis (12-16 hours)
│  ├─ Audit current droid sheet structure
│  ├─ Identify SWSE droid-specific rules
│  ├─ Determine reusable vs custom panels
│  └─ Plan customization strategy
│
├─ Week 2: Core & Game Logic Panels (18-24 hours)
│  ├─ Create DroidPanelVisibilityManager
│  ├─ Migrate reusable panels (portrait, inventory)
│  ├─ Create droid-specific panels
│  ├─ Implement droid game logic in builders
│  └─ Test and validate
│
├─ Week 3: Extended Panels & Integration (15-20 hours)
│  ├─ Complete remaining panels
│  ├─ Add validators and assertions
│  ├─ Full sheet testing
│  ├─ Performance profiling
│  └─ Documentation
│
└─ Week 4: Finalization (5-10 hours)
   ├─ Code review and cleanup
   ├─ Commit to main branch
   └─ Update platform documentation
```

---

## Prerequisites

Before starting Phase 7c:

- [ ] Phase 7a complete (shared layer, vocabulary, CSS primitives documented)
- [ ] Phase 7b complete (NPC sheet fully migrated and tested)
- [ ] Character and NPC sheets stable on V2 platform
- [ ] Shared components validated by two sheet types
- [ ] CSS primitives proven extensible

---

## Droid Sheet Differences from Character/NPC

Key differences to understand before migration:

### Game Rules Differences

**Character Focus:** Talents, feats, Force powers, attack bonuses, defenses
**NPC Focus:** Motivations, tactics, typically fewer custom items
**Droid Focus:**
- Protocols (instead of talents)
- Customizations (instead of feats)
- Programming (languages for droids)
- Droid-specific skills and abilities
- Modification points, droid restriction levels

### Data Structure Differences

| Aspect | Character | NPC | Droid |
|--------|-----------|-----|-------|
| Talent Tiers | Yes (I-V) | Simplified | No (Protocols different) |
| Force Powers | Yes/Force Sensitive | Yes/Force Sensitive | No |
| Combat Style | Full combat abilities | Simplified | No, but protocols affect actions |
| Inventory | Standard items | Standard items | Standard items + customizations |
| Special | Dark side points, feats | Motivations | Protocols, restrictions, mods |

---

## Step 1: Audit Current Droid Sheet (Week 1.1-1.2)

### Task 1.1: Find Droid Sheet Files

```bash
find scripts/sheets/v2 -name "*droid*" -type f
find templates/v2 -name "*droid*" -type f
find styles/sheets -name "*droid*" -type f
```

### Task 1.2: Document Current Structure

Create `DROID_SHEET_AUDIT.md`:

```markdown
# Droid Sheet Current Structure

## Current Sections:
- [ ] Header (name, droid type, model)
- [ ] Portrait
- [ ] Droid Summary (special droid fields)
- [ ] Health/Defense (if applicable)
- [ ] Abilities (droid-specific)
- [ ] Skills
- [ ] Protocols (droid talents replacement)
- [ ] Customizations (droid feats equivalent)
- [ ] Inventory
- [ ] Notes

## Game-Specific Rules:
- Protocol application in skills
- Customization cost/restrictions
- Droid type bonuses
- Programming restrictions

## Reusability Assessment:
- Inventory: REUSABLE (same as character)
- Portrait: REUSABLE (same as character)
- Health: MAYBE (if droid health differs)
- Defense: MAYBE (if droid defense differs)
- Skills: ADAPT (protocols modify skills)
- Talent/Feat panels: NOT REUSABLE (protocols/customizations different)
```

### Task 1.3: Identify SWSE Droid Rules

Document in `DROID_GAME_RULES.md`:

```javascript
{
  "protocols": {
    "description": "Droid talents equivalent",
    "costPerLevel": "1 protocol point",
    "maxLevel": "varies by protocol",
    "applicationRules": [
      "Apply to specific skills",
      "Modify defense or initiative",
      "Enable special abilities"
    ]
  },

  "customizations": {
    "description": "Droid feats equivalent",
    "costPerPoint": "1 modification point",
    "maxPoints": "Varies (Int modifier + level)",
    "restrictions": [
      "Some require specific droid types",
      "Some have prerequisite customizations"
    ]
  },

  "droidTypes": {
    "astromech": { skillBonus: 2, skillType: "astrogation" },
    "protocol": { skillBonus: 2, skillType: "knowledge" },
    "security": { skillBonus: 2, skillType: "security" },
    // ... more types
  },

  "restrictionLevels": {
    "description": "Affects what customizations can be added",
    "levels": [0, 1, 2, 3, 4, 5],
    "maxCustomizationsByLevel": [5, 4, 3, 2, 1, 0]
  }
}
```

### Expected Output:
- `DROID_SHEET_AUDIT.md` (complete)
- `DROID_GAME_RULES.md` (droid-specific rules documented)
- List of reusable vs custom panels

---

## Step 2: Assess Reusability (Week 1.3)

### Task 2.1: Panel-by-Panel Assessment

| Panel | Reusable? | Notes |
|-------|-----------|-------|
| portraitPanel | YES | Identical to character |
| healthPanel | YES | Health calculation same |
| defensePanel | MAYBE | May need droid defense calc |
| inventoryPanel | YES | Items same for droids |
| skillsPanel | ADAPT | Protocols modify skill values |
| talentPanel | NO | Protocols different system |
| featPanel | NO | Customizations different system |
| abilityPanel | ADAPT | Droid abilities different |
| protocolsPanel | NEW | Droid-specific |
| customizationsPanel | NEW | Droid-specific |
| programmingPanel | NEW | Languages for droids |

### Task 2.2: Identify Reusable Validators

```javascript
// Reusable validators (use from character):
validatePortraitPanel
validateHealthPanel
validateInventoryPanel

// Customizable validators (adapt for droid):
validateSkillsPanel        // Account for protocol bonuses
validateAbilitiesPanel     // Droid ability scores

// New validators (create for droid):
validateProtocolsPanel
validateCustomizationsPanel
validateProgrammingPanel
```

### Expected Output:
- Detailed reusability assessment
- Clear strategy for each panel
- Identified game logic customizations

---

## Step 3: Create Droid Panel Infrastructure (Week 2.1)

### Task 3.1: Create DroidPanelVisibilityManager

**File:** `scripts/sheets/v2/droid/DroidPanelVisibilityManager.js`

```javascript
import { PanelVisibilityManager as BasePanelVisibilityManager } from '../shared/PanelVisibilityManager.js';

export class PanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // DROID-SPECIFIC TAB LAYOUT
    this.tabPanels = {
      summary: ['portraitPanel', 'droidSummaryPanel'],
      attributes: ['abilitiesPanel', 'defensesPanel'],
      skills: ['skillsPanel'],
      systems: ['protocolsPanel', 'customizationsPanel', 'programmingPanel'],
      inventory: ['inventoryPanel'],
      combat: ['combatPanel'],  // If droid combat differs
      notes: ['droidNotesPanel']
    };

    this.conditionalPanels = {
      // Few conditional panels for droids
      combatPanel: {
        condition: (actor) => actor.system?.droidType !== 'utility',
        reason: 'not a combat droid'
      }
    };

    this._initializePanelState();
    this.currentTab = 'summary';
  }

  /**
   * DROID-SPECIFIC INVALIDATION MAP
   */
  invalidateByType(type) {
    const invalidationMap = {
      item: ['inventoryPanel'],
      protocol: ['protocolsPanel', 'skillsPanel'],  // Protocols affect skills
      customization: ['customizationsPanel'],
      programming: ['programmingPanel'],
      droidType: ['droidSummaryPanel', 'defensePanel'],  // Type affects defense
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }
}
```

### Task 3.2: Create DroidPanelContextBuilder

**File:** `scripts/sheets/v2/droid/DroidPanelContextBuilder.js`

```javascript
export class DroidPanelContextBuilder {
  constructor(actor) {
    this.actor = actor;
    this.system = actor.system;
    this.derived = actor.derived || {};
  }

  /**
   * REUSE: Portrait panel (identical to character)
   */
  buildPortraitPanel() {
    const panel = {
      imagePath: this.actor.img,
      canEdit: this.actor.isOwner
    };
    this._validatePanelContext('portraitPanel', panel);
    return panel;
  }

  /**
   * NEW: Droid Summary Panel
   * Shows droid type, restrictions, modification points
   */
  buildDroidSummaryPanel() {
    const panel = {
      droidType: this.system?.droidType || 'Protocol',
      droidModel: this.system?.droidModel || '',
      restrictionLevel: this.system?.restrictionLevel || 0,
      maxModPoints: this._calculateMaxModPoints(),
      usedModPoints: this._calculateUsedModPoints(),
      availableModPoints: this._calculateAvailableModPoints(),
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('droidSummaryPanel', panel);
    return panel;
  }

  /**
   * ADAPT: Skills Panel for Droid
   * Must account for protocol bonuses
   */
  buildSkillsPanel() {
    // Get base skills
    const skills = this._getSkills();

    // Apply protocol bonuses
    const protocols = this.actor.items.filter(i => i.type === 'protocol');
    for (const protocol of protocols) {
      const affectedSkill = protocol.system?.affectedSkill;
      if (affectedSkill && skills[affectedSkill]) {
        skills[affectedSkill].bonus += (protocol.system?.bonus || 0);
      }
    }

    const panel = {
      skills,
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('skillsPanel', panel);
    return panel;
  }

  /**
   * NEW: Protocols Panel
   * Shows droid talents equivalent
   */
  buildProtocolsPanel() {
    const protocolItems = this.actor.items.filter(item => item.type === 'protocol');

    const entries = protocolItems
      .map(item => ({
        id: item.id,
        name: item.name,
        affectedSkill: item.system?.affectedSkill,
        bonus: item.system?.bonus,
        description: item.system?.description,
        canEdit: this.actor.isOwner
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No protocols installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('protocolsPanel', panel);
    return panel;
  }

  /**
   * NEW: Customizations Panel
   * Shows droid feats equivalent
   */
  buildCustomizationsPanel() {
    const customItems = this.actor.items.filter(item => item.type === 'customization');

    const entries = customItems
      .map(item => ({
        id: item.id,
        name: item.name,
        costPoints: item.system?.costPoints || 1,
        prerequisite: item.system?.prerequisite,
        description: item.system?.description,
        canEdit: this.actor.isOwner
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost: entries.reduce((sum, e) => sum + e.costPoints, 0),
      emptyMessage: 'No customizations installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('customizationsPanel', panel);
    return panel;
  }

  /**
   * NEW: Programming Panel
   * Shows droid languages (programming equivalents)
   */
  buildProgrammingPanel() {
    const progItems = this.actor.items.filter(item => item.type === 'programming');

    const entries = progItems
      .map(item => ({
        id: item.id,
        name: item.name,
        proficiency: item.system?.proficiency || 'speaks',
        canEdit: this.actor.isOwner
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No programming languages installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('programmingPanel', panel);
    return panel;
  }

  // ===== HELPER METHODS (Droid Game Logic) =====

  /**
   * DROID GAME LOGIC: Calculate max modification points
   * Formula: (Int modifier * 3) + (Level / 2)
   */
  _calculateMaxModPoints() {
    const intMod = this.system?.abilities?.intelligence?.modifier || 0;
    const level = this.system?.level || 1;
    return Math.floor((intMod * 3) + (level / 2));
  }

  /**
   * DROID GAME LOGIC: Calculate used modification points
   */
  _calculateUsedModPoints() {
    const customizations = this.actor.items.filter(i => i.type === 'customization');
    return customizations.reduce((sum, item) => sum + (item.system?.costPoints || 1), 0);
  }

  /**
   * DROID GAME LOGIC: Calculate available modification points
   */
  _calculateAvailableModPoints() {
    return this._calculateMaxModPoints() - this._calculateUsedModPoints();
  }

  /**
   * DROID GAME LOGIC: Get all skills with droid base abilities
   */
  _getSkills() {
    // Return skill list with droid-specific bonuses
    return this.system?.skills || {};
  }

  _validatePanelContext(panelName, panelData) {
    // Implementation of validation (reuse from character or create new)
  }
}
```

### Task 3.3: Create DroidPanelValidators

**File:** `scripts/sheets/v2/droid/DroidPanelValidators.js`

```javascript
export const DroidPanelValidators = {
  // Reuse from character
  validatePortraitPanel: CharacterValidators.validatePortraitPanel,
  validateInventoryPanel: CharacterValidators.validateInventoryPanel,

  // New validators
  validateDroidSummaryPanel(panelData) {
    const errors = [];

    if (typeof panelData.droidType !== 'string') {
      errors.push('droidType must be string');
    }

    if (typeof panelData.restrictionLevel !== 'number') {
      errors.push('restrictionLevel must be number');
    }

    if (typeof panelData.maxModPoints !== 'number') {
      errors.push('maxModPoints must be number');
    }

    if (typeof panelData.usedModPoints !== 'number') {
      errors.push('usedModPoints must be number');
    }

    return { valid: errors.length === 0, errors };
  },

  validateProtocolsPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }

    if (panelData.entries) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') {
          errors.push(`entry[${idx}].id must be string`);
        }
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  validateCustomizationsPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }

    if (typeof panelData.totalCost !== 'number') {
      errors.push('totalCost must be number');
    }

    return { valid: errors.length === 0, errors };
  },

  validateProgrammingPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }

    return { valid: errors.length === 0, errors };
  }
};
```

### Task 3.4: Create Droid PANEL_REGISTRY

**File:** `scripts/sheets/v2/droid/PANEL_REGISTRY.js`

```javascript
export const PANEL_REGISTRY = [
  {
    panelName: 'portraitPanel',
    displayName: 'Portrait',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/character/panels/portrait-panel.hbs',
    builderMethod: 'buildPortraitPanel',
    validatorMethod: 'validatePortraitPanel',
    requiredKeys: ['imagePath'],
    optionalKeys: [],
    rootSelector: '.portrait-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'droidSummaryPanel',
    displayName: 'Droid Summary',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/droid/panels/droid-summary-panel.hbs',
    builderMethod: 'buildDroidSummaryPanel',
    validatorMethod: 'validateDroidSummaryPanel',
    requiredKeys: ['droidType', 'restrictionLevel', 'maxModPoints', 'usedModPoints', 'availableModPoints'],
    optionalKeys: ['droidModel'],
    rootSelector: '.droid-summary-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'protocolsPanel',
    displayName: 'Protocols',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/droid/panels/protocols-panel.hbs',
    builderMethod: 'buildProtocolsPanel',
    validatorMethod: 'validateProtocolsPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount', 'emptyMessage'],
    optionalKeys: [],
    rootSelector: '.protocols-panel',
    svgBacked: false,
    rowContract: {
      id: 'string',
      name: 'string',
      affectedSkill: 'string',
      bonus: 'number'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'customizationsPanel',
    displayName: 'Customizations',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/droid/panels/customizations-panel.hbs',
    builderMethod: 'buildCustomizationsPanel',
    validatorMethod: 'validateCustomizationsPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount', 'totalCost'],
    optionalKeys: [],
    rootSelector: '.customizations-panel',
    svgBacked: false,
    rowContract: {
      id: 'string',
      name: 'string',
      costPoints: 'number'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'programmingPanel',
    displayName: 'Programming',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/droid/panels/programming-panel.hbs',
    builderMethod: 'buildProgrammingPanel',
    validatorMethod: 'validateProgrammingPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: [],
    rootSelector: '.programming-panel',
    svgBacked: false,
    rowContract: {
      id: 'string',
      name: 'string',
      proficiency: 'string'
    },
    postRenderAssertions: ['rowsHaveDataId']
  }

  // Add more reused/adapted panels (skills, abilities, inventory, etc.)
];
```

### Expected Output:
- `DroidPanelVisibilityManager.js` (complete)
- `DroidPanelContextBuilder.js` (with 5+ builders)
- `DroidPanelValidators.js` (complete)
- `PANEL_REGISTRY.js` (complete with core droid panels)

---

## Step 4: Create Droid Templates (Week 2.2-2.3)

### Task 4.1: Create Droid Summary Template

**File:** `templates/v2/droid/panels/droid-summary-panel.hbs`

```handlebars
<section class="swse-panel swse-panel--droid-summary droid-summary-panel">
  <div class="swse-panel__content">
    <div class="summary-grid">
      <div class="summary-field">
        <label>Type</label>
        <span>{{droidSummaryPanel.droidType}}</span>
      </div>
      <div class="summary-field">
        <label>Model</label>
        <span>{{droidSummaryPanel.droidModel}}</span>
      </div>
      <div class="summary-field">
        <label>Restriction Level</label>
        <span>{{droidSummaryPanel.restrictionLevel}}</span>
      </div>
    </div>

    <div class="mod-points">
      <div class="mod-point-display">
        <label>Modification Points</label>
        <div class="mod-point-bar">
          <span class="available">{{droidSummaryPanel.availableModPoints}}</span>
          <span class="separator">/</span>
          <span class="total">{{droidSummaryPanel.maxModPoints}}</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Task 4.2: Create Protocols Template

**File:** `templates/v2/droid/panels/protocols-panel.hbs`

```handlebars
<section class="swse-panel swse-panel--protocols protocols-panel">
  <div class="swse-panel__content">
    {{#if protocolsPanel.hasEntries}}
      <div class="ledger-entries">
        {{#each protocolsPanel.entries as |entry|}}
          <div class="ledger-row" data-row-id="{{entry.id}}">
            <div class="row-name">{{entry.name}}</div>
            <div class="row-meta">
              {{#if entry.affectedSkill}}
                <span class="skill">{{entry.affectedSkill}}</span>
              {{/if}}
              {{#if entry.bonus}}
                <span class="bonus">+{{entry.bonus}}</span>
              {{/if}}
            </div>
          </div>
        {{/each}}
      </div>
    {{else}}
      <p class="empty-state">{{protocolsPanel.emptyMessage}}</p>
    {{/if}}
  </div>
</section>
```

### Task 4.3: Create Customizations and Programming Templates

Similar to protocols panel but with droid-specific fields.

### Expected Output:
- All droid templates created (6-8 files)
- Consistent styling with shared primitives
- Ready for data rendering

---

## Step 5: Full Droid Sheet Class & Integration (Week 3.1)

### Task 5.1: Create/Update Droid Sheet Class

**File:** `scripts/sheets/v2/droid-sheet.js`

Use Recipe 1, Step 2 as template with droid-specific details.

### Task 5.2: Create Droid Sheet Template

**File:** `templates/v2/droid/droid-sheet.hbs`

Standard sheet structure with droid-specific tabs.

### Task 5.3: Create Droid-Specific CSS

**File:** `styles/sheets/v2-droid-specific.css`

```css
/* Droid Summary Panel */
.swse-panel--droid-summary .summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.swse-panel--droid-summary .mod-points {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.swse-panel--droid-summary .mod-point-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  font-weight: 700;
}

/* Protocols & Customizations Ledger */
.swse-panel--protocols,
.swse-panel--customizations,
.swse-panel--programming {
  /* Use shared ledger styles + droid customizations */
}
```

### Expected Output:
- Full droid sheet class
- All templates wired
- Basic styling working

---

## Step 6: Testing & Validation (Week 3.2-3.3)

### Task 6.1: Run Verification

```bash
node scripts/verify-panel-alignment.js
# Should show 0 issues for droid panels
```

### Task 6.2: Test Droid Game Logic

```javascript
// Test modification point calculation
// Test protocol bonuses applied to skills
// Test customization costs tracked
// Test restriction level enforcement
```

### Task 6.3: Performance Profiling

```javascript
// Compare render times to character sheet
// Enable strict mode, check diagnostics
// Verify lazy loading working for droid panels
```

### Task 6.4: Validate Shared Primitives

- [ ] CSS layout primitives work for droid grid
- [ ] Component primitives (buttons, tags) work
- [ ] Ledger patterns work for protocols/customizations
- [ ] Drag & drop works for droid items
- [ ] State preservation works for droid tabs

### Expected Output:
- All tests passing
- Performance metrics comparable to character sheet
- Shared primitives validated for 3 sheet types

---

## Step 7: Documentation & Completion (Week 3.4 - Week 4)

### Task 7.1: Create Migration Report

**File:** `DROID_SHEET_MIGRATION_REPORT.md`

Document:
- Game logic implementation (modification points, protocols, customizations)
- Reused components (portrait, inventory, health)
- Custom panels (droid-specific)
- Lessons learned for future sheets

### Task 7.2: Update Recipes

Add droid examples to `V2_SHEET_RECIPES.md`:

```markdown
## Droid Sheet Example

When adding protocols to droid sheet...
[Copy droid example code]
```

### Task 7.3: Commit to Main Branch

```bash
git add scripts/sheets/v2/droid/
git add templates/v2/droid/
git add styles/sheets/v2-droid-specific.css
git add DROID_SHEET_MIGRATION_REPORT.md
git commit -m "Phase 7c: Complete Droid sheet V2 migration

- Create DroidPanelVisibilityManager with droid-specific tabs
- Create DroidPanelContextBuilder with game logic
  * Modification point calculation
  * Protocol bonus application
  * Customization cost tracking
- Create DroidPanelValidators with contract enforcement
- Create PANEL_REGISTRY with droid panels
- Migrate reusable panels (portrait, inventory)
- Create droid-specific panels:
  * droidSummaryPanel - type, restrictions, mod points
  * protocolsPanel - droid talents equivalent
  * customizationsPanel - droid feats equivalent
  * programmingPanel - droid languages
- Validate shared primitives work for droid (3 sheet types validated)
- All panels pass verify-panel-alignment.js (0 issues)
- Performance: lazy loading reduces render time 60%

https://claude.ai/code/session_<session-id>"
```

---

## Success Criteria

Phase 7c complete when:

- [x] DroidPanelVisibilityManager created and working
- [x] DroidPanelContextBuilder with all builders complete
- [x] All droid game logic implemented (mod points, protocols, customizations)
- [x] DroidPanelValidators complete
- [x] PANEL_REGISTRY complete (all droid panels)
- [x] All droid templates created
- [x] verify-panel-alignment.js returns 0 issues for droid
- [x] UI state preservation working
- [x] Performance similar to character/NPC sheets
- [x] Shared primitives validated for 3 sheet types
- [x] Migration report documented
- [x] Code committed to main branch

---

## Next Steps (Phase 7d - Optional)

After Phase 7c complete:

1. Apply approach to Vehicle/Starship sheet (if applicable)
2. Identify additional reusable patterns
3. Enhance CSS primitives based on 3 sheet types
4. Create final platform consolidation report

---

## Key Differences from NPC Migration

| Aspect | NPC Sheet | Droid Sheet |
|--------|-----------|-------------|
| Game Logic | Motivations, tactics | Modification points, protocols, customizations |
| Custom Panels | 2-3 (motivations, tactics) | 3-4 (protocols, customizations, programming) |
| Skill Modification | None | Protocols modify skill values |
| Ledger Rows | Simple | More complex (cost tracking, prerequisites) |
| Resource Tracking | None | Modification points |
| Complexity | Low | Medium-High |
| Estimated Effort | 40-60 hours | 50-70 hours |

---

## References

- **NPC Roadmap:** `MIGRATION_ROADMAP_NPC.md` (reference for approach)
- **Character Sheet:** `scripts/sheets/v2/character-sheet.js`
- **Recipes:** `V2_SHEET_RECIPES.md`
- **Architecture:** `V2_SHEET_PLATFORM_ARCHITECTURE.md`
- **Vocabulary:** `SHEET_PLATFORM_VOCABULARY.md`
- **CSS Guide:** `V2_CSS_PRIMITIVES.md`
- **Shared Layer:** `scripts/sheets/v2/shared/`
- **Verification Tool:** `scripts/verify-panel-alignment.js`
