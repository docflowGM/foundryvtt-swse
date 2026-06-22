/**
 * Equipment Loadout Profile
 *
 * Shared, read-only equipment extractor for suggestion identity. This keeps
 * equipped items stronger than merely possessed items and exposes density
 * signals such as dual lightsabers, grenade-heavy inventory, or toolkit-heavy
 * gear without making any option legal/illegal.
 */

const WEAPON_GROUP_ALIASES = {
  lightsaber: ['lightsaber', 'light saber', 'sabers', 'saber'],
  simple_melee: ['simple melee', 'simple_melee', 'melee simple'],
  advanced_melee: ['advanced melee', 'advanced_melee', 'vibro', 'vibroblade', 'staff', 'sword'],
  pistol: ['pistol', 'pistols', 'blaster pistol', 'hold-out'],
  rifle: ['rifle', 'rifles', 'carbine', 'blaster rifle'],
  heavy_weapon: ['heavy weapon', 'heavy weapons', 'repeating blaster', 'missile', 'launcher'],
  grenade: ['grenade', 'grenades', 'thermal detonator', 'detonator', 'explosive'],
  thrown: ['thrown', 'throwing'],
};

const ARMOR_CATEGORY_ALIASES = {
  light: ['light armor', 'light'],
  medium: ['medium armor', 'medium'],
  heavy: ['heavy armor', 'heavy'],
};

const GEAR_TAG_PATTERNS = [
  { tag: 'toolkit', pattern: /\b(toolkit|tool kit|mechanic(?:s)? kit|repair kit)\b/i },
  { tag: 'medical', pattern: /\b(medkit|medpac|medical kit|surgery kit|first aid)\b/i },
  { tag: 'security', pattern: /\b(security kit|spike|slicer|computer interface|code cylinder)\b/i },
  { tag: 'survival', pattern: /\b(survival kit|climbing|breath mask|comlink|sensor pack|field kit)\b/i },
  { tag: 'jedi_gear', pattern: /\b(lightsaber|jedi robe|jedi robes|training remote|force talisman|kyber|crystal)\b/i },
  { tag: 'droid_tech', pattern: /\b(droid|restraining bolt|diagnostic|toolkit|repair)\b/i },
  { tag: 'explosives', pattern: /\b(grenade|thermal detonator|detonite|mine|explosive|charge)\b/i },
];

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function actorItems(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (Array.isArray(items.contents)) return items.contents;
  if (typeof items.values === 'function') return Array.from(items.values());
  return Array.from(items || []);
}

function boolish(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === 'object') {
    if (value.value != null) return boolish(value.value);
    if (value.state != null) return boolish(value.state);
    if (value.active != null) return boolish(value.active);
  }
  const text = String(value).toLowerCase().trim();
  return ['true', '1', 'yes', 'y', 'equipped', 'worn', 'held', 'active'].includes(text);
}

function isEquipped(item) {
  const sys = item?.system || {};
  return boolish(sys.equipped)
    || boolish(sys.isEquipped)
    || boolish(sys.carried?.equipped)
    || boolish(sys.location === 'equipped' || sys.location === 'worn' || sys.location === 'held')
    || boolish(sys.status === 'equipped' || sys.status === 'worn');
}

function quantity(item) {
  const sys = item?.system || {};
  const raw = sys.quantity ?? sys.qty ?? sys.count ?? sys.amount ?? 1;
  const n = Number(raw?.value ?? raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function aliasMatch(value, aliases) {
  const norm = normalize(value);
  if (!norm) return false;
  return aliases.some(alias => {
    const a = normalize(alias);
    return norm === a || norm.includes(a) || a.includes(norm);
  });
}

function classifyWeaponGroup(item) {
  const sys = item?.system || {};
  const fields = [
    sys.group,
    sys.weaponGroup,
    sys.weapon_group,
    sys.category,
    sys.type,
    sys.subtype,
    item?.name,
  ].filter(Boolean);

  for (const field of fields) {
    for (const [group, aliases] of Object.entries(WEAPON_GROUP_ALIASES)) {
      if (aliasMatch(field, aliases)) return group;
    }
  }

  return normalize(sys.group || sys.category || item?.name || 'weapon');
}

function classifyArmorCategory(item) {
  const sys = item?.system || {};
  const fields = [sys.category, sys.armorCategory, sys.armor_category, sys.type, sys.subtype, item?.name].filter(Boolean);
  for (const field of fields) {
    for (const [category, aliases] of Object.entries(ARMOR_CATEGORY_ALIASES)) {
      if (aliasMatch(field, aliases)) return category;
    }
  }
  return normalize(sys.category || item?.name || 'armor');
}

function addCount(map, key, amount, item) {
  if (!key) return;
  const entry = map[key] || { equippedCount: 0, inventoryCount: 0, totalWeight: 0, names: [] };
  if (item.equipped) entry.equippedCount += amount;
  else entry.inventoryCount += amount;
  entry.totalWeight += item.weight;
  if (item.name && !entry.names.includes(item.name)) entry.names.push(item.name);
  map[key] = entry;
}

function addTag(profile, tag, weight, equipped) {
  const key = normalize(tag);
  if (!key) return;
  profile.tagWeights[key] = Math.max(profile.tagWeights[key] || 0, weight);
  if (equipped) profile.equippedTags.add(key);
  else profile.inventoryTags.add(key);
  profile.allTags.add(key);
}

function weightForItem(item, equipped) {
  const qty = quantity(item);
  // Equipped is a declaration of active behavior. Possession is evidence, but weaker.
  return qty * (equipped ? 1.0 : 0.35);
}

function addWeaponTags(profile, group, item, equipped) {
  const base = equipped ? 1.0 : 0.35;
  addTag(profile, 'weapon', base, equipped);
  addTag(profile, group, base, equipped);
  if (group === 'lightsaber') {
    addTag(profile, 'lightsaber', equipped ? 1.35 : 0.55, equipped);
    addTag(profile, 'offense_melee', equipped ? 1.05 : 0.4, equipped);
    addTag(profile, 'melee', equipped ? 1.0 : 0.4, equipped);
    addTag(profile, 'force', equipped ? 0.75 : 0.3, equipped);
    addTag(profile, 'duelist', equipped ? 0.8 : 0.3, equipped);
  } else if (group.includes('melee')) {
    addTag(profile, 'offense_melee', equipped ? 0.9 : 0.35, equipped);
    addTag(profile, 'melee', equipped ? 0.8 : 0.3, equipped);
  } else if (['pistol', 'rifle', 'advanced_ranged'].includes(group)) {
    addTag(profile, 'offense_ranged', equipped ? 0.95 : 0.35, equipped);
    addTag(profile, 'ranged', equipped ? 0.85 : 0.3, equipped);
  } else if (group === 'heavy_weapon') {
    addTag(profile, 'heavy_weapon', equipped ? 1.0 : 0.35, equipped);
    addTag(profile, 'offense_ranged', equipped ? 0.8 : 0.3, equipped);
    addTag(profile, 'area_damage', equipped ? 0.65 : 0.25, equipped);
  } else if (group === 'grenade') {
    addTag(profile, 'grenade', equipped ? 1.0 : 0.35, equipped);
    addTag(profile, 'explosives', equipped ? 0.9 : 0.3, equipped);
    addTag(profile, 'area_damage', equipped ? 0.85 : 0.3, equipped);
    addTag(profile, 'control', equipped ? 0.55 : 0.2, equipped);
  }
}

function addArmorTags(profile, category, equipped) {
  const base = equipped ? 1.0 : 0.3;
  addTag(profile, 'armor', base, equipped);
  addTag(profile, category, base, equipped);
  addTag(profile, 'defense', equipped ? 0.65 : 0.2, equipped);
  if (category === 'heavy') addTag(profile, 'survivability', equipped ? 0.75 : 0.25, equipped);
  if (category === 'light') addTag(profile, 'mobility', equipped ? 0.55 : 0.2, equipped);
}

function addGearTags(profile, item, equipped) {
  const name = item?.name || '';
  const sys = item?.system || {};
  const base = equipped ? 0.85 : 0.3;
  const addGearTag = (tag, weight = base) => {
    const key = normalize(tag);
    if (!key) return;
    addTag(profile, key, weight, equipped);
    addCount(profile.gearTags, key, quantity(item), { name, equipped, weight });
  };

  const text = [
    name, sys.category, sys.group, sys.type, sys.subtype,
    sys.equipmentBucket, sys.equipmentType, sys.itemRole, sys.usage?.mode, sys.description,
    ...(Array.isArray(sys.tags) ? sys.tags : []),
    ...(Array.isArray(sys.traits) ? sys.traits : [])
  ].join(' ');

  for (const entry of GEAR_TAG_PATTERNS) {
    if (entry.pattern.test(text)) addGearTag(entry.tag);
  }

  for (const value of [sys.equipmentBucket, sys.equipmentType, sys.itemRole, sys.category, sys.usage?.mode]) {
    if (value) addGearTag(value);
  }
  if (sys.equipmentBucket) addGearTag(`bucket_${sys.equipmentBucket}`, base * 0.9);
  if (sys.equipmentType) addGearTag(`type_${sys.equipmentType}`, base * 0.9);
  if (sys.itemRole) addGearTag(`role_${sys.itemRole}`, base * 0.9);

  if (Array.isArray(sys.skillHooks)) {
    for (const hook of sys.skillHooks) {
      if (hook?.skill) addGearTag(hook.skill, base * 1.05);
      if (hook?.useKey) addGearTag(hook.useKey, base);
      if (hook?.bonus?.type === 'equipment') addGearTag('equipment_bonus', base);
      if (hook?.required === true || hook?.mode === 'requires') addGearTag('required_gear', base);
      if (hook?.consumes) addGearTag('consumable', base);
    }
  }

  if (sys.capabilities && typeof sys.capabilities === 'object') {
    for (const [key, value] of Object.entries(sys.capabilities)) {
      if (value === true) addGearTag(key, base * 0.85);
    }
    if (sys.capabilities.perceptionEquipmentBonus) addGearTag('perception', base);
    if (sys.capabilities.accuracySupport) addGearTag('accuracy', base);
    if (sys.capabilities.rangeCategoryReduction) addGearTag('range_support', base);
    if (sys.capabilities.lowLightVision || sys.capabilities.lowLightTargeting) addGearTag('low_light', base);
    if (sys.capabilities.integratedHandsFreeComlink) addGearTag('communication', base);
    if (sys.capabilities.containerSlots || sys.capabilities.container) addGearTag('quick_access', base);
    if (sys.capabilities.concealedCarry) addGearTag('concealment', base);
  }
}

export function buildEquipmentLoadoutProfile(actor) {
  const profile = {
    weaponGroups: {},
    armorCategories: {},
    gearTags: {},
    equippedTags: new Set(),
    inventoryTags: new Set(),
    allTags: new Set(),
    tagWeights: {},
    equippedWeaponCount: 0,
    inventoryWeaponCount: 0,
    equippedArmorCount: 0,
    inventoryArmorCount: 0,
    equippedItemCount: 0,
    inventoryItemCount: 0,
    dualWield: false,
    dualLightsabers: false,
    primaryWeaponGroup: null,
    signatureWeaponGroup: null,
    hasEquippedLightsaber: false,
    hasLightsaber: false,
    hasEquippedGrenade: false,
    hasGrenadeStock: false,
  };

  for (const item of actorItems(actor)) {
    const type = item?.type;
    const equipped = isEquipped(item);
    const qty = quantity(item);
    const itemWeight = weightForItem(item, equipped);
    const itemRecord = { name: item?.name || '', equipped, weight: itemWeight };

    if (equipped) profile.equippedItemCount += qty;
    else profile.inventoryItemCount += qty;

    if (type === 'weapon') {
      const group = classifyWeaponGroup(item);
      addCount(profile.weaponGroups, group, qty, itemRecord);
      addWeaponTags(profile, group, item, equipped);
      if (equipped) profile.equippedWeaponCount += qty;
      else profile.inventoryWeaponCount += qty;
      if (group === 'lightsaber') {
        profile.hasLightsaber = true;
        if (equipped) profile.hasEquippedLightsaber = true;
      }
      if (group === 'grenade') {
        profile.hasGrenadeStock = true;
        if (equipped) profile.hasEquippedGrenade = true;
      }
    } else if (type === 'armor') {
      const category = classifyArmorCategory(item);
      addCount(profile.armorCategories, category, qty, itemRecord);
      addArmorTags(profile, category, equipped);
      if (equipped) profile.equippedArmorCount += qty;
      else profile.inventoryArmorCount += qty;
    } else if (['equipment', 'gear', 'consumable', 'tool'].includes(type)) {
      addGearTags(profile, item, equipped);
    }
  }

  const equippedWeaponEntries = Object.entries(profile.weaponGroups)
    .filter(([, data]) => Number(data.equippedCount || 0) > 0)
    .sort((a, b) => (b[1].equippedCount - a[1].equippedCount) || (b[1].totalWeight - a[1].totalWeight));

  const allWeaponEntries = Object.entries(profile.weaponGroups)
    .sort((a, b) => (b[1].totalWeight - a[1].totalWeight) || (b[1].equippedCount - a[1].equippedCount));

  profile.primaryWeaponGroup = equippedWeaponEntries[0]?.[0] || allWeaponEntries[0]?.[0] || null;
  profile.signatureWeaponGroup = allWeaponEntries[0]?.[0] || null;
  profile.dualWield = profile.equippedWeaponCount >= 2;
  profile.dualLightsabers = Number(profile.weaponGroups.lightsaber?.equippedCount || 0) >= 2;

  if (profile.dualWield) {
    addTag(profile, 'dual_wield', profile.dualLightsabers ? 1.35 : 1.0, true);
    addTag(profile, 'two_weapon_fighting', profile.dualLightsabers ? 1.15 : 0.85, true);
  }
  if (profile.dualLightsabers) {
    addTag(profile, 'jar_kai', 1.2, true);
    addTag(profile, 'lightsaber', 1.55, true);
    addTag(profile, 'duelist', 1.1, true);
  }

  profile.equippedTags = Array.from(profile.equippedTags).sort();
  profile.inventoryTags = Array.from(profile.inventoryTags).sort();
  profile.allTags = Array.from(profile.allTags).sort();
  return profile;
}

export function getEquipmentLoadoutProfile(actor, options = {}) {
  return options?.equipmentProfile || buildEquipmentLoadoutProfile(actor);
}

export function getLoadoutTagWeight(profile, tag) {
  if (!profile) return 0;
  return Number(profile.tagWeights?.[normalize(tag)] || 0);
}

export function scoreCandidateLoadoutFit(candidate, profile) {
  if (!candidate || !profile) return { score: 0, matches: [] };
  const tags = Array.from(new Set([
    ...(Array.isArray(candidate?.context?.allTags) ? candidate.context.allTags : []),
    ...(Array.isArray(candidate?.tags) ? candidate.tags : []),
    ...(Array.isArray(candidate?.system?.tags) ? candidate.system.tags : []),
  ].map(normalize).filter(Boolean)));

  const nameText = String(candidate?.name || '').toLowerCase();
  if (/lightsaber/.test(nameText)) tags.push('lightsaber', 'offense_melee');
  if (/cleave|power attack|rapid strike|melee/.test(nameText)) tags.push('offense_melee', 'melee');
  if (/two-weapon|dual|jar'?kai|jar kai/.test(nameText)) tags.push('dual_wield', 'two_weapon_fighting');
  if (/grenade|explosive|blast/.test(nameText)) tags.push('grenade', 'explosives', 'area_damage');

  let total = 0;
  const matches = [];
  for (const tag of Array.from(new Set(tags))) {
    const weight = getLoadoutTagWeight(profile, tag);
    if (weight > 0) {
      total += weight;
      matches.push({ tag, weight });
    }
  }

  matches.sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag));
  return {
    score: Math.max(0, Math.min(1, total / 4)),
    matches: matches.slice(0, 6),
  };
}

export function hasLoadoutCommitment(profile, tags = []) {
  if (!profile) return false;
  return tags.some(tag => getLoadoutTagWeight(profile, tag) >= 0.75);
}

export default buildEquipmentLoadoutProfile;
