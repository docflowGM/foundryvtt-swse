# Phase 3 Galactic Records Implementation - Audit Report

**Date**: 2026-03-28
**System**: SWSE Foundry VTT v1.2.1
**Status**: Discovery Complete - Ready for Implementation

---

## 1. Template Category Status Matrix

| Category | Data Source | Actor Type | Count | Import Pipeline | Status |
|----------|------------|-----------|-------|-----------------|--------|
| **Heroic** | `packs/heroic.db` | npc | 405 | Existing importer ✅ | READY |
| **Nonheroic** | `packs/nonheroic.db` | npc | 434 | Existing importer ✅ | READY |
| **Beast** | `packs/beasts.db` | npc | 117 | Existing importer ✅ | READY |
| **Droid** | `packs/droids.db` | droid | 388 | NOT AVAILABLE ❌ | UNSUPPORTED |

---

## 2. Currently Importable Categories

### ✅ Heroic (405 templates)
- **Source**: `/packs/heroic.db` (NDJSON compendium)
- **Pipeline**: `NPCTemplateDataLoader.loadBeastTemplates()` → routes to Heroic pack
- **Import**: `NPCTemplateImporterEngine.importBeastTemplate()` (direct clone)
- **Status**: Fully wired, no changes needed

### ✅ Nonheroic (434 templates)
- **Source**: `/packs/nonheroic.db` (NDJSON compendium) + `/data/nonheroic.json` (JSON fallback)
- **Pipeline**: `NPCTemplateDataLoader.loadNonheroicTemplates()`
- **Import**: `NPCTemplateImporterEngine.importNonheroicTemplate()` (statblock parse)
- **Status**: Fully wired, no changes needed

### ✅ Beast (117 templates)
- **Source**: `/packs/beasts.db` (NDJSON compendium)
- **Pipeline**: `NPCTemplateDataLoader.loadBeastTemplates()`
- **Import**: `NPCTemplateImporterEngine.importBeastTemplate()` (direct clone)
- **Status**: Fully wired, no changes needed

---

## 3. Not Yet Importable

### ❌ Droid (388 templates)
- **Source**: `/packs/droids.db` (NDJSON compendium)
- **Actor Type**: `droid` (NOT `npc`)
- **Blocker**: Different system schema than NPC importer
  - NPCs: `system.abilities`, `system.defenses`, `system.attributes.hp`
  - Droids: `system.HP`, `system.attacks`, `system.baseStats`, `system.degree`
- **Would Need**: Separate `loadDroidTemplates()` + `importDroidTemplate()` methods
- **Status**: Future enhancement - show honest "unavailable" state in Phase 3

---

## 4. Integration Points

### Entry Point Location
- **File**: `/home/user/foundryvtt-swse/scripts/apps/chargen-init.js`
- **Current Behavior**: Intercepts "Create Actor" button in actor directory
- **Current Dialog**: Shows buttons: "PC from Template", "Custom PC", "Legacy PC", "NPC Generator"
- **Phase 3 Change**: Add new pre-dialog: "Begin New Character" vs "Access Galactic Records"

### Existing Importer Location
- **Files**: Already implemented in Phase 1-2
  - `scripts/core/npc-template-data-loader.js` - Template loading
  - `scripts/engine/import/npc-template-importer-engine.js` - Import logic
  - `scripts/apps/npc-template-importer.js` - NPC-only UI
- **Phase 3 Use**: Wrap this importer inside a broader template browser

### Splash Screen
- **File**: `/templates/apps/progression-framework/splash.hbs`
- **Current Use**: Post-actor-creation boot sequence
- **Phase 3**: Not modifying splash - creating separate "entry choice" dialog

---

## 5. Architecture Plan

### New Components (Phase 3)

**1. Actor Creation Entry Dialog** (`npc-template-entry-choice.js`)
- Simple DialogV2 showing two buttons: "Begin New Character" vs "Access Galactic Records"
- Routes based on user choice
- Shown BEFORE chargen-init dialog

**2. Galactic Records Template Browser** (`galactic-records-browser.js`)
- Multi-type template browser UI
- Category tabs: Heroic, Nonheroic, Beast, Droid
- Template grid display
- Routes selected template to appropriate import backend

**3. Category Config Layer**
- Small registry mapping categories to data sources
- Tracks which categories are supported vs unsupported
- Extensible for future types (Heroic character templates, etc.)

**4. Backend Router**
- Routes template selection to:
  - NPC importer (Heroic/Nonheroic/Beast)
  - Droid importer (when available)
  - Others (when available)

---

## 6. Implementation Constraints

### What Stays the Same
- ✅ Existing `Begin New Character` → progression/chargen path unchanged
- ✅ Existing importer code (Phase 1-2) becomes backend, not frontend
- ✅ Actor directory sidebar buttons unchanged

### What's New
- ✅ Pre-dialog entry choice (2 buttons)
- ✅ Galactic Records template browser (multi-type)
- ✅ Category routing to existing importer

### What's NOT Done
- ❌ Heroic character templates (only Heroic NPCs)
- ❌ Droid import pipeline
- ❌ Full actor type ecosystem rewrite
- ❌ Template customization beyond existing wizard

---

## 7. Deliverables for Phase 3

1. **GALACTIC_RECORDS_PHASE3_AUDIT.md** (this file)
2. **GALACTIC_RECORDS_PHASE3_IMPLEMENTATION.md** - Architecture and code summary
3. **GALACTIC_RECORDS_PHASE3_VERIFICATION.md** - QA checklist
4. Code files:
   - `scripts/apps/actor-creation-entry-dialog.js` - Entry choice dialog
   - `scripts/apps/galactic-records-browser.js` - Template browser
   - `scripts/core/galactic-records-category-registry.js` - Category config
   - `templates/apps/actor-creation-entry.hbs` - Entry dialog template
   - `templates/apps/galactic-records-browser.hbs` - Browser template
   - Modified: `scripts/apps/chargen-init.js` - Route to new entry dialog

---

## Recommendations

✅ **Proceed with Phase 3 Implementation** - All three importable categories are fully ready and wired
⚠️ **Droid Support**: Document as future enhancement, show intentional "unavailable" state
✅ **Keep it Tight**: Focus on connecting existing importer to new browser UI, no overbuilding
✅ **Extensible from Start**: Architecture supports adding Heroic character templates, Droid importer later

---

**Status**: Ready for implementation
**Blockers**: None
**Dependencies**: Phase 1-2 importer (already complete)
