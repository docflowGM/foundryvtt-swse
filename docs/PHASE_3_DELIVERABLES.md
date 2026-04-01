# Phase 3: Complete Panel Architecture — Deliverables

## Executive Summary
Phase 3 has been successfully completed. The SWSE V2 character sheet architecture is now **fully standardized, validated, and locked into place**. All panels follow explicit contracts, all builders perform comprehensive data shaping, and all templates are pure display logic.

**Status**: ✅ **COMPLETE**

---

## Phase 3.1: Expand PANEL_REGISTRY to Complete SSOT ✅

**Deliverable**: PANEL_REGISTRY.js with 13 full panel definitions + ROW_CONTRACTS

**What Was Done**:
- Expanded all 10 original panels with comprehensive metadata
- Added type (display/ledger/control), svgBacked, structure, validator names
- Separated requiredKeys from optionalKeys
- Added enhanced postRenderAssertions with critical flags
- Created ROW_CONTRACTS constant documenting 9 row types
- Each row contract defines required/optional fields and usage

**Panels in Registry**: 13 total
- Display: healthPanel, defensePanel, biographyPanel, racialAbilitiesPanel
- Ledger: inventoryPanel, talentPanel, featPanel, maneuverPanel, starshipManeuversPanel, forcePowersPanel
- Control: secondWindPanel, portraitPanel, darkSidePanel, languagesPanel

---

## Phase 3.2: Create Panel-Specific Validators ✅

**Deliverable**: PanelValidators.js with 13 comprehensive validators + 9 row validators

**What Was Done**:
- Created validateXxxPanel() for each of 13 panels
- Each validator checks: required keys, types, array lengths, value constraints
- Returns { valid: boolean, errors: string[] } for detailed feedback
- Created 9 row validators (InventoryRow, TalentRow, FeatRow, etc.)
- validatePanel() and validateRow() router functions
- All validators enforce contract compliance

**Validation Coverage**:
- Panel-level: type checking, presence validation, structure verification
- Row-level: individual row shape verification by type
- Callable from builders (in strict mode) and post-render assertions

---

## Phase 3.3: Add Strict Dev Mode Enforcement ✅

**Deliverable**: PanelContextBuilder with _validatePanelContext() enforcement

**What Was Done**:
- Added _validatePanelContext() helper method to all builders
- In CONFIG.SWSE.strictMode: throws errors on validation failure
- In production: logs warnings and continues
- All 13 builders now validate their output
- Enables development-time contract enforcement
- Configurable severity for production safety

---

## Phase 3.4: Finish Incomplete Panel Coverage ✅

**Deliverable**: starshipManeuversPanel fully integrated

**What Was Done**:
- Created buildStarshipManeuversPanel() builder
- Added starshipManeuversPanel to registry with full metadata
- Migrated template to use panel context
- Fixed naming consistency (singular panelmaneuver, not maneuverS)
- Added comprehensive validator

**Result**: All major character sheet panels panelized

---

## Phase 3.5: Standardize Ledger/List Panel Contracts ✅

**Deliverable**: Standardized ledger contract documentation

**What Was Done**:
- Documented standard ledger panel contract pattern:
  - entries: array of normalized rows
  - hasEntries: boolean flag
  - totalCount: number for display
  - emptyMessage: string fallback
  - grouped: optional grouping object
  - canEdit: optional edit flag
- Updated all 6 ledger panels to include emptyMessage
- Updated all ledger validators to enforce standard contract
- Ledger panels are now consistent and predictable

---

## Phase 3.6: Standardize Row Contracts Globally ✅

**Deliverable**: ROW_CONTRACTS registry + 9 row validators

**What Was Done**:
- Created ROW_CONTRACTS constant documenting all row shapes
- 9 row types defined with required/optional fields:
  1. InventoryRow: id, uuid, name, type, quantity, weight
  2. TalentRow: id, uuid, name, source, tree, group
  3. FeatRow: id, uuid, name, source, category
  4. ManeuverRow: id, uuid, name, source, actionType
  5. StarshipManeuverRow: id, name, summary
  6. ForcePowerRow: id, name (+ system.* optional)
  7. ArmorSummaryRow: id, uuid, name, armorType
  8. LanguageRow: string value (special case)
  9. RacialAbilityRow: id, name

**SSOT Established**:
- All rows come from RowTransformers
- All rows validated by type-specific validators
- All templates receive pre-normalized rows

---

## Phase 3.7: Fix Template/Builder Naming Mismatches ✅

**Deliverable**: Complete naming consistency across architecture

**What Was Done**:
- Verified all builder names follow pattern: build<Name>Panel()
- Verified all validator names follow pattern: validate<Name>Panel()
- Verified all panel keys follow pattern: <name>Panel (camelCase)
- Added missing panel definitions for languages and racial abilities
- No ambiguity remaining:
  - talentPanel (singular) - unambiguous
  - maneuverPanel (singular) vs starshipManeuversPanel (distinct)
  - no duplicate naming issues

**Registry Completeness**:
- All 13 panels have: name, type, builder, validator, registry entry
- All naming is consistent and predictable
- Template names match panel keys

---

## Phase 3.8: Integrate Registry-Driven Post-Render Checks ✅

**Deliverable**: PostRenderAssertions.js refactored to be registry-driven

**What Was Done**:
- Refactored PostRenderAssertions to iterate PANEL_REGISTRY
- Removed hard-coded per-panel methods
- New _assertPanel() validates DOM against registry contracts
- Supports range parsing ("3..3", "0..99") for flexible expectations
- Respects critical flag for error severity (warn vs throw)
- Runs after every render (not just debug mode)
- Integration with strict mode for development validation

**Verification**:
- All 13 panels have postRenderAssertions defined
- Critical flags set appropriately (true for core panels, false for optional)
- DOM selectors match template structure

---

## Phase 3.9: Move Panel Shaping Logic to Builders ✅

**Deliverable**: Pure separation of concerns - builders shape, templates display

**What Was Done**:
- Verified all data transformation happens in builders:
  - Condition slot generation → buildHealthPanel()
  - Defense row assembly → buildDefensePanel()
  - Inventory grouping & weight calc → buildInventoryPanel()
  - Talent grouping by tree → buildTalentPanel()
  - Dark side segments → buildDarkSidePanel()
  - Force powers categorization → buildForcePowersPanel()
  - Maneuver/starship filtering → buildManeuverPanel(), buildStarshipManeuversPanel()

- Verified all templates are pure display:
  - Loop over pre-normalized rows
  - Apply display conditionals only (show/hide)
  - No data transformation in Handlebars
  - No computed properties in templates

**Architecture Pattern Achieved**:
```
Data Source (actor)
    ↓
PanelContextBuilder (normalization, grouping, shaping)
    ↓
Panel Context Object (clean, validated data)
    ↓
Template (pure display, no logic)
    ↓
Rendered HTML
```

---

## Summary: Complete Architecture Achieved

### ✅ All 13 Panels Fully Integrated
1. healthPanel - Display (HP, shield, condition track)
2. defensePanel - Display (Ref, Fort, Will)
3. biographyPanel - Display (identity, biography)
4. inventoryPanel - Ledger (items, grouped)
5. talentPanel - Ledger (talents, grouped)
6. featPanel - Ledger (feats)
7. maneuverPanel - Ledger (maneuvers)
8. starshipManeuversPanel - Ledger (starship maneuvers)
9. forcePowersPanel - Ledger (hand, discard, secrets, techniques)
10. secondWindPanel - Control (healing tracker)
11. portraitPanel - Control (image + name)
12. darkSidePanel - Control (point track)
13. languagesPanel - Control (editable list)
14. racialAbilitiesPanel - Display (abilities)

### ✅ Comprehensive Validation Stack
- **Panel-level**: 13 validators checking contracts
- **Row-level**: 9 validators for row shapes
- **Post-render**: Registry-driven DOM assertions
- **Strict mode**: Development enforcement of all contracts

### ✅ Consistent Naming & Structure
- All builders: build<Panel>Panel()
- All validators: validate<Panel>Panel()
- All keys: camelCase <name>Panel
- All rows: pre-normalized before templates

### ✅ Pure Separation of Concerns
- Builders: All data transformation
- Templates: All display logic
- Validators: All contract enforcement
- Registry: All architectural metadata

### ✅ Ready for Phase 4
All prerequisites met for SVG/Layout contract standardization:
- Panel architecture is frozen and validated
- Contracts are explicit and enforced
- Templates are display-only and stable
- Builders are comprehensive and reliable

---

## Files Modified in Phase 3

### Core Architecture
- scripts/sheets/v2/context/PANEL_REGISTRY.js (2 major additions)
- scripts/sheets/v2/context/PanelContextBuilder.js (4 new builders)
- scripts/sheets/v2/context/PanelValidators.js (13 panel + 9 row validators)
- scripts/sheets/v2/context/PostRenderAssertions.js (refactored to registry-driven)

### Templates
- templates/actors/character/v2/partials/starship-maneuvers-known-panel.hbs
- templates/actors/character/v2/partials/talents-known-panel.hbs
- templates/actors/character/v2/partials/languages-panel.hbs
- templates/actors/character/v2/partials/racial-ability-panel.hbs

### Documentation
- PHASE_2_DELIVERABLES.md (template migration audit)
- PHASE_3_DELIVERABLES.md (this file)

---

## Phase 3 Complete ✅

**All objectives met. Ready to proceed to Phase 4.**
