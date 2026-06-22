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
 * Canonical, player-facing weapon subcategory labels keyed by the values found
 * in item.system.category. Title-cased so the store subnav reads cleanly
 * (matching how Armor renders "Light Armor", "Heavy Armor", etc.).
 */
const WEAPON_CATEGORY_LABELS = {
  simple: 'Simple Weapons',
  advanced: 'Advanced Melee',
  lightsaber: 'Lightsabers',
  pistol: 'Pistols',
  pistols: 'Pistols',
  rifle: 'Rifles',
  rifles: 'Rifles',
  heavy: 'Heavy Weapons',
  grenade: 'Grenades',
  grenades: 'Grenades',
  exotic: 'Exotic Weapons'
};

/**
 * Fallback mapping from the source compendium pack to a canonical subcategory.
 * Weapons are split by subtype across packs, so the pack is an authoritative
 * signal when system.category is missing (e.g. lightsabers carry no category).
 */
const WEAPON_PACK_LABELS = {
  'weapons-simple': 'Simple Weapons',
  'weapons-pistols': 'Pistols',
  'weapons-rifles': 'Rifles',
  'weapons-heavy': 'Heavy Weapons',
  'weapons-grenades': 'Grenades',
  'weapons-exotic': 'Exotic Weapons',
  'weapons-lightsabers': 'Lightsabers'
};

/**
 * Categorize weapon into a clean, canonical subtype.
 *
 * Authority order (no name inference — anti-v1 pattern):
 *   1. system.category mapped to a canonical label
 *   2. source compendium pack (weapons are split by subtype across packs)
 *   3. system.range as a last-resort structural fallback
 */
function getWeaponRangeFamily(item) {
  const sys = item.system || {};
  const weaponCategory = safeString(sys.weaponCategory || '').toLowerCase();
  const range = safeString(sys.range || sys.rangeType || '').toLowerCase();
  if (weaponCategory.includes('melee') || range === 'melee') return 'melee';
  if (weaponCategory.includes('ranged') || /\d/.test(range) || range.includes('squares')) return 'ranged';
  return '';
}

function splitWeaponSubtype(label, item) {
  const family = getWeaponRangeFamily(item);
  if (label === 'Simple Weapons') {
    return family === 'melee' ? 'Simple Melee' : 'Simple Ranged';
  }
  if (label === 'Exotic Weapons') {
    return family === 'melee' ? 'Exotic Melee' : 'Exotic Ranged';
  }
  return label;
}

function categorizeWeapon(item) {
  // PRIMARY: map system.category to a canonical label.
  const sysCategory = safeString(item.system?.category || '').toLowerCase();
  if (sysCategory && WEAPON_CATEGORY_LABELS[sysCategory]) {
    return splitWeaponSubtype(WEAPON_CATEGORY_LABELS[sysCategory], item);
  }

  // SECONDARY: derive from the source pack (split-by-subtype compendiums).
  const pack = safeString(item.sourcePack || '').toLowerCase();
  for (const [packKey, label] of Object.entries(WEAPON_PACK_LABELS)) {
    if (pack.includes(packKey)) {
      return splitWeaponSubtype(label, item);
    }
  }

  // If system.category held an unmapped but non-empty value, preserve it
  // (Title-cased) rather than discarding the authored data.
  if (sysCategory) {
    return sysCategory.charAt(0).toUpperCase() + sysCategory.slice(1);
  }

  // FALLBACK: structural range field (not name-based).
  const range = safeString(item.system?.range || '').toLowerCase();
  if (range === 'melee') {
    return 'Advanced Melee';
  }

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



const DROID_DEGREE_LABELS = {
  '1': '1st-Degree Droid Models',
  '2': '2nd-Degree Droid Models',
  '3': '3rd-Degree Droid Models',
  '4': '4th-Degree Droid Models',
  '5': '5th-Degree Droid Models'
};

const VEHICLE_CANONICAL_SUBCATEGORIES = [
  'Speeders',
  'Tracked Vehicles',
  'Walkers',
  'Wheeled Vehicles',
  'Weapon Emplacements',
  'Airspeeders',
  'Starfighters',
  'Space Transports',
  'Capital Ships',
  'Space Stations'
];

function normalizeLooseText(value = '') {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function droidDegreeKey(value = '') {
  const compact = String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (compact.includes('1st') || compact.includes('first') || compact === '1') return '1';
  if (compact.includes('2nd') || compact.includes('second') || compact === '2') return '2';
  if (compact.includes('3rd') || compact.includes('third') || compact === '3') return '3';
  if (compact.includes('4th') || compact.includes('fourth') || compact === '4') return '4';
  if (compact.includes('5th') || compact.includes('fifth') || compact === '5') return '5';
  return '';
}

function vehicleLabelFromCanonicalText(value = '') {
  const text = normalizeLooseText(value);
  if (!text) return '';
  for (const label of VEHICLE_CANONICAL_SUBCATEGORIES) {
    if (text === normalizeLooseText(label)) return label;
  }
  return '';
}

function vehicleTextBlob(item) {
  const sys = item.system || {};
  const weaponLabels = Array.isArray(sys.weapons)
    ? sys.weapons.map(w => w?.name || '').join(' ')
    : '';
  const tags = Array.isArray(sys.tags) ? sys.tags.join(' ') : '';
  return normalizeLooseText([
    item.name,
    sys.name,
    sys.vehicleSubtype,
    sys.subcategory,
    sys.category,
    sys.type,
    tags,
    weaponLabels,
    item.sourcePack
  ].filter(Boolean).join(' '));
}

function categorizeVehicleSubtype(item) {
  const sys = item.system || {};

  // Explicit authored category/type/subtype wins when it is one of the store buckets.
  for (const value of [sys.vehicleSubtype, sys.subcategory, sys.category, sys.type]) {
    const direct = vehicleLabelFromCanonicalText(value);
    if (direct) return direct;
  }

  // Imported vehicle weapons often preserve the exact source-page section name.
  if (Array.isArray(sys.weapons)) {
    for (const weapon of sys.weapons) {
      const direct = vehicleLabelFromCanonicalText(weapon?.name);
      if (direct) return direct;
    }
  }

  const text = vehicleTextBlob(item);
  const phraseRules = [
    [/\bweapon emplacements?\b/, 'Weapon Emplacements'],
    [/\bspace stations?\b/, 'Space Stations'],
    [/\bcapital ships?\b/, 'Capital Ships'],
    [/\bspace transports?\b/, 'Space Transports'],
    [/\bstarfighters?\b/, 'Starfighters'],
    [/\bairspeeders?\b/, 'Airspeeders'],
    [/\btracked vehicles?\b/, 'Tracked Vehicles'],
    [/\bwheeled vehicles?\b/, 'Wheeled Vehicles'],
    [/\bwalkers?\b/, 'Walkers'],
    [/\bspeeders?\b/, 'Speeders']
  ];
  for (const [rx, label] of phraseRules) {
    if (rx.test(text)) return label;
  }

  // Name/tag fallbacks for imperfect imports.
  if (/\b(at at|at st|at ap|at rt|at te|at pt|at xt|at ct|at kt|at rct|at aht|spider droid|tri droid)\b/.test(text)) return 'Walkers';
  if (/\b(crawler|tracked|landmaster|sandcrawler|tread|treads)\b/.test(text)) return 'Tracked Vehicles';
  if (/\b(wheel|wheeled|roller|groundcar|juggernaut|hailfire)\b/.test(text)) return 'Wheeled Vehicles';
  if (/\b(emplacement|battery|anti aircraft|anti infantry|planet defender|p tower|sonic cannon|antivehicle cannon)\b/.test(text)) return 'Weapon Emplacements';
  if (/\b(spha|self propelled heavy artillery|at ut|ut at)\b/.test(text)) return 'Walkers';
  if (/\b(cloud car|drop pod|fluttercraft|aerosled|radair|air 2|gnasp|jet catamaran|aerial artillery|laati|laatc|laat|stap|landing sphere|hovercraft|refinery platform|basilisk war droid)\b/.test(text)) return 'Airspeeders';
  if (/\b(station|spacedock|platform|beacon|starforge|star forge|executor|eclipse|lusankya|viscount|the wheel)\b/.test(text)) return 'Space Stations';
  if (/\b(corvette|frigate|cruiser|destroyer|dreadnaught|dreadnought|battlecruiser|battleship|carrier|star destroyer|crimson axe|indomitable|invisible hand|outbound flight|sabertooth class assault rescue vessel|ipv 1 system patrol craft|acclamator i class assault ship|acclamator ii class assault ship)\b/.test(text)) return 'Capital Ships';
  if (/\b(freighter|transport|shuttle|courier|yacht|scout ship|gunship|landing craft|sloop|hauler|blastboat|salvage ship|caravel cabin|bloody credit|shackles of nizon|grinning liar|last resort|ebon hawk|mynock|millennium falcon|visionary|doomtreader)\b/.test(text)) return 'Space Transports';
  if (/\b(fighter|interceptor|bomber|x wing|y wing|tie|headhunter|clawcraft|dartship|subfighter|escape pod|virago|coralskipper)\b/.test(text)) return 'Starfighters';
  if (/\b(swoop|landspeeder|speeder|skiff|repulsor|tank|sled|speeder bike|chariot|u lav|mr rv|mrrv|mtt|pac|rtt|aat 1|laser borer|meekun heavy tracker|mekuun heavy tracker|kaac freerunner)\b/.test(text)) return 'Speeders';

  return 'General Vehicles';
}

/* ---------------------------------------------------------- */
/* DROID LOGIC                                                 */
/* ---------------------------------------------------------- */

function categorizeDroid(item) {
  const name = item.name.toLowerCase();
  const sys = item.system || {};
  const degreeKey = droidDegreeKey(sys.degree || sys.droidDegree || sys.class || name);
  if (degreeKey && DROID_DEGREE_LABELS[degreeKey]) {
    return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS[degreeKey] };
  }

  // Conservative fallbacks for legacy/homebrew droids missing system.degree.
  const droidText = `${name} ${safeString(sys.class || '')} ${safeString(sys.role || '')} ${safeString(sys.category || '')}`.toLowerCase();
  if (/medical|medic|surgical|midwife|analytical|analysis|archive|interrogat/.test(droidText)) {return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS['1'] };}
  if (/astromech|maintenance|mechanic|repair|tech|slicer|weapons maintenance|demolition|pilot|comm|communications|infrastructure|spaceport|control|minesweeper/.test(droidText)) {return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS['2'] };}
  if (/protocol|secretary|administrative|administration|valet|hospitality|service|footman|messenger|dealer|luxury|domestic|supervisor/.test(droidText)) {return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS['3'] };}
  if (/assassin|assault|battle|combat|commando|destroyer|spider|guardian|guard|patrol|sentinel|sentry|seeker|probe|surveillance|espionage|infiltrat|scout|recon|observation|tactical|artillery|infantry|legionnaire|hunter.?killer|warden|war|turret|lightsaber|sabotage|annihilator|picket|training|security|crab|buzz|lancer|hk-|hk_|gunnery|shadow|viper/.test(droidText)) {return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS['4'] };}
  if (/utility|labor|loader|loading|mining|smelter|power|construction|worker|excavation|sifter|mule|gatekeeper|pit|agromech|exploration|explorer|surveyor|survey|spelunker|junk|holocam|ro-d/.test(droidText)) {return { cat: Category.DROIDS, sub: DROID_DEGREE_LABELS['5'] };}

  return { cat: Category.DROIDS, sub: 'General Droid Models' };
}

/* ---------------------------------------------------------- */
/* VEHICLE LOGIC                                               */
/* ---------------------------------------------------------- */

function categorizeVehicle(item) {
  return { cat: Category.VEHICLES, sub: categorizeVehicleSubtype(item) };
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
