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
  carefulShot: {
    label: 'Careful Shot',
    economy: 'requiresAimContext',
    prerequisite: 'aim',
    description: 'Does not spend the aim action here. The attack option only applies when the roll context already indicates the actor aimed.'
  },
  deadeye: {
    label: 'Deadeye',
    economy: 'requiresAimContext',
    prerequisite: 'aim',
    description: 'Does not spend the aim action here. The attack option only applies when the roll context already indicates the actor aimed.'
  },
  powerfulCharge: {
    label: 'Powerful Charge',
    economy: 'requiresChargeContext',
    prerequisite: 'charge',
    description: 'Does not spend a second action. It modifies a melee attack that is already being made as part of a charge action.'
  },
  chargingFire: {
    label: 'Charging Fire',
    economy: 'chargeAttackRider',
    prerequisite: 'charge',
    description: 'Does not spend a second action. It converts the charge attack context into a ranged Charging Fire attack.'
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

function prerequisiteFailure(optionId, message, economy = []) {
  return {
    allowed: false,
    permitted: false,
    committed: false,
    reason: message,
    failedOption: optionId,
    prerequisiteMissing: true,
    spends: [],
    economy,
    rollback: async () => false
  };
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
  if (selectedCombatFlag({ combatOptions }, 'chargingFire')) {
    prepared.charge = true;
    prepared.chargingFire = true;
    prepared.attackType = prepared.attackType ?? 'ranged';
    prepared.combatOptions = combatOptions;
  }
  return prepared;
}

export async function spendCoreAttackOptionCosts(actor, weapon, options = {}) {
  const spends = [];
  const selectedOptions = selectedOptionIds(options);
  const economy = auditCoreAttackOptionEconomy(options);
  const rollback = async () => {
    for (const spend of [...spends].reverse()) {
      try { await spend?.rollback?.(); } catch (_err) {}
    }
    return true;
  };

  if (!actor) return { ...noOp('missing-actor'), allowed: false, permitted: false };
  if (!selectedOptions.length) return noOp();

  if ((selectedCombatFlag(options, 'carefulShot') || selectedCombatFlag(options, 'deadeye')) && !aimedContext(options)) {
    return prerequisiteFailure('aim', 'Careful Shot and Deadeye require the actor to have aimed before the attack.', economy);
  }

  if (selectedCombatFlag(options, 'powerfulCharge') && !chargeContext(options)) {
    return prerequisiteFailure('powerfulCharge', 'Powerful Charge requires the attack to be part of a charge action.', economy);
  }

  if (selectedCombatFlag(options, 'mightySwing')) {
    for (let i = 0; i < 2; i += 1) {
      const spend = await ActionEconomyConsumption.spend(actor, 'swift', {
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
    spends.push({
      allowed: true,
      permitted: true,
      committed: false,
      noOp: true,
      optionId,
      economy: rule.economy,
      reason: rule.description,
      rollback: async () => false
    });
  }

  Hooks.callAll?.('swse.coreAttackOptionCostsSpent', {
    actor,
    weapon,
    options,
    selectedOptions,
    economy,
    spends,
    source: 'CoreAttackOptionActionEconomy'
  });

  return {
    allowed: true,
    permitted: true,
    committed: spends.some(entry => entry?.committed),
    selectedOptions,
    economy,
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
