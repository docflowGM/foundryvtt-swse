# SWSE User Guide - Complete How-To Guide

Comprehensive how-to guide for all features in Star Wars Saga Edition for Foundry VTT.

**Table of Contents**
- [Character Creation](#character-creation)
- [Character Sheet Navigation](#character-sheet-navigation)
- [Skills & Ability Checks](#skills--ability-checks)
- [Combat](#combat)
- [Force Powers & Abilities](#force-powers--abilities)
- [Talents & Feats](#talents--feats)
- [Equipment & Inventory](#equipment--inventory)
- [Leveling & Advancement](#leveling--advancement)
- [Game Master Tools](#game-master-tools)
- [Advanced Features](#advanced-features)

---

## Character Creation

### Creating a New Character

**Step 1: Create Actor**
1. In the **Actors** tab, click **Create Actor**
2. Select **Character** from the dropdown
3. Enter character name
4. Click **Create**

**Step 2: Launch Character Generator**
1. On the new character sheet, find the blue button labeled **Create Character**
2. Click it to open the character generation wizard
3. You're now in Step 1 of 7

**Step 3: Choose Species**
- Browse the list of 20+ playable species
- Click a species to see details:
  - Ability score modifiers
  - Special traits
  - Starting bonuses
- Click **Select** to choose that species
- Click **Next** to proceed

**Step 4: Select Background**
- Browse available backgrounds
- Click to see background details:
  - Skill bonuses
  - Background features
  - Special abilities
- Click **Select** background
- Click **Next**

**Step 5: Determine Ability Scores**
- Choose from 6 ability generation methods:
  - **4d6 Drop Lowest** - Roll 4d6, drop lowest die, repeat 6 times
  - **Point Buy** - Allocate points to abilities (standard 15 points)
  - **Standard Array** - Use fixed array (15, 14, 13, 12, 10, 8)
  - **3d6** - Roll 3d6 for each ability
  - **2d6+6** - Roll 2d6+6 for each ability
  - **24-Point Organic** - Assign to custom pool
- If rolling, arrange results across abilities
- Confirm your ability scores
- Click **Next**

**Step 6: Choose Your Class**
- Browse 50+ available classes
- Click class to preview:
  - Hit die size
  - Defense progression
  - Starting features
  - Talents per level
- Click **Select** class
- Class features appear automatically
- Click **Next**

**Step 7: Allocate Skill Points**
- See your available skill points
- Click skill names to increase ranks
- Maximum 1 rank per skill at level 1
- Can leave some unallocated if desired
- Click **Next**

**Step 8: Choose Feats**
- See available feats based on race and level
- Human get bonus feat (1 + normal class feat)
- Click feat to see requirements and effects
- Click **Select** feat to choose it
- Preview your feat selection
- Click **Next**

**Step 9: Select Talents**
- See talent tree for your class
- Click talent to see prerequisites
- Prerequisites shown in red if not met
- Click **Select** to choose talent
- Can select multiple talents if available
- Click **Next**

**Step 10: Review & Finalize**
- Review all selections
- Go back to change anything (use **Previous**)
- Finalize to create character
- Click **Finalize Character**
- Character is now ready to play!

### Alternative: Free Build

If you don't want to use the wizard:
1. Click **Free Build** instead of **Create Character**
2. Manually set:
   - Ability scores
   - Class
   - Skills
   - Feats
   - Talents
   - Equipment

---

## Character Sheet Navigation

### Understanding the Tabs

The character sheet is organized into tabs. Click tab names to switch:

#### Summary Tab
Shows your character at a glance:
- **Ability Scores** - Core 6 abilities with modifiers
- **Defenses** - Fortitude, Reflex, Will values
- **Hit Points** - Current/max HP
- **Combat Info** - BAB, Initiative, other combat stats
- **Quick Actions** - Common buttons (attack, check, etc.)

**Tip**: Click any number to edit it directly

#### Skills Tab
Browse and use all 100+ skills:
- **Green Background** = Trained in skill
- **Red Text** = Untrained penalty applied
- **Blue Text** = Training bonus applied
- **Number** = Total modifier for this skill

**To make a skill check**:
1. Click the skill name
2. A dialog appears
3. Add any modifiers:
   - Circumstance bonuses
   - Items bonuses
   - Feat bonuses
4. Click **Roll**
5. Result appears in chat

**To add skill ranks**:
1. Click the **+** button next to skill
2. Deduct a skill point (if available)
3. Skill now shows as trained

#### Feats Tab
Browse your selected feats:
- **Feat Name** - Click to see full description
- **Action Buttons** - Click to perform feat actions
- **Feat Details** - Hover to see tooltip

**To use a feat ability**:
1. Find feat on Feats tab
2. Click the action button (if available)
3. Perform the action as described

**To add new feats**:
1. During leveling, feats are chosen
2. Or drag feat from compendium to sheet

#### Talents Tab
View your selected talents:
- **Talent Name** - Click for full description
- **Talent Tree** - Visual display of available talents
- **Selection** - Click to select new talent (if available)

**To select a new talent**:
1. Open Talent Tree (visual display)
2. Click talent to see prerequisites
3. Prerequisites shown in red if not met
4. If all prerequisites met, click **Select**
5. Talent added to sheet

**To view talent details**:
1. Click talent name
2. Full description appears
3. Shows:
   - Prerequisites
   - Effects and bonuses
   - Cost and restrictions

#### Force Tab (Force-Sensitive Only)
Manage Force Powers and Points:
- **Force Points** - Current/max points with status
- **Available Powers** - List of learned powers
- **Force Power Picker** - Button to learn new powers

**To spend Force Points**:
1. You have maximum Force Points per day
2. Click **Spend Force Point** button
3. Point is deducted
4. Points regenerate at start of next day

**To learn a new Force Power**:
1. Click **Open Force Power Picker**
2. Browse available powers
3. Check prerequisites (Force Training feats)
4. Click **Learn Power**
5. Power added to sheet

**To use a Force Power**:
1. Click power name to see effects
2. Make required roll (usually CHA or WIS check)
3. If successful, apply power effects
4. Spend Force Points if required

#### Equipment Tab
Manage items, weapons, armor, and equipment:
- **Equipped Items** - Currently equipped gear
- **Inventory** - All items you carry
- **Weight** - Total weight carried (encumbrance)
- **Currency** - Gold or credits

**To equip a weapon**:
1. Click weapon dropdown in Equipment
2. Select weapon from inventory
3. That weapon is now your active weapon

**To equip armor**:
1. Click armor dropdown in Equipment
2. Select armor from inventory
3. Armor bonuses now apply

**To add an item**:
1. Drag item from compendium to sheet
2. Or right-click item compendium entry
3. Select **Add to Actor**
4. Item appears in Inventory

**To use an item**:
1. Click item in Equipment or Inventory
2. If consumable, it's used/consumed
3. If equipment, it can be equipped
4. Effects from item apply

---

## Skills & Ability Checks

### Making a Skill Check

**Basic Skill Check**:
1. Click skill name on Skills tab
2. Dialog appears showing:
   - Skill name
   - Ability used
   - Base modifier
3. Add any modifiers:
   - Type number in **Modifier** field
   - Or select from preset buttons
4. Click **Roll**
5. Result appears in chat

**Formula**: 1d20 + Ability Mod + Training Bonus + Modifiers

**Example**: Acrobatics (trained)
- DEX Modifier: +3
- Training Bonus: +4
- Circumstance Bonus: +2
- **Total**: 1d20 + 3 + 4 + 2

### Understanding Skill Bonuses

Skills get bonuses from multiple sources:

**Ability Modifier**
- Based on the 6 core abilities (STR, DEX, CON, INT, WIS, CHA)
- Range typically -5 to +5
- Applied to ALL skills using that ability

**Training Bonus**
- +4 for trained skills
- +0 for untrained skills (penalty for class skills varies)
- Some class features grant higher bonuses

**Feat Bonuses**
- Feats can grant +1 to +5 to specific skills
- Multiple feats can stack
- Show in blue text

**Equipment Bonuses**
- Items can grant skill bonuses
- Usually +1 to +3
- Applied from equipped items only

**Active Effects**
- Temporary bonuses from buffs/conditions
- Duration-limited
- Can be positive or negative

### Skill Substitution

Some skills can be used instead of others in specific situations:

**Common Substitutions**:
- **Deception** instead of **Bluff** for social deception
- **Stealth** instead of **Hide** for sneaking
- **Athletics** instead of **Climb** for climbing checks
- **Acrobatics** instead of **Tumble** for evasion

**Using a Substitution**:
1. Make the roll with the substitute skill
2. Explain why substitution applies
3. GM rules on whether it's appropriate
4. Roll with that skill instead

---

## Combat

### Starting Combat

**Step 1: Create Combat**
1. Go to **Combat Tracker** (bottom left)
2. Click **Create Combat**
3. A new combat is now active

**Step 2: Add Combatants**
1. Drag token from map to Combat Tracker
2. Or click **Add Combatant** and select actor
3. Repeat for all combatants

**Step 3: Roll Initiative**
1. Click **Roll All** in Combat Tracker
2. All combatants roll 1d20 + DEX Mod + Initiative
3. Order is set automatically

**Step 4: Begin Combat**
1. Combatants sorted by initiative order
2. Highest goes first
3. Take turns in descending order

### On Your Turn

**Available Actions**:
- **Move** - Drag token on map
- **Attack** - Click weapon, target opponent
- **Use Skill** - Click skill, make check
- **Use Feat** - Click feat action button
- **Use Power** - Click Force power (if available)

**Making an Attack**:
1. Click weapon name in Equipment
2. Weapon card appears
3. Roll to hit: 1d20 + BAB + Modifiers
4. If roll meets target's defense:
   - Select damage type
   - Click **Roll Damage**
   - Damage applied automatically
5. Token HP reduced instantly

**Damage Application**:
- Click weapon to roll damage
- Select target from list
- Damage type appears (kinetic, energy, etc.)
- Damage applied to target's HP
- Overkill damage shows in chat

**Example Attack**:
- Player: "I attack with my lightsaber"
- Click lightsaber in Equipment
- Roll: 1d20+12 (BAB 8 + STR 4)
- Result: 18 (hits target's Reflex 16)
- Roll damage: 1d10+4 = 9 damage
- Target HP reduced from 45 to 36

### Combat Mechanics

#### Defenses

Every character has 3 defenses:
- **Fortitude** - Against physical attacks
- **Reflex** - Against area attacks and dodging
- **Will** - Against mental attacks

Attacking them requires beating their defense number.

**Defense Calculation**:
- Base 10 + Class Bonus + Ability Mod + Equipment + Effects

#### Conditions

Various conditions can affect characters:
- **Blinded** - Cannot see, -4 to attack/defense
- **Dazed** - Dazed action lost that round
- **Fatigued** - Movement reduced, no run
- **Frightened** - Move away from source
- **Grappled** - Locked in grapple, specific options
- **Helpless** - Cannot defend, automatic hits
- **Shaken** - -2 to all rolls
- And many more...

**To apply a condition**:
1. Right-click token
2. Select **Add Condition**
3. Choose condition type
4. Duration appears (rounds or indefinite)
5. Condition badge appears on token

**To remove a condition**:
1. Right-click token
2. Click condition to toggle
3. Or drag condition off token

#### Grappling

Grappling goes through states:

**Grab** → **Grabbed** → **Grappled** → **Pinned**

**Initiating a Grab**:
1. Make opposed Strength check
2. If you win: target is Grabbed
3. Can attempt to move Grabbed opponent

**Grabbed → Grappled**:
1. At start of next round, make opposed Strength
2. If you win: target is now Grappled
3. Grappled has fewer options

**Grappled → Pinned**:
1. Make another opposed Strength check
2. If you win: target is Pinned
3. Pinned is helpless (automatic hits)

**Escaping**:
- At any point, can attempt escape
- Make opposed Strength vs. current grappler
- If you win, free from grapple

### End of Combat

**Finishing Combat**:
1. When combat is done, click **End Combat**
2. All tokens return to normal
3. Combat Tracker clears
4. Ready for next encounter

---

## Force Powers & Abilities

### Using Force Powers

**Step 1: Check Force Sensitivity**
- Only Force-Sensitive characters can use powers
- Character must have Force Training feat
- Check Force tab for list of available powers

**Step 2: Select Power to Use**
1. Go to Force tab
2. Click power you want to use
3. Full power description appears

**Step 3: Meet Requirements**
- Check power prerequisites
- Most require a Force ability check (CHA or WIS)
- Some require specific Force Training feats

**Step 4: Make the Check**
1. Click **Roll Check** (if shown)
2. Make CHA or WIS check against DC
3. Most powers DC = 10 + Power Level
4. On success, power effect activates

**Step 5: Apply Power Effects**
1. Follow power description
2. May require:
   - Target selection
   - Area selection
   - Duration
3. Spend Force Points (if required)

### Learning New Force Powers

**Requirements**:
- Character must be Force-Sensitive
- Must have Force Training feat
- Must meet power prerequisites

**Learning a Power**:
1. Go to Force tab
2. Click **Open Force Power Picker**
3. Browse available powers
4. Click power to see details:
   - Level and prerequisites
   - Cost and effects
   - Description
5. Click **Learn** if available
6. Power added to sheet

**Force Power Levels**:
- **0-level**: Cantrip-style powers
- **1st level**: Basic Force powers
- **2nd level**: Intermediate powers
- **3rd level**: Advanced powers

### Managing Force Points

**Force Points System**:
- Represent your connection to Force
- Start with maximum at beginning of day
- Spent to enhance powers or overcome obstacles
- Regenerate each morning

**Maximum Force Points**:
- 3 + Force Training feat count
- Charisma modifier (if CHA-based)
- Or Wisdom modifier (if WIS-based)

**Spending Force Points**:
1. Click **Spend Force Point**
2. Point deducted from current total
3. Use for:
   - Power effect enhancement
   - Re-roll a check
   - Activate power ability
4. Cannot spend more than maximum

**Regeneration**:
- Automatic at start of day
- Set to maximum available
- Long rest regenerates all points

### Force Techniques

**Force Techniques** are advanced Force abilities:
- Require Force Training feats
- Usually have specific prerequisites
- Grant special bonuses or actions
- Use Force Point economy

**Using a Technique**:
1. Technique listed on Force tab
2. Check prerequisites
3. May require action/check
4. Spend Force Point if required
5. Apply effect as described

### Dark Side Mechanics

**Dark Side Score**:
- Tracks your use of Dark Side powers
- Ranges 0 (Light) to 20+ (Dark)
- Affects character relationships and abilities

**Increasing Dark Side**:
- Using Dark Side powers
- Making ethically questionable choices
- GM-awarded for specific actions

**Reducing Dark Side**:
- Using Light Side powers
- Making selfless choices
- Meditation and reflection
- Jedi training

**Consequences**:
- High Dark Side affects:
  - NPC reactions
  - Available powers
  - Character reputation
  - Special events

---

## Talents & Feats

### Selecting Talents

**Understanding Talents**:
- Class-specific abilities
- Organized in talent trees
- Prerequisite chains determine availability
- Multiple talents can be selected (class-dependent)

**Step 1: Access Talent Tree**
1. Go to Talents tab
2. Click **Talent Tree** button
3. Visual tree appears showing:
   - All available talents
   - Prerequisites (red = locked)
   - Green = available to select

**Step 2: Check Prerequisites**
- Hover over locked talent
- See why it's not available
- Usually shows required previous talent
- Some require specific class features

**Step 3: Select Talent**
1. Click available talent (not red)
2. Talent details appear
3. Click **Select** button
4. Talent added to your character

**Step 4: Verify Selection**
1. Return to Talents tab
2. New talent appears in list
3. Benefits apply immediately

### Using Feats

**Understanding Feats**:
- Universal abilities anyone can take
- Prerequisites (requirements)
- Action grants (buttons on sheet)
- Benefits (bonuses)

**Available Feats**:
- Bonus feat at 1st level
- One feat every 3 levels
- Bonus feats from class features
- Bonus feats from talents

**Step 1: Access Feat Selection**
1. When leveling up, feats appear
2. During character creation, select feat
3. Or manually add from compendium

**Step 2: Check Prerequisites**
- Most feats have requirements:
  - Base Attack Bonus (BAB)
  - Ability Score requirements
  - Other feat requirements
  - Specific class/race requirements

**Step 3: Select Feat**
1. Look at available feats
2. Check prerequisites are met
3. Click feat to see details
4. Click **Select** or drag to sheet
5. Feat added to sheet

**Step 4: Use Feat Ability**
1. Go to Feats tab
2. Find feat you want to use
3. Click action button (if available)
4. Action performed as described
5. Some feats are passive (no button)

### Feat Examples

**Weapon Focus**:
- Type: Passive
- Benefit: +1 to attacks with chosen weapon type
- Action: None (always active)

**Power Attack**:
- Type: Action-based
- Benefit: Trade attack bonus for damage
- Action: Toggle before attack roll

**Cleave**:
- Type: Action-based
- Benefit: Extra attack after killing enemy
- Action: Use as free action after kill

---

## Equipment & Inventory

### Managing Equipment

**Equipped Items**:
- Currently equipped and providing bonuses
- Shown in Equipment section
- Can be changed mid-game

**Inventory**:
- All items you carry
- Shows quantity and weight
- Can drag to equip/unequip

**Equipment Slots**:
- **Weapon** - Active melee or ranged weapon
- **Armor** - Body armor
- **Accessories** - Rings, amulets, etc.
- **Other** - Misc items

### Weapons

**Selecting a Weapon**:
1. Go to Equipment tab
2. Click **Weapon** dropdown
3. Choose weapon from inventory
4. That weapon is now active

**Weapon Properties**:
- **Damage** - 1d6, 1d8, 1d10, etc.
- **Damage Type** - Kinetic, energy, etc.
- **Range** - Melee or ranged distance
- **Critical** - Crit range (18-20, 19-20, 20)
- **Special** - Weapon-specific abilities

**Making an Attack**:
1. Click weapon name
2. Weapon card appears with details:
   - Attack bonus
   - Damage
   - Critical range
3. Click **Roll Attack**
4. If hit, click **Roll Damage**
5. Damage applied to target

### Armor

**Equipping Armor**:
1. Go to Equipment tab
2. Click **Armor** dropdown
3. Select armor from inventory
4. Armor bonus applies to defenses

**Armor Effects**:
- **Armor Bonus** - +1 to +5 AC
- **Reflex Penalty** - Reduces DEX modifier use
- **Max DEX** - Maximum DEX that applies
- **Special** - Armor-specific abilities

**Armor Types**:
- **Light Armor** - No movement penalty
- **Medium Armor** - Small movement penalty
- **Heavy Armor** - Significant movement penalty
- **Power Suit** - Requires training

### Equipment Upgrades

**Understanding Upgrades**:
- Modifications to weapons/armor
- Limited upgrade slots
- Expensive but powerful
- Improve equipment capabilities

**Installing an Upgrade**:
1. Select equipment item
2. Click **Available Upgrades**
3. See available upgrades:
   - Cost (credits)
   - Effect
   - Compatibility
4. Click **Install**
5. Upgrade applies to equipment

**Example Upgrades**:
- **Weapon Enhancement** - +1 to attacks/damage
- **Armor Reinforcement** - +1 armor bonus
- **Scope** - +2 to ranged attacks
- **Targeting System** - Improve accuracy

### Shopping & Currency

**Currency System**:
- Credits (primary currency)
- Track in character sheet
- Used for buying/selling

**Buying Items**:
1. Open compendium with items
2. Drag item to character sheet
3. Or right-click → **Add to Actor**
4. Item added to inventory
5. Subtract cost from credits

**Selling Items**:
1. Right-click item in inventory
2. Select **Sell Item**
3. Add half item value to credits
4. Item removed from inventory

---

## Leveling & Advancement

### Gaining Experience

**Experience Points (XP)**:
- Awarded by Game Master
- Accumulate over time
- Each level requires set amount
- Automatic level-up notification when ready

**Level-Up Requirements**:
- Level 1-3: 0, 1000, 3000 XP
- Level 4+: Previous + 3000
- Automatically calculate

### Leveling Up

**Step 1: Initiate Level-Up**
1. Character displays **Level Up** button
2. Or right-click character → **Roll Advancement**
3. Level-up dialog opens

**Step 2: Increase Hit Points**
1. Roll or take average for hit die:
   - Roll: Click **Roll HP**
   - Take Average: Click **Take Average**
2. Hit die depends on class:
   - Fighter: d10
   - Rogue: d8
   - Wizard: d6
3. Add CON modifier
4. New HP total displayed

**Step 3: Grant Class Features**
1. Dialog shows new features:
   - New abilities
   - New options
   - Descriptions of effects
2. Features grant automatically
3. Review new features

**Step 4: Allocate Skill Points**
1. See available skill points
2. Maximum 1 rank per skill
3. Click skills to increase:
   - Each rank costs 1 point
   - Can't exceed max rank
4. Distribute all points

**Step 5: Select Feats (Every 3 Levels)**
1. If feat level (3, 6, 9, etc.):
   - Browse available feats
   - Click to see requirements
   - Click **Select** to choose
2. Feat adds to sheet

**Step 6: Select Talents**
1. Browse talent tree
2. Check prerequisites
3. Select new talent (if available)
4. Talent adds to sheet

**Step 7: Apply Ability Increases (Every 4 Levels)**
1. At levels 4, 8, 12, 16, 20:
   - Can increase ability scores
2. Choose ability to increase
3. Increase by +2 (standard) or +1 to each of 2 abilities
4. Ability modifiers recalculate

**Step 8: Confirm Level-Up**
1. Review all changes
2. Click **Confirm** when ready
3. Character advanced to new level
4. Features active immediately

### Multi-Classing

**Adding a Second Class**:
1. Character can have multiple classes
2. XP divided between classes
3. Features from both classes apply
4. Defenses combine correctly

**How to Add Class**:
1. Click **Add Class** button
2. Select new class to add
3. Set new class level (usually 1)
4. Features from new class grant
5. Experience tracking for both classes

**Multi-Class Benefits**:
- Access talents from both classes
- Defenses improve from both
- BAB improves from both
- More feats available

**Multi-Class Challenges**:
- Must track two progressions
- Some features don't stack
- More complex character
- May need GM approval

---

## Game Master Tools

### Creating NPCs

**Step 1: Create NPC Actor**
1. Click **Create Actor**
2. Select **NPC** type
3. Enter NPC name
4. Click **Create**

**Step 2: Quick NPC Creation**
1. Use character generator (same as PCs)
2. Set ability scores
3. Choose class
4. Grant features
5. Add equipment

**Step 3: Quick Enemy Creation**
1. Manually set ability scores
2. Set hit points
3. Add skills and feats
4. Add weapons
5. Set defenses

**Step 4: Customize**
1. Add personality notes
2. Set appearance/portrait
3. Add special abilities
4. Add equipment
5. Done!

### Creating Encounters

**Combat Encounter**:
1. Create enemy NPCs
2. Drag tokens to map
3. Click **Create Combat**
4. Add tokens to combat
5. Roll initiative
6. Begin combat

**Challenge Rating**:
- Difficult encounter: Party level + 2
- Dangerous: Party level + 3-4
- Deadly: Party level + 5+

### Managing World Content

**Loading Default Content**:
1. As GM, open Settings
2. Find **SWSE Settings**
3. Click **Load Default Content**
4. World populated with:
   - Classes
   - Feats
   - Talents
   - Weapons
   - Armor
   - Equipment

**Importing from Compendiums**:
1. Open compendium pack
2. Right-click item
3. Click **Import Item**
4. Item added to world
5. Now available to all players

### Creating Followers

**Step 1: Open Follower Creator**
1. Find Follower Creator in apps
2. Click **Create Follower**
3. Follow wizard steps

**Step 2: Configure Follower**
1. Set name and appearance
2. Choose class and level
3. Set ability scores
4. Configure skills
5. Add equipment

**Step 3: Manage Followers**
1. Track followers in sidebar
2. Level followers with party
3. Auto-level optionally
4. Modify stats as needed

**Follower Features**:
- Automatically level with party
- Use standard character sheets
- Controlled by GM
- Can inherit stats from templates

### House Rules & Settings

**Accessing Settings**:
1. Click **Settings** (gear icon)
2. Find **SWSE Settings**
3. Adjust options

**Available Settings**:
- **Ability Score Method** - Choose generation
- **Point Buy Pool** - Set point limits
- **Force Training Attribute** - CHA or WIS
- **Default Theme** - Visual appearance
- **Houserule Options** - Enable/disable variants

**Houserule Examples**:
- **Grappling Variants** - Different grapple rules
- **Healing House Rules** - Custom healing
- **Condition Track** - Alternative HP system
- **Flanking Bonuses** - Tactical bonuses
- **Skill Variants** - Different training
- **Status Effects** - Visual buffs/debuffs

### Creating Templates

**Character Template**:
1. Create character normally
2. Configure to desired template
3. Click **Save as Template**
4. Name the template
5. Template saved for reuse

**Using Template**:
1. Click **Use Template**
2. Select saved template
3. New character created from template
4. Customize as needed

---

## Advanced Features

### Active Effects

**Understanding Active Effects**:
- Temporary bonuses/penalties
- Duration-limited
- Stack with other effects
- Can be positive or negative

**Examples**:
- **Buff**: +2 to all attacks (4 rounds)
- **Debuff**: -1 to defenses (until end of day)
- **Condition**: Blinded (-4 to attacks)
- **Enhancement**: +1d6 bonus damage (scene duration)

**Applying Effect**:
1. Right-click character token
2. Click **Add Effect**
3. Choose effect type
4. Set duration:
   - Rounds (combat)
   - Minutes/hours (out of combat)
   - Indefinite (manual removal)
5. Choose bonus/penalty
6. Effect applies

**Removing Effect**:
1. Right-click token
2. Click effect to toggle off
3. Or drag effect away
4. Effect removed

### Macros

**Creating a Macro**:
1. Open Macro menu
2. Click **Create Macro**
3. Enter macro code:
   - Roll command: `/roll 1d20+5`
   - Chat message: `/say Hello!`
   - Custom JavaScript (advanced)
4. Click **Save**

**Using a Macro**:
1. Drag macro to hotbar
2. Click macro button
3. Macro executes
4. Result appears in chat

**Example Macros**:
- Quick attack: `/roll 1d20+8`
- Damage roll: `/roll 2d6+4`
- Message: `/say I attack with my lightsaber!`

### Custom Content

**Creating Custom Items**:
1. Open items tab
2. Click **Create Item**
3. Choose item type
4. Fill in properties:
   - Name
   - Description
   - Bonuses
   - Effects
5. Click **Save**

**Creating Custom NPCs**:
1. Create NPC actor
2. Set all properties
3. Save as template if desired
4. Use for future encounters

**Sharing Content**:
1. Export character/item
2. Send file to other player
3. Other player imports
4. Now available in their world

### Performance Tips

**Optimize Your Game**:
1. **Close unused apps** - Minimize background windows
2. **Limit token count** - Fewer tokens = faster
3. **Clear chat** - Old messages can slow down
4. **Disable effects** - Too many effects slow game
5. **Update Foundry** - Newer versions faster

### Troubleshooting

**Common Issues**:

**"Defense not calculating"**
- Verify ability scores set
- Check class selected
- Ensure armor equipped
- Reload page if still broken

**"Talent tree won't load"**
- Ensure class selected
- Check class has talent tree
- Try reloading character sheet

**"Force powers grayed out"**
- Character must be Force-sensitive
- Must have Force Training feat
- Power prerequisites must be met

**"Combat won't initialize"**
- Ensure tokens on map
- Create combat in Combat Tracker
- Add tokens manually if needed

**"Items won't add to sheet"**
- Check item type is correct
- Try drag-and-drop from compendium
- Verify character selected

---

## Quick Reference

### Common Keyboard Shortcuts
- **E** - Open character sheet
- **R** - Roll initiative
- **D** - Roll damage
- **Space** - Toggle token movement mode
- **Ctrl+Click** - Multiple selection

### Stat Block at a Glance
```
Ability Scores: STR DEX CON INT WIS CHA
Defenses: Fortitude, Reflex, Will
Combat: BAB +8, Initiative +3, HP 45/52
Skills: 100+ with training bonuses
Feats: Weapon Focus, Power Attack, etc.
Talents: Class-specific abilities
Equipment: Lightsaber, Armor, Accessories
```

### Advancement Timeline
- **Level 1** - Character creation
- **Level 3, 6, 9, 12, 15, 18** - Feat levels
- **Level 4, 8, 12, 16, 20** - Ability increases (+2)
- **Every level** - Skill points, HP, features

---

See also:
- **[Features Guide](./FEATURES.md)** - Complete feature reference
- **[Getting Started](./GETTING_STARTED.md)** - Quick start tutorial
- **[About](./ABOUT.md)** - Project overview

For more help, see [GitHub Issues](https://github.com/docflowGM/foundryvtt-swse/issues) or [CONTRIBUTING.md](./docs/CONTRIBUTING.md).
