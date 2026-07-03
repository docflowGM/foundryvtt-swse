import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasAttackOption(item, id) {
  const wanted = String(id ?? '').trim().toLowerCase();
  return asArray(item?.system?.abilityMeta?.rules).some(rule => {
    const ruleId = String(rule?.id ?? rule?.option ?? rule?.key ?? '').trim().toLowerCase();
    return String(rule?.type ?? '').toUpperCase() === 'ATTACK_OPTION' && ruleId === wanted;
  });
}

function powerAttackOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'powerAttack',
    label: 'Power Attack',
    control: 'slider',
    min: 0,
    max: 99,
    resource: 'baseAttackBonus',
    requiresAttackType: 'melee',
    attackModifierFormula: '-value',
    damageModifierFormula: 'value',
    source: 'Power Attack',
    summary: 'Before making a melee attack, take a penalty up to your base attack bonus and add the same value to melee damage; doubled when wielded two-handed.'
  };
}

function rapidShotOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'rapidShot',
    label: 'Rapid Shot',
    control: 'toggle',
    requiresAttackType: 'ranged',
    attackModifier: -2,
    damageExtraWeaponDice: 1,
    source: 'Rapid Shot',
    summary: 'Take -2 on a ranged attack to deal +1 weapon die of damage. If Strength is below 13, non-vehicle weapon attacks take -5 instead.'
  };
}

function flurryOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'flurry',
    label: 'Flurry',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresWeaponGroups: ['light', 'light-melee', 'lightsaber'],
    requiresAllEquippedWeaponsGroups: ['light', 'light-melee', 'lightsaber'],
    attackModifier: 2,
    defenseModifier: {
      target: 'defense.reflex',
      type: 'untyped',
      value: -5,
      duration: 'untilStartOfNextTurn'
    },
    source: 'Flurry',
    summary: 'When wielding only light weapons or lightsabers, gain +2 melee attack and take -5 Reflex until the start of your next turn.'
  };
}

function optionForFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'power attack') return powerAttackOption();
  if (normalized === 'rapid shot') return rapidShotOption();
  if (normalized === 'flurry') return flurryOption();
  return null;
}

async function normalizeCoreAttackOptionFeat(item, options = {}) {
  if (options?.swseCoreAttackOptionNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const option = optionForFeat(item.name);
  if (!option || hasAttackOption(item, option.id)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'attack_option',
      'system.abilityMeta.applicationScope': 'roll_context_only',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [
        ...asArray(item.system?.abilityMeta?.rules),
        option
      ]
    }], {
      source: 'CoreAttackOptions.normalization',
      swseCoreAttackOptionNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[CoreAttackOptions] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerCoreAttackOptionNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeCoreAttackOptionFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeCoreAttackOptionFeat(item, options));
  SWSELogger.log('[CoreAttackOptions] Normalization hooks registered');
}

export default registerCoreAttackOptionNormalizationHooks;
