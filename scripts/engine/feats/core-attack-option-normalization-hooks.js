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

function improvedChargeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'improvedCharge',
    label: 'Improved Charge',
    control: 'flag',
    requiresAttackType: 'melee',
    requiresCharge: true,
    suppresses: ['chargeReflexPenalty'],
    defenseModifier: {
      target: 'defense.reflex',
      type: 'untyped',
      value: 2,
      duration: 'untilStartOfNextTurn',
      offsets: 'chargeReflexPenalty'
    },
    actionEconomy: {
      type: 'autoChargeIfMissing',
      spend: 'ridesCharge',
      riderFor: 'charge'
    },
    source: 'Improved Charge',
    summary: 'Charge rider: removes the normal -2 Reflex penalty from a charge while preserving the charge attack action.'
  };
}

function deftChargeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'deftCharge',
    label: 'Deft Charge',
    control: 'flag',
    requiresCharge: true,
    movementRider: true,
    chargeMovementRider: true,
    actionEconomy: {
      type: 'autoChargeIfMissing',
      spend: 'ridesCharge',
      riderFor: 'charge',
      movementRider: true
    },
    source: 'Deft Charge',
    summary: 'Charge movement rider: flags that the charge path uses Deft Charge movement permissions; path legality remains table/GM adjudicated.'
  };
}

function recklessChargeOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'recklessCharge',
    label: 'Reckless Charge',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresCharge: true,
    attackModifier: 2,
    defenseModifier: {
      target: 'defense.reflex',
      type: 'untyped',
      value: -2,
      duration: 'untilStartOfNextTurn'
    },
    actionEconomy: {
      type: 'autoChargeIfMissing',
      spend: 'ridesCharge',
      riderFor: 'charge'
    },
    source: 'Reckless Charge',
    summary: 'Charge rider: take an additional Reflex penalty until your next turn to gain an additional charge attack bonus.'
  };
}

function springAttackOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'springAttack',
    label: 'Spring Attack',
    control: 'flag',
    requiresAttackType: 'melee',
    requiresSingleAttack: true,
    movementRider: true,
    actionEconomy: {
      type: 'standardAttackPlusMove',
      spend: 'riderOnly',
      riderFor: 'standardAttack',
      movementRider: true,
      movementSplit: 'beforeAndAfterAttack',
      moveActionRequired: true,
      replacesStandardAttackCost: false
    },
    source: 'Spring Attack',
    summary: 'Movement rider: allows movement before and after a single melee attack; movement validation remains with the movement workflow/GM.'
  };
}

function banthaRushOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'banthaRush',
    label: 'Bantha Rush',
    control: 'flag',
    requiresAttackType: 'melee',
    requiresManeuver: 'banthaRush',
    targetPushSquares: 1,
    actionEconomy: {
      type: 'standardAttackManeuver',
      spend: 'ridesAttack',
      riderFor: 'meleeAttack'
    },
    source: 'Bantha Rush',
    summary: 'Melee attack maneuver rider: on a qualifying hit, push the target 1 square; target size/path legality remains GM adjudicated.'
  };
}

function improvedBanthaRushOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'improvedBanthaRush',
    label: 'Improved Bantha Rush',
    control: 'flag',
    requiresAttackType: 'melee',
    requiresManeuver: 'banthaRush',
    enhances: ['banthaRush'],
    targetPushSquares: 2,
    actionEconomy: {
      type: 'banthaRushRider',
      spend: 'riderOnly',
      riderFor: 'banthaRush'
    },
    source: 'Improved Bantha Rush',
    summary: 'Bantha Rush rider: improves the pushed distance for a qualifying Bantha Rush; target/path legality remains GM adjudicated.'
  };
}

function runningAttackOption() {
  return {
    type: 'ATTACK_OPTION',
    id: 'runningAttack',
    label: 'Running Attack',
    control: 'flag',
    actionEconomy: {
      type: 'standardAttackPlusMove',
      spend: 'riderOnly',
      riderFor: 'standardAttack',
      movementRider: true,
      movementSplit: 'beforeAndAfterAttack',
      moveActionRequired: true,
      replacesStandardAttackCost: false
    },
    requiresSingleAttack: true,
    source: 'Running Attack',
    summary: 'Allows movement before and after a single melee or ranged attack, up to the normal movement allowed by the move action. It does not replace the attack action cost.'
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
  if (normalized === 'improved charge') return improvedChargeOption();
  if (normalized === 'deft charge') return deftChargeOption();
  if (normalized === 'reckless charge') return recklessChargeOption();
  if (normalized === 'spring attack') return springAttackOption();
  if (normalized === 'bantha rush') return banthaRushOption();
  if (normalized === 'improved bantha rush') return improvedBanthaRushOption();
  if (normalized === 'running attack') return runningAttackOption();
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
