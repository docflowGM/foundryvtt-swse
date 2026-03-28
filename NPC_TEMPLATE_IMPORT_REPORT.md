# NPC Template Import Implementation Report

**Date**: 2026-03-28
**Version**: 1.0 (Phase 1 - Direct Import)
**System**: SWSE Foundry VTT v1.2.1
**Status**: Complete & Ready for Testing

---

## 1. Implementation Summary

### 1.1 Phase 1: Direct Import System ✅

Successfully implemented a complete NPC template import system that allows GMs to create NPCs from three template sources:
- **Beast NPCs** (from `packs/beasts` compendium)
- **Nonheroic NPCs** (from `data/nonheroic.json`)
- **Heroic NPCs** (from `data/heroic.json`)

### 1.2 Architecture Overview

```
User clicks "Import NPC" button (sidebar)
    ↓
NPCTemplateImporter Dialog opens
    ↓
User selects category (Beast/Nonheroic/Heroic)
    ↓
NPCTemplateDataLoader loads templates from source
    ↓
User selects specific template
    ↓
User clicks "Import"
    ↓
NPCTemplateImporterEngine processes import
    ├─ Beast: Direct clone from compendium
    └─ Nonheroic/Heroic: Parse statblock → Build actor → Create items
    ↓
New NPC actor created in world
    ↓
Actor sheet opens automatically
```

---

## 2. Core Components Implemented

### 2.1 Data Loader (`scripts/core/npc-template-data-loader.js`)

**Responsibility**: Load templates from various sources

**Key Methods**:
- `loadBeastTemplates()` - Loads from beasts compendium pack
- `loadNonheroicTemplates()` - Loads from data/nonheroic.json
- `loadHeroicTemplates()` - Loads from data/heroic.json
- `loadTemplatesByCategory(category)` - Loads for a specific category
- `loadTemplateById(category, templateId)` - Loads a specific template
- `getBeastActorDocument(actorId)` - Retrieves full actor doc from pack

**Features**:
- Async loading for all sources
- Graceful error handling with fallback empty arrays
- Consistent template object structure across all sources
- Logging at debug and error levels
- Portrait/image path preservation

### 2.2 Import Engine (`scripts/engine/import/npc-template-importer-engine.js`)

**Responsibility**: Execute the actual import process

**Key Methods**:

**Beast Import**:
- `importBeastTemplate(actorId)` - Loads actor from pack, clones, creates new actor
- Direct document cloning to preserve all properties

**Nonheroic/Heroic Import**:
- `importNonheroicTemplate(template)` - Parses JSON → creates actor
- `importHeroicTemplate(template)` - Parses JSON → creates actor
- `_buildActorFromStatblock(name, statblock, npcType)` - Core builder

**Data Mapping**:
- `_mapAbilities(statblock)` - Maps STR/DEX/CON/INT/WIS/CHA to system
- `_mapDefenses(statblock)` - Maps Reflex/Fortitude/Will/Flat-Footed
- `_parseHitPoints(hpString)` - Extracts HP from statblock string
- `_parseDefense(defenseString)` - Extracts defense values
- `_parseWeapons(weaponString, type)` - Parses weapons from comma-separated list

**Item Creation**:
- `_addItemsToActor(actor, statblock)` - Adds weapons, feats, talents, languages
- `_parseWeapons()` - Creates weapon items from statblock
- `_createFeatItem()` - Creates feat items from feat list
- `_createTalentItem()` - Creates talent items from talent list
- `_createLanguageItem()` - Creates language items from language list

**Features**:
- Deep cloning to avoid modifying source data
- Proper type setting (all imported actors are type: "npc")
- Consistent system data structure
- Embedded item creation via actor.createEmbeddedDocuments()
- Comprehensive logging at each step
- Error handling that logs and returns null on failure

### 2.3 UI App (`scripts/apps/npc-template-importer.js`)

**Responsibility**: User interface for browsing and selecting templates

**Class**: `NPCTemplateImporter extends foundry.applications.api.DialogV2`

**Key Methods**:
- `_prepareContext()` - Prepares render context with categories and templates
- `_onRender(context, options)` - Attaches event listeners
- `_onSelectCategory(event)` - Handles category selection and lazy-loads templates
- `_onSelectTemplate(event)` - Handles template selection
- `_onImport()` - Executes import based on selected category/template
- `static create(options)` - Factory method to create and render

**Features**:
- Three-step UX: Category → Template → Review & Import
- Lazy loading of templates (only when category is selected)
- Category buttons with icons and hover states
- Template grid with images, names, metadata
- Selected template preview
- Import button disabled until template is selected
- Success/error notifications
- Auto-opens actor sheet after successful import

### 2.4 UI Template (`templates/apps/npc-template-importer.hbs`)

**Features**:
- Responsive Handlebars template
- SWSE theme-consistent styling (dark mode with gold accents)
- Category selection buttons with Font Awesome icons
- Template grid layout with image previews
- Metadata display (species, class levels)
- Loading spinner during template fetch
- Selected template preview panel
- Footer actions (Cancel, Import)
- Mobile-responsive CSS grid

### 2.5 Sidebar Integration (`scripts/infrastructure/hooks/actor-sidebar-controls.js`)

**Changes**:
- Added import: `NPCTemplateImporter`
- Added handler: `onClickNPCTemplates()`
- Added sidebar button with icon, label, GM-only check
- Button placed in sidebar header alongside existing controls

---

## 3. Entry Point & User Flow

### 3.1 How to Access

1. Open Actor Directory
2. Look for sidebar button group (top-left)
3. Click "Import NPC" button (dragon icon)
4. NPC Template Importer dialog opens

### 3.2 Access Control

- **Visible to**: GMs only
- **Visible to**: Players - No (checked at handler level)
- **Error message**: "Only GMs can import NPC templates."

### 3.3 Three-Step Workflow

**Step 1: Category Selection**
- User clicks Beast / Nonheroic / Heroic button
- System loads templates from appropriate source
- Active button highlighted in gold

**Step 2: Template Selection**
- User browses template grid
- Each template shows image, name, species, class levels
- Click to select
- Selected template highlighted

**Step 3: Review & Import**
- Selected template displayed in preview panel
- User reviews details
- Clicks "Import Template" button
- Actor created, dialog closes, sheet opens

---

## 4. Template Source Data Handling

### 4.1 Beast Templates (Compendium Direct)

**Source**: `packs/beasts` (LevelDB format)
**Processing**: Clone → Create → Done
**Data Preserved**: All properties from compendium actor
**Items**: Embedded items automatically included

**Flow**:
```javascript
// Load actor from pack
const actorData = await NPCTemplateDataLoader.getBeastActorDocument(actorId);

// Deep clone to avoid modifying source
const newActorData = foundry.utils.deepClone(actorData);

// Ensure type is npc
newActorData.type = 'npc';

// Create in world
const actor = await Actor.create(newActorData);
```

### 4.2 Nonheroic Templates (JSON Statblock)

**Source**: `data/nonheroic.json` (JSON array of statblocks)
**Processing**: Parse → Map → Build → Create
**Data Normalized**: Statblock fields → Actor system structure
**Items**: Created from parsed ability/skill/feat/talent/language lists

**Key Mappings**:
- `Name` → actor.name
- `Strength/Dexterity/etc` → system.abilities.*
- `Reflex Defense/etc` → system.defenses.*
- `Hit Points` → system.attributes.hp
- `Melee Weapons` → weapon items
- `Feats` → feat items
- `Talents` → talent items
- `Languages` → language items

### 4.3 Heroic Templates (JSON Statblock)

**Source**: `data/heroic.json` (JSON array of statblocks)
**Processing**: Identical to Nonheroic
**Difference**: Flagged with `npcType: 'heroic'` for future differentiation

**Additional Context**:
- Higher level/power characters
- More complex feat/talent combinations
- Can be used for boss NPCs or nemesis encounters

---

## 5. Data Flow & Transformation

### 5.1 Beast Import Data Flow

```
Compendium Actor Document
    ↓ (fetch from pack)
Actor JSON Object
    ↓ (deep clone)
Cloned Object
    ↓ (set type: npc)
Finalized Object
    ↓ (Actor.create)
World Actor Document
    ↓ (sheet.render)
Open NPC Sheet
```

### 5.2 Nonheroic/Heroic Import Data Flow

```
JSON Statblock Entry
    ├─ Parse: Name, Abilities, Defenses, HP
    ├─ Create base actor data structure
    ├─ Map abilities → system.abilities
    ├─ Map defenses → system.defenses
    ├─ Map HP → system.attributes.hp
    └─ Set type: "npc"
    ↓ (Actor.create)
World Actor Document
    ↓ (createEmbeddedDocuments)
    ├─ Create weapon items from "Melee/Ranged Weapons"
    ├─ Create feat items from "Feats" array
    ├─ Create talent items from "Talents" array
    └─ Create language items from "Languages" array
    ↓ (sheet.render)
Open NPC Sheet
```

---

## 6. NPC Sheet Routing

### 6.1 Automatic Sheet Selection

**All imported actors are type: "npc"**

Sheet registration in index.js:
```javascript
ActorCollection.registerSheet("foundryvtt-swse", SWSEV2NpcSheet, {
  // routes based on actor.type === 'npc'
});
```

**Result**: Imported actors automatically open on `SWSEV2NpcSheet`

### 6.2 No Additional Routing Logic Needed

- Beast actors already type "npc" in compendium
- Nonheroic/Heroic actors explicitly set type "npc"
- No subtype flags needed for phase 1
- Future: Can add subtype for Beast/Nonheroic/Heroic distinction if needed

---

## 7. Error Handling Strategy

### 7.1 Load-Time Errors

**Missing compendium**:
```
[NPCTemplateDataLoader] Beasts pack not found
→ Returns empty array
→ UI shows "No templates available"
→ No crash
```

**Missing JSON files**:
```
fetch('systems/foundryvtt-swse/data/nonheroic.json') → 404
→ Returns empty array
→ UI shows "No templates available"
→ No crash
```

**Malformed JSON**:
```
JSON.parse() throws
→ Caught in try/catch
→ Error logged: "[NPCTemplateDataLoader] Nonheroic data is not an array"
→ Returns empty array
→ No crash
```

### 7.2 Import-Time Errors

**Beast actor not found in pack**:
```
await pack.getDocument(id) → null
→ Error logged
→ Returns null
→ Dialog shows: "Failed to import NPC template"
→ No actor created
```

**Embedded item creation failure**:
```
actor.createEmbeddedDocuments() throws
→ Caught, warning logged
→ Items skipped, actor still valid
→ User notified: "NPC imported but some items may be missing"
→ Actor created and opened
```

### 7.3 User Notifications

**Success**:
```
ui.notifications.info(`NPC "Name" imported successfully!`)
```

**Failure**:
```
ui.notifications.error(`Failed to import NPC template`)
ui.notifications.error(`Import failed: ${error.message}`)
```

**Warnings**:
```
ui.notifications.warn(`Please select a template to import`)
ui.notifications.warn(`Only GMs can import NPC templates.`)
```

---

## 8. Files Created

| File | Purpose | Size |
|------|---------|------|
| `scripts/core/npc-template-data-loader.js` | Load templates from sources | ~2 KB |
| `scripts/engine/import/npc-template-importer-engine.js` | Execute import logic | ~4 KB |
| `scripts/apps/npc-template-importer.js` | UI dialog and controls | ~3 KB |
| `templates/apps/npc-template-importer.hbs` | Handlebars template | ~5 KB |
| `NPC_TEMPLATE_IMPORT_AUDIT.md` | Initial audit report | ~10 KB |
| `NPC_TEMPLATE_IMPORT_REPORT.md` | This report | ~15 KB |

## 9. Files Modified

| File | Change | Impact |
|------|--------|--------|
| `scripts/infrastructure/hooks/actor-sidebar-controls.js` | Added import + handler + button | Low - additive |

---

## 10. Integration Points

### 10.1 Foundry Core APIs Used

- `game.packs.get()` - Access compendium packs
- `await pack.getIndex()` - Get pack index
- `await pack.getDocument(id)` - Load document from pack
- `fetch()` - Load JSON files
- `foundry.utils.deepClone()` - Clone objects
- `Actor.create(data)` - Create actor documents
- `actor.createEmbeddedDocuments()` - Add items to actor
- `actor.sheet.render()` - Open sheet UI

### 10.2 System APIs Used

- `SWSELogger` - Logging
- `NPCTemplateDataLoader` - Data loading (new)
- `NPCTemplateImporterEngine` - Import execution (new)
- `SWSEV2NpcSheet` - Sheet routing (existing)

### 10.3 No Breaking Changes

- No modifications to core actor/item classes
- No modifications to sheet registration
- No modifications to data structure
- No impact on existing character creation flow
- No impact on existing NPC workflows

---

## 11. Testing Checklist

### Phase 1 Direct Import

- [ ] Load beasts compendium and verify templates appear
- [ ] Load nonheroic.json and verify templates appear
- [ ] Load heroic.json and verify templates appear
- [ ] Beast import creates proper actor with items
- [ ] Nonheroic import creates proper actor with abilities
- [ ] Heroic import creates proper actor with abilities
- [ ] Imported actors open on SWSEV2NpcSheet
- [ ] Cancel button closes dialog without creating actor
- [ ] Missing template selection shows warning
- [ ] Error handling is graceful (no console errors)
- [ ] Actor directory is updated after import
- [ ] Duplicate imports work correctly
- [ ] GMs can access, Players cannot

---

## 12. Future Enhancements (Phase 2+)

### 12.1 Planned: Post-Import Customization Wizard

Implement optional "Import and Customize" flow:
1. User selects template
2. Chooses "Import Now" or "Import and Customize"
3. If customize: lightweight wizard for name, portrait, quick edits
4. Finalize and open actor

### 12.2 Potential: Compendium Pack Conversion

Convert nonheroic.json/heroic.json into proper compendium packs:
- Create `packs/nonheroic-npcs` actor pack
- Create `packs/heroic-npcs` actor pack
- Pre-process statblocks into actor documents
- Benefit: Faster loading, Foundry integration

### 12.3 Potential: Enhanced Metadata

Add to templates:
- Challenge rating / XP value
- Suggested encounter roles
- Loot tables
- Notes from source material
- Tags for filtering

### 12.4 Potential: Bulk Import

Allow importing multiple templates at once for dungeon/encounter prep

---

## 13. Performance Considerations

### 13.1 Template Loading

**Lazy Loading**: Templates only load when category is selected
- Faster initial dialog open
- Only loads needed data
- Reduces unnecessary JSON parsing

**Caching**: Templates cached in app instance after first load
- Reduces network requests
- UI remains responsive for re-selection

### 13.2 Actor Creation

**Async Operations**:
- Pack access is async (automatic in Foundry)
- JSON fetch is async
- Actor.create() is async
- All properly awaited

**Item Batch Creation**:
- All items created in single batch via `createEmbeddedDocuments()`
- More efficient than creating items individually

---

## 14. Known Limitations

### 14.1 Phase 1 Direct Import

- **No customization before import** - User cannot adjust name/stats before creation
- **No compendium links for items** - Weapons/feats created as new items, not linked to packs
- **Limited stat mapping** - Only basic ability/defense/HP mapping for JSON templates
- **No portrait/token auto-selection** - Uses system defaults

### 14.2 Future Mitigations

- Phase 2: Post-import wizard for customization
- Enhance: Link created feats/talents to compendium sources
- Enhance: More sophisticated stat/skill mapping
- Enhance: Browse portraits during import

---

## 15. Code Quality

### 15.1 Standards Met

- ✅ Consistent naming conventions
- ✅ Comprehensive logging at debug/error levels
- ✅ Error handling with try/catch
- ✅ Async/await properly used
- ✅ No global state mutations
- ✅ Modular design (separate concerns)
- ✅ JSDoc comments for public methods
- ✅ Handlebars template valid
- ✅ CSS scoped to component

### 15.2 ESLint Compliance

- ✅ No jQuery usage
- ✅ No console.log (using SWSELogger)
- ✅ Proper error handling
- ✅ Const/let (no var)
- ✅ Template strings for formatting

---

## 16. Deployment Notes

### 16.1 Prerequisites

- System already loaded
- Beasts compendium pack present (packs/beasts.db)
- Nonheroic/heroic JSON files present (data/*.json)
- Foundry V13 compatible

### 16.2 Installation Steps

1. Copy new files to system directory:
   - scripts/core/npc-template-data-loader.js
   - scripts/engine/import/npc-template-importer-engine.js
   - scripts/apps/npc-template-importer.js
   - templates/apps/npc-template-importer.hbs

2. Update actor-sidebar-controls.js with NPCTemplateImporter import

3. No config changes needed
4. No migration scripts needed
5. System restart required for changes to load

### 16.3 Rollback

If issues occur:
1. Remove the four new files
2. Revert actor-sidebar-controls.js
3. System restart

---

## Conclusion

Phase 1 NPC Template Import is fully implemented and ready for testing. The system provides a clean, intuitive UI for GMs to import pre-built NPCs from three sources (Beast, Nonheroic, Heroic). All imported actors are properly configured as NPC-type actors and will automatically open on the correct sheet.

The implementation follows existing SWSE patterns, uses proper error handling, and integrates seamlessly into the actor directory sidebar. No breaking changes have been introduced.

---

**Status**: ✅ Ready for QA/Testing
**Date**: 2026-03-28
**Next Phase**: Phase 2 - Post-Import Customization Wizard
