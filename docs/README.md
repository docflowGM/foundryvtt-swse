# Star Wars Saga Edition (SWSE) for Foundry VTT

A comprehensive, production-ready implementation of the Star Wars Saga Edition d20 role-playing game system for Foundry Virtual Tabletop. Play full campaigns with automated character progression, advanced combat mechanics, Force powers, vehicles, and complete SWSE rules integration.

**Version**: 1.1.214
**License**: MIT
**Compatibility**: Foundry VTT v11-13
**Status**: ✅ Production Ready

## Quick Links

- 🚀 [Getting Started Guide](./GETTING_STARTED.md) - New to SWSE? Start here!
- 📖 [Complete User Guide](./USER_GUIDE.md) - How to use every feature
- ✨ [Features Overview](./FEATURES.md) - Full list of system capabilities
- 📚 [About This Project](./ABOUT.md) - Project overview and architecture
- 💻 [Developer Guide](./docs/CONTRIBUTING.md) - Contributing and development setup
- 🏗️ [System Architecture](./docs/Design.md) - Technical architecture overview

## What is SWSE?

The Star Wars Saga Edition (SWSE) is a d20-based role-playing game set in the Star Wars universe. This system implementation brings SWSE to Foundry VTT with:

- ✅ **Complete character creation and progression** from level 1-20
- ✅ **Multi-class support** with automatic feature grants
- ✅ **Advanced combat system** with grappling, vehicles, and condition tracking
- ✅ **Force powers system** with Force Points and Dark Side tracking
- ✅ **200+ talents** organized in visual talent trees
- ✅ **1000+ game items** including weapons, armor, equipment, feats, and more
- ✅ **Droid system** with specialized character progression
- ✅ **Vehicle combat** with modification and upgrade management
- ✅ **Comprehensive houserules** for customizing gameplay

## Quick Start

### Installation

1. **Download** the latest release from the [Releases page](https://github.com/docflowGM/foundryvtt-swse/releases)
2. **In Foundry**, go to **Game Systems** → **Install System**
3. **Paste** the manifest URL:
   ```
   https://github.com/docflowGM/foundryvtt-swse/releases/download/latest/system.json
   ```
4. **Click Install** and start your SWSE world!

### Create Your First Character

1. Open your SWSE world in Foundry
2. Click **Create Actor** → Select **Character**
3. Click the blue **Create Character** button on the character sheet
4. Follow the character generation wizard (7 steps)
5. Review your character and click **Finalize**

**That's it!** Your character is ready to play.

For detailed instructions, see [Getting Started Guide](./GETTING_STARTED.md).

## Key Features

### Character Systems
- **6 Core Ability Scores** (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
- **100+ Skills** with training mechanics and bonuses
- **3 Defense Types** (Fortitude, Reflex, Will) with automatic calculation
- **Hit Points** with CON modifier and class hit die rolling
- **Multi-Classing** with automatic class feature granting

### Combat & Action
- **Initiative System** with 1d20 rolls and DEX modifiers
- **Attack Rolls** with Base Attack Bonus (BAB) calculations
- **Damage System** with automated HP reduction
- **Grappling Mechanics** (Grab → Grabbed → Grappled → Pinned states)
- **Vehicle Combat** with specialized rules
- **Active Effects** for temporary buffs/debuffs
- **Condition Tracking** for status effects

### Force & Powers
- **Force Training** for Force-sensitive characters
- **Force Points** with regeneration mechanics
- **30+ Force Powers** from basic to advanced
- **Force Techniques** and Force Secrets
- **Lightsaber Forms** with form-specific bonuses
- **Dark Side Score** tracking

### Progression
- **Character Generation Wizard** with 6 ability generation methods
- **Level-Up System** with HP rolling and feature grants
- **Talent Trees** with visual prerequisite checking
- **200+ Talents** organized by class
- **150+ Feats** with prerequisites and actions
- **Level-Based Features** that grant automatically

### Equipment & Items
- **50+ Weapons** with damage types and special properties
- **Armor System** with DEX penalties and armor mastery
- **100+ Equipment Items** including armor, tools, and accessories
- **Equipment Upgrades** for weapons and armor modifications
- **Drag-and-Drop** item management

### Species & Templates
- **20+ Species** (Humans, Twi'leks, Wookiees, Droids, etc.)
- **Species Bonuses** (ability scores, traits, skills)
- **Character Templates** for quick character creation
- **NPC Templates** for non-heroic units

### Vehicles & Droids
- **Vehicle System** with stats and modifications
- **Droid System** with specialized progression
- **Pilot Actions** for vehicle control
- **Modification Slots** for upgrades

## Documentation

All documentation is organized for easy navigation:

- **[ABOUT.md](./ABOUT.md)** - Comprehensive project overview
- **[FEATURES.md](./FEATURES.md)** - Detailed feature descriptions
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - New player quick start
- **[USER_GUIDE.md](./USER_GUIDE.md)** - Complete how-to guide for all features
- **[docs/](./docs/)** - Technical documentation, architecture, developer guides
  - [Design.md](./docs/Design.md) - System architecture
  - [Rules.md](./docs/Rules.md) - SWSE rules implementation
  - [CONTRIBUTING.md](./docs/CONTRIBUTING.md) - Developer guide
  - [HOUSE_RULES_GUIDE.md](./docs/HOUSE_RULES_GUIDE.md) - Houserule options

## System Specifications

### Technical Stack
- **Framework**: Foundry VTT v11-13
- **Language**: JavaScript ES6 Modules
- **Styling**: SASS/SCSS
- **Templates**: Handlebars
- **Architecture**: Modular hook-based system with data models

### Content Library
- **27 Compendium Packs** with 1000+ items
- **50+ Classes** with complete progression
- **200+ Talents** in visual trees
- **150+ Feats** with prerequisites
- **20+ Species** with racial traits
- **30+ Force Powers**
- **50+ Weapons** and **50+ Armor pieces**
- **100+ Equipment items**

### System States
- **Actor Types**: Character, NPC, Droid, Vehicle
- **Item Types**: Weapons, Armor, Equipment, Feats, Talents, Force Powers, Classes, Species, Upgrades
- **Data Models**: Foundry v13 DataModel architecture with validation

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Testing procedures
- Architecture overview

## Support & Issues

Found a bug or have a feature request? Please report it on the [GitHub Issues page](https://github.com/docflowGM/foundryvtt-swse/issues).

## Credits

**Created by**: Doc Flow
**License**: MIT

This is an unofficial Star Wars Saga Edition system implementation. Star Wars is a trademark of Lucasfilm Ltd. This system is created for personal use and learning purposes.

## Getting Help

- 📚 Check the [User Guide](./USER_GUIDE.md) for feature how-tos
- 🎓 Read [GETTING_STARTED.md](./GETTING_STARTED.md) for setup help
- 🔧 See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development questions
- 🐛 Report bugs on [GitHub Issues](https://github.com/docflowGM/foundryvtt-swse/issues)

---

**Ready to get started?** Jump to the [Getting Started Guide](./GETTING_STARTED.md)! 🚀
