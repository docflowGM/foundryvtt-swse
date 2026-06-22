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
function slugifyStoreLabel(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  { key: '1st-degree', label: '1st-Degree', subcategory: '1st-Degree Droid Models', description: 'Mathematical, medical, and physical science droids' },
  { key: '2nd-degree', label: '2nd-Degree', subcategory: '2nd-Degree Droid Models', description: 'Engineering, technical, repair, and astromech droids' },
  { key: '3rd-degree', label: '3rd-Degree', subcategory: '3rd-Degree Droid Models', description: 'Protocol, service, diplomatic, and social-interface droids' },
  { key: '4th-degree', label: '4th-Degree', subcategory: '4th-Degree Droid Models', description: 'Military, security, combat, and reconnaissance droids' },
  { key: '5th-degree', label: '5th-Degree', subcategory: '5th-Degree Droid Models', description: 'Labor, mining, construction, survey, exploration, and utility droids' }
];

const DROID_ROLE_DEFINITIONS = {
  '1st-degree': [
    { key: 'medical', label: 'Medical', description: 'Medical, surgical, midwife, evacuation, and treatment droids' },
    { key: 'analysis', label: 'Analysis', description: 'Analysis, archive, science, mathematics, and threat-assessment droids' },
    { key: 'interrogation', label: 'Interrogation', description: 'Interrogator and hostile-questioning droids' }
  ],
  '2nd-degree': [
    { key: 'astromech', label: 'Astromech', description: 'Astromech and shipboard utility droids' },
    { key: 'repair', label: 'Repair', description: 'Repair, mechanic, maintenance, and technical-service droids' },
    { key: 'pilot', label: 'Pilot', description: 'Pilot and vehicle-operation droids' },
    { key: 'gunnery', label: 'Gunnery', description: 'Gunnery and weapon-operation droids' },
    { key: 'demolitions', label: 'Demolitions', description: 'Demolitions and explosive-disposal droids' },
    { key: 'hazard', label: 'Hazard', description: 'Hazard, minesweeping, observation, and hostile-environment technical droids' }
  ],
  '3rd-degree': [
    { key: 'protocol', label: 'Protocol', description: 'Protocol, translation, diplomatic, and etiquette droids' },
    { key: 'administrative', label: 'Administrative', description: 'Administrative, secretarial, supervisory, and control-interface droids' },
    { key: 'service', label: 'Service', description: 'Service, hospitality, luxury, valet, and domestic droids' },
    { key: 'information', label: 'Information', description: 'Information analysis, messenger, gatekeeper, and social-intelligence droids' }
  ],
  '4th-degree': [
    { key: 'battle', label: 'Battle', description: 'Battle, assault, infantry, destroyer, commando, and frontline combat droids' },
    { key: 'security', label: 'Security', description: 'Security, guard, patrol, sentry, warden, police, and perimeter defense droids' },
    { key: 'assassin', label: 'Assassin', description: 'Assassin, hunter-killer, and targeted-elimination droids' },
    { key: 'infiltration', label: 'Infiltration', description: 'Infiltration, espionage, sabotage, and stealth combat droids' },
    { key: 'recon', label: 'Recon', description: 'Probe, recon, surveillance, scout, seeker, and observation droids' },
    { key: 'artillery', label: 'Artillery', description: 'Artillery, turret, and area-fire support droids' },
    { key: 'heavy', label: 'Heavy', description: 'Heavy combat, hulk, annihilator, warbot, and large war droids' },
    { key: 'training', label: 'Training', description: 'Training, practice, lightsaber, tactical, remote, and specialty combat droids' }
  ],
  '5th-degree': [
    { key: 'labor', label: 'Labor', description: 'Labor, loader, lifter, valet, worker, and hauling droids' },
    { key: 'mining', label: 'Mining', description: 'Mining, smelting, sifting, excavation, and industrial extraction droids' },
    { key: 'construction', label: 'Construction', description: 'Construction, power, ordnance-lifting, and heavy worksite droids' },
    { key: 'survey', label: 'Survey', description: 'Survey, scout-survey, mapping, and remote survey droids' },
    { key: 'exploration', label: 'Exploration', description: 'Exploration, remote travel, and field-discovery droids' },
    { key: 'utility', label: 'Utility', description: 'General utility, maintenance, sanitation, repair-task, and miscellaneous labor droids' }
  ]
};

function droidText(itemOrRole = {}) {
  const sys = itemOrRole?.system ?? itemOrRole?.data ?? {};
  return [
    itemOrRole?.name,
    sys.name,
    sys.degree,
    sys.droidRole,
    sys.droidRoleLabel,
    sys.class,
    sys.role,
    sys.category,
    sys.type,
    itemOrRole?.subcategory,
    itemOrRole?.droidRoleKey,
    itemOrRole?.droidRoleLabel,
    itemOrRole
  ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]+/g, ' ');
}

function roleDefinitionFromKey(degreeKey = '', roleKey = '') {
  const key = slugifyStoreLabel(roleKey);
  if (!key) return null;
  return (DROID_ROLE_DEFINITIONS[degreeKey] || []).find(def => def.key === key || slugifyStoreLabel(def.label) === key) || null;
}

function droidRoleFromText(itemOrRole = {}, degreeKey = '') {
  const text = droidText(itemOrRole);
  const degree = degreeKey || getDroidFamily(itemOrRole);
  if (!degree) return null;

  if (degree === '1st-degree') {
    if (/interrogat|questioning|t0 d|t0-d|bl 39|bl-39/.test(text)) return roleDefinitionFromKey(degree, 'interrogation');
    if (/medical|medic|surgical|midwife|evacuation|bacta|fx\s*[- ]?6|fx\s*[- ]?7|2\s*[- ]?1b|gh\s*[- ]?7|im\s*[- ]?6|mev|pi\s*[- ]?series|dd\s*[- ]?13|ew\s*[- ]?3|3z3|a\s*[- ]?series medical/.test(text)) return roleDefinitionFromKey(degree, 'medical');
    if (/analysis|analytical|archive|threat|science|math|mathematics|administration|communications|weapons maintenance|maintenance|treadwell|sabacc|dealer|sp\s*[- ]?4|a9g|5\s*[- ]?bt|et\s*[- ]?74|88\s*[- ]?series|ad\s*[- ]?series/.test(text)) return roleDefinitionFromKey(degree, 'analysis');
    return roleDefinitionFromKey(degree, 'analysis');
  }

  if (degree === '2nd-degree') {
    if (/demolition|demolitions|explosive|infrastructure|planning/.test(text)) return roleDefinitionFromKey(degree, 'demolitions');
    if (/mine|minesweeper|hazard|holocam|observation|roving eye|explorer|bd explorer|m38/.test(text)) return roleDefinitionFromKey(degree, 'hazard');
    if (/gunnery|gunner|pg\s*[- ]?5/.test(text)) return roleDefinitionFromKey(degree, 'gunnery');
    if (/pilot|fa\s*[- ]?4|feg|rx\s*[- ]?series|v6\s*[- ]?series/.test(text)) return roleDefinitionFromKey(degree, 'pilot');
    if (/astromech|agromech|r2|r3|r4|r5|r7|r8|q7|p2|s19|t3/.test(text)) return roleDefinitionFromKey(degree, 'astromech');
    if (/slicer|network|communications|comms|security|repair|mechanic|maintenance|treadwell|pit|utility|tech|g2|h\s*[- ]?1me|mk\s*[- ]?series|le\s*[- ]?series|kdy\s*[- ]?4|nr\s*[- ]?1100|ei\s*[- ]?9|0\s*[- ]?lt/.test(text)) return roleDefinitionFromKey(degree, 'repair');
    return roleDefinitionFromKey(degree, 'repair');
  }

  if (degree === '3rd-degree') {
    if (/information|messenger|gatekeeper|espionage|aerial survey|gy\s*[- ]?i|m4\s*[- ]?series|tt\s*[- ]?8l|imperial espionage|as23/.test(text)) return roleDefinitionFromKey(degree, 'information');
    if (/admin|administrative|secretary|supervisor|spaceport control|control|cz\s*[- ]?series|ev\s*[- ]?series|3d\s*[- ]?4|k\s*[- ]?series/.test(text)) return roleDefinitionFromKey(degree, 'administrative');
    if (/service|domestic|hospitality|luxury|valet|worker drone|lep|gg\s*[- ]?series|bd\s*[- ]?3000|bt7|fa\s*[- ]?5|j9/.test(text)) return roleDefinitionFromKey(degree, 'service');
    if (/protocol|translation|interpreter|diplomacy|3po|m\s*[- ]?3po|tc\s*[- ]?series|ge3|lom|ra\s*[- ]?7|5yq|chiba|rww/.test(text)) return roleDefinitionFromKey(degree, 'protocol');
    return roleDefinitionFromKey(degree, 'protocol');
  }

  if (degree === '4th-degree') {
    if (/artillery|turret|area fire|vx\s*[- ]?series|t4/.test(text)) return roleDefinitionFromKey(degree, 'artillery');
    if (/heavy|hulk|annihilator|warbot|behemoth|juggernaut|ultra|dark trooper|scorpenek|ix\s*[- ]?6|sd\s*[- ]?6|sd\s*[- ]?9|b3/.test(text)) return roleDefinitionFromKey(degree, 'heavy');
    if (/assassin|hunter.?killer|hk\s*[-_]|asn|e522|mrd|hkb/.test(text)) return roleDefinitionFromKey(degree, 'assassin');
    if (/infiltrat|espionage|sabotage|stealth|shadow|wsb|3px|tc\s*[- ]?sc/.test(text)) return roleDefinitionFromKey(degree, 'infiltration');
    if (/probe|recon|surveillance|scout|seeker|observation|spotter|viper|drk|dsh|k\s*[- ]?x12|r\s*[- ]?1|r\s*[- ]?4|lv\s*[- ]?38|fsd|spelunker|picket/.test(text)) return roleDefinitionFromKey(degree, 'recon');
    if (/security|guard|patrol|sentry|sentinel|warden|police|perimeter|footman|wing guard|mionne|jk\s*[- ]?13|lv8|z65|bt\s*[- ]?16|b4j4|mark i patrol|mark i sentinel|mark iv sentry|kx\s*[- ]?series/.test(text)) return roleDefinitionFromKey(degree, 'security');
    if (/training|practice|lightsaber|tactical|remote|bca|marksman|hunter trainer|de training|ig\s*[- ]?110|t\s*[- ]?series|x training/.test(text)) return roleDefinitionFromKey(degree, 'training');
    if (/battle|assault|combat|commando|destroyer|droideka|spider|infantry|legionnaire|lancer|war|guardian|crab|buzz|purge|b1|b2|bx|oom|ig\s*[- ]?86|lr\s*[- ]?57|v2|yvh|aggressor|eradicator|devastator|krath|rakatan|x\s*[- ]?1|junk|brute/.test(text)) return roleDefinitionFromKey(degree, 'battle');
    return roleDefinitionFromKey(degree, 'battle');
  }

  if (degree === '5th-degree') {
    if (/survey|surveyor|scout surveyor|wanderer/.test(text)) return roleDefinitionFromKey(degree, 'survey');
    if (/exploration|explorer|f1/.test(text)) return roleDefinitionFromKey(degree, 'exploration');
    if (/mining|smelt|excavat|sifter|industrial|km1|pk\s*[- ]?2m|xk\s*[- ]?v8|11\s*[- ]?17|8d8|8d|rt sifter/.test(text)) return roleDefinitionFromKey(degree, 'mining');
    if (/construction|power|gnk|eg\s*[- ]?6|plnk|evs|ordnance|cll\s*[- ]?m2/.test(text)) return roleDefinitionFromKey(degree, 'construction');
    if (/labor|loader|loading|lifter|worker|valet|asp|blx|pk worker|cll\s*[- ]?6|iw\s*[- ]?37|hv\s*[- ]?7|t1 bulk|xlt/.test(text)) return roleDefinitionFromKey(degree, 'labor');
    if (/utility|maintenance|repair|demolition|demolitions|mine|minesweeper|mse\s*[- ]?6|ic\s*[- ]?m|r\s*[- ]?8009|ro\s*[- ]?d|mule|gd16|grz|mr\s*[- ]?200/.test(text)) return roleDefinitionFromKey(degree, 'utility');
    return roleDefinitionFromKey(degree, 'utility');
  }

  return null;
}

function droidDegreeFromValue(value = '') {
  const normalized = slugifyStoreLabel(value);
  if (!normalized) return null;
  return DROID_DEGREE_DEFINITIONS.find(def => def.key === normalized)
    || DROID_DEGREE_DEFINITIONS.find(def => slugifyStoreLabel(def.label) === normalized)
    || DROID_DEGREE_DEFINITIONS.find(def => slugifyStoreLabel(def.subcategory) === normalized)
    || null;
}

function droidDegreeFromText(itemOrDegree = {}) {
  const text = droidText(itemOrDegree);
  if (/\b(1st|first|class one|class 1|1st degree)\b/.test(text)) return DROID_DEGREE_DEFINITIONS[0];
  if (/\b(2nd|second|class two|class 2|2nd degree)\b/.test(text)) return DROID_DEGREE_DEFINITIONS[1];
  if (/\b(3rd|third|class three|class 3|3rd degree)\b/.test(text)) return DROID_DEGREE_DEFINITIONS[2];
  if (/\b(4th|fourth|class four|class 4|4th degree)\b/.test(text)) return DROID_DEGREE_DEFINITIONS[3];
  if (/\b(5th|fifth|class five|class 5|5th degree)\b/.test(text)) return DROID_DEGREE_DEFINITIONS[4];
  if (/medical|medic|surgical|midwife|analytical|analysis|archive|interrogat|science|threat analysis/.test(text)) return DROID_DEGREE_DEFINITIONS[0];
  if (/astromech|maintenance|mechanic|repair|tech|slicer|weapons maintenance|demolition|pilot|gunnery|comm|communications|infrastructure|spaceport|control|minesweeper/.test(text)) return DROID_DEGREE_DEFINITIONS[1];
  if (/protocol|secretary|administrative|administration|valet|hospitality|service|footman|messenger|dealer|luxury|domestic|supervisor|information/.test(text)) return DROID_DEGREE_DEFINITIONS[2];
  if (/assassin|assault|battle|combat|commando|destroyer|spider|guardian|guard|patrol|sentinel|sentry|seeker|probe|surveillance|espionage|infiltrat|scout|recon|observation|tactical|artillery|infantry|legionnaire|hunter.?killer|warden|war|turret|lightsaber|sabotage|annihilator|picket|training|security|crab|buzz|lancer|hk\s*[-_]|shadow|viper/.test(text)) return DROID_DEGREE_DEFINITIONS[3];
  if (/utility|labor|loader|loading|mining|smelter|power|construction|worker|excavation|sifter|mule|gatekeeper|pit|agromech|exploration|explorer|surveyor|survey|spelunker|junk|holocam|ro\s*[- ]?d/.test(text)) return DROID_DEGREE_DEFINITIONS[4];
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

export function getDroidRoleDefinitionsForDegree(degreeOrKey = '') {
  const degreeKey = droidDegreeFromValue(degreeOrKey)?.key || slugifyStoreLabel(degreeOrKey);
  return (DROID_ROLE_DEFINITIONS[degreeKey] || []).map(def => ({ ...def }));
}

export function getDroidRole(itemOrRole = {}, degreeOrKey = '') {
  const sys = itemOrRole?.system ?? itemOrRole?.data ?? {};
  const degreeKey = droidDegreeFromValue(degreeOrKey)?.key || slugifyStoreLabel(degreeOrKey) || getDroidFamily(itemOrRole);
  const direct = roleDefinitionFromKey(degreeKey, sys.droidRole ?? sys.roleKey ?? itemOrRole.droidRoleKey ?? itemOrRole.roleKey);
  return direct || droidRoleFromText(itemOrRole, degreeKey);
}

export function getDroidRoleLabel(roleOrKey = '', degreeOrKey = '') {
  const degreeKey = droidDegreeFromValue(degreeOrKey)?.key || slugifyStoreLabel(degreeOrKey);
  const direct = roleDefinitionFromKey(degreeKey, roleOrKey);
  return direct?.label || String(roleOrKey || '').trim() || 'Other';
}

export function normalizeDroidRole(itemOrRole = {}, degreeOrKey = '') {
  const role = getDroidRole(itemOrRole, degreeOrKey);
  return role?.key || '';
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
    if (lower.includes('vehicle') || lower.includes('starship') || lower.includes('ship')) return 'vehicles';
    if (lower.includes('gear') || lower.includes('equipment') || lower.includes('medical') || lower.includes('tech') || lower.includes('tool') || lower.includes('survival') || lower.includes('security')) return 'gear';
    return lower.replace(/\s+/g, '-');
  };

  const canonicalCategoryLabels = {
    weapons: storeI18n('SWSE.Store.Navigation.Weapons'),
    armor: storeI18n('SWSE.Store.Navigation.Armor'),
    gear: storeI18n('SWSE.Store.Navigation.Equipment'),
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
      const byRole = new Map();

      for (const [subcategory, items] of subMap.entries()) {
        for (const item of items) {
          const degree = getDroidFamily({ ...item, subcategory: item.subcategory || subcategory }) || 'other';
          if (!byDegree.has(degree)) byDegree.set(degree, []);
          byDegree.get(degree).push(item);

          const role = getDroidRole(item, degree);
          if (role?.key) {
            const key = `${degree}:${role.key}`;
            if (!byRole.has(key)) byRole.set(key, { degree, role, items: [] });
            byRole.get(key).items.push(item);
          }
        }
      }

      const activeDegree = activeFamily || '';
      if (activeDegree) {
        const roleDefinitions = getDroidRoleDefinitionsForDegree(activeDegree);
        for (const role of roleDefinitions) {
          const bucket = byRole.get(`${activeDegree}:${role.key}`);
          const count = bucket?.items?.length || 0;
          if (count <= 0) continue;
          children.push({
            key: role.key,
            label: role.label,
            count,
            category: categoryKey,
            subcategory: role.key,
            filterValue: role.key,
            family: activeDegree,
            active: slugifyStoreLabel(activeSubcategory) === role.key,
            description: role.description
          });
        }
      }

      children.sort((a, b) => {
        const defs = getDroidRoleDefinitionsForDegree(activeDegree);
        const aIdx = defs.findIndex(def => def.key === a.key);
        const bIdx = defs.findIndex(def => def.key === b.key);
        if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

      const degreeOrder = getDroidDegreeDefinitions().map(def => def.key);
      const familyTabs = [];
      for (const degree of getDroidDegreeDefinitions()) {
        const count = byDegree.get(degree.key)?.length || 0;
        if (count <= 0) continue;
        familyTabs.push({
          family: degree.key,
          label: degree.label,
          count,
          active: activeFamily === degree.key,
          description: degree.description
        });
      }
      familyTabs.sort((a, b) => degreeOrder.indexOf(a.family) - degreeOrder.indexOf(b.family));
      children.familyTabsOverride = familyTabs;
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

    const droidFamilyTabsOverride = Array.isArray(children.familyTabsOverride) ? children.familyTabsOverride : null;

    const allLabels = {
      weapons: storeI18n('SWSE.Store.Navigation.AllWeapons'),
      armor: storeI18n('SWSE.Store.Navigation.AllCategory', { category }),
      gear: storeI18n('SWSE.Store.Navigation.AllCategory', { category }),
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

    if (categoryKey === 'droids' && droidFamilyTabsOverride) {
      topCategory.familyTabs = droidFamilyTabsOverride;
      topCategory.familyGroups = {};
      topCategory.roleResetLabel = activeFamily ? `All ${getDroidFamilyLabel(activeFamily)}` : topCategory.allLabel;
      topCategory.roleResetFamily = activeFamily || '';
    } else if (['weapons', 'droids', 'vehicles'].includes(categoryKey) && children.length > 0) {
      const byFamily = new Map();
      for (const child of children) {
        const family = child.family
          || (categoryKey === 'weapons' ? getWeaponFamily(child.label) : '')
          || (categoryKey === 'droids' ? getDroidFamily(child.label) : '')
          || (categoryKey === 'vehicles' ? getVehicleFamily(child.label) : '')
          || 'other';
        if (!byFamily.has(family)) byFamily.set(family, []);
        byFamily.get(family).push({ ...child, family, active: slugifyStoreLabel(activeSubcategory) === slugifyStoreLabel(child.filterValue || child.subcategory || child.label) });
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
  const priorityOrder = ['weapons', 'armor', 'gear', 'vehicles', 'droids'];
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
