# Star Wars Saga Edition System - Frequently Asked Questions (FAQ)

Welcome to the comprehensive FAQ for the Foundry VTT Star Wars Saga Edition system! This guide covers common questions about using the system, creating characters, running combat, managing Force powers, and troubleshooting issues.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Character Creation](#character-creation)
3. [Character Management](#character-management)
4. [Combat & Actions](#combat--actions)
5. [Force Powers & Dark Side](#force-powers--dark-side)
6. [Equipment & Inventory](#equipment--inventory)
7. [Vehicles & Droids](#vehicles--droids)
8. [Houserules & Customization](#houserules--customization)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Q: What is the Star Wars Saga Edition System for Foundry VTT?
**A:** This is a complete implementation of the Star Wars Saga Edition (SWSE) d20 RPG system for Foundry Virtual Tabletop. It automates character creation, combat mechanics, Force powers, progression, and all game mechanics. The system includes hundreds of pre-built game items across 40+ compendium packs.

### Q: What version of Foundry VTT do I need?
**A:** The system requires Foundry VTT v11 or later. It's fully compatible with v12 and v13. For best performance, use the latest stable version of Foundry VTT.

### Q: How do I install the system?
**A:**
1. Open Foundry VTT and go to **Settings > Manage Systems**
2. Click **Install System** and search for "Star Wars Saga Edition"
3. Click **Install** and wait for the process to complete
4. Create a new world and select the SWSE system

Alternatively, you can use the **Manifest URL** from the official GitHub repository.

### Q: Where can I find the system documentation?
**A:** The documentation is available in the `/docs` folder of the repository and in-game. Start with:
- **GETTING_STARTED.md** - Quick start guide for new players
- **USER_GUIDE.md** - Complete how-to guide for all features
- **FEATURES.md** - Comprehensive feature list
- **docs/Design.md** - Technical architecture for developers

### Q: Is there a quick way to get started?
**A:** Yes! When you create a new character, the **Character Generator Wizard** guides you through 7 steps to create a complete character. Alternatively, you can use one of the **Character Templates** for quick creation.

### Q: Can I use this system for other d20 games?
**A:** This system is specifically designed for Star Wars Saga Edition. While the core d20 mechanics are compatible with other games using similar rules, content and features are tailored to SWSE.

---

## Character Creation

### Q: How do I create a character?
**A:** There are three ways:

1. **Character Generator Wizard (Recommended for beginners)**
   - Create a new character actor
   - Click the "Character Generator" button on the sheet
   - Follow the 7-step process:
     1. Choose species (provides ability modifiers)
     2. Choose class
     3. Select ability scores (4d6 Drop Lowest, Point Buy, or Standard Array)
     4. Choose feats for your class
     5. Select talents from your class talent tree
     6. Choose background and equipment
     7. Review and finalize

2. **Manual Creation**
   - Create an actor and manually fill in all fields
   - Manually drag items from compendiums

3. **Character Templates**
   - Right-click a character in the sidebar
   - Select "Use as Template" to create pre-built character types

### Q: What are ability scores and how do I generate them?
**A:** Ability scores range from 1-20 and represent core attributes (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma). You can generate them using:

- **4d6 Drop Lowest**: Roll 4d6 six times, drop the lowest die each time (most common)
- **Point Buy**: Allocate 15 points across abilities (guaranteed balance)
- **Standard Array**: Use the preset array (15, 14, 13, 12, 10, 8)
- **Custom**: Manually enter values

### Q: What are species and what do they do?
**A:** Species provide racial traits, ability modifiers, and background features. Available species include:

- **Humans** - Versatile, get an extra feat
- **Twi'leks** - Charisma bonuses, natural performers
- **Wookiees** - Strength bonuses, melee combatants
- **Zabraks** - Aggressive, combat-focused
- **Droids** - Unique progression (see Droids section)
- **Mon Calamari** - Technical specialists
- And many more!

Species bonuses automatically apply to your ability scores and traits.

### Q: What are classes and how do they work?
**A:** Classes define your character's role and progression. Available classes include:

- **Jedi** - Force-sensitive warrior, balanced abilities
- **Scoundrel** - Skill-focused, cunning
- **Soldier** - Combat-focused, strong in battle
- **Scout** - Mobility and ranged focus
- **Noble** - Leadership and influence
- **Jedi Knight** - Advanced Jedi class
- **And more!**

Each class has:
- Base Attack Bonus progression
- Hit Points per level
- Talent tree with unique abilities
- Class features granted at specific levels

### Q: Can I have multiple classes?
**A:** Yes! Multi-classing allows you to add additional classes to your character. When you add a new class:

- Your progression updates to blend both classes
- Features from both classes are available
- Feats and talents from all classes are usable
- Threat levels and other mechanics stack properly

### Q: What are talents and feats?
**A:**
- **Talents** are special abilities you can take at each level from your class's talent tree. They provide unique mechanical benefits and powers.
- **Feats** are one-time bonuses (like attribute increases) or abilities (like weapon specialization) that broaden character capabilities.

Both are selected from compendiums and automatically track prerequisites.

### Q: How are hit points calculated?
**A:** Hit Points (HP) are calculated as:
- **Constitution modifier** (from your CON ability score)
- **Base HP from your class**
- **Additional bonus HP from talents and feats**
- **Constitution bonus per level** (typically +CON modifier each level you gain)

When you level up, you can roll for HP or accept the average.

### Q: How do I add skills to my character?
**A:** Skills are managed through the **Skills tab** on your character sheet:

1. Click on a skill to toggle training
2. Trained skills automatically gain a +5 bonus plus related ability modifiers plus half your character level
3. You can also apply bonus increases from feats (like Skill Focus for +5), talents, and equipment
4. Skill totals are calculated automatically

The system includes all 19 SWSE skills: Acrobatics, Climb, Deception, Endurance, Gather Information, Initiative, Jump, Knowledge, Mechanics, Perception, Persuasion, Pilot, Ride, Stealth, Survival, Swim, Treat Injury, Use Computer, and Use the Force.

### Q: What is the background system?
**A:** Backgrounds provide:
- Character narrative flavor
- Bonus class skills
- Starting equipment choices
- Connection to the campaign world

Select a background during character creation for integrated bonuses.

### Q: How do I select a lightsaber form?
**A:** Lightsaber forms are typically selected through Force training talents. Once you have a form:

1. Go to the **Force tab**
2. Look for your active form
3. The form grants bonuses to melee and can activate form-specific powers
4. You can switch forms (requires standard action in combat)

---

## Character Management

### Q: How do I level up my character?
**A:**
1. Accumulate experience points through gameplay
2. When you reach the next level threshold, a notification appears
3. Click the **"Level Up"** button on the character sheet
4. The **Level-Up Dialog** guides you through:
   - Rolling for new HP or accepting the average
   - Selecting new talents/feats available at this level
   - Granting automatic class features
   - Increasing ability scores (every 4 levels)

The system automatically handles feature progression.

### Q: How are defenses calculated?
**A:** The system uses 3 defense types:

- **Fortitude Defense** = 10 + half level + class bonus + higher of CON or STR modifier + misc bonuses
- **Reflex Defense** = 10 + half level + class bonus + DEX modifier + armor bonus (or heroic level if higher) + misc bonuses
- **Will Defense** = 10 + half level + class bonus + WIS modifier + misc bonuses

These are calculated automatically based on your level, class, equipment, and abilities.

### Q: How do I add equipment bonuses?
**A:** Equipment bonuses apply automatically:

1. Add armor/shields to your equipment
2. Bonuses apply immediately to relevant defenses
3. Armor check penalties apply automatically to skills
4. Damage reductions from armor apply in combat

No manual calculations needed—just equip items and the system handles it.

### Q: How do I use active effects?
**A:** Active Effects apply temporary bonuses or conditions:

1. Open the **Active Effects** tab on a character sheet
2. Click **+ Create Active Effect**
3. Set the duration (rounds, minutes, hours, permanent)
4. Select effect type (bonus, damage, condition, etc.)
5. Add key changes (ability score modifiers, defense bonuses, etc.)
6. Effects automatically expire or can be manually toggled

Common effects include: stunned, incapacitated, defensive stance, buffs, debuffs.

### Q: How do I track conditions like "unconscious" or "disabled"?
**A:** The system includes several status condition types:

1. Go to the **Active Effects** tab
2. Add conditions using built-in templates
3. Conditions automatically:
   - Mark the character's status
   - May apply mechanical penalties
   - Block certain actions (unconscious characters can't act)
   - Appear as badges on the character sheet

Common conditions: stunned, staggered, helpless, unconscious, disabled, blinded, deafened.

### Q: Can I export or import character data?
**A:** Foundry provides several export options:

- **Character Compendium**: Right-click a character → "Export to Compendium" to save for reuse
- **JSON Export**: Right-click character → "Export" for backup or sharing
- **Compendium Folder**: Organize exported characters in folders

### Q: How do I create an NPC or enemy?
**A:** NPCs use a different actor type (NPC instead of Character):

1. Create a new actor and select **NPC type**
2. Fill in the same fields as a character
3. NPCs use the same leveling and progression system
4. Add enemies from the NPC compendium for pre-built enemies

---

## Combat & Actions

### Q: How does initiative work?
**A:** Initiative determines turn order in combat:

1. **Before combat**: Click **Combat** → **Start Combat** in the sidebar
2. All combatants automatically roll initiative: **1d20 + DEX modifier + combat bonuses**
3. Turn order is automatically sorted highest to lowest
4. On your turn, click your character's name to make it active

### Q: How do I attack an enemy?
**A:**
1. On your turn, click the **Attack** action on your weapon
2. The system rolls: **1d20 + Base Attack Bonus + ability modifier + bonuses**
3. You can add advantages/disadvantages before confirming
4. The roll is compared to the target's defense
5. If successful, you can immediately roll damage

Criticals (natural 20s) automatically double damage dice.

### Q: How do defenses work in combat?
**A:** Rather than armor class, SWSE uses three defense types:

- **Fortitude** - Resists physical effects and determines Damage Threshold
- **Reflex** - Dodges attacks and area effects
- **Will** - Resists mental effects and Force powers

When you attack, the attack targets a specific defense (usually Reflex for weapon attacks). Your attack roll must meet or exceed the target's defense. Damage Threshold equals Fortitude Defense; exceeding it in one hit moves the target down the Condition Track.

### Q: How do I deal damage?
**A:**
1. After a successful attack, click the **Damage** button
2. The system rolls your weapon's damage die + ability modifier
3. Subtract from the target's HP automatically (click to apply)
4. If HP reaches 0, the character is unconscious
5. At -HP equal to Constitution score, the character dies

Damage is tracked in the **Health** section of the character sheet.

### Q: How does the Condition Track work?
**A:** SWSE uses a Condition Track instead of HP-based wound levels:

- **Normal**: No penalties
- **-1 step**: -1 to attacks, defenses, ability checks, and skill checks
- **-2 steps**: -2 penalty
- **-5 steps**: -5 penalty
- **-10 steps**: -10 penalty and half speed
- **Helpless**: Unconscious/Disabled

You move down the Condition Track when you take damage exceeding your **Damage Threshold** (equal to your Fortitude Defense) in a single hit. Characters at 0 HP fall unconscious; at -10 HP they die.

System indicators show the current Condition Track step visually.

### Q: How does grappling work?
**A:** Grappling has four stages:

1. **Initiate Grab**: Make an attack against the target (opposed by their attack)
2. **Grabbed**: Target is physically held but can act
3. **Grappled**: Target is controlled and restricted
4. **Pinned**: Target is fully restrained and can't act

Each stage requires successful opposed checks. Use the **Grapple** combat action to initiate.

### Q: How do I perform special combat actions?
**A:** Combat actions are listed in a browser:

1. Click the **Combat Actions** button on your sheet
2. Browse available actions (attack, move, standard action combos)
3. Click an action to use it
4. The system tracks whether you have actions available
5. Effects apply automatically when applicable

Actions are limited by:
- **Standard Action**: 1 per round
- **Move Action**: 1 per round
- **Swift Action**: Limited per round
- **Reaction**: 1 when triggered

### Q: How does vehicle combat work?
**A:** Vehicles have specialized combat mechanics:

1. **Pilot vs. Target**: Pilot rolls attack against vehicle defense
2. **Weapons**: Vehicles have hardpoint weapons with different ranges and damage
3. **Maneuvers**: Pilots can take maneuvers (evasive, aggressive, etc.)
4. **Shielding**: Larger vehicles have shields instead of armor
5. **Crew Actions**: Multiple crew members can perform actions

See the Vehicles section below for details.

### Q: How do I track ongoing effects in combat?
**A:** Use the **Combat Tracker**:

1. The Combat Tracker shows all active combatants
2. Effects are visible on each combatant's entry
3. Durations automatically count down each round
4. Expired effects are automatically removed
5. Toggle effects on/off using the interface

---

## Force Powers & Dark Side

### Q: What are Force Powers and how do they work?
**A:** Force Powers are special abilities available to Force-sensitive characters:

1. **Select Force Powers**: During character creation or via the **Force tab**, choose available powers
2. **Power Slots**: Force sensitivity and feats determine how many powers you know
3. **Activation**: Use a Force Power during combat from the **Force tab**
4. **Costs**: Some powers cost Force Points
5. **Effects**: Powers apply automatically (bonus, damage, conditions, etc.)

### Q: How do I manage Force Points?
**A:** Force Points are a limited resource that enhance your character:

1. **Current Force Points**: Displayed on the **Force tab**
2. **Maximum**: Typically 5 + half your character level (can vary by campaign settings)
3. **Recovery**: Force Points typically refresh when you level up or per campaign settings (extended rest, per session)
4. **Spending**: Use Force Points to:
   - Add bonus dice to any d20 roll (1d6 at low levels, up to 3d6 at higher levels, take highest)
   - Activate certain Force powers
   - Avoid death (fall unconscious instead)
5. **Dark Side Temptation**: You can call on the Dark Side for extra dice, but this increases your Dark Side Score

### Q: What is the Dark Side Score?
**A:** The Dark Side Score represents corruption from the Dark Side of the Force:

- **Score Range**: 0 to your Wisdom score (default, can be modified by houserules)
- **Gaining Points**: Using [Dark Side] tagged Force powers, calling on Dark Side temptation, or committing evil acts
- **Effects**:
  - When Dark Side Score equals or exceeds your Wisdom, you fall to the Dark Side
  - Dark Side characters may lose access to certain Light Side powers
  - Can use Dark Side temptation for bonus dice if Dark Side Score ≤ half Wisdom
- **Redemption**: Spending a Force Point can reduce Dark Side Score by 1; other acts of atonement per GM discretion

### Q: How do I select available Force Powers?
**A:**
1. Go to the **Force tab** on your character sheet
2. Click **Add Power** to browse available powers
3. Select powers based on your:
   - Force sensitivity level
   - Available power slots
   - Prerequisite feats/talents
4. Powers are displayed by tier (Force Training, Apprentice, Master)

### Q: How do prerequisite requirements work for Force Powers?
**A:** Force Powers have prerequisites like:

- **Force Sensitivity** level (Trained, Talent-based, etc.)
- **Minimum Level**
- **Required Feats** (Jedi Training, Dark Side, etc.)
- **Lightsaber Form**: Some powers require a specific form

The system automatically validates prerequisites and prevents selecting unavailable powers.

### Q: What are Lightsaber Forms?
**A:** Lightsaber Forms are specialized Force combat techniques:

- **7 Forms Available**: Each with unique bonuses and powers
- **Activation**: Available through Force talents
- **Bonuses**: Forms provide melee attack/defense bonuses
- **Form Powers**: Each form grants access to unique Force powers
- **Switching**: Can switch forms (requires standard action)
- **Stacking**: Form bonuses stack with other abilities

### Q: What are Force Secrets and Force Techniques?
**A:** Advanced Force abilities:

- **Force Secrets**: Passive abilities that modify how Force powers work (extending range, improving effects, etc.)
- **Force Techniques**: Advanced active powers requiring mastery (summoning, advanced combat techniques)
- **Prerequisites**: Require significant Force training and high level
- **Selection**: Available in the **Force tab** for qualified characters

---

## Equipment & Inventory

### Q: How do I add equipment to my character?
**A:**
1. Click the **Equipment tab**
2. Click **+ Add Item**
3. Select from:
   - **Compendiums**: 1000+ items across 27 packs (fastest method)
   - **Create New**: Manually create custom items
4. Select the item and click **Add**
5. Equipment is immediately equipped and bonuses apply

### Q: What types of equipment are available?
**A:** The system includes:

- **50+ Weapons**: Pistols, rifles, lightsabers, melee weapons, grenades, explosives
- **50+ Armor**: Light, medium, heavy with varying AC penalties
- **100+ Equipment Items**: Tools, survival gear, medical supplies, tech equipment, communication devices
- **Upgrade Modules**: Equipment enhancements (scopes, grips, modifications)

### Q: How do armor check penalties work?
**A:** Heavy armor applies penalties:

- **Light Armor**: No penalty
- **Medium Armor**: -2 penalty to Acrobatics, Stealth, and Swim
- **Heavy Armor**: -5 penalty to Acrobatics, Stealth, Swim, and Climb

These are automatically applied to affected skills.

### Q: Can I create custom items?
**A:** Yes!

1. Click **+ Add Item** in the Equipment tab
2. Select **Create New Item**
3. Choose item type (Weapon, Armor, Equipment, etc.)
4. Fill in:
   - Name and description
   - Stats (damage, armor bonus, weight, cost)
   - Special properties
   - Images
5. Click **Save** and the item appears in your inventory

### Q: How do I track ammunition and consumables?
**A:**

1. Add consumable items (ammunition, rations, medical supplies) to inventory
2. Each consumable tracks quantity
3. After using: right-click and select **Reduce Quantity**
4. When quantity reaches 0, the item appears grayed out
5. Delete when no longer needed

### Q: How do equipment upgrades/modifications work?
**A:** Weapons and items can be modified:

1. Click on the item in your inventory
2. Open the item sheet
3. Go to the **Modifications** tab
4. Click **+ Add Modification**
5. Select from available upgrades (scopes, frames, processors, etc.)
6. Modifications apply bonuses immediately
7. Different items have different modification slots

### Q: How is inventory weight calculated?
**A:** The system tracks weight:

- **Item Weight**: Each item has a weight value
- **Total Weight**: Automatically summed across all equipment
- **Carrying Capacity**: Determined by Strength score
- **Encumbrance**: If over capacity, speed is reduced

Check the **Equipment tab** for total weight display.

### Q: Can I use items with multiple attunements or requirements?
**A:** Some equipment may have restrictions (Force-sensitive only, Jedi training required, etc.):

- Restrictions are listed in item descriptions
- The system doesn't prevent equipping restricted items (GMs can police this)
- You can still benefit from non-restricted aspects of items

---

## Vehicles & Droids

### Q: What is the Vehicle system?
**A:** Vehicles are specialized actors for starships, speeders, walkers, and stations:

1. **Create a Vehicle**: Create an actor and select **Vehicle type**
2. **Stats**: Vehicles have Defense, HP (Damage Threshold), and firepower
3. **Crew**: Vehicles support multiple crew members (pilot, gunner, engineer)
4. **Weapons**: Each vehicle has hardpoint weapons with ranges and damage
5. **Modifications**: Add upgrades to improve performance

### Q: How do I modify a vehicle?
**A:**

1. Open the vehicle sheet
2. Go to the **Modifications** tab
3. Click **+ Add Modification**
4. Select upgrade type:
   - Weapon improvements (scopes, frames)
   - Hull improvements (armor, shielding)
   - Engine improvements (speed, handling)
   - System upgrades (sensors, communications)
5. Modifications apply bonuses immediately

Each vehicle has modification slots based on size/type.

### Q: How does vehicle combat work?
**A:**

1. **Pilot Rolls**: Pilot rolls attack using pilot skill + vehicle weapon bonuses
2. **Vehicle Defense**: Target vehicle's defense is compared to attack roll
3. **Damage**: Successful hits deal damage to vehicle HP
4. **Crew Actions**: Multiple crew can act:
   - **Pilot**: Maneuvers, attacks
   - **Gunners**: Attack with specific hardpoints
   - **Engineer**: Repairs damage, manages power
5. **Maneuvers**: Pilots can take special maneuvers (evasive, aggressive, etc.)

### Q: What are Droids?
**A:** Droids are a special actor type with unique progression:

1. **Creation**: Create an actor and select **Droid type**
2. **Sophistication Levels**: D1-D5 (higher = more capable)
3. **Droid Systems**: Add systems for different functions:
   - Combat programming
   - Processors and memory
   - Sensors and scanners
   - Locomotion and chassis
   - Communications and interfaces
4. **Advancement**: Droids progress differently than characters (no experience leveling typically)

### Q: How do I add droid systems and upgrades?
**A:**

1. Open the droid's sheet
2. Go to the **Systems** tab
3. Click **+ Add System**
4. Select from available systems:
   - Combat subroutines
   - Processors (logic, memory)
   - Sensors (visual, thermal, life-scan)
   - Locomotion (wheels, legs, repulsor)
   - Communication modules
5. Each system can have upgrade slots for enhancements

---

## Houserules & Customization

### Q: What are Houserules?
**A:** Houserules let you customize game mechanics:

- **80+ configurable houserule settings** available
- **Categories**:
  - Character creation (ability score methods, point buy pools)
  - Hit points and death systems
  - Combat rules (criticals, diagonal movement, weapon ranges)
  - Force rules (training attribute, Block/Deflect, Dark Side)
  - Skill and feat variants
  - Condition track and recovery options
  - Grappling, flanking, and healing integration
  - Space combat initiative
  - And more!

### Q: How do I enable/disable Houserules?
**A:**

1. Go to **Settings > System Settings** (GM only)
2. Under "Houserules Configuration", toggle rules on/off
3. Changes apply immediately
4. Rules affect character sheets and mechanics automatically

### Q: Can I create custom Houserules?
**A:** The system includes 80+ pre-configured houserule settings covering most common variations. For additional custom rules not covered, code modification would be required. Contact the development team on GitHub for feature requests.

### Q: How do I change themes?
**A:**

1. Go to **Settings > Configure Settings**
2. Scroll to **Theme**
3. Select from built-in themes:
   - **Holo**: Clean sci-fi aesthetic
   - **High Contrast**: Dark mode with high visibility
   - **Starship**: Spaceship interior feel
   - **Sand People**: Desert theme
   - **Jedi**: Mystical Force theme
   - **High Republic**: Modern elegant theme
4. Theme applies immediately to all sheets

### Q: How do I customize colors or create a custom theme?
**A:** Custom theming requires CSS knowledge:

1. Navigate to `/css/themes/` in the system files
2. Create a new CSS file with your theme colors
3. Register it in the system manifest
4. Compile and reload

See **docs/Design.md** for technical details on theme creation.

---

## Troubleshooting

### Q: My character's defenses aren't calculating correctly!
**A:** Check these common issues:

1. **Armor isn't equipped**: Make sure armor is in Equipment tab (not in an inventory container)
2. **Ability scores**: Verify Constitution, Dexterity, Wisdom are correct
3. **Class bonus**: Check that your class is selected and correct level
4. **Active Effects**: Disable any conflicting bonuses temporarily
5. **Cache**: If still broken, refresh Foundry (F5) and reload the world

If still broken, file a bug report on GitHub with:
- Character sheet screenshot
- Your class, level, and abilities
- Expected vs. actual defense values

### Q: My character isn't getting the right number of Force Points!
**A:** Force Points are typically calculated as 5 + half your character level (varies by campaign settings):

- **Base**: 5 Force Points
- **Level bonus**: +1 per 2 character levels
- **Recovery**: Set by houserule (on level up, extended rest, or per session)

Check:
1. Your character level is correct
2. Check the **Force tab** for current/maximum display
3. Check houserule settings for Force Point recovery timing
4. The GM may have custom settings that affect Force Point calculations

### Q: Combat actions aren't available or are grayed out!
**A:** Action availability depends on:

1. **Action economy**: Do you have actions available this round?
   - Standard action (1/round)
   - Move action (1/round)
   - Swift actions (limited per round)
2. **Prerequisites**: Does the action require feats/training?
3. **Conditions**: Some conditions (stunned, paralyzed) prevent actions
4. **Range/Resources**: Do you have ammunition, Force Points, etc.?

Check the action's tooltip for why it's unavailable.

### Q: My talents/feats aren't giving bonuses!
**A:** Verify:

1. **Prerequisites**: Does your character meet all requirements?
2. **Level**: Are you the right level for this talent/feat?
3. **Active Effects**: Check that the talent has appropriate effects applied
4. **Multiple Classes**: If multi-classed, check which class provides the talent
5. **Compatibility**: Does the talent conflict with others?

Manually toggle the talent off and back on to refresh calculations.

### Q: Equipment bonuses aren't applying!
**A:**

1. **Equipped Status**: Make sure items are equipped (not just in inventory)
2. **Item Type**: Verify item is the correct type (armor, not equipment)
3. **Conflicts**: Check if another item has conflicting bonuses
4. **Active Effects**: The item may need an Active Effect added manually
5. **Reload**: Refresh the page and reload the world

Manually add Active Effects if bonuses don't apply automatically.

### Q: The UI is broken or not displaying correctly!
**A:** Try these fixes:

1. **Clear Cache**: Press F5 to fully refresh Foundry
2. **Browser Console**: Open browser dev tools (F12) and check for errors
3. **Disable Extensions**: Temporary disable browser extensions
4. **Try Another Browser**: Test in Firefox or Chrome
5. **Check Theme**: Switch to default theme to rule out theme issues
6. **Update Foundry**: Make sure you're on the latest Foundry version

If persists, file a bug report with:
- Screenshot of the issue
- Browser version and OS
- Console errors (screenshot of F12 console)

### Q: A NPC or vehicle isn't working properly!
**A:**

1. **Verify Type**: Check that actor is correct type (NPC, Vehicle, Droid)
2. **Abilities**: Ensure abilities are filled in (default to 10 if blank)
3. **Class/Species**: Add class and species for correct progression
4. **Items**: Add equipment/weapons from compendiums
5. **Test**: Create a new test NPC from compendium to compare

### Q: I'm getting macro/macro errors when using actions!
**A:**

1. **Console Errors**: Check browser console (F12) for specific errors
2. **Targeted**: Make sure you have a valid target selected for actions
3. **Permissions**: Verify you have GM/owner permissions on the actor
4. **Reload**: Refresh the world
5. **Disable Macros**: Temporarily disable macros and try again

Report errors with full console error message and reproduction steps.

### Q: My world won't load or keeps crashing!
**A:**

1. **Check Logs**: Look in Foundry's browser console for errors
2. **System Version**: Make sure you're on a compatible Foundry version (v11+)
3. **Reload**: Try reloading the world (not just refresh)
4. **Clear Temp Data**: Delete/rename the `Data/` folder backup and start fresh
5. **Check Compendiums**: Ensure all compendiums are not corrupted

If still broken, create an issue on GitHub with:
- Full error message from console
- Your Foundry version
- System version
- Steps to reproduce

### Q: How do I report a bug?
**A:** Report bugs on GitHub:

1. Go to: https://github.com/docflowGM/foundryvtt-swse/issues
2. Click **New Issue**
3. Select **Bug Report** template
4. Fill in:
   - Brief description of the bug
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots if helpful
   - Foundry version, system version, browser info
5. Submit

Detailed reports help us fix issues faster!

### Q: Where do I get technical support?
**A:** Support options:

1. **Documentation**: Check `/docs/` folder and this FAQ first
2. **GitHub Issues**: Report bugs on the GitHub repository
3. **GitHub Discussions**: Ask questions in the Discussions section
4. **Discord**: Join the Star Wars Saga Edition Discord (link in README)
5. **Community Forums**: Check Foundry's official forums

---

## Additional Resources

### Official Documentation
- **GETTING_STARTED.md** - Quick start guide
- **USER_GUIDE.md** - Complete how-to guide
- **FEATURES.md** - Full feature breakdown
- **docs/Design.md** - Technical architecture

### Compendium Packs (40+ packs)
- Classes, Talents, Feats, Species
- Skills, Languages, Backgrounds
- Force Powers, Secrets, Techniques
- Weapons (Pistols, Rifles, Heavy, Grenades, Exotic, Simple/Melee)
- Armor (Light, Medium, Heavy)
- Equipment (Communications, Tools, Survival, Medical, Tech, Security)
- Vehicles (Starships, Stations, Walkers, Speeders)
- Droids, NPCs
- Conditions, Combat Conditions, Attributes

### External Resources
- **Star Wars Saga Edition Official Website**: Official rules reference
- **Foundry VTT Documentation**: General Foundry help and features
- **Community Wikis**: Fan-created guides and house rule compilations

---

## Glossary

| Term | Definition |
|------|-----------|
| **BAB** | Base Attack Bonus - added to attack rolls |
| **Defense** | Fortitude, Reflex, or Will defense scores |
| **Feat** | One-time character ability or bonus |
| **Force Points** | Resource for using Force powers |
| **HP** | Hit Points - character health |
| **Initiative** | Turn order in combat (1d20 + DEX) |
| **Modifier** | Bonus/penalty from ability score (ability - 10) / 2 |
| **NPC** | Non-Player Character controlled by GM |
| **Talent** | Class-specific ability selected from talent tree |
| **Threshold** | HP bracket determining wound status |
| **Vehicle** | Starship, speeder, walker, or station |

---

## Quick Reference: Common Actions

### Character Creation
1. Create actor → Choose species → Choose class → Roll abilities → Pick feats/talents → Add background → Done!

### Starting Combat
1. Click **Combat** in sidebar → **Start Combat** → Combatants roll initiative automatically

### Attack Sequence
1. **Your Turn**: Click your name in combat tracker
2. **Attack**: Click weapon → Click target → Roll appears (accept or modify) → Roll compares to defense
3. **Damage**: Click Damage → Roll appears → Apply damage to target

### Use Force Power
1. Go to **Force tab**
2. Find power you know
3. Click power name
4. Power effect applies automatically (or roll if needed)
5. Spend Force Points if required

### Add Condition/Buff
1. Go to **Active Effects** tab
2. Click **+ Create Active Effect**
3. Set duration and effect values
4. Effect applies immediately

---

## Version Information

- **System Version**: 1.2.0
- **Foundry Compatibility**: v11-13 (v12 recommended)
- **Last Updated**: January 2026
- **License**: MIT

For the latest updates and documentation, visit: **https://github.com/docflowGM/foundryvtt-swse**

---

**Have more questions?** Check the full documentation files or report issues on GitHub. May the Force be with you!
