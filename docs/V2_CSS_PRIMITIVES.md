# V2 Sheet CSS Primitives

**Last Updated:** 2026-03-29
**Status:** EXTRACTION GUIDE FOR SHARED STYLES
**Scope:** Reusable CSS patterns for all V2 sheet types

This document identifies CSS primitives that should live in a shared style layer for reuse across Character, NPC, Droid, Vehicle, and future V2 sheets.

---

## Architecture

### Current State
- **Location:** `styles/sheets/v2-sheet.css` (character sheet)
- **Issue:** All CSS mixed together; no clear separation of shared vs sheet-specific
- **Goal:** Extract reusable primitives to `styles/sheets/v2-shared-primitives.css`

### Proposed Structure
```
styles/sheets/
├── v2-shared-primitives.css   (NEW - shared reusable classes)
├── v2-character-specific.css  (MOVED - character-only styling)
├── v2-npc-specific.css        (NEW - for NPC sheet)
├── v2-droid-specific.css      (NEW - for droid sheet)
└── v2-sheet.css               (EXISTING - backwards compatibility layer)
```

---

## Shared Primitives (Should be in v2-shared-primitives.css)

### 1. Layout Foundation (Flexcol Contract Enforcement)

**Purpose:** Ensure sheet layouts don't collapse if flexcol utilities missing

**Shared Classes:**
- `.swse-sheet` - Root flex container
- `.swse-sheet .sheet-body` - Primary growing container
- `.swse-sheet .sheet-inner` - Inner wrapper
- `.swse-sheet .sheet-tabs` - Fixed tab space
- `.swse-sheet .tab` - Scrollable tab content
- `.swse-sheet .swse-section` - Section wrapper
- `.swse-sheet .swse-panel` - Panel wrapper

**Characteristics:**
- Generic (no game logic)
- Uses standard flexbox patterns
- Reusable across all sheet types
- Critical for Foundry V13 compatibility

**Move to shared:** YES - All sheets need this foundation

---

### 2. Panel Structure (Frame/Content/Overlay)

**Purpose:** Normalize layout for SVG-backed panels

**Shared Classes:**
```css
.swse-panel { }              /* Root panel container */
.swse-panel__frame { }       /* SVG background layer */
.swse-panel__content { }     /* Main content in normal flow */
.swse-panel__overlay { }     /* Positioned elements on top */
```

**Geometry Variables (CSS Custom Properties):**
```css
--panel-<name>-min-height: 200px;
--panel-<name>-aspect-ratio: 1 / 1.2;
--panel-<name>-safe-area: inset(30px);
```

**Characteristics:**
- BEM methodology
- Works with SVG backgrounds
- Consistent across all panels
- Reusable for new panels

**Move to shared:** YES - Universal pattern

---

### 3. Component Primitives

#### 3.1 Stat Chip / Display
```css
.swse-stat { }               /* Single stat display */
.swse-stat .label { }        /* Stat label text */
.swse-stat .value { }        /* Stat value text */
```

**Use:** Health, defense, ability scores (any grid of numbers)

**Move to shared:** YES

#### 3.2 Resource Indicators (Ticks/Dots)
```css
.swse-v2-resources { }       /* Container for resource ticks */
.swse-v2-resource { }        /* Single resource */
.swse-v2-resource .label { }
.swse-v2-resource .count { }

/* Tick sizes */
.ticks { }
.tick { }                    /* Base tick circle */
.tick.filled { }             /* Filled tick */
.ticks.tick-xl { }           /* 10px size */
.ticks.tick-lg { }           /* 7px size */
.ticks.tick-md { }           /* 5px size */
.ticks.tick-sm { }           /* 4px size */
.ticks.tick-xs { }           /* 3px size */
```

**Use:** Action points, force points, dark side points, conditions

**Move to shared:** YES - Essential for all character types

#### 3.3 Buttons
```css
.swse-v2-btn { }             /* Small rounded button */
.swse-v2-btn:hover { }
```

**Characteristics:**
- Minimal padding
- Rounded style
- Consistent hover state
- Used for actions, opens, filters

**Move to shared:** YES

#### 3.4 Tags / Badges / Pills
```css
.tag { }                     /* Generic inline badge */
.pill { }                    /* Pill-shaped badge */
.badge { }                   /* Badge variant */

.tag.conditional { }         /* Variant: conditional effects */
.pill.conditional { }
```

**Use:** Feat tags, talent sources, damage types, conditions

**Move to shared:** YES

#### 3.5 Identity Grid (Key-Value Pairs)
```css
.swse-v2-identity-grid { }        /* 2-column grid */
.swse-v2-identity-grid .field { }
.swse-v2-identity-grid .label { }
.swse-v2-identity-grid .value { }
```

**Use:** Character name, player name, alignment, species, etc.

**Move to shared:** YES

#### 3.6 Text Affordances
```css
.swse-v2-open-item { }       /* Hoverable text item */
.swse-v2-open-item:hover { }
```

**Use:** Clickable links, inspectable items

**Move to shared:** YES

---

### 4. Ledger Row Primitives

#### 4.1 Generic Row Structure
```css
.swse-v2-entry { }                /* Single ledger row */
.swse-v2-entry .row { }           /* Flex row in entry */
.swse-v2-entry .name { }          /* Entry name text */

.swse-v2-group { }                /* Group of entries */
.swse-v2-group-header { }
.swse-v2-group-header .meta { }
.swse-v2-group-list { }
```

**Use:** Talents, feats, languages, abilities

**Move to shared:** YES - Pattern reused across all ledgers

#### 4.2 Grid-Based Rows (Skills, Attacks)
```css
.swse-v2-skills { }               /* Skills container */
.swse-v2-skill-header { }
.swse-v2-skill-row { }
  /* Grid template: 1fr 64px 24px 24px 64px */

.swse-v2-attacks { }              /* Attacks container */
.swse-v2-attack-header { }
.swse-v2-attack-row { }
  /* Grid template: 1fr 120px 120px 120px */

.swse-v2-skill-header,
.swse-v2-attack-header { }        /* Shared header styles */

.swse-v2-skill-row .total { }     /* Numeric emphasis */
.swse-v2-attack-row .meta { }
```

**Move to shared:** YES (with customizable grid templates)

---

### 5. Opacity/Hierarchy Patterns

**Purpose:** Standardize text emphasis across all sheets

**Pattern:**
```css
/* Primary text */
/* (no opacity modifier) */

/* Secondary text (labels, descriptions) */
opacity: 0.75;

/* Tertiary text (meta, counts) */
opacity: 0.7;

/* Hover states */
opacity: 0.6;
```

**Move to shared:** YES - Standardize in CSS variables

**Suggested variables:**
```css
--swse-text-primary: 1;
--swse-text-secondary: 0.75;
--swse-text-tertiary: 0.7;
--swse-text-hint: 0.6;
```

---

### 6. Drag & Drop Visual Feedback

```css
.swse-sheet.v2.drop-active { }               /* Sheet-level active */
.swse-sheet[data-drop-zone].drop-zone-active { } /* Zone-level */
.swse-sheet.owned-actors-list[data-drop-zone].drop-zone-active { }
.swse-sheet.holo-panel[data-drop-zone="crew"].drop-zone-active { }
```

**Color System:**
```css
--swse-success: #00ff88;          /* Drop zone active color */
--swse-drop-zone-bg: rgba(0, 255, 136, 0.08);
--swse-drop-zone-shadow: rgba(0, 255, 136, 0.15);
```

**Move to shared:** YES - Unified drag feedback across sheets

---

### 7. Color System (CSS Custom Properties)

**Establish in shared layer:**

#### 7.1 Theme Colors
```css
--swse-success: #00ff88;       /* Positive state, active */
--swse-warning: #ffd86b;       /* Caution, secondary */
--swse-danger: #ff5f5f;        /* Negative state */
--swse-info: #00f0ff;          /* Information, accent */
--swse-neutral: #7deaff;       /* Neutral variant */
```

#### 7.2 Opacity/Alpha Shades
```css
--swse-border-low: rgba(255, 255, 255, 0.08);
--swse-border-mid: rgba(255, 255, 255, 0.12);
--swse-border-high: rgba(255, 255, 255, 0.18);

--swse-bg-subtle: rgba(255, 255, 255, 0.03);
--swse-bg-low: rgba(255, 255, 255, 0.06);
--swse-bg-mid: rgba(0, 0, 0, 0.12);
--swse-bg-high: rgba(0, 0, 0, 0.15);
```

#### 7.3 Corner Radius Standards
```css
--swse-radius-sm: 6px;
--swse-radius-md: 8px;
--swse-radius-lg: 12px;
--swse-radius-pill: 999px;
```

#### 7.4 Spacing Standards
```css
--swse-space-xs: 2px;
--swse-space-sm: 4px;
--swse-space-md: 8px;
--swse-space-lg: 12px;
--swse-space-xl: 16px;
--swse-gap-compact: 6px;
--swse-gap-normal: 10px;
--swse-gap-loose: 12px;
```

**Move to shared:** YES - Establishes visual consistency

---

## Character-Sheet-Specific CSS (Move to v2-character-specific.css)

### Classes to Move
```css
/* Character identity */
.swse-v2-sheet-grid { }        /* 2-column layout */
.swse-v2-left { }
.swse-v2-right { }
.swse-v2-full { }              /* Full-width variant */

/* Character HP block */
.swse-v2-hp-row { }
.swse-v2-hp-block { }

/* Character defenses */
.swse-v2-defenses-grid { }

/* Combat flip cards */
.swse-combat-tab { }
.swse-attacks-panel { }
.swse-attack-card { }
.swse-attack-card .card-inner { }
.swse-attack-card .card-front { }
.swse-attack-card .card-back { }
.attack-name { }
.attack-primary { }
.attack-bonus { }
.attack-bonus.positive { }
.attack-bonus.neutral { }
.attack-bonus.negative { }
.attack-damage { }
.attack-crit { }
.attack-tags { }
.attack-roll-btn { }

/* Character actions */
.swse-v2-actions { }
.swse-v2-action-group { }
.swse-v2-action-group-header { }
.swse-v2-action-subgroup { }
.swse-v2-action-subheader { }
.swse-v2-action-list { }
.swse-v2-action-row { }
.swse-v2-action-row-top { }
```

**Rationale:** These implement character-specific features like combat cards, action economy, character grid layout

**Move to sheet-specific:** YES

---

## Migration Path

### Phase 1: Extract Shared Primitives (Immediate)
1. Create `styles/sheets/v2-shared-primitives.css` with shared classes
2. Update imports in all V2 sheet files to load shared primitives
3. Keep `v2-sheet.css` as backwards-compatibility aggregator
4. No functional changes, only reorganization

### Phase 2: NPC Sheet Adoption
1. NPC sheet loads: shared primitives + NPC-specific CSS
2. Validates that primitives work for NPC data structure
3. Identifies missing primitives or sheet-specific needs
4. Creates `v2-npc-specific.css` as needed

### Phase 3: Droid Sheet Adoption
1. Droid sheet loads: shared primitives + droid-specific CSS
2. Similar validation cycle
3. Creates `v2-droid-specific.css`

### Phase 4: Vehicle Sheet Adoption
1. Vehicle sheet loads: shared primitives + vehicle-specific CSS
2. Similar validation cycle
3. Creates `v2-vehicle-specific.css`

**Expected Outcome:**
- Shared primitives stabilized
- 40-50% CSS code reduction across sheets
- Consistent visual language
- Easier to add new sheet types

---

## Validation Checklist

When extracting or adding to shared primitives:

- [ ] Class is **not** SWSE game-specific (no talent tiers, Force sensitivity, etc.)
- [ ] Class works for **all** actor types (character, NPC, droid, vehicle)
- [ ] Class has **clear purpose** documented above
- [ ] Class uses **CSS custom properties** for customization
- [ ] Class **doesn't depend** on character-specific HTML structure
- [ ] Class **supports** conditional visibility (via data attributes or CSS classes)
- [ ] Class has **BEM naming** (if needed) or follows pattern
- [ ] Class includes **hover states** where applicable

---

## Common Questions

### Q: Why extract primitives now?
**A:** The more sheets we build with duplicate CSS, the harder maintenance becomes. Extracting now prevents that debt.

### Q: What if a primitive needs tweaking for NPC?
**A:** Override it in NPC-specific CSS with more specificity. Keep shared version generic.

### Q: Should panel-specific colors be in shared?
**A:** Yes, use CSS custom properties:
```css
.swse-panel--health {
  --panel-bg: var(--swse-health-bg, rgba(0, 200, 50, 0.08));
}
```

### Q: What about responsive breakpoints?
**A:** Define in shared layer. Each sheet decides if breakpoints apply.

---

## References

- **Shared Platform Layer:** `scripts/sheets/v2/shared/`
- **Current Styles:** `styles/sheets/v2-sheet.css`
- **Character Sheet:** `scripts/sheets/v2/character-sheet.js`
- **Platform Architecture:** `V2_SHEET_PLATFORM_ARCHITECTURE.md`
- **Vocabulary:** `SHEET_PLATFORM_VOCABULARY.md`
