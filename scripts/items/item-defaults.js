/**
 * Safe defaults for actor-local blank items created from the V2 character sheet.
 *
 * These defaults are intentionally boring. Their job is to make a newly created
 * blank item valid, renderable, and safely editable before the player fills in
 * real stats. They should not perform rules math.
 */

const SYSTEM_ID = 'foundryvtt-swse';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? {}));
}

function mergeObject(base, overlay) {
  const initial = clone(base ?? {});
  if (globalThis.foundry?.utils?.mergeObject) {
    return foundry.utils.mergeObject(initial, clone(overlay ?? {}), {
      inplace: false,
      recursive: true,
      insertKeys: true,
      insertValues: true,
      overwrite: true
    });
  }

  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = merge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
      } else {
        target[key] = value;
      }
    }
    return target;
  };
  return merge(initial, overlay ?? {});
}

function compactName(type) {
  return String(type || 'item')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function unwrapNumberish(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['value', 'current', 'total', 'amount', 'credits', 'base']) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') return value[key];
    }
  }
  return value;
}

function toNumber(value, fallback = 0, { nullable = false } = {}) {
  const unwrapped = unwrapNumberish(value);
  if (unwrapped === '' || unwrapped == null) return nullable ? null : fallback;
  const number = Number(unwrapped);
  return Number.isFinite(number) ? number : (nullable ? null : fallback);
}

function setNumberAtPath(object, path, fallback = 0, options = {}) {
  const parts = path.split('.');
  let target = object;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    target[part] ??= {};
    target = target[part];
  }
  const key = parts.at(-1);
  target[key] = toNumber(target[key], fallback, options);
}

export const BLANK_ITEM_DEFAULTS = Object.freeze({
  weapon: {
    damage: '1d8',
    damageType: 'energy',
    attackBonus: 0,
    attackAttribute: 'str',
    range: 'melee',
    weight: 1,
    cost: 0,
    value: 0,
    equipped: false,
    integrated: false,
    description: '',
    properties: [],
    ammunition: { type: 'none', current: 0, max: 0 },
    size: 'Medium',
    upgradeSlots: 1,
    installedUpgrades: [],
    strippedFeatures: { damage: false, range: false, design: false, stun: false, autofire: false },
    baseDamageStripped: '',
    baseRangeStripped: '',
    sizeIncreaseApplied: false,
    restriction: 'common',
    gearTemplate: '',
    gearTemplateSecondary: '',
    templateCost: 0,
    meleeOrRanged: 'melee',
    weaponCategory: 'simple',
    damageBonus: 'str',
    criticalRange: '20',
    criticalMultiplier: 'x2',
    specialEffects: '',
    autofire: false,
    dualWielded: false,
    wieldedTwoHanded: false,
    activated: false,
    vehicleMount: {
      mountKey: '',
      mountLabel: '',
      arc: 'unknown',
      linkedGroup: '',
      fireControl: '',
      crewRole: 'gunner',
      importSource: '',
      parseConfidence: 'unknown',
      rawSource: ''
    },
    arc: 'unknown',
    fireControl: '',
    bonus: '+0',
    mounted: false
  },

  armor: {
    armorType: 'light',
    defenseBonus: 0,
    equipmentBonus: 0,
    maxDexBonus: null,
    armorCheckPenalty: 0,
    fortBonus: 0,
    speedPenalty: 0,
    weight: 1,
    cost: 0,
    value: 0,
    equipped: false,
    integrated: false,
    description: '',
    size: 'Medium',
    isPoweredArmor: false,
    upgradeSlots: 1,
    installedUpgrades: [],
    strippedFeatures: { defensiveMaterial: false, jointProtection: false },
    originalDefenseBonus: 0,
    originalEquipmentBonus: 0,
    originalWeight: 0,
    sizeIncreaseApplied: false,
    restriction: 'common',
    shieldRating: 0,
    currentSR: 0,
    armorProficiencyRequired: '',
    charges: { current: 0, max: 0 },
    activated: false,
    reflexBonus: 0,
    fortitudeBonus: 0,
    maxDex: 999,
    equipmentPerceptionBonus: 0,
    armorProficiency: false,
    features: '',
    gearTemplate: '',
    gearTemplateSecondary: '',
    templateCost: 0
  },

  equipment: {
    category: 'gear',
    weight: 1,
    cost: 0,
    value: 0,
    equipped: false,
    integrated: false,
    description: '',
    size: 'Medium',
    upgradeSlots: 1,
    installedUpgrades: [],
    sizeIncreaseApplied: false,
    restriction: 'common',
    gearTemplate: '',
    gearTemplateSecondary: '',
    templateCost: 0
  },

  feat: {
    featType: 'general',
    category: 'General',
    source: 'Manual',
    prerequisite: '',
    benefit: '',
    special: '',
    normalText: '',
    bonusFeatFor: [],
    uses: { current: 0, max: 0, perDay: false }
  },

  talent: {
    tree: 'General',
    talentTree: 'General',
    source: 'Manual',
    prerequisite: '',
    prerequisites: '',
    benefit: '',
    special: '',
    uses: { current: 0, max: 0, perEncounter: false, perDay: false },
    isCustom: true
  },

  'force-power': {
    description: '',
    source: 'Manual',
    level: 1,
    powerLevel: 1,
    discipline: 'general',
    useTheForce: 15,
    time: 'Standard Action',
    range: '6 squares',
    target: '',
    duration: 'Instantaneous',
    effect: '',
    special: '',
    tags: [],
    uses: { current: 1, max: 1 },
    inSuite: false,
    spent: false,
    discarded: false,
    isCustom: true
  },

  maneuver: {
    description: '',
    source: 'Manual',
    actionType: 'standard',
    talentTree: 'Custom',
    tags: [],
    uses: { current: 1, max: 1 },
    inSuite: false,
    spent: false,
    isCustom: true
  }
});

const NUMERIC_PATHS = {
  weapon: [
    ['attackBonus', 0],
    ['weight', 1],
    ['cost', 0],
    ['value', 0],
    ['ammunition.current', 0],
    ['ammunition.max', 0],
    ['upgradeSlots', 1],
    ['templateCost', 0]
  ],
  armor: [
    ['defenseBonus', 0],
    ['equipmentBonus', 0],
    ['maxDexBonus', null, { nullable: true }],
    ['armorCheckPenalty', 0],
    ['fortBonus', 0],
    ['speedPenalty', 0],
    ['weight', 1],
    ['cost', 0],
    ['value', 0],
    ['upgradeSlots', 1],
    ['originalDefenseBonus', 0],
    ['originalEquipmentBonus', 0],
    ['originalWeight', 0],
    ['shieldRating', 0],
    ['currentSR', 0],
    ['charges.current', 0],
    ['charges.max', 0],
    ['reflexBonus', 0],
    ['fortitudeBonus', 0],
    ['maxDex', 999],
    ['equipmentPerceptionBonus', 0],
    ['templateCost', 0]
  ],
  equipment: [
    ['weight', 1],
    ['cost', 0],
    ['value', 0],
    ['upgradeSlots', 1],
    ['templateCost', 0]
  ],
  feat: [
    ['uses.current', 0],
    ['uses.max', 0]
  ],
  talent: [
    ['uses.current', 0],
    ['uses.max', 0]
  ],
  'force-power': [
    ['level', 1],
    ['powerLevel', 1],
    ['useTheForce', 15],
    ['uses.current', 1],
    ['uses.max', 1]
  ],
  maneuver: [
    ['uses.current', 1],
    ['uses.max', 1]
  ]
};

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
}

export function getDefaultItemSystem(type, overrides = {}) {
  const safeType = String(type || 'equipment').trim() || 'equipment';
  return mergeObject(BLANK_ITEM_DEFAULTS[safeType] ?? {}, overrides);
}

export function createBlankItemData(type, overrides = {}) {
  const safeType = String(type || 'equipment').trim() || 'equipment';
  const baseName = safeType === 'equipment' ? 'New Gear' : `New ${compactName(safeType)}`;
  const systemOverrides = overrides.system ?? {};
  const flags = overrides.flags ?? {};
  const data = {
    name: overrides.name || baseName,
    type: safeType,
    img: overrides.img || 'icons/svg/item-bag.svg',
    system: getDefaultItemSystem(safeType, systemOverrides),
    flags
  };

  if (safeType === 'weapon') data.img = overrides.img || 'icons/svg/sword.svg';
  if (safeType === 'armor') data.img = overrides.img || 'icons/svg/shield.svg';
  if (safeType === 'feat') data.img = overrides.img || 'icons/svg/book.svg';
  if (safeType === 'talent') data.img = overrides.img || 'icons/svg/aura.svg';

  return data;
}

export function normalizeItemSystem(type, currentSystem = {}, submittedSystem = {}) {
  const safeType = String(type || 'equipment').trim() || 'equipment';
  const merged = mergeObject(
    getDefaultItemSystem(safeType),
    mergeObject(currentSystem ?? {}, submittedSystem ?? {})
  );

  for (const [path, fallback, options] of NUMERIC_PATHS[safeType] ?? []) {
    setNumberAtPath(merged, path, fallback, options ?? {});
  }

  if (merged.cost != null && (merged.value == null || merged.value === '')) {
    merged.value = toNumber(merged.cost, 0);
  }

  if (typeof merged.properties === 'string') {
    merged.properties = merged.properties.split(',').map(part => part.trim()).filter(Boolean);
  }

  if (typeof merged.tags === 'string') {
    merged.tags = merged.tags.split(',').map(part => part.trim()).filter(Boolean);
  }

  if (safeType === 'weapon') {
    if (!['str', 'dex'].includes(merged.attackAttribute)) merged.attackAttribute = 'str';
    if (!['energy', 'kinetic', 'sonic', 'ion', 'fire', 'cold', 'acid', 'force', 'stun'].includes(merged.damageType)) {
      merged.damageType = 'energy';
    }
  }

  if (safeType === 'armor') {
    if (!['light', 'medium', 'heavy', 'shield'].includes(merged.armorType)) merged.armorType = 'light';
    if (!['', 'light', 'medium', 'heavy'].includes(merged.armorProficiencyRequired)) merged.armorProficiencyRequired = '';
  }

  if (['weapon', 'armor', 'equipment'].includes(safeType)) {
    if (!['common', 'licensed', 'restricted', 'military', 'illegal'].includes(merged.restriction)) {
      merged.restriction = 'common';
    }
    if (!['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal', 'fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'].includes(merged.size)) {
      merged.size = 'Medium';
    }
  }

  return merged;
}

export function sanitizeItemSheetUpdate(item, submittedData = {}, form = null) {
  const itemType = String(item?.type || submittedData?.type || 'equipment');
  const currentSystem = clone(item?.system ?? {});
  const submittedSystem = clone(submittedData?.system ?? {});
  const system = normalizeItemSystem(itemType, currentSystem, submittedSystem);
  const hasField = (name) => !!form?.querySelector?.(`[name="${name}"]`);

  // Checkboxes do not appear in FormData when unchecked. If the field is visible
  // in this form submit, treat absence as false. If it is not visible, preserve
  // the current item value above.
  for (const path of [
    'system.equipped',
    'system.autofire',
    'system.dualWielded',
    'system.wieldedTwoHanded',
    'system.armorProficiency',
    'system.activated'
  ]) {
    if (!hasField(path)) continue;
    const systemPath = path.replace(/^system\./, '');
    const parts = systemPath.split('.');
    let target = system;
    for (let i = 0; i < parts.length - 1; i += 1) {
      target[parts[i]] ??= {};
      target = target[parts[i]];
    }
    const key = parts.at(-1);
    target[key] = normalizeBoolean(submittedSystem?.[key] ?? submittedSystem?.[systemPath] ?? target[key]);
    if (!(systemPath in submittedSystem)) target[key] = false;
  }

  // If the user changes the type selector on an existing embedded item, do not
  // push a top-level type update through Foundry's embedded document update path.
  // Re-typing documents can invalidate the sheet mid-render. Players can create a
  // new blank item of the desired type instead.
  const update = {
    name: submittedData?.name || item?.name || `New ${compactName(itemType)}`,
    system
  };

  if (submittedData?.img) update.img = submittedData.img;
  if (submittedData?.flags && typeof submittedData.flags === 'object') {
    update.flags = submittedData.flags;
  }

  return update;
}

export function ensureItemFlags(itemData = {}) {
  const flags = mergeObject(itemData.flags ?? {}, {});
  flags[SYSTEM_ID] ??= {};
  return { ...itemData, flags };
}
