#!/usr/bin/env node

/**
 * Script to add comprehensive SWSE weapon data to weapons.db
 * Includes grenades, exotic weapons, simple weapons, rifles, pistols, and heavy weapons
 */

const fs = require('fs');
const path = require('path');

// Utility function to create weapon ID
function createWeaponId(name) {
  return 'weapon-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Utility function to map SWSE availability to properties
function parseAvailability(availability) {
  if (!availability) return [];
  const props = [];
  const av = availability.toLowerCase();

  if (av.includes('military')) props.push('Military');
  if (av.includes('restricted')) props.push('Restricted');
  if (av.includes('illegal')) props.push('Illegal');
  if (av.includes('licensed')) props.push('Licensed');
  if (av.includes('rare')) props.push('Rare');

  return props;
}

// Utility function to determine proficiency and category
function determineWeaponCategory(weaponType, name, isInaccurate) {
  const nameLower = name.toLowerCase();

  // Grenades are simple ranged weapons (explosives)
  if (weaponType === 'grenade') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'simple',
      subcategory: 'simple'
    };
  }

  // Exotic weapons
  if (weaponType === 'exotic') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'exotic',
      subcategory: 'exotic'
    };
  }

  // Simple ranged weapons
  if (weaponType === 'simple') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'simple',
      subcategory: 'simple'
    };
  }

  // Rifles
  if (weaponType === 'rifle') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'rifles',
      subcategory: 'rifles'
    };
  }

  // Pistols
  if (weaponType === 'pistol') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'pistols',
      subcategory: 'pistols'
    };
  }

  // Heavy weapons
  if (weaponType === 'heavy') {
    return {
      weaponCategory: 'ranged',
      proficiency: 'heavy-weapons',
      subcategory: 'heavy'
    };
  }

  // Default to simple
  return {
    weaponCategory: 'ranged',
    proficiency: 'simple',
    subcategory: 'simple'
  };
}

// Map SWSE damage type to system damage type
function mapDamageType(type) {
  if (!type) return 'energy';

  const typeLower = type.toLowerCase();

  if (typeLower.includes('ion')) return 'ion';
  if (typeLower.includes('energy')) return 'energy';
  if (typeLower.includes('fire')) return 'fire';
  if (typeLower.includes('sonic')) return 'sonic';
  if (typeLower.includes('slashing')) return 'slashing';
  if (typeLower.includes('piercing')) return 'piercing';
  if (typeLower.includes('bludgeoning')) return 'bludgeoning';
  if (typeLower.includes('stun')) return 'stun';

  return 'energy';
}

// Parse rate of fire to determine if autofire
function hasAutofire(rateOfFire) {
  if (!rateOfFire) return false;
  return rateOfFire.includes('A');
}

// Create weapon object
function createWeapon(data) {
  const {
    name,
    size,
    cost,
    damage,
    stunSetting,
    rateOfFire,
    weight,
    type,
    availability,
    weaponType,
    isInaccurate,
    isAccurate,
    isAreaAttack,
    description,
    range
  } = data;

  const category = determineWeaponCategory(weaponType, name, isInaccurate);
  const properties = parseAvailability(availability);

  // Add special properties
  if (isInaccurate) properties.push('Inaccurate');
  if (isAccurate) properties.push('Accurate');
  if (isAreaAttack) properties.push('Area Attack');
  if (hasAutofire(rateOfFire)) properties.push('Autofire');
  if (type && type.toLowerCase().includes('ion')) properties.push('Ion');
  if (type && type.toLowerCase().includes('stun')) properties.push('Stun');

  // Parse weight (remove 'kg')
  const weightNum = weight ? parseFloat(weight.toString().replace(/[^0-9.]/g, '')) : 0;

  // Determine damage and damage type
  let finalDamage = damage || '-';
  let damageType = mapDamageType(type);

  // Handle stun setting
  if (stunSetting && stunSetting.toLowerCase().includes('only')) {
    // Extract stun damage from stunSetting
    const stunMatch = stunSetting.match(/(\d+d\d+)/);
    if (stunMatch) {
      finalDamage = stunMatch[1];
    }
    damageType = 'stun';
  }

  return {
    _id: createWeaponId(name),
    name: name,
    type: 'weapon',
    img: 'icons/svg/sword.svg',
    system: {
      damage: finalDamage,
      damageType: damageType,
      attackBonus: 0,
      attackAttribute: 'dex',
      range: range || '10 squares',
      weight: weightNum,
      cost: parseInt(cost) || 0,
      equipped: false,
      description: description || `<p>${name}</p>`,
      properties: properties,
      ammunition: {
        type: 'none',
        current: 0,
        max: 0
      },
      ...category
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {}
  };
}

// ===== WEAPON DATA =====

const GRENADES = [
  // Core Rulebook
  { name: 'Ion Grenade', size: 'Tiny', cost: 250, damage: '4d6', stunSetting: 'NO', weight: '0.5 kg', type: 'Energy (Ion)', availability: 'Restricted', weaponType: 'grenade', range: '6 squares', description: '<p>A grenade that releases an ion pulse, particularly effective against droids and electronic systems.</p>' },

  // Knights of the Old Republic Campaign Guide
  { name: 'Adhesive Grenade', size: 'Tiny', cost: 200, damage: '-', stunSetting: 'NO', weight: '0.5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'grenade', range: '6 squares', description: '<p>Releases a powerful adhesive that immobilizes targets in the blast radius.</p>' },
  { name: 'Remote Grenade', size: 'Tiny', cost: 300, damage: '4d6', stunSetting: 'NO', weight: '1 kg', type: 'Energy', availability: 'Military', weaponType: 'grenade', range: '6 squares', description: '<p>A grenade that can be remotely detonated via comlink or timer.</p>' },

  // Clone Wars Campaign Guide
  { name: 'EMP Grenade', size: 'Small', cost: 500, damage: '3d6', stunSetting: 'NO', weight: '0.5 kg', type: 'Energy (Ion)', availability: 'Restricted', weaponType: 'grenade', range: '6 squares', description: '<p>An electromagnetic pulse grenade that disables electronics and droids.</p>' },

  // Jedi Academy Training Manual
  { name: 'Flash Canister', size: 'Tiny', cost: 100, damage: 'Special', stunSetting: 'NO', weight: '0.5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'grenade', range: '6 squares', description: '<p>A flash-bang grenade that blinds and disorients targets.</p>' },

  // Rebellion Era Campaign Guide
  { name: 'Concussion Grenade', size: 'Tiny', cost: 400, damage: '8d6', stunSetting: 'NO', weight: '0.5 kg', type: 'Bludgeoning', availability: 'Military', weaponType: 'grenade', range: '6 squares', description: '<p>A powerful grenade that delivers devastating concussive force.</p>' },
  { name: 'Gas Grenade', size: 'Tiny', cost: 250, damage: '-', stunSetting: 'NO', weight: '0.5 kg', type: '-', availability: 'Military', weaponType: 'grenade', range: '6 squares', description: '<p>Releases toxic or sleep-inducing gas in the blast radius.</p>' },

  // Galaxy at War
  { name: 'Radiation Grenade', size: 'Tiny', cost: 500, damage: '3d8', stunSetting: 'NO', weight: '0.5 kg', type: 'Energy', availability: 'Illegal', weaponType: 'grenade', range: '6 squares', description: '<p>An illegal weapon that spreads deadly radiation.</p>' },
  { name: 'Smoke Grenade', size: 'Tiny', cost: 100, damage: '-', stunSetting: 'NO', weight: '0.5 kg', type: '-', availability: 'Military', weaponType: 'grenade', range: '6 squares', description: '<p>Creates a thick smoke screen that provides concealment.</p>' }
];

const EXOTIC_WEAPONS = [
  // Knights of the Old Republic Campaign Guide
  { name: 'Aurial Blaster', size: 'Medium', cost: 2500, damage: '3d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Sonic', availability: 'Restricted', weaponType: 'exotic', range: '15 squares', description: '<p>An exotic sonic weapon used by the Aurial species.</p>' },
  { name: 'Massassi Lanvarok', size: 'Large', cost: 250, damage: '3d4', stunSetting: 'NO', rateOfFire: 'S', weight: '9.8 kg', type: 'Bludgeoning', availability: 'Rare', weaponType: 'exotic', isInaccurate: true, range: '6 squares', description: '<p>An ancient Massassi throwing disc launcher.</p>' },

  // Force Unleashed Campaign Guide
  { name: 'CR-1 Blast Cannon', size: 'Large', cost: 2000, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '6 kg', type: 'Energy', availability: 'Military', weaponType: 'exotic', isInaccurate: true, range: '30 squares', description: '<p>A portable blast cannon with special targeting properties.</p>' },
  { name: 'Blast Cannon', size: 'Large', cost: 2000, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '6 kg', type: 'Energy', availability: 'Military, Rare', weaponType: 'exotic', range: '30 squares', description: '<p>A powerful portable blast cannon.</p>' },

  // Scum and Villainy
  { name: 'Deck Sweeper', size: 'Large', cost: 5000, damage: '-', stunSetting: 'ONLY (3d6)', rateOfFire: 'S', weight: '4.5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'exotic', range: '10 squares', description: '<p>A non-lethal area weapon used for crowd control.</p>' },
  { name: 'Neural Inhibitor', size: 'Medium', cost: 4200, damage: '1d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Piercing', availability: 'Illegal', weaponType: 'exotic', isInaccurate: true, range: '15 squares', description: '<p>An illegal weapon that disrupts neural function.</p>' },
  { name: 'Pulse Rifle', size: 'Medium', cost: 5000, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '2.5 kg', type: 'Energy', availability: 'Illegal', weaponType: 'exotic', range: '20 squares', description: '<p>An illegal pulse weapon with devastating effects.</p>' },

  // Legacy Era Campaign Guide
  { name: 'Concealed Dart Launcher', size: 'Small', cost: 1900, damage: '-', stunSetting: '3d8', rateOfFire: 'S', weight: '0.5 kg', type: 'Piercing', availability: 'Illegal', weaponType: 'exotic', range: '8 squares', description: '<p>A concealed weapon that fires tranquilizer darts.</p>' },

  // Jedi Academy Training Manual
  { name: 'Discblade', size: 'Small', cost: 2000, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '1.25 kg', type: 'Slashing', availability: 'Rare', weaponType: 'exotic', range: '10 squares', description: '<p>A thrown disc weapon that returns to the wielder.</p>' },

  // Rebellion Era Campaign Guide
  { name: 'Siang Lance', size: 'Medium', cost: 2000, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '4 kg', type: 'Energy', availability: 'Illegal, Rare', weaponType: 'exotic', isAccurate: true, range: '20 squares', description: '<p>A rare energy lance weapon.</p>' },

  // Unknown Regions
  { name: 'Magna Caster', size: 'Medium', cost: 2000, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '4 kg', type: 'Piercing', availability: 'Restricted', weaponType: 'exotic', isAccurate: true, range: '25 squares', description: '<p>A magnetic projectile weapon.</p>' },
  { name: 'Squib Tensor Rifle', size: 'Medium', cost: 10000, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '7.2 kg', type: 'Energy', availability: 'Restricted, Rare', weaponType: 'exotic', range: '30 squares', description: '<p>A sophisticated Squib energy weapon.</p>' },
  { name: 'Verpine Shattergun', size: 'Medium', cost: 15000, damage: '3d10', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Illegal, Rare', weaponType: 'exotic', isAccurate: true, range: '25 squares', description: '<p>A silent and deadly Verpine projectile weapon.</p>' }
];

const SIMPLE_WEAPONS = [
  // Core Rulebook
  { name: 'Bow', size: 'Medium', cost: 300, damage: '1d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1.4 kg', type: 'Piercing', availability: '-', weaponType: 'simple', range: '15 squares', description: '<p>A traditional bow and arrow.</p>' },
  { name: 'Energy Ball', size: 'Tiny', cost: 20, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '0.25 kg', type: 'Energy', availability: 'Licensed, Rare', weaponType: 'simple', range: '10 squares', description: '<p>A thrown energy weapon popular in certain sports.</p>' },
  { name: 'Net', size: 'Large', cost: 25, damage: '-', stunSetting: 'NO', rateOfFire: 'S', weight: '4.5 kg', type: '-', availability: '-', weaponType: 'simple', isInaccurate: true, range: '6 squares', description: '<p>A weighted net for entangling opponents.</p>' },
  { name: 'Sling', size: 'Small', cost: 35, damage: '1d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.3 kg', type: 'Bludgeoning', availability: '-', weaponType: 'simple', range: '12 squares', description: '<p>A simple sling for hurling stones.</p>' },

  // Threats of the Galaxy
  { name: 'Saberdart Launcher', size: 'Tiny', cost: 500, damage: '1d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.5 kg', type: 'Piercing', availability: 'Restricted', weaponType: 'simple', isInaccurate: true, range: '8 squares', description: '<p>A small launcher for poisoned saberdarts.</p>' },

  // Scum and Villainy
  { name: 'Battering Ram', size: 'Large', cost: 3500, damage: '5d10', stunSetting: 'NO', rateOfFire: 'S', weight: '10 kg', type: 'Energy', availability: 'Military', weaponType: 'simple', range: '5 squares', description: '<p>A portable energy battering ram.</p>' },

  // Legacy Era Campaign Guide
  { name: 'Razor Bug', size: 'Small', cost: 800, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '0.5 kg', type: 'Slashing', availability: 'Illegal, Rare', weaponType: 'simple', isAccurate: true, range: '12 squares', description: '<p>A bioengineered throwing weapon.</p>' },
  { name: 'Thud Bug', size: 'Small', cost: 800, damage: '2d8', stunSetting: 'YES', rateOfFire: 'S', weight: '0.5 kg', type: 'Bludgeoning', availability: 'Illegal, Rare', weaponType: 'simple', isAccurate: true, range: '12 squares', description: '<p>A bioengineered impact weapon.</p>' },

  // Galaxy at War
  { name: 'Repeating Crossbow', size: 'Medium', cost: 400, damage: '1d8', stunSetting: 'NO', rateOfFire: 'S', weight: '1.2 kg', type: 'Piercing', availability: '-', weaponType: 'simple', range: '18 squares', description: '<p>A crossbow with a repeating mechanism.</p>' },
  { name: 'Targeting Laser', size: 'Tiny', cost: 50, damage: '-', stunSetting: '-', rateOfFire: 'S', weight: '0.1 kg', type: 'Energy', availability: 'Licensed', weaponType: 'simple', range: '30 squares', description: '<p>A targeting laser that provides bonuses to aim.</p>' },

  // Galaxy of Intrigue
  { name: 'Darter', size: 'Medium', cost: 150, damage: '1', stunSetting: 'NO', rateOfFire: 'S', weight: '3 kg', type: 'Piercing', availability: 'Licensed', weaponType: 'simple', range: '15 squares', description: '<p>A simple dart launcher.</p>' },

  // Unknown Regions
  { name: 'Crossbow', size: 'Medium', cost: 300, damage: '1d8', stunSetting: 'NO', rateOfFire: 'S', weight: '1.8 kg', type: 'Piercing', availability: '-', weaponType: 'simple', isInaccurate: true, range: '18 squares', description: '<p>A traditional crossbow.</p>' }
];

const RIFLES = [
  // Core Rulebook
  { name: 'Sporting Blaster Rifle', size: 'Medium', cost: 800, damage: '3d6', stunSetting: 'YES', rateOfFire: 'S', weight: '4 kg', type: 'Energy', availability: 'Licensed', weaponType: 'rifle', isAccurate: true, range: '30 squares', description: '<p>A civilian sporting rifle designed for hunting and recreation.</p>' },
  { name: 'Ion Rifle', size: 'Medium', cost: 800, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '3.1 kg', type: 'Ion', availability: 'Restricted', weaponType: 'rifle', range: '30 squares', description: '<p>Fires ionized bolts particularly effective against droids and vehicles.</p>' },
  { name: 'Light Repeating Blaster', size: 'Large', cost: 1200, damage: '3d8', stunSetting: 'NO', rateOfFire: 'A', weight: '6 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', range: '40 squares', description: '<p>A light automatic blaster weapon.</p>' },

  // Knights of the Old Republic Campaign Guide
  { name: 'Assault Blaster Rifle', size: 'Large', cost: 1750, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S, A', weight: '5 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isAccurate: true, range: '35 squares', description: '<p>A military assault rifle with automatic capability.</p>' },
  { name: 'Commando Special Rifle', size: 'Medium', cost: 1250, damage: '3d10', stunSetting: 'NO', rateOfFire: 'S, A', weight: '3.3 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', range: '30 squares', description: '<p>A specialized commando weapon.</p>' },
  { name: 'Ion Carbine', size: 'Medium', cost: 800, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S, A', weight: '3 kg', type: 'Ion', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '25 squares', description: '<p>A shorter ion weapon with automatic capability.</p>' },
  { name: 'Pulse-Wave Rifle', size: 'Medium', cost: 550, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S, A', weight: '4 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '25 squares', description: '<p>An early energy rifle design.</p>' },
  { name: 'Repeating Blaster Carbine', size: 'Large', cost: 2000, damage: '3d10', stunSetting: 'YES', rateOfFire: 'A', weight: '6 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isInaccurate: true, range: '30 squares', description: '<p>A heavy automatic carbine.</p>' },
  { name: 'Sonic Rifle', size: 'Medium', cost: 900, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S, A', weight: '5 kg', type: 'Sonic', availability: 'Restricted', weaponType: 'rifle', range: '25 squares', description: '<p>A sonic-based rifle weapon.</p>' },

  // Force Unleashed Campaign Guide
  { name: 'Bryar Rifle', size: 'Medium', cost: 1350, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '3 kg', type: 'Energy', availability: 'Licensed', weaponType: 'rifle', isInaccurate: true, range: '30 squares', description: '<p>A reliable civilian rifle design.</p>' },
  { name: 'Disruptor Rifle', size: 'Medium', cost: 3500, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '6 kg', type: 'Energy', availability: 'Illegal', weaponType: 'rifle', range: '30 squares', description: '<p>An illegal disruptor weapon that ignores armor.</p>' },
  { name: 'Flechette Launcher', size: 'Large', cost: 1100, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '5 kg', type: 'Piercing', availability: 'Military', weaponType: 'rifle', isInaccurate: true, range: '20 squares', description: '<p>Fires a spray of razor-sharp flechettes.</p>' },
  { name: 'Incinerator Rifle', size: 'Medium', cost: 3500, damage: '3d6', stunSetting: 'NO', rateOfFire: 'S', weight: '5 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', range: '25 squares', description: '<p>A weapon that incinerates targets.</p>' },
  { name: 'Rail Detonator Gun', size: 'Large', cost: 1900, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '5 kg', type: 'Piercing', availability: 'Military', weaponType: 'rifle', range: '30 squares', description: '<p>A rail gun that fires explosive projectiles.</p>' },
  { name: 'Stokhli Spray Stick', size: 'Medium', cost: 14000, damage: '-', stunSetting: 'ONLY (3d8)', rateOfFire: 'S', weight: '4 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '15 squares', description: '<p>A specialized capture weapon that fires energy nets.</p>' },

  // Scum and Villainy
  { name: 'Micro Grenade Launcher', size: 'Medium', cost: 2500, damage: 'Special', stunSetting: 'Special', rateOfFire: 'S', weight: '3 kg', type: 'Varies', availability: 'Military', weaponType: 'rifle', isInaccurate: true, range: '25 squares', description: '<p>A compact grenade launcher.</p>' },
  { name: 'Snare Rifle', size: 'Medium', cost: 1200, damage: '-', stunSetting: '1d6', rateOfFire: 'S', weight: '5 kg', type: 'Bludgeoning', availability: 'Licensed', weaponType: 'rifle', range: '20 squares', description: '<p>A non-lethal capture weapon.</p>' },
  { name: 'Sniper Blaster Rifle', size: 'Large', cost: 2000, damage: '3d10', stunSetting: 'NO', rateOfFire: 'S', weight: '8 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isAccurate: true, range: '80 squares', description: '<p>A precision long-range blaster rifle.</p>' },

  // Clone Wars Campaign Guide
  { name: 'DLT-20A Longblaster', size: 'Large', cost: 1300, damage: '3d10', stunSetting: 'NO', rateOfFire: 'S, A', weight: '6.7 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isAccurate: true, range: '40 squares', description: '<p>A BlasTech long-range rifle.</p>' },
  { name: 'Adventurer Slugthrower', size: 'Medium', cost: 360, damage: '2d10', stunSetting: 'NO', rateOfFire: 'S', weight: '4 kg', type: 'Piercing', availability: 'Restricted', weaponType: 'rifle', isAccurate: true, range: '30 squares', description: '<p>A rugged civilian slugthrower rifle.</p>' },
  { name: 'Firelance Blaster Rifle', size: 'Medium', cost: 1200, damage: '3d8', stunSetting: 'YES (4d6)', rateOfFire: 'S, A', weight: '2.5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', range: '30 squares', description: '<p>A blaster rifle with enhanced stun capability.</p>' },

  // Legacy Era Campaign Guide
  { name: 'ARC-9965 Blaster', size: 'Medium', cost: 1400, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S, A', weight: '5 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isAccurate: true, range: '35 squares', description: '<p>An advanced military blaster rifle.</p>' },
  { name: 'Double-Barreled Blaster Carbine', size: 'Medium', cost: 1200, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '1.9 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '25 squares', description: '<p>A double-barreled carbine that can fire both barrels.</p>' },
  { name: 'Heavy Assault Blaster', size: 'Large', cost: 3000, damage: '3d10', stunSetting: 'NO', rateOfFire: 'A', weight: '7 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isInaccurate: true, range: '35 squares', description: '<p>A heavy automatic assault weapon.</p>' },
  { name: 'Hunting Blaster Carbine', size: 'Medium', cost: 1000, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '2.1 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '28 squares', description: '<p>A civilian hunting carbine.</p>' },
  { name: 'Sporting Blaster Carbine', size: 'Medium', cost: 1000, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '2.6 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isInaccurate: true, range: '25 squares', description: '<p>A sporting carbine for recreational shooting.</p>' },

  // Rebellion Era Campaign Guide
  { name: 'ESPO 500 Riot Gun', size: 'Medium', cost: 1200, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S, A', weight: '2.2 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', range: '28 squares', description: '<p>A law enforcement riot control weapon.</p>' },
  { name: 'SG-4 Blaster Rifle', size: 'Medium', cost: 400, damage: '3d8 or 2d6', stunSetting: 'Special', rateOfFire: 'S, A or S', weight: '5 kg', type: 'Energy or Piercing', availability: 'Military', weaponType: 'rifle', range: '30 squares', description: '<p>A dual-mode rifle that can fire blaster bolts or slugs.</p>' },

  // Galaxy at War
  { name: 'Interchangeable Weapon System', size: 'Medium', cost: 4500, damage: 'Varies', stunSetting: 'Varies', rateOfFire: 'Varies', weight: '5 kg', type: 'Varies', availability: 'Military', weaponType: 'rifle', range: '30 squares', description: '<p>A modular weapon system with interchangeable components.</p>' },
  { name: 'Scattergun', size: 'Medium', cost: 275, damage: '3d8 or 2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '4 kg', type: 'Piercing', availability: 'Licensed', weaponType: 'rifle', range: '15 squares', description: '<p>A shotgun-style scatter weapon.</p>' },
  { name: 'Variable Blaster', size: 'Medium', cost: 1300, damage: 'Special', stunSetting: 'YES', rateOfFire: 'S, A', weight: '5 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', range: '30 squares', description: '<p>A blaster with variable power settings.</p>' },
  { name: 'Heavy Variable Blaster', size: 'Large', cost: 2250, damage: 'Special', stunSetting: 'YES', rateOfFire: 'S', weight: '6.5 kg', type: 'Energy', availability: 'Military', weaponType: 'rifle', isInaccurate: true, range: '35 squares', description: '<p>A heavy blaster with variable power settings.</p>' },

  // Galaxy of Intrigue
  { name: 'Xerrol Nightstinger', size: 'Medium', cost: 1500, damage: '3d6', stunSetting: 'NO', rateOfFire: 'S', weight: '4.5 kg', type: 'Energy', availability: 'Illegal', weaponType: 'rifle', range: '30 squares', description: '<p>A sniper rifle used by assassins.</p>' },

  // Unknown Regions
  { name: 'Concussion Rifle', size: 'Large', cost: 1800, damage: '2d10', stunSetting: 'NO', rateOfFire: 'S', weight: '2.1 kg', type: 'Sonic', availability: 'Restricted, Rare', weaponType: 'rifle', range: '25 squares', description: '<p>A sonic rifle that delivers concussive force.</p>' },
  { name: 'Targeting Blaster Rifle', size: 'Medium', cost: 1000, damage: '3d6 or 3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '4 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', isAccurate: true, range: '30 squares', description: '<p>A blaster rifle with advanced targeting systems.</p>' },

  // Dawn of Defiance
  { name: 'Stealth Blaster Carbine', size: 'Medium', cost: 3500, damage: '3d8', stunSetting: 'NO', rateOfFire: 'S', weight: '5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'rifle', range: '25 squares', description: '<p>A carbine designed for stealth operations.</p>' }
];

const PISTOLS = [
  // Core Rulebook
  { name: 'Hold-Out Blaster Pistol', size: 'Tiny', cost: 300, damage: '3d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.5 kg', type: 'Energy', availability: 'Illegal', weaponType: 'pistol', isInaccurate: true, range: '8 squares', description: '<p>A small, easily concealed blaster pistol.</p>' },
  { name: 'Ion Pistol', size: 'Small', cost: 250, damage: '3d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Ion', availability: 'Licensed', weaponType: 'pistol', range: '10 squares', description: '<p>A pistol that fires ion bolts effective against droids.</p>' },
  { name: 'Sporting Blaster Pistol', size: 'Small', cost: 300, damage: '3d4', stunSetting: 'YES', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Licensed', weaponType: 'pistol', isAccurate: true, range: '15 squares', description: '<p>A civilian sporting pistol.</p>' },

  // Threats of the Galaxy
  { name: 'Sonic Stunner', size: 'Tiny', cost: 450, damage: '-', stunSetting: 'ONLY (3d6)', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Illegal', weaponType: 'pistol', range: '8 squares', description: '<p>A compact sonic stun weapon.</p>' },

  // Knights of the Old Republic Campaign Guide
  { name: 'Heavy Sonic Pistol', size: 'Medium', cost: 1250, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Sonic', availability: 'Licensed', weaponType: 'pistol', range: '15 squares', description: '<p>A powerful sonic pistol.</p>' },
  { name: 'Needler', size: 'Small', cost: 650, damage: '2d4', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Piercing', availability: 'Licensed', weaponType: 'pistol', isInaccurate: true, range: '10 squares', description: '<p>Fires poisoned needles.</p>' },
  { name: 'Pulse-Wave Pistol', size: 'Small', cost: 200, damage: '2d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Licensed', weaponType: 'pistol', isInaccurate: true, range: '12 squares', description: '<p>An early energy pistol design.</p>' },
  { name: 'Ripper', size: 'Small', cost: 750, damage: '2d4', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Slashing', availability: 'Licensed', weaponType: 'pistol', isInaccurate: true, range: '10 squares', description: '<p>A pistol that fires razor discs.</p>' },
  { name: 'Sonic Disruptor', size: 'Small', cost: 1000, damage: '2d6', stunSetting: 'NO', rateOfFire: 'Special', weight: '1 kg', type: 'Sonic', availability: 'Illegal', weaponType: 'pistol', range: '12 squares', description: '<p>An illegal sonic weapon.</p>' },

  // Force Unleashed Campaign Guide
  { name: 'Bryar Pistol', size: 'Medium', cost: 1350, damage: '3d4', stunSetting: 'NO', rateOfFire: 'S', weight: '3 kg', type: 'Energy', availability: 'Licensed', weaponType: 'pistol', isAccurate: true, range: '15 squares', description: '<p>A reliable civilian pistol.</p>' },

  // Scum and Villainy
  { name: 'Subrepeating Blaster', size: 'Medium', cost: 750, damage: '3d6', stunSetting: 'NO', rateOfFire: 'A', weight: '2 kg', type: 'Energy', availability: 'Military', weaponType: 'pistol', range: '15 squares', description: '<p>An automatic blaster pistol.</p>' },

  // Clone Wars Campaign Guide
  { name: 'Adjudicator Slugthrower', size: 'Tiny', cost: 325, damage: '2d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.5 kg', type: 'Piercing', availability: 'Licensed', weaponType: 'pistol', range: '8 squares', description: '<p>A compact slugthrower pistol.</p>' },
  { name: 'Defender MicroBlaster', size: 'Tiny', cost: 400, damage: '3d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.25 kg', type: 'Energy', availability: 'Illegal', weaponType: 'pistol', isInaccurate: true, range: '8 squares', description: '<p>A tiny concealed blaster.</p>' },
  { name: 'DH-23 Blaster Pistol', size: 'Small', cost: 500, damage: '3d6', stunSetting: 'YES', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Restricted', weaponType: 'pistol', range: '15 squares', description: '<p>A BlasTech security blaster.</p>' },
  { name: 'DT-12 Heavy Blaster', size: 'Medium', cost: 900, damage: '4d6', stunSetting: 'YES', rateOfFire: 'S', weight: '2 kg', type: 'Energy', availability: 'Military', weaponType: 'pistol', isInaccurate: true, range: '18 squares', description: '<p>A very powerful heavy blaster pistol.</p>' },
  { name: 'Model 434 DeathHammer', size: 'Medium', cost: 650, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '1.2 kg', type: 'Energy', availability: 'Restricted', weaponType: 'pistol', range: '15 squares', description: '<p>A popular bounty hunter sidearm.</p>' },

  // Legacy Era Campaign Guide
  { name: 'Bluebolt Blaster Pistol', size: 'Medium', cost: 850, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '1.6 kg', type: 'Energy', availability: 'Military', weaponType: 'pistol', isInaccurate: true, range: '18 squares', description: '<p>A military-issue blaster pistol.</p>' },
  { name: 'Snap-Shot Blaster Pistol', size: 'Tiny', cost: 250, damage: '3d6', stunSetting: 'NO', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Illegal', weaponType: 'pistol', range: '10 squares', description: '<p>A quick-draw concealed blaster.</p>' },

  // Galaxy at War
  { name: 'Ascension Gun', size: 'Medium', cost: 1200, damage: '3d8', stunSetting: 'YES', rateOfFire: 'S', weight: '2 kg', type: 'Energy', availability: 'Military', weaponType: 'pistol', isInaccurate: true, range: '15 squares', description: '<p>A grappling gun with blaster capability.</p>' },
  { name: 'Sidearm Blaster Pistol', size: 'Small', cost: 400, damage: '3d6', stunSetting: 'YES', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Military', weaponType: 'pistol', range: '15 squares', description: '<p>A standard military sidearm.</p>' },

  // Galaxy of Intrigue
  { name: 'Snare Pistol', size: 'Medium', cost: 600, damage: '-', stunSetting: 'ONLY (1d4)', rateOfFire: 'S', weight: '2 kg', type: 'Bludgeoning', availability: 'Licensed', weaponType: 'pistol', range: '10 squares', description: '<p>A non-lethal capture weapon.</p>' },
  { name: 'Wrist Blaster', size: 'Tiny', cost: 800, damage: '3d4', stunSetting: 'NO', rateOfFire: 'S', weight: '0.5 kg', type: 'Energy', availability: 'Illegal', weaponType: 'pistol', range: '8 squares', description: '<p>A concealed wrist-mounted blaster.</p>' },

  // Unknown Regions
  { name: 'Black-Powder Pistol', size: 'Small', cost: 200, damage: '2d4', stunSetting: 'NO', rateOfFire: 'S', weight: '1.4 kg', type: 'Piercing', availability: 'Rare', weaponType: 'pistol', isInaccurate: true, range: '10 squares', description: '<p>A primitive black powder firearm.</p>' },
  { name: 'Heavy Slugthrower Pistol', size: 'Medium', cost: 400, damage: '2d8', stunSetting: 'NO', rateOfFire: 'S', weight: '2.1 kg', type: 'Piercing', availability: 'Restricted', weaponType: 'pistol', range: '12 squares', description: '<p>A powerful slugthrower sidearm.</p>' },
  { name: 'Stun Pistol', size: 'Small', cost: 550, damage: '-', stunSetting: 'ONLY (3d6)', rateOfFire: 'S', weight: '1 kg', type: 'Energy', availability: 'Licensed', weaponType: 'pistol', range: '10 squares', description: '<p>A non-lethal stun weapon.</p>' },

  // Web Enhancements
  { name: 'S-5 Heavy Blaster Pistol', size: 'Medium', cost: 1000, damage: '3d8 or 1d2', stunSetting: 'YES', rateOfFire: 'S', weight: '1.3 kg', type: 'Energy or Piercing', availability: 'Military, Rare', weaponType: 'pistol', isInaccurate: true, range: '18 squares', description: '<p>A rare military pistol with dual firing modes.</p>' }
];

const HEAVY_WEAPONS = [
  // Core Rulebook
  { name: 'Grenade Launcher', size: 'Medium', cost: 500, damage: 'Special', stunSetting: 'Special', rateOfFire: 'S', weight: '5 kg', type: 'Varies', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '25 squares', description: '<p>Launches grenades at range.</p>' },
  { name: 'Heavy Repeating Blaster', size: 'Large', cost: 4000, damage: '3d10', stunSetting: 'NO', rateOfFire: 'A', weight: '12 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', range: '40 squares', description: '<p>A heavy automatic blaster.</p>' },
  { name: 'Blaster Cannon', size: 'Large', cost: 3000, damage: '3d12', stunSetting: 'NO', rateOfFire: 'S', weight: '18 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', isInaccurate: true, isAreaAttack: true, range: '50 squares', description: '<p>A powerful portable cannon.</p>' },
  { name: 'Missile Launcher', size: 'Large', cost: 1500, damage: '6d6', stunSetting: 'NO', rateOfFire: 'S', weight: '10 kg', type: 'Slashing', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '40 squares', description: '<p>Fires explosive missiles.</p>' },
  { name: 'E-Web Repeating Blaster', size: 'Huge', cost: 8000, damage: '3d12', stunSetting: 'NO', rateOfFire: 'A', weight: '38 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', range: '50 squares', description: '<p>A tripod-mounted heavy repeating blaster.</p>' },

  // Threats of the Galaxy
  { name: 'Light Concussion Missile Launcher', size: 'Large', cost: 4000, damage: '4d10x2', stunSetting: 'NO', rateOfFire: 'S', weight: '18 kg', type: 'Slashing', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '60 squares', description: '<p>Fires powerful concussion missiles.</p>' },

  // Knights of the Old Republic Campaign Guide
  { name: 'Carbonite Rifle', size: 'Large', cost: 1200, damage: '-', stunSetting: 'YES (Only, 3d10)', rateOfFire: 'S', weight: '6 kg', type: 'Energy', availability: 'Licensed', weaponType: 'heavy', range: '20 squares', description: '<p>Freezes targets in carbonite.</p>' },

  // Force Unleashed Campaign Guide
  { name: 'E-Web Missile Launcher', size: 'Huge', cost: 9500, damage: '6d6', stunSetting: 'NO', rateOfFire: 'S', weight: '42 kg', type: 'Slashing', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '60 squares', description: '<p>A tripod-mounted missile launcher.</p>' },

  // Scum and Villainy
  { name: 'Electronet', size: 'Medium', cost: 2000, damage: '-', stunSetting: 'YES (Only, 3d8)', rateOfFire: 'S', weight: '5 kg', type: 'Energy', availability: 'Restricted', weaponType: 'heavy', range: '10 squares', description: '<p>Fires an electrified capture net.</p>' },

  // Legacy Era Campaign Guide
  { name: 'Heavy Blaster Cannon', size: 'Huge', cost: 4200, damage: '4d12', stunSetting: 'NO', rateOfFire: 'S', weight: '22 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', isInaccurate: true, isAreaAttack: true, range: '60 squares', description: '<p>An extremely powerful heavy cannon.</p>' },

  // Rebellion Era Campaign Guide
  { name: 'PLX-2M Portable Missile Launcher', size: 'Large', cost: 2250, damage: '8d6', stunSetting: 'NO', rateOfFire: 'S', weight: '48 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '50 squares', description: '<p>A powerful portable missile system.</p>' },
  { name: 'Miniature Proton Torpedo Launcher', size: 'Large', cost: 1500, damage: '6d10', stunSetting: 'NO', rateOfFire: 'S', weight: '8 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '40 squares', description: '<p>A man-portable proton torpedo launcher.</p>' },

  // Galaxy at War
  { name: 'Flame Cannon', size: 'Huge', cost: 3000, damage: '5d6', stunSetting: 'NO', rateOfFire: 'S', weight: '15 kg', type: 'Fire', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '20 squares', description: '<p>A heavy flamethrower weapon.</p>' },
  { name: 'Mortar Launcher', size: 'Large', cost: 2500, damage: 'Varies', stunSetting: 'Varies', rateOfFire: 'S', weight: '20 kg', type: 'Slashing', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '100 squares', description: '<p>An indirect fire mortar system.</p>' },
  { name: 'Rotary Blaster Cannon', size: 'Large', cost: 5500, damage: '3d10', stunSetting: 'NO', rateOfFire: 'A', weight: '16 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', range: '45 squares', description: '<p>A multi-barrel rotary cannon.</p>' },
  { name: 'Tactical Tractor Beam', size: 'Huge', cost: 8000, damage: 'Special', stunSetting: 'NO', rateOfFire: 'S', weight: '25 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', range: '30 squares', description: '<p>A portable tractor beam projector.</p>' },

  // Web Enhancements
  { name: 'HH-15 Projectile Launcher', size: 'Large', cost: 2000, damage: '6d6', stunSetting: 'NO', rateOfFire: 'S', weight: '12 kg', type: 'Energy', availability: 'Military', weaponType: 'heavy', isInaccurate: true, range: '40 squares', description: '<p>A military projectile launcher.</p>' }
];

// ===== MAIN SCRIPT =====

// Read existing weapons database
const dbPath = path.join(__dirname, '..', 'packs', 'weapons.db');
let existingWeapons = [];
let existingNames = new Set();

try {
  const dbContent = fs.readFileSync(dbPath, 'utf-8');
  existingWeapons = dbContent.trim().split('\n').filter(line => line.trim());

  // Extract existing weapon names
  existingWeapons.forEach(line => {
    try {
      const weapon = JSON.parse(line);
      existingNames.add(weapon.name);
    } catch (e) {
      swseLogger.error('Error parsing existing weapon:', e.message);
    }
  });

  swseLogger.log(`Found ${existingNames.size} existing weapons`);
} catch (error) {
  swseLogger.log('No existing weapons database found, creating new one');
}

// Combine all new weapons
const allNewWeapons = [
  ...GRENADES,
  ...EXOTIC_WEAPONS,
  ...SIMPLE_WEAPONS,
  ...RIFLES,
  ...PISTOLS,
  ...HEAVY_WEAPONS
];

swseLogger.log(`\nProcessing ${allNewWeapons.length} weapons...`);

// Filter out weapons that already exist
const weaponsToAdd = allNewWeapons.filter(weapon => !existingNames.has(weapon.name));

swseLogger.log(`Found ${weaponsToAdd.length} new weapons to add\n`);

if (weaponsToAdd.length === 0) {
  swseLogger.log('No new weapons to add. All weapons already exist in database.');
  process.exit(0);
}

// Create weapon objects and convert to NDJSON
const newWeaponLines = weaponsToAdd.map(weaponData => {
  const weapon = createWeapon(weaponData);
  return JSON.stringify(weapon);
});

// Append to database
const newContent = newWeaponLines.join('\n') + '\n';

try {
  fs.appendFileSync(dbPath, newContent, 'utf-8');
  swseLogger.log(`✓ Successfully added ${weaponsToAdd.length} weapons to database`);
  swseLogger.log(`\nTotal weapons in database: ${existingNames.size + weaponsToAdd.length}`);

  // Show sample of added weapons
  swseLogger.log('\nSample of added weapons:');
  weaponsToAdd.slice(0, 10).forEach(w => {
    swseLogger.log(`  - ${w.name} (${w.weaponType})`);
  });

  if (weaponsToAdd.length > 10) {
    swseLogger.log(`  ... and ${weaponsToAdd.length - 10} more`);
  }
} catch (error) {
  swseLogger.error('Error writing to database:', error.message);
  process.exit(1);
}
