import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function actorLevel(actor) {
  const candidates = [
    actor?.system?.derived?.level,
    actor?.system?.derived?.heroicLevel,
    actor?.system?.level
  ];
  for (const value of candidates) {
    const level = Number(value);
    if (Number.isFinite(level) && level > 0) return Math.floor(level);
  }
  return 1;
}

function hpState(actor) {
  const value = Number(actor?.system?.hp?.value ?? 0) || 0;
  const max = Number(actor?.system?.hp?.max ?? value) || value;
  return { value, max };
}

export function getVitalTransferMultiplier(checkTotal) {
  const total = Number(checkTotal) || 0;
  if (total >= 25) return 4;
  if (total >= 20) return 3;
  if (total >= 15) return 2;
  return 0;
}

export function buildVitalTransferTransaction({ caster, target, checkTotal, preventCasterCost = false, destinyPoint = false } = {}) {
  if (!caster) throw new Error('Vital Transfer requires a caster.');
  if (!target) throw new Error('Vital Transfer requires a target actor.');
  if (caster === target || caster.id === target.id) throw new Error('Vital Transfer cannot target the caster.');

  const multiplier = getVitalTransferMultiplier(checkTotal);
  if (!multiplier) return { success: false, reason: 'check-failed', multiplier: 0 };

  const targetHp = hpState(target);
  const casterHp = hpState(caster);
  const requestedHealing = actorLevel(target) * multiplier;
  const actualHealing = Math.max(0, Math.min(requestedHealing, targetHp.max - targetHp.value));
  const casterDamage = preventCasterCost ? 0 : Math.floor(actualHealing / 2);
  const targetCondition = Number(target?.system?.conditionTrack?.current ?? 0) || 0;
  const conditionImprovement = destinyPoint ? Math.min(5, targetCondition) : 0;

  return {
    success: true,
    multiplier,
    targetLevel: actorLevel(target),
    requestedHealing,
    actualHealing,
    casterDamage,
    preventCasterCost,
    destinyPoint,
    conditionImprovement,
    targetUpdate: {
      'system.hp.value': clamp(targetHp.value + actualHealing, 0, targetHp.max),
      ...(conditionImprovement > 0 ? { 'system.conditionTrack.current': Math.max(0, targetCondition - conditionImprovement) } : {})
    },
    casterUpdate: casterDamage > 0
      ? { 'system.hp.value': Math.max(0, casterHp.value - casterDamage) }
      : null
  };
}

export async function applyVitalTransfer({ caster, target, checkTotal, preventCasterCost = false, destinyPoint = false } = {}) {
  const transaction = buildVitalTransferTransaction({ caster, target, checkTotal, preventCasterCost, destinyPoint });
  if (!transaction.success) return transaction;

  await ActorEngine.updateActor(target, transaction.targetUpdate, {
    source: 'force-power-vital-transfer-healing',
    meta: { guardKey: 'force-power-vital-transfer-target' }
  });

  if (transaction.casterUpdate) {
    await ActorEngine.updateActor(caster, transaction.casterUpdate, {
      source: 'force-power-vital-transfer-cost',
      meta: { guardKey: 'force-power-vital-transfer-caster' }
    });
  }

  SWSELogger.log('SWSE | Force Powers | Vital Transfer resolved', {
    caster: caster.name,
    target: target.name,
    healing: transaction.actualHealing,
    casterDamage: transaction.casterDamage,
    conditionImprovement: transaction.conditionImprovement
  });

  return transaction;
}

export function buildMitigationEffectData(powerItem, outcome) {
  if (!outcome || !['mitigation', 'resistance', 'shield-rating', 'negate-damage'].includes(outcome.kind)) return null;
  const value = Number(outcome.amount ?? 0) || 0;
  return {
    label: `${powerItem?.name ?? 'Force Power'} (${outcome.kind} ${value})`,
    icon: powerItem?.img || 'icons/svg/shield.svg',
    origin: powerItem?.uuid ?? null,
    disabled: false,
    transfer: false,
    duration: outcome.duration ?? {},
    changes: [],
    flags: {
      swse: {
        effectType: outcome.kind,
        mitigationValue: value,
        mitigationType: outcome.damageType ?? outcome.category ?? 'all'
      },
      'foundryvtt-swse': {
        forcePowerMitigation: {
          kind: outcome.kind,
          amount: value,
          damageType: outcome.damageType ?? null,
          sourceVerified: outcome.sourceVerified === true
        }
      }
    }
  };
}
