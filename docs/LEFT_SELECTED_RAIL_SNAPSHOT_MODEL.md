# Left Selected Rail Snapshot Model — Section Definitions

**Date:** 2026-03-28
**Purpose:** Define the snapshot section composition rules, field definitions, and justify the compact rail vs summary/detail rail distinction

---

## Snapshot Section Composition Rules

### Identity Section (Always Included)

**Sections:** Species | Class | Background

**Visibility Rules:**
- Species: Always shown if selected
- Class: Always shown if selected
- Background: Chargen only (levelup ignores background)

**Purpose:** Answer "Who am I becoming?"
- Immutable identity anchors for the character
- Quick reference to core archetype choices
- Highlighted when step is active (current-step indicator)

**Why in Left Rail:**
- Tactical: User needs to see at a glance what species/class they chose
- Not in summary: Summary shows full item details (traits, bonuses, descriptions)
- Not in detail: Detail shows one focused item; left rail shows all identity choices at once

**Data Source:** `projection.identity.species`, `projection.identity.class`, `projection.identity.background`

**Compact Format:** One line per item (Species: Human | Class: Soldier | Background: Colonist)

---

### Attributes Section (Chargen Only)

**Visible For:** chargen-actor, chargen-beast, chargen-droid, chargen-follower, chargen-nonheroic
**Hidden For:** levelup-* paths (levelup doesn't allow attribute increases)

**Sections:** STR | DEX | CON | INT | WIS | CHA (with modifiers)

**Purpose:** Answer "What are my raw ability scores?"
- Current point-buy or rolled values
- Modifiers derived from scores
- Not trainable; set once and fixed
- Critical for damage, initiative, saves, skill checks

**Why in Left Rail:**
- Tactical: User needs to confirm their attribute choices during chargen
- Compact grid: 2-column grid shows all 6 at once, with scores above and modifiers below
- Not in summary: Summary doesn't repeat attributes (already committed and immutable)
- Not in detail: Detail focuses on one ability at a time; rail shows all six at once

**Data Source:** `projection.attributes[key].score`, `projection.attributes[key].modifier`

**Compact Format:** 2-column grid
```
STR         DEX
14 (+2)     12 (-1)
CON         INT
13 (+0)     10 (+0)
WIS         CHA
15 (+2)     11 (+0)
```

---

### Skills Section (Always Included)

**Visible For:** All paths (chargen-*, levelup-*)

**Content:** Trained skills list only (not untrained skill defaults)

**Purpose:** Answer "What am I trained in?"
- Quick scan of chosen trained skills
- Trainable during all progression paths
- Counts toward skill cap and ability modifiers

**Why in Left Rail:**
- Tactical: User needs to confirm skill selections as they choose them
- List format: Show skill names; values are just boolean "trained"
- Count in header: `Skills (n)` shows total count at a glance
- Not in summary: Summary shows full skill mechanics (DCs, trained/untrained breakpoints, conditional bonuses)
- Not in detail: Detail shows one skill with full mechanics; rail shows all trained skills listed

**Data Source:** `projection.skills.trained[]` (array of skill name objects or strings)

**Compact Format:** List with count
```
Skills (8)
Acrobatics
Athletics
Deception
Knowledge (Dungeoneering)
...
```

---

### Feats Section (Always Included)

**Visible For:** All paths (chargen-*, levelup-*)

**Content:** Feat count breakdown by category (General | Class)

**Purpose:** Answer "How many feats have I chosen and of what type?"
- Total feat count
- Breakdown between general and class-specific
- Feats are trainable and affect multiple mechanics

**Why in Left Rail:**
- Tactical: User needs to see how many feats remain to select
- Compact format: Show counts, not full feat names (space conservation)
- Category breakdown: User needs to know class-specific vs general split for draft state
- Not in summary: Summary lists actual feat names and rules implications
- Not in detail: Detail shows one feat with prerequisites and effects; rail shows summary counts

**Data Source:** `projection.abilities.feats[]` (array of feat objects with `isClassSpecific` flag)

**Compact Format:** Category breakdown
```
Feats (6)
General     4
Class       2
```

---

### Talents Section (Always Included)

**Visible For:** All paths (chargen-*, levelup-*)

**Content:** Talent count only

**Purpose:** Answer "How many talents have I selected?"
- Narrow focus: Just the count
- Talents are path-specific and stackable
- Part of progression tree

**Why in Left Rail:**
- Tactical: User needs to confirm talent selections
- Single count: Simple display (no category breakdown needed)
- Not in summary: Summary lists actual talent names and synergies
- Not in detail: Detail shows one talent with full tree context; rail shows selected count only

**Data Source:** `projection.abilities.talents[]` (array length)

**Compact Format:** Count only
```
Talents (3)
Selected    3
```

---

### Languages Section (Always Included)

**Visible For:** All paths (chargen-*, levelup-*)

**Content:** List of known languages

**Purpose:** Answer "What languages can I speak?"
- Determined by species, background, and selections
- Part of character flavor and roleplay
- Not trainable (determined by rules)

**Why in Left Rail:**
- Tactical: User needs to confirm which languages they have after species/background selection
- List format: Show each language as simple item
- Count in header: `Languages (n)` shows total at a glance
- Not in summary: Summary shows language mechanics (script availability, bonus languages)
- Not in detail: Detail shows one language with cultural context; rail shows all at once

**Data Source:** `projection.languages[]` (array of language names)

**Compact Format:** Simple list with count
```
Languages (4)
Basic
Durese
Ewokese
High Galactic
```

---

### Credits Section (Chargen Only)

**Visible For:** chargen-actor, chargen-beast, chargen-droid, chargen-follower, chargen-nonheroic
**Hidden For:** levelup-* paths (credits are assigned at chargen only)

**Content:** Available credits count

**Purpose:** Answer "How many credits can I spend on equipment?"
- Derived from class and background selections
- Total available for equipment purchases
- Immutable after calculation

**Why in Left Rail:**
- Tactical: User needs to see total before equipment step
- Single value: Just the amount remaining
- Not in summary: Summary shows equipment breakdown and weight totals
- Not in detail: Detail shows one item's cost and mechanics; rail shows total pool only

**Data Source:** `projection.derived.credits`

**Compact Format:** Single value
```
Credits
Available    1500 cr
```

---

### Droid Systems Section (Droid Paths Only)

**Visible For:** chargen-droid, levelup-droid
**Hidden For:** All other paths

**Content:** Count of selected droid systems

**Purpose:** Answer "What droid systems have I chosen?"
- Droid-specific progression element
- Counts toward power budget and slot limitations
- Part of droid customization

**Why in Left Rail:**
- Tactical: User needs to see cumulative system count
- Count only: Specific system details belong in detail rail
- Not in summary: Summary shows full system mechanics and interactions
- Not in detail: Detail shows one system with mechanics; rail shows total count

**Data Source:** `projection.droid.systems[]` (array length)

**Compact Format:** Count only
```
Droid Build
Systems     6
```

---

### Beast Profile Section (Beast Paths Only)

**Visible For:** chargen-beast, levelup-beast
**Hidden For:** All other paths

**Content:** Beast type (e.g., "Wolf", "Rancor", "Nexu")

**Purpose:** Answer "What beast species am I?"
- Core beast identity choice
- Determines base stats and abilities
- Single authoritative selection

**Why in Left Rail:**
- Tactical: User needs to confirm beast choice early
- Type only: Beast mechanics and stat modifiers belong in detail rail
- Not in summary: Summary shows full beast progression and available upgrades
- Not in detail: Detail shows beast mechanics and traits; rail shows just the type

**Data Source:** `projection.beast.type`

**Compact Format:** Single value
```
Beast Profile
Type        Nexu
```

---

### Nonheroic Profession Section (Nonheroic Paths Only)

**Visible For:** chargen-nonheroic, levelup-nonheroic
**Hidden For:** All other paths

**Content:** Chosen profession (e.g., "Moisture Farmer", "Smuggler", "Scholar")

**Purpose:** Answer "What non-adventuring profession do I practice?"
- Career focus for nonheroic characters
- Determines skill access and mechanical benefits
- Single selection per path

**Why in Left Rail:**
- Tactical: User needs to confirm profession selection
- Name only: Profession rules and benefits belong in detail rail
- Not in summary: Summary shows profession progression and earned benefits
- Not in detail: Detail shows profession mechanics; rail shows just the name

**Data Source:** `projection.nonheroic.profession`

**Compact Format:** Single value
```
Profession
Current     Moisture Farmer
```

---

## Section Ordering Logic

Sections appear in this order (filtered for path):

```
1. Identity         (species, class, background)
2. Attributes       (chargen only)
3. Skills           (all)
4. Feats            (all)
5. Talents          (all)
6. Languages        (all)
7. Credits          (chargen only)
8. Droid Build      (droid paths only)
9. Beast Profile    (beast paths only)
10. Profession      (nonheroic paths only)
```

**Rationale:** Identity and attributes first (immutable foundations), then trainable/selectable skills/feats/talents, then derived/calculated values (languages, credits), then path-specific specializations.

---

## Section Rendering Patterns

### Pattern 1: Single-Value Sections

**Used for:** Credits, Beast Type, Profession

```
Label               Value
Available           1500 cr
```

**When:** One immutable or simple value
**Why:** Minimal space; user just needs to see the number

---

### Pattern 2: Category Breakdown Sections

**Used for:** Feats (General | Class)

```
Feats (6)
General             4
Class               2
```

**When:** Multiple categories of countable items
**Why:** User needs to understand composition (not just total count)

---

### Pattern 3: Simple List Sections

**Used for:** Skills, Languages

```
Skills (8)
Acrobatics
Athletics
Deception
Knowledge (Dungeoneering)
```

**When:** Multiple named items of equal importance
**Why:** User needs to scan list; order may be important (alphabetical or chosen-order)

---

### Pattern 4: Compact Grid Sections

**Used for:** Attributes (STR, DEX, CON, INT, WIS, CHA)

```
Attributes     →
STR         DEX
14 (+2)     12 (-1)
CON         INT
13 (+0)     10 (+0)
WIS         CHA
15 (+2)     11 (+0)
```

**When:** Fixed set of 6 paired values (2-column grid)
**Why:** All 6 attributes fit at once; modifiers visible below scores

---

## Compact Rail vs Summary vs Detail

### Why This Distinction Exists

**Left Rail (Compact Snapshot):**
- **Time Horizon:** Current moment in progression
- **Scope:** Tactical view of in-progress selections
- **Audience:** User making current step choices
- **Format:** Counts, names, highlights; visual scan in 2-3 seconds
- **Update Frequency:** Every step selection change
- **Examples:** "Species: Human", "Feats (6) General 4 | Class 2", "Skills (8)", "Languages: Basic, Durese"

**Summary Rail (Final Review):**
- **Time Horizon:** End of progression
- **Scope:** Complete final build breakdown
- **Audience:** User reviewing before applying
- **Format:** Full item names, derived values, validation
- **Update Frequency:** Once at end
- **Examples:** "Species: Human (trait details)", "All 6 feats listed with descriptions", "All skills with DCs and modifiers"

**Detail Rail (Focused Depth):**
- **Time Horizon:** While examining one item
- **Scope:** Deep dive into one focused thing
- **Audience:** User researching before selection
- **Format:** Full mechanics, prerequisites, interactions, flavor
- **Update Frequency:** When focus changes
- **Examples:** "Feat: Dodge (prerequisites, +3 AC benefit, interactions with armor)", "Skill: Knowledge Dungeoneering (trained/untrained DCs, uses)"

### Non-Duplication Principle

✅ **Left Rail does NOT:**
- Show full item mechanics (that's detail)
- Show derived calculations beyond modifiers (that's summary)
- Allow interaction or navigation (center panel does that)
- Display flavor or roleplay details (that's detail)

✅ **Summary does NOT:**
- Show current selections during progression (that's left rail)
- Show mechanical depth on one item (that's detail)
- Update during progression (static until end)

✅ **Detail does NOT:**
- Show cumulative state (that's left rail)
- Show final validation (that's summary)
- Show multiple items at once (one focused item)

**Result:** Each rail has a distinct, non-overlapping responsibility. Left rail's value is showing "what I have so far" at a glance. Summary's value is "is it all complete and correct?" Detail's value is "what does this one thing do?"

---

## Verification Checklist

- [ ] Identity section appears in all paths
- [ ] Attributes section appears only in chargen paths
- [ ] Skills, Feats, Talents, Languages appear in all paths
- [ ] Credits section appears only in chargen paths
- [ ] Droid, Beast, Profession sections appear only in respective paths
- [ ] Empty sections are filtered out (no section if no items)
- [ ] Current step is highlighted with accent border
- [ ] Compact grid displays 6 attributes in 2 columns
- [ ] Category breakdowns show general/class split for feats
- [ ] Lists are scannable (short labels, right-aligned values)
- [ ] All data sources from projection (not from actor.system)
- [ ] Refresh happens after selection commit
- [ ] Rail updates reflect draftSelections immediately

---

## Next: LEFT_SELECTED_RAIL_VERIFICATION.md

Will verify:
1. Rail is no longer mostly empty (93% → 100% content coverage)
2. Data sources correctly from projection (never from actor.system mutable fields)
3. Refresh lifecycle works (immediate update after selection)
4. Species/Class/Background/etc update correctly during progression
5. Path-aware and step-aware composition renders correctly per path
6. Rail is visually distinct from summary and detail rails
7. Current-step highlighting works as expected
8. All sections render with correct data and formatting
