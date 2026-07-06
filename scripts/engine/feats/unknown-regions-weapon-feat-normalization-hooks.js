import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
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

function selectedChoicePatch(item) {
  const choice = selectedChoiceFromItem(item);
  if (!choice) return {};
  return {
    'system.selectedChoice': choice,
    'system.choiceMeta.selectedChoice': choice,
    'system.abilityMeta.selectedChoice': choice,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function haltRule(item) {
  const choice = selectedChoiceFromItem(item);
  return {
    type: 'HIT_RIDER',
    id: 'haltAttackOfOpportunityStopMovement',
    selectedChoice: Boolean(choice),
    trigger: 'attackOfOpportunityHit',
    requiresAttackOfOpportunity: true,
    targetEffectsOnHit: [{
      type: 'halt-movement-grapple-check-rider',
      sourceName: 'Halt',
      compareSameAttackRollToTargetGrapple: true,
      maxTargetSizeDelta: 1,
      onSuccess: ['stopMovement', 'knockProne'],
      onDamageThresholdExceeded: ['endTargetTurn', 'removeRemainingActions'],
      chargeEndsIfKnockedProne: true,
      manualResolution: true
    }],
    source: 'Halt',
    label: 'Halt: AoO hit can stop movement and knock prone'
  };
}

function heavyHitterRule() {
  return {
    type: 'HIT_RIDER',
    id: 'heavyHitterVehicleWeaponMarginDamage',
    requiresVehicleWeapon: true,
    requiresWeaponText: ['emplacement', 'vehicle-weapon', 'starship-weapon', 'weapon-system', 'turbolaser', 'laser-cannon', 'ion-cannon', 'proton-torpedo', 'concussion-missile'],
    targetEffectsOnHit: [{
      type: 'margin-damage-and-threshold-rider',
      sourceName: 'Heavy Hitter',
      damageBonusFormula: 'floor(max(0, attackRollTotal - target.reflexDefense) / 5)',
      damageBonusPerMargin: 1,
      marginStep: 5,
      onDamageThresholdExceeded: [{
        type: 'attack-disabled-and-speed-penalty',
        duration: 'targetNextTurn',
        cannotAttack: true,
        speedPenaltySquares: -2,
        starshipScaleSpeedPenaltySquares: -1
      }],
      manualResolution: true
    }],
    source: 'Heavy Hitter',
    label: 'Heavy Hitter: vehicle/emplacement margin damage rider'
  };
}

function improvisedWeaponRules() {
  return [
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      id: 'improvisedWeaponMasteryTreatAsSimple',
      requiresWeaponText: ['improvised'],
      property: 'proficiency',
      value: 'simple',
      source: 'Improvised Weapon Mastery',
      label: 'Improvised Weapon Mastery: improvised weapons count as simple weapons'
    },
    {
      type: 'HIT_RIDER',
      id: 'improvisedWeaponMasteryExtraDamage',
      requiresWeaponText: ['improvised'],
      targetEffectsOnHit: [{
        type: 'extra-damage-dice',
        sourceName: 'Improvised Weapon Mastery',
        dice: '1d6',
        damageFormula: '1d6',
        manualResolution: false
      }],
      source: 'Improvised Weapon Mastery',
      label: 'Improvised Weapon Mastery: +1d6 damage with improvised weapons'
    }
  ];
}

function rulesForFeat(item) {
  const name = compact(item?.name);
  if (name === 'halt' || name.startsWith('halt')) return [haltRule(item)];
  if (name === 'heavyhitter') return [heavyHitterRule()];
  if (name === 'improvisedweaponmastery') return improvisedWeaponRules();
  return [];
}

async function normalizeUnknownRegionsWeaponFeat(item, options = {}) {
  if (options?.swseUnknownRegionsWeaponNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rulesToAdd = rulesForFeat(item);
  if (!rulesToAdd.length) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = [...currentRules];
  for (const rule of rulesToAdd) {
    if (!hasRule(nextRules, rule.id, rule.type)) nextRules.push(rule);
  }

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'STATE',
    'system.abilityMeta.mechanicsMode': 'weapon_hit_rider',
    'system.abilityMeta.applicationScope': 'weapon_attack_resolution',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.rules': nextRules,
    ...selectedChoicePatch(item)
  };

  const rulesChanged = nextRules.length !== currentRules.length;
  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== 'weapon_hit_rider'
    || item.system?.abilityMeta?.applicationScope !== 'weapon_attack_resolution'
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'UnknownRegionsWeapon.normalization',
      swseUnknownRegionsWeaponNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[UnknownRegionsWeaponNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerUnknownRegionsWeaponFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeUnknownRegionsWeaponFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeUnknownRegionsWeaponFeat(item, options));
  SWSELogger.log('[UnknownRegionsWeaponNormalization] Hooks registered');
}

export default registerUnknownRegionsWeaponFeatNormalizationHooks;
