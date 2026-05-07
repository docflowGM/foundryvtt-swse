# Repository Structure

This document describes the organization of the SWSE (Star Wars Saga Edition) FoundryVTT system.

## Root Directory

### Core System Files
- **index.js** - Main system initialization and hook registration
- **system.json** - Foundry system manifest with metadata, packs, settings
- **template.json** - Actor and item data structure definitions
- **package.json** - Node.js project metadata and scripts
- **.gitignore** - Git ignore rules

### Configuration Directories
- **Config/** - System configuration files (license, options)
- **data/** - Game data files (backgrounds, archetypes, classes, species, etc.)

## Source Code Structure (`scripts/`)

### Core Engine (`scripts/engine/`)
- **core/** - Central mutation and update infrastructure (legacy, unused in v2)
  - ActorCommands.js - Legacy actor mutation commands
  - UpdatePipeline.js - Legacy update pipeline (annotated as legacy-disabled-infrastructure)
- **systems/** - Game system implementations
  - DefenseEngine.js - Defense calculations
  - ModifierEngine.js - Modifier application system
  - SkillEngine.js - Skill calculation engine
  - species/ - Species trait system
  - progression/ - Character progression and leveling

### Actor/Item Systems
- **actors/** - Actor-related code
  - v2/ - Version 2 actor system (canonical runtime)
    - base-actor.js - Base actor class with core functionality
    - base-actor-mixins/ - Mixins for additional actor functionality
- **items/** - Item-related code
  - swse-item-sheet.js - Item sheet implementation

### UI and Sheets (`scripts/sheets/` and `scripts/ui/`)
- **sheets/v2/** - Version 2 character sheet system (canonical)
  - character-sheet.js - Main character sheet class
  - character-sheet/** - Character sheet components and handlers
  - vehicle-sheet.js - Vehicle sheet
  - droid-sheet.js - Droid sheet
- **ui/** - UI systems and managers
  - discovery/ - Discovery system
  - action-palette/ - Action suggestion/palette system
  - ui-manager.js - Central UI management

### Legacy Components (Disabled)
- **swse-actor.js** - Legacy character actor (v1, disabled, marked with @mutation-exception)
- **swse-actor-sheet.js** - Legacy character sheet (v1, removed from registration)
- **swse-droid.js** - Droid sheet (v1)
- **swse-vehicle.js** - Vehicle sheet (v1)

### Utilities and Helpers
- **utils/** - Utility functions
  - logger.js - System logging
  - helpers/ - Helper functions
- **core/** - Core system utilities
  - config.js - Canonical configuration registry
  - swse-data.js - Data access and caching
  - world-data-loader.js - World data auto-loading
  - settings.js - System settings registration
- **infrastructure/** - Infrastructure systems
  - hooks/ - Hook registration and handlers
- **scene-controls/** - Scene control initialization

### Items and Equipment
- **items/** - Item definitions and sheets
- **store/** - Store system for buying/selling equipment

## Packs (`packs/`)

Compendium pack files containing game data:
- **archetypes.db** - Class archetypes
- **armor.db** - Armor items
- **backgrounds.db** - Character backgrounds
- **classes.db** - Character classes
- **combat-actions.db** - Combat maneuvers and actions
- **conditions.db** - Condition statuses
- **droids.db** - Droid templates
- **equipment.db** - General equipment
- **feats.db** - Character feats
- **heroic.db** - Heroic-tier force powers and items
- **languages.db** - Languages
- **lightsaber-accessories.db** - Lightsaber modifications
- **lightsaber-crystals.db** - Lightsaber crystals
- **nonheroic.db** - Non-heroic force powers
- **sample-active-abilities.db** - Sample abilities
- **skills.db** - Skill definitions
- **species.db** - Character species
- **talents.db** - Talent definitions
- **talenttrees.db** - Talent trees
- **vehicles.db** - Vehicle templates
- **weapon-upgrades.db** - Weapon modifications
- **weapons.db** - Weapons

*Total: 55 compendium packs*

## Templates (`templates/`)

Handlebars template files for rendering UI:
- **actors/** - Actor sheet templates
  - character/ - Character sheet templates
    - v2/ - Version 2 character sheet templates (canonical)
    - v1/ - Version 1 character sheet templates (legacy, unused)
  - droid/ - Droid sheet templates
  - vehicle/ - Vehicle sheet templates
- **items/** - Item sheet templates
- **shared/** - Shared template components
- **partials/** - Reusable template partials

## Styles (`styles/`)

CSS stylesheets for UI rendering organized by component:
- **system/** - System-wide styles
- **apps/** - Application window styles
- **sheets/** - Sheet-specific styles

## Tools and Utilities

### scripts/
- **load-templates.js** - Handlebars template preloading

### tools/
- **validate-partials.mjs** - Template partial validation tool
- **validate-pack.mjs** - Pack file validation
- **migrations/** - One-off migration scripts
  - migrate-forcepower-type.py - Force power type canonicalization (Phase 5)
- **VALIDATION_COMMANDS.sh** - Validation helper scripts

## Documentation

### docs/
- **reports/** - Phase reports and audit documentation
  - HOLONET_*.md - Phase summary reports
- **repo-structure.md** - This file (repository organization)

### archive/
- **root-cleanup/** - Archived root-level files from Phase 7 cleanup
  - APPLY_METADATA.js - Archived metadata application utility
  - repo_skeleton.txt - Archived repository skeleton reference

## Key Architectural Notes

### v2 as Canonical Runtime
- Character sheet: SWSEV2CharacterSheet is registered as default for "character" type
- Actor class: SWSEV2BaseActor is the canonical actor document class
- Legacy v1 components (SWSEActor, SWSEActorSheet) are disabled and removed from registration

### Item Type Canonicalization
21 canonical item types defined in scripts/core/config.js and template.json:
- Core: armor, equipment, weapon, weapon-upgrade, vehicleWeapon, vehicleWeaponRange
- Combat: feat, maneuver, combat-action, talent, talenttree, specialCondition
- Character: class, species, background, language, attribute
- Powers: force-power
- Utility: condition, extra-skill-use

### Actor Ability Canonicalization
Actor ability scores stored in system.abilities with canonical IDs:
- str, dex, con, int, wis, cha
(Previously used system.attributes; all active code updated to system.abilities)

### Mutation Governance
All actor/item mutations must route through ActorEngine or be annotated with @mutation-exception.
- Legacy mutations in disabled v1 code: @mutation-exception legacy-disabled-character-sheet
- Legacy infrastructure: @mutation-exception legacy-disabled-infrastructure
- World items (unowned compendium items): @mutation-exception world-item
- Proper routing: via ActorEngine.updateActor() in v2 code

### Pack Integrity
All 55 pack files referenced in system.json have been validated:
- Force power items migrated from "forcepower" to canonical "force-power" type
- All pack paths end with .db extension pointing to actual NDJSON files
- All 55 packs are present in packs/ directory and listed in manifest

---
*Last updated: Phase 7 - Repository Cleanup*
