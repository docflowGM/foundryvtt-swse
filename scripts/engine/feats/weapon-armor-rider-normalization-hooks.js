import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasRule(item, id, type = null) {
  const wanted = String(id ?? '').trim();
  const wantedType = type ? String(type).toUpperCase() : null;
  const rules = [
    ...asArray(item?.system?.abilityMeta?.rules),
    ...asArray(item?.system?.abilityMeta?.attackOptionRules)
  ];
  return rules.some(rule => {
    const ruleId = String(rule?.id ?? rule?.option ?? rule?.key ?? '').trim();
    const ruleType = String(rule?.type ?? '').toUpperCase();
    return ruleId === wanted && (!wantedType || ruleType === wantedType);
  });
}

function improvedRapidStrikeRules() {
  return {
    option: {
      type: 'ATTACK_OPTION',
      id: 'improvedRapidStrike',
      label: 'Improved Rapid Strike',
      control: 'toggle',
      requiresAttackType: 'melee',
      requiresWeaponGroups: ['light', 'light-melee', 'lightsaber'],
      requiresOption: 'rapidStrike',
      riderFor: 'rapidStrike',
      source: 'Improved Rapid Strike',
      summary: 'Rapid Strike rider: when using Rapid Strike with a light melee weapon or lightsaber, replace Rapid Strike with -5 attack for +2 weapon dice, or -10 if Dexterity is below 13.'
    },
    runtime: {
      type: 'WEAPON_ARMOR_RIDER',
      id: 'improvedRapidStrike',
      trigger: 'rapidStrike',
      mode: 'REPLACE_EXTRA_DAMAGE_DICE_OPTION',
      requiresAttackType: 'melee',
      requiresWeaponGroups: ['light', 'light-melee', 'lightsaber'],
      attackPenalty: -5,
      lowDexAttackPenalty: -10,
      dexterityMinimum: 13,
      damageExtraWeaponDice: 2,
      replaces: ['rapidStrike'],
      doesNotStackWith: ['mightySwing'],
      source: 'Improved Rapid Strike'
    }
  };
}

function savageAttackRule() {
  return {
    type: 'WEAPON_ARMOR_RIDER',
    id: 'savageAttack',
    trigger: 'fullAttackDoubleAttack',
    mode: 'FOLLOWUP_DAMAGE_DICE_AFTER_FIRST_HIT',
    requiresFullAttack: true,
    requiresDoubleAttackSelection: true,
    damageExtraWeaponDice: 1,
    targetLock: true,
    source: 'Savage Attack',
    summary: 'Double Attack rider: after the first successful attack in a Full Attack, each remaining successful attack against that same target gains +1 weapon die.'
  };
}

function collateralDamageRules() {
  return {
    option: {
      type: 'ATTACK_OPTION',
      id: 'collateralDamage',
      label: 'Collateral Damage',
      control: 'flag',
      requiresAttackType: 'ranged',
      requiresOption: 'rapidShot',
      excludesAreaAttack: true,
      riderFor: 'rapidShot',
      source: 'Collateral Damage',
      summary: 'Rapid Shot rider: once per turn after damaging with a single non-area Rapid Shot attack, make a secondary attack at -2 against a target within 2 squares; on hit, deal half original damage.'
    },
    runtime: {
      type: 'WEAPON_ARMOR_RIDER',
      id: 'collateralDamage',
      trigger: 'rapidShotDamage',
      mode: 'SECONDARY_ATTACK_HALF_DAMAGE',
      requiresAttackType: 'ranged',
      requiresOption: 'rapidShot',
      excludesAreaAttack: true,
      oncePerTurn: true,
      secondaryAttackPenalty: -2,
      secondaryTargetWithinSquares: 2,
      secondaryDamageMultiplier: 0.5,
      source: 'Collateral Damage'
    }
  };
}

function hobblingStrikeRules() {
  return {
    option: {
      type: 'ATTACK_OPTION',
      id: 'hobblingStrike',
      label: 'Hobbling Strike',
      control: 'toggle',
      riderForAny: ['rapidShot', 'rapidStrike', 'sneakAttack'],
      source: 'Hobbling Strike',
      summary: 'Extra-damage rider: forgo extra dice from Sneak Attack, Rapid Shot, or Rapid Strike to reduce target Speed by 1 square until the end of the encounter.'
    },
    runtime: {
      type: 'WEAPON_ARMOR_RIDER',
      id: 'hobblingStrike',
      trigger: 'extraDamageDiceSource',
      mode: 'FORGO_EXTRA_DICE_FOR_TARGET_SPEED_PENALTY',
      sourceTriggers: ['rapidShot', 'rapidStrike', 'sneakAttack'],
      speedPenaltySquares: 1,
      duration: 'encounter',
      source: 'Hobbling Strike'
    }
  };
}

function staggeringAttackRules() {
  return {
    option: {
      type: 'ATTACK_OPTION',
      id: 'staggeringAttack',
      label: 'Staggering Attack',
      control: 'toggle',
      riderForAny: ['rapidShot', 'rapidStrike', 'sneakAttack', 'extraDamageDiceSource'],
      source: 'Staggering Attack',
      summary: 'Extra-damage rider: forgo extra damage dice from a feat or talent to move the target 2 squares per die sacrificed without provoking attacks of opportunity.'
    },
    runtime: {
      type: 'WEAPON_ARMOR_RIDER',
      id: 'staggeringAttack',
      trigger: 'extraDamageDiceSource',
      mode: 'FORGO_EXTRA_DICE_FOR_FORCED_MOVEMENT',
      sourceTriggers: ['rapidShot', 'rapidStrike', 'sneakAttack', 'extraDamageDiceSource'],
      movementSquaresPerDie: 2,
      provokesOpportunityAttacks: false,
      source: 'Staggering Attack'
    }
  };
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'improved rapid strike') return improvedRapidStrikeRules();
  if (normalized === 'savage attack') return { runtime: savageAttackRule() };
  if (normalized === 'collateral damage') return collateralDamageRules();
  if (normalized === 'hobbling strike') return hobblingStrikeRules();
  if (normalized === 'staggering attack') return staggeringAttackRules();
  return null;
}

async function normalizeWeaponArmorRiderFeat(item, options = {}) {
  if (options?.swseWeaponArmorRiderNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;

  const abilityRules = asArray(item.system?.abilityMeta?.rules);
  const runtimeRules = asArray(item.system?.abilityMeta?.attackOptionRules);
  const patch = { _id: item.id };

  if (rules.option && !hasRule(item, rules.option.id, 'ATTACK_OPTION')) {
    patch['system.abilityMeta.rules'] = [...abilityRules, rules.option];
  }

  if (rules.runtime && !hasRule(item, rules.runtime.id, 'WEAPON_ARMOR_RIDER')) {
    patch['system.abilityMeta.attackOptionRules'] = [...runtimeRules, rules.runtime];
  }

  if (Object.keys(patch).length <= 1) return false;

  patch['system.executionModel'] = 'ACTIVE';
  patch['system.subType'] = 'RULE';
  patch['system.abilityMeta.mechanicsMode'] = 'attack_option_rider';
  patch['system.abilityMeta.applicationScope'] = 'roll_context_and_runtime_rider';
  patch['system.abilityMeta.staticSheetPolicy'] = 'exclude';

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [patch], {
      source: 'WeaponArmorRider.normalization',
      swseWeaponArmorRiderNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[WeaponArmorRider] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerWeaponArmorRiderNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeWeaponArmorRiderFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeWeaponArmorRiderFeat(item, options));
  SWSELogger.log('[WeaponArmorRider] Normalization hooks registered');
}

export default registerWeaponArmorRiderNormalizationHooks;
