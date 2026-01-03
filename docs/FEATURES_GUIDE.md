# Star Wars Saga Edition - Complete Features Guide

This comprehensive guide lists every feature in the SWSE system with descriptions and usage instructions.

---

## Table of Contents

1. [Core Systems Overview](#core-systems-overview)
2. [Character Creation & Generation](#character-creation--generation)
3. [Character Sheet Systems](#character-sheet-systems)
4. [Progression & Leveling](#progression--leveling)
5. [Combat Systems](#combat-systems)
6. [Force Powers & Abilities](#force-powers--abilities)
7. [Equipment & Inventory](#equipment--inventory)
8. [Vehicles & Starships](#vehicles--starships)
9. [Droids](#droids)
10. [NPCs & Followers](#npcs--followers)
11. [Customization & Houserules](#customization--houserules)
12. [Game Management Tools](#game-management-tools)

---

## Core Systems Overview

### What is the Progression Engine?

The **Progression Engine** is the core system that drives all character advancement and feature management in the SWSE system. It is a sophisticated, multi-layered system located in `/scripts/progression/` that handles:

**Character Generation (Chargen)**
- Guided 7-8 step wizard for creating level 1 characters
- Species selection with automatic ability modifiers
- Background selection with skill bonuses
- Ability score generation (6 different methods available)
- Class selection from 50+ base and prestige classes
- Skill allocation based on class and INT modifier
- Feat selection with prerequisite validation
- Talent selection from class-specific talent trees
- Starting equipment configuration

**Character Leveling & Advancement**
- Multi-class support (add additional classes at each level)
- Hit point calculation per level
- Ability score increases every 4 levels
- Class feature granting at appropriate levels
- Feat selection at bonus feat levels
- Talent selection from updated talent trees
- Force power progression (for Force-sensitive characters)
- Skill point allocation

**Feature Management**
- Automatic normalization of class features
- Talent tree validation and enforcement
- Feat prerequisite checking and conflict detection
- Force power level-gating
- Derived stat calculation (defenses, BAB, damage thresholds)
- Equipment granting based on background/class
- Language bonus application

**System Architecture**
The Progression Engine consists of multiple specialized components:
- **Feature Dispatcher** - Routes feature application to appropriate handlers
- **Attribute Increase Handler** - Manages ability score increases at levels 4, 8, 12, 16, 20
- **Derived Calculator** - Automatically calculates defenses, initiative, and other derived stats
- **Force Power Engine** - Manages Force power availability and progression
- **Language Engine** - Handles language bonuses from species/backgrounds
- **Equipment Engine** - Applies starting equipment and background grants
- **Validators** - Prevent feat duplication and check prerequisites

**Key Capability**: The engine intelligently tracks player choices and automatically applies all mechanical changes without manual intervention, keeping characters' sheets always up-to-date.

---

### What is the Mentor System?

The **Mentor System** is an interactive guidance and suggestion engine that enhances the character creation experience by providing contextual advice and recommendations from in-universe mentor characters. It's located in `/scripts/apps/` and consists of several integrated components:

**Five Mentor Personalities**

1. **Miraj** (Jedi Mentor)
   - Philosophical and Force-centric guidance
   - Focuses on balance, wisdom, and the Force
   - Recommends Force powers, defensive feats, and contemplative talents
   - Ideal for players wanting Jedi-style characters

2. **Lead** (Scout Mentor)
   - Tactical and field-experienced advice
   - Focuses on practical survival and mobility
   - Recommends ranger-style talents, movement bonuses, and scout abilities
   - Ideal for adventurous, exploration-focused characters

3. **Breach** (Mandalorian Mentor)
   - Direct, discipline-oriented guidance
   - Focuses on combat readiness and profession
   - Recommends soldier talents, combat feats, and weapon specialization
   - Ideal for tough, no-nonsense combatants

4. **Ol' Salty** (Pirate Mentor)
   - Colorful, irreverent advice
   - Focuses on cunning, charm, and adventure
   - Recommends scoundrel talents, deception, and charisma-based abilities
   - Ideal for roguish, charismatic characters

5. **J0-N1** (Protocol Droid Mentor)
   - Formal, efficient, protocol-minded guidance
   - Focuses on rules, optimization, and technical details
   - Recommends optimal feat combinations and mechanical efficiency
   - Ideal for players wanting to optimize character builds

**Mentor System Features**

**Contextual Guidance Popups**
- Displayed at each character creation step with typing animation
- Mentor-specific guidance text varies by personality
- Encourages immersive roleplaying during character creation
- Can be disabled in settings for streamlined creation

**Suggestion Engine Integration**
- Generates mentor-voiced feat suggestions during feat selection
- Provides class recommendations with personality flavoring
- Suggests talents matching mentor's expertise
- Offers ability score allocation advice
- Creates BuildIntent biases to influence future recommendations

**Post-Class Survey**
- Presented after class selection to understand player intent
- Asks questions like: "Are you optimizing for combat?" or "Do you prefer support roles?"
- Results inform subsequent mentor suggestions and recommendations
- Helps mentors tailor advice to player preferences

**Personality-Driven Text Variation**
- Same mechanical recommendation presented differently by each mentor
- Miraj: Philosophical framing of feat benefits
- Lead: Practical tactical applications
- Breach: Combat discipline and readiness implications
- Ol' Salty: Swashbuckling and adventurous angles
- J0-N1: Optimization metrics and mechanical details

**Immersive Features**
- Mentor dialogue displayed with character-by-character typing animation
- Visual UI styled to match chosen mentor's personality
- Mentor portrait displayed during guidance
- Chat integration for fallback when popups disabled
- Seamless integration with character creation flow

**System Integration Points**
- Hooks into chargen step completion
- Connected to feat/talent/class selection UI
- Influences automatic suggestion system
- Tracks player choices to refine recommendations
- Coordinates with template builder for archetype suggestions

---

## Character Creation & Generation

### 1. Improved Character Generator (7-Step Wizard)

**Description:** Complete character creation tool that guides you through all steps to create a level 1 character.

**How to Use:**
1. Create a new character actor in Foundry
2. Click **"Character Generator"** button on the character sheet
3. Follow the 7 steps:
   - Step 1: Choose species (human, Twi'lek, Wookiee, etc.)
   - Step 2: Choose class (Jedi, Scoundrel, Soldier, etc.)
   - Step 3: Generate ability scores (4d6 Drop, Point Buy, Standard Array, etc.)
   - Step 4: Select bonus feats
   - Step 5: Choose starting talents from talent tree
   - Step 6: Select background and starting equipment
   - Step 7: Review and finalize
4. Character is automatically generated with all stats calculated

**Features:**
- Multiple ability score generation methods
- Species ability modifiers applied automatically
- Class features applied automatically
- Feat/talent prerequisite checking
- Starting equipment integration
- Point Buy pool system (customizable per houserules)

---

### 2. Character Template System

**Description:** Quick creation using pre-built character templates.

**How to Use:**
1. Right-click on a character in the sidebar
2. Select **"Use as Template"**
3. A copy is created with the same base configuration
4. Customize from the template as needed

**Features:**
- Pre-built templates for common archetypes
- Save time on character creation
- Consistency across similar characters

---

### 3. Ability Score Generation Methods

**Description:** Multiple ways to generate your ability scores (STR, DEX, CON, INT, WIS, CHA).

**Methods Available:**
- **4d6 Drop Lowest** (most common) - Roll 4d6 six times, drop lowest each time
- **Organic (24d6)** - Roll 24d6 and distribute freely
- **Point Buy** - Allocate points across abilities (base 8-15 range)
- **Standard Array** - Use preset array (15, 14, 13, 12, 10, 8)
- **3d6 Straight** - Roll 3d6 six times in order
- **2d6+6** - Roll 2d6+6 for each ability
- **Custom** - Enter ability scores manually

**How to Use:**
1. During character generation, select your preferred method
2. Follow the prompts to generate/allocate scores
3. Ability modifiers are calculated automatically

---

### 4. Species Selection & Bonuses

**Description:** Choose your character's species with automatic ability modifiers and racial traits.

**Available Species:** 20+ including:
- Humans (versatile, bonus feat)
- Twi'leks (Charisma bonus)
- Wookiees (Strength bonus)
- Zabraks (combat-focused)
- Mon Calamari (technical)
- Droids (unique progression)
- And many more!

**How to Use:**
1. Step 1 of character generator: Choose species
2. Ability modifiers apply automatically
3. Species traits are granted automatically
4. Language bonuses are applied

---

### 5. Class Selection & Progression

**Description:** Choose your character class which determines ability progression, hit points, feats, talents, and class features.

**Available Classes:** 5 base classes plus prestige classes:
- **Jedi** - Force-sensitive warrior
- **Scoundrel** - Skill-focused rogue
- **Soldier** - Combat specialist
- **Scout** - Mobile ranger/explorer
- **Noble** - Leader/diplomat
- Plus 20+ prestige classes (Jedi Knight, Jedi Master, Crime Lord, Elite Trooper, etc.)

**How to Use:**
1. Step 2 of character generator: Choose class
2. Class is applied with correct BAB, HP, and features
3. During level-up, can multi-class (add additional classes)

**Features:**
- Base Attack Bonus (BAB) progression
- Hit point calculation per level
- Class feature granting
- Talent tree access
- Multi-class support (add additional classes)

---

### 6. Multi-Classing System

**Description:** Add additional classes to your character for hybrid builds.

**How to Use:**
1. Click **"Level Up"** button on character sheet
2. Select a new class when prompted
3. New class is added to your progression
4. Abilities from both classes are available
5. Feats and talents from all classes are accessible

**Features:**
- Blend features from multiple classes
- Automatic progression blending
- BAB and HP stack correctly
- All class features available

---

### 7. Feat Selection System

**Description:** Choose from 150+ feats during character creation and at bonus feat levels.

**How to Use:**
1. Step 4 of character generator: Select feats
2. Browse available feats
3. Click to add feats to character
4. Prerequisite requirements are validated
5. Feats grant automatic bonuses and abilities

**Features:**
- Prerequisite checking
- Feat action granting
- Combat bonuses application
- Skill bonuses application
- Toggle-able variable feats

---

### 8. Talent Selection & Talent Trees

**Description:** Choose talents from your class's talent tree with visual prerequisites.

**How to Use:**
1. Step 5 of character generator: Select talents
2. View interactive talent tree for your class
3. Click talents to select them
4. Prerequisite links are shown visually
5. Talents grant abilities and bonuses automatically

**Features:**
- Visual talent tree display
- Prerequisite tracking
- Talent ability granting
- Talent bonus application
- Toggle-able talents

---

### 9. Background System

**Description:** Choose a background for your character providing narrative flavor and mechanical bonuses.

**How to Use:**
1. Step 6 of character generator: Select background
2. Choose from available backgrounds
3. Background provides:
   - Bonus class skills (+3 to specific skills)
   - Character narrative description
   - Equipment options
4. Bonuses apply automatically

**Features:**
- 50+ backgrounds available
- Automatic skill bonuses
- Narrative integration
- Equipment grants

---

### 10. Starting Equipment Selection

**Description:** Choose and acquire starting equipment during character creation.

**How to Use:**
1. Step 6 of character generator: Select starting equipment
2. Choose from class starting equipment packages
3. Or browse equipment compendium
4. Equipment is added to inventory automatically
5. Armor bonuses and weapon stats apply

**Features:**
- Pre-configured equipment packages
- Browse compendium equipment
- Automatic bonus application
- Cost tracking

---

## Character Sheet Systems

### 11. Summary Tab

**Description:** Overview of your character with key information at a glance.

**Displays:**
- Character name, class, level, experience points
- Hit points (current/maximum) with damage threshold
- Defenses (Fortitude, Reflex, Will)
- Ability scores and modifiers
- Conditions and status effects
- Combat readiness indicator

**How to Use:**
- Click **Summary** tab on character sheet
- View quick reference of character status
- Use for quick health/defense checks
- Monitor conditions and effects

---

### 12. Abilities Tab

**Description:** Detailed view of all six ability scores and their modifiers.

**Shows:**
- Strength (STR) - Physical power
- Dexterity (DEX) - Agility and reflexes
- Constitution (CON) - Endurance and health
- Intelligence (INT) - Reasoning and memory
- Wisdom (WIS) - Perception and insight
- Charisma (CHA) - Personality and influence

**For Each Ability:**
- Base score
- Racial modifiers
- Temporary modifiers
- Final modifier (+/- from the score)
- Uses in combat/skills

**How to Use:**
1. Click **Abilities** tab
2. View your six ability scores
3. See which modifiers apply to attacks, defenses, and skills
4. Temporary modifiers can be toggled on/off

---

### 13. Skills Tab

**Description:** Manage and track all 19 SWSE skills with training, bonuses, and skill uses.

**How to Use:**
1. Click **Skills** tab
2. View all 19 SWSE skills
3. Click a skill to toggle training (adds +5 bonus)
4. Trained skills show total modifier (half level + ability modifier + training bonus + any feat bonuses)
5. Use **Favorite Skills** to filter to only selected skills
6. Click skill name to make a skill check

**Features:**
- All 19 SWSE skills (Acrobatics, Climb, Deception, Endurance, Gather Information, Initiative, Jump, Knowledge, Mechanics, Perception, Persuasion, Pilot, Ride, Stealth, Survival, Swim, Treat Injury, Use Computer, Use the Force)
- Training tracking (+5 bonus when trained)
- Skill Focus feat bonuses (+5)
- Half-level bonus to all skills
- Ability modifier application
- Feat bonus application
- Skill action suggestions

---

### 14. Combat Tab

**Description:** All combat capabilities, attacks, defenses, and special abilities.

**Sections:**
- **Attack Section:** Weapons, Base Attack Bonus, attack modifiers
- **Defense Section:** Fortitude, Reflex, Will defenses
- **Abilities:** Combat-related abilities (Force powers, feats)
- **Actions:** Available combat actions by type (swift, move, standard, full-round)
- **Conditions:** Visual condition track showing wounded/incapacitated status

**How to Use:**
1. Click **Combat** tab
2. View your attack modifiers
3. See your three defenses (can be modified in combat)
4. Click attack button to roll attack
5. Click ability to use special attack or ability
6. Monitor condition track for damage progression

---

### 15. Force Tab

**Description:** Manage Force powers, Force points, and Dark Side progression for Force-sensitive characters.

**Shows:**
- Force sensitivity level (untrained, trained, Jedi, etc.)
- Current/maximum Force points
- Force point regeneration rate
- Active Force powers (up to 6 selected)
- Known Force powers (all powers your level allows)
- Dark Side Score (0-10, tracks corruption)
- Force Secrets (passive enhancements)
- Force Techniques (advanced active powers)
- Lightsaber forms (if applicable)

**How to Use:**
1. Click **Force** tab
2. Select up to 6 active Force powers to use in combat
3. View Force points and regeneration
4. Use Force powers in combat (from Combat tab)
5. Track Dark Side Score
6. View available Force Secrets and Techniques

**Features:**
- Force power suite management (6 active max)
- Force point tracking and recovery
- Dark Side Score tracking
- Enhanced power variants
- Force reroll dice availability

---

### 16. Talents Tab

**Description:** View and manage all talents you've selected.

**How to Use:**
1. Click **Talents** tab
2. View talents organized by talent tree
3. View lightsaber forms (if applicable)
4. Click talent to see details and abilities
5. Toggle talents on/off if they're variable
6. View talent-granted abilities

**Features:**
- All owned talents displayed
- Talent tree organization
- Lightsaber form selection
- Ability access
- Visual talent tree preview

---

### 17. Inventory Tab

**Description:** Manage equipment, items, weapons, armor, and inventory.

**Shows:**
- All owned equipment organized by category
- Equipment weight
- Total carrying capacity
- Current encumbrance level
- Equipment status (equipped/unequipped)
- Item descriptions and stats

**How to Use:**
1. Click **Inventory** tab
2. View all owned items
3. Right-click item to see options:
   - View details
   - Equip/unequip
   - Delete
   - Edit
4. Drag items from compendium to add
5. Equipment weight totals automatically

**Features:**
- Item organization
- Weight tracking
- Encumbrance calculation
- Equipment toggling
- Item management

---

### 18. Starship Maneuvers Tab

**Description:** For characters with starship combat feats, manage starship tactical maneuvers.

**Shows:**
- Available starship maneuvers
- Active maneuvers (up to 6 selected)
- Maneuver details and effects
- Prerequisite requirements

**How to Use:**
1. Click **Starship Maneuvers** tab
2. Select up to 6 active maneuvers for starship combat
3. Use maneuvers during starship combat
4. View maneuver descriptions and bonuses

**Features:**
- Maneuver selection (max 6 active)
- Starship combat integration
- Prerequisite validation

---

### 19. Biography Tab

**Description:** Store character background information and personal notes.

**Fields:**
- Character name and title
- Physical description
- Background story
- Personality traits
- Motivations and goals
- Personal notes and journal
- Planet of origin
- Profession/specialty
- Custom fields

**How to Use:**
1. Click **Biography** tab
2. Fill in character information
3. Add personal narrative
4. Track character development
5. Share character story with group

**Features:**
- Rich text editor
- Custom note fields
- Personal journal tracking
- Character development documentation

---

### 20. Import/Export Tab

**Description:** Export your character for backup, sharing, or importing from other sources.

**How to Use:**
1. Click **Import/Export** tab
2. **Export:** Click export button to save character as JSON
3. **Import:** Paste JSON from another character to import
4. Supported formats from other SWSE sources
5. Back up your character for safekeeping

**Features:**
- JSON export format
- Character backup
- Character sharing
- Legacy format support

---

### 21. Automatic Defense Calculation

**Description:** Defenses (Fortitude, Reflex, Will) are calculated automatically.

**Formula:**
- **Fortitude** = 10 + Class bonus + CON modifier + bonuses
- **Reflex** = 10 + Class bonus + DEX modifier + bonuses
- **Will** = 10 + Class bonus + WIS modifier + bonuses

**How to Use:**
1. Defenses update automatically as abilities/equipment change
2. View current defenses on Summary tab or Combat tab
3. In combat, defenses are used as targets for attacks
4. Temporary bonuses can be applied via Active Effects

---

### 22. Active Effects System

**Description:** Apply temporary bonuses, penalties, conditions, and special effects to characters.

**How to Use:**
1. Click **Active Effects** tab (on character sheet)
2. Click **+ Create Active Effect**
3. Configure effect:
   - Name (e.g., "Defensive Stance")
   - Duration (rounds, minutes, hours, permanent)
   - Effect type (bonus, condition, etc.)
   - What it modifies (ability modifier, defense, etc.)
4. Effect applies immediately
5. Duration counts down in combat
6. Expired effects automatically remove

**Common Effects:**
- Stunned/Staggered (condition)
- Defensive Stance (defense bonus)
- Battered (damage penalty)
- Inspired (ability bonus)
- Weakness (attribute penalty)

**Features:**
- Flexible duration system
- Automatic expiration
- Conditional effects
- Effect stacking rules
- Visual effect indicators

---

### 23. Feat Actions System

**Description:** Feats grant special combat actions that appear on character sheet.

**How to Use:**
1. Feats are listed in Combat tab under **Feat Actions**
2. Actions are organized by type (swift, move, standard, full-round)
3. Click action button to use the feat
4. System handles automatic rolls and effects
5. Action descriptions show what happens

**Features:**
- Automatic action creation
- Multiple use types (attack, save, roll, etc.)
- Effect application
- Usage tracking

---

### 24. Talent Ability System

**Description:** Talents grant special abilities that can be toggled and used.

**How to Use:**
1. View talents in Talents tab
2. Talents with abilities show **Use Ability** buttons
3. Click button to activate talent ability
4. Effects apply automatically
5. Abilities can usually be used once per encounter

**Features:**
- Dynamic ability display
- Usage tracking
- Toggle-able abilities
- Effect application

---

### 25. Condition Track

**Description:** Visual representation of character combat condition with cumulative penalties.

**Stages:**
- **Normal:** No penalties
- **-1 step:** -1 to attacks, defenses, ability checks, and skill checks
- **-2 steps:** -2 penalty
- **-5 steps:** -5 penalty
- **-10 steps:** -10 penalty and half speed
- **Helpless:** Unconscious/Disabled

**How to Use:**
1. View condition track on Summary or Combat tabs
2. Track shows current condition step
3. You move down when damage exceeds your Damage Threshold (= Fortitude Defense) in one hit
4. Recover/Worsen buttons let you adjust manually
5. Persistent conditions cannot be recovered normally

**Features:**
- Visual condition indicator
- Automatic penalty application
- Damage Threshold integration
- Persistent condition support

---

## Progression & Leveling

### 26. Automatic Level-Up System

**Description:** Complete multi-step process for advancing your character to the next level.

**How to Use:**
1. Accumulate experience points through gameplay
2. When reaching next level threshold, **Level Up** button appears
3. Click **Level Up** to start the process
4. System guides you through:
   - Rolling for new HP (or accept average)
   - Selecting new talents available at your level
   - Selecting bonus feats (if applicable)
   - Granting automatic class features
   - Increasing ability scores (every 4 levels)
5. Character is updated with all changes automatically

**Automatic Features:**
- Class feature granting
- Ability score increases (at levels 4, 8, 12, 16, 20)
- BAB recalculation
- HP recalculation
- Defense recalculation
- Feat/talent prerequisite validation

---

### 27. Multi-Class Support

**Description:** Add additional classes to blend abilities from multiple archetypes.

**How to Use:**
1. During level-up, select a new class instead of advancing current class
2. New class is added to your class list
3. Both classes' features and progression apply
4. Can keep adding classes at each level

**Features:**
- Blend multiple class progressions
- Stack features from multiple classes
- Proper BAB calculation
- Proper HP calculation
- Proper defense bonuses

---

### 28. Prestige Class Support

**Description:** Advanced classes with prerequisites (usually level 6+ and specific feats/skills).

**Prestige Classes Include:**
- Jedi Knight
- Sith Lord
- Scoundrel's Gambit
- Soldier's Expertise
- And 15+ more!

**How to Use:**
1. At level 6+, if prerequisites are met, prestige classes become available
2. Select prestige class during level-up
3. Prestige class features apply immediately
4. Prerequisites are validated automatically

**Features:**
- Prerequisite checking
- Exclusive advanced abilities
- Specialized progression
- Prestige Roadmap preview

---

### 29. Feat System & Progression

**Description:** Feats are special abilities and bonuses that enhance your character.

**How Feats Work:**
- Gain bonus feats at certain levels
- Each class grants feats at specific levels
- Feats have prerequisites (minimum level, other feats, abilities)
- Feats can grant:
  - Combat actions
  - Skill bonuses
  - Attack bonuses
  - Defense bonuses
  - Ability modifiers

**How to Use:**
1. During character creation or level-up, select available feats
2. System validates prerequisites
3. Feats appear in Combat tab if they grant actions
4. Bonuses apply automatically

**Features:**
- 150+ feats available
- Prerequisite validation
- Bonus application
- Action granting
- Feat synergy detection

---

### 30. Talent Tree System

**Description:** Each class has a unique talent tree with 30-50+ talents to choose from.

**Talent Trees:** One per class (Jedi, Scoundrel, Soldier, Scout, Noble, etc.)

**How to Use:**
1. During character creation or level-up, open talent tree for your class
2. View interactive tree showing prerequisites
3. Select talents you want to learn
4. System validates prerequisites
5. Talents are added and abilities become available

**Features:**
- Visual tree display
- Prerequisite linking
- Multiple talent paths within each tree
- Talent replacement system
- Talent sharing across classes (when applicable)

---

### 31. Force Power Progression

**Description:** Force-sensitive characters unlock new Force powers as they level.

**How to Use:**
1. With Force sensitivity, new Force powers become available at each level
2. During level-up, Force Power selector appears
3. Choose from available powers matching your level
4. Power is added to your known powers
5. In Force tab, select up to 6 active powers to use

**Features:**
- Level-gated power availability
- Force sensitivity requirement checking
- Power suite limitation (6 active max)
- Power tier progression (basic, apprentice, master)

---

### 32. Skill Advancement

**Description:** As you gain experience, you gain skill points to invest in new skills.

**How to Use:**
1. Gain skill points through level-ups (based on INT modifier)
2. Allocate points to train new skills
3. Each trained skill gets +3 bonus
4. Apply ability modifiers and feat bonuses

**Features:**
- INT modifier determines skill points
- Class skills cost less
- Cross-class skills cost more
- Skill focus feature (specialized training)

---

### 33. Lightsaber Form Progression

**Description:** Force-sensitive characters can learn lightsaber forms providing bonuses and powers.

**Available Forms:**
- Form I (Shii-Cho)
- Form II (Makashi)
- Form III (Soresu)
- Form IV (Ataru)
- Form V (Shien/Djem So)
- Form VI (Niman)
- Form VII (Juyo)

**How to Use:**
1. Select lightsaber form talents during character creation/level-up
2. Form is now active and provides:
   - Melee attack bonus
   - Melee defense bonus
   - Form-specific Force powers
3. Can switch forms (standard action in combat)
4. Bonuses stack with other abilities

**Features:**
- Seven distinct forms
- Form-specific bonuses
- Form powers
- Form switching
- Form stacking

---

### 34. Ability Score Increases

**Description:** Every 4 levels, gain an ability score increase to distribute.

**When:** Levels 4, 8, 12, 16, 20

**How to Use:**
1. At level 4, 8, 12, 16, or 20 level-up, ability increases become available
2. System automatically detects if you can increase ability
3. Dialog appears to select which ability gets the increase
4. Increase applies immediately

**Features:**
- Automatic detection
- +1 to any single ability
- Stacks with other modifiers
- Increases all related skills/defenses

---

### 35. Background Feature Granting

**Description:** Backgrounds grant bonus features and training.

**How to Use:**
1. During character creation, select a background
2. Background automatically grants:
   - Bonus class skills
   - Narrative background
   - Flavor features
3. Benefits apply immediately

---

### 36. Multi-Class Feat Handling

**Description:** When multi-classing, feats from all classes stack together.

**How to Use:**
1. Add a second class during level-up
2. Feats from both classes are available
3. Class skill bonuses from both classes apply
4. Highest class bonus is used for each skill
5. BAB from both classes stack for multi-attack calculations

---

## Combat Systems

### 37. Initiative System

**Description:** Roll and track turn order in combat.

**How to Use:**
1. Click **Combat** in sidebar
2. Click **Start Combat**
3. All combatants roll initiative: 1d20 + DEX modifier + bonuses
4. Turn order is sorted highest to lowest
5. Click your character name to take your turn

**Formula:** 1d20 + DEX modifier + combat bonuses

**Features:**
- Automatic initiative rolling
- Initiative rerolls
- Round tracking
- Turn order display

---

### 38. Attack Roll System

**Description:** Roll to hit an enemy's defense.

**How to Use:**
1. On your turn, click a weapon attack button
2. System rolls: 1d20 + Base Attack Bonus + ability modifier + bonuses
3. Compare result to target's defense (Fortitude, Reflex, or Will)
4. If roll meets or exceeds defense, attack hits
5. Successful hit allows damage roll

**Features:**
- Automatic modifier application
- Critical hit on natural 20
- Advantage/disadvantage support
- Attack bonus tracking
- Multiple attacks (with penalties)

---

### 39. Defense System

**Description:** Your three defense values protect against different attack types.

**Three Defense Types:**
- **Fortitude Defense** - Resists physical trauma (armor, impact)
- **Reflex Defense** - Dodges quick attacks (dodge, positioning)
- **Will Defense** - Resists mental/Force attacks (mental strength)

**How They Work:**
- Defender doesn't roll - attacker rolls against your defense value
- If attacker's roll meets or exceeds your defense, they hit
- Defenses are calculated automatically from armor, abilities, and feats

**How to Use:**
1. Defenses display on Summary tab and Combat tab
2. In combat, attackers compare their roll to your defense
3. Temporary bonuses can increase defenses via Active Effects

---

### 40. Damage & Damage Thresholds

**Description:** Deal damage to enemies and track damage thresholds for condition track effects.

**How to Use:**
1. After successful attack, click **Damage**
2. System rolls damage: weapon damage dice + ability modifier
3. Damage is subtracted from target's HP
4. If damage in a single hit exceeds target's Damage Threshold (= Fortitude Defense), they move down the Condition Track
5. At 0 HP, character falls unconscious; at -10 HP, character dies

**Damage Threshold:**
- **Damage Threshold** = Fortitude Defense
- Exceeding it in one hit moves target down the Condition Track
- Multiple threshold excesses in one hit can move multiple steps

**Features:**
- Automatic critical damage doubling
- Damage Threshold comparison
- Condition Track integration
- Damage type tracking

---

### 41. Critical Hit System

**Description:** Roll a natural 20 to score a critical hit with doubled damage.

**How to Use:**
1. Roll attack with 1d20
2. Natural 20 (roll of 20) automatically hits
3. Critical hit is announced
4. Damage is rolled twice (double damage dice)
5. All modifiers apply normally

**Features:**
- Natural 20 crits
- Threat range expansion (some feats)
- Damage doubling
- Threat range variants (houserule)

---

### 42. Grappling System

**Description:** Physical wrestling and restraint mechanics with four stages.

**Stages:**
1. **Initiate Grab** - Initial attack roll against defender
2. **Grabbed** - Target is held but can still act
3. **Grappled** - Target is controlled and restricted
4. **Pinned** - Target is fully restrained

**How to Use:**
1. During combat, use **Grapple** action
2. Make attack roll against target's defense
3. Success moves to next grapple stage
4. Continue grapple checks each round
5. Opponent can escape with check

**Features:**
- Four-stage progression
- Opposed checks
- Damage during grapple
- Pin mechanics
- Escape options

---

### 43. Multiple Attacks & Full Attack

**Description:** Make several attacks in a single turn.

**How to Use:**
1. Make your first attack normally
2. If you have additional attacks from BAB:
   - Base Attack Bonus 6+ gives second attack at -5
   - Base Attack Bonus 11+ gives third attack at -10
   - Base Attack Bonus 16+ gives fourth attack at -15
3. Each subsequent attack takes cumulative -5 penalty
4. Use **Full Attack** action to take all attacks

**Features:**
- BAB-based multiple attacks
- Cumulative penalties
- Bonus attack stacking
- Attack order management

---

### 44. Combat Actions System

**Description:** Combat actions are organized by action economy.

**Action Types:**
- **Swift Action** - Very quick (1-2 per round)
- **Move Action** - Movement or repositioning
- **Standard Action** - Main action (attack, skill, ability)
- **Full-Round Action** - Uses entire turn

**How to Use:**
1. On your turn, you have 1 standard action, 1 move action, 1 swift action
2. Click available actions from your sheet
3. Some actions can be combined (move + standard)
4. Some actions are reactions (take when triggered)
5. Track used actions to maintain action economy

**Features:**
- Automatic action type categorization
- Action combination support
- Reaction action handling
- Skill action integration

---

### 45. Skill-Based Combat Actions

**Description:** Many combat actions are based on specific skills.

**How to Use:**
1. Click **Combat** tab
2. Look for skills with associated combat actions
3. Click skill-based action to use it
4. Skill check is rolled automatically
5. Result determines success

**Examples:**
- Acrobatics: Evasion, defensive movement
- Deception: Feint
- Stealth: Sneak attack
- Mechanics: Disarm trap

---

### 46. Combat Integration with Character Sheet

**Description:** Combat actions are tightly integrated with character abilities.

**How to Use:**
1. During combat, all combat actions appear on Combat tab
2. Skill checks use your skill bonuses
3. Attack rolls use your BAB and ability modifiers
4. Damage rolls use weapon and ability modifiers
5. All bonuses apply automatically

---

### 47. Vehicle Combat System

**Description:** Specialized combat rules for starships and vehicles.

**How to Use:**
1. Create or add vehicle to combat
2. Vehicle crew takes positions:
   - Pilot (controls ship movement)
   - Gunners (operate weapons)
   - Engineer (manages power/shields)
   - Commander (tactical orders)
3. Each position has available actions
4. Pilot makes attack rolls with pilot bonus
5. Damage reduces vehicle HP

**Features:**
- Position-based actions
- Crew coordination
- Starship maneuver execution
- Vehicle-specific combat rules

---

### 48. Round & Turn Tracking

**Description:** Foundry tracks rounds and turns automatically.

**How to Use:**
1. Combat is organized by rounds (6-second intervals)
2. Each combatant takes one turn per round
3. Round counter displays in combat tracker
4. Turn order shows who acts next
5. Active combatant is highlighted

**Features:**
- Automatic round counting
- Turn management
- Duration tracking for effects
- Combat summary

---

### 49. Condition Tracking

**Description:** Apply and track conditions affecting characters.

**Common Conditions:**
- Stunned - Can't take actions
- Staggered - Reduced movement
- Helpless - Can't defend
- Unconscious - Incapacitated
- Disabled - Can't move
- Blinded - Can't see
- Deafened - Can't hear

**How to Use:**
1. In combat, apply condition via Active Effects
2. Condition appears on character sheet
3. Mechanical penalties apply automatically
4. Condition restricts available actions
5. Condition expires or is manually removed

---

### 50. Auto-Damage Application

**Description:** Apply damage quickly in combat.

**How to Use:**
1. After successful attack, click **Damage**
2. Damage formula rolls automatically
3. Click target to apply damage
4. Damage subtracts from target's HP
5. Threshold status updates automatically

**Features:**
- Quick damage rolling
- Automatic HP reduction
- Threshold calculation
- Critical damage doubling

---

### 51. Advantage/Disadvantage System

**Description:** Roll with advantage (better) or disadvantage (worse) on certain rolls.

**How to Use:**
1. When making any roll, click **Advantage** or **Disadvantage**
2. With advantage: roll twice, use higher
3. With disadvantage: roll twice, use lower
4. Results display both rolls

**Features:**
- 1d20 advantage system
- Visual roll display
- Situational application

---

### 52. Effect Application in Combat

**Description:** Apply active effects and bonuses that affect combat rolls.

**How to Use:**
1. Before combat, create active effects for bonuses
2. During combat, effects apply to:
   - Attack rolls (+X bonus)
   - Damage (+X bonus)
   - Defense (+X bonus)
3. Click attack/damage buttons
4. Bonuses automatically apply
5. Effects expire when duration ends

**Common Combat Effects:**
- Flanking bonus
- Defensive stance
- Inspired condition
- Weakened condition
- Fatigued penalty

---

## Force Powers & Abilities

### 53. Force Power System

**Description:** Force-sensitive characters access unique Force powers.

**How to Use:**
1. During character creation, select Force sensitivity
2. Go to Force tab on character sheet
3. View known Force powers (all you can access)
4. Select up to 6 active powers
5. Use active powers in combat from Force tab

**Features:**
- 30+ Force powers available
- Power level progression
- Power suite management (6 active max)
- Known vs. active power tracking

---

### 54. Force Points & Recovery

**Description:** Track Force Points used to enhance rolls and fuel special abilities.

**How to Use:**
1. View Force Points on Force tab
2. Maximum = typically 5 + half your character level (varies by campaign)
3. Spend to add bonus dice to any d20 roll (1d6 at low levels, up to 3d6 at high levels)
4. Can also spend to activate certain powers or avoid death
5. Recovery timing set by houserules (on level up, extended rest, or per session)

**Features:**
- Level-based dice scaling (1d6/2d6/3d6)
- Take highest when rolling multiple dice
- Dark Side temptation option for extra dice
- Flexible recovery settings

---

### 55. Dark Side Score

**Description:** Track your corruption by the Dark Side (0 to Wisdom score scale).

**How It Works:**
- **Score Range:** 0 to your Wisdom score (by default)
- **Dark Side Temptation:** Can call on Dark Side for bonus dice if score ≤ half Wisdom
- **Falling:** When Dark Side Score equals or exceeds Wisdom, you fall to the Dark Side
- **Redemption:** Spend a Force Point to reduce Dark Side Score by 1

**How to Use:**
1. View Dark Side Score on Force tab
2. Using [Dark Side] tagged powers or temptation increases score
3. Track your score relative to your Wisdom
4. Spend Force Points for redemption when needed
5. GM may grant other redemption opportunities

**Features:**
- Wisdom-based maximum (configurable via houserules)
- Automatic increase from Dark Side power use
- Force Point redemption system
- Dark Side temptation mechanics

---

### 56. Force Enhancement System

**Description:** Enhance Force powers with additional effects.

**How to Use:**
1. In Force tab, click a Force power
2. Click **Enhance** if power has variants
3. Force Enhancement dialog appears
4. View available enhancements
5. Select enhancement for additional effect/cost
6. Enhanced version is applied

**Features:**
- Multiple enhancement options
- Cost adjustments
- Effect improvements
- Power flexibility

---

### 57. Force Reroll Dice

**Description:** Some characters can reroll dice using Force connection.

**How to Use:**
1. After rolling a check, attack, or save
2. If available, click **Force Reroll**
3. Roll is rerolled
4. Use higher of two rolls
5. Limited uses per day

---

### 58. Force Secrets

**Description:** Passive abilities that modify how Force powers work.

**Examples:**
- Widen power range
- Improve power effects
- Reduce Force point cost
- Add additional targets
- Add additional effects

**How to Use:**
1. View Force Secrets on Force tab
2. Secrets are selected during character progression
3. Secrets apply automatically to powers
4. No action needed - passive benefits

**Features:**
- 20+ Force Secrets available
- Passive effect stacking
- Power modification
- Specialization system

---

### 59. Force Techniques

**Description:** Advanced Force powers requiring significant training.

**How to Use:**
1. With high Force training, Force Techniques become available
2. View available Techniques on Force tab
3. Select Technique during progression
4. Use Technique in combat like regular power
5. May require ability check or save

**Features:**
- Master-level powers
- Prerequisite-heavy
- Unique mechanical effects
- Powerful abilities

---

### 60. Lightsaber Forms

**Description:** Combat styles granting bonuses and form-specific powers.

**Available Forms:**
- Shii-Cho (Form I) - Versatile
- Makashi (Form II) - Dueling focused
- Soresu (Form III) - Defense focused
- Ataru (Form IV) - Mobility focused
- Shien/Djem So (Form V) - Aggressive
- Niman (Form VI) - Balanced
- Juyo (Form VII) - Chaotic aggressive

**How to Use:**
1. Select Lightsaber Form talent
2. Form becomes active
3. Grants melee attack/defense bonus
4. Grants form-specific Force powers
5. Can switch forms (standard action)

**Features:**
- Seven distinct forms
- Form bonuses
- Form powers
- Switching mechanics

---

### 61. Force Check System

**Description:** Roll to use Force powers or resist Force effects.

**How to Use:**
1. When using Force power, may require Force check
2. Roll: 1d20 + Force training modifier
3. Compare to DC set by power
4. Success: power works as intended
5. Failure: power fails or reduced effect

---

### 62. Block/Deflect Abilities

**Description:** Defensive Force abilities to reduce damage from attacks.

**How to Use:**
1. Select Block/Deflect talent
2. When attacked, can use reaction
3. Roll check to reduce incoming damage
4. Damage reduced by success amount
5. Can be used once per round (typically)

**Features:**
- Reaction action
- Damage reduction
- Usage limitation
- Defense stacking

---

## Equipment & Inventory

### 63. Equipment Store System

**Description:** Purchase equipment from comprehensive store.

**How to Use:**
1. Go to store interface (or purchase through character sheet)
2. Browse equipment categories:
   - Weapons (50+ types)
   - Armor (light, medium, heavy)
   - Equipment (20+ categories)
3. Select items and add to cart
4. View credits cost
5. Complete purchase

**Features:**
- 100+ equipment items
- Category filtering
- Price calculation
- Inventory integration

---

### 64. Weapon System

**Description:** Manage weapons with damage, ranges, and special properties.

**Weapon Properties:**
- Damage dice (2d8, 1d10, etc.)
- Range (melee, ranged)
- Range categories (short, medium, long)
- Special properties (see through, stun, etc.)
- Proficiency requirements

**How to Use:**
1. Add weapon to inventory from compendium
2. Equip weapon
3. Attack roll uses weapon's base damage
4. Damage roll uses weapon damage dice
5. Special properties apply automatically

**Features:**
- 50+ weapon types
- Weapon proficiency checking
- Damage calculation
- Special property support

---

### 65. Armor System

**Description:** Equip armor for defense bonuses with possible drawbacks.

**Armor Types:**
- **Light Armor** (no DEX penalty): +2-4 Reflex defense
- **Medium Armor** (-2 to certain skills): +3-5 Reflex defense
- **Heavy Armor** (-5 to several skills): +4-6 Reflex defense

**How to Use:**
1. Add armor to inventory
2. Equip armor
3. Armor bonus applies to Reflex defense
4. Check penalties apply to skills
5. Armor weight adds to encumbrance

**Features:**
- 50+ armor options
- Defense bonuses
- Check penalties
- Weight tracking

---

### 66. Equipment Upgrades/Modifications

**Description:** Add upgrades to weapons, armor, and equipment for bonuses.

**Available Upgrades:**
- Weapon scopes (+attack)
- Grips (+attack)
- Frames (+defense)
- Processors (droids)
- Sensors (vehicles)
- And more!

**How to Use:**
1. Click equipment item
2. Go to **Modifications** tab
3. Click **+ Add Modification**
4. Select upgrade type
5. Upgrade applies bonus
6. Cost is calculated

**Features:**
- Multiple upgrade slots
- Bonus application
- Cost tracking
- Modification management

---

### 67. Weight & Encumbrance System

**Description:** Track total carried weight and movement penalties.

**How to Use:**
1. Equipment tab shows total weight
2. Compare to carrying capacity (based on Strength)
3. If over capacity, movement reduced
4. Equipment weight sums automatically

**Carrying Capacity Formula:**
- Base capacity = Strength score × 10 pounds
- Can carry up to capacity at full speed
- Over capacity = reduced movement

**Features:**
- Automatic weight calculation
- Capacity limits
- Movement penalties
- Encumbrance tracking

---

### 68. Credits & Cost Tracking

**Description:** Track character wealth in credits.

**How to Use:**
1. Character sheet shows credit total
2. Purchase equipment to reduce credits
3. Earn credits from missions/rewards
4. Credits display on Summary tab
5. Cost is tracked per item

**Features:**
- Credit tracking
- Purchase cost deduction
- Reward addition
- Equipment pricing

---

### 69. Item Management Interface

**Description:** Comprehensive tool for managing character items.

**How to Use:**
1. Inventory tab shows all items
2. Right-click item for options:
   - View/edit item details
   - Equip/unequip
   - Increase/decrease quantity
   - Delete item
3. Drag items to reorder
4. Filter by category

**Features:**
- Item viewing
- Equipment toggling
- Quantity management
- Item deletion
- Item organization

---

### 70. Custom Item Creation

**Description:** Create custom items not in compendiums.

**How to Use:**
1. In Inventory, click **+ Add Item**
2. Click **Create New Item**
3. Choose item type (weapon, armor, equipment, etc.)
4. Fill in properties:
   - Name and description
   - Stats (damage, bonus, cost, weight)
   - Images
   - Special properties
5. Save item
6. Item appears in inventory

**Features:**
- Custom item creation
- All item types
- Property customization
- Compendium saving

---

### 71. Consumable & Supply Tracking

**Description:** Track consumable items like ammunition, rations, and medical supplies.

**How to Use:**
1. Add consumable items to inventory
2. Each item has quantity counter
3. Right-click and **Reduce Quantity** after use
4. Quantity decreases automatically
5. Delete when empty

**Features:**
- Quantity tracking
- Usage reduction
- Automatic deletion
- Supply management

---

## Vehicles & Starships

### 72. Vehicle Actor Creation

**Description:** Create starships, speeders, walkers, and other vehicles.

**How to Use:**
1. Create new actor
2. Select **Vehicle** actor type
3. Fill in vehicle stats:
   - Hull points
   - Defenses
   - Speed
   - Crew positions
4. Add weapons
5. Add modifications

**Features:**
- Vehicle-specific stats
- Crew management
- Weapons mounting
- Modification support

---

### 73. Vehicle Stats & Defense

**Description:** Vehicles have specialized defense and HP systems.

**Vehicle Stats:**
- **Hull Points** - Vehicle health
- **Defense** - Single defense value
- **Shields** - Additional protection (larger ships)
- **Size** - Small, Medium, Large, Colossal
- **Speed** - Movement rating

**How to Use:**
1. Vehicle has single defense value
2. Attacks target vehicle defense
3. Damage reduces hull points
4. Shields absorb damage first (if present)
5. 0 HP = destroyed vehicle

**Features:**
- HP tracking
- Shield system
- Size categories
- Movement rating

---

### 74. Vehicle Weapons & Hardpoints

**Description:** Mount weapons on specific hardpoints of vehicle.

**How to Use:**
1. Open vehicle sheet
2. Go to Weapons section
3. Add weapons to hardpoints
4. Each weapon has range and damage
5. During combat, gunner uses weapon
6. Weapons have firing arcs (fixed, rotatable, turret)

**Features:**
- Multiple hardpoint slots
- Weapon mounting
- Firing arcs
- Damage output

---

### 75. Vehicle Crew Positions

**Description:** Assign crew members to different positions on vehicle.

**Positions:**
- **Pilot** - Controls movement and maneuvers
- **Copilot** - Assists pilot
- **Gunners** - Operate weapons (1-4 positions)
- **Engineer** - Manages power and shields
- **Commander** - Tactical orders
- **Shields** - Manages shield allocation

**How to Use:**
1. Create or add crew member actor
2. Click **Assign to Vehicle** to assign position
3. Position-specific actions available
4. Each crew member takes their turn

**Features:**
- Multiple positions
- Position-specific actions
- Crew coordination
- Position switching

---

### 76. Vehicle Modifications System

**Description:** Upgrade vehicles with movement, defense, weapon, and accessory modifications.

**Modification Categories:**
- **Movement Systems** - Hyperdrive, engines, handling
- **Defense Systems** - Shields, armor, ECM
- **Weapon Systems** - Laser cannons, missiles, turrets
- **Accessories** - Sensors, communications, cargo

**How to Use:**
1. Click vehicle sheet
2. Go to **Modifications** tab
3. Click **+ Add Modification**
4. Select modification category
5. Choose modification from list
6. Modification applies bonus/effect
7. Cost and emplacement points tracked

**Features:**
- 50+ modifications
- Category organization
- Cost calculation
- Emplacement point tracking
- Stock ship selection

---

### 77. Starship Maneuvers

**Description:** Special tactical maneuvers for starship combat.

**How to Use:**
1. Character with starship feats has access to maneuvers
2. In Force tab, select up to 6 active maneuvers
3. During starship combat, use maneuver on pilot's turn
4. Maneuver provides bonus or effect
5. Can use once per encounter (typically)

**Examples:**
- Evasive maneuver (defensive)
- Aggressive maneuver (offensive)
- Coordinated fire (multiple targets)

**Features:**
- Tactical options
- Action economy
- Bonus application
- Combat integration

---

### 78. Vehicle Combat Integration

**Description:** Full combat support for vehicles and starships.

**How to Use:**
1. Add vehicles to combat
2. Each crew position takes turns
3. Pilot maneuvers and attacks
4. Gunners target enemies
5. Engineer manages power/shields
6. Vehicle takes damage and hull reduces

**Features:**
- Position-based actions
- Crew coordination
- Combat tracking
- Damage management

---

### 79. Stock Ship Selection

**Description:** Pre-built starship templates for quick creation.

**Available Stock Ships:**
- Fighter-class starships
- Transport-class starships
- Cargo-class starships
- And more!

**How to Use:**
1. Create vehicle actor
2. In Modifications tab, select stock ship
3. Vehicle gets base stats and weapons
4. Can further modify from there

**Features:**
- Pre-configured ships
- Base stats included
- Weapon loadout
- Starting modifications

---

### 80. Vehicle Modification Manager

**Description:** Interface for managing all vehicle modifications.

**How to Use:**
1. Click vehicle Modifications tab
2. View all installed modifications
3. See costs and bonuses
4. Click to remove modification
5. Add new modifications
6. View total modification cost

**Features:**
- Modification listing
- Cost tracking
- Addition/removal
- Bonus calculation

---

## Droids

### 81. Droid Actor Creation

**Description:** Create droid characters with specialized progression different from humanoids.

**How to Use:**
1. Create new actor
2. Select **Droid** actor type
3. Fill in droid stats:
   - Sophistication level (D1-D5)
   - Systems installed
   - Abilities
4. Add droid systems
5. Configure equipment

**Features:**
- Droid-specific progression
- System management
- Dual view modes
- Equipment integration

---

### 82. Droid Sophistication Levels

**Description:** Droids have sophistication (D1-D5) determining capability.

**Levels:**
- **D1** - Simple droids (basic functions)
- **D2** - Standard droids (standard capability)
- **D3** - Advanced droids (more capable)
- **D4** - Expert droids (highly capable)
- **D5** - Master droids (most capable)

**How to Use:**
1. Set sophistication level during creation
2. Level determines available systems
3. Level affects HP and defenses
4. Higher level = more capable

---

### 83. Droid Systems Management

**Description:** Add specialized systems to droids for different functions.

**System Categories:**
- **Processors** - Logic, emotional, combat, programming
- **Locomotion** - Tracked, wheeled, legged, hovering
- **Appendages** - Arms, tools, sensors
- **Special Systems** - Combat subroutines, communications

**How to Use:**
1. Click droid Systems tab
2. Click **+ Add System**
3. Select system category
4. Choose specific system from list
5. System is installed with effects

**Features:**
- Multiple system types
- Combination effects
- Upgrade slots
- Specialization support

---

### 84. Droid Operational vs. Blueprint Mode

**Description:** Two different views of droid configuration.

**Modes:**
- **Operational Mode** - Current active configuration
- **Blueprint Mode** - Structural/design view

**How to Use:**
1. Toggle between modes on droid sheet
2. Operational: shows current setup and how it functions
3. Blueprint: shows structural components and installed systems
4. Switch modes to see different perspectives

**Features:**
- Dual view system
- Structural visualization
- Operational readiness
- Design flexibility

---

### 85. Droid Equipment Installation

**Description:** Install equipment and specialized hardware on droids.

**How to Use:**
1. In Equipment tab, add droid-specific equipment
2. Equipment is installed on droid frame
3. Equipment provides bonuses and abilities
4. Can be removed and reinstalled

**Features:**
- Droid equipment compatibility
- Installation system
- Upgrade slots
- Ability granting

---

### 86. Droid Creation Wizard

**Description:** Guided creation process for droids.

**How to Use:**
1. Create droid actor
2. Droid Creation step guides you through:
   - Droid type selection
   - Sophistication level
   - System selection
   - Equipment addition
3. Droid is created with selected systems

**Features:**
- Step-by-step guidance
- System recommendations
- Equipment integration
- Quick creation

---

## NPCs & Followers

### 87. NPC Creation

**Description:** Create non-player characters (enemies, allies, bystanders).

**How to Use:**
1. Create new actor
2. Select **NPC** actor type
3. Fill in NPC stats:
   - Name and description
   - Abilities and class
   - Skills and feats
   - Equipment
4. Use same systems as player characters
5. Add to combat when needed

**Features:**
- NPC-specific sheet
- Simplified display
- Quick reference
- Full stat tracking

---

### 88. NPC Templates

**Description:** Pre-built NPC stat blocks for quick creation.

**Available Templates:**
- Mercenary
- Jedi
- Sith
- Noble
- Scoundrel
- And 20+ more!

**How to Use:**
1. Browse NPC compendium
2. Select NPC template
3. Drag to world or create from template
4. NPC appears with pre-configured stats
5. Customize as needed

**Features:**
- Pre-built stat blocks
- Quick creation
- Full equipment included
- Ready to use

---

### 89. Follower Creation System

**Description:** Create henchmen and followers for player characters.

**How to Use:**
1. Go to Follower system
2. Click **Create Follower**
3. Select follower type
4. Configure follower stats
5. Follower appears as separate actor
6. Add to player's party

**Features:**
- Henchman creation
- Companion tracking
- Experience sharing (optional)
- Follower management

---

### 90. Nonheroic Units System

**Description:** Create large groups of minion-level enemies.

**How to Use:**
1. Use Nonheroic Units browser
2. Select unit type
3. Set unit quantity
4. Units appear as group in combat
5. Can select individual units to target

**Features:**
- Group creation
- Minion stats
- Swarm mechanics
- Quick enemy groups

---

### 91. NPC Combat Integration

**Description:** NPCs use same combat system as player characters.

**How to Use:**
1. Add NPC to combat
2. NPC rolls initiative like characters
3. Use same attack/defense mechanics
4. NPC turns work identically
5. Damage and conditions apply normally

**Features:**
- Full combat compatibility
- AI-assisted actions (optional)
- Condition tracking
- Damage management

---

### 92. NPC Compendium

**Description:** 100+ pre-built NPCs ready to use.

**Includes:**
- Enemy stat blocks
- Ally stat blocks
- Boss-level enemies
- Minion templates
- Class-based NPCs

**How to Use:**
1. Open NPC compendium pack
2. Browse available NPCs
3. Drag NPC to canvas or world
4. NPC appears ready to use
5. Customize stats as needed

**Features:**
- 100+ pre-built NPCs
- All creature types
- Level ranges
- Easy customization

---

## Customization & Houserules

### 93. Houserules System

**Description:** Customize game rules to match your table's preferences.

**Available Houserules:** 80+ configurable settings including:
- Character creation options (ability score methods, point buy pools)
- Hit points and death systems
- Combat rules (criticals, diagonal movement, weapon ranges, armored defense)
- Force rules (training attribute, Block/Deflect variants, Dark Side mechanics)
- Skill and feat variants (Skill Focus, cross-class training)
- Condition track and recovery options
- Grappling, flanking, and healing skill integration
- Space combat initiative
- And more!

**How to Use:**
1. Go to **Settings > System Settings** (GM only)
2. Browse the categorized houserule settings
3. Toggle or configure each setting
4. Changes apply immediately to all characters

**Features:**
- 80+ customizable settings
- Categorized organization
- Immediate application
- No restart needed

---

### 94. Houserule Presets

**Description:** Pre-configured sets of houserules for different playstyles.

**Available Presets:**
- Hardcore (challenging rules)
- Casual (simplified rules)
- Balanced (middle ground)
- Custom (mix and match)

**How to Use:**
1. In System Settings, click Houserule Presets
2. Select preset
3. Preset applies recommended houserule set
4. Can customize further

**Features:**
- Quick setup
- Themed configurations
- Customizable
- Easy switching

---

### 95. Theme System

**Description:** Change visual appearance of character sheets.

**Available Themes:**
- **Holo** - Clean holographic aesthetic
- **High Contrast** - Dark mode with high visibility
- **Starship** - Spaceship interior feel
- **Sand People** - Desert theme
- **Jedi** - Mystical Force theme
- **High Republic** - Modern elegant theme

**How to Use:**
1. Go to **Settings > Configure Settings**
2. Find **Theme** option
3. Select theme from dropdown
4. Theme applies immediately

**Features:**
- 6 themes included
- Color customization
- Responsive design
- Easy switching

---

### 96. Ability Score Generation Variants

**Description:** Customize how ability scores are generated during character creation.

**Options:**
- Which methods are available
- Point Buy pool size (default 25, adjustable for droids)
- Allow rerolls (true/false)
- Custom ranges

**How to Use:**
1. In System Settings > Ability Settings
2. Configure available methods
3. Set point buy pool size
4. Enable/disable rerolls
5. Changes apply to new character generation

---

### 97. Death & Hit Point Variants

**Description:** Customize how death and damage work.

**Options:**
- HP threshold values
- Death saves (none, 3 fails, variable)
- Max HP at level caps
- Healing modifiers

**How to Use:**
1. In System Settings > Combat Settings
2. Set death system variant
3. Configure HP thresholds
4. Set max HP levels
5. Changes apply to all characters

---

### 98. Skill Training Variants

**Description:** Customize how skills and skill training work.

**Options:**
- Skill training cost (class vs. cross-class)
- Knowledge skill consolidation
- Skill focus variants
- Feint skill selection

**How to Use:**
1. In System Settings > Skill Settings
2. Select skill variant
3. Configure skill costs
4. Changes apply immediately

---

### 99. Force System Variants

**Description:** Customize Force system rules.

**Options:**
- Force Training attribute (WIS or CHA)
- Block/Deflect talent variants
- Dark Side max multiplier
- Force point recovery rate

**How to Use:**
1. In System Settings > Force Settings
2. Select Force variant
3. Configure attribute use
4. Set dark side mechanics
5. Changes apply to Force-sensitive characters

---

### 100. Combat Rules Variants

**Description:** Customize various combat mechanics.

**Options:**
- Critical hit ranges
- Diagonal movement (true or false)
- Weapon range reduction
- Flanking bonuses
- Armored defense for all classes

**How to Use:**
1. In System Settings > Combat Settings
2. Toggle combat variants
3. Set ranges and bonuses
4. Changes apply immediately to combat

---

## Game Management Tools

### 101. World Data Loader

**Description:** Automatically loads all system content into your world.

**How to Use:**
1. World loads system automatically
2. All compendium packs are available
3. Compendium access from sidebar
4. Drag items into world as needed

**Features:**
- Automatic content loading
- All compendiums ready
- Content organization
- Easy access

---

### 102. Character Import Wizard

**Description:** Import characters from other systems or formats.

**How to Use:**
1. Click **Import** in character creation
2. Paste character data (JSON or text)
3. System parses character
4. Character appears with imported stats
5. Customize as needed

**Features:**
- Multiple format support
- Legacy system compatibility
- Data validation
- Customization after import

---

### 103. Maintenance Tools

**Description:** System maintenance and data cleanup utilities.

**Functions:**
- Data validation
- Corruption checking
- Cache clearing
- Recompilation

**How to Use:**
1. Available in GM settings
2. Run maintenance on demand
3. Checks system data integrity
4. Fixes common issues

**Features:**
- Data verification
- Issue detection
- Automatic repair
- Safety checks

---

### 104. Compendium Management

**Description:** Organize and access hundreds of game items across 40+ packs.

**Packs Included:** 40+ compendium packs:
- Core game content (classes, feats, talents, species, skills, backgrounds, languages)
- Force system (powers, secrets, techniques, lightsaber form powers)
- Weapons (pistols, rifles, heavy, grenades, exotic, simple/melee)
- Armor (light, medium, heavy)
- Equipment (communications, tools, survival, medical, tech, security)
- Vehicles (starships, stations, walkers, speeders)
- Actors (droids, NPCs)
- Special content (conditions, combat conditions, attributes, extra skill uses)

**How to Use:**
1. Open Compendium sidebar
2. Browse available packs
3. Click pack to expand
4. Drag items into character sheet
5. Or right-click to preview

**Features:**
- 40+ organized packs
- Category-based organization
- Easy searching
- Drag-and-drop

---

### 105. Chat Integration

**Description:** Post rolls and actions to chat for group visibility.

**How to Use:**
1. Make attack/skill/damage roll
2. Roll result posts to chat automatically
3. Chat shows who rolled and result
4. Group can see all actions
5. Discuss results in chat

**Features:**
- Automatic roll posting
- Action descriptions
- Combat results
- Group communication

---

### 106. Canvas Combat Tracking

**Description:** Visual combat tracking on the game canvas.

**How to Use:**
1. Place tokens on canvas for combatants
2. In combat, tokens show initiative order
3. Active token is highlighted
4. Damage appears on token
5. Conditions show as overlays

**Features:**
- Token HUD
- Damage display
- Condition indicators
- Combat focus

---

### 107. Macro System

**Description:** Create macros for frequently used actions.

**How to Use:**
1. Right-click item on character sheet
2. Select **Create Macro**
3. Macro appears on action bar
4. Click macro to execute action
5. Useful for repeated actions

**Features:**
- Item macros
- Quick execution
- Custom macros (advanced)
- Macro bars

---

### 108. Drag & Drop System

**Description:** Drag items from compendium directly to character sheets.

**How to Use:**
1. Open compendium pack
2. Find desired item
3. Drag item onto character
4. Item is added to inventory
5. Bonuses apply automatically

**Features:**
- Compendium browsing
- Easy item addition
- Automatic bonus application
- Item organization

---

### 109. Notification System

**Description:** Get alerts for important character events.

**Notifications For:**
- Character leveling up
- Resource recovery
- Combat conditions
- Duration expiration
- System warnings

**How to Use:**
1. Notifications appear as popups
2. Click to dismiss or act
3. Can customize notification settings
4. Important alerts highlighted

**Features:**
- Auto-leveling alerts
- Combat notifications
- Resource warnings
- Customizable alerts

---

### 110. Data Export & Backup

**Description:** Export character data for backup or sharing.

**How to Use:**
1. Click **Export** in Import/Export tab
2. Character JSON is generated
3. Save to file
4. Share with other players
5. Import into other worlds

**Features:**
- Full character export
- JSON format
- Easy sharing
- Backup support

---

## Quick Reference: Feature Summary

| Category | Count | Key Features |
|----------|-------|--------------|
| Character Creation | 10 | 7-step wizard, templates, 6 ability methods, species, 5 base classes + prestige, feats, talents, backgrounds |
| Character Sheet | 10 | 10 tabs covering all aspects of character |
| Progression | 10 | Level-up, multi-class, feats, talents, abilities, 19 skills, Force, lightsaber forms |
| Combat | 15 | Initiative, attacks, defense, damage threshold, condition track, grappling, vehicles |
| Force System | 10 | Powers, points, dark side, enhancements, secrets, techniques, forms, checks |
| Equipment | 9 | Store, weapons, armor, upgrades, weight, credits, management, consumables, items |
| Vehicles | 8 | Actor creation, stats, weapons, crew, modifications, maneuvers, combat, stock ships |
| Droids | 6 | Actor creation, sophistication, systems, dual modes, equipment, wizard |
| NPCs | 5 | Creation, templates, followers, nonheroic units, combat |
| Customization | 10 | Houserules (80+ settings), presets, 6 themes, variants (ability, death, skills, Force, combat) |
| Management | 10 | World data, import, maintenance, 40+ compendiums, chat, canvas, macros, drag-drop, notifications, export |
| **TOTAL** | **110+** | **Complete SWSE game system** |

---

## How to Get Started

1. **Create a Character** - Use the 7-step Character Generator
2. **Add Equipment** - Drag items from compendium
3. **Manage Abilities** - Fill out Force powers, talents, and feats
4. **Start Combat** - Use Combat systems for all action
5. **Progress** - Use Level-Up system at each level
6. **Customize** - Configure houserules to match your table

---

**For detailed help on any feature, check the FAQ (docs/FAQ.md) or official documentation!**

Version: 1.2.0 | License: MIT | Repository: https://github.com/docflowGM/foundryvtt-swse
