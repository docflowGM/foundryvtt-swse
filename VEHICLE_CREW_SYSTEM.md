# Vehicle Crew Position System

## Overview

The Vehicle Crew Position System provides intelligent management of crew assignments on starships and vehicles, with automatic skill calculation, starship maneuver display, and crew action management.

## Features

### 1. Position-Based Skills

Each crew position requires and benefits from specific skills:

**Pilot**
- Required: Pilot skill
- Beneficial: Use the Force (if Force Sensitive)

**Copilot**
- Required: Pilot skill
- Beneficial: None

**Gunner**
- Required: Mechanics, Use Computer
- Beneficial: None

**Shield Operator**
- Required: Use Computer, Mechanics
- Beneficial: None

**Engineer**
- Required: Use Computer, Mechanics
- Beneficial: None

**Commander**
- Required: None
- Beneficial: Knowledge (Tactics), Perception

### 2. Skill Display

When a crew member is assigned to a position:
- All available skills for that position are displayed
- Skill bonuses are calculated including:
  - Ability modifiers
  - Trained skill bonus (+5)
  - Miscellaneous modifiers
- Color-coded indicators show:
  - Required skills (cyan border)
  - Beneficial skills (blue border)
  - Trained status (green badge)

### 3. Starship Maneuvers

If the pilot has the "Starship Tactics" feat:
- All available maneuvers are displayed in an expandable list
- Maneuvers are organized by type (Attack Patterns, Dogfighting, Force, Gunner, General)
- 27 total maneuvers available

### 4. Pilot Solo Mode

When the pilot is the only crew member assigned:
- A "Solo Pilot" badge appears on the crew section
- Pilot can perform all crew actions (gunner, engineer, shield operator)
- This is useful for small ships with minimal crew requirements

### 5. Crew Actions

Each crew position has specific actions available in combat:

**Pilot Actions**
- Move Vehicle (Move)
- All-Out Movement (Full-Round)
- Full Attack (Full-Round)
- Ram (Standard)
- Attack with Ranged Weapon (Standard)
- Attack with Vehicle Weapon (Standard)
- Attack Run (Full-Round)
- Dogfight (Standard)
- Fly Defensively (Standard)
- Starship Deception (Standard)
- Aim (Swift)
- Full Stop (Swift)
- Increase Vehicle Speed (Swift)
- Avoid Collision (Reaction)

**Copilot Actions**
- Full Attack (Full-Round)
- Aid Another (Standard)
- Attack with Ranged Weapon (Standard)
- Attack with Vehicle Weapon (Standard)
- Aim (Swift)

**Gunner Actions**
- Full Attack (Full-Round)
- Aid Another (Standard)
- Attack with Ranged Weapon (Standard)
- Attack with Vehicle Weapon (Standard)
- Aim (Swift)

**Engineer Actions**
- Standard: Aid Another, Attack Melee/Ranged
- Swift: Regulate Power

**Shield Operator Actions**
- Standard: Aid Another, Attack Melee/Ranged, Intercept Communications, Use Sensors
- Move: Search Starship
- Swift: Raise/Lower Shields, Recharge Shields, Use Communications
- Reaction: Avoid Surprise, Search Starship

**Commander Actions**
- Standard: Aid Another, Attack Melee/Ranged, Intercept Communications

### 6. Automatic Calculations

When crew positions are updated:
- Vehicle Reflex Defense automatically recalculates if "Use Pilot Level" is enabled
- Pilot's level/hero level is used in the calculation
- All other vehicle defenses and damage threshold recalculate

## Usage

### Assigning Crew

1. Open the vehicle sheet
2. Drag a character actor onto a crew position slot
3. The character's name appears in the slot
4. Available skills for that position are automatically displayed

### Removing Crew

1. Click the X button next to the crew member's name
2. Confirm the removal in the dialog
3. The position returns to "Empty" state

### Viewing Skills

1. Skills for the position are displayed below the crew assignment
2. Green "T" badge indicates trained skills
3. Red "*" badge indicates required skills
4. Skill bonuses show with color coding (green for positive, red for negative)

### Viewing Maneuvers (Pilot Only)

1. If pilot has "Starship Tactics" feat, click "Maneuvers" button
2. List expands to show all available maneuvers
3. Click again to collapse

### Viewing Actions

1. Click "Actions" button for any assigned crew position
2. Panel expands to show position-specific combat actions
3. Click skill check buttons to roll for actions

## Technical Implementation

### Files

- `scripts/actors/vehicle/vehicle-crew-positions.js` - Core crew position system
- `scripts/actors/vehicle/swse-vehicle.js` - Vehicle sheet controller
- `templates/actors/vehicle/vehicle-sheet.hbs` - Vehicle sheet template
- `styles/sheets/vehicle-sheet.css` - Vehicle sheet styling

### Key Classes

**VehicleCrewPositions**
- Static utility class for crew position management
- Methods:
  - `getAvailableSkillsForPosition()` - Get skills for a position
  - `getCrewManeuvers()` - Get starship maneuvers for pilot
  - `buildCrewRoster()` - Build crew roster with position info
  - `getPilotSoloMode()` - Check if pilot is flying solo

### Integration Points

- ActorEngine automatically calls prepareDerivedData() on updates
- Vehicle calculations in vehicle-data-model.js handle crew-dependent stats
- CombatActionsMapper provides position-specific combat actions
- StarshipManeuversEngine provides maneuver data

## Future Enhancements

- [ ] Multi-position assignments (character in multiple roles)
- [ ] Crew quality bonuses (untrained, normal, skilled, expert, ace)
- [ ] Crew-dependent weapon system bonuses
- [ ] Position-specific feat enhancements
- [ ] Tactical information panels
