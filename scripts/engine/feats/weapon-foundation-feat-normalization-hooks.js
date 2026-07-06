import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasRule(rules, id, type) {
  const wanted = String(id ?? '');
  const wantedType = String(type ?? '').toUpperCase();
  return asArray(rules).some(rule => String(rule?.id ?? rule?.key ?? '') === wanted && String(rule?.type ?? '').toUpperCase() === wantedType);
}

function selectedChoiceFromItem(item) {
  const system = item?.system ?? {};
  const meta = system.abilityMeta ?? {};
  const choiceMeta = system.choiceMeta ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? meta.selectedChoice ?? meta.selectedChoices;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object') {
    const value = entry.value ?? entry.id ?? entry.group ?? entry.weapon ?? entry.weaponGroup ?? entry.label ?? entry.name;
    if (String(value ?? '').trim()) return String(value).trim();
  }
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() ?? '';
}

function proficiencyKey(value) {
  const key = compact(value).replace(/weapons$/, 'weapon');
  if (!key) return '';
  if (key.includes('simple')) return 'simpleweapon';
  if (key.includes('pistol')) return 'pistol';
  if (key.includes('rifle')) return 'rifle';
  if (key.includes('heavy')) return 'heavyweapon';
  if (key.includes('advancedmelee')) return 'advancedmeleeweapon';
  if (key.includes('lightsaber')) return 'lightsaber';
  return key;
}

function proficiencyKeysForFeat(item) {
  const name = compact(item?.name);
  const choice = selectedChoiceFromItem(item);
  const keys = new Set();

  if (name === 'advancedmeleeweaponproficiency') keys.add('advancedmeleeweapon');
  if (name === 'heavyweaponproficiency') keys.add('heavyweapon');
  if (name === 'lightsaberproficiency') keys.add('lightsaber');

  if (name.startsWith('weaponproficiency')) {
    const key = proficiencyKey(choice || item?.name);
    if (key) keys.add(key);
  }

  if (name.startsWith('exoticweaponproficiency')) {
    const key = proficiencyKey(choice || item?.name);
    if (key && key !== 'exoticweaponproficiency') keys.add(key);
    if (choice) keys.add(choice);
  }

  return [...keys].filter(Boolean);
}

function weaponFinesseRule() {
  return {
    type: 'ATTACK_ABILITY_SUBSTITUTION',
    id: 'weaponFinesseDexToAttack',
    fromAbility: 'str',
    toAbility: 'dex',
    useBetter: true,
    requiresAttackType: 'melee',
    weaponGroups: ['light', 'light-melee', 'lightsaber', 'unarmed'],
    label: 'Weapon Finesse: use Dexterity for eligible melee attack rolls',
    source: 'Weapon Finesse'
  };
}

function focusChoicePatch(item) {
  const choice = selectedChoiceFromItem(item);
  if (!choice) return {};
  return {
    'system.selectedChoice': choice,
    'system.choiceMeta.selectedChoice': choice,
    'system.abilityMeta.selectedChoice': choice,
    'system.abilityMeta.requiresSelectedChoice': true,
    'system.abilityMeta.applicationScope': 'selected_weapon_group'
  };
}

async function materializeActorWeaponProficiencies(actor, keys = []) {
  if (!actor || !keys.length) return false;
  const current = actor.system?.proficiencies?.weapon;
  const next = {};
  if (current && typeof current === 'object' && !(current instanceof Set) && !Array.isArray(current)) {
    Object.assign(next, current);
  } else if (Array.isArray(current)) {
    for (const entry of current) next[proficiencyKey(entry)] = true;
  } else if (current instanceof Set) {
    for (const entry of current) next[proficiencyKey(entry)] = true;
  }

  let changed = false;
  for (const key of keys) {
    const normalized = proficiencyKey(key) || key;
    if (!normalized) continue;
    if (next[normalized] !== true) {
      next[normalized] = true;
      changed = true;
    }
  }
  if (!changed) return false;

  try {
    await actor.update({ 'system.proficiencies.weapon': next }, {
      source: 'WeaponFoundation.proficiencyMaterialization',
      swseWeaponFoundationNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.warn('[WeaponFoundationNormalization] Failed to materialize actor weapon proficiencies', { actorId: actor?.id, keys, error: err });
    return false;
  }
}

async function normalizeWeaponFoundationFeat(item, options = {}) {
  if (options?.swseWeaponFoundationNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const name = compact(item.name);
  const isWeaponFocus = name === 'weaponfocus' || name.startsWith('weaponfocus');
  const isWeaponFinesse = name === 'weaponfinesse';
  const proficiencyKeys = proficiencyKeysForFeat(item);
  if (!isWeaponFocus && !isWeaponFinesse && !proficiencyKeys.length) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = [...currentRules];
  const patch = {};

  if (isWeaponFinesse) {
    const rule = weaponFinesseRule();
    if (!hasRule(nextRules, rule.id, rule.type)) nextRules.push(rule);
    Object.assign(patch, {
      'system.executionModel': 'PASSIVE',
      'system.subType': 'STATE',
      'system.abilityMeta.mechanicsMode': 'weapon_attack_ability_substitution',
      'system.abilityMeta.applicationScope': 'eligible_melee_weapons',
      'system.abilityMeta.staticSheetPolicy': 'include'
    });
  }

  if (isWeaponFocus) {
    Object.assign(patch, focusChoicePatch(item), {
      'system.executionModel': 'PASSIVE',
      'system.subType': 'STATE',
      'system.abilityMeta.mechanicsMode': 'selected_weapon_attack_bonus',
      'system.abilityMeta.staticSheetPolicy': 'include'
    });
  }

  if (proficiencyKeys.length) {
    const meta = item.system?.abilityMeta ?? {};
    const proficiencies = meta.proficiencies && typeof meta.proficiencies === 'object' ? meta.proficiencies : {};
    const existingWeapon = asArray(proficiencies.weapon);
    const weapon = [...new Set([...existingWeapon, ...proficiencyKeys])];
    patch['system.executionModel'] = 'PASSIVE';
    patch['system.subType'] = 'STATE';
    patch['system.abilityMeta.mechanicsMode'] = 'weapon_proficiency_grant';
    patch['system.abilityMeta.applicationScope'] = 'weapon_proficiency';
    patch['system.abilityMeta.staticSheetPolicy'] = 'include';
    patch['system.abilityMeta.proficiencies'] = { ...proficiencies, weapon };
    await materializeActorWeaponProficiencies(item.actor, proficiencyKeys);
  }

  if (nextRules.length !== currentRules.length) patch['system.abilityMeta.rules'] = nextRules;
  if (!Object.keys(patch).length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'WeaponFoundation.normalization',
      swseWeaponFoundationNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[WeaponFoundationNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerWeaponFoundationFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeWeaponFoundationFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeWeaponFoundationFeat(item, options));
  SWSELogger.log('[WeaponFoundationNormalization] Hooks registered');
}

export default registerWeaponFoundationFeatNormalizationHooks;
