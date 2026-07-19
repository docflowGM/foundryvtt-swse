import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { installPhase3ForcePowerCorrections } from "/systems/foundryvtt-swse/scripts/engine/force/phase3-force-power-corrections.js";
import { installPhase4ForceModifierAutomation } from "/systems/foundryvtt-swse/scripts/engine/force/phase4-force-modifier-automation.js";
import { installPhase5ForceHealing } from "/systems/foundryvtt-swse/scripts/engine/force/phase5-force-healing-mitigation.js";
import { installPhase6ForceDamage } from "/systems/foundryvtt-swse/scripts/engine/force/phase6-force-direct-damage.js";

const normalize = value => String(value ?? '').trim().toLowerCase();

function defenseValue(actor, defense) {
  const candidates = [
    actor?.system?.derived?.defenses?.[defense]?.total,
    actor?.system?.derived?.defenses?.[defense],
    actor?.system?.defenses?.[defense]?.total,
    actor?.system?.defenses?.[defense]
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 10;
}

function manualAdjudication(power, result, options = {}, details = {}) {
  return {
    ...result,
    outcome: 'manual-adjudication',
    outcomePlan: {
      kind: 'manual-adjudication',
      power: power?.name ?? 'Force power',
      checkTotal: Number(result?.roll) || 0,
      targetContext: options.targetContext ?? null,
      reason: 'No actor target was selected. The roll is valid; resolve the target and effects manually.',
      automation: 'manual',
      sourceVerified: true,
      ...details
    }
  };
}

export function getForceStunConditionSteps(checkTotal, willDefense, forcePointOption = false) {
  const margin = Number(checkTotal) - Number(willDefense);
  if (!Number.isFinite(margin) || margin < 0) return 0;
  return 1 + Math.floor(margin / 5) + (forcePointOption ? 1 : 0);
}

export function buildForceStunPlan({ checkTotal, target, forcePointOption = false } = {}) {
  if (!target) throw new Error('Force Stun requires a target actor for automated resolution.');
  const will = defenseValue(target, 'will');
  const steps = getForceStunConditionSteps(checkTotal, will, forcePointOption);
  return {
    kind: 'condition-track',
    power: 'Force Stun',
    defense: 'will',
    defenseValue: will,
    checkTotal: Number(checkTotal) || 0,
    success: steps > 0,
    steps,
    sourceVerified: true
  };
}

export async function applyForceStunPlan(target, plan) {
  if (!plan?.success || !plan.steps) return plan;
  const current = Number(target?.system?.conditionTrack?.current ?? 0) || 0;
  await ActorEngine.updateActor(target, {
    'system.conditionTrack.current': current + plan.steps
  }, {
    source: 'force-power-force-stun',
    meta: { guardKey: 'force-power-force-stun' }
  });
  return { ...plan, previousCondition: current, newCondition: current + plan.steps, applied: true };
}

export function buildForceThrustPlan({ checkTotal, target, collision = null } = {}) {
  if (!target) throw new Error('Force Thrust requires a target actor for automated resolution.');
  return {
    kind: 'opposed-movement',
    power: 'Force Thrust',
    checkTotal: Number(checkTotal) || 0,
    opposition: 'strength-check',
    movement: 'source-directed',
    collision: collision ? {
      occurred: true,
      objectOrCreature: collision.objectOrCreature ?? null,
      damageRequiresResolution: true
    } : { occurred: false },
    automation: 'assisted',
    sourceVerified: true
  };
}

export function buildForceGripPlan({ checkTotal, target, maintain = false, forcePointOption = false } = {}) {
  if (!target) throw new Error('Force Grip requires a target actor for automated resolution.');
  return {
    kind: 'damage-and-action-restriction',
    power: 'Force Grip',
    checkTotal: Number(checkTotal) || 0,
    defense: 'fortitude',
    defenseValue: defenseValue(target, 'fortitude'),
    maintain,
    rerollOnMaintain: maintain,
    forcePointOption,
    damageRequiresTierResolution: true,
    actionRestrictionRequiresRuntimePrompt: true,
    automation: 'assisted',
    sourceVerified: true
  };
}

export function buildMoveObjectPlan({ checkTotal, primaryTarget, secondaryTarget = null, unwilling = false, maintain = false, forcePointOption = false, destinyPointOption = false } = {}) {
  if (!primaryTarget) throw new Error('Move Object requires a primary target for automated resolution.');
  const total = Number(checkTotal) || 0;
  const sizeTier = total >= 35 ? 'colossal' : total >= 30 ? 'gargantuan' : total >= 25 ? 'huge' : total >= 20 ? 'large' : total >= 15 ? 'medium' : null;
  return {
    kind: 'multi-mode',
    power: 'Move Object',
    checkTotal: total,
    success: Boolean(sizeTier),
    sizeTier,
    primaryTargetId: primaryTarget.id ?? null,
    secondaryTargetId: secondaryTarget?.id ?? null,
    unwilling,
    resistance: unwilling ? { defense: 'will', value: defenseValue(primaryTarget, 'will') } : null,
    secondTargetAttack: secondaryTarget ? { defense: 'reflex', value: defenseValue(secondaryTarget, 'reflex') } : null,
    bothTargetsMayTakeDamage: Boolean(secondaryTarget),
    maintain,
    forcePointOption,
    destinyPointOption,
    automation: 'assisted',
    sourceVerified: true
  };
}

export const FINAL_FORCE_POWER_COVERAGE = Object.freeze({
  'force stun': 'automatic-condition-track',
  'force thrust': 'assisted-opposed-movement',
  'force grip': 'assisted-sustained-damage',
  'move object': 'assisted-multi-mode'
});

export function installFinalForcePowerIntegration({ ForcePowerEffectsEngine, ForceExecutor } = {}) {
  if (!ForcePowerEffectsEngine || !ForceExecutor || ForceExecutor.__finalForceIntegrationInstalled) return;

  installPhase3ForcePowerCorrections(ForcePowerEffectsEngine);
  installPhase4ForceModifierAutomation(ForcePowerEffectsEngine);
  installPhase5ForceHealing(ForceExecutor);
  installPhase6ForceDamage(ForceExecutor);

  const previous = ForceExecutor.executeForcePower.bind(ForceExecutor);
  ForceExecutor.executeForcePower = async function finalForcePowerExecutor(actor, powerId, options = {}) {
    const power = actor?.items?.get?.(powerId);
    const name = normalize(power?.name);
    const target = options.target ?? options.targetActor ?? null;

    const result = await previous(actor, powerId, options);
    if (!result?.success) return result;

    if (name === 'force stun') {
      if (!target) return manualAdjudication(power, result, options, { expectedTarget: 'one creature', defense: 'will' });
      const plan = buildForceStunPlan({ checkTotal: result.roll, target, forcePointOption: options.forcePointOption === true });
      const appliedPlan = await applyForceStunPlan(target, plan);
      return { ...result, outcome: 'condition-track', outcomePlan: appliedPlan };
    }
    if (name === 'force thrust') {
      if (!target) return manualAdjudication(power, result, options, { expectedTarget: 'one creature or object', opposition: 'strength-check' });
      return { ...result, outcome: 'assisted-movement', outcomePlan: buildForceThrustPlan({ checkTotal: result.roll, target, collision: options.collision }) };
    }
    if (name === 'force grip') {
      if (!target) return manualAdjudication(power, result, options, { expectedTarget: 'one creature', defense: 'fortitude' });
      return { ...result, outcome: 'assisted-sustained-damage', outcomePlan: buildForceGripPlan({ checkTotal: result.roll, target, maintain: options.maintain === true, forcePointOption: options.forcePointOption === true }) };
    }
    if (name === 'move object') {
      if (!target) return manualAdjudication(power, result, options, { expectedTarget: 'one object or creature', optionalSecondaryTarget: true });
      return { ...result, outcome: 'assisted-multi-mode', outcomePlan: buildMoveObjectPlan({
        checkTotal: result.roll,
        primaryTarget: target,
        secondaryTarget: options.secondaryTarget ?? null,
        unwilling: options.unwilling === true,
        maintain: options.maintain === true,
        forcePointOption: options.forcePointOption === true,
        destinyPointOption: options.destinyPointOption === true
      }) };
    }
    return result;
  };

  Object.defineProperty(ForceExecutor, '__finalForceIntegrationInstalled', { value: true, configurable: false });
  SWSELogger.log('SWSE | Force Powers | Final integration layer installed');
}
