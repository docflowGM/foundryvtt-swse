# SWSE Game Systems & Rules Implementation Guide

**Status**: 🟢 Authoritative Reference
**Audience**: Developers + Advanced GMs
**Last Updated**: 2026-02-09

---

## Overview

This document is the authoritative reference for how Star Wars Saga Edition rules are implemented in SWSE. It covers:
- **Game Mechanics**: How rules translate to code
- **System Architecture**: Where logic lives
- **Extension Points**: How to safely add mechanics
- **Best Practices**: Patterns for consistency

---

## 📚 Main Sections (TODO: Content Consolidation)

This document consolidates content from:
- All `PROGRESSION_*.md` files
- All `TALENT_*.md` files
- All `FEATS_*.md` files
- All `LEVELUP_*.md` files
- All `ADVANCEMENT_*.md` files
- Force Power system documentation
- Mentor system documentation
- Vehicle/Starship system documentation
- Prerequisite engine documentation
- Suggestion engine documentation

### Table of Contents

1. [Character Progression](#character-progression)
2. [Talents & Feats](#talents--feats)
3. [Force Powers](#force-powers)
4. [Mentor System](#mentor-system)
5. [Vehicle & Starship Systems](#vehicle--starship-systems)
6. [Suggestion Engine](#suggestion-engine)
7. [Advanced Topics](#advanced-topics)

---

## Character Progression

### Core Concept
Characters progress through levels (1-20) by gaining experience. Each level grants:
- Ability score increases
- Talent selections
- Feat selections
- Skill increases
- Condition track improvements

### Implementation Location
- **Engine**: `scripts/engine/progression.js`
- **UI**: `scripts/apps/levelup/`
- **Data**: Character sheets, compendium packs

---

## Talents & Feats

### Talent System
Talents represent character specialization options. They:
- Require prerequisites (class, level, abilities)
- May have dependencies on other talents
- Can grant abilities or modify mechanics
- Are organized in talent trees

### Implementation Location
- **Engine**: `scripts/talents/`
- **Mechanics**: `scripts/talents/*-talent-mechanics.js`
- **UI**: `scripts/apps/levelup/levelup-talents.js`

### Feature Application
Talents are applied via:
1. **Direct grants**: Automatic when selecting talent
2. **Conditional effects**: Via Active Effects system
3. **Macros**: For complex talent mechanics
4. **Engine methods**: Via TalentAbilitiesEngine

---

## Force Powers

### Core Concept
Force powers are special abilities available to Force-using characters. They:
- Require Force Points to use
- Have activation conditions (standard/swift/immediate)
- May have prerequisites (Force level, talents)
- Include Light Side and Dark Side variants

### Implementation Location
- **System**: `scripts/talents/dark-side-powers-init.js`
- **Macros**: `scripts/talents/*-talent-macros.js`
- **Engine**: `DarkSidePowers.js`

---

## Mentor System

### Core Concept
Mentors provide guidance and grant:
- Ability score improvements
- Bonus feats
- Talent selections
- Special abilities
- Translation/dialogue options

### Implementation Location
- **System**: `scripts/ui/dialogue/`
- **Settings**: `scripts/ui/dialogue/mentor-translation-settings.js`
- **Engine**: `scripts/engine/mentor-*`

---

## Vehicle & Starship Systems

### Core Concept
Vehicles and starships are player-controllable entities with:
- Crew positions
- Maneuvers
- Combat abilities
- Modification slots

### Implementation Location
- **Vehicle data**: Actor type `vehicle`
- **Systems**: `scripts/combat/vehicle-*`
- **Maneuvers**: `scripts/ui/progression/starship-maneuver-picker.js`

---

## Suggestion Engine

### Core Concept
The suggestion engine provides recommendations for:
- Next feats to select
- Talent tree progression
- Skill improvements
- Force power selections

### Implementation Location
- **Engine**: `scripts/engine/SuggestionService.js`
- **Combat integration**: `scripts/suggestion-engine/combat-hooks.js`
- **UI**: `scripts/gm-suggestions/gm-suggestion-panel.js`

---

## Advanced Topics

### Single Source of Truth (SSOT)

**Rule**: All game facts live in compendiums or actor data, never in JavaScript.

✅ **Correct**:
```javascript
const talent = actor.items.find(i => i.name === 'Bonus Feat');
```

❌ **Wrong**:
```javascript
const TALENT_LIST = { /* hardcoded talents */ };
```

### AppV2 Lifecycle Contracts

All UI elements must follow the AppV2 lifecycle:

1. **Constructor**: Never access DOM or listeners
2. **_prepareContext()**: Build view model
3. **_onRender()**: Attach listeners via `wireEvents()`
4. **close()**: Cleanup

### Preventing Regressions

The system has automated checks:
- **RuntimeContract**: Blocks jQuery and v1 patterns
- **RenderAssertions**: Validates sheet rendering
- **StructuredLogger**: Tracks all system operations

---

## Quick Reference

| Task | Location |
|------|----------|
| Add a talent | `docs/compendium-packs/talents/` + register in system |
| Add a feat | `docs/compendium-packs/feats/` + prerequisites |
| Add a Force power | `scripts/talents/dark-side-powers-init.js` + data |
| Extend progression | `scripts/engine/progression.js` |
| Add mentor response | `scripts/ui/dialogue/mentor-*` |
| Add suggestion | `scripts/engine/SuggestionService.js` |

---

## For More Information

See `/ARCHITECTURE.md` for system-level design.
See `/README.md` for user guides.
See `/MIGRATIONS_AND_COMPATIBILITY.md` for version changes.

---

**Note**: This document is under consolidation. Content is being merged from historical phase-specific documents. For archived implementation details, see `docs/_archive/`.

