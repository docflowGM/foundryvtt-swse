import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";

const ATTACK_OPTION_ECONOMY = {
  powerAttack: {
    label: 'Power Attack',
    economy: 'ridesAttack',
    description: 'No separate spend. The selected attack penalty/damage rider is paid by the attack action itself.'
  },
  meleeDefense: {
    label: 'Melee Defense',
    economy: 'ridesAttack',
    description: 'No separate spend. The selected attack penalty/defense rider is paid by the melee attack action itself.'
  },
  rapidShot: {
    label: 'Rapid Shot',
    economy: 'ridesAttack',
    description: 'No separate spend. It modifies the selected ranged attack.'
  },
  rapidStrike: {
    label: 'Rapid Strike',
    economy: 'ridesAttack',
    description: 'No separate spend. It modifies the selected melee attack.'
  },
  burstFire: {
    label: 'Burst Fire',
    economy: 'ridesAttackAmmo',
    description: 'No separate action spend. It modifies the ranged attack and ammo spending is handled by AmmoSystem from option metadata.'
  },
  flurry: {
    label: 'Flurry',
    economy: 'ridesAttack',
    description: 'No separate spend. It modifies the selected melee attack and applies its Reflex penalty rider.'
  },
  improvedDisarm: {
    label: 'Improved Disarm',
    economy: 'ridesAttack',
    description: 'No separate spend. It modifies a disarm attack.'
  },
  banthaRush: {
    label: 'Bantha Rush',
    economy: 'ridesAttack',
    description: 'No separate spend. It is a melee attack maneuver rider; pushed target/path legality remains GM adjudicated.'
  },
  improvedBanthaRush: {
    label: 'Improved Bantha Rush',
    economy: 'riderOnly',
    riderFor: 'banthaRush',
    description: 'No separate spend. It improves the Bantha Rush rider when the selected attack is a Bantha Rush maneuver.'
  },
  springAttack: {
    label: 'Spring Attack',
    economy: 'splitMovementRider',
    riderFor: 'standardAttack',
    description: 'No extra roll-time spend. It marks that movement may be split before and after this single melee attack; movement/action spending belongs to the movement workflow.'
  },
  carefulShot: {
    label: 'Careful Shot',
    economy: 'autoAimIfMissing',
    prerequisite: 'aim',
    description: 'If the actor has not already aimed, spend the Aim prerequisite first, then resolve the attack option.'
  },
  deadeye: {
    label: 'Deadeye',
    economy: 'autoAimIfMissing',
    prerequisite: 'aim',
    description: 'If the actor has not already aimed, spend the Aim prerequisite first, then resolve the attack option.'
  },
  powerfulCharge: {
    label: 'Powerful Charge',
    economy: 'autoChargeIfMissing',
    prerequisite: 'charge',
    description: 'If the attack is not already part of a charge, spend the Charge prerequisite first, then resolve the melee attack option.'
  },
  chargingFire: {
    label: 'Charging Fire',
    economy: 'autoChargeIfMissing',
    prerequisite: 'charge',
    description: 'If the attack is not already part of a charge, spend the Charge prerequisite first, then resolve the ranged Charging Fire attack.'
  },
  improvedCharge: {
    label: 'Improved Charge',
    economy: 'autoChargeIfMissing',
    prerequisite: 'charge',
    description: 'If the attack is not already part of a charge, spend the Charge prerequisite first; the feat rides the charge and offsets the normal Reflex penalty.'
  },
  deftCharge: {
    label: 'Deft Charge',
    economy: 'autoChargeIfMissingMovementRider',
    prerequisite: 'charge',
    riderFor: 'charge',
    description: 'If the attack is not already part of a charge, spend the Charge prerequisite first; the feat flags Deft Charge movement permissions for the charge path.'
  },
  recklessCharge: {
    label: 'Reckless Charge',
    economy: 'autoChargeIfMissing',
    prerequisite: 'charge',
    description: 'If the attack is not already part of a charge, spend the Charge prerequisite first; the feat adds its attack bonus and Reflex penalty rider.'
  },
  runningAttack: {
    label: 'Running Attack',
    economy: 'splitMovementRider',
    riderFor: 'standardAttack',
    description: 'No extra roll-time spend. It marks that movement may be split before and after this single attack; movement/action spending belongs to the movement workflow.'
  },
  mightySwing: {
    label: 'Mighty Swing',
    economy: 'spendSwiftActions',
    swiftActions: 2,
    description: 'Consumes two swift actions before the attack roll resolves.'
  }
};

function selectedCombatValue(options = {}, id) {
  const combat = options.combatOptions ?? options.attackOptions ?? {};
  const value = combat?.[id];
  if (value === true) return 1;
  if (value === false || value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function selectedCombatFlag(options = {}, id) {
  return selectedCombatValue(options, id) > 0;
}

function selectedOptionIds(options = {}) {
  const combat = options.combatOptions ?? options.attackOptions ?? {};
  return Object.keys(ATTACK_OPTION_ECONOMY).filter(id => selectedCombatFlag({ combatOptions: combat }, id));
}

function contextFlag(options = {}, ...keys) {
  return keys.some(key => options?.[key] === true || options?.combatContext?.[key] === true || options?.workflowContext?.[key] === true);
}

function aimedContext(options = {}) {
  return contextFlag(options, 'aim', 'aimed', 'isAimed', 'hasAimed', 'aimActionSpent');
}

function chargeContext(options = {}) {
  return contextFlag(options, 'charge', 'charging', 'isCharge', 'chargeAction', 'chargeActionSpent', 'chargingFire');
}

function autoPrerequisites(options = {}) {
  return options?.swseAutoPrerequisites ?? {};
}

function noOp(reason = 'no-core-attack-option-cost') {
  return {
    allowed: true,
    permitted: true,
    committed: false,
    noOp: true,
    reason,
    spends: [],
    selectedOptions: [],
    economy: [],
    rollback: async () => false
  };
}

function spendFailed(optionId, message, spends = [], economy = []) {
  return {
    allowed: false,
    permitted: false,
    committed: spends.some(entry => entry?.committed),
    reason: message,
    failedOption: optionId,
    spends,
    economy,
    rollback: async () => false
  };
}

async function spendOne(actor, actionType, metadata, options) {
  return ActionEconomyConsumption.spend(actor, actionType, metadata, options);
}

async function spendAimPrerequisite(actor, weapon, options = {}, spends = []) {
  for (let i = 0; i < 2; i += 1) {
    const spend = await spendOne(actor, 'swift', {
      source: 'Aim',
      sourceName: 'Aim',
      actionName: 'Aim',
      prerequisiteFor: 'Careful Shot/Deadeye',
      weaponId: weapon?.id ?? null,
      swiftIndex: i + 1,
      requiredSwiftActions: 2
    }, options);
    spends.push(spend);
    if (spend?.allowed === false || spend?.permitted === false) {
      return spendFailed('aim', spend?.policyResult?.reason ?? spend?.engineResult?.violations?.join?.(', ') ?? 'Careful Shot and Deadeye require Aim; Aim requires two swift actions.', spends);
    }
  }
  return null;
}

async function spendChargePrerequisite(actor, weapon, optionId, options = {}, spends = []) {
  const spend = await spendOne(actor, 'standard', {
    source: 'Charge',
    sourceName: 'Charge',
    actionName: optionId === 'chargingFire' ? 'Charging Fire' : ATTACK_OPTION_ECONOMY[optionId]?.label ?? 'Charge',
    prerequisiteFor: optionId,
    weaponId: weapon?.id ?? null,
    chargeAttack: true
  }, options);
  spends.push(spend);
  if (spend?.allowed === false || spend?.permitted === false) {
    return spendFailed(optionId, spend?.policyResult?.reason ?? spend?.engineResult?.violations?.join?.(', ') ?? 'Charge prerequisite could not be spent.', spends);
  }
  return null;
}

export function getCoreAttackOptionEconomy(optionId) {
  return ATTACK_OPTION_ECONOMY[optionId] ?? null;
}

export function auditCoreAttackOptionEconomy(options = {}) {
  return selectedOptionIds(options).map(id => ({ id, ...ATTACK_OPTION_ECONOMY[id] }));
}

export function prepareCoreAttackOptionRollContext(options = {}) {
  const prepared = { ...options };
  const combatOptions = { ...(options.combatOptions ?? options.attackOptions ?? {}) };
  const needsAim = selectedCombatFlag({ combatOptions }, 'carefulShot') || selectedCombatFlag({ combatOptions }, 'deadeye');
  const chargeOptionIds = ['powerfulCharge', 'chargingFire', 'improvedCharge', 'deftCharge', 'recklessCharge'];
  const needsCharge = chargeOptionIds.some(id => selectedCombatFlag({ combatOptions }, id));
  const needsRunningAttack = selectedCombatFlag({ combatOptions }, 'runningAttack');
  const needsSpringAttack = selectedCombatFlag({ combatOptions }, 'springAttack');
  const needsBanthaRush = selectedCombatFlag({ combatOptions }, 'banthaRush') || selectedCombatFlag({ combatOptions }, 'improvedBanthaRush');
  const alreadyAimed = aimedContext(options);
  const alreadyCharged = chargeContext(options);
  const auto = { ...(options.swseAutoPrerequisites ?? {}) };

  if (needsAim) {
    prepared.aim = true;
    prepared.aimed = true;
    prepared.combatOptions = combatOptions;
    auto.aim = !alreadyAimed;
  }

  if (needsCharge) {
    prepared.charge = true;
    prepared.charging = true;
    prepared.combatOptions = combatOptions;
    auto.charge = !alreadyCharged;
  }

  if (needsRunningAttack) {
    prepared.runningAttack = true;
    prepared.splitMovementBeforeAfterAttack = true;
    prepared.combatOptions = combatOptions;
  }

  if (needsSpringAttack) {
    prepared.springAttack = true;
    prepared.splitMovementBeforeAfterAttack = true;
    prepared.attackType = prepared.attackType ?? 'melee';
    prepared.combatOptions = combatOptions;
  }

  if (needsBanthaRush) {
    prepared.maneuver = prepared.maneuver ?? 'banthaRush';
    prepared.banthaRush = true;
    prepared.attackType = prepared.attackType ?? 'melee';
    prepared.combatOptions = combatOptions;
  }

  if (selectedCombatFlag({ combatOptions }, 'chargingFire')) {
    prepared.chargingFire = true;
    prepared.attackType = prepared.attackType ?? 'ranged';
  }

  if (Object.keys(auto).length) prepared.swseAutoPrerequisites = auto;
  return prepared;
}

export async function spendCoreAttackOptionCosts(actor, weapon, options = {}) {
  const spends = [];
  const selectedOptions = selectedOptionIds(options);
  const economy = auditCoreAttackOptionEconomy(options);
  const auto = autoPrerequisites(options);
  const rollback = async () => {
    for (const spend of [...spends].reverse()) {
      try { await spend?.rollback?.(); } catch (_err) {}
    }
    return true;
  };

  if (!actor) return { ...noOp('missing-actor'), allowed: false, permitted: false };
  if (!selectedOptions.length) return noOp();

  if ((selectedCombatFlag(options, 'carefulShot') || selectedCombatFlag(options, 'deadeye')) && auto.aim === true) {
    const failure = await spendAimPrerequisite(actor, weapon, options, spends);
    if (failure) {
      await rollback();
      return { ...failure, selectedOptions, economy, rollback: async () => false };
    }
  }

  const selectedAutoChargeOption = ['powerfulCharge', 'chargingFire', 'improvedCharge', 'deftCharge', 'recklessCharge'].find(optionId => selectedCombatFlag(options, optionId));
  if (selectedAutoChargeOption && auto.charge === true) {
    const failure = await spendChargePrerequisite(actor, weapon, selectedAutoChargeOption, options, spends);
    if (failure) {
      await rollback();
      return { ...failure, selectedOptions, economy, rollback: async () => false };
    }
  }

  if (selectedCombatFlag(options, 'mightySwing')) {
    for (let i = 0; i < 2; i += 1) {
      const spend = await spendOne(actor, 'swift', {
        source: 'Mighty Swing',
        sourceName: 'Mighty Swing',
        actionName: 'Mighty Swing',
        optionId: 'mightySwing',
        weaponId: weapon?.id ?? null,
        swiftIndex: i + 1,
        requiredSwiftActions: 2
      }, options);
      spends.push(spend);
      if (spend?.allowed === false || spend?.permitted === false) {
        await rollback();
        return {
          allowed: false,
          permitted: false,
          committed: spends.some(entry => entry?.committed),
          reason: spend?.policyResult?.reason ?? spend?.engineResult?.violations?.join?.(', ') ?? 'Mighty Swing requires two swift actions.',
          failedOption: 'mightySwing',
          selectedOptions,
          economy,
          spends,
          rollback: async () => false
        };
      }
    }
  }

  for (const optionId of selectedOptions) {
    const rule = ATTACK_OPTION_ECONOMY[optionId];
    if (!rule || rule.economy === 'spendSwiftActions') continue;
    const autoSpent = (rule.prerequisite === 'aim' && auto.aim === true)
      || (rule.prerequisite === 'charge' && auto.charge === true);
    spends.push({
      allowed: true,
      permitted: true,
      committed: false,
      noOp: true,
      optionId,
      economy: rule.economy,
      prerequisite: rule.prerequisite ?? null,
      autoPrerequisiteSpent: autoSpent,
      reason: autoSpent ? `${rule.description} Prerequisite action was auto-spent before the roll.` : rule.description,
      rollback: async () => false
    });
  }

  Hooks.callAll?.('swse.coreAttackOptionCostsSpent', {
    actor,
    weapon,
    options,
    selectedOptions,
    economy,
    autoPrerequisites: auto,
    spends,
    source: 'CoreAttackOptionActionEconomy'
  });

  return {
    allowed: true,
    permitted: true,
    committed: spends.some(entry => entry?.committed),
    selectedOptions,
    economy,
    autoPrerequisites: auto,
    spends,
    rollback
  };
}

export default {
  prepareCoreAttackOptionRollContext,
  spendCoreAttackOptionCosts,
  auditCoreAttackOptionEconomy,
  getCoreAttackOptionEconomy
};
