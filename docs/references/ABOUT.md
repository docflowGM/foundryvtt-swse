# About the SWSE FoundryVTT System

## Project Overview

Star Wars Saga Edition (SWSE) for FoundryVTT is a comprehensive, production-ready implementation of the Star Wars Saga Edition d20 role-playing game system. It provides complete automation for character creation, progression, combat, Force powers, vehicles, and all SWSE game rules.

**Project Name**: foundry-swse
**Version**: 1.1.214
**Created by**: Doc Flow
**License**: MIT
**Status**: ✅ Production Ready - Actively Maintained

## What This System Does

This is not just a character sheet system—it's a complete SWSE game engine for Foundry VTT featuring:

### For Players
- **Automated Character Creation** - Step-by-step wizard guides you through creating a SWSE character
- **Streamlined Character Sheets** - Modern UI with all character information at your fingertips
- **Combat Automation** - Click buttons to attack, roll damage, apply effects automatically
- **Force Power Management** - Track Force Points, manage power usage, calculate power slots
- **Talent & Feat Selection** - Visual talent trees and feat selection with prerequisite checking
- **Equipment & Inventory** - Manage weapons, armor, items with automatic bonuses

### For Game Masters
- **NPC Tools** - Create NPCs, monsters, and enemies with the same system as player characters
- **Combat Management** - Track initiative, conditions, effects, and damage for the entire party
- **World Data** - 27 compendium packs with 1000+ items ready to use
- **Customization** - 18 houserule systems to customize gameplay
- **Templates** - Pre-built character templates and starting options
- **Followers** - Create and manage follower characters that level with the party

### For Developers
- **Modern Architecture** - Foundry v13 DataModel system with modular hooks
- **Extensive Codebase** - 282 JavaScript files with clear separation of concerns
- **Compendium System** - 27 packs with organized content
- **Extensible Design** - Easy to add custom content and mechanics
- **Well-Documented** - 68+ documentation files covering all systems

## Key Statistics

### Content Library
- **27 Compendium Packs** with organized game content
- **1000+ Game Items**:
  - 50+ Classes with complete progressions
  - 200+ Talents organized in visual trees
  - 150+ Feats with prerequisites and action grants
  - 50+ Weapons with varied damage and properties
  - 50+ Armor pieces with different AC values
  - 100+ Equipment items (tools, accessories, etc.)
  - 20+ Species with racial bonuses
  - 30+ Force Powers
  - 20+ Vehicles
  - Multiple upgrade, background, and skill items

### Code Structure
- **282 JavaScript Files** organized by system:
  - 5 core engines (Progression, Defense, Skills, Rolls, Feats)
  - 9 combat system files
  - 40+ progression system files
  - 20+ actor and item system files
  - 30+ user interface applications
  - 18 houserule systems
  - Extensive utilities and helpers

### Documentation
- **68+ Documentation Files** (28,000+ lines):
  - User guides and how-tos
  - Technical architecture documentation
  - Implementation guides and roadmaps
  - Analysis and design documents
  - Bug reports and fixes
  - Developer contribution guides

### Supported Foundry Versions
- **v11** - Full support
- **v12** - Full support
- **v13** - Full support (latest)

## Technical Architecture

### Core Systems

**1. Progression Engine** (`scripts/engine/progression.js`)
- Unified system for character generation and level-up
- Feature granting at specific levels
- HP rolling with CON modifiers
- Ability score increases every 4 levels
- Skill and feat selection tracking

**2. Defense System** (`scripts/engine/DefenseSystem.js`)
- Calculates Fortitude, Reflex, Will defenses
- Incorporates ability modifiers, class bonuses, armor
- Tracks effects and temporary modifiers
- Multi-class defense stacking

**3. Skill System** (`scripts/engine/SkillSystem.js`)
- 100+ skill management
- Training bonuses and specialization
- Ability modifier application
- Effect and feat bonus stacking

**4. Combat System** (`scripts/combat/`)
- Initiative calculations
- Attack rolls with BAB and modifiers
- Damage application and threshold tracking
- Grappling mechanics (Grab → Grabbed → Grappled → Pinned)
- Vehicle combat with specialized rules
- Active effects for buffs/debuffs

**5. Force Power System** (`scripts/apps/force/`)
- Force Point tracking with regeneration
- Force Power suite calculation
- Dark Side score tracking
- Lightsaber form bonuses

### Application Architecture

The system uses a modular architecture with:

- **Actor Sheets**: Character, NPC, Droid, Vehicle - specialized sheets for each actor type
- **Item Sheets**: Weapons, Armor, Equipment, Feats, Talents, Force Powers, Classes, Species
- **Dialog Applications**: Character generator, level-up wizard, talent tree visualizer, etc.
- **Manager Classes**: Force power manager, active effects manager, vehicle modification manager
- **Hook System**: Extensive Foundry hooks for initialization, data updates, and events
- **Data Models**: Foundry v13 DataModel system for structured, validated data

### Data Organization

- **template.json** - Actor and Item data schemas
- **Compendiums** - 27 organized packs with game content
- **Data Files** - JSON data for droid systems, constants, and settings
- **Migrations** - System for upgrading actor/item data between versions

## Feature Categories

### Character Management
- Multi-step character generation wizard (7 steps)
- 6 ability generation methods (Point Buy, Rolling, Standard Array, etc.)
- Multi-class support with automatic feature tracking
- Level-up system with HP rolling and feature granting
- Character templates for quick creation
- Experience and leveling management

### Skills & Abilities
- 100+ skills with training mechanics
- 6 core ability scores (STR, DEX, CON, INT, WIS, CHA)
- Ability modifiers and calculations
- Skill substitution system
- Feat-based skill bonuses

### Combat & Action
- Initiative system with DEX modifiers
- Attack rolls with BAB calculations
- Damage application with threshold tracking
- Grappling system with state management
- Vehicle combat rules
- Active effects for temporary modifiers
- Condition tracking system
- Combat action browser

### Force & Magic
- Force Sensitivity tracking
- Force Training feats
- Force Points with regeneration
- 30+ Force Powers (from basic to advanced)
- Force Techniques and Secrets
- Lightsaber Forms with bonuses
- Dark Side Score tracking
- Force Suite calculation

### Progression & Development
- Character generation workflow
- Level-up system with feature grants
- Talent trees with visual display
- 200+ talents with prerequisites
- 150+ feats with prerequisites
- Starting feature grants
- Ability score increases every 4 levels
- Class-based progression paths

### Equipment & Items
- 50+ weapons with varied properties
- Armor system with DEX penalties
- 100+ equipment items
- Equipment upgrades system
- Drag-and-drop item management
- Weight and cost tracking
- Proficiency system

### Species & Templates
- 20+ playable species
- Species ability score bonuses
- Species trait grants
- Starting skill bonuses
- Language selection
- Character templates
- NPC templates

### Vehicles & Droids
- Vehicle actor type with full stats
- Vehicle combat mechanics
- Modification system with upgrade slots
- Pilot actions and abilities
- Droid actor type with specialized progression
- Droid degrees system (D1-D5)
- 30+ droid system components
- Droid points alternative progression

### Customization & Houserules
- **Grappling Variants** - Different grappling rule options
- **Healing Systems** - Custom healing and recovery mechanics
- **Condition Track** - Alternative health tracking system
- **Flanking Bonuses** - Tactical bonus system
- **Skill Training Variants** - Different skill advancement options
- **Status Effects** - Visual buff/debuff system
- **Preset Configurations** - Save/load rule combinations
- **Theme System** - 6 built-in themes plus custom options

## File Organization

```
/home/user/foundryvtt-swse/
├── scripts/
│   ├── engine/                 # Core game engines
│   ├── combat/                 # Combat systems
│   ├── actors/                 # Actor sheet implementations
│   ├── items/                  # Item sheet implementations
│   ├── progression/            # Character progression systems
│   ├── apps/                   # User-facing applications
│   ├── houserules/             # Optional game mechanics
│   ├── data/                   # Game data constants
│   ├── data-models/            # Foundry data model definitions
│   ├── utils/                  # Utility functions
│   ├── core/                   # Core configuration
│   ├── hooks/                  # Foundry hook handlers
│   ├── macros/                 # Macro support
│   └── templates/              # Handlebars template support
├── styles/
│   ├── src/                    # SASS source files
│   └── core/                   # Compiled CSS output
├── templates/                  # Handlebars HTML templates
├── packs/                      # Compendium packs (27 total)
├── docs/                       # Documentation (68+ files)
├── data/                       # Game data JSON files
├── system.json                 # System manifest
├── template.json               # Data schema definitions
├── package.json                # NPM configuration
├── README.md                   # Main documentation
├── ABOUT.md                    # This file
├── FEATURES.md                 # Detailed feature list
├── GETTING_STARTED.md          # Quick start guide
└── USER_GUIDE.md               # Complete how-to guide
```

## Development & Maintenance

### Active Development
- Regular bug fixes and improvements
- New feature additions based on SWSE canon
- Foundry VTT version compatibility updates
- Performance optimization

### Code Quality
- ESLint for code standards
- Prettier for code formatting
- Comprehensive error logging
- Security review for user inputs
- Hook registration validation

### Testing
- Character generation testing
- Combat system verification
- Progression engine validation
- Force power mechanics testing
- Equipment and item system testing

### Documentation
- Comprehensive user guides
- Technical architecture documentation
- Developer contribution guides
- Implementation roadmaps
- API documentation for extensions

## Compatibility Notes

### Foundry VTT
- **Minimum**: v11
- **Recommended**: v13
- **Maximum**: v13 (or latest)

### Module Compatibility
- Compatible with most general-purpose modules
- Some effects modules may affect defense calculations
- Character portrait modules work seamlessly
- Dice parser modules enhance rolling

### Browser Support
- Chrome/Chromium-based browsers (recommended)
- Firefox
- Safari (limited testing)

## Future Development

The system roadmap includes:
- Enhanced vehicle combat UI
- Expanded prestige class system
- Additional houserule options
- Performance optimizations
- Extended localization support
- Community content integration

## Getting Help & Reporting Issues

### Documentation
- **Main Guide**: See [README.md](./README.md)
- **Getting Started**: See [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Complete Features**: See [FEATURES.md](./FEATURES.md)
- **How-To Guide**: See [USER_GUIDE.md](./USER_GUIDE.md)
- **Technical Docs**: See [docs/](./docs/) folder

### Bug Reports & Feature Requests
- Report on [GitHub Issues](https://github.com/docflowGM/foundryvtt-swse/issues)
- Include version information
- Describe steps to reproduce
- Attach screenshots if applicable

### Contributing
- See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines
- Fork the repository
- Create a feature branch
- Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for full details.

## Disclaimer

This is an unofficial Star Wars Saga Edition system implementation. Star Wars is a trademark of Lucasfilm Ltd. This system is created for personal use in TTRPG campaigns and follows fair use principles for game mechanics.

---

For more information, see:
- **User Guide**: [USER_GUIDE.md](./USER_GUIDE.md)
- **Features**: [FEATURES.md](./FEATURES.md)
- **Getting Started**: [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Developer Guide**: [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
