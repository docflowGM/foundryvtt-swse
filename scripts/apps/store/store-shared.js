/**
 * store-shared.js - Hardened helpers and Rendarr dialogue
 *
 * Defensive helpers:
 * - normalizeNumber / getCostValue / getCostDisplay
 * - safeString / safeImg / safeSystem
 * - tryRender / isValidItemForStore
 *
 * Also contains Rendarr dialogue and utility helpers for categorization/sorting.
 */


function storeI18n(key, data = {}) {
  try {
    return game.i18n?.format?.(key, data) ?? game.i18n?.localize?.(key) ?? key;
  } catch (_err) {
    return key;
  }
}

function storeTranslationValue(path) {
  try {
    return foundry.utils?.getProperty?.(game.i18n?.translations || {}, path);
  } catch (_err) {
    return undefined;
  }
}

function localizedStoreArray(path, fallback = []) {
  const value = storeTranslationValue(path);
  if (Array.isArray(value) && value.length) {
    return value.filter(line => typeof line === 'string' && line.trim());
  }
  return Array.isArray(fallback) ? fallback : [];
}

export function normalizeNumber(value) {
  if (value === undefined || value === null) {return null;}
  if (typeof value === 'number') {return Number.isFinite(value) ? value : null;}
  if (typeof value === 'object') {
    if ('value' in value) {return normalizeNumber(value.value);}
    return null;
  }
  const s = String(value).trim();
  if (s.length === 0) {return null;}
  const lower = s.toLowerCase();
  const placeholders = ['varies','see','negotiat','included','—','-','n/a','na','unknown','special'];
  for (const p of placeholders) {if (lower.includes(p)) {return null;}}
  let cleaned = s.replace(/[,¢$€£₹]/g,'');
  cleaned = cleaned.replace(/\s*cr\b/i,'');
  cleaned = cleaned.replace(/\(.+\)/g,'');
  cleaned = cleaned.replace(/[^\d.-]/g,'');
  if (cleaned === '' || cleaned === '-' || cleaned === '—') {return null;}
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function getCostValue(item) {
  if (!item) {return null;}
  const sys = safeSystem(item);
  if (!sys) {return null;}
  const maybe = sys.cost ?? sys.price ?? item.cost ?? null;
  return normalizeNumber(maybe);
}

export function getCostDisplay(item, opts={}) {
  const currencySuffix = opts.suffix ?? ' cr';
  const sys = safeSystem(item);
  const rawSource = sys ? (sys.cost ?? sys.price ?? item.cost ?? null) : (item?.cost ?? null);
  const num = getCostValue(item);
  if (num !== null) {
    try { return num.toLocaleString() + currencySuffix; } catch (e) { return String(num) + currencySuffix; }
  }
  if (rawSource === undefined || rawSource === null || String(rawSource).trim() === '') {return '—';}
  return String(rawSource).trim();
}

export function safeString(value, fallback='') {
  if (value === undefined || value === null) {return fallback;}
  return String(value).trim();
}

export function safeImg(item) {
  if (!item) {return 'icons/svg/mystery-man.svg';}
  if (typeof item.img === 'string' && item.img.trim().length>0) {return item.img;}
  const sys = safeSystem(item);
  if (sys && typeof sys.img === 'string' && sys.img.trim().length>0) {return sys.img;}
  return 'icons/svg/mystery-man.svg';
}

export function safeSystem(item) {
  if (!item || typeof item !== 'object') {return null;}
  const sys = item.system ?? item.data ?? null;
  if (!sys || typeof sys !== 'object') {return null;}
  return sys;
}

export function tryRender(fn, context='store') {
  try { return fn(); } catch (err) {
    const logger = globalThis.swseLogger || console;
    logger.error(`SWSE Store (${context}) — render error:`, err);
    return null;
  }
}

export function isValidItemForStore(item) {
  if (!item) {return false;}
  if (!safeSystem(item) && (!item.name || item.name.trim()==='')) {return false;}
  if (item.flags && item.flags.swse && item.flags.swse.excludeFromStore) {return false;}
  return true;
}

/* ---------------- RENDARR DIALOGUE (preserved) ---------------- */

export function getRendarrDialogue() {
    return {
        weapons: [
            "Ah, looking for something with a bit of kick, are we? I've got just the thing!",
            "Weapons! Now we're talking! Nothing says 'hello' like a well-aimed blaster bolt!",
            "You've got good taste, lad! These beauties never let you down!",
            "Excellent choice! Though I hope you won't be pointing any of these at me, eh?",
            'The finest armaments this side of the Core Worlds, I assure you!',
            'A weapon is only as good as the person wielding it... but these are VERY good!',
            "Now these'll make those scoundrels think twice before crossing you!",
            'Hah! I remember when I used to sling one of these myself. Good times!',
            'Quality craftsmanship! Not like those cheap knockoffs from Nar Shaddaa.',
            "You'll be the most well-armed customer I've had all week!",
            'These babies pack more punch than a Wookiee with a grudge!'
        ],
        armor: [
            "Smart thinking! Can't spend credits if you're dead, now can you?",
            'Armor! The difference between a close call and a funeral!',
            'Ah, the cautious type! I like that in a customer!',
            'Nothing wrong with a little extra protection, especially these days!',
            "These'll keep you in one piece! Trust me, I've seen the alternative!"
        ],
        grenades: [
            'Ah, for when you need to make a big impression! Very big!',
            "Explosives! Handle with care... or don't, I'm not responsible!",
            "Planning a party, are we? These'll really liven things up!"
        ],
        medical: [
            "Wise investment! Can't enjoy your purchases if you're dead!",
            "Medical supplies! For when things don't go according to plan!",
            'Ah, the responsible shopper! I like your style!'
        ],
        tech: [
            "Ah, a tech enthusiast! I've got gadgets that'll make your life easier!",
            "Technology! The civilized person's toolkit!",
            'These little beauties can get you out of all sorts of trouble!'
        ],
        tools: [
            'Tools! For when you need to fix things instead of destroying them!',
            'Ah, a practical soul! I appreciate that!',
            'Every good technician needs quality tools! And here they are!'
        ],
        survival: [
            'Planning a trip into the wilds? I admire your bad decisions.',
            'Survival gear—perfect for when everything inevitably goes wrong.',
            'I used this model once. Still got the scars.'
        ],
        security: [
            'Security gear—keep others out, or keep yourself in. No judgment.',
            'Good locks make good neighbors. Angry neighbors, but still.'
        ],
        equipment: [
            'General equipment aisle! The backbone of any adventurer.',
            'Boring? Maybe. Useful? Absolutely.',
            'This stuff keeps missions running. Heroes love to forget that part.'
        ],
        droids: [
            'Droids! Loyal, tireless, and they never complain about working conditions!',
            "Ah, looking for a mechanical companion? Best decision you'll ever make!"
        ],
        vehicles: [
            "Vehicles! For when walking just won't cut it!",
            'Ah, shopping for wheels! Or repulsorlifts! Or hyperdrives!'
        ],
        services: [
            'Services! The necessities of civilized life!',
            'Ah, need something done? I know a guy. Or I *am* the guy.'
        ],
        cart: [
            'Ah, reviewing your selections! Take your time, no rush!',
            'The cart! Where dreams become purchases!'
        ],
        gm: [
            'Ah, the GM controls! Changing the rules, are we?',
            "The secret back room! Don't tell the customers!"
        ],
        purchase: [
            "Excellent choice! You won't regret it!",
            'Sold! Pleasure doing business with you!'
        ],
        welcome: [
            "Welcome to my shop, lad! Spend to your heart's desire!",
            "Ah, a customer! Welcome! Everything's for sale!"
        ]
    };
}

export function getRandomDialogue(context) {
    const fallback = getRendarrDialogue()[context];
    const dialogues = localizedStoreArray(`SWSE.Store.Rendarr.${context}`, fallback);
    if (!dialogues || dialogues.length === 0) {
        return storeI18n('SWSE.Store.RendarrFallback', { default: "I've got what you need, lad!" });
    }
    return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/* ---------------- Categorization / Sorting helpers ---------------- */

export function categorizeEquipment(item) {
    const name = (item?.name || '').toString().toLowerCase();
    const desc = (item?.system?.description || '').toString().toLowerCase();
    const text = name + ' ' + desc;
    if (text.includes('grenade') || text.includes('detonator')) {return 'grenades';}
    if (text.includes('medpac') || text.includes('bacta')) {return 'medical';}
    if (text.includes('comlink') || text.includes('datapad')) {return 'tech';}
    if (text.includes('tool') || text.includes('kit')) {return 'tools';}
    return 'equipment';
}

export function sortWeapons(weapons) {
    // simple alphabetical fallback
    return weapons.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
}

export function sortArmor(armors) {
    return armors.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
}

export function getRarityClass(availability) {
    if (!availability) {return null;}
    const normalized = availability.toString().toLowerCase();
    if (normalized.includes('rare')) {return 'rare';}
    if (normalized.includes('illegal')) {return 'illegal';}
    if (normalized.includes('military')) {return 'military';}
    if (normalized.includes('restricted')) {return 'restricted';}
    return null;
}

export function getRarityLabel(rarityClass) {
    const labels = {
      rare: storeI18n('SWSE.Store.Filters.Rare'),
      illegal: storeI18n('SWSE.Store.Filters.Illegal'),
      military: storeI18n('SWSE.Store.Filters.Military'),
      restricted: storeI18n('SWSE.Store.Filters.Restricted')
    };
    return labels[rarityClass] || '';
}

/* ────────────────────────────────────────────────────────────────
   PHASE 2: HIERARCHICAL NAVIGATION MODEL

   Builds a canonical navigation structure from StoreEngine inventory.
   Exposes subcategories and optional family groupings without mutating
   source data. View-model only; does not persist.
   ──────────────────────────────────────────────────────────────── */

/**
 * Normalize weapon subcategory names into weapon families.
 * Returns 'melee' or 'ranged' based on subcategory content.
 *
 * @param {string} subcategory - e.g., "Pistols", "Simple Melee", "Lightsabers"
 * @returns {string} 'melee' | 'ranged'
 */
export function getWeaponFamily(subcategory = '') {
  const sub = String(subcategory || '').toLowerCase();

  // Explicit mapping for canonical subtype labels (authoritative).
  const explicit = {
    'simple weapons': 'ranged',
    'simple ranged': 'ranged',
    'simple melee': 'melee',
    'pistols': 'ranged',
    'rifles': 'ranged',
    'heavy weapons': 'ranged',
    'grenades': 'ranged',
    'ranged weapons': 'ranged',
    'advanced melee': 'melee',
    'lightsabers': 'melee',
    'exotic weapons': 'ranged',
    'exotic ranged': 'ranged',
    'exotic melee': 'melee'
  };
  if (explicit[sub]) {
    return explicit[sub];
  }

  // Substring fallback for any non-canonical/legacy labels.
  if (sub.includes('melee') || sub.includes('lightsaber')) {
    return 'melee';
  }
  if (sub.includes('ranged') || sub.includes('pistol') || sub.includes('rifle') || sub.includes('heavy') || sub.includes('grenade')) {
    return 'ranged';
  }
  return 'ranged'; // Default fallback
}

/**
 * Normalize armor subcategories to player-facing labels.
 * Returns normalized armor type based on item metadata.
 *
 * @param {Object} item - Store item with system.armorType or name
 * @returns {string} 'Light Armor' | 'Medium Armor' | 'Heavy Armor' | 'Energy Shields'
 */
export function normalizeArmorSubcategory(item = {}) {
  const sys = safeSystem(item) || {};
  const name = String(item.name || '').toLowerCase();
  const armorType = String(sys.armorType || sys.category || '').toLowerCase();

  // Check explicit armor type field first
  if (armorType.includes('light')) return 'Light Armor';
  if (armorType.includes('medium')) return 'Medium Armor';
  if (armorType.includes('heavy')) return 'Heavy Armor';

  // Check name for patterns
  if (name.includes('light') || name.includes('cloth') || name.includes('padded')) return 'Light Armor';
  if (name.includes('medium') || name.includes('composite')) return 'Medium Armor';
  if (name.includes('heavy') || name.includes('reinforced') || name.includes('military')) return 'Heavy Armor';
  if (name.includes('shield') || name.includes('energy') || name.includes('deflection')) return 'Energy Shields';

  // Check for energy shield patterns
  if (armorType.includes('shield') || armorType.includes('energy') || armorType.includes('deflect')) {
    return 'Energy Shields';
  }

  // Default to Medium Armor if no match
  return 'Medium Armor';
}

/**
 * Build a canonical navigation model from StoreEngine inventory index.
 *
 * Returns a navigation structure that exposes category/subcategory hierarchy
 * without flattening or mutating source data.
 *
 * @param {Object} inventory - StoreEngine.getInventory().inventory
 * @param {Object} options - { activeCategory, activeSubcategory }
 * @returns {Object} navigationModel
 *
 * Navigation model structure:
 * {
 *   topCategories: [
 *     { key: 'all', label: 'All', count, active },
 *     { key: 'weapons', label: 'Weapons', count, active, children: [...] },
 *     ...
 *   ],
 *   activeCategory: string,
 *   activeSubcategory: string | null,
 *   activeFamily: string | null (weapons only)
 * }
 */


const DROID_DEGREE_DEFINITIONS = [
  { key: '1st-degree', label: '1st-Degree', subcategory: '1st-Degree: Medical & Analytical', description: 'Medical and analytical Droids' },
  { key: '2nd-degree', label: '2nd-Degree', subcategory: '2nd-Degree: Mechanical & Technical', description: 'Mechanical and technical Droids' },
  { key: '3rd-degree', label: '3rd-Degree', subcategory: '3rd-Degree: Protocol & Domestic', description: 'Protocol and domestic Droids' },
  { key: '4th-degree', label: '4th-Degree', subcategory: '4th-Degree: Security & Battle', description: 'Security and battle Droids' },
  { key: '5th-degree', label: '5th-Degree', subcategory: '5th-Degree: Labor & Utility', description: 'Labor and utility Droids' }
];

const VEHICLE_SUBCATEGORY_DEFINITIONS = [
  { key: 'speeders', label: 'Speeders', family: 'ground', familyLabel: 'Ground Vehicles' },
  { key: 'tracked-vehicles', label: 'Tracked Vehicles', family: 'ground', familyLabel: 'Ground Vehicles' },
  { key: 'walkers', label: 'Walkers', family: 'ground', familyLabel: 'Ground Vehicles' },
  { key: 'wheeled-vehicles', label: 'Wheeled Vehicles', family: 'ground', familyLabel: 'Ground Vehicles' },
  { key: 'weapon-emplacements', label: 'Weapon Emplacements', family: 'ground', familyLabel: 'Ground Vehicles' },
  { key: 'airspeeders', label: 'Airspeeders', family: 'air', familyLabel: 'Air Vehicles' },
  { key: 'starfighters', label: 'Starfighters', family: 'starship', familyLabel: 'Starships' },
  { key: 'space-transports', label: 'Space Transports', family: 'starship', familyLabel: 'Starships' },
  { key: 'capital-ships', label: 'Capital Ships', family: 'starship', familyLabel: 'Starships' },
  { key: 'space-stations', label: 'Space Stations', family: 'starship', familyLabel: 'Starships' }
];

const VEHICLE_ROLE_DEFINITIONS = {
  speeders: [
    { key: 'bikes-and-swoops', label: 'Bikes & Swoops' },
    { key: 'landspeeder', label: 'Landspeeder' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'luxury', label: 'Luxury' },
    { key: 'patrol', label: 'Patrol' },
    { key: 'military', label: 'Military' },
    { key: 'tanks', label: 'Tanks' },
    { key: 'industrial', label: 'Industrial' },
    { key: 'other', label: 'Other' }
  ],
  'tracked-vehicles': [
    { key: 'tanks', label: 'Tanks' },
    { key: 'base', label: 'Base' },
    { key: 'artillery', label: 'Artillery' },
    { key: 'scout', label: 'Scout' },
    { key: 'crawler', label: 'Crawler' },
    { key: 'industrial', label: 'Industrial' },
    { key: 'other', label: 'Other' }
  ],
  walkers: [
    { key: 'scout', label: 'Scout' },
    { key: 'assault', label: 'Assault' },
    { key: 'heavy', label: 'Heavy' },
    { key: 'artillery', label: 'Artillery' },
    { key: 'droid', label: 'Droid' },
    { key: 'other', label: 'Other' }
  ],
  'wheeled-vehicles': [
    { key: 'bikes', label: 'Bikes' },
    { key: 'cars', label: 'Cars' },
    { key: 'tanks', label: 'Tanks' },
    { key: 'transports', label: 'Transports' },
    { key: 'utility', label: 'Utility' },
    { key: 'other', label: 'Other' }
  ],
  'weapon-emplacements': [
    { key: 'anti-personnel', label: 'Anti-Personnel' },
    { key: 'anti-vehicle', label: 'Anti-Vehicle' },
    { key: 'anti-air', label: 'Anti-Air' },
    { key: 'anti-starship', label: 'Anti-Starship' },
    { key: 'planetary-defense', label: 'Planetary Defense' },
    { key: 'turrets-batteries', label: 'Turrets & Batteries' },
    { key: 'other', label: 'Other' }
  ],
  airspeeders: [
    { key: 'civilian', label: 'Civilian' },
    { key: 'cloud', label: 'Cloud' },
    { key: 'gunships', label: 'Gunships' },
    { key: 'dropship', label: 'Dropship' },
    { key: 'patrol', label: 'Patrol' },
    { key: 'medical', label: 'Medical' },
    { key: 'artillery', label: 'Artillery' },
    { key: 'industrial', label: 'Industrial' },
    { key: 'platform', label: 'Platform' },
    { key: 'racing', label: 'Racing' }
  ],
  starfighters: [
    { key: 'interceptors', label: 'Interceptors' },
    { key: 'superiority', label: 'Superiority' },
    { key: 'bombers', label: 'Bombers' },
    { key: 'assault', label: 'Assault' },
    { key: 'droid', label: 'Droid' },
    { key: 'scout', label: 'Scout' },
    { key: 'salvage', label: 'Salvage' },
    { key: 'other', label: 'Other' }
  ],
  'space-transports': [
    { key: 'light', label: 'Light' },
    { key: 'heavy', label: 'Heavy' },
    { key: 'civilian-transports', label: 'Civilian Transports' },
    { key: 'military-transport', label: 'Military Transport' },
    { key: 'patrol', label: 'Patrol' },
    { key: 'gunship', label: 'Gunship' },
    { key: 'yacht', label: 'Yacht' },
    { key: 'scout', label: 'Scout' },
    { key: 'salvage', label: 'Salvage' },
    { key: 'other', label: 'Other' }
  ],
  'capital-ships': [
    { key: 'corvette', label: 'Corvette' },
    { key: 'frigate', label: 'Frigate' },
    { key: 'cruiser', label: 'Cruiser' },
    { key: 'destroyer', label: 'Destroyer' },
    { key: 'carrier', label: 'Carrier' },
    { key: 'battleship', label: 'Battleship' },
    { key: 'dreadnaught', label: 'Dreadnaught' },
    { key: 'command', label: 'Command' },
    { key: 'assault', label: 'Assault' },
    { key: 'civilian', label: 'Civilian' },
    { key: 'other', label: 'Other' }
  ],
  'space-stations': [
    { key: 'relay', label: 'Relay' },
    { key: 'defense-platform', label: 'Defense Platform' },
    { key: 'shipyard', label: 'Shipyard' },
    { key: 'trade', label: 'Trade' },
    { key: 'superstructure', label: 'Superstructure' },
    { key: 'platform', label: 'Platform' },
    { key: 'other', label: 'Other' }
  ]
};


function slugifyStoreLabel(value, fallback = '') {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function droidDegreeFromValue(value = '') {
  const raw = String(value ?? '').toLowerCase();
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  if (compact.includes('1st') || compact.includes('first') || compact === '1') return DROID_DEGREE_DEFINITIONS[0];
  if (compact.includes('2nd') || compact.includes('second') || compact === '2') return DROID_DEGREE_DEFINITIONS[1];
  if (compact.includes('3rd') || compact.includes('third') || compact === '3') return DROID_DEGREE_DEFINITIONS[2];
  if (compact.includes('4th') || compact.includes('fourth') || compact === '4') return DROID_DEGREE_DEFINITIONS[3];
  if (compact.includes('5th') || compact.includes('fifth') || compact === '5') return DROID_DEGREE_DEFINITIONS[4];
  return null;
}

function droidDegreeFromText(itemOrDegree = {}) {
  const sys = itemOrDegree?.system ?? itemOrDegree?.data ?? {};
  const text = [
    itemOrDegree?.name,
    sys.name,
    sys.class,
    sys.role,
    sys.category,
    sys.type,
    itemOrDegree?.subcategory,
    itemOrDegree
  ].filter(Boolean).join(' ').toLowerCase();
  if (/medical|medic|surgical|midwife|analytical|analysis|archive|interrogat/.test(text)) return DROID_DEGREE_DEFINITIONS[0];
  if (/astromech|maintenance|mechanic|repair|tech|slicer|weapons maintenance|demolition|pilot|comm|communications|infrastructure|spaceport|control|minesweeper/.test(text)) return DROID_DEGREE_DEFINITIONS[1];
  if (/protocol|secretary|administrative|administration|valet|hospitality|service|footman|messenger|dealer|luxury|domestic|supervisor/.test(text)) return DROID_DEGREE_DEFINITIONS[2];
  if (/assassin|assault|battle|combat|commando|destroyer|spider|guardian|guard|patrol|sentinel|sentry|seeker|probe|surveillance|espionage|infiltrat|scout|recon|observation|tactical|artillery|infantry|legionnaire|hunter.?killer|warden|war|turret|lightsaber|sabotage|annihilator|picket|training|security|crab|buzz|lancer|hk-|hk_|gunnery|shadow|viper/.test(text)) return DROID_DEGREE_DEFINITIONS[3];
  if (/utility|labor|loader|loading|mining|smelter|power|construction|worker|excavation|sifter|mule|gatekeeper|pit|agromech|exploration|explorer|surveyor|survey|spelunker|junk|holocam|ro-d/.test(text)) return DROID_DEGREE_DEFINITIONS[4];
  return null;
}

export function getDroidDegreeDefinitions() {
  return DROID_DEGREE_DEFINITIONS.map(def => ({ ...def }));
}

export function normalizeDroidSubcategory(itemOrDegree = {}) {
  const sys = itemOrDegree?.system ?? itemOrDegree?.data ?? {};
  const degree = droidDegreeFromValue(sys.degree ?? itemOrDegree.degree ?? itemOrDegree.subcategory ?? itemOrDegree.category ?? itemOrDegree)
    || droidDegreeFromText(itemOrDegree);
  return degree?.subcategory || 'General Droid Models';
}

export function getDroidFamily(itemOrSubcategory = {}) {
  const sys = itemOrSubcategory?.system ?? itemOrSubcategory?.data ?? {};
  const degree = droidDegreeFromValue(sys.degree ?? itemOrSubcategory.degree ?? itemOrSubcategory.subcategory ?? itemOrSubcategory.category ?? itemOrSubcategory)
    || droidDegreeFromText(itemOrSubcategory);
  return degree?.key || '';
}

export function getDroidFamilyLabel(familyKey = '') {
  return DROID_DEGREE_DEFINITIONS.find(def => def.key === familyKey)?.label || 'Other Droids';
}

function vehicleDefinitionFromValue(value = '') {
  const normalized = slugifyStoreLabel(value);
  if (!normalized) return null;
  return VEHICLE_SUBCATEGORY_DEFINITIONS.find(def => def.key === normalized)
    || VEHICLE_SUBCATEGORY_DEFINITIONS.find(def => slugifyStoreLabel(def.label) === normalized)
    || null;
}

export function getVehicleSubcategoryDefinitions() {
  return VEHICLE_SUBCATEGORY_DEFINITIONS.map(def => ({ ...def }));
}

export function getVehicleFamily(itemOrSubcategory = {}) {
  const sys = itemOrSubcategory?.system ?? itemOrSubcategory?.data ?? {};
  const value = itemOrSubcategory?.subcategory ?? sys.subcategory ?? sys.category ?? sys.type ?? itemOrSubcategory;
  const def = vehicleDefinitionFromValue(value);
  return def?.family || '';
}

export function getVehicleFamilyLabel(familyKey = '') {
  return VEHICLE_SUBCATEGORY_DEFINITIONS.find(def => def.family === familyKey)?.familyLabel || 'Other Vehicles';
}


export function getVehicleSubcategoryKey(itemOrSubcategory = {}) {
  const sys = itemOrSubcategory?.system ?? itemOrSubcategory?.data ?? {};
  const direct = vehicleDefinitionFromValue(sys.vehicleBucket ?? itemOrSubcategory.vehicleBucket ?? itemOrSubcategory.subcategory ?? sys.vehicleSubtype ?? sys.subcategory ?? sys.category ?? sys.type ?? itemOrSubcategory);
  if (direct) return direct.key;
  const label = normalizeVehicleSubcategory(typeof itemOrSubcategory === 'string' ? { subcategory: itemOrSubcategory } : itemOrSubcategory);
  return vehicleDefinitionFromValue(label)?.key || slugifyStoreLabel(label);
}

function vehicleRoleDefinitionFromValue(bucketKey = '', value = '') {
  const roleKey = slugifyStoreLabel(value);
  if (!roleKey) return null;
  const roles = VEHICLE_ROLE_DEFINITIONS[bucketKey] || [];
  return roles.find(def => def.key === roleKey)
    || roles.find(def => slugifyStoreLabel(def.label) === roleKey)
    || null;
}

export function getVehicleRoleDefinitionsForSubcategory(itemOrSubcategory = {}) {
  const bucketKey = getVehicleSubcategoryKey(itemOrSubcategory);
  return (VEHICLE_ROLE_DEFINITIONS[bucketKey] || []).map(def => ({ ...def }));
}

export function getVehicleRoleKey(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const bucketKey = getVehicleSubcategoryKey(item);
  const direct = vehicleRoleDefinitionFromValue(bucketKey, sys.vehicleRole ?? item.vehicleRole ?? sys.vehicleRoleKey ?? item.vehicleRoleKey ?? '');
  if (direct) return direct.key;
  const raw = slugifyStoreLabel(sys.vehicleRole ?? item.vehicleRole ?? sys.vehicleRoleKey ?? item.vehicleRoleKey ?? '');
  return raw && (VEHICLE_ROLE_DEFINITIONS[bucketKey] || []).some(def => def.key === raw) ? raw : '';
}

export function getVehicleRoleLabel(itemOrRole = {}, itemOrBucket = {}) {
  const isStringRole = typeof itemOrRole === 'string';
  const bucketKey = isStringRole ? getVehicleSubcategoryKey(itemOrBucket) : getVehicleSubcategoryKey(itemOrRole);
  const rawRole = isStringRole ? itemOrRole : getVehicleRoleKey(itemOrRole);
  const def = vehicleRoleDefinitionFromValue(bucketKey, rawRole);
  if (def) return def.label;
  if (!rawRole) return '';
  return String(rawRole).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function normalizeVehicleSubcategory(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const direct = vehicleDefinitionFromValue(item.subcategory ?? sys.subcategory ?? sys.vehicleSubtype ?? sys.category ?? sys.type);
  if (direct) return direct.label;

  const weaponLabels = Array.isArray(sys.weapons)
    ? sys.weapons.map(w => w?.name || '').join(' ')
    : '';
  const tags = Array.isArray(sys.tags) ? sys.tags.join(' ') : '';
  const sourcePack = String(item.sourcePack ?? item.doc?.__storeSource?.pack ?? '');
  const text = [item.name, sys.name, sys.category, sys.type, tags, weaponLabels, sourcePack]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const phraseMatches = [
    ['weapon emplacements', 'Weapon Emplacements'],
    ['weapon emplacement', 'Weapon Emplacements'],
    ['space stations', 'Space Stations'],
    ['space station', 'Space Stations'],
    ['capital ships', 'Capital Ships'],
    ['capital ship', 'Capital Ships'],
    ['space transports', 'Space Transports'],
    ['space transport', 'Space Transports'],
    ['starfighters', 'Starfighters'],
    ['starfighter', 'Starfighters'],
    ['airspeeders', 'Airspeeders'],
    ['airspeeder', 'Airspeeders'],
    ['tracked vehicles', 'Tracked Vehicles'],
    ['tracked vehicle', 'Tracked Vehicles'],
    ['wheeled vehicles', 'Wheeled Vehicles'],
    ['wheeled vehicle', 'Wheeled Vehicles'],
    ['walkers', 'Walkers'],
    ['walker', 'Walkers'],
    ['speeders', 'Speeders'],
    ['speeder', 'Speeders']
  ];
  for (const [needle, label] of phraseMatches) {
    if (text.includes(needle)) return label;
  }

  if (/\b(at-at|at-st|at-ap|at-rt|at-te|at-pt|at-xt|at-ct|at-kt|at-rct|at-aht|spider droid|tri-droid)\b/.test(text)) return 'Walkers';
  if (/\b(crawler|tracked|landmaster|sandcrawler|tread|treads)\b/.test(text)) return 'Tracked Vehicles';
  if (/\b(wheel|wheeled|roller|groundcar|juggernaut|hailfire)\b/.test(text)) return 'Wheeled Vehicles';
  if (/\b(emplacement|battery|anti-aircraft|anti-infantry|planet defender|p-tower|sonic cannon|antivehicle cannon)\b/.test(text)) return 'Weapon Emplacements';
  if (/\b(spha|self-propelled heavy artillery|self propelled heavy artillery|at-ut|ut-at)\b/.test(text)) return 'Walkers';
  if (/\b(cloud car|drop pod|fluttercraft|aerosled|radair|air-2|gnasp|jet catamaran|aerial artillery|laati|laatc|laat|stap|landing sphere|hovercraft|refinery platform|basilisk war droid)\b/.test(text)) return 'Airspeeders';
  if (/\b(freighter|transport|shuttle|courier|yacht|scout ship|gunship|landing craft|sloop|hauler|blastboat|salvage ship|caravel cabin|bloody credit|shackles of nizon|grinning liar|last resort|ebon hawk|mynock|millennium falcon|visionary|doomtreader)\b/.test(text)) return 'Space Transports';
  if (/\b(corvette|frigate|cruiser|destroyer|dreadnaught|dreadnought|battlecruiser|battleship|carrier|star destroyer|crimson axe|indomitable|invisible hand|outbound flight|sabertooth-class assault\/rescue vessel|ipv-1 system patrol craft|acclamator i-class assault ship|acclamator ii-class assault ship)\b/.test(text)) return 'Capital Ships';
  if (/\b(station|spacedock|platform|beacon|starforge|star forge|executor|eclipse|lusankya|viscount|the wheel)\b/.test(text)) return 'Space Stations';
  if (/\b(fighter|interceptor|bomber|x-wing|y-wing|tie|headhunter|clawcraft|dartship|subfighter|escape pod|virago|coralskipper)\b/.test(text)) return 'Starfighters';
  if (/\b(swoop|landspeeder|speeder|skiff|repulsor|tank|sled|speeder bike|chariot|u-lav|mr\/rv|mrrv|mtt|pac|rtt|aat-1|laser borer|m[ae]kuun heavy tracker|kaac freerunner)\b/.test(text)) return 'Speeders';

  return 'General Vehicles';
}

export function getVehicleChallengeLevel(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const raw = sys.challengeLevel ?? sys.challenge ?? sys.cl ?? sys.CL ?? sys.challengeRating ?? item.challengeLevel ?? item.cl ?? item.CL ?? null;
  if (raw === undefined || raw === null || raw === '') return null;
  const match = String(raw).match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

export function getVehicleChallengeBand(item = {}) {
  const cl = getVehicleChallengeLevel(item);
  if (!Number.isFinite(cl)) return '';
  if (cl <= 3) return '0-3';
  if (cl <= 7) return '4-7';
  if (cl <= 11) return '8-11';
  if (cl <= 15) return '12-15';
  return '16-plus';
}

export function getVehicleChallengeBandLabel(band = '') {
  return ({
    '0-3': 'CL 0–3',
    '4-7': 'CL 4–7',
    '8-11': 'CL 8–11',
    '12-15': 'CL 12–15',
    '16-plus': 'CL 16+'
  })[band] || '';
}

export function getVehicleSizeKey(item = {}) {
  const sys = item.system ?? item.data ?? {};
  return slugifyStoreLabel(sys.size ?? item.size ?? '');
}

export function getVehicleSizeLabel(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const raw = String(sys.size ?? item.size ?? '').trim();
  if (!raw) return '';
  return raw.replace(/\b\w/g, c => c.toUpperCase()).replace(/\(([^)]+)\)/g, (_, inner) => `(${inner.replace(/\b\w/g, c => c.toUpperCase())})`);
}



function truthyVehicleFeature(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  if (/^(true|yes|y|1|armed|shielded|hyperdrive)$/i.test(text)) return true;
  if (/^(false|no|n|0|none|unarmed|unshielded|no-hyperdrive|n\/a|na|null|undefined|—|-)$/i.test(text)) return false;
  return fallback;
}

function firstVehicleNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function getVehicleCrewGroup(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const direct = slugifyStoreLabel(sys.vehicleCrewGroup ?? item.vehicleCrewGroup ?? '');
  if (direct) return direct;
  const crewCount = Number(sys.vehicleCrewCount ?? item.vehicleCrewCount ?? firstVehicleNumber(sys.crew ?? item.crew));
  if (!Number.isFinite(crewCount)) return 'unknown';
  if (crewCount <= 0) return 'automated';
  if (crewCount === 1) return 'solo';
  if (crewCount <= 5) return 'small';
  if (crewCount <= 20) return 'team';
  if (crewCount <= 100) return 'large';
  if (crewCount <= 1000) return 'capital';
  return 'massive';
}

export function getVehicleCrewGroupLabel(group = '') {
  const key = slugifyStoreLabel(group);
  return ({
    automated: 'Automated / No Crew',
    solo: 'Solo Crew',
    small: 'Small Crew (2-5)',
    team: 'Crew Team (6-20)',
    large: 'Large Crew (21-100)',
    capital: 'Capital Crew (101-1,000)',
    massive: 'Massive Crew (1,001+)',
    unknown: 'Crew Unknown'
  })[key] || 'Crew Unknown';
}

function parseVehiclePassengerCount(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'object') {
    if ('value' in value) return parseVehiclePassengerCount(value.value);
    return null;
  }
  const text = String(value).trim();
  if (!text) return null;
  const beforeCargo = text.split(/cargo\s*:/i)[0].trim();
  if (!beforeCargo) return null;
  if (/^(none|no|n\/a|na|null|undefined|—|-)$/i.test(beforeCargo)) return 0;
  if (/none/i.test(beforeCargo) && !/\d/.test(beforeCargo)) return 0;
  const numbers = [...beforeCargo.replace(/,/g, '').matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0])).filter(Number.isFinite);
  if (!numbers.length) return null;
  if (/plus|\+/i.test(beforeCargo) && numbers.length > 1) {
    return numbers.reduce((sum, n) => sum + n, 0);
  }
  return numbers[0];
}

export function getVehiclePassengerCount(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const direct = Number(sys.vehiclePassengerCount ?? item.vehiclePassengerCount ?? NaN);
  if (Number.isFinite(direct)) return direct;
  const parsed = parseVehiclePassengerCount(sys.passengers ?? item.passengers ?? null);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getVehiclePassengerGroup(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const direct = slugifyStoreLabel(sys.vehiclePassengerGroup ?? item.vehiclePassengerGroup ?? '');
  if (direct) return direct;
  const count = getVehiclePassengerCount(item);
  if (!Number.isFinite(count)) return 'unknown';
  if (count <= 0) return 'none';
  if (count === 1) return 'one';
  if (count <= 5) return 'small-party';
  if (count <= 20) return 'squad';
  if (count <= 50) return 'platoon';
  if (count <= 200) return 'company';
  if (count <= 1000) return 'battalion';
  return 'mass-transport';
}

export function getVehiclePassengerGroupLabel(group = '') {
  const key = slugifyStoreLabel(group);
  return ({
    none: 'No Passengers',
    one: '1 Passenger',
    'small-party': 'Small Party (2-5)',
    squad: 'Squad (6-20)',
    platoon: 'Platoon (21-50)',
    company: 'Company (51-200)',
    battalion: 'Battalion (201-1,000)',
    'mass-transport': 'Mass Transport (1,001+)',
    unknown: 'Passenger Unknown'
  })[key] || 'Passenger Unknown';
}

export function getVehicleCargoGroup(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const direct = slugifyStoreLabel(sys.vehicleCargoGroup ?? item.vehicleCargoGroup ?? '');
  if (direct) return direct;
  const kg = Number(sys.vehicleCargoKg ?? item.vehicleCargoKg ?? NaN);
  if (!Number.isFinite(kg)) return 'unknown';
  if (kg <= 0) return 'none';
  if (kg <= 100) return 'personal';
  if (kg <= 1000) return 'light';
  if (kg <= 10000) return 'medium';
  if (kg <= 100000) return 'heavy';
  if (kg <= 1000000) return 'bulk';
  return 'massive';
}

export function getVehicleCargoGroupLabel(group = '') {
  const key = slugifyStoreLabel(group);
  return ({
    none: 'No Listed Cargo',
    personal: 'Personal Cargo (≤100 kg)',
    light: 'Light Cargo (≤1 ton)',
    medium: 'Medium Cargo (1-10 tons)',
    heavy: 'Heavy Cargo (10-100 tons)',
    bulk: 'Bulk Cargo (100-1,000 tons)',
    massive: 'Massive Cargo (1,000+ tons)',
    unknown: 'Cargo Unknown'
  })[key] || 'Cargo Unknown';
}

export function getVehicleHyperdriveKey(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const has = truthyVehicleFeature(sys.vehicleHasHyperdrive ?? item.vehicleHasHyperdrive, false);
  return has ? 'yes' : 'no';
}

export function getVehicleWeaponsKey(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const inferred = Array.isArray(sys.weapons) ? sys.weapons.length > 0 : false;
  const has = truthyVehicleFeature(sys.vehicleHasWeapons ?? item.vehicleHasWeapons, inferred);
  return has ? 'yes' : 'no';
}


export function getVehicleShieldRating(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const candidates = [
    sys.shieldRating,
    sys.currentSR,
    sys.sr,
    sys.shield_rating,
    sys.shieldRatingMax,
    sys.shields?.max,
    sys.shields?.value,
    sys.shields?.current,
    sys.shields?.rating,
    sys.shields
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;
    if (typeof candidate === 'number') return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
    const text = String(candidate);
    const srMatch = text.match(/\b(?:SR|Shield Rating|Shields?)\s*[:\-]?\s*(\d+)\b/i);
    if (srMatch) return Number(srMatch[1]) || 0;
    if (/^\d+$/.test(text.trim())) return Number(text.trim()) || 0;
  }
  return 0;
}

export function getVehicleShieldsKey(item = {}) {
  const sys = item.system ?? item.data ?? {};
  const inferred = getVehicleShieldRating(item) > 0;
  const has = truthyVehicleFeature(sys.vehicleHasShields ?? item.vehicleHasShields, inferred);
  return has ? 'yes' : 'no';
}

export function getVehicleBooleanFeatureLabel(feature = '', key = '') {
  const value = slugifyStoreLabel(key) === 'yes';
  switch (feature) {
    case 'hyperdrive': return value ? 'Has Hyperdrive' : 'No Hyperdrive';
    case 'weapons': return value ? 'Armed' : 'Unarmed';
    case 'shields': return value ? 'Shielded' : 'No Shields';
    default: return value ? 'Yes' : 'No';
  }
}
export function buildStoreNavigationModel(inventory = {}, options = {}) {
  const { activeCategory = 'weapons', activeSubcategory = null, activeFamily = null } = options;

  const byCategory = inventory.byCategory || new Map();
  const allItems = inventory.allItems || [];

  const normalizeCategoryKey = (cat) => {
    const lower = String(cat || '').toLowerCase();
    if (!lower) return '';
    if (lower.includes('weapon')) return 'weapons';
    if (lower.includes('armor')) return 'armor';
    if (lower.includes('droid')) return 'droids';
    if (lower.includes('implant')) return 'implants';
    if (lower.includes('vehicle') || lower.includes('starship') || lower.includes('ship')) return 'vehicles';
    if (lower.includes('gear') || lower.includes('equipment') || lower.includes('medical') || lower.includes('tech') || lower.includes('tool') || lower.includes('survival') || lower.includes('security')) return 'gear';
    return lower.replace(/\s+/g, '-');
  };

  const canonicalCategoryLabels = {
    weapons: storeI18n('SWSE.Store.Navigation.Weapons'),
    armor: storeI18n('SWSE.Store.Navigation.Armor'),
    gear: storeI18n('SWSE.Store.Navigation.Equipment'),
    implants: 'Implants',
    vehicles: storeI18n('SWSE.Store.Navigation.Vehicles'),
    droids: storeI18n('SWSE.Store.Navigation.Droids')
  };

  const normalizedCategories = new Map();
  for (const [category, subMap] of byCategory.entries()) {
    const categoryKey = normalizeCategoryKey(category);
    if (!categoryKey) continue;
    if (!normalizedCategories.has(categoryKey)) {
      normalizedCategories.set(categoryKey, {
        key: categoryKey,
        label: canonicalCategoryLabels[categoryKey] || category,
        count: 0,
        subMap: new Map()
      });
    }
    const bucket = normalizedCategories.get(categoryKey);
    for (const [subcategory, items] of subMap.entries()) {
      const existing = bucket.subMap.get(subcategory) ?? [];
      const nextItems = Array.isArray(items) ? items : [];
      bucket.subMap.set(subcategory, existing.concat(nextItems));
      bucket.count += nextItems.length;
    }
  }

  // Build top-level categories. Deliberately no global All bucket; the store
  // opens into Weapons and narrows from there so the UI never renders the
  // full catalog at once.
  const topCategories = [];

  // Add each category with its children
  for (const categoryBucket of normalizedCategories.values()) {
    const category = categoryBucket.label;
    const categoryKey = categoryBucket.key;
    const subMap = categoryBucket.subMap;
    const categoryCount = categoryBucket.count;

    // Build children (subcategories) for this category
    const children = [];
    const subcategoryItemCounts = new Map();

    // Count items per subcategory
    for (const [subcategory, items] of subMap.entries()) {
      subcategoryItemCounts.set(subcategory, items.length);
    }

    if (categoryKey === 'weapons') {
      // WEAPONS: Group by melee/ranged families
      const byFamily = new Map();

      for (const [subcategory, items] of subMap.entries()) {
        const family = getWeaponFamily(subcategory);
        if (!byFamily.has(family)) {
          byFamily.set(family, []);
        }
        byFamily.get(family).push({
          key: subcategory.toLowerCase().replace(/\s+/g, '-'),
          label: subcategory,
          count: items.length,
          category: categoryKey,
          subcategory,
          family: null,
          active: activeSubcategory === subcategory
        });
      }

      // Flatten families into children (with visual grouping later in template)
      for (const [family, subs] of byFamily.entries()) {
        children.push(...subs.map(sub => ({
          ...sub,
          family
        })));
      }

      // Sort weapon children by canonical subtype order so the Melee/Ranged
      // chip rows read consistently regardless of pack/category iteration order.
      const weaponOrder = [
        'Simple Ranged', 'Pistols', 'Rifles', 'Heavy Weapons', 'Grenades', 'Exotic Ranged',
        'Simple Melee', 'Advanced Melee', 'Lightsabers', 'Exotic Melee',
        'Simple Weapons', 'Exotic Weapons', 'Ranged Weapons'
      ];
      children.sort((a, b) => {
        const aIdx = weaponOrder.indexOf(a.label);
        const bIdx = weaponOrder.indexOf(b.label);
        if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    } else if (categoryKey === 'armor') {
      // ARMOR: Normalize to Light/Medium/Heavy/Energy Shields
      const normalizedBySubcategory = new Map();

      for (const [_, items] of subMap.entries()) {
        for (const item of items) {
          const normalized = normalizeArmorSubcategory(item);
          if (!normalizedBySubcategory.has(normalized)) {
            normalizedBySubcategory.set(normalized, []);
          }
          normalizedBySubcategory.get(normalized).push(item);
        }
      }

      // Build children from normalized armor types
      for (const [normalized, items] of normalizedBySubcategory.entries()) {
        children.push({
          key: normalized.toLowerCase().replace(/\s+/g, '-'),
          label: normalized,
          count: items.length,
          category: categoryKey,
          subcategory: normalized,
          family: null,
          active: activeSubcategory === normalized
        });
      }

      // Sort armor children by canonical order
      const order = ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Energy Shields'];
      children.sort((a, b) => {
        const aIdx = order.indexOf(a.label);
        const bIdx = order.indexOf(b.label);
        if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    } else if (categoryKey === 'droids') {
      const byDegree = new Map();

      for (const [subcategory, items] of subMap.entries()) {
        for (const item of items) {
          const normalized = normalizeDroidSubcategory(item);
          if (!byDegree.has(normalized)) byDegree.set(normalized, []);
          byDegree.get(normalized).push(item);
        }
      }

      const droidOrder = getDroidDegreeDefinitions().map(def => def.subcategory);
      for (const [normalized, items] of byDegree.entries()) {
        const family = getDroidFamily(normalized);
        children.push({
          key: slugifyStoreLabel(normalized),
          label: normalized,
          count: items.length,
          category: categoryKey,
          subcategory: normalized,
          family,
          active: activeSubcategory === normalized
        });
      }

      children.sort((a, b) => {
        const aIdx = droidOrder.indexOf(a.label);
        const bIdx = droidOrder.indexOf(b.label);
        if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    } else if (categoryKey === 'vehicles') {
      const normalizedByVehicleType = new Map();

      for (const [subcategory, items] of subMap.entries()) {
        for (const item of items) {
          const normalized = normalizeVehicleSubcategory({ ...item, subcategory: item.subcategory || subcategory });
          if (!normalizedByVehicleType.has(normalized)) normalizedByVehicleType.set(normalized, []);
          normalizedByVehicleType.get(normalized).push(item);
        }
      }

      const vehicleOrder = getVehicleSubcategoryDefinitions().map(def => def.label);
      for (const [normalized, items] of normalizedByVehicleType.entries()) {
        const family = getVehicleFamily(normalized);
        children.push({
          key: slugifyStoreLabel(normalized),
          label: normalized,
          count: items.length,
          category: categoryKey,
          subcategory: normalized,
          family,
          active: activeSubcategory === normalized
        });
      }

      children.sort((a, b) => {
        const aIdx = vehicleOrder.indexOf(a.label);
        const bIdx = vehicleOrder.indexOf(b.label);
        if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    } else {
      // OTHER CATEGORIES: Use raw subcategories
      for (const [subcategory, items] of subMap.entries()) {
        children.push({
          key: slugifyStoreLabel(subcategory),
          label: subcategory,
          count: items.length,
          category: categoryKey,
          subcategory,
          family: null,
          active: activeSubcategory === subcategory
        });
      }

      // Sort by name
      children.sort((a, b) => a.label.localeCompare(b.label));
    }

    const allLabels = {
      weapons: storeI18n('SWSE.Store.Navigation.AllWeapons'),
      armor: storeI18n('SWSE.Store.Navigation.AllCategory', { category }),
      gear: storeI18n('SWSE.Store.Navigation.AllCategory', { category }),
      implants: 'All Implants',
      droids: 'All Droids',
      vehicles: 'All Vehicles'
    };
    const topCategory = {
      key: categoryKey,
      label: category,
      allLabel: allLabels[categoryKey] || storeI18n('SWSE.Store.Navigation.AllCategory', { category }),
      count: categoryCount,
      active: activeCategory === categoryKey,
      children: children.length > 0 ? children : undefined
    };

    if (['weapons', 'droids', 'vehicles'].includes(categoryKey) && children.length > 0) {
      const byFamily = new Map();
      for (const child of children) {
        const family = child.family
          || (categoryKey === 'weapons' ? getWeaponFamily(child.label) : '')
          || (categoryKey === 'droids' ? getDroidFamily(child.label) : '')
          || (categoryKey === 'vehicles' ? getVehicleFamily(child.label) : '')
          || 'other';
        if (!byFamily.has(family)) byFamily.set(family, []);
        byFamily.get(family).push({ ...child, family, active: activeSubcategory === child.label });
      }
      topCategory.familyGroups = Object.fromEntries(byFamily);
      const familyOrderByCategory = {
        weapons: ['ranged', 'melee', 'other'],
        droids: ['1st-degree', '2nd-degree', '3rd-degree', '4th-degree', '5th-degree', 'other'],
        vehicles: ['ground', 'air', 'starship', 'other']
      };
      const familyOrder = familyOrderByCategory[categoryKey] || ['other'];
      topCategory.familyTabs = Array.from(byFamily.entries())
        .map(([family, group]) => ({
          family,
          label: categoryKey === 'weapons'
            ? (family === 'ranged' ? storeI18n('SWSE.Store.Navigation.Ranged') : family === 'melee' ? storeI18n('SWSE.Store.Navigation.Melee') : storeI18n('SWSE.Store.Navigation.Other'))
            : categoryKey === 'droids'
              ? getDroidFamilyLabel(family)
              : categoryKey === 'vehicles'
                ? getVehicleFamilyLabel(family)
                : storeI18n('SWSE.Store.Navigation.Other'),
          count: group.reduce((sum, child) => sum + (Number(child.count) || 0), 0),
          active: activeFamily === family
        }))
        .sort((a, b) => {
          const aIdx = familyOrder.indexOf(a.family);
          const bIdx = familyOrder.indexOf(b.family);
          if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
    }

    topCategories.push(topCategory);
  }

  // Normalize top-level order: Weapons first, then the big store departments.
  const priorityOrder = ['weapons', 'armor', 'implants', 'gear', 'vehicles', 'droids'];
  topCategories.sort((a, b) => {
    const aIdx = priorityOrder.indexOf(a.key);
    const bIdx = priorityOrder.indexOf(b.key);
    if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return {
    topCategories,
    activeCategory,
    activeSubcategory,
    activeFamily
  };
}
