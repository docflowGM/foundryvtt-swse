# Active Talent System - Integration Architecture

**Status:** Foundation Complete - Ready for Integration
**Date:** January 1, 2026
**Talents Covered:** 418 out of 583 active talents

---

## Overview

The **Active Talent System** leverages the existing SWSE action card infrastructure instead of creating 583 separate talent cards. Rather than duplicate cards, **active talents enhance existing action cards** when characters have them selected.

### Key Principle

> **One card per base action, multiple talents can enhance it.**

When a character rolls a Persuasion check, the system automatically detects if they have talents like "Adept Negotiator" or "Master Negotiator" and combines those bonuses into a single card.

---

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────┐
│  1. TALENT-ACTION MAPPING LAYER         │
│  (talent-action-links.json)             │
│  "Adept Negotiator" → "persuasion-check"│
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  2. TALENT DETECTION LAYER              │
│  (TalentActionLinker.js)                │
│  Finds all talents linked to an action  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  3. ACTION CARD ENHANCEMENT LAYER       │
│  (Character sheet rendering)            │
│  Shows bonuses on cards                 │
└─────────────────────────────────────────┘
```

---

## Data Files

### 1. talent-action-links.json
**Location:** `/data/talent-action-links.json`

Maps 418 talents to 24 base action categories:

```json
{
  "version": "1.0.0",
  "totalTalents": 418,
  "unmapped": 161,
  "talentToAction": {
    "Adept Negotiator": "persuasion-check",
    "Acute Senses": "perception-check",
    "Dark Healing": "ranged-attack",
    "Block": "block-defense",
    ...
  },
  "actionToTalents": {
    "melee-attack": [140 talents],
    "reflex-defense": [72 talents],
    "use-the-force-check": [37 talents],
    ...
  }
}
```

### 2. talent-granted-abilities.json
**Location:** `/data/talent-granted-abilities.json`

Enhanced with `linkedAction` field for 47 talents already with mechanics:

```json
{
  "adept-negotiator": {
    "name": "Adept Negotiator",
    "linkedAction": "persuasion-vs-will",
    "actionType": "standard",
    "description": "...",
    "effects": [{"type": "conditionTrack", "value": -1}],
    ...
  }
}
```

---

## Core System (TalentActionLinker.js)

**Location:** `/scripts/engine/talent-action-linker.js`

### Key Methods

#### `getTalentsForAction(actor, actionId)`
Finds all talents a character has that enhance a specific action.

```javascript
const talents = TalentActionLinker.getTalentsForAction(actor, 'persuasion-check');
// Returns: ["Adept Negotiator", "Master Negotiator", "Force Persuasion"]
```

#### `calculateBonusForAction(actor, actionId)`
Calculates the total bonus from all linked talents.

```javascript
const bonus = TalentActionLinker.calculateBonusForAction(actor, 'melee-attack');
// Returns: {
//   value: 3,
//   talents: ["Bloody Mess", "Executioner", "Flanking Master"],
//   description: "+3 from 3 linked talents"
// }
```

#### `enhanceActionCard(actionData, actor)`
Adds talent information to an action card during rendering.

```javascript
const enhancedCard = TalentActionLinker.enhanceActionCard(actionData, actor);
// Adds to actionData:
// - linkedTalents: ["Adept Negotiator"]
// - talentBonus: 1
// - talentBonusDescription: "+1 from Adept Negotiator"
// - hasLinkedTalents: true
```

#### `getLinkedTalentDetails(actor, actionId)`
Gets detailed information about linked talents for tooltips/display.

```javascript
const details = TalentActionLinker.getLinkedTalentDetails(actor, 'block-defense');
// Returns: [
//   { name: "Block", description: "...", icon: "..." },
//   { name: "Cortosis Defense", description: "...", icon: "..." }
// ]
```

---

## Talent Categories & Base Actions

### Action Categories (24 total)

| Base Action | Count | Example Talents |
|------------|-------|-----------------|
| **melee-attack** | 140 | Advantageous Opening, Assault Gambit, Beloved |
| **reflex-defense** | 72 | Adept Negotiator, Better Lucky than Dead, Befuddle |
| **use-the-force-check** | 37 | Affliction, Apprentice Boon, Clear Mind |
| **ranged-attack** | 14 | Bayonet Master, Dark Healing, Deflect |
| **persuasion-check** | 13 | Aggressive Negotiator, Barter, Charm Beast |
| **knowledge-check** | 12 | Battle Analysis, Educated, Impart Knowledge |
| **condition-track-shift** | 12 | Equilibrium, Focus Terror, Keep It Together |
| **stealth-check** | 11 | Art of Concealment, Blend In, Creeping Approach |
| **standard-action** | 11 | Battlefield Medic, Improved Jury-Rig |
| **pilot-check** | 10 | Blind Spot, Close Scrape, Dogfight Gunner |
| **deception-check** | 10 | Dark Deception, Dirty Tricks, Fast Talker |
| **swift-action** | 10 | Cover Bracing, Find an Opening, Rapid Reload |
| **lightsaber-attack** | 9 | Guardian Strike, Mobile Attack (lightsabers) |
| **mechanics-check** | 8 | Biotech Mastery, Device Jammer, Droid Expert |
| **perception-check** | 8 | Acute Senses, Enhanced Vision, Findsman's Foresight |
| **block-defense** | 7 | Cortosis Gauntlet Block, Sheltering Stance, Shii-Cho |
| **treat-injury-check** | 6 | Expert Shaper, Force Treatment, Medical Miracle |
| **use-computer-check** | 6 | Electronic Forgery, Master Slicer |
| **gather-information-check** | 4 | Bothan Resources, Cover Your Tracks |
| **initiative-roll** | 6 | Always Ready, Force Warning, Improved Initiative |
| **movement-action** | 5 | Escort Fighter, Mobile Combatant, Speed Implant |
| **deflect-defense** | 1 | Redirect Shot |
| **acrobatics-check** | 2 | Acrobatic Recovery, Sokan |
| **fortitude-defense** | 1 | Dark Healing Field |

### Unmapped Talents (161)

These talents don't fit into existing action cards because they have:
- Special once-per-encounter mechanics
- Complex conditional triggers
- Unique effects not tied to standard actions
- Multiple action types in one talent

Examples: Adrenaline Implant, Advanced Intel, Aversion, Avert Disaster

---

## Integration Points

### Where This System Integrates

#### 1. Character Sheet Rendering
When displaying action cards (melee attack, persuasion check, etc.), the system should:

```javascript
// In action card rendering code:
const linkedTalents = TalentActionLinker.getTalentsForAction(actor, actionId);
if (linkedTalents.length > 0) {
  // Show "Enhanced by: [talent names]" on card
  // Display "+X bonus" indicator
}
```

#### 2. Roll Calculation
When rolling an action, apply linked talent bonuses:

```javascript
// In roll calculation code:
const baseBonus = calculateNormalBonus(actor, action);
const talentBonus = TalentActionLinker.calculateBonusForAction(actor, actionId).value;
const totalBonus = baseBonus + talentBonus;
```

#### 3. Action Card Templates
Update HBS templates to display talent enhancement info:

```handlebars
{{#if hasLinkedTalents}}
  <div class="talent-enhancement">
    Enhanced by: {{linkedTalents}}
    <span class="talent-bonus">+{{talentBonus}}</span>
  </div>
{{/if}}
```

---

## How It Works in Practice

### Example 1: Melee Attack
```
Character has:
- Advantageous Opening (melee-attack)
- Executioner (melee-attack)
- Bloody Mess (melee-attack)

When rolling "Melee Attack":
1. Base melee attack roll is calculated
2. TalentActionLinker detects 3 linked talents
3. Card shows: "Enhanced by 3 talents: +3 bonus"
4. Roll applies +3 from linked talents
5. Result: Single card, properly bonused
```

### Example 2: Persuasion Check
```
Character has:
- Adept Negotiator (persuasion-check)
- Master Negotiator (persuasion-check) [modifier]
- Force Persuasion (persuasion-check)

When rolling "Persuasion Check":
1. Base persuasion bonus is calculated
2. TalentActionLinker detects 3 linked talents
3. Shows: "Enhanced by 3 talents"
4. Each talent modifies the roll (Master Negotiator makes target move -2 instead of -1)
5. Result: Single persuasion card with all bonuses combined
```

### Example 3: Use the Force
```
Character has:
- Affliction (use-the-force-check)
- Apprentice Boon (use-the-force-check)
- Clear Mind (use-the-force-check)
- 34 more talents...

When rolling "Use the Force":
1. Shows which of their many Force talents apply
2. Calculates combined bonuses
3. Result: Cleaner UI without 37 separate cards
```

---

## Benefits

### For Players
- **Cleaner UI** - One card per action instead of multiple talent cards
- **Automatic Bonuses** - Linked talents apply without manual selection
- **Clear Feedback** - See which talents enhance an action
- **Space Efficient** - Character sheet tabs don't get overwhelmed

### For Developers
- **Modular** - Easy to add new actions or talents
- **Maintainable** - Changes to one talent don't break multiple cards
- **Scalable** - Handles 418 talents without performance impact
- **Flexible** - Non-linked talents (161) still get standalone cards

---

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Create talent-action-links.json (418 talents mapped)
- [x] Add linkedAction fields to talent-granted-abilities.json (47 talents)
- [x] Build TalentActionLinker system (detection & bonus calculation)

### Phase 2: Integration 🔄 IN PROGRESS
- [ ] Update character sheet action card rendering
- [ ] Integrate with roll calculation systems
- [ ] Add UI indicators for linked talents on cards
- [ ] Update HBS templates to show talent enhancements

### Phase 3: Polish 📋 PLANNED
- [ ] Tooltip showing full talent details
- [ ] Talent-specific bonus logic (not just +1 per talent)
- [ ] Handle talent modifiers (Master Negotiator changes -1 to -2)
- [ ] Performance optimization for large talent collections

### Phase 4: Standalone Cards 📋 PLANNED
- [ ] Create 161 standalone cards for unmapped talents
- [ ] Special mechanics for once-per-encounter abilities
- [ ] Complex conditional talents

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total Active Talents** | 583 |
| **Talents Linked to Actions** | 418 (72%) |
| **Unmapped Complex Talents** | 161 (28%) |
| **Base Action Categories** | 24 |
| **Largest Category** | melee-attack (140 talents) |
| **linkedAction Fields Added** | 47 (in talent-granted-abilities.json) |
| **System Code Files** | 1 (TalentActionLinker.js) |

---

## Next Steps

1. **Find Integration Points** - Locate character sheet rendering and roll calculation code
2. **Update Action Card Rendering** - Call `TalentActionLinker.enhanceActionCard()` when displaying cards
3. **Update Roll Functions** - Add talent bonuses via `TalentActionLinker.calculateBonusForAction()`
4. **Test Integration** - Verify bonuses apply correctly when rolling with linked talents
5. **Create Standalone Cards** - Build 161 cards for unmapped talents (Phase 4)

---

## Reference

- **Mapping File:** `/data/talent-action-links.json`
- **Talent Data:** `/data/talent-granted-abilities.json`
- **System Code:** `/scripts/engine/talent-action-linker.js`
- **Documentation:** This file
