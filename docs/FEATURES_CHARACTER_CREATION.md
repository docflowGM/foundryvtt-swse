# SWSE Character Creation & Progression Features

**Complete guide to character creation systems, advancement, talent mechanics, and NPC generation.**

---

## Table of Contents

1. [Character Templates](#character-templates)
2. [Character Generation System](#character-generation-system)
3. [Level-Up & Advancement](#level-up--advancement)
4. [Talent System](#talent-system)
5. [NPC Generation](#npc-generation)
6. [Sheet Structure & Fields](#sheet-structure--fields)
7. [Feature Granting by Level](#feature-granting-by-level)

---

## Character Templates

### Overview

The Character Template system provides 20 pre-configured, optimized character builds for Star Wars Saga Edition level 1 characters. These templates are based on optimization guides and allow players to quickly create characters without going through the full character creation process.

### Features

- **20 Pre-configured Templates**: 4 archetypes for each of the 5 core classes
- **Fully Optimized**: Optimal ability scores, feats, talents, and skills
- **One-Click Creation**: Create complete characters in seconds
- **Equipment Lists**: Recommended starting equipment
- **Class Variety**: Multiple playstyles per class

### Available Templates

#### Jedi (5 templates)
1. **Lightsaber Duelist** - Guardian Focus
   - Mirialan DEX-based finesse fighter
   - Block talent for defensive prowess
   - High mobility and Reflex Defense

2. **Force Wizard** - Consular Focus
   - Miraluka Force-focused controller
   - 4 Force Powers at level 1
   - High Use the Force skill

3. **Tank/Defender** - Guardian Focus
   - Zabrak high-CON defender
   - Deflect talent for ranged defense
   - Excellent HP and durability

4. **Dark Side Hunter** - Sentinel Focus
   - Miraluka investigative specialist
   - Dark Side Sense talent
   - Balanced Force abilities and stealth

#### Noble (4 templates)
1. **Diplomat/Face Character** - Zeltron social specialist with Persuasion +18
2. **Inspirational Leader** - Human tactical commander with Born Leader talent
3. **Wealthy Manipulator** - Bothan information broker with 5,000 starting credits
4. **Noble Duelist** - Zeltron finesse combatant with CHA-based attack

#### Scoundrel (4 templates)
1. **Pistoleer** - Human precision shooter with Sneak Attack
2. **Skill Monkey** - Bothan versatile specialist with 8 trained skills
3. **Dirty Fighter** - Duros condition track manipulator
4. **Fortune's Favorite** - Twi'lek lucky gambler with Fool's Luck

#### Scout (4 templates)
1. **Sniper/Marksman** - Duros long-range specialist with Acute Senses
2. **Mobile Skirmisher** - Human hit-and-run specialist with Long Stride
3. **Survivalist/Tracker** - Ithorian wilderness expert with Survival +12
4. **Infiltrator/Spy** - Bothan stealth specialist with Stealth +18

#### Soldier (4 templates)
1. **Sharpshooter** - Human precision marksman with Devastating Attack (Rifles)
2. **Heavy Weapons Specialist** - Human suppression specialist
3. **Melee Warrior** - Wookiee close combat specialist with massive STR bonus
4. **Armored Tank** - Gen'Dai defensive specialist with doubled damage threshold

### How to Use Templates

**Method 1: Create Actor Dialog**
1. Click the "Create Actor" button in the Actors directory
2. Select "Use Character Template"
3. Browse templates by class
4. Click "Select Template" on your chosen build
5. Enter character name
6. Character is created automatically!

**Method 2: Quick Access Buttons**
1. Look for the "Templates" button in the Actors directory header
2. Click to open template selection
3. Choose your template
4. Enter character name

### What Gets Applied Automatically

✅ **Ability Scores** - Optimized array (16, 14, 12, 12, 10, 8)
✅ **Species** - With racial ability modifiers
✅ **Class** - Level 1 in the appropriate class
✅ **Skills** - All trained skills marked
✅ **Feat** - Level 1 feat added from compendium
✅ **Talent** - Class talent added from compendium
✅ **Force Powers** - For Jedi templates
✅ **Starting Credits** - Based on class

### What You Need to Add Manually

⚠️ **Equipment** - Template shows recommendations, add from inventory/compendium
⚠️ **Background/Biography** - Add character's story
⚠️ **Portrait/Token** - Upload character art

---

## Character Generation System

### Overview

The Character Generation system is a multi-step wizard for creating new characters. It guides players through species selection, ability score allocation, class selection, feat/talent selection, skill training, and equipment shopping.

### Flow Overview

**For Living Characters (10 Steps):**
1. Name & Basic Info
2. Type Selection (pick Living)
3. Species Selection
4. Ability Scores (Point Buy: 25 points)
5. Class Selection (Core only)
6. Feat Selection
7. Talent Selection
8. Skill Training
9. Summary Review
10. Equipment Shopping

**For Droids (11 Steps):**
1. Name & Basic Info
2. Type Selection (pick Droid)
3. Degree Selection
4. Size Selection
5. Droid Builder (select components)
6. Feat Selection
7. Talent Selection
8. Skill Training
9. Summary Review
10. Equipment Shopping

### Validation System (Two-Phase)

**Phase 1: Pre-Filtering (getData)**
- Loads all items from compendium
- Checks prerequisites for each item
- Filters to only qualified items
- Result: Invalid items never appear in UI

**Phase 2: Runtime Validation (Selection)**
- User clicks item
- Handler calls check function again
- Double-check prerequisites
- Result: Invalid selections are rejected with specific message

### Prerequisite Types Supported

| Type | Pattern | Example |
|------|---------|---------|
| Ability | "STR 13" | "Strength 15+" |
| BAB | "BAB +5" | "Base Attack Bonus +7" |
| Level | "Level 5" | "Character level 12" |
| Class | "Soldier 1" | "Jedi 3" |
| Skill | "Trained in X" | "Use the Force" |
| Force | "Force Sensitivity" | Force Sensitivity |
| Feat | "Power Attack" | "Spring Attack" |
| Talent | "Novice" | "Master" |

### Point Buy System

- **Standard Pool**: 25 points
- **Droid Pool**: 20 points
- **Ability Score Range**: 8-18 before racial modifiers
- **Racial Modifiers**: Applied automatically
- **Must Allocate All Points**: Cannot proceed until all points spent

### Hard Blocking Points

These steps require selection before proceeding:
- Ability increases: MUST allocate all 2 points (at levels 4, 8, 12, 16, 20)
- Feat selection: MUST select if required
- Talent selection: MUST select if required
- Name/Species/Class: MUST select

### Error Messages

**Warning Messages:**
- "You must allocate all 2 ability points before continuing!"
- "You must select a feat before continuing!"
- "You must select a talent before continuing!"
- "Cannot select {item}: {reason}"

**Success Messages:**
- "Species selected: {name}"
- "Selected feat: {name}"
- "+1 to STR (Total increases: 1/2)"

### Nonheroic Character Creation

NPCs start as **Nonheroic** characters and can optionally multiclass into heroic classes. Nonheroic progression differs from heroic:

| Feature | Nonheroic | Heroic |
|---------|-----------|--------|
| HP per level | 1d4 + CON | 1d6-1d10 + CON |
| Defense bonus | 10 + ability | 10 + level + ability |
| Force Points | 0 | 5 + ½ level |
| Talents | None | Yes |
| Ability increases | 1 per 4 levels | 2 per 4 levels |

---

## Level-Up & Advancement

### Overview

The Level-Up system allows existing characters to advance through levels, gaining new abilities, feats, talents, and ability increases.

### Entry Point

Click the "Level Up" button on the character sheet to open the multi-step dialog.

### Level-Up Flow

1. **Class Selection** - Choose which class to advance in (can multiclass)
2. **Ability Increase** (at levels 4, 8, 12, 16, 20) - Allocate 2 ability points
3. **Feat Selection** (if available) - Choose feat from qualified options
4. **Talent Selection** (if available) - Choose talent from tree
5. **Summary** - Review all changes
6. **Complete** - Applies advancement to character

### HP Gain Calculation

- Roll d6-d10 based on class hit die + CON modifier
- Certain talents (Heavy Plating, Toughness) add flat bonuses
- Result averaged or rolled per game settings
- Minimum 1 HP per level always gained

### Ability Increases (Levels 4, 8, 12, 16, 20)

- **Must allocate exactly 2 points** across any abilities
- Cannot exceed total ability score of 20 (before spells/items)
- Applied immediately to derived calculations

### Feat Granting by Level

Determined by class progression:
- **Level 1**: 1 feat (+ racial bonuses for humans)
- **Even Levels**: Class may grant bonus feats (checked from compendium)
- **Specific Levels**: Prestige classes grant feats at certain levels

### Talent Granting by Level

- **Level-specific allocation**: Some levels grant talent selections
- **Talent Tree Restriction**: Can be current class tree only or any tree (setting)
- **Prerequisite Checking**: Checked via PrerequisiteValidator

### Settings That Affect Advancement

| Setting | Options | Default |
|---------|---------|---------|
| Multiclass Bonus | "feat" or "skill" | varies |
| Talent Trees | "current" or "any" | varies |
| Ability Increase | "flexible" or "standard" | "flexible" |
| HP Generation | "maximum", "average", "roll", "average_minimum" | "average" |

---

## Talent System

### Overview

The talent system includes 853 talents organized into passive and active categories. Talents provide character-specific abilities, bonuses, and mechanics.

### Talent Categories

| Category | Count | Implementation |
|----------|-------|-----------------|
| **Passive Talents** | 247 | Active Effects (automatic) |
| **Active Talents** | 583 | Activation Cards (manual) |
| **Follower Talents** | 23 | Trigger Follower Generator |

### Passive Talents (247)

These provide flat bonuses or passive effects and are implemented as Active Effects:

**Examples:**
- Armor Mastery (+1 max Dex)
- Weapon Specialization (+2 damage)
- Long Stride (+2 speed)
- Evasion (no damage on Reflex miss)
- Keen Shot (+1 ranged attack)

**How They Work:**
- Automatically apply bonuses
- No player interaction needed
- Stacking handled by ModifierEngine

### Active Talents (583)

These require manual activation and are presented as clickable cards:

**Examples:**
- Adept Negotiator (Persuasion vs Will to move enemy -1 condition)
- Block (Use the Force check to negate melee attack)
- Deflect (Use the Force check to negate ranged attack)
- Inspire Confidence (Grant allies +1 to attacks/skills)

**How They Work:**
- Player clicks card in character sheet
- Card shows activation requirements
- Handles skill checks, DC comparisons
- Tracks uses (once/encounter, once/day)
- Shows results

### Follower-Granting Talents (23)

When selected, automatically trigger the follower generator system:

| Talent | Tree |
|--------|------|
| Attract Minion | Mastermind |
| Bodyguard I-III | Mastermind |
| Commanding Officer | Squad Leader |
| Inspire Loyalty | Loyal Protector |
| Reconnaissance Team Leader | Reconnaissance |

### Talent Trees

Each class has 1-3 talent trees:

**Example: Soldier**
- Infantry
- Heavy Weapons
- Weapon Specialist

Trees can be selected during character creation and leveling. Some systems restrict to current class tree only; others allow selection from any available tree.

### Talent Prerequisites

Checked during selection:
- Required feat (e.g., "Force Sensitivity")
- Required talent (e.g., "Novice")
- Ability score minimum
- Base Attack Bonus minimum
- Skill training requirement

---

## NPC Generation

### Overview

NPCs use a streamlined workflow compared to player characters. They start as **Nonheroic** characters and can multiclass into heroic classes.

### Nonheroic Character Templates

Five template options in `data/nonheroic-templates.json`:

1. **Worker** - Mechanic/technician with Mechanics +10
2. **Trooper** - Basic soldier with armor/weapon proficiency
3. **Criminal** - Thug with stealth and deception skills
4. **Merchant** - Trader with Persuasion +10 and 1,000 credits
5. **Police Officer** - Law enforcement with Perception +8

### Creating Nonheroic NPCs

**Option A: Template-Based (Recommended)**
1. Use templates from `nonheroic-templates.json`
2. Templates set abilities, skills, and feats automatically
3. Apply template during chargen
4. Creates character at Nonheroic 1

**Option B: Manual Creation**
1. Create character through normal chargen
2. Select "Nonheroic" class
3. Select 3 starting feats (restricted list)
4. Select skills (1 + INT modifier)

### Nonheroic Starting Stats

- **HP**: 1d4 + CON modifier
- **Defenses**: 10 + ability modifiers (NO level bonus)
- **BAB**: +0
- **Force Points**: 0
- **Skills**: 1 + INT modifier trained
- **Feats**: 3 starting feats (restricted list)

### Leveling Nonheroic Characters

**Continuing as Nonheroic:**
- HP Gain: 1d4 + CON modifier
- Feats: At levels 1, 3, 6, 9, 12, 15, 18
- Ability Increases: 1 ability per 4 levels
- NO Talents, NO Force Points

**Multiclassing into Heroic:**
- Example: Nonheroic 4 → Nonheroic 4 / Soldier 1
- Gains talents from heroic class
- Gains Force Points (based on heroic level only)
- Heroic levels add to defense scores
- Full BAB from both classes (additive)

### Converting Non-Human NPCs

To create non-human nonheroic:

1. Start with a template (e.g., Trooper)
2. Change species to desired race
3. Remove 1 feat (humans get bonus feat)
4. Remove 1 trained skill (humans get bonus skill)
5. Add species traits (ability modifiers, special abilities)

**Example: Bothan Merchant**
- Base Template: Merchant
- Species: Bothan → +2 INT
- Remove 1 feat: "Skill Training (Gather Information)"
- Remove 1 skill: Keep Persuasion and Use Computer
- Add Bothan trait: +2 Gather Information

---

## Sheet Structure & Fields

### Actor Data Model

```
actor.system
├── level: number (1-20+)
├── type: string ('character' | 'npc' | 'droid' | 'creature')
├── credits: number
├── hp: {
│   ├── value: number (current HP)
│   └── max: number (maximum HP)
├── abilities: {
│   ├── str: { base, mod, total }
│   ├── dex: { base, mod, total }
│   ├── con: { base, mod, total }
│   ├── int: { base, mod, total }
│   ├── wis: { base, mod, total }
│   └── cha: { base, mod, total }
├── defenses: {
│   ├── reflex: number
│   ├── fortitude: number
│   └── will: number
├── bab: number (Base Attack Bonus)
├── classes: [{ class, level }] (multiclass support)
├── skills: {
│   ├── [skillKey]: {
│   │   ├── trained: boolean
│   │   ├── total: number
│   │   └── ranks: number
│   │ }
│ }
├── feats: [{ name, source }]
├── talents: [{ name, tree, source }]
└── derived: {
    ├── shield: { ... }
    ├── damageReduction: { ... }
    └── ... (calculated by DerivedCalculator)
}
```

### Character Sheet Tabs

| Tab | Content |
|-----|---------|
| **Summary** | Portrait, name, defenses, HP, condition track |
| **Attributes** | Ability scores, modifiers, calculations |
| **Skills** | All skills with trained checkboxes |
| **Combat** | Attack bonuses, weapons, armor, initiative |
| **Force** | Force Points, Force Powers, suite |
| **Talents** | Talent trees, selections by level |
| **Inventory** | Equipment, items, carrying capacity |
| **Biography** | Notes, background, story |

---

## Feature Granting by Level

### How Features Are Granted

The progression engine reads class data from compendium and grants exactly what that level provides:

1. **Determine level in class** - e.g., taking 2nd level of Jedi
2. **Load class data from compendium** - Contains full level progression
3. **Check what that specific level grants** - Bonus feats, talents, force points
4. **Update budgets accordingly** - Feat/talent availability increased

### Example: Jedi Progression

| Level | In Class | Bonus Feats | Talents | Total Feat Budget | Total Talent Budget |
|-------|----------|-------------|---------|-------------------|---------------------|
| 1     | Jedi 1   | 0           | 1       | 1 (base)          | 1                   |
| 2     | Jedi 2   | 1           | 0       | 2                 | 1                   |
| 3     | Jedi 3   | 0           | 1       | 2                 | 2                   |
| 4     | Jedi 4   | 1           | 0       | 3                 | 2                   |

### Prestige Class Support

Prestige classes work the same way:
- Load prestige class from compendium
- Determine level in prestige class
- Grant features from that level entry
- No hardcoded data needed

### Force Points

Calculated per level:
- **Non-Force class**: 0 Force Points
- **Force-sensitive class**: 5 + (½ × heroic level)
- **Example**: Level 5 Jedi = 5 + 2 = 7 Force Points

### Calculating Defenses

**Base**: 10 + Heroic Level + Ability Modifiers

**Defense Bonuses**:
- Reflex Defense: DEX modifier only
- Fortitude Defense: CON modifier only
- Will Defense: WIS modifier only

**Modifications**:
- Armor reduces Reflex Defense max
- Talents/feats add to specific defenses
- Force abilities may modify temporarily

---

## Key Implementation Files

| Function | File |
|----------|------|
| Character Creation | `scripts/apps/chargen/chargen-main.js` |
| Level-Up System | `scripts/apps/levelup/levelup-main.js` |
| Prerequisite Validation | `scripts/utils/prerequisite-validator.js` |
| Talent Trees | `scripts/apps/levelup/levelup-talents.js` |
| Class Data Loading | `scripts/data/class-data-loader.js` |
| NPC Templates | `data/nonheroic-templates.json` |
| Character Templates | `data/character-templates.json` |

---

**Ready for**: Character creation, advancement, and talent system usage
