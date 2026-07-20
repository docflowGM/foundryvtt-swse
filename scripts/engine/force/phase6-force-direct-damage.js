import { DamageSystem } from "/systems/foundryvtt-swse/scripts/combat/damage-system.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const normalize = value => String(value ?? '').trim().toLowerCase();

export const PHASE6_FORCE_DAMAGE_RULES = Object.freeze({
  'force lightning': Object.freeze({
    damageType: 'force',
    range: '6 squares',
    target: 'one creature',
    tiers: Object.freeze([
      { minimum: 15, maximum: 19, formula: '2d6' },
      { minimum: 20, maximum: 24, formula: '4d6' },
      { minimum: 25, maximum: 29, formula: '6d6' },
      { minimum: 30, maximum: null, formula: '8d6' }
    ]),
    sourceVerified: true
  }),
  'force slam': Object.freeze({
    damageType: 'force',
    range: '6-square cone',
    target: 'all creatures in cone',
    formula: '4d6',
    forcePointFormula: '2d6',
    defense: 'fortitude',
    missDamage: 'half',
    hitCondition: 'prone',
    sourceVerified: true
  })
});

export function getForceLightningFormula(checkTotal) {
  const total = Number(checkTotal) || 0;
  return PHASE6_FORCE_DAMAGE_RULES['force lightning'].tiers.find(tier =>
    total >= tier.minimum && (tier.maximum == null || total <= tier.maximum)
  )?.formula ?? null;
}

export function getActorFortitude(actor) {
  const candidates = [
    actor?.system?.derived?.defenses?.fortitude?.total,
    actor?.system?.derived?.defenses?.fortitude,
    actor?.system?.defenses?.fortitude?.total,
    actor?.system?.defenses?.fortitude
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 10;
}

export function buildForceDamagePacket({ sourceActor, sourceItem, target, amount, powerName, hit = true, area = false } = {}) {
  return {
    amount: Math.max(0, Number(amount) || 0),
    type: 'force',
    damageType: 'force',
    sourceActor,
    sourceItem,
    targetActor: target,
    flags: {
      forcePower: true,
      forcePowerName: powerName,
      hit,
      area,
      sourceVerified: true
    }
  };
}

async function rollFormula(formula, actor) {
  const roll = await new Roll(formula, actor?.getRollData?.() ?? {}).evaluate({ async: true });
  return { roll, total: Number(roll.total) || 0 };
}

async function applyProne(target, sourceItem) {
  if (!target) return null;
  const existing = Array.from(target.effects ?? []).find(effect =>
    effect?.flags?.swse?.condition === 'prone' || effect?.statuses?.has?.('prone')
  );
  if (existing) return existing.id;

  const created = await ActorEngine.createActiveEffects(target, [{
    label: 'Prone',
    icon: 'icons/svg/falling.svg',
    origin: sourceItem?.uuid ?? null,
    disabled: false,
    transfer: false,
    statuses: ['prone'],
    changes: [],
    flags: {
      swse: { effectType: 'condition', condition: 'prone' },
      'foundryvtt-swse': { forcePowerCondition: { sourcePower: sourceItem?.name ?? 'Force Slam' } }
    }
  }], { source: 'force-power-force-slam-prone' });
  return created?.[0]?.id ?? null;
}

function manualDamageOutcome(power, result, options = {}, details = {}) {
  return {
    ...result,
    outcome: 'manual-adjudication',
    damageType: 'force',
    damageOutcome: {
      success: true,
      manual: true,
      power: power?.name ?? 'Force power',
      checkTotal: Number(result?.roll) || 0,
      targetContext: options.targetContext ?? null,
      reason: 'No actor target was selected. Damage and target effects were not rolled or applied automatically.',
      sourceVerified: true,
      ...details
    }
  };
}

export async function resolveForceLightning({ caster, power, checkTotal, target } = {}) {
  if (!target) throw new Error('Force Lightning requires one target actor for automated damage resolution.');
  const formula = getForceLightningFormula(checkTotal);
  if (!formula) return { success: false, reason: 'check-failed', damageType: 'force' };

  const damageRoll = await rollFormula(formula, caster);
  const packet = buildForceDamagePacket({
    sourceActor: caster,
    sourceItem: power,
    target,
    amount: damageRoll.total,
    powerName: power?.name ?? 'Force Lightning',
    hit: true,
    area: false
  });
  const application = await DamageSystem.applyPacketToActor(target, packet);
  return { success: true, formula, damage: damageRoll.total, damageType: 'force', roll: damageRoll.roll, application };
}

export async function resolveForceSlam({ caster, power, checkTotal, targets = [], forcePointOption = false } = {}) {
  const actors = Array.from(targets).filter(Boolean);
  if (!actors.length) throw new Error('Force Slam requires target actors for automated cone resolution.');

  const formula = forcePointOption ? '6d6' : '4d6';
  const damageRoll = await rollFormula(formula, caster);
  const results = [];

  for (const target of actors) {
    const fortitude = getActorFortitude(target);
    const hit = Number(checkTotal) >= fortitude;
    const amount = hit ? damageRoll.total : Math.floor(damageRoll.total / 2);
    const packet = buildForceDamagePacket({
      sourceActor: caster,
      sourceItem: power,
      target,
      amount,
      powerName: power?.name ?? 'Force Slam',
      hit,
      area: true
    });
    const application = await DamageSystem.applyPacketToActor(target, packet);
    const proneEffectId = hit ? await applyProne(target, power) : null;
    results.push({ targetId: target.id, targetName: target.name, fortitude, hit, amount, proneEffectId, application });
  }

  return { success: true, formula, rolledDamage: damageRoll.total, damageType: 'force', roll: damageRoll.roll, results };
}

export function installPhase6ForceDamage(ForceExecutor) {
  if (!ForceExecutor || ForceExecutor.__phase6ForceDamageInstalled) return;
  const previous = ForceExecutor.executeForcePower.bind(ForceExecutor);

  ForceExecutor.executeForcePower = async function phase6ExecuteForcePower(actor, powerId, options = {}) {
    const power = actor?.items?.get?.(powerId);
    const name = normalize(power?.name);
    const isLightning = name === 'force lightning';
    const isSlam = name === 'force slam';
    const lightningTarget = options.target ?? options.targetActor ?? null;
    const slamTargets = options.targets ?? options.targetActors ?? [];

    const result = await previous(actor, powerId, options);
    if (!result?.success || (!isLightning && !isSlam)) return result;

    if (isLightning && !lightningTarget) {
      return manualDamageOutcome(power, result, options, {
        expectedTarget: 'one creature within 6 squares',
        formula: getForceLightningFormula(result.roll),
        defense: 'reflex/manual'
      });
    }

    if (isSlam && !slamTargets.length) {
      return manualDamageOutcome(power, result, options, {
        expectedTargets: 'all creatures in a 6-square cone',
        formula: options.forcePointOption === true ? '6d6' : '4d6',
        defense: 'fortitude',
        missEffect: 'half damage, no prone'
      });
    }

    try {
      const damageOutcome = isLightning
        ? await resolveForceLightning({ caster: actor, power, checkTotal: result.roll, target: lightningTarget })
        : await resolveForceSlam({ caster: actor, power, checkTotal: result.roll, targets: slamTargets, forcePointOption: options.forcePointOption === true });
      return { ...result, outcome: 'damage', damageType: 'force', damageOutcome };
    } catch (error) {
      SWSELogger.error(`SWSE | Force Powers | ${power?.name ?? 'Force damage'} resolution failed`, error);
      ui?.notifications?.error?.(`${power?.name ?? 'Force power'} failed: ${error.message}`);
      return { ...result, success: false, error: error.message };
    }
  };

  Object.defineProperty(ForceExecutor, '__phase6ForceDamageInstalled', { value: true, configurable: false });
  SWSELogger.log('SWSE | Force Powers | Phase 6 direct damage integration installed');
}
