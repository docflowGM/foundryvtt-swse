# SWSE V2 Character Sheet — Complete Manifest

## Overview

The SWSE V2 character sheet is a panelized, contract-driven architecture that separates data shaping (builders) from template display. All character data flows through explicit panel contexts with comprehensive validation.

**Architecture Version:** 2.0 (Phases 1-5 Complete)
**Last Updated:** Phase 5.2-5.7
**Status:** ✅ Production Ready

---

## Architecture at a Glance

### Data Flow

```
Actor Document
    ↓
PanelContextBuilder (14 builders)
    ↓ (shapeData)
Panel Contexts (14 dedicated view models)
    ↓
Template Engine
    ↓ (render)
HTML Output
    ↓
PostRenderAssertions (validation)
    ↓
DOM for Display
```

### Key Principles

1. **Single Source of Truth (SSOT)** — PANEL_REGISTRY defines all panel metadata
2. **Explicit Contracts** — Every panel has defined required/optional keys
3. **Separation of Concerns** — Builders shape, templates display, validators verify
4. **Registry-Driven** — All behaviors look up configuration in PANEL_REGISTRY
5. **Validation at Boundaries** — Input (context) and output (DOM) are validated
6. **Strict Mode** — Development mode catches violations early

---

## All 14 Panels

### Display Panels (Read-only information display)

#### 1. Health & Conditions (`healthPanel`)
- **Purpose:** Display HP, bonus HP, shield, damage reduction, condition track
- **Template:** `hp-condition-panel.hbs`
- **Builder:** `buildHealthPanel()`
- **Validator:** `validateHealthPanel()`
- **SVG-Backed:** Yes (frame + content + nested overlay for slots)
- **Critical:** Yes (strict mode enforces)
- **Required Data:**
  - hp.value, hp.max, hp.percent, hp.stateClass
  - bonusHp.value, bonusHp.hasBonus
  - conditionTrack.current, conditionTrack.max
  - conditionSlots (6 buttons), shield data
- **Post-Render:** Validates frame, content, overlay, 6 condition slots

#### 2. Defenses (`defensePanel`)
- **Purpose:** Display Reflex, Fortitude, Will with math breakdown
- **Template:** `defenses-panel.hbs`
- **Builder:** `buildDefensePanel()`
- **Validator:** `validateDefensePanel()`
- **SVG-Backed:** Yes (frame + content)
- **Critical:** Yes
- **Required Data:** 3 defense rows (ref, fort, will) with base/mods
- **Post-Render:** Validates 3 defense-row elements

#### 3. Biography (`biographyPanel`)
- **Purpose:** Display character identity, biography, personal details
- **Template:** `character-record-header.hbs`
- **Builder:** `buildBiographyPanel()`
- **Validator:** `validateBiographyPanel()`
- **SVG-Backed:** Yes (frame + content)
- **Critical:** Yes
- **Required Data:** Identity (name, class, level, species, size), biography text
- **Post-Render:** Validates identity fields present

#### 4. Portrait (`portraitPanel`)
- **Purpose:** Display character portrait image
- **Template:** `portrait-panel.hbs`
- **Builder:** `buildPortraitPanel()`
- **Validator:** `validatePortraitPanel()`
- **SVG-Backed:** No
- **Critical:** No
- **Required Data:** portraitUrl, portraitAlt, hasPortrait
- **Post-Render:** None

#### 5. Dark Side Points (`darkSidePanel`)
- **Purpose:** Display dark side points track with numbered boxes
- **Template:** `dark-side-panel.hbs`
- **Builder:** `buildDarkSidePanel()`
- **Validator:** `validateDarkSidePanel()`
- **SVG-Backed:** Yes (frame + content + nested overlay for boxes)
- **Critical:** No
- **Required Data:** value, max, segments array
- **Post-Render:** Validates dsp-numbered-track, dsp-track-boxes

#### 6. Second Wind (`secondWindPanel`)
- **Purpose:** Display second wind usage tracking
- **Template:** `second-wind-panel.hbs`
- **Builder:** `buildSecondWindPanel()`
- **Validator:** `validateSecondWindPanel()`
- **SVG-Backed:** No
- **Critical:** No
- **Required Data:** used, perEncounter counts
- **Post-Render:** None

---

### Ledger Panels (Tabular multi-row data)

#### 7. Inventory (`inventoryPanel`)
- **Purpose:** Equipment, weapons, armor, general inventory
- **Template:** `equipment-ledger-panel.hbs`
- **Builder:** `buildInventoryPanel()`
- **Validator:** `validateInventoryPanel()`
- **Row Contract:** InventoryRow
- **Required Data:** entries[], grouped{weapons, armor, equipment}
- **Stats:** totalItems, totalWeight, encumbrance, equippedArmor
- **Post-Render:** Validates ledger-row elements

#### 8. Talents (`talentPanel`)
- **Purpose:** Talents known by character, grouped by tier
- **Template:** `talents-known-panel.hbs`
- **Builder:** `buildTalentPanel()`
- **Validator:** `validateTalentPanel()`
- **Row Contract:** TalentRow
- **Required Data:** entries[], grouped{by tier}
- **Stats:** totalTalents, currentTier
- **Post-Render:** Validates talent-row elements

#### 9. Feats (`featPanel`)
- **Purpose:** Character feats
- **Template:** `feats-known-panel.hbs`
- **Builder:** `buildFeatPanel()`
- **Validator:** `validateFeatPanel()`
- **Row Contract:** FeatRow
- **Required Data:** entries[], grouped{by category}
- **Stats:** totalFeats
- **Post-Render:** Validates feat-row elements

#### 10. Maneuvers (`maneuverPanel`)
- **Purpose:** Combat maneuvers known
- **Template:** `maneuvers-known-panel.hbs`
- **Builder:** `buildManeuverPanel()`
- **Validator:** `validateManeuverPanel()`
- **Row Contract:** ManeuverRow
- **Required Data:** entries[], grouped{by tier/type}
- **Stats:** totalManeuvers
- **Post-Render:** Validates maneuver-row elements

#### 11. Force Powers (`forcePowersPanel`)
- **Purpose:** Force powers with hand/discard/secrets layout
- **Template:** `force-powers-known-panel.hbs`
- **Builder:** `buildForcePowersPanel()`
- **Validator:** `validateForcePowersPanel()`
- **Row Contract:** ForcePowerRow
- **Special:** Multiple arrays (hand, discard, secrets, techniques)
- **Required Data:** hand[], discard[], secrets[], techniques[]
- **Stats:** totalPowers, fpUsed, fpMax
- **Post-Render:** Validates power-row elements in each section

#### 12. Starship Maneuvers (`starshipManeuversPanel`)
- **Purpose:** Starship combat maneuvers
- **Template:** `starship-maneuvers-panel.hbs`
- **Builder:** `buildStarshipManeuversPanel()`
- **Validator:** `validateStarshipManeuversPanel()`
- **Row Contract:** StarshipManeuverRow
- **Required Data:** entries[], grouped{by class}
- **Post-Render:** Validates starship-maneuver-row elements

#### 13. Languages (`languagesPanel`)
- **Purpose:** Languages spoken by character
- **Template:** `languages-panel.hbs`
- **Builder:** `buildLanguagesPanel()`
- **Validator:** `validateLanguagesPanel()`
- **Row Contract:** LanguageRow
- **Required Data:** entries[] (string array of languages)
- **Post-Render:** None

#### 14. Racial Abilities (`racialAbilitiesPanel`)
- **Purpose:** Racial abilities from character species
- **Template:** `racial-ability-panel.hbs`
- **Builder:** `buildRacialAbilitiesPanel()`
- **Validator:** `validateRacialAbilitiesPanel()`
- **Row Contract:** RacialAbilityRow
- **Required Data:** entries[] (array of ability objects)
- **Post-Render:** None

---

## Critical Files and Responsibilities

### Core Architecture Files

| File | Purpose | Responsibility |
|------|---------|-----------------|
| `PANEL_REGISTRY.js` | Single source of truth | Define all panel metadata, contracts, validators |
| `PanelContextBuilder.js` | Data shaping | Transform actor data into panel view models |
| `PanelValidators.js` | Validation logic | Validate panels conform to contracts |
| `PanelTypeDefinitions.js` | Type documentation | JSDoc typedefs for IDE support |
| `PostRenderAssertions.js` | Output validation | Verify rendered DOM matches contracts |

### Template Files

- **Partials** (`templates/actors/character/v2/partials/`)
  - `hp-condition-panel.hbs` → healthPanel
  - `defenses-panel.hbs` → defensePanel
  - `character-record-header.hbs` → biographyPanel
  - `portrait-panel.hbs` → portraitPanel
  - `dark-side-panel.hbs` → darkSidePanel
  - `second-wind-panel.hbs` → secondWindPanel
  - `equipment-ledger-panel.hbs` → inventoryPanel
  - `talents-known-panel.hbs` → talentPanel
  - `feats-known-panel.hbs` → featPanel
  - `maneuvers-known-panel.hbs` → maneuverPanel
  - `force-powers-known-panel.hbs` → forcePowersPanel
  - `starship-maneuvers-panel.hbs` → starshipManeuversPanel
  - `languages-panel.hbs` → languagesPanel
  - `racial-ability-panel.hbs` → racialAbilitiesPanel

### SVG Layout Files

| File | Purpose |
|------|---------|
| `styles/core/svg-geometry.css` | Panel geometry variables (aspect ratios, padding, margins) |
| `styles/ui/character-sheet-svg-panels.css` | SVG frame/content/overlay structure and positioning |
| `styles/debug/svg-layout-debug.css` | Developer debug visualization (grid, boundaries, overlays) |

---

## How to Add a New Panel

### 1. Define in PANEL_REGISTRY

```javascript
newPanelName: {
  name: 'Display Name',
  type: 'display|ledger|control',
  svgBacked: false|true,
  structure: 'Description of structure',
  template: 'systems/foundryvtt-swse/templates/.../template.hbs',
  builder: 'buildNewPanel',
  validator: 'validateNewPanel',
  requiredKeys: ['key1', 'key2'],
  optionalKeys: [],
  svgStructure: { /* if SVG */ },
  postRenderAssertions: {
    critical: true|false,
    rootSelector: '.panel-selector',
    expectedElements: {}
  }
}
```

### 2. Create Builder in PanelContextBuilder.js

```javascript
buildNewPanel() {
  const context = {
    key1: this.document.system.key1,
    key2: this.document.system.key2,
    canEdit: this.canEdit
  };
  return this._validatePanelContext('newPanelName', context);
}
```

### 3. Create Validator in PanelValidators.js

```javascript
function validateNewPanel(context) {
  const errors = [];
  if (!context.key1) errors.push('Missing key1');
  if (!context.key2) errors.push('Missing key2');
  return { valid: errors.length === 0, errors };
}
```

### 4. Create Template

```handlebars
{{!-- newPanel.hbs --}}
<section class="swse-panel">
  <div class="swse-panel__frame"></div>
  <div class="swse-panel__content">
    {{newPanelName.key1}}
  </div>
</section>
```

### 5. Call in Template

```handlebars
{{> partials/new-panel}}
```

---

## Validation Layers

### Layer 1: Context Contract (PanelContextBuilder)
- Validates required keys are provided
- Throws/warns on missing data
- Strict mode: throws error
- Production: logs warning

### Layer 2: Panel Validation (PanelValidators)
- Returns { valid, errors } object
- Type-specific validation logic
- Applied to each panel independently

### Layer 3: Post-Render Assertions (PostRenderAssertions)
- Validates DOM structure after rendering
- Checks for expected HTML elements
- Verifies SVG layer presence
- Counts positioned elements

### Layer 4: Strict Mode Enforcement
- CONFIG.SWSE.strictMode = true
- Converts warnings to errors
- Fails fast on contract violations
- Guides developer fixes

---

## SVG Layout Contract

### Universal Panel Structure

All SVG-backed panels follow:

```html
<section class="swse-panel svg-framed">
  <!-- 1. Frame layer: SVG background (z-index: 1) -->
  <div class="swse-panel__frame" aria-hidden="true"></div>

  <!-- 2. Content layer: Normal flow content (z-index: 2) -->
  <div class="swse-panel__content">
    [Headers, forms, text, tables]
  </div>

  <!-- 3. Overlay layer: Positioned elements (z-index: 3) -->
  <div class="swse-panel__overlay">
    [Absolutely positioned buttons, indicators]
  </div>
</section>
```

### Geometry Variables

All panel dimensions defined in `styles/core/svg-geometry.css`:
- Panel widths/heights
- Content safe area padding
- Aspect ratios
- Slot positions (percentages)

See `PHASE_4_SVG_CONTRACT_COMPLETION.md` for full geometry specification.

---

## Testing & Verification

### Verify Panel Alignment

```bash
node scripts/verify-panel-alignment.js
```

Checks:
- All 14 panels in registry
- All builders exist
- All validators exist
- Registry connectivity

### Enable Strict Mode

```javascript
CONFIG.SWSE.strictMode = true;
```

Then render sheet to catch violations immediately.

### Enable Debug Mode

```javascript
game.swse.toggleLayoutDebug()  // Or /swse-debug-layout
```

Shows:
- 10px alignment grid
- Content safe area boundaries
- Overlay positioning visualization
- Anchor points for positioned elements

---

## Key Constraints & Rules

### Template Rules

❌ **NEVER:**
- Read from raw actor.system paths (use panel)
- Read from raw actor.flags paths (use panel)
- Normalize/sort data in templates
- Create conditional logic on raw structure

✅ **ALWAYS:**
- Read from panelized contexts (healthPanel, etc.)
- Trust that builders have normalized data
- Let validators enforce contracts
- Use panel-provided computed values

### Builder Rules

✅ **DO:**
- Shape data according to panel contract
- Call _validatePanelContext for enforcement
- Normalize row objects
- Provide computed display values

❌ **DON'T:**
- Add arbitrary convenience properties
- Create duplicate data structures
- Modify actor data directly
- Skip validation

### SVG Panel Rules

✅ **DO:**
- Use frame + content + overlay structure
- Apply CSS geometry variables
- Position elements by percentage in SVG coordinates
- Validate structure in PostRenderAssertions

❌ **DON'T:**
- Use inline positioning without variables
- Mix normal flow and positioned elements in content
- Hardcode dimensions
- Forget aria-hidden on frame

---

## Configuration

### Strict Mode

```javascript
CONFIG.SWSE.strictMode = true;  // Default: false
```

In strict mode:
- Contract violations throw errors
- Missing required keys fail immediately
- DOM structure mismatches fail render
- Guides developer to root cause

### Debug Mode

```javascript
CONFIG.SWSE.debug.layoutDebug = true;  // Default: false
```

Or use chat command: `/swse-debug-layout`

---

## Troubleshooting

### "Missing required panel key"
- Check PanelContextBuilder for the panel
- Verify builder is providing the key
- Check PANEL_REGISTRY for requiredKeys list
- Review actor data structure

### "Panel validator failed"
- Check PanelValidators for the panel
- Review validation logic for the key
- Verify data type matches contract
- Enable strict mode for details

### "PostRender assertion failed"
- Check PANEL_REGISTRY postRenderAssertions
- Verify template has correct CSS selectors
- Check for expected element counts
- Enable debug mode to visualize

### Template blank or not rendering
- Check panel context is being passed
- Enable strict mode to catch errors
- Check browser console for warnings
- Verify panel is included in master template

---

## Phase Completion Status

- ✅ **Phase 1:** Panel architecture foundation
- ✅ **Phase 2:** Template migration to panels
- ✅ **Phase 3:** Validators and registry enforcement
- ✅ **Phase 4:** SVG/layout contracts and debug tools
- ✅ **Phase 5:** Lockdown, testing, documentation

**Status: PRODUCTION READY**

---

## Document Info

- **Created:** Phase 5.5
- **Authority:** Authoritative reference for sheet architecture
- **Maintenance:** Update when panels added/modified
- **Related Docs:**
  - `PHASE_4_SVG_CONTRACT_COMPLETION.md` - SVG layout contracts
  - `PHASE_4_DEBUG_GUIDE.md` - Debug mode usage
  - `PanelTypeDefinitions.js` - JSDoc type definitions
  - `scripts/verify-panel-alignment.js` - Verification tool
