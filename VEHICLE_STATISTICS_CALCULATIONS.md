# SWSE Vehicle Statistics - Calculations and Implementation

This document outlines all vehicle statistics per Star Wars Saga Edition rules and their implementation status in the SWSE system.

## Core Statistics

### Initiative
**Formula**: Pilot's Initiative modifier + Vehicle's size modifier + Vehicle's Dexterity modifier
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:908`
**Notes**:
- Uses Pilot's Initiative skill total as modifier
- If pilot is flat-footed, loses their Dex bonus to initiative
- If vehicle is out of control, loses vehicle Dex bonus
- If vehicle is disabled, treats vehicle Dex as 0 (-5 penalty)

### Perception
**Formula**: Best crew member's Perception modifier
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:808`
**Notes**: Calculates from crew member with highest Perception skill modifier

### Size Modifier
**Formula**: Vehicle Size Category
**Status**: ✅ IMPLEMENTED
**Current Values**:
- Large: -1
- Huge: -2
- Gargantuan: -5
- Colossal: -10
- Colossal (Frigate): -10
- Colossal (Cruiser): -10
- Colossal (Station): -10

## Defenses

### Reflex Defense
**Formula**: 10 + size modifier + (armor bonus OR Pilot's Heroic Level) + Dexterity bonus
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:637`
**Notes**:
- Uses `usePilotLevel` flag to choose between armor bonus and pilot's heroic level
- Loses Dex bonus if pilot is flat-footed, vehicle is out of control, or attacked by undetected opponent
- Treated as Dex 0 (-5) if vehicle is at full stop, disabled, or powered down

### Fortitude Defense
**Formula**: 10 + Strength modifier
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:645`
**Notes**: Based on vehicle's Strength attribute

### Damage Threshold
**Formula**: Fortitude Defense + Size-specific damage modifier
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:650`
**Size Modifiers**:
- Large: +5
- Huge: +10
- Gargantuan: +20
- Colossal: +50
- Colossal (Frigate): +100
- Colossal (Cruiser): +200
- Colossal (Station): +500

## Attack and Damage

### Attack Rolls
**Formula**: Gunner's Base Attack Bonus + Vehicle's Intelligence modifier + miscellaneous bonuses + 2 (if Trained in Pilot and firing pilot-controlled weapons)
**Status**: ⚠️ NEEDS IMPLEMENTATION
**Notes**:
- Base Attack Bonus comes from gunner crew member
- Intelligence modifier represents the quality of the ship's computer
- +2 bonus only applies when pilot is trained in Pilot skill AND firing pilot-controlled weapons

### Base Attack Bonus
**Formula**: Gunner's Base Attack Bonus
**Status**: ⚠️ NEEDS IMPLEMENTATION
**Notes**: Pulled from gunner crew member's character sheet

### Grapple Modifier
**Formula**: Pilot's Base Attack Bonus + Vehicle's Strength modifier + Vehicle's Size Modifier
**Status**: ⚠️ NEEDS IMPLEMENTATION
**Size Modifiers for Grapple**:
- Large: +5
- Huge: +10
- Gargantuan: +15
- Colossal: +20
- Colossal (Frigate): +25
- Colossal (Cruiser): +30
- Colossal (Station): +35

### Weapon Damage
**Formula**: (Weapon Damage + 1/2 Pilot's Heroic Level + Miscellaneous Modifiers) x Damage Multiplier
**Status**: ⚠️ PARTIALLY IMPLEMENTED
**Notes**:
- Damage multiplier applies after rolling and adding bonuses
- Pilot's heroic level contribution: divide by 2 and round down

### Weapon Range Modifiers
**Status**: ✅ IMPLEMENTED (in combat calculations)
**Modifiers**:
- Point-Blank: 0
- Short: -2
- Medium: -5
- Long: -10

## Movement and Performance

### Speed
**Formula**: Defined by vehicle design
**Status**: ✅ IMPLEMENTED
**Notes**: Listed in squares for Character Scale

### Maximum Velocity
**Formula**: Maximum speed after using All-Out Movement for at least one full round
**Status**: ✅ TRACKED (field exists)
**Notes**: Seldom relevant in combat as movement is too fast

### Movement Actions
**Status**: ✅ IMPLEMENTED
**Standard Movement**: Up to vehicle's Speed as a Move Action
**All-Out Movement**: Up to 4x vehicle's Speed as a Full-Round Action

## Crew and Combat

### Reflex Defense with Pilot Solo Mode
**Status**: ✅ IMPLEMENTED
**Notes**: When pilot is only crew member, they can perform all crew actions

### Skills (Position-Based)
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/actors/vehicle/vehicle-crew-positions.js`
**Calculation**:
- Ability modifier + trained bonus (+5 if trained) + miscellaneous modifiers
- Vehicle size modifier and dexterity modifier added to Initiative and Pilot checks

## Special Vehicle Statistics

### Challenge Level (CL)
**Formula**: Varies by vehicle design
**Status**: ⚠️ NEEDS FIELD
**Notes**: Used to determine XP awards when vehicle is disabled/destroyed

### Armor Bonus
**Status**: ✅ IMPLEMENTED
**Notes**: Used for Reflex Defense unless using Pilot's Heroic Level

### Dexterity Modifier
**Formula**: (Dexterity Score - 10) / 2, rounded down
**Status**: ✅ IMPLEMENTED
**Location**: Vehicle attributes system

### Strength Modifier
**Formula**: (Strength Score - 10) / 2, rounded down
**Status**: ✅ IMPLEMENTED
**Location**: Vehicle attributes system

### Intelligence Modifier
**Formula**: (Intelligence Score - 10) / 2, rounded down
**Status**: ✅ IMPLEMENTED
**Location**: Vehicle attributes system

### Grapple Defense
**Formula**: Reflex Defense (opposing grapple checks)
**Status**: ✅ IMPLEMENTED
**Notes**: Vehicles can be restrained (usually via Tractor Beam)

## Vehicle Condition Track

### Condition Track Penalties
**Status**: ✅ IMPLEMENTED
**Location**: `scripts/data-models/vehicle-data-model.js:652-657`
**Penalties by Step**:
- Step 0 (Functional): 0
- Step 1 (Minor Damage): -1
- Step 2 (Moderate Damage): -2
- Step 3 (Critical Damage): -5
- Step 4 (Disabled/Broken): -10
- Step 5 (Destroyed): Disabled

## Coverage and Protection

### Cover (Crew Protection)
**Status**: ⚠️ NEEDS FIELD
**Types**: None, Normal Cover (+5), Improved Cover (+10), Total Cover
**Notes**: Bonus to Reflex Defense for passengers against attacks targeting them instead of vehicle

## Operational Statistics

### Hyperdrive Multiplier
**Status**: ⚠️ NEEDS FIELD
**Notes**: Used for Astrogation calculations; not used in Character Scale
**Notes**: If backup hyperdrive exists, list both multipliers

### Cargo Capacity
**Status**: ⚠️ NEEDS FIELD
**Notes**: Amount of cargo vehicle can carry

### Passengers
**Status**: ⚠️ NEEDS FIELD
**Notes**: Number of passengers in addition to crew

### Carried Craft
**Status**: ✅ TRACKED (field exists)
**Notes**: Other vehicles carried aboard

### Payload
**Status**: ⚠️ NEEDS FIELD
**Notes**: Grenades, Rockets, Missiles, Torpedoes complement

### Availability
**Status**: ⚠️ NEEDS FIELD
**Notes**: Restricted Item or standard

### Crew Quality
**Status**: ✅ IMPLEMENTED
**Notes**: Crew modifiers already included in all other statistics

## Implementation Priority

### HIGH PRIORITY (Core Combat)
1. Attack Rolls calculation
2. Base Attack Bonus from gunner
3. Grapple modifier calculation
4. Initiative calculation
5. Pilot's heroic level bonus to damage

### MEDIUM PRIORITY (Information)
1. Challenge Level field
2. Cover field
3. Perception from best crew member
4. Cargo Capacity field
5. Passengers field
6. Hyperdrive multiplier field

### LOW PRIORITY (Reference)
1. Availability field
2. Payload field (complement system)
3. Carried craft details

## Drag-Drop Template Application

When a vehicle template is drag-dropped onto a vehicle actor, the following stats should be ported over:
- Name
- Size
- Armor Bonus
- Strength/Dexterity/Intelligence attributes
- Hull Points (max)
- Shields (max)
- Reflex Defense (calculated)
- Fortitude Defense (calculated)
- Damage Threshold (calculated)
- Speed
- Maximum Velocity
- Handling (if applicable)
- Maneuver (if applicable)
- Damage Reduction
- Weapons (if any)
- Crew Positions (templates)
- Cargo Capacity
- Passengers
- Challenge Level
- Hyperdrive multiplier
- Any special features or abilities

## Notes

- All calculations use vehicle attributes (STR, DEX, INT, etc.)
- Crew member stats (BAB, skills, heroic level) are pulled from crew position assignments
- Size modifiers vary by stat type (Reflex vs. Damage Threshold)
- Vehicle must be recalculated when crew assignments change
- Active Effects can modify these values
