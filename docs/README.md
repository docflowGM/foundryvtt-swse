# SWSE Documentation Index

Welcome to the comprehensive documentation for Star Wars Saga Edition (SWSE) for FoundryVTT. This folder contains all technical, developer, and reference documentation.

## 🚀 Getting Started (Start Here!)

**New to SWSE?** Start with the root-level guides:
- **[README.md](../README.md)** - Main project overview and quick start
- **[GETTING_STARTED.md](../GETTING_STARTED.md)** - Quick start guide for new users
- **[FEATURES.md](../FEATURES.md)** - Complete feature list and descriptions
- **[USER_GUIDE.md](../USER_GUIDE.md)** - Detailed how-to guide for all features
- **[ABOUT.md](../ABOUT.md)** - Project overview and architecture

---

## 📚 User Documentation

### Essential Guides
- **[HOUSE_RULES_GUIDE.md](./HOUSE_RULES_GUIDE.md)** - Enable and use optional houserule systems
- **[THEME-SYSTEM.md](./THEME-SYSTEM.md)** - Configure visual themes for your game
- **[Assets_Guide.md](./Assets_Guide.md)** - Guide to organizing assets and media
- **[Skills and Feats Guide](./tools/skills-and-feats-guide.md)** - Detailed skill and feat reference

### Feature Guides
- **[Combat Enhancements](./COMBAT_ENHANCEMENTS.md)** - Enhanced combat system documentation
- **[Vehicle Combat](./VEHICLE_COMBAT.md)** - Vehicle combat rules and mechanics
- **[Force Powers Analysis](./tools/force-powers-analysis.md)** - Force power system reference

---

## 🏗️ Architecture & Design

### System Design
- **[Design.md](./Design.md)** - System architecture overview
- **[Rules.md](./Rules.md)** - How SWSE rules are implemented
- **[NAMESPACE.md](./NAMESPACE.md)** - Global namespace documentation
- **[DATA_MODEL.md](./DATA_MODEL.md)** - Data model definitions

### Character Systems
- **[CHARACTER_SHEET_ANALYSIS.md](./CHARACTER_SHEET_ANALYSIS.md)** - Character sheet structure
- **[CHARACTER_TEMPLATES.md](./CHARACTER_TEMPLATES.md)** - Character template system
- **[NONHEROIC_CHARACTERS.md](./NONHEROIC_CHARACTERS.md)** - Non-heroic NPC system

### Progression Systems
- **[PROGRESSION_ENGINE_ANALYSIS.md](./PROGRESSION_ENGINE_ANALYSIS.md)** - Deep dive into progression engine
- **[PROGRESSION_ARCHITECTURE.md](./PROGRESSION_ARCHITECTURE.md)** - Progression system architecture
- **[COMPLETE_PROGRESSION_SUMMARY.md](./COMPLETE_PROGRESSION_SUMMARY.md)** - Progression overview
- **[TALENT_TREE_FLOW_MAP.md](./TALENT_TREE_FLOW_MAP.md)** - Talent tree system flow
- **[TALENT_FEAT_IMPLEMENTATION_ARCHITECTURE.md](./tools/feats-talents-analysis.md)** - Talent/Feat architecture

### Core Systems
- **[HOOK_ANALYSIS.md](./HOOK_ANALYSIS.md)** - Detailed hook system analysis
- **[HOOK_SUMMARY.md](./HOOK_SUMMARY.md)** - Hook reference and summary
- **[BUTTON_HANDLER_MATRIX.md](./BUTTON_HANDLER_MATRIX.md)** - Button handler documentation
- **[SHEET_IMPROVEMENTS.md](./SHEET_IMPROVEMENTS.md)** - Character sheet improvements

---

## 🔧 Implementation Guides

### Setup & Integration
- **[SYSTEM_INITIALIZATION_GUIDE.md](./SYSTEM_INITIALIZATION_GUIDE.md)** - How system initializes
- **[MASTER_INTEGRATION_GUIDE.md](./MASTER_INTEGRATION_GUIDE.md)** - Integration guide
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation
- **[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)** - Implementation phases

### Advanced Features
- **[ADVANCEMENT_DOCUMENTATION_INDEX.md](./ADVANCEMENT_DOCUMENTATION_INDEX.md)** - Advancement system docs
- **[ADVANCEMENT_FLOW_DIAGRAMS.md](./ADVANCEMENT_FLOW_DIAGRAMS.md)** - Flow diagrams
- **[LEVEL_BASED_FEATURE_GRANTING.md](./LEVEL_BASED_FEATURE_GRANTING.md)** - Feature granting system

### Subfolders
- **[data/](./data/)** - Data-specific documentation
  - [nonheroic-readme.md](./data/nonheroic-readme.md) - Non-heroic units
  - [nonheroic-images-readme.md](./data/nonheroic-images-readme.md) - Required images
- **[migrations/](./migrations/)** - Data migration system
  - [readme.md](./migrations/readme.md) - How migrations work
- **[store/](./store/)** - Store system documentation
  - [refactoring-summary.md](./store/refactoring-summary.md) - Store improvements
  - [weapon-categorization.md](./store/weapon-categorization.md) - Weapon categories
  - [store-id-diagnostics.md](./store/store-id-diagnostics.md) - Troubleshooting
- **[tools/](./tools/)** - Tools and utilities
  - [skills-and-feats-guide.md](./tools/skills-and-feats-guide.md) - Skills/feats reference
  - [feats-talents-analysis.md](./tools/feats-talents-analysis.md) - Technical analysis
  - [force-powers-analysis.md](./tools/force-powers-analysis.md) - Force powers reference
  - [vehicle-migration-summary.md](./tools/vehicle-migration-summary.md) - Vehicle system
- **[templates/](./templates/)** - Template system
  - [partials-readme.md](./templates/partials-readme.md) - Handlebars partials
- **[reports/](./reports/)** - Analysis reports
  - [chargen-levelup-review.md](./reports/chargen-levelup-review.md) - Character gen analysis
  - [store-bugs-found.md](./reports/store-bugs-found.md) - Store bug analysis
  - [store-polish-recommendations.md](./reports/store-polish-recommendations.md) - Store recommendations

---

## 🐛 Bug Reports & Issues

### Recent Fixes
- **[FIXES_APPLIED.md](../FIXES_APPLIED.md)** - Summary of applied fixes
- **[BUG_FIXES_DETAILED.md](../BUG_FIXES_DETAILED.md)** - Detailed bug fixes with code samples
- **[PROGRESSION_ENGINE_FIXES.md](./PROGRESSION_ENGINE_FIXES.md)** - Progression fixes
- **[PROGRESSION_ISSUES_ANALYSIS.md](./PROGRESSION_ISSUES_ANALYSIS.md)** - Issue analysis

### Test Reports
- **[PROGRESSION_ENGINE_TEST_REPORT.md](../PROGRESSION_ENGINE_TEST_REPORT.md)** - Test results
- **[TEST_FINDINGS_SUMMARY.md](../TEST_FINDINGS_SUMMARY.md)** - Test findings
- **[TEST_EXPECTATIONS.md](./TEST_EXPECTATIONS.md)** - Test scenarios

### Analysis Documents
- **[CODE_REVIEW_SUMMARY.md](./CODE_REVIEW_SUMMARY.md)** - Code review findings
- **[REPO_AUDIT_REPORT.md](./REPO_AUDIT_REPORT.md)** - Repository audit
- **[SYSTEM_STATUS.md](./SYSTEM_STATUS.md)** - Current system status

---

## 👨‍💻 Developer Documentation

### Development Setup
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Status tracking
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Summary of work

### Refactoring
- **[REFACTORING_ROADMAP.md](./REFACTORING_ROADMAP.md)** - Refactoring plan
- **[REFACTORING_COMPLETE.md](./REFACTORING_COMPLETE.md)** - Completed refactoring

### Technical Details
- **[CON_MOD_TECHNICAL_EXPLANATION.md](../CON_MOD_TECHNICAL_EXPLANATION.md)** - CON modifier details
- **[TWILEK_JEDI_CHARACTER_SHEET.md](./TWILEK_JEDI_CHARACTER_SHEET.md)** - Character sheet analysis

---

## 📊 Reference Documents

### Quick References
- **[TALENT_FEAT_QUICK_REFERENCE.md](./tools/TALENT_FEAT_QUICK_REFERENCE.md)** - Talents/feats quick ref
- **[ADVANCEMENT_SECURITY_SUMMARY.md](./ADVANCEMENT_SECURITY_SUMMARY.md)** - Security overview
- **[FORCE_INTEGRATION_REPORT.md](./FORCE_INTEGRATION_REPORT.md)** - Force integration

### Specialized Topics
- **[ARMOR_SYSTEM_UPDATES.md](./ARMOR_SYSTEM_UPDATES.md)** - Armor system changes
- **[BACKGROUNDS_IMPLEMENTATION_STATUS.md](./BACKGROUNDS_IMPLEMENTATION_STATUS.md)** - Backgrounds system
- **[NPC_CHARGEN_WORKFLOW.md](./NPC_CHARGEN_WORKFLOW.md)** - NPC creation workflow
- **[CHARGEN_LEVELUP_INVESTIGATION.md](./CHARGEN_LEVELUP_INVESTIGATION.md)** - Character system investigation

---

## 📋 Documentation Organization

### By Topic
- **Character Creation**: GETTING_STARTED.md, CHARACTER_SHEET_ANALYSIS.md, CHARACTER_TEMPLATES.md, NPC_CHARGEN_WORKFLOW.md
- **Combat**: COMBAT_ENHANCEMENTS.md, VEHICLE_COMBAT.md, SHEET_IMPROVEMENTS.md
- **Progression**: PROGRESSION_ENGINE_ANALYSIS.md, COMPLETE_PROGRESSION_SUMMARY.md, TALENT_TREE_FLOW_MAP.md
- **Architecture**: Design.md, NAMESPACE.md, DATA_MODEL.md, HOOK_ANALYSIS.md
- **Features**: FEATURES.md, USER_GUIDE.md, tools/ folder
- **Development**: CONTRIBUTING.md, REFACTORING_ROADMAP.md, IMPLEMENTATION_GUIDE.md
- **Issues/Fixes**: BUG_FIXES_DETAILED.md, PROGRESSION_ENGINE_TEST_REPORT.md, reports/ folder

### By Audience
- **Players**: ../GETTING_STARTED.md, ../USER_GUIDE.md, tools/skills-and-feats-guide.md
- **Game Masters**: HOUSE_RULES_GUIDE.md, CHARACTER_TEMPLATES.md, reports/ folder
- **Developers**: CONTRIBUTING.md, IMPLEMENTATION_GUIDE.md, Design.md, NAMESPACE.md
- **Architects**: PROGRESSION_ARCHITECTURE.md, HOOK_ANALYSIS.md, DATA_MODEL.md

---

## 🎯 Quick Navigation

### Start Here
1. **New to SWSE?** → [GETTING_STARTED.md](../GETTING_STARTED.md)
2. **Want to know what's possible?** → [FEATURES.md](../FEATURES.md)
3. **Need help with a feature?** → [USER_GUIDE.md](../USER_GUIDE.md)
4. **Want technical details?** → [Design.md](./Design.md)
5. **Want to contribute?** → [CONTRIBUTING.md](./CONTRIBUTING.md)

### Find Specific Topics
- **Character Gen**: [CHARGEN_LEVELUP_INVESTIGATION.md](./CHARGEN_LEVELUP_INVESTIGATION.md), [NPC_CHARGEN_WORKFLOW.md](./NPC_CHARGEN_WORKFLOW.md)
- **Talents**: [TALENT_TREE_FLOW_MAP.md](./TALENT_TREE_FLOW_MAP.md), [tools/feats-talents-analysis.md](./tools/feats-talents-analysis.md)
- **Combat**: [COMBAT_ENHANCEMENTS.md](./COMBAT_ENHANCEMENTS.md), [VEHICLE_COMBAT.md](./VEHICLE_COMBAT.md)
- **Progression**: [PROGRESSION_ARCHITECTURE.md](./PROGRESSION_ARCHITECTURE.md), [COMPLETE_PROGRESSION_SUMMARY.md](./COMPLETE_PROGRESSION_SUMMARY.md)
- **Force Powers**: [tools/force-powers-analysis.md](./tools/force-powers-analysis.md)
- **Bugs**: [../BUG_FIXES_DETAILED.md](../BUG_FIXES_DETAILED.md), [reports/](./reports/)

---

## 📈 Document Statistics

- **Total Files**: 68+
- **Total Lines**: 28,000+
- **Root Level**: 5 user guides
- **docs/ Folder**: 45+ technical documents
- **Subfolders**: 17+ specialized documents
- **Coverage**: All systems and features documented

---

## Installation & Setup

### Quick Install
1. Download from [Releases](https://github.com/docflowGM/foundryvtt-swse/releases)
2. In Foundry: **Game Systems → Install System**
3. Paste manifest URL
4. Install and create world

For detailed setup: See [GETTING_STARTED.md](../GETTING_STARTED.md)

### Development Setup
Clone this repository:
```bash
git clone https://github.com/docflowGM/foundryvtt-swse.git
cd foundryvtt-swse
```

For development instructions: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Credits

**Created by**: Doc Flow
**License**: MIT
**Status**: ✅ Production Ready

This is an unofficial Star Wars Saga Edition system for Foundry VTT. Star Wars is a trademark of Lucasfilm Ltd.

---

## Additional Resources

- **GitHub Repository**: https://github.com/docflowGM/foundryvtt-swse
- **GitHub Issues**: https://github.com/docflowGM/foundryvtt-swse/issues
- **Main README**: [../README.md](../README.md)
- **User Guide**: [../USER_GUIDE.md](../USER_GUIDE.md)
- **About Project**: [../ABOUT.md](../ABOUT.md)
