# SWSE System Features

Complete reference for all features available in the Star Wars Saga Edition (SWSE) FoundryVTT system.

## Character Management Features

### Character Generation Wizard
- **7-Step Process**: Species → Background → Attributes → Class → Skills → Feats → Talents
- **Ability Generation Methods** (6 options):
  - 4d6 Drop Lowest (standard)
  - Point Buy (with customizable pools)
  - Standard Array (3d6, 2d6+6, 24-point organic)
- **Class Preview**: Hover tooltips showing class details
- **Multi-Level Support**: Create characters at any starting level
- **Narrative Chargen**: Story-based character creation option
- **Free Build**: Skip wizard for custom character creation

### Character Progression
- **Experience Tracking**: Track XP and automatic level-ups
- **Hit Dice Rolling**: Roll or take average for HP at each level
- **Ability Score Increases**: Automatic +2 to ability scores every 4 levels
- **Feature Granting**: Automatic class feature grants at each level
- **Skill Point Allocation**: Point-based skill training system
- **Feat/Talent Selection**: UI for picking new abilities
- **Level-Up Notifications**: Clear confirmation of new features

### Multi-Classing
- **Multiple Classes**: Add additional classes to character
- **Feature Stacking**: Class features combine appropriately
- **Defense Calculations**: Correct multiclass defense stacking
- **BAB Progression**: Accurate Base Attack Bonus from multiple classes
- **Hit Points**: Correct HP progression from multiple hit dice
- **Class-Specific Talents**: Talents available based on all classes

### Character Templates
- **Pre-Built Templates**: Quick character creation from templates
- **Custom Templates**: Save your own character templates
- **NPC Templates**: Non-heroic unit templates for minions
- **Clone Characters**: Duplicate existing characters
- **Template Sharing**: Save and import templates

## Combat Features

### Initiative & Action
- **Initiative Calculation**: 1d20 + DEX modifier + bonuses
- **Initiative Bonus Tracking**: Feats and items that improve initiative
- **Round Tracking**: Automatic round counter
- **Turn Order Management**: Drag-to-reorder combatants
- **Combat Status**: Visual indicators for active combatants

### Attack System
- **Attack Rolls**: 1d20 + BAB + modifiers
- **Multiple Attack Penalties**: Automatic -5 for second attack
- **Weapon Selection**: Automatic bonuses from equipped weapons
- **Attack Bonuses**: Feats, abilities, and effects
- **Crit System**: Automatic crit detection and handling
- **Ranged vs. Melee**: Different range categories and penalties

### Damage System
- **Damage Application**: Automatic HP reduction
- **Damage Types**: Different weapon damage types tracked
- **Damage Thresholds**: Vehicle and building damage thresholds
- **Overflow Damage**: Optional threshold-based damage
- **Temporary Hit Points**: Track temp HP separately
- **Damage Logs**: History of damage applications
- **Healing Application**: Restore HP with automatic tracking

### Grappling Mechanics
- **Grab → Grabbed → Grappled → Pinned States**: Full state progression
- **Grapple Checks**: Opposed checks with modifiers
- **Benefits & Penalties**: Each state has specific effects
- **Escape Mechanics**: Options to escape from grapple states
- **Grapple Management**: Track grapple state on character sheet
- **Multiple Grapples**: Support for multiple simultaneous grapples

### Defenses
- **Three Defense Types**: Fortitude, Reflex, Will
- **Automatic Calculation**: Defense bonuses from:
  - Ability modifiers
  - Class bonuses
  - Armor bonuses
  - Feat bonuses
  - Active effects
- **Multi-Class Stacking**: Correct application across classes
- **Defense History**: Track defense values over time
- **Defense Modifications**: Temporary effects on defenses

### Active Effects & Conditions
- **Buffs & Debuffs**: Apply temporary effect modifiers
- **Condition Tracking**: Status conditions (Blinded, Dazed, Helpless, etc.)
- **Effect Duration**: Automatic effect expiration
- **Conditional Effects**: Effects that only apply under certain conditions
- **Effect Stacking**: Multiple effects combine correctly
- **Visual Indicators**: Clear effect badges on tokens and sheets

### Vehicle Combat
- **Vehicle Hit Points**: Separate HP tracking for vehicles
- **Vehicle Defenses**: AC-based defense system
- **Pilot Actions**: Special actions only available in vehicles
- **Passenger Management**: Track crew and passengers
- **Vehicle Conditions**: Damage conditions specific to vehicles
- **Modification Effects**: Upgrades affect combat stats

## Skills & Abilities

### Skills System
- **100+ Skills**: Comprehensive skill list
- **Training Tracking**: Trained vs. untrained skills
- **Skill Bonuses**: Automatic modifiers from:
  - Ability modifiers
  - Training bonuses
  - Feat bonuses
  - Active effects
  - Equipment effects
- **Skill Actions**: Contextual skill usage
- **Skill Substitution**: Use one skill for another in specific situations
- **Skill Difficulty Class (DC)**: Track DC for skill checks

### Ability Scores
- **6 Core Abilities**: STR, DEX, CON, INT, WIS, CHA
- **Ability Modifiers**: Automatic calculation (-5 to +5 typical)
- **Ability Increases**: Every 4 levels with customizable amounts
- **Species Bonuses**: Automatic ability adjustments from species
- **Temporary Modifiers**: Track temporary ability changes
- **Point Buy System**: Configure point pool for ability creation

### Feats
- **150+ Feats**: Comprehensive feat library
- **Feat Prerequisites**: Complex prerequisite checking
- **Feat Actions**: Buttons for feat abilities directly on sheet
- **Feat Benefits**: Bonuses and modifications from feats
- **Bonus Feats**: Automatic feat grants at specific levels
- **Human Bonus Feat**: Extra feat at 1st level for humans
- **Feat Chains**: Prerequisites for advanced feats

## Force & Powers

### Force Sensitivity
- **Force Sensitive Status**: Track if character is Force-sensitive
- **Force Training Feats**: Grant access to Force powers
- **Force Suit Calculation**: Auto-calculate available power slots
- **Force Attribute**: Configurable Force Training attribute (CHA or WIS)

### Force Points
- **Point Tracking**: Track current/maximum Force Points
- **Force Point Spending**: Deduct points when powers are used
- **Regeneration System**: Automatic Force Point regeneration
- **Point History**: Log of Force Point usage
- **Dark Side Score**: Track temptation to Dark Side

### Force Powers
- **30+ Force Powers**: Comprehensive power library
- **Power Levels**: Powers range from basic to advanced
- **Power Effects**: Automatic effects from power usage
- **Power Prerequisites**: Requirements for learning powers
- **Power Suites**: Automatic suite calculation based on training
- **Power Picker Dialog**: Select from available powers
- **Power History**: Track which powers have been used

### Force Techniques & Secrets
- **Force Techniques**: Advanced techniques for trained users
- **Force Secrets**: Special abilities for Force users
- **Lightsaber Forms**: Form-specific powers and bonuses
- **Form Progression**: Automatic form bonuses at higher levels
- **Power Synergies**: Powers that work together for enhanced effects

### Dark Side Mechanics
- **Dark Side Score**: Track alignment to Dark Side
- **Dark Side Temptations**: Mechanics for using Dark Side
- **Redemption Path**: Ways to reduce Dark Side Score
- **Consequences**: Potential consequences of Dark Side usage

## Talents & Advancement

### Talent Trees
- **Visual Tree Display**: Interactive talent tree visualization
- **20+ Talent Trees**: One for each class
- **200+ Talents**: Comprehensive talent options
- **Tree Navigation**: Scroll and zoom in talent trees
- **Prerequisite Checking**: Visual indication of available talents
- **Talent Selection**: Click to select talents from tree

### Talent Prerequisites
- **Complex Requirements**: Multi-level prerequisite chains
- **Prerequisite Validation**: Automatic checking of requirements
- **Visual Feedback**: Clear indication of available vs. locked talents
- **Prerequisite Display**: Hover to see why talent is locked
- **Class-Specific Talents**: Different trees for different classes

### Talent Effects
- **Automatic Bonuses**: Talents grant ability bonuses
- **Feature Grants**: Talents grant special features
- **Action Grants**: Talents enable new actions
- **Passive Abilities**: Always-on talent benefits
- **Talent Chains**: Talents that build on each other

### Starting Features
- **Class Features**: Automatic grants at 1st level
- **Level-Based Features**: Features granted at specific levels
- **Milestone Features**: Features at level milestones (5, 10, 15, 20)
- **Feature History**: Track which features have been granted
- **Feature Details**: Description of each feature

## Equipment & Items

### Weapons
- **50+ Weapons**: Complete weapon library
- **Weapon Categories**: Melee, ranged, exotic weapons
- **Damage Types**: Energy, kinetic, and unique damage
- **Weapon Properties**: Critical range, special features
- **Weapon Proficiency**: Proficiency bonuses
- **Weapon Upgrades**: Add modifications to weapons

### Armor
- **50+ Armor Pieces**: Light, medium, heavy armor
- **Armor Bonuses**: AC improvements from armor
- **Reflex Penalties**: DEX limitations from heavier armor
- **Armor Mastery**: Training bonuses for specific armor types
- **Armor Upgrades**: Add modifications to armor pieces
- **Special Armor**: Unique armor with special properties

### Equipment
- **100+ Equipment Items**: Tools, accessories, gadgets
- **Equipment Categories**: Organized by type
- **Equipment Effects**: Bonuses from equipped items
- **Weight Tracking**: Encumbrance calculations
- **Cost Tracking**: Item costs for shopping systems

### Equipment Upgrades
- **Upgrade Slots**: Customizable upgrade capacity
- **Upgrade Types**: Various modification categories
- **Equipment Modifications**: Add bonuses to equipment
- **Upgrade Restrictions**: Some upgrades only fit certain items
- **Stacking Restrictions**: Prevent incompatible upgrades
- **Upgrade Costs**: Track upgrade expenses

### Inventory Management
- **Drag-and-Drop**: Add items from compendiums
- **Item Quantity**: Track item quantities
- **Currency System**: Gold, credits, or custom currency
- **Encumbrance Calculation**: Track carrying capacity
- **Weight Tracking**: Item weights and totals
- **Item Organization**: Sort and filter inventory

## Species & Character Options

### Playable Species
- **20+ Species**: Humans, Twi'leks, Wookiees, Zabraks, and more
- **Species Bonuses**: Automatic ability score adjustments
- **Species Traits**: Special abilities and characteristics
- **Species Languages**: Automatic language selection
- **Species Favored Classes**: Recommended class choices
- **Size Categories**: Different sizes affect rules

### Species Abilities
- **Racial Bonuses**: +2 to specific abilities
- **Racial Traits**: Special features from species
- **Darkvision**: Low-light or darkvision from some species
- **Ability Adjustments**: Permanent ability modifications
- **Starting Skills**: Bonus skill points from species
- **Bonus Feat**: Some species grant bonus feats

### Backgrounds
- **Background Selection**: Choose character background
- **Background Benefits**: Skill bonuses from background
- **Background Features**: Special abilities or contacts
- **Background Story**: Narrative options for character origin
- **Background Advancement**: Some backgrounds unlock features

## Droid System

### Droid Actor Type
- **Specialized Droid Sheets**: Different from character sheets
- **Droid Degrees**: D1-D5 sophistication levels
- **Droid Hit Points**: Separate damage calculation
- **Droid Defenses**: Modified defense calculations

### Droid Systems
- **30+ System Components**: Combat programming, processors, sensors, etc.
- **System Installation**: Add/remove systems on droids
- **System Effects**: Bonuses from droid systems
- **System Costs**: Point costs for droid creation
- **System Specialization**: Focus on specific droid roles

### Droid Progression
- **Droid Points**: Alternative to experience for droid advancement
- **Skill Programming**: Skills for droids instead of training
- **System Upgrades**: Add new systems as droid advances
- **Customization**: Extensive droid customization options
- **Droid Templates**: Pre-built droid templates

## Vehicle System

### Vehicle Actor Type
- **Vehicle Sheets**: Full vehicle statistics and upgrades
- **Vehicle Stats**: Size, speed, maneuverability, defenses
- **Vehicle Hit Points**: Damage tracking for vehicles
- **Vehicle Conditions**: Damage conditions (crippled, disabled, etc.)

### Vehicle Combat
- **Initiative for Vehicles**: Pilot-dependent initiative
- **Vehicle Actions**: Special actions only available in vehicles
- **Pilot Skills**: Pilot skill for vehicle control
- **Passenger Management**: Track crew and passengers
- **Vehicle Weapons**: Weapons mounted on vehicles

### Vehicle Modifications
- **Modification System**: Add upgrades to vehicles
- **Upgrade Slots**: Limited upgrade capacity
- **Modification Effects**: Bonuses from modifications
- **Modification Costs**: Track modification expenses
- **Modification Compatibility**: Ensure compatible modifications

### Vehicle Types
- **20+ Vehicle Types**: Speeders, starfighters, capital ships
- **Vehicle Size Categories**: Small, medium, large, colossal
- **Specialized Vehicles**: Different vehicles have unique features
- **Vehicle Customization**: Modify vehicles for specific purposes

## User Interface Features

### Character Sheet
- **Tabbed Interface**: Summary, Skills, Feats, Talents, Force, Equipment
- **Scrollable Panels**: Smooth scrolling with position restoration
- **Responsive Design**: Adapts to different screen sizes
- **Real-Time Calculations**: Auto-updating defenses and bonuses
- **Inline Actions**: Direct buttons for common actions
- **Quick Reference**: Key stats always visible
- **Color Coding**: Visual organization and clarity

### Applications & Dialogs

#### Character Generator
- **Multi-Step Wizard**: 7-step process for character creation
- **Progress Tracking**: Visual progress indicator
- **Ability Rolling**: 6 different generation methods
- **Class Selection**: With full feature preview
- **Skill Training**: Point-based skill selection
- **Feat Selection**: Browse and select feats
- **Talent Selection**: Visual talent tree selection
- **Character Review**: Preview before finalizing

#### Level-Up Dialog
- **Step-by-Step Process**: One feature at a time
- **HP Rolling**: Roll or take average
- **Feature Notifications**: Clear new feature descriptions
- **Skill Point Application**: Distribute skill points
- **Feat/Talent Selection**: Choose new abilities
- **Ability Increase**: Apply ASI if applicable
- **Confirmation**: Review and finalize level-up

#### Talent Tree Visualizer
- **Visual Display**: Interactive graph of talent tree
- **Prerequisite Visualization**: See locked vs. available talents
- **Tree Navigation**: Zoom and pan the tree
- **Talent Selection**: Click to select talents
- **Description Tooltips**: Hover to see talent details
- **Class-Specific Trees**: Different trees per class
- **Search Functionality**: Find specific talents

#### Combat Action Browser
- **Action Listing**: Browse all available combat actions
- **Filter Options**: Filter by type, action cost, etc.
- **Action Details**: Full description of each action
- **Quick Actions**: Direct buttons to perform actions
- **Sorting Options**: Sort by type, name, or effectiveness
- **Search**: Find specific combat actions

#### Force Power Picker
- **Power Selection**: Choose from available powers
- **Power Details**: Full power descriptions and effects
- **Suite Calculation**: Shows available power slots
- **Power Usage**: Track power use and regeneration
- **Power History**: Log of used powers
- **Power Filters**: Filter by level, type, or effect

#### Vehicle Modification Manager
- **Modification Selection**: Browse available modifications
- **Installation UI**: Add modifications to vehicles
- **Slot Management**: Track available slots
- **Modification Details**: Cost and effect information
- **Compatibility Checking**: Prevent incompatible mods
- **Vehicle Preview**: See modified vehicle stats

#### Follower Creator
- **Quick Creation**: Create companion characters
- **Template Selection**: Choose from follower templates
- **Stat Configuration**: Set follower statistics
- **Follower Management**: Track and level followers
- **Auto-Leveling**: Level followers with party
- **Stat Inheritance**: Copy stats from templates

### Settings & Configuration

#### System Settings
- **Ability Score Method**: Choose generation preference
- **Point Buy Pools**: Configure pools for different character types
- **Force Training Attribute**: Charisma or Wisdom
- **Default Theme**: Select system theme

#### Houserule Options
- **Grappling Rules**: Toggle different grappling variants
- **Healing Systems**: Enable/disable custom healing
- **Condition Track**: Alternative health tracking
- **Flanking Bonuses**: Tactical bonuses system
- **Skill Training Variants**: Different advancement options
- **Status Effects**: Visual buff/debuff system
- **Preset Configurations**: Save/load rule combinations

#### Theme System
- **Built-in Themes** (6 total):
  - Holo (futuristic blue)
  - High Contrast (bold colors)
  - Starship (neutral grays)
  - Sand People (desert tones)
  - Jedi (temple colors)
  - High Republic (modern)
- **Custom Theme Creation**: Create your own themes
- **Per-User Themes**: Different users can have different themes

## NPC & Game Master Features

### NPC Browser
- **NPC Listing**: Browse pre-made NPCs
- **NPC Templates**: Various NPC templates
- **Quick Creation**: Create NPCs from templates
- **NPC Customization**: Modify NPCs for your campaign

### Template Creator
- **Template Building**: Create custom templates
- **Template Saving**: Save frequently-used templates
- **Template Sharing**: Import/export templates
- **Quick Access**: Use saved templates for quick creation

### Mentor Guidance System
- **Mentor NPCs**: Create mentor characters
- **Story-Driven Interactions**: Narrative-based mentor systems
- **Guidance Options**: Different mentor approaches
- **Relationship Tracking**: Track mentor relationship

### Follower Management
- **Follower List**: Track party followers
- **Follower Leveling**: Auto-level followers with party
- **Stat Inheritance**: Followers can inherit stats from templates
- **Follower Removal**: Remove followers from party

### World Data Loader
- **Populate World**: Load default system content
- **Compendium Import**: Quick import from packs
- **Bulk Creation**: Create multiple items at once
- **Content Organization**: Organize created content

## Chat & Macros

### Roll System
- **Unified Rolling**: One system for all rolls
- **Formatted Results**: Clear, easy-to-read roll results
- **Roll History**: See previous rolls in chat
- **Roll Modifiers**: Easy modifier application
- **Custom Dice**: Support for custom dice expressions

### Chat Integration
- **Roll Messages**: Formatted dice rolls with results
- **Damage Reporting**: Clear damage application messages
- **Combat Actions**: Chat-triggered actions
- **Skill Rolls**: Display skill roll results
- **Attack Rolls**: Show attack roll results

### Macro Support
- **Macro Creation**: Create custom macros
- **Macro Execution**: Run macros with one click
- **Macro Hotbars**: Organize macros on hotbars
- **Script Macros**: JavaScript macros for advanced users
- **Macro Sharing**: Share macros with other users

## Compendium Content

### Available Packs (27 total)
- **Classes** (50+): All SWSE classes with progressions
- **Talents** (200+): Organized by class
- **Talent Trees** (20+): Visual trees for each class
- **Feats** (150+): Comprehensive feat library
- **Species** (20+): Playable species with bonuses
- **Force Powers** (30+): Complete Force power list
- **Force Techniques**: Advanced techniques
- **Force Secrets**: Special abilities
- **Lightsaber Form Powers**: Form-specific abilities
- **Skills**: Skill reference items
- **Languages**: Language selection items
- **Backgrounds**: Character backgrounds
- **Conditions**: Combat conditions
- **Special Conditions**: Unique condition types
- **Weapons** (50+): Complete weapon library
- **Armor** (50+): Armor and clothing
- **Equipment** (100+): Tools, gadgets, accessories
- **Vehicles** (20+): Starfighters, speeders, etc.
- **Droids**: Droid templates and examples
- **NPCs**: Pre-built non-player characters
- **Upgrades**: Equipment modifications
- **Droid Systems** (30+): System components
- **Additional**: Miscellaneous items

### Compendium Features
- **Drag-and-Drop**: Add items directly to character sheets
- **Search**: Find items quickly
- **Filtering**: Filter by type or category
- **Import**: Import items to world
- **Favorite**: Mark frequently-used items

## Accessibility Features

### Visual Accessibility
- **Color Blindness Support**: Configurable color schemes
- **High Contrast Mode**: Available theme option
- **Font Size Options**: Adjustable text size
- **Clear Labels**: Descriptive button labels
- **Icon + Text**: Buttons have both icons and text

### Input Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Tab Navigation**: Proper tab ordering
- **Hotkeys**: Configurable keyboard shortcuts
- **Mouse Support**: Full mouse functionality
- **Touch Support**: Touch-friendly interface (on compatible devices)

### Reading Accessibility
- **Semantic HTML**: Proper document structure
- **ARIA Labels**: Screen reader support
- **Descriptions**: Clear descriptions for all features
- **Tooltips**: Hover tooltips for additional info
- **Help Text**: In-context help and guidance

## Integration Features

### Foundry Integration
- **Foundry Hooks**: Proper hook implementation
- **Actor/Item System**: Full data model integration
- **Permission System**: Respects Foundry permissions
- **Socket Support**: Real-time updates across users
- **Token Integration**: Token controls from sheet

### Module Compatibility
- **Effect Modules**: Compatible with effect systems
- **Portrait Modules**: Works with portrait packs
- **Dice Modules**: Compatible with dice parsers
- **Chat Modules**: Works with chat enhancements
- **UI Modules**: Compatible with UI improvements

### Content Creation
- **Homebrew System**: Create custom content
- **JSON Export**: Export data for backup
- **Import System**: Import custom content
- **Compendium Creation**: Create custom packs
- **Content Sharing**: Share content with other users

## Houserule Systems (18 Available)

- Grappling mechanics variants
- Healing system customization
- Condition tracking alternatives
- Flanking bonus systems
- Skill training variants
- Status effect management
- Recovery mechanics
- Talent interaction rules
- Feat modifications
- Combat variant rules
- Movement rules
- Range modifications
- Cover modifications
- Equipment modifications
- Damage variations
- Special conditions
- Prestige class rules
- Custom progression options

---

See [USER_GUIDE.md](./USER_GUIDE.md) for detailed how-to instructions for each feature.
