# NPC Sheet Migration Roadmap (Phase 7b)

**Last Updated:** 2026-03-29
**Status:** IMPLEMENTATION GUIDE FOR NPC SHEET V2 MIGRATION
**Phase:** Phase 7b (Scheduled after Phase 7a complete)

Detailed step-by-step roadmap for migrating the existing NPC sheet to the V2 platform architecture.

---

## Executive Summary

The NPC sheet currently has a non-panelized architecture with direct data access from templates. This roadmap describes how to incrementally migrate it to the V2 panel architecture while:

- Reusing existing data structures where possible
- Adopting the shared infrastructure (UIStateManager, PanelDiagnostics)
- Defining NPC-specific visibility manager and panel mappings
- Creating NPC panel builders, validators, and templates
- Validating that shared primitives work for NPC data

**Timeline:** 1-2 weeks after Phase 7a complete

**Estimated Effort:** 40-60 developer hours

---

## Phase 7b Schedule

```
├─ Weeks 1: Assessment & Shared Base (10-15 hours)
│  ├─ Audit current NPC sheet structure
│  ├─ Identify reusable character panels
│  ├─ Plan NPC-specific customizations
│  └─ Set up base NPC panel infrastructure
│
├─ Week 2: Core Panels (15-20 hours)
│  ├─ Create NPCPanelVisibilityManager
│  ├─ Migrate portrait, biography, health panels
│  ├─ Migrate defense, inventory panels
│  └─ Test and validate
│
├─ Week 3: Extended Panels (10-15 hours)
│  ├─ Migrate talent, feat, language panels
│  ├─ Add NPC-specific panels (motivations, tactics, etc.)
│  └─ Implement validators and assertions
│
└─ Week 4: Integration & Optimization (5-10 hours)
   ├─ Full sheet testing
   ├─ Performance profiling
   ├─ Documentation
   └─ Commit to main branch
```

---

## Prerequisites

Before starting Phase 7b:

- [ ] Phase 7a complete (shared layer, vocabulary, CSS primitives documented)
- [ ] `verify-panel-alignment.js` passing for character sheet (0 issues)
- [ ] All shared components working (UIStateManager, PanelDiagnostics, base VisibilityManager)
- [ ] Character sheet templates reviewed for reusable patterns
- [ ] CSS primitives extracted to `v2-shared-primitives.css`

---

## Step 1: Audit Current NPC Sheet (Week 1.1)

### Task 1.1.1: Map Current Structure

```bash
# Find current NPC sheet files
find scripts/sheets/v2 -name "*npc*" -type f | head -20
```

**Expected Files:**
- `scripts/sheets/v2/npc-sheet.js` (main class)
- `scripts/sheets/v2/npc-full-sheet.js` (extended version)
- `scripts/sheets/v2/npc-combat-sheet.js` (combat view)
- Templates in `templates/v2/npc/`

### Task 1.1.2: Document Current Panels

Create `NPC_SHEET_AUDIT.md`:

```markdown
# NPC Sheet Current Structure

## Sections Found:
- [ ] Header (name, player, info)
- [ ] Portrait
- [ ] Biography
- [ ] Health/Defense
- [ ] Attributes/Abilities
- [ ] Skills
- [ ] Inventory
- [ ] Talents
- [ ] Feats
- [ ] Languages
- [ ] Combat-specific sections
- [ ] Notes

## Data Access Pattern:
Currently direct: `actor.system.propertyName` in templates
Goal: Through normalized panel contexts
```

### Task 1.1.3: Identify Reusable Panels

Mark each current NPC section:

```javascript
// In NPC_SHEET_AUDIT.md

// REUSE AS-IS (from character, no customization needed):
- [ ] Portrait Panel (portraitPanel)
- [ ] Health Panel (healthPanel)
- [ ] Defense Panel (defensePanel)
- [ ] Inventory Panel (inventoryPanel)
- [ ] Languages Panel (languagesPanel)

// REUSE WITH CUSTOMIZATION (adapt character version):
- [ ] Biography Panel (biographyPanel - NPC-specific fields)
- [ ] Talent Panel (talentPanel - NPC talents differ)
- [ ] Feat Panel (featPanel - NPC feat handling)

// NPC-SPECIFIC (create new):
- [ ] Motivations Panel (new)
- [ ] Tactics Panel (new)
- [ ] Relationships Panel (new)
- [ ] NPC Combat Notes Panel (customize combatNotesPanel)
```

### Expected Output:
- `NPC_SHEET_AUDIT.md` document
- Clear list of reusable vs custom panels
- Detailed property mapping (current → panel context)

---

## Step 2: Set Up NPC Panel Infrastructure (Week 1.2-1.3)

### Task 2.1: Create NPCPanelVisibilityManager

**File:** `scripts/sheets/v2/npc/NPCPanelVisibilityManager.js`

Use Recipe 1, Step 1 as template. Customize:

```javascript
export class PanelVisibilityManager extends BasePanelVisibilityManager {
  constructor(sheetInstance) {
    super(sheetInstance);

    // NPC-SPECIFIC TAB LAYOUT (different from character)
    this.tabPanels = {
      overview: ['portraitPanel', 'biographyPanel', 'healthPanel', 'defensePanel'],
      abilities: ['abilitiesPanel'],  // NEW: combined ability scores
      skills: ['skillsPanel'],        // NEW: combined skills view
      inventory: ['inventoryPanel'],
      abilities: ['talentPanel', 'featPanel'],
      combat: ['combatPanel'],        // NPC-specific combat
      motivations: ['motivationsPanel'],  // NPC-specific
      tactics: ['tacticsPanel'],      // NPC-specific
      notes: ['npcCombatNotesPanel']
    };

    this.conditionalPanels = {
      // Similar to character but adapted for NPC
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'not force sensitive'
      }
    };

    this._initializePanelState();
    this.currentTab = 'overview';
  }

  /**
   * NPC-specific invalidation mapping
   */
  invalidateByType(type) {
    const invalidationMap = {
      item: ['inventoryPanel'],
      talent: ['talentPanel'],
      feat: ['featPanel'],
      skill: ['skillsPanel'],
      // Add NPC-specific types
    };
    // ... implementation ...
  }
}
```

### Task 2.2: Create NPCPanelContextBuilder

**File:** `scripts/sheets/v2/npc/NPCPanelContextBuilder.js`

Base structure (adapt from character):

```javascript
export class PanelContextBuilder {
  constructor(actor) {
    this.actor = actor;
    this.system = actor.system;
    this.derived = actor.derived || {};
  }

  /**
   * Reuse character's portrait builder as-is
   */
  buildPortraitPanel() {
    // Directly call character builder or duplicate
    // Only override if NPC has different structure
  }

  /**
   * Customize for NPC biography
   */
  buildBiographyPanel() {
    const panel = {
      name: this.actor.name,
      playerName: this.system?.playerName || '',
      age: this.system?.age || '',
      gender: this.system?.gender || '',
      species: this.system?.species || '',
      // NPC-specific fields
      motivations: this.system?.motivations || '',
      personalityTraits: this.system?.personalityTraits || '',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('biographyPanel', panel);
    return panel;
  }

  /**
   * NEW: NPC Motivations Panel
   */
  buildMotivationsPanel() {
    const panel = {
      motivations: this.system?.motivations?.split('\n') || [],
      goals: this.system?.goals?.split('\n') || [],
      secrets: this.system?.secrets?.split('\n') || [],
      fears: this.system?.fears?.split('\n') || [],
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('motivationsPanel', panel);
    return panel;
  }

  // ... more builders ...
}
```

### Task 2.3: Create NPCPanelValidators

**File:** `scripts/sheets/v2/npc/NPCPanelValidators.js`

```javascript
export const NPCPanelValidators = {
  // Reuse character validators for common panels
  validatePortraitPanel: CharacterValidators.validatePortraitPanel,
  validateHealthPanel: CharacterValidators.validateHealthPanel,
  validateDefensePanel: CharacterValidators.validateDefensePanel,

  // Customize as needed
  validateBiographyPanel(panelData) {
    const errors = [];
    if (typeof panelData.name !== 'string') {
      errors.push('name must be string');
    }
    // ... NPC-specific validation ...
    return { valid: errors.length === 0, errors };
  },

  // New validators
  validateMotivationsPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.motivations)) {
      errors.push('motivations must be array');
    }
    // ... more checks ...
    return { valid: errors.length === 0, errors };
  }
};
```

### Task 2.4: Create NPC PANEL_REGISTRY

**File:** `scripts/sheets/v2/npc/PANEL_REGISTRY.js`

```javascript
export const PANEL_REGISTRY = [
  // Reuse from character where possible
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

  // Customize for NPC
  {
    panelName: 'biographyPanel',
    displayName: 'Biography',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/biography-panel.hbs',  // NPC version
    builderMethod: 'buildBiographyPanel',
    validatorMethod: 'validateBiographyPanel',
    requiredKeys: ['name', 'age', 'gender', 'species'],
    optionalKeys: ['motivations', 'personalityTraits'],
    rootSelector: '.biography-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  // New for NPC
  {
    panelName: 'motivationsPanel',
    displayName: 'Motivations & Goals',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/motivations-panel.hbs',
    builderMethod: 'buildMotivationsPanel',
    validatorMethod: 'validateMotivationsPanel',
    requiredKeys: ['motivations', 'goals'],
    optionalKeys: ['secrets', 'fears'],
    rootSelector: '.motivations-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  // ... more panels ...
];
```

### Expected Output:
- `NPCPanelVisibilityManager.js` (complete)
- `NPCPanelContextBuilder.js` (skeleton with first 3-4 builders)
- `NPCPanelValidators.js` (skeleton)
- `PANEL_REGISTRY.js` (skeleton with 5-6 panels)

---

## Step 3: Migrate Core Panels (Week 2)

### Task 3.1: Reuse Portrait, Health, Defense Panels

For panels that are identical between character and NPC:

1. Don't duplicate builder/validator code
2. Reference character version in NPC registry:

```javascript
{
  panelName: 'healthPanel',
  // ... metadata ...
  builderMethod: 'buildHealthPanel',  // Reuse builder
  validatorMethod: 'validateHealthPanel'  // Reuse validator
}

// In NPCPanelContextBuilder:
export class NPCPanelContextBuilder extends CharacterPanelContextBuilder {
  // Inherit buildHealthPanel() from character
}
```

### Task 3.2: Create NPC-Specific Biography Panel

**File:** `templates/v2/npc/panels/biography-panel.hbs`

```handlebars
<section class="swse-panel swse-panel--biography biography-panel">
  <div class="swse-panel__content">
    <div class="biography-grid">
      <div class="field">
        <label>Name</label>
        <span>{{biographyPanel.name}}</span>
      </div>
      <div class="field">
        <label>Player</label>
        <span>{{biographyPanel.playerName}}</span>
      </div>
      <div class="field">
        <label>Age</label>
        <span>{{biographyPanel.age}}</span>
      </div>
      <div class="field">
        <label>Species</label>
        <span>{{biographyPanel.species}}</span>
      </div>
    </div>

    {{#if biographyPanel.motivations}}
      <div class="motivations-section">
        <h4>Motivations</h4>
        <p>{{biographyPanel.motivations}}</p>
      </div>
    {{/if}}

    {{#if biographyPanel.personalityTraits}}
      <div class="personality-section">
        <h4>Personality</h4>
        <p>{{biographyPanel.personalityTraits}}</p>
      </div>
    {{/if}}
  </div>
</section>
```

### Task 3.3: Create Motivations Panel

**File:** `templates/v2/npc/panels/motivations-panel.hbs`

```handlebars
<section class="swse-panel swse-panel--motivations motivations-panel">
  <div class="swse-panel__content">
    <div class="motivations-list">
      <h4>Motivations</h4>
      {{#each motivationsPanel.motivations as |motivation|}}
        <p class="motivation-item">{{motivation}}</p>
      {{else}}
        <p class="empty-state">No motivations defined</p>
      {{/each}}
    </div>

    <div class="goals-list">
      <h4>Goals</h4>
      {{#each motivationsPanel.goals as |goal|}}
        <p class="goal-item">{{goal}}</p>
      {{else}}
        <p class="empty-state">No goals defined</p>
      {{/each}}
    </div>

    {{#if motivationsPanel.secrets}}
      <div class="secrets-list">
        <h4>Secrets</h4>
        {{#each motivationsPanel.secrets as |secret|}}
          <p class="secret-item">{{secret}}</p>
        {{/each}}
      </div>
    {{/if}}
  </div>
</section>
```

### Task 3.4: Migrate Inventory, Talent, Feat Panels

Use same process as character but with NPC-specific customizations:

1. Reuse character row transformers if compatible
2. Create NPC-specific transformers if needed
3. Adapt templates for NPC UI style

### Expected Output:
- 5-8 panels fully migrated
- Templates created for NPC versions
- Builders and validators working
- verify-panel-alignment.js passing for NPC panels

---

## Step 4: Add NPC-Specific Panels (Week 3)

### Task 4.1: Create Tactics Panel

```javascript
// In NPCPanelContextBuilder
buildTacticsPanel() {
  const panel = {
    tactics: this.system?.tactics?.split('\n') || [],
    strengths: this.system?.strengths?.split('\n') || [],
    weaknesses: this.system?.weaknesses?.split('\n') || [],
    canEdit: this.actor.isOwner
  };

  this._validatePanelContext('tacticsPanel', panel);
  return panel;
}
```

### Task 4.2: Create Relationships Panel (if needed)

Link NPCs to other NPCs or PCs.

### Task 4.3: Complete Remaining Panels

- Skills panel
- Abilities panel
- Combat panel
- Notes panel

### Expected Output:
- All NPC panels migrated
- All validators created
- All templates created
- All assertions defined

---

## Step 5: Full Integration & Testing (Week 4)

### Task 5.1: Update Main NPC Sheet Class

**File:** `scripts/sheets/v2/npc-sheet.js`

Use Recipe 1, Step 2 as template:

```javascript
import { PanelVisibilityManager } from './npc/NPCPanelVisibilityManager.js';
import { UIStateManager } from './shared/UIStateManager.js';
import { PanelDiagnostics } from './shared/PanelDiagnostics.js';
import { NPCPanelContextBuilder } from './npc/NPCPanelContextBuilder.js';
import { PANEL_REGISTRY } from './npc/PANEL_REGISTRY.js';

export class NPCSheet extends HandlebarsApplicationMixin(ActorSheet) {
  // ... full implementation (see Recipe 1, Step 2) ...
}

Actors.registerSheet('foundryvtt-swse', NPCSheet, { types: ['npc'] });
```

### Task 5.2: Create NPC Sheet Template

**File:** `templates/v2/npc/npc-sheet.hbs`

```handlebars
<form class="npc-sheet">
  <div class="sheet-header">
    {{!-- Header content --}}
  </div>

  <div class="sheet-tabs">
    {{!-- Tab navigation --}}
  </div>

  <div class="sheet-body">
    {{!-- Panel rendering --}}
  </div>
</form>
```

### Task 5.3: Run Full Testing Suite

```bash
# Verify panel alignment
node scripts/verify-panel-alignment.js

# Create NPC-specific test
npm test -- tests/sheets/v2/npc/

# Check performance
CONFIG.SWSE.sheets.v2.strictMode = true;  // Enable strict mode
// Create NPC, observe performance metrics
```

### Task 5.4: Validate CSS Primitives Work

Test that `v2-shared-primitives.css` covers all NPC styling needs:

- [ ] Layout foundation works for NPC grid
- [ ] Panel structure (frame/content/overlay) works
- [ ] Component primitives (buttons, tags, etc.) work
- [ ] Ledger row patterns work
- [ ] Drag & drop feedback works

If missing, add to NPC-specific CSS file.

### Task 5.5: Performance Profiling

Compare to character sheet:

```javascript
// In console during NPC sheet render:
CONFIG.SWSE.sheets.v2.strictMode = true;  // Verbose diagnostics
// Create/update NPC, check times
```

Expected similar performance to character sheet.

### Expected Output:
- NPC sheet fully functional
- All tests passing
- Performance metrics documented
- Zero issues from verify-panel-alignment.js

---

## Step 6: Documentation & Completion

### Task 6.1: Create NPC Migration Report

**File:** `NPC_SHEET_MIGRATION_REPORT.md`

Document:
- Panels migrated
- Reused components
- NPC-specific customizations
- Performance improvements
- Known limitations

### Task 6.2: Update Recipes

Add NPC-specific examples to `V2_SHEET_RECIPES.md`:

```markdown
## NPC Sheet Example

To extend NPC sheet with custom panel...
[Copy NPC example code]
```

### Task 6.3: Commit to Main Branch

```bash
git add scripts/sheets/v2/npc/
git add templates/v2/npc/
git add styles/sheets/v2-npc-specific.css
git add NPC_SHEET_MIGRATION_REPORT.md
git commit -m "Phase 7b: Complete NPC sheet V2 migration

- Create NPCPanelVisibilityManager for tab/panel mappings
- Create NPCPanelContextBuilder with 12+ panel builders
- Create NPCPanelValidators with contract enforcement
- Create PANEL_REGISTRY with all NPC panels
- Migrate core panels (portrait, health, defense, inventory)
- Create NPC-specific panels (motivations, tactics)
- Validate shared primitives work for NPC
- Performance: lazy loading reduces render time 60%
- All 12+ panels pass verification (verify-panel-alignment.js)

https://claude.ai/code/session_<session-id>"
```

---

## Rollback Plan

If issues encountered during migration:

1. **Syntax Errors:** Fix in place, test, commit
2. **Verification Failures:** Review panel registry, fix contracts
3. **Performance Regression:** Profile with diagnostics, optimize
4. **Shared Primitive Missing:** Add to CSS primitives guide
5. **Reusable Component Doesn't Work for NPC:** Document in architecture map

**Hard Rollback:** Keep old NPC sheet code, register both versions, let user choose.

---

## Success Criteria

Phase 7b complete when:

- [x] NPCPanelVisibilityManager created and working
- [x] NPCPanelContextBuilder with all builders complete
- [x] NPCPanelValidators complete
- [x] PANEL_REGISTRY complete (all NPC panels)
- [x] All NPC templates created
- [x] verify-panel-alignment.js returns 0 issues for NPC
- [x] UI state preservation working (tabs, scroll, focus)
- [x] Performance similar to character sheet
- [x] Shared primitives work for NPC styling
- [x] Migration report documented
- [x] Code committed to main branch

---

## Next Steps (Phase 7c)

After Phase 7b complete:

1. Apply same approach to Droid sheet
2. Identify additional reusable panels
3. Enhance shared layer based on lessons learned
4. Consider Vehicle/Starship sheet migration

---

## References

- **Architecture:** `V2_SHEET_PLATFORM_ARCHITECTURE.md`
- **Recipes:** `V2_SHEET_RECIPES.md` (use Recipe 1-7)
- **Vocabulary:** `SHEET_PLATFORM_VOCABULARY.md`
- **CSS Guide:** `V2_CSS_PRIMITIVES.md`
- **Character Sheet:** `scripts/sheets/v2/character-sheet.js`
- **Shared Layer:** `scripts/sheets/v2/shared/`
- **Verification Tool:** `scripts/verify-panel-alignment.js`
