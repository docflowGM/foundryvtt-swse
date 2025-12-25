# Getting Started with SWSE FoundryVTT

Welcome to Star Wars Saga Edition for Foundry VTT! This guide will get you up and running in minutes.

## Installation

### Step 1: Install the System in Foundry

1. Open **Foundry Virtual Tabletop**
2. Go to **Game Systems** tab
3. Click **Install System**
4. Paste this manifest URL:
   ```
   https://github.com/docflowGM/foundryvtt-swse/releases/download/latest/system.json
   ```
5. Click **Install**
6. Wait for installation to complete

### Step 2: Create a World

1. Click **Create World**
2. Enter a world name (e.g., "Star Wars Campaign")
3. Select **Star Wars Saga Edition** as the System
4. Click **Create World**

### Step 3: Open Your World

1. Click your new world to enter
2. You're now in your SWSE world! 🎉

## Creating Your First Character

### Quick Method (2 minutes)

1. Click **Create Actor** in the Actors tab
2. Select **Character** type
3. Click the blue **Create Character** button on the character sheet
4. Follow the 7-step wizard:
   - **Step 1: Species** - Choose your character's species
   - **Step 2: Background** - Select a background
   - **Step 3: Attributes** - Roll or choose ability scores
   - **Step 4: Class** - Pick your starting class
   - **Step 5: Skills** - Allocate skill points
   - **Step 6: Feats** - Choose starting feats
   - **Step 7: Talents** - Pick talents from the talent tree
5. Review your character
6. Click **Finalize**

Your character is ready to play!

### Customizing Your Character

After creation, click on your character name to open the character sheet. You can:

- **Add items** from compendiums by dragging them to inventory
- **Modify equipment** to change equipped armor and weapons
- **Adjust ability scores** manually if needed
- **Update biography** with character background
- **Change portrait** with character artwork
- **Add notes** for character details

## Understanding the Character Sheet

### Summary Tab
Shows your character's key statistics:
- **Ability Scores** (STR, DEX, CON, INT, WIS, CHA)
- **Defenses** (Fortitude, Reflex, Will)
- **Hit Points** (current/maximum)
- **Base Attack Bonus** (BAB)
- **Initiative** bonus
- **Force Points** (if Force-sensitive)

Click on any number to make quick edits.

### Skills Tab
- **100+ Skills** with training tracking
- **Green background** = Trained in this skill
- **Blue text** = Trained proficiency bonus
- **Red text** = Untrained penalty
- Click any skill to make a skill check

### Feats Tab
- **Feats** you've learned
- **Action Grants** - Buttons for feat abilities
- **Feat Details** - Hover to see full descriptions
- Click buttons to perform feat actions

### Talents Tab
- **Your Talents** listed by type
- **Talent Tree** - Visual tree showing available talents
- Click to view full talent descriptions
- Use talent tree to select new talents when leveling

### Force Tab (Force-Sensitive Only)
- **Force Points** - Current/maximum points
- **Available Powers** - Powers you know
- **Force Power Picker** - Click to learn new powers
- Click power names to view full descriptions

### Equipment Tab
- **Equipped Items** - Currently equipped gear
- **Inventory** - All items you carry
- **Weapon Selection** - Choose active weapon
- **Armor Selection** - Choose equipped armor
- **Drag from compendium** to add new items

## Basic Combat

### Starting Combat

1. **Add Combatants** - Click **Create Combat** in Combat Tracker
2. **Add Characters** - Drag character tokens to combat
3. **Roll Initiative** - Click **Roll All**
4. **Combat Begins** - Take turns in order

### On Your Turn

1. **Click your character** name in Combat Tracker
2. **Available Actions**:
   - **Attack** - Click weapon in equipment, then target
   - **Skill Check** - Click skill name, add modifiers
   - **Use Feat** - Click feat action button
   - **Move** - Drag token on map
3. **Roll Damage** - If attack hits, click weapon to roll damage
4. **End Turn** - Click **Next Turn** in Combat Tracker

### Making a Skill Check

1. Click the skill name (e.g., "Acrobatics")
2. A dice roll dialog appears
3. Add any modifiers (feat bonuses, circumstance, etc.)
4. Click **Roll**
5. Result appears in chat for everyone to see

### Applying Damage

1. Make an attack roll and hit
2. Click weapon to roll damage
3. Select the target from the list
4. Damage is automatically applied
5. HP updates instantly on target's sheet

## Setting Up Your Game

### Load System Content

Game Masters should load the default system content:

1. Open **Settings** (gear icon)
2. Look for **SWSE Settings**
3. Click **Load Default Content** (if available)
4. This populates your world with:
   - Classes
   - Feats
   - Talents
   - Species
   - Equipment
   - And much more!

### Create NPCs

1. **Click Create Actor**
2. **Select NPC** type
3. **Quick Create** or **Use Generator**:
   - Use character generator (same as PCs)
   - Or manually set stats
4. **Name your NPC**
5. **Add to world**

### Create Enemies

1. **Click Create Actor**
2. **Select NPC** type
3. **Set ability scores** manually
4. **Set hit points**
5. **Add skills, feats**
6. **Add to world and drag to combat**

## Leveling Up

### When a Character Levels

1. **Right-click character** → **Roll Advancement**
2. Or manually click **Add Level** on character sheet
3. A level-up dialog appears with steps:
   - **Roll HP** - Roll hit die or take average
   - **Grant Features** - New class features appear
   - **Allocate Skills** - Spend skill points
   - **Choose Feats** - If feat level (every 3 levels)
   - **Choose Talents** - If talent level (every class-dependent)
4. **Confirm** when done

## Using Force Powers

### If You're Force-Sensitive

1. **Go to Force tab** on character sheet
2. **Click Open Force Power Picker**
3. **Browse available powers**
4. **Click power name** to select it
5. **Confirm** selection

### Using a Force Power

1. **Go to Force tab**
2. **See Available Powers** section
3. **Click power name** to see details
4. **Description shows** how to use the power
5. **Make roll** (usually Charisma or Wisdom check)
6. **Apply effect** as described

### Force Points

- **You start with** Force Points based on class
- **Click Force Point** to spend one
- **Points regenerate** at start of each day
- **Can be spent** to:
  - Improve rolls (before rolling)
  - Activate power effects
  - Fuel specific abilities

## Vehicle Rules

### Piloting a Vehicle

1. **Create Vehicle** actor
2. **Set pilot** (who's controlling it)
3. **In combat**:
   - Pilot makes initiative roll
   - Vehicle acts on pilot's turn
   - Pilot uses vehicle weapons
   - Vehicle has own HP and conditions

### Vehicle Combat

1. **Vehicle has** different stats than characters
2. **Weapons are** mounted on vehicle
3. **Pilot uses** Pilot skill to control
4. **Damage goes** to vehicle HP pool
5. **Vehicle can be** disabled, crippled, etc.

## Droid Rules

### Creating a Droid

1. **Click Create Actor**
2. **Select Droid** type
3. **Set droid systems**:
   - Choose from 30+ system types
   - Each system has point cost
   - Assign to build your custom droid
4. **No ability scores** - Droids use systems instead
5. **Skills from** system programming

## Customizing Your Game

### Houserules

Many variant rules are available. As Game Master:

1. **Open Settings**
2. **Find SWSE Houserules**
3. **Toggle options** you want to use:
   - Grappling variants
   - Healing house rules
   - Condition tracking
   - And more!
4. **Settings apply** immediately to all characters

### Themes

Change the appearance:

1. **Open Settings**
2. **Select Theme**:
   - Holo (futuristic)
   - High Contrast (bold colors)
   - Starship (neutral)
   - Sand People (desert)
   - Jedi (temple)
   - High Republic (modern)
3. **Theme changes** instantly

## Tips & Tricks

### Keyboard Shortcuts
- **E** - Open character sheet
- **R** - Roll initiative
- **D** - Roll damage
- **Space** - Toggle token movement

### Quick Actions
- **Right-click item** to toggle equip/unequip
- **Middle-click skill** to add modifier dialog
- **Click token** to focus in combat
- **Ctrl+Click** to select multiple tokens

### Using Templates
- **Character Templates** - Save your favorite character builds
- **NPC Templates** - Quick enemy creation
- **Follower Templates** - Pre-built companion characters
- All available in your compendiums

### Chat Tips
- Type `/roll 1d20+5` to roll with modifiers
- Hold **Shift** when rolling to show all details
- Click **Roll** button to show roll details again
- Type `/help` for more chat commands

## Common Issues & Solutions

### "Character won't level up"
- Click **Add Level** button on character sheet
- Or right-click character → **Roll Advancement**

### "Can't find item in compendium"
- Make sure to **Load Default Content** (GM only)
- Use **Search** box to find items
- Check correct **Item Type** in filter

### "Defenses not calculating"
- Make sure ability scores are set
- Check that class is selected
- Verify armor is equipped
- Reload page if still broken

### "Force powers don't show"
- Character must be Force-sensitive
- Must have Force Training feat
- Check Force tab (not shown if not FS)

### "Can't add item to character"
- Make sure item is dragged to inventory
- Check item type (some are read-only)
- Try drag-and-drop from compendium

## Next Steps

Congratulations! You're ready to play SWSE!

### As a Player
- Create your character using the wizard
- Explore the character sheet
- Make skill checks and attacks
- Use your talents and feats
- See [USER_GUIDE.md](./USER_GUIDE.md) for detailed feature explanations

### As a Game Master
- Create NPCs and enemies
- Load default content
- Set up your world
- Create combat encounters
- Manage campaigns with followers and templates
- See [USER_GUIDE.md](./USER_GUIDE.md) for advanced GM features

### For More Information
- **[Features Guide](./FEATURES.md)** - See all available features
- **[User Guide](./USER_GUIDE.md)** - Detailed how-to for every feature
- **[About](./ABOUT.md)** - Technical overview
- **[Developer Guide](./docs/CONTRIBUTING.md)** - For developers/modders

## Getting Help

### Questions?
- Check the [User Guide](./USER_GUIDE.md)
- Review [Features Guide](./FEATURES.md)
- Visit [GitHub Issues](https://github.com/docflowGM/foundryvtt-swse/issues)

### Found a Bug?
- Report on [GitHub Issues](https://github.com/docflowGM/foundryvtt-swse/issues)
- Include your Foundry version
- Describe steps to reproduce
- Attach screenshots if helpful

### Want to Contribute?
- See [Contributing Guide](./docs/CONTRIBUTING.md)
- Fork the repository
- Make improvements
- Submit a pull request

---

**Ready to start your Star Wars adventure?** May the Force be with you! ⭐
