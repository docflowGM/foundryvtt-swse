/**
 * categorizer.js
 * ----------------
 * Unified Amazon-style department categorization engine.
 *
 * Each item receives:
 *   item.category     = High-level bucket ("Weapons", "Armor", "Tech")
 *   item.subcategory  = Detailed group ("Pistols", "Melee - Simple")
 */

import { safeString } from '../store-shared.js';

/* ---------------------------------------------------------- */
/* HIGH-LEVEL CATEGORIES                                      */
/* ---------------------------------------------------------- */

const Category = {
  WEAPONS: 'Weapons',
  ARMOR: 'Armor',
  MEDICAL: 'Medical',
  TECH: 'Tech',
  TOOLS: 'Tools',
  SURVIVAL: 'Survival',
  SECURITY: 'Security',
  EQUIPMENT: 'Equipment',
  SERVICES: 'Services',
  DROIDS: 'Droids',
  VEHICLES: 'Vehicles',
  OTHER: 'Other'
};

/* ---------------------------------------------------------- */
/* WEAPON SUBCATEGORY LOGIC                                   */
/* ---------------------------------------------------------- */

function categorizeWeapon(item) {
  const name = item.name.toLowerCase();
  const range = safeString(item.system?.range || '').toLowerCase();

  // MELEE
  if (range === 'melee' || name.includes('vibro') || name.includes('sword') || name.includes('blade')) {
    if (name.includes('light') || name.includes('saber')) {return 'Lightsabers';}
    if (name.includes('whip') || name.includes('lanvarok') || name.includes('net')) {return 'Exotic Melee';}
    if (name.includes('advanced')) {return 'Advanced Melee';}
    return 'Simple Melee';
  }

  // EXPLOSIVES
  if (name.includes('grenade') || name.includes('detonator') || name.includes('explosive')) {
    return 'Grenades';
  }

  // RANGED: Pistols
  if (name.includes('pistol') || name.includes('hold-out')) {
    return 'Pistols';
  }

  // RANGED: Rifles/Carbines
  if (name.includes('rifle') || name.includes('carbine') || name.includes('bowcaster') || name.includes('sniper')) {
    return 'Rifles';
  }

  // RANGED: Heavy
  if (
    name.includes('cannon') ||
    name.includes('launcher') ||
    name.includes('heavy') ||
    name.includes('repeating')
  ) {
    return 'Heavy Weapons';
  }

  // RANGED: Exotic
  if (
    name.includes('flamethrower') ||
    name.includes('wrist') ||
    name.includes('exotic') ||
    name.includes('lanvarok')
  ) {
    return 'Exotic Ranged';
  }

  // Default fallback
  return 'Other Weapons';
}

/* ---------------------------------------------------------- */
/* EQUIPMENT / GEAR LOGIC                                     */
/* ---------------------------------------------------------- */

function categorizeEquipment(item) {
  const name = item.name.toLowerCase();
  const desc = safeString(item.system?.description || '').toLowerCase();

  const text = name + ' ' + desc;

  if (text.includes('medpac') || text.includes('bacta') || text.includes('stim')) {
    return { cat: Category.MEDICAL, sub: 'Supplies' };
  }
  if (text.includes('comlink') || text.includes('datapad') || text.includes('scanner') || text.includes('computer')) {
    return { cat: Category.TECH, sub: 'Electronics' };
  }
  if (text.includes('tool') || text.includes('kit') || text.includes('fusion cutter')) {
    return { cat: Category.TOOLS, sub: 'Tools & Kits' };
  }
  if (text.includes('survival') || text.includes('rations') || text.includes('breath mask') || text.includes('rope')) {
    return { cat: Category.SURVIVAL, sub: 'Survival Gear' };
  }
  if (text.includes('lock') || text.includes('binder') || text.includes('security')) {
    return { cat: Category.SECURITY, sub: 'Security Gear' };
  }

  // Fallback
  return { cat: Category.EQUIPMENT, sub: 'General Gear' };
}

/* ---------------------------------------------------------- */
/* DROID LOGIC                                                 */
/* ---------------------------------------------------------- */

function categorizeDroid(item) {
  const name = item.name.toLowerCase();
  const sys = item.system || {};

  if (sys.class?.toLowerCase().includes('protocol')) {return { cat: Category.DROIDS, sub: 'Protocol' };}
  if (sys.class?.toLowerCase().includes('astromech')) {return { cat: Category.DROIDS, sub: 'Astromech' };}
  if (sys.class?.toLowerCase().includes('combat')) {return { cat: Category.DROIDS, sub: 'Combat' };}
  if (sys.class?.toLowerCase().includes('utility')) {return { cat: Category.DROIDS, sub: 'Utility' };}

  if (name.includes('protocol')) {return { cat: Category.DROIDS, sub: 'Protocol' };}
  if (name.includes('astromech')) {return { cat: Category.DROIDS, sub: 'Astromech' };}

  return { cat: Category.DROIDS, sub: 'General Droid' };
}

/* ---------------------------------------------------------- */
/* VEHICLE LOGIC                                               */
/* ---------------------------------------------------------- */

function categorizeVehicle(item) {
  const name = item.name.toLowerCase();

  if (name.includes('swoop') || name.includes('speeder')) {
    return { cat: Category.VEHICLES, sub: 'Speeders' };
  }
  if (name.includes('starship') || name.includes('freighter') || name.includes('fighter')) {
    return { cat: Category.VEHICLES, sub: 'Starships' };
  }
  if (name.includes('walker') || name.includes('at-st') || name.includes('at-te')) {
    return { cat: Category.VEHICLES, sub: 'Walkers' };
  }

  return { cat: Category.VEHICLES, sub: 'General Vehicle' };
}

/* ---------------------------------------------------------- */
/* MASTER CATEGORIZER                                          */
/* ---------------------------------------------------------- */

/**
 * Assign category & subcategory to a normalized store item.
 *
 * @param {StoreItem} item
 */
export function categorizeItem(item) {
  const type = item.type;

  // WEAPONS
  if (type === 'weapon') {
    item.category = Category.WEAPONS;
    item.subcategory = categorizeWeapon(item);
    return item;
  }

  // ARMOR
  if (type === 'armor') {
    item.category = Category.ARMOR;
    item.subcategory = 'Armor';
    return item;
  }

  // DROID ACTORS
  if (type === 'droid') {
    const { cat, sub } = categorizeDroid(item);
    item.category = cat;
    item.subcategory = sub;
    return item;
  }

  // VEHICLE ACTORS
  if (type === 'vehicle') {
    const { cat, sub } = categorizeVehicle(item);
    item.category = cat;
    item.subcategory = sub;
    return item;
  }

  // EQUIPMENT
  const { cat, sub } = categorizeEquipment(item);
  item.category = cat;
  item.subcategory = sub;
  return item;
}

/**
 * Categorize ALL items.
 *
 * @param {Array<StoreItem>} items
 * @returns {Array<StoreItem>}
 */
export function categorizeAll(items) {
  return items.map(i => categorizeItem(i));
}
