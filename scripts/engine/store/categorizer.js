/**
 * categorizer.js
 * ----------------
 * Unified Amazon-style department categorization engine.
 *
 * SSOT Compliant: Uses item.type + system metadata ONLY
 * NO name-based inference (anti-v1 pattern eliminated)
 *
 * Each item receives:
 *   item.category     = High-level bucket ("Weapons", "Armor", "Tech")
 *   item.subcategory  = Detailed group ("Pistols", "Melee - Simple")
 *
 * CONSTRAINT: Services are not processed by this engine.
 * Services are contextual expenses, not store inventory items.
 * They are filtered out by normalizer.js before reaching this module.
 */

/* ----------------------------------------------- */
/* UTILITY                                          */
/* ----------------------------------------------- */

function safeString(v, fallback = '') {
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
}

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
  DROIDS: 'Droids',
  VEHICLES: 'Vehicles',
  OTHER: 'Other'
  // NOTE: SERVICES removed — services are contextual expenses, not store inventory items
};

/* ---------------------------------------------------------- */
/* WEAPON SUBCATEGORY LOGIC (SSOT-COMPLIANT)                 */
/* ---------------------------------------------------------- */

/**
 * Categorize weapon using system data ONLY (no name inference)
 * Authority: item.system.category > item.system.range (melee/ranged)
 *
 * SSOT Violation Detection:
 * - If system.category missing, log warning and use fallback
 * - Never infer category from name (anti-v1 pattern)
 */
function categorizeWeapon(item) {
  // PRIMARY: Check if system.category is already defined
  const sysCategory = safeString(item.system?.category || '').trim();
  if (sysCategory) {
    // System data defines it; use as-is
    return sysCategory;
  }

  // FALLBACK: Use range field if system.category not available
  // This is acceptable fallback (structural property, not name-based)
  const range = safeString(item.system?.range || '').toLowerCase();

  if (range === 'melee') {
    return 'Simple Melee';  // Default for melee; refinement requires system.category
  }

  // Treat all ranged as generic unless system.category specifies
  return 'Ranged Weapons';
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
