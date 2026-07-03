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

function meleeDefenseOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'meleeDefense',
    label: 'Melee Defense',
    control: 'slider',
    min: 0,
    max: 99,
    resource: 'baseAttackBonus',
    requiresAttackType: 'melee',
    attackModifierFormula: '-value',
    defenseModifier: {
      target: 'defense.reflex',
      type: 'dodge',
      valueFormula: 'value',
      duration: 'untilStartOfNextTurn'
    },
    source: 'Melee Defense',
    summary: 'Trade melee attack bonus for an equal dodge bonus to Reflex Defense until your next turn.'
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

function rapidStrikeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'rapidStrike',
    label: 'Rapid Strike',
    control: 'toggle',
    requiresAttackType: 'melee',
    attackModifier: -2,
    damageExtraWeaponDice: 1,
    source: 'Rapid Strike',
    summary: 'Take -2 on a melee attack to deal +1 weapon die of damage.'
  };
}

function carefulShotOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'carefulShot',
    label: 'Careful Shot',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresAim: true,
    attackModifier: 1,
    source: 'Careful Shot',
    summary: 'When aiming with a ranged weapon, gain +1 on the attack roll.'
  };
}

function deadeyeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'deadeye',
    label: 'Deadeye',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresAim: true,
    damageExtraWeaponDice: 1,
    source: 'Deadeye',
    summary: 'When aiming with a ranged weapon, deal +1 weapon die of damage.'
  };
}

function burstFireOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'burstFire',
    label: 'Burst Fire',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresAutofire: true,
    attackModifier: -5,
    damageExtraWeaponDice: 2,
    ammunitionCost: 5,
    source: 'Burst Fire',
    summary: 'Use autofire against one target: -5 attack, +2 weapon dice, spend five shots.'
  };
}

function powerfulChargeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'powerfulCharge',
    label: 'Powerful Charge',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresCharge: true,
    attackModifier: 2,
    damageModifierFormula: 'halfLevel',
    source: 'Powerful Charge',
    summary: 'When charging with a melee attack, gain +2 attack and add half level to damage.'
  };
}

function chargingFireOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'chargingFire',
    label: 'Charging Fire',
    control: 'flag',
    requiresAttackType: 'ranged',
    requiresCharge: true,
    suppresses: ['chargeAttackBonus'],
    defenseModifier: {
      target: 'defense.reflex',
      type: 'untyped',
      value: -2,
      duration: 'untilStartOfNextTurn'
    },
    source: 'Charging Fire',
    summary: 'Make a ranged attack at the end of a charge without the normal charge attack bonus.'
  };
}

function improvedDisarmOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'improvedDisarm',
    label: 'Improved Disarm',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresManeuver: 'disarm',
    attackModifier: 5,
    suppresses: ['failedDisarmCounterattack'],
    source: 'Improved Disarm',
    summary: 'Gain +5 on melee attacks made specifically to disarm.'
  };
}

function mightySwingOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'mightySwing',
    label: 'Mighty Swing',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresSwiftActions: 2,
    damageExtraWeaponDice: 1,
    source: 'Mighty Swing',
    summary: 'Spend two swift actions to add one weapon die to your next melee attack.'
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
  if (normalized === 'melee defense') return meleeDefenseOption();
  if (normalized === 'rapid shot') return rapidShotOption();
  if (normalized === 'rapid strike') return rapidStrikeOption();
  if (normalized === 'careful shot') return carefulShotOption();
  if (normalized === 'deadeye') return deadeyeOption();
  if (normalized === 'burst fire') return burstFireOption();
  if (normalized === 'powerful charge') return powerfulChargeOption();
  if (normalized === 'charging fire') return chargingFireOption();
  if (normalized === 'improved disarm') return improvedDisarmOption();
  if (normalized === 'mighty swing') return mightySwingOption();
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
