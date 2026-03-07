# SWSE Foundry VTT System Documentation

Welcome to the Star Wars Saga Edition system documentation for Foundry VTT.

## 📚 Core Feature Documentation

The system documentation is organized into three main feature guides:

### 1. **[Character Creation & Progression](FEATURES_CHARACTER_CREATION.md)**

Everything about creating and advancing characters.

- Character templates & quick creation
- Character generation system
- Advancement & leveling
- Talents & skill trees
- NPC generation workflows
- Sheet structure & fields
- Feature granting by level

**Audience:** Players creating characters, Game Masters running character creation

---

### 2. **[Commerce & Store](FEATURES_COMMERCE.md)**

The shopping and commerce system for your world.

- Store system architecture
- Shopping UI/UX patterns
- Shopping cart & transactions
- Item purchasing & inventory
- Store integration with characters
- Implementation examples

**Audience:** GMs managing economy, developers extending store UI

---

### 3. **[Combat & Rolling](FEATURES_COMBAT.md)**

All combat mechanics and the rolling system.

- Rolling system overview
- Combat mechanics & attack resolution
- Damage mitigation (Shield Rating, Damage Reduction, Temp HP)
- Crystal mechanics for lightsabers
- Starship combat
- Special effects & conditions

**Audience:** Players in combat, GMs adjudicating rules, developers handling effects

---

## 🔍 System Monitoring

### **[Sentinel Diagnostic System](SENTINEL_README.md)**

Real-time system health monitoring for Game Masters.

- 24/7 passive auditing
- 9 report categories
- GM dashboard commands
- Issue diagnosis
- Store system audit findings

**Access:** Type `SWSE.debug.sentinel.dashboard()` in Foundry console

---

## 📁 Architecture & Systems

Additional documentation organized by system:

### `/architecture/`
- System initialization
- Data contracts
- V2 governance rules

### `/governance/`
- Modification rules
- Mutation constraints
- Enforcement guidelines

### `/systems/`
- Rule systems
- Skill systems
- Class definitions

### `/store/`
- Store item definitions
- Pack organization

### `/swse-classes/`
- Class-specific rules
- Prestige classes

### `/data/`
- Schema definitions
- Data structures

### `/guides/`
- Integration guides
- Workflow documentation

### `/templates/`
- Template organization
- Partial includes

### `/tools/`
- Development utilities
- Testing harnesses

---

## 🚀 Quick Start

### For Players
1. Open character creation
2. Choose a template or start fresh
3. Follow the character generation system
4. Equip items from the store
5. Jump into combat!

### For Game Masters
1. Review [Combat & Rolling](FEATURES_COMBAT.md) for rules reference
2. Understand [Commerce & Store](FEATURES_COMMERCE.md) for economy
3. Monitor system health with `SWSE.debug.sentinel.dashboard()`
4. Consult [Character Creation](FEATURES_CHARACTER_CREATION.md) for character rules

### For Developers
1. Review `/architecture/` for system design
2. Check `/governance/` for mutation rules
3. Follow `/guides/` for integration patterns
4. Run Sentinel: `SWSE.debug.sentinel.dashboard()`

---

## 📋 Common Tasks

### Create a Character
See: **[Character Creation & Progression](FEATURES_CHARACTER_CREATION.md)** → Character Templates section

### Run Combat
See: **[Combat & Rolling](FEATURES_COMBAT.md)** → Combat Mechanics section

### Add Items to Store
See: **[Commerce & Store](FEATURES_COMMERCE.md)** → Store System Architecture section

### Check System Health
See: **[Sentinel README](SENTINEL_README.md)** → Quick Start section

Run in Foundry console:
```javascript
SWSE.debug.sentinel.dashboard()
```

### Find a Specific Rule
1. Check **[Combat & Rolling](FEATURES_COMBAT.md)** for combat rules
2. Check **[Character Creation](FEATURES_CHARACTER_CREATION.md)** for character rules
3. Use `SWSE.debug.sentinel.export()` to export diagnostics

---

## 🛠️ System Health

Monitor real-time system health:

```javascript
// Full categorized dashboard
SWSE.debug.sentinel.dashboard()

// Quick health snapshot
SWSE.debug.sentinel.health()

// Export all reports as JSON
SWSE.debug.sentinel.export()
```

The Sentinel system monitors:
- Application lifecycle compliance
- Data hydration & sheet health
- Rolling governance
- Commerce transaction integrity
- Update atomicity
- And more...

See **[Sentinel README](SENTINEL_README.md)** for full details.

---

## 📞 Troubleshooting

### Issue: Characters not loading
→ Check **[Character Creation & Progression](FEATURES_CHARACTER_CREATION.md)** → Sheet Structure section
→ Run `SWSE.debug.sentinel.dashboard()` and check Partial Hydration category

### Issue: Store not working
→ Check **[Commerce & Store](FEATURES_COMMERCE.md)** → Store System Architecture section
→ Look for Store System issues in Sentinel dashboard

### Issue: Rolls not applying correctly
→ Check **[Combat & Rolling](FEATURES_COMBAT.md)** → Rolling System section
→ Review Sentinel dashboard for Roll Governance issues

### Issue: Something else
→ Run `SWSE.debug.sentinel.export()` to get system diagnostics
→ Share the JSON export in issues/PRs

---

## 🎯 Governance & Architecture

This system follows strict architectural patterns:

- **Application Governance** (ApplicationV2 only)
- **Mutation Gatekeeper** (ActorEngine routes all mutations)
- **Roll System** (SWSEChat for all output)
- **CSS Isolation** (Namespaced styles only)
- **Absolute Imports** (System paths only)

See `/governance/` and `/architecture/` for enforcement rules.

---

## 📝 Documentation Status

- ✅ Core features consolidated into 3 focused guides
- ✅ Sentinel diagnostic system complete
- ✅ Architecture & governance documented
- ✅ System health monitoring active
- ✅ Ready for production

---

**Last Updated:** 2026-03-07
**System Version:** 2.0.0
**Status:** ✅ Production Ready

For questions or issues, consult the relevant feature guide or run system diagnostics with Sentinel.
