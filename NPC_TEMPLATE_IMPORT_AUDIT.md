# NPC Template Import Audit Report

**Date**: 2026-03-28
**System**: SWSE Foundry VTT (v1.2.1, Foundry V13)
**Status**: Complete

## 1. Compendium & Template Sources Identified

### 1.1 Beast Templates
- **Source**: `packs/beasts` compendium pack (Actor type)
- **Database**: LevelDB format (beasts.db)
- **Content**: Multiple Beast actor documents
- **Status**: ✅ Ready - contains actor data directly

### 1.2 Nonheroic NPC Templates
- **Primary Source**: `/data/nonheroic.json` (CSV-to-JSON format)
- **Secondary Source**: `/data/nonheroic-templates.json` (Character progression template format)
- **Tertiary Source**: `/data/nonheroic/` directory (structured breakdown)
- **Content**: Pre-built NPC statblocks with complete build data
- **Format**: JSON with name, class levels, abilities, skills, feats, talents, items
- **Status**: ✅ Ready - structured NPC data available

### 1.3 Heroic NPC Templates
- **Source**: `/data/heroic.json` (CSV-to-JSON format)
- **Content**: Pre-built heroic-level NPC statblocks with complete build data
- **Format**: JSON with full game statistics
- **Status**: ✅ Ready - structured NPC data available

## 2. Document & Actor Structure Analysis

### 2.1 NPC Actor Type
- **Actor Base Class**: `scripts/actors/v2/npc-actor.js` (extends base character logic)
- **Sheet Registration**: `SWSEV2NpcSheet` (registered in index.js)
- **Sheet Location**: `scripts/sheets/v2/npc-full-sheet.js`
- **Progression Engine**: `scripts/engine/progression/npc-progression-engine.js`
- **Key Difference from Character**: NPCs use derived computation but may have simplified build paths

### 2.2 Template Data Structure (Nonheroic/Heroic JSON)
Each entry contains:
- **Name**: Display name
- **Size**: Medium/Large/etc
- **Species**: Species entry
- **Class Levels**: Object with class -> level mapping (e.g., `{"Soldier": 3}`)
- **Abilities**: STR, DEX, CON, INT, WIS, CHA scores
- **Defenses**: Reflex, Flat-Footed, Fortitude, Will Defense values
- **Hit Points**: Current HP and Damage Threshold
- **Skills**: Trained skills with modifiers
- **Feats**: List of feat names
- **Talents**: List of talent names
- **Languages**: List of known languages
- **Weapons**: Melee and Ranged with attack bonuses and damage
- **Force Powers/Secrets/Techniques**: If applicable
- **Gear**: Carried equipment list

### 2.3 Beast Actor Structure (from Beasts Pack)
- **Type**: Actor documents (type: "npc")
- **Subtype**: Likely flagged as "beast" or similar
- **Contains**: Full actor system data with stats, items, abilities
- **Status**: Already in compendium - can be imported directly

## 3. Actor Creation & Import Patterns

### 3.1 Existing Actor Creation Flows
- **Character Creation**: `TemplateCharacterCreator` class
  - Uses `CharacterTemplates.getTemplates()`
  - Creates actor via `createActor()` helper
  - Integrates with progression framework
  - Located in `scripts/apps/template-character-creator.js`

- **Directory Controls**: `scripts/infrastructure/hooks/actor-sidebar-controls.js`
  - Sidebar buttons: Chargen, Store, Templates, GM Dashboard
  - GM-only for Templates button
  - Extensible pattern for adding new buttons

### 3.2 Actor Creation Helper
- **Location**: `scripts/core/document-api-v13.js`
- **Function**: `createActor(type, data, name, ...)`
- **Pattern**: Standard Foundry document creation with validation

## 4. Sheet Routing & NPC Registration

### 4.1 Sheet Registration (from index.js)
```javascript
ActorCollection.registerSheet("foundryvtt-swse", SWSEV2NpcSheet, {
  // ... options
});
```

### 4.2 Sheet Selection
- NPC actors automatically route to SWSEV2NpcSheet
- Routing likely based on actor type + subtype flags
- Default NPC sheet is appropriate for imported templates

## 5. Data Normalization Concerns

### 5.1 Beast Templates (from Beasts Pack)
- ✅ **Status**: Ready for direct import
- Already in actor format
- Include embedded items, abilities, and system data
- No additional normalization needed

### 5.2 Nonheroic/Heroic Templates (from JSON)
- ⚠️ **Status**: Requires actor document creation from statblock data
- Template data is flat statblock structure, not actor document
- **Normalization Required**:
  1. Parse statblock data (Name, Class Levels, Abilities, Skills, etc.)
  2. Create actor document with type: "npc"
  3. Populate system data:
     - Ability scores (STR, DEX, CON, INT, WIS, CHA)
     - Skills with modifiers
     - Class levels and resulting BAB/defense calculations
     - HP and Damage Threshold
  4. Embed items:
     - Create Weapon items from Melee/Ranged Weapons list
     - Create Gear items from equipment list
     - Link Class, Species, Feats, Talents from compendiums
  5. Set flags/metadata:
     - Type: "npc"
     - Subtype: "nonheroic" or "heroic" (for distinction)

### 5.3 Key Fields Needing Mapping
- **Classes**: Class Levels → Embedded Class items with level data
- **Abilities**: Stat object → system.abilities mapping
- **Defenses**: Pre-calculated values → may need recalculation via defense-calculator.js
- **Skills**: Skill name + modifier → system.skills with proper Foundry references
- **Weapons**: Weapon description → Weapon items from packs or created inline
- **Feats/Talents**: Names → reference items from compendium packs
- **Species**: Species name → reference from species compendium

## 6. Recommended Import Strategy

### 6.1 Beast Import
- **Approach**: Direct import
- **Source**: Beasts compendium pack
- **Logic**:
  1. Load beast actor documents from pack
  2. Clone to working actor
  3. Create new actor document in world
  4. Open sheet - no further processing needed

### 6.2 Nonheroic/Heroic NPC Import
- **Approach**: Parse + Build + Create
- **Source**: JSON template files (data/nonheroic.json, data/heroic.json)
- **Logic**:
  1. Parse JSON template entry
  2. Create new NPC actor document
  3. Map template data to actor system fields
  4. Parse class levels and resolve class items from compendium
  5. Parse and embed weapons/items
  6. Parse and link feats/talents from compendium
  7. Create actor in world
  8. Optionally: Run derived calculations (defenses, HP, BAB)
  9. Open sheet

### 6.3 Safe Normalization
- Use ActorEngine if available for consistency checks
- Defer to existing damage/HP/defense calculators
- Keep imported data as close to template as possible
- Flag imported actors for potential user review/adjustment
- Avoid unnecessary migration/cleanup steps

## 7. Architecture Decisions

### 7.1 Code Location
- **UI App**: `scripts/apps/npc-template-importer.js` (new)
- **Import Helper**: `scripts/engine/import/npc-template-importer-engine.js` (new)
- **Data Loader**: `scripts/core/npc-template-data-loader.js` (new)
- **Integration Point**: Add button to `actor-sidebar-controls.js`

### 7.2 Reuse Strategy
- Reuse `createActor()` from document-api-v13.js
- Reuse existing skill/ability resolvers from utils/
- Reuse compendium pack loaders (game.packs)
- Reuse ActorEngine for consistency if applicable
- Avoid duplicating full builder logic - keep lightweight

### 7.3 Template Authority
- Compendium beasts: Direct, no transformation
- JSON templates (nonheroic/heroic): Parsed, normalized to actor, then finalized
- No secondary template database needed
- JSON files remain source of truth for nonheroic/heroic data

## 8. UI/UX Flow

### 8.1 Entry Point
- New button in Actor Directory sidebar: "Import NPC"
- GM-only access (matches Templates button pattern)
- Launches NPC Template Importer dialog

### 8.2 Workflow
1. **Category Selection**: Choose Beast / Nonheroic / Heroic
2. **Template Listing**: Show available templates for category
3. **Template Selection**: Browse and select specific template
4. **Import Options**: (Phase 2) Choose Import Now vs Customize
5. **Confirmation**: Create actor, open sheet

### 8.3 Template Browser UI
- Show template name
- Show preview image if available
- Show brief metadata (level/class for NPCs, size/type for beasts)
- Filter/search functionality
- Category grouping

## 9. Error Handling Strategy

### 9.1 Missing Data
- Missing compendium entry → Show error, don't create actor
- Malformed JSON template → Show error with details
- Missing class/species reference → Create with best effort or skip item

### 9.2 Failed Creation
- Actor creation failure → Rollback, show error
- Embedded item creation failure → Log warning, skip item, proceed
- Derived calculation failure → Use template values, log for review

### 9.3 User Feedback
- Success notification with actor name
- Error notifications with actionable info
- Creation in progress indicator for complex builds

## 10. Verification Checklist

- [ ] Beast templates load from beasts compendium
- [ ] Nonheroic templates load from data/nonheroic.json
- [ ] Heroic templates load from data/heroic.json
- [ ] UI lists templates with images/metadata
- [ ] Selecting template creates actor in world
- [ ] Imported actor has correct system data populated
- [ ] Imported actor opens on SWSEV2NpcSheet
- [ ] Embedded items (weapons, gear) import correctly
- [ ] Class/Species/Feats reference correct compendium entries
- [ ] Abilities and defenses calculated correctly
- [ ] Beast import preserves all actor properties
- [ ] Nonheroic/Heroic import normalizes statblock → actor
- [ ] Cancel/error handling is graceful
- [ ] GM-only access enforced
- [ ] No player-character builder logic leaked

## 11. Known Limitations & Future Considerations

- **Phase 1**: Direct import only (no post-import customization)
- **Phase 2**: Optional post-import customization wizard
- Nonheroic/Heroic templates are statblock-based, may need UA/house rules adjustments after import
- Beast templates already in compendium - immediate ready for import
- No automatic duplicate name handling (user responsible for naming)

---

## Summary

✅ **Ready for Implementation**

All three NPC template sources have been identified and validated:
1. **Beasts**: Direct from compendium (high fidelity)
2. **Nonheroic NPCs**: From JSON templates (requires normalization)
3. **Heroic NPCs**: From JSON templates (requires normalization)

The system already has the foundational patterns (TemplateCharacterCreator, actor creation helpers, sidebar controls). A new NPC Template Importer app can reuse these patterns and integrate cleanly into the existing sidebar.

Recommend implementing in two phases:
- **Phase 1**: Direct import for all three categories
- **Phase 2**: Lightweight post-import customization wizard
