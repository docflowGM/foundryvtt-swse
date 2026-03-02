# Vehicle Combat System

Complete implementation of SWSE vehicle combat rules for Foundry VTT.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Vehicle Statistics](#vehicle-statistics)
- [Combat Mechanics](#combat-mechanics)
- [API Reference](#api-reference)
- [Macros](#macros)
- [Implementation Files](#implementation-files)

## Overview

This system implements the complete Star Wars Saga Edition vehicle combat rules, including:

- **Two Combat Scales**: Character Scale and Starship Scale
- **Proper Attack/Damage Calculations**: Using gunner BAB, vehicle INT, and weapon range modifiers
- **Damage Multipliers**: Vehicle weapons multiply damage after modifiers
- **Crew Quality System**: Untrained to Ace quality levels
- **Dogfight System**: Opposed Pilot checks for starfighters
- **Collision Mechanics**: Size-based collision damage
- **Missiles/Torpedoes**: Lock-on and tracking mechanics
- **Weapon Batteries**: Multiple weapons firing in formation

## Features

### 1. **Vehicle Defenses**

Vehicles have two defenses calculated according to official SWSE rules:

**Reflex Defense**:
```
10 + Size Modifier + (Armor Bonus OR Pilot's Heroic Level) + DEX mod
```

- Size Modifiers: Large (-1), Huge (-2), Gargantuan (-5), Colossal (-10)
- Can use either vehicle's armor bonus OR pilot's heroic level (set via `usePilotLevel` flag)
- Vehicle loses DEX bonus when pilot is flat-footed or vehicle is uncontrolled

**Fortitude Defense**:
```
10 + STR mod
```

**Damage Threshold**:
```
Fortitude Defense + Size-Specific Modifier
```

Size-specific modifiers:
- Large: +5
- Huge: +10
- Gargantuan: +20
- Colossal: +50
- Colossal (Frigate): +100
- Colossal (Cruiser): +200
- Colossal (Station): +500

### 2. **Vehicle Attacks**

Attack rolls are calculated as:
```
1d20 + Gunner BAB + Vehicle INT mod + Range Modifier + Weapon Bonus
```

**Weapon Range Bands**:

| Range | Point-Blank | Short | Medium | Long |
|-------|-------------|-------|---------|------|
| Modifier | +0 | -2 | -5 | -10 |

**Range in Squares** (varies by weapon type):

| Weapon Type | Point-Blank | Short | Medium | Long |
|-------------|-------------|-------|---------|------|
| Blaster Cannon (Character Scale) | 0-120 | 121-240 | 241-600 | 601-1,200 |
| Blaster Cannon (Starship Scale) | 0-1 | 2 | 3-4 | 5-8 |
| Laser Cannon (Character Scale) | 0-150 | 151-300 | 301-750 | 751-1,500 |
| Laser Cannon (Starship Scale) | 0-1 | 2 | 3-5 | 6-10 |
| Missile/Torpedo (Character Scale) | 0-450 | 451-900 | 901-2,250 | 2,251-4,500 |
| Missile/Torpedo (Starship Scale) | 0-3 | 4-6 | 7-15 | 16-30 |
| Turbolaser (Character Scale) | 0-600 | 601-1,200 | 1,201-3,000 | 3,001-6,000 |
| Turbolaser (Starship Scale) | 0-4 | 5-8 | 9-20 | 21-40 |

### 3. **Vehicle Damage**

Damage is calculated as:
```
(Weapon Damage + ½ Pilot Heroic Level + Misc Bonuses) × Damage Multiplier
```

**Damage Sequence**:
1. **Shields** → Absorb damage up to shield value
2. **Damage Reduction (DR)** → Reduce remaining damage by flat DR amount
3. **Hull** → Apply remaining damage to hull hit points
4. **Damage Threshold Check** → If total damage ≥ threshold, move down condition track

### 4. **Crew Quality System**

Generic crews have quality levels that affect their performance:

| Quality | Attack Bonus | Check Modifier | CL Modifier |
|---------|--------------|----------------|-------------|
| Untrained | -5 | +0 | -1 |
| Normal | +0 | +5 | +0 |
| Skilled | +2 | +6 | +1 |
| Expert | +5 | +8 | +2 |
| Ace | +10 | +12 | +4 |

- **Attack Bonus**: Used for vehicle weapon attacks
- **Check Modifier**: Used for Pilot, Mechanics, Use Computer checks
- **CL Modifier**: Adjusts vehicle's Challenge Level

### 5. **Dogfight System**

Starfighters and airspeeders can engage in dogfights:

**Initiating a Dogfight** (Standard Action):
- Make opposed Pilot check at -5 penalty
- If successful, both vehicles are engaged in dogfight
- Engaged vehicles must continue dogfighting or disengage

**Attacking in a Dogfight** (Standard Action):
- Make opposed Pilot check
- If successful, make one weapon attack as Swift Action
- If failed, gunners take -5 penalty on attacks until next turn

**Disengaging** (Move Action):
- Make opposed Pilot check
- If successful, disengage and may move normally
- If failed, remain engaged and gunners take -5 penalty

### 6. **Collision Mechanics**

Collisions occur when vehicles move into same space:

**Collision Damage** (by size):
- Large: 2d6 + STR mod
- Huge: 4d6 + STR mod
- Gargantuan: 6d6 + STR mod
- Colossal: 8d6 + STR mod
- Colossal (Frigate): 10d6 + STR mod
- Colossal (Cruiser): 15d6 + STR mod
- Colossal (Station): 20d6 + STR mod

**Avoiding Collision**:
- DC 15 Pilot check as Reaction
- Success reduces or negates damage
- Damage doubled if using All-Out Movement
- Damage to occupants reduced by vehicle's Damage Threshold (if vehicle provides cover)

### 7. **Missiles and Torpedoes**

Guided projectiles with special mechanics:

**Lock-On** (requires Aim action):
- If first attack misses, missile can attack again next turn
- Second attack at -5 penalty
- If second attack misses, missile self-destructs

**Shooting Down Missiles**:
- Reflex Defense 30, 10 HP
- Occupies same square as target for range purposes
- Can Ready action to shoot before first attack

### 8. **Weapon Batteries**

Up to 6 identical weapons firing together:

**Narrow Salvo** (default mode):
- +2 attack bonus per additional weapon
- For every 3 points above Reflex Defense, one additional weapon hits
- Extra hits add +1 die per hit (before multiplier)
- Ideal for attacking capital ships with high SR/DR

**Proximity Spread**:
- Area attack on 1 starship scale square
- -5 penalty on attack roll
- Only affects one target
- Ideal for hitting fast starfighters

## Vehicle Statistics

### Required Vehicle Fields

```json
{
  "attributes": {
    "str": { "base": 10, "racial": 0, "temp": 0 },
    "dex": { "base": 10, "racial": 0, "temp": 0 },
    "con": { "base": 10, "racial": 0, "temp": 0 },
    "int": { "base": 10, "racial": 0, "temp": 0 },
    "wis": { "base": 10, "racial": 0, "temp": 0 },
    "cha": { "base": 10, "racial": 0, "temp": 0 }
  },
  "hull": {
    "value": 50,
    "max": 50
  },
  "shields": {
    "value": 0,
    "max": 0
  },
  "reflexDefense": 10,
  "fortitudeDefense": 10,
  "damageThreshold": 30,
  "damageReduction": 0,
  "armorBonus": 0,
  "usePilotLevel": true,
  "crewQuality": "normal",
  "speed": "12 squares",
  "starshipSpeed": "4 squares",
  "maxVelocity": "800 km/h",
  "size": "Colossal",
  "crew": "1",
  "passengers": "0",
  "conditionTrack": {
    "current": 0,
    "penalty": 0
  },
  "cover": "total"
}
```

## Combat Mechanics

### Basic Attack Sequence

1. **Roll Attack** (`game.swse.VehicleCombat.rollAttack()`)
   - Determines if attack hits target's Reflex Defense
   - Checks for critical hits (natural 20)
   - Creates beautiful chat message

2. **Roll Damage** (`game.swse.VehicleCombat.rollDamage()`)
   - Rolls weapon damage dice
   - Adds ½ pilot heroic level
   - Multiplies by damage multiplier
   - Applies to target if hit

3. **Apply Damage** (`game.swse.VehicleCombat.applyDamageToVehicle()`)
   - Shields absorb damage first
   - DR reduces remaining damage
   - Hull takes final damage
   - Checks damage threshold

### Advanced Combat Actions

**Dogfight**:
```javascript
await game.swse.VehicleCombat.initiateDogfight(starfighter1, starfighter2);
await game.swse.VehicleCombat.attackInDogfight(starfighter1, starfighter2, weapon);
await game.swse.VehicleCombat.disengageFromDogfight(starfighter1, starfighter2);
```

**Collision**:
```javascript
await game.swse.VehicleCombat.handleCollision(vehicle, obstacle, {
  allOutMovement: true
});
```

**Missiles**:
```javascript
// Fire with lock-on
await game.swse.VehicleCombat.fireMissile(vehicle, missile, target, {
  aimed: true
});

// Second attack (automatic next turn)
const missileState = vehicle.getFlag('swse', 'missile');
if (missileState) {
  await game.swse.VehicleCombat.missileSecondAttack(vehicle, missileState);
}
```

**Weapon Batteries**:
```javascript
const battery = [weapon1, weapon2, weapon3, weapon4];

// Narrow salvo (vs capital ships)
await game.swse.VehicleCombat.fireWeaponBattery(vehicle, battery, target, {
  mode: 'narrow'
});

// Proximity spread (vs starfighters)
await game.swse.VehicleCombat.fireWeaponBattery(vehicle, battery, target, {
  mode: 'proximity'
});
```

## API Reference

### Core Methods

#### `rollAttack(vehicle, weapon, target, options)`

Roll vehicle weapon attack.

**Parameters**:
- `vehicle` (Actor): The firing vehicle
- `weapon` (Object): Weapon being fired
- `target` (Actor): Target vehicle/actor
- `options` (Object): Optional settings
  - `gunner` (Actor): Specific gunner (defaults to crew quality)
  - `range` (String): 'point-blank', 'short', 'medium', 'long'

**Returns**: Object with attack result

**Example**:
```javascript
const vehicle = game.actors.getName("Millennium Falcon");
const target = game.actors.getName("TIE Fighter");
const weapon = {
  name: "Quad Laser Cannons",
  damage: "5d10",
  multiplier: 2,
  bonus: 2
};

const result = await game.swse.VehicleCombat.rollAttack(vehicle, weapon, target, {
  range: 'short'
});
```

#### `rollDamage(vehicle, weapon, target, options)`

Roll vehicle weapon damage.

**Parameters**:
- `vehicle` (Actor): The firing vehicle
- `weapon` (Object): Weapon being fired
- `target` (Actor): Target vehicle/actor
- `options` (Object): Optional settings
  - `pilot` (Actor): Specific pilot (for heroic level)
  - `isCrit` (Boolean): Whether this is a critical hit

**Returns**: Object with damage result

**Example**:
```javascript
const result = await game.swse.VehicleCombat.rollDamage(vehicle, weapon, target, {
  isCrit: true
});
```

#### `applyDamageToVehicle(vehicle, damage, options)`

Apply damage to vehicle (shields → DR → hull).

**Parameters**:
- `vehicle` (Actor): Target vehicle
- `damage` (Number): Raw damage amount
- `options` (Object): Additional options

**Returns**: Object with damage breakdown

**Example**:
```javascript
const result = await game.swse.VehicleCombat.applyDamageToVehicle(target, 50);
// {
//   totalDamage: 50,
//   shieldDamage: 25,
//   drReduced: 10,
//   hullDamage: 15,
//   thresholdExceeded: false
// }
```

#### `initiateDogfight(initiator, target, options)`

Start a dogfight between two starfighters.

**Parameters**:
- `initiator` (Actor): Initiating starfighter
- `target` (Actor): Target starfighter
- `options` (Object): Additional options

**Returns**: Object with dogfight result

#### `handleCollision(vehicle, object, options)`

Handle collision between vehicle and object.

**Parameters**:
- `vehicle` (Actor): Colliding vehicle
- `object` (Object): Object being hit
- `options` (Object): Additional options
  - `allOutMovement` (Boolean): Whether using all-out movement

**Returns**: Object with collision result

#### `fireMissile(vehicle, weapon, target, options)`

Fire guided missile or torpedo.

**Parameters**:
- `vehicle` (Actor): Firing vehicle
- `weapon` (Object): Missile/torpedo weapon
- `target` (Actor): Target vehicle
- `options` (Object): Additional options
  - `aimed` (Boolean): Whether using Aim action for lock-on

**Returns**: Object with missile attack result

#### `fireWeaponBattery(vehicle, weapons, target, options)`

Fire weapon battery (up to 6 identical weapons).

**Parameters**:
- `vehicle` (Actor): Firing vehicle
- `weapons` (Array): Array of identical weapon objects (max 6)
- `target` (Actor): Target vehicle
- `options` (Object): Additional options
  - `mode` (String): 'narrow' or 'proximity'

**Returns**: Object with battery attack result

## Macros

### Quick Vehicle Attack

```javascript
// Get vehicles
const vehicle = game.actors.getName("X-Wing");
const target = Array.from(game.user.targets)[0]?.actor;

if (!target) {
  ui.notifications.warn("Please target a vehicle first!");
  return;
}

// Define weapon
const weapon = {
  name: "Laser Cannons",
  damage: "6d10",
  multiplier: 2,
  bonus: 0
};

// Roll attack
const attack = await game.swse.VehicleCombat.rollAttack(vehicle, weapon, target, {
  range: 'short'
});

// If hit, roll damage
if (attack.hits) {
  await game.swse.VehicleCombat.rollDamage(vehicle, weapon, target, {
    isCrit: attack.isCrit,
    pilot: null // Use crew quality
  });
}
```

### Dogfight Macro

```javascript
// Get two starfighters
const attacker = game.actors.getName("X-Wing");
const defender = Array.from(game.user.targets)[0]?.actor;

if (!defender) {
  ui.notifications.warn("Please target an enemy starfighter!");
  return;
}

// Check if already in dogfight
const inDogfight = attacker.getFlag('swse', 'dogfight');

if (!inDogfight) {
  // Initiate dogfight
  await game.swse.VehicleCombat.initiateDogfight(attacker, defender);
} else {
  // Attack in existing dogfight
  const weapon = {
    name: "Laser Cannons",
    damage: "6d10",
    multiplier: 2
  };
  await game.swse.VehicleCombat.attackInDogfight(attacker, defender, weapon);
}
```

### Weapon Battery Macro

```javascript
// Get capital ship
const vehicle = game.actors.getName("Star Destroyer");
const target = Array.from(game.user.targets)[0]?.actor;

if (!target) {
  ui.notifications.warn("Please target an enemy!");
  return;
}

// Define weapon battery (4 turbolasers)
const weapon = {
  name: "Turbolaser",
  damage: "4d10",
  multiplier: 5
};

const battery = [weapon, weapon, weapon, weapon];

// Fire in narrow salvo mode
await game.swse.VehicleCombat.fireWeaponBattery(vehicle, battery, target, {
  mode: 'narrow',
  range: 'medium'
});
```

## Implementation Files

| File | Purpose |
|------|---------|
| `scripts/combat/vehicle-combat-system.js` | Main vehicle combat system (1000+ lines) |
| `scripts/data-models/vehicle-data-model.js` | Vehicle data model with automatic defense calculations |
| `styles/combat/vehicle-combat.css` | Vehicle combat chat message styling |
| `system.json` | Registered vehicle combat CSS |
| `index.js` | System initialization and namespace registration |

## Configuration

The vehicle combat system is automatically initialized on system load. All features are active by default.

### Vehicle Setup

1. **Set Vehicle Size**: Affects Reflex Defense and Damage Threshold
2. **Configure Attributes**: STR (Fortitude), DEX (Reflex), INT (targeting computer)
3. **Set Crew Quality**: Affects attack rolls and skill checks
4. **Assign Pilot**: If using pilot's heroic level for Reflex Defense
5. **Configure Weapons**: Set damage, multiplier, and bonuses

### Combat Scales

The system automatically handles both combat scales:

- **Character Scale**: Used when vehicles and characters are together
- **Starship Scale**: Used for vehicle-only combats (abstracts relative movement)

Range modifiers are the same for both scales, but actual distances differ significantly.

## Examples

### Example 1: X-Wing vs TIE Fighter

```javascript
const xwing = game.actors.getName("X-Wing");
const tie = game.actors.getName("TIE Fighter");

// Initiate dogfight
await game.swse.VehicleCombat.initiateDogfight(xwing, tie);

// Attack in dogfight
const laserCannons = {
  name: "Laser Cannons",
  damage: "6d10",
  multiplier: 2
};

await game.swse.VehicleCombat.attackInDogfight(xwing, tie, laserCannons);
```

### Example 2: Capital Ship Turbolaser Battery

```javascript
const destroyer = game.actors.getName("Imperial Star Destroyer");
const cruiser = game.actors.getName("Mon Calamari Cruiser");

// Fire 6-gun turbolaser battery
const turbolaser = {
  name: "Turbolaser",
  damage: "4d10",
  multiplier: 5
};

const battery = Array(6).fill(turbolaser);

await game.swse.VehicleCombat.fireWeaponBattery(destroyer, battery, cruiser, {
  mode: 'narrow',
  range: 'medium'
});
```

### Example 3: Proton Torpedo with Lock-On

```javascript
const ywing = game.actors.getName("Y-Wing");
const tie = game.actors.getName("TIE Bomber");

// Fire with aim (lock-on)
const torpedo = {
  name: "Proton Torpedo",
  damage: "9d10",
  multiplier: 2
};

await game.swse.VehicleCombat.fireMissile(ywing, torpedo, tie, {
  aimed: true,
  range: 'medium'
});

// If missed, torpedo automatically attacks next turn
```

---

**Note**: This system implements the official SWSE vehicle combat rules as published in the core rulebook and Starships of the Galaxy supplement.
