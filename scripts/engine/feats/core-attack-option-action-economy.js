import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";

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

function noOp(reason = 'no-core-attack-option-cost') {
  return {
    allowed: true,
    permitted: true,
    committed: false,
    noOp: true,
    reason,
    rollback: async () => false,
    spends: []
  };
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
  const rollback = async () => {
    for (const spend of [...spends].reverse()) {
      try { await spend?.rollback?.(); } catch (_err) {}
    }
    return true;
  };

  if (!actor) return { ...noOp('missing-actor'), allowed: false, permitted: false };

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
          spends,
          rollback: async () => false
        };
      }
    }
  }

  if (selectedCombatFlag(options, 'chargingFire')) {
    // Charging Fire rides on the attack/charge action itself. This helper marks
    // the selected option as action-economy relevant without double-spending the
    // standard/charge action that opened the attack workflow.
    spends.push({
      allowed: true,
      permitted: true,
      committed: false,
      noOp: true,
      optionId: 'chargingFire',
      reason: 'charging-fire-rides-charge-action',
      rollback: async () => false
    });
  }

  if (!spends.length) return noOp();

  Hooks.callAll?.('swse.coreAttackOptionCostsSpent', {
    actor,
    weapon,
    options,
    spends,
    source: 'CoreAttackOptionActionEconomy'
  });

  return {
    allowed: true,
    permitted: true,
    committed: spends.some(entry => entry?.committed),
    spends,
    rollback
  };
}

export default {
  prepareCoreAttackOptionRollContext,
  spendCoreAttackOptionCosts
};
