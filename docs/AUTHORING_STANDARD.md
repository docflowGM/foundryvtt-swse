# Authoring Standard — Phase 7

## Overview

The **Display Contract** ensures all game content (feats, talents, items, classes, species) flows through the system with a predictable, uniform shape.

This document defines:
1. **The Contract** — standard shape all entities must follow
2. **Integration Points** — where to apply normalization
3. **Best Practices** — how to author new content
4. **Validation** — how to verify contract compliance

---

## The Display Contract

Every entity must conform to this shape:

```javascript
{
  // Identity
  id: string,                    // Unique ID
  uuid: string | null,           // Compendium UUID
  name: string,                  // Human-readable name
  type: string,                  // Entity type (feat, talent, item, class, species, etc.)

  // Content
  description: string,           // Full description
  benefit: string | null,        // Specific benefit text
  prerequisite: string | null,   // Prerequisite text

  // Classification
  category: string,              // Category (feat type, skill, etc.)
  tags: string[],                // Normalized tags array
  source: string | null,         // Content source (book, UA, etc.)

  // Game mechanics
  modifiers: object[],           // Modifier objects
  requiresTraining: boolean,     // Requires skill training?
  requiresProficiency: boolean,  // Requires proficiency?

  // UI presentation (CRITICAL)
  ui: {
    category: string,            // UI category (for layout)
    icon: string,                // Unicode icon (⚔, ◆, ◊, etc.)
    rarity: string,              // Rarity level (common, rare, etc.)
    displayType: string,         // How to display (card, list, inline)
    color: string | null,        // Optional hex color
    badge: string | null,        // Optional badge text
    hideFromPlayer: boolean      // Hide from player view?
  },

  // Source reference
  pack: string | null,           // Compendium pack
  _raw: object                   // Original system data (fallback only)
}
```

---

## Integration Points

### 1. Registry Level

**Where:** `scripts/registries/*.js`

**What:** When loading data from compendium, apply the normalizer:

```javascript
import { normalizeForDisplay } from '../data/normalizers/display-normalizer.js';

// In _normalizeEntry() or equivalent:
static _normalizeEntry(doc) {
  // Do registry-specific normalization first
  const entry = {
    id: doc._id,
    name: doc.name,
    // ... registry fields
  };

  // Then ensure contract compliance
  return normalizeForDisplay(entry);
}
```

### 2. View Model Level

**Where:** `scripts/sheets/v2/*/context.js`

**What:** When building view models for templates, normalize collections:

```javascript
import { normalizeForViewModel } from '../data/normalizers/display-normalizer.js';

export function buildFeatsViewModel(actor) {
  const feats = actor.items.filter(i => i.type === 'feat');

  // Normalize for display
  const normalizedFeats = normalizeForViewModel(feats, {
    filterFn: feat => !feat.hidden,
    overridesFn: feat => ({
      // Per-actor customizations
      hideFromPlayer: feat.flags?.swse?.hidden
    })
  });

  return normalizedFeats;
}
```

### 3. Template Level

**Where:** Handlebars templates (`.hbs`)

**What:** ONLY read from normalized fields:

```handlebars
{{! Do this (normalized) }}
<div class="feat-card">
  <span class="icon">{{feat.ui.icon}}</span>
  <h3>{{feat.name}}</h3>
  <p class="category">{{feat.ui.category}}</p>
  <p class="description">{{feat.description}}</p>
</div>

{{! NOT this (guessing) }}
<div class="feat-card">
  {{! ❌ Don't infer category from name }}
  {{! ❌ Don't guess icon }}
  {{! ❌ Don't compute display type }}
</div>
```

---

## Adding New Content

### Example: New Feat

```javascript
// In compendium or data file
{
  "name": "Great Fortitude",
  "type": "feat",
  "description": "You are surprisingly hardy.",
  
  // REQUIRED for contract
  "ui": {
    "category": "feat",           // Matches system.featType
    "icon": "◆",                   // Distinctive icon
    "rarity": "common",           // Rarity level
    "displayType": "card"         // Display format
  },

  // REQUIRED for consistency
  "tags": ["defensive", "trained"],
  "prerequisites": "CON 15+",
  
  // OPTIONAL but recommended
  "source": "Core Rules",
  "modifiers": [
    { ability: "fortitude", value: 2 }
  ]
}
```

### Example: New Item

```javascript
{
  "name": "Blaster Rifle",
  "type": "item",
  "description": "A ranged weapon...",

  "ui": {
    "category": "weapon",
    "icon": "⚔",
    "rarity": "uncommon",
    "displayType": "card"
  },

  "tags": ["ranged", "blaster"],
  "source": "Core Rules"
}
```

### Example: New Class

```javascript
{
  "name": "Soldier",
  "type": "class",
  "description": "Master of combat...",

  "ui": {
    "category": "class",
    "icon": "▲",
    "rarity": "common",
    "displayType": "card",
    "badge": "Level 1"           // Optional badge
  },

  "tags": ["martial", "tank"],
  "source": "Core Rules"
}
```

---

## UI Rendering Standards

### Icons (Unicode)

```
⚔  — Combat/Feats
◆  — Talents
◊  — Items
▲  — Classes
●  — Species
▶  — Vehicles
◈  — Droids
✦  — Powers
◉  — Skills
◎  — Languages
□  — Backgrounds
◇  — Generic
```

### Rarities

```
common      — Standard content
uncommon    — Less common
rare        — Rare
epic        — Very rare
legendary   — Legendary
artifact    — Artifact
```

### Categories

Use lowercase, no spaces:
```
feat, talent, item, class, species, vehicle, droid, power, 
skill, language, background, feat-type, skill-type, etc.
```

---

## Validation

### Manual Validation

```javascript
import { DisplayContract } from '../contracts/DisplayContract.js';

const entity = { /* ... */ };
const normalized = DisplayContract.enforce(entity);

if (!DisplayContract.validate(normalized)) {
  console.error('Entity does not conform to contract:', entity);
}
```

### In Tests

```javascript
import { isValidForDisplay } from '../normalizers/display-normalizer.js';

test('feat conforms to contract', () => {
  const feat = FeatRegistry.getById('some-id');
  expect(isValidForDisplay(feat)).toBe(true);
});
```

---

## Migration Checklist

When migrating existing content:

- [ ] Every entity has `id` and `name`
- [ ] Every entity has `description`
- [ ] Every entity has `tags` (array)
- [ ] Every entity has `ui` object with:
  - [ ] `category` (string)
  - [ ] `icon` (unicode character)
  - [ ] `rarity` (common/uncommon/rare/epic/legendary/artifact)
  - [ ] `displayType` (card/list/inline)
- [ ] Remove direct `_id` references, use `id`
- [ ] Normalize boolean fields (avoid undefined)
- [ ] Ensure prerequisites are strings, not objects

---

## Common Patterns

### Filtering by Category

```javascript
const combatFeats = normalizeMany(feats)
  .filter(f => f.ui.category === 'combat');
```

### Grouping by Rarity

```javascript
import { groupNormalized } from '../normalizers/display-normalizer.js';

const byRarity = groupNormalized(feats, 'ui.rarity');
// Map { 'common': [...], 'rare': [...], ... }
```

### Searching

```javascript
import { searchNormalized } from '../normalizers/display-normalizer.js';

const results = searchNormalized(feats, 'fortitude');
// Returns feats matching in name or description
```

### Formatting for Display

```javascript
import {
  formatCategory,
  formatRarity,
  formatTags,
  formatDescription
} from '../utils/ui-formatters.js';

const display = {
  category: formatCategory(feat.category),    // "General"
  rarity: formatRarity(feat.ui.rarity),       // "Rare"
  tags: formatTags(feat.tags),                // "combat, trained, special"
  description: formatDescription(feat.description, {
    maxLength: 200
  })
};
```

---

## Troubleshooting

**Q: UI shows wrong category**
- A: Ensure `ui.category` is set correctly in contract

**Q: Icon doesn't appear**
- A: Check `ui.icon` contains valid unicode character

**Q: Missing description in UI**
- A: Verify `description` field is populated, fallback to `benefit`

**Q: Content not appearing**
- A: Check `ui.hideFromPlayer` is false (or missing)

**Q: Inconsistent formatting**
- A: Use `ui-formatters.js` functions instead of inline formatting

---

## Enforcement

**Phase 7 Guarantee:** All entities flowing into UI are normalized.

If a template receives unnormalized data, it's a bug.

Report with:
1. Entity type
2. Missing/wrong field
3. Where it entered the system
