# SWSE Weapon Categorization

## Summary

All 60 weapons from the weapons.db have been intelligently categorized based on:
- Range value ("Melee" or "X squares")
- Attack attribute (STR or DEX)
- Weapon name and type
- Star Wars lore and weapon functionality

## Categorization Results

### Melee Weapons (21 weapons)

**Lightsabers & Training Sabers:**
- Double-Bladed Lightsaber
- Jedi Training Saber
- Lightfoil (DEX-based fencing lightsaber)
- Lightsaber

**Swords & Blades:**
- Cortosis Sword
- Monomolecular Knife
- Sith Sword
- Sith Tremor Sword
- Vibroblade
- Vibrodagger
- Vibrosword
- Wookiee Ryyk Blade

**Staves & Polearms:**
- Electrostaff
- Gungan Electropole
- Tusken Gaderffii Stick
- Zabrak Combat Staff

**Reach Weapons:**
- Electro-whip (2 squares, STR)
- Zeltron Neural Whip (2 squares, STR)

**Other Melee:**
- Stun Baton

### Ranged: Pistols (9 weapons)

Light, one-handed ranged weapons (8-20 squares):
- Blaster Pistol
- Disruptor Pistol
- Heavy Blaster Pistol
- Hold-out Blaster
- Ion Blaster
- Slugthrower Pistol
- Sonic Pistol
- Sporting Blaster Pistol
- Verpine Shatter Pistol

### Ranged: Rifles & Carbines (14 weapons)

Two-handed long-range weapons (20-80 squares):
- Blaster Carbine
- Blaster Rifle
- Bowcaster (20 squares, STR - Wookiee crossbow)
- Charric
- Clone DC-15A Blaster Rifle
- Clone DC-15S Blaster Carbine
- Disruptor Rifle
- Heavy Blaster Rifle
- Slugthrower Rifle
- Sniper Rifle (80 squares!)
- Sonic Rifle
- Stealth Carbine
- Trandoshan Repeater Rifle
- Tusken Cycler Rifle
- Verpine Shatter Rifle
- Verpine Sniper Rifle

### Ranged: Heavy Weapons (8 weapons)

Vehicle-mounted or crew-served weapons (40-60 squares):
- Concussion Missile Launcher
- Heavy Laser Cannon
- Laser Cannon
- Miniature Missile Launcher
- Proton Torpedo Launcher
- Repeating Blaster

### Ranged: Exotic Weapons (4 weapons)

Special-purpose ranged weapons with unique mechanics:
- Electro-net (5 squares - thrown restraint weapon)
- Flamethrower (6 squares - area effect weapon)
- Mandalorian Ripper (10 squares - thrown blade)
- Sith Lanvarok (6 squares - disc launcher)
- Wrist Laser (10 squares - wrist-mounted blaster)
- Wrist Rocket Launcher (10 squares - wrist-mounted launcher)

### Explosives & Grenades (4 weapons)

Thrown explosive devices (6 squares):
- CryoBan Grenade
- Frag Grenade
- Stun Grenade
- Thermal Detonator

## Weapons Requiring Clarification

**None!** All 60 weapons were successfully categorized based on their properties.

## Edge Cases & Special Notes

### 1. **Reach Weapons (Melee with Extended Range)**
- **Electro-whip**: 2 squares, STR attribute → Melee reach weapon
- **Zeltron Neural Whip**: 2 squares, STR attribute → Melee reach weapon

These are categorized as **melee** because they use STR and represent physical contact weapons with extended reach.

### 2. **STR-Based Ranged Weapon**
- **Bowcaster**: 20 squares, STR attribute → Ranged rifle

The Bowcaster is a Wookiee crossbow that requires significant strength to draw but is definitely a ranged weapon. Categorized as **ranged-rifles**.

### 3. **DEX-Based Melee Weapon**
- **Lightfoil**: Melee, DEX attribute → Melee weapon

The Lightfoil is a fencing-style lightsaber used by Sith nobility. Despite using DEX for finesse, it's still a **melee** weapon.

### 4. **Short-Range Weapons (5-10 squares)**
These are categorized as **ranged-exotic** because they represent:
- Thrown weapons (Mandalorian Ripper, Electro-net)
- Wrist-mounted weapons (Wrist Laser, Wrist Rocket Launcher)
- Area effect weapons (Flamethrower)
- Exotic launchers (Sith Lanvarok)

### 5. **Grenades vs Other Thrown Weapons**
- **Grenades** (6 squares): Separate "explosives" category (one-use consumables)
- **Thrown weapons** (5-10 squares): Exotic ranged category (reusable equipment)

## Categorization Logic

```javascript
// Decision tree:
if (range === "Melee") → melee
else if (range <= 3 squares && attackAttr === STR) → melee (reach weapons)
else if (name.includes("grenade") || "detonator") → explosives
else if (name.includes("pistol")) → ranged-pistols
else if (name.includes("rifle"|"carbine"|"bowcaster")) → ranged-rifles
else if (name.includes("cannon"|"launcher"|"repeating")) → ranged-heavy
else if (range <= 10 squares) → ranged-exotic
else if (range <= 20 squares) → ranged-pistols
else if (range <= 40 squares) → ranged-rifles
else → ranged-heavy
```

## Integration with Store

The categorization can be used in the store to:
1. Organize weapons into logical subcategories for easier browsing
2. Apply category-specific filters
3. Display weapons with appropriate icons and descriptions
4. Group similar weapons together in the inventory

Example store structure:
```
Weapons
├── Melee Weapons (21)
│   ├── Lightsabers (4)
│   ├── Swords & Blades (8)
│   └── Staves & Other (9)
├── Ranged Weapons
│   ├── Pistols (9)
│   ├── Rifles & Carbines (14)
│   ├── Heavy Weapons (8)
│   └── Exotic Weapons (6)
└── Explosives & Grenades (4)
```

## Technical Implementation

See `weapon-categorization.js` for the implementation, which provides:
- `categorizeWeapon(weapon)` - Main categorization function
- `sortWeaponsByCategory(weapons)` - Batch sorting helper
- `getCategoryDisplayName(category)` - UI display names
- `getCategoryWithOverrides(weapon)` - Manual override support
- `MANUAL_OVERRIDES` - Edge case mappings

All weapons are categorized deterministically with no ambiguity.
