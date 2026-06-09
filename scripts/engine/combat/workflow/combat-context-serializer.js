/**
 * Combat Context Serializer
 *
 * Phase 1E transport helper. Keeps the workflow context lightweight and safe
 * enough to store in chat flags/data attributes so later damage/state workflows
 * do not have to reconstruct attack intent from scraps.
 */

function asBool(value) {
  return value === true;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function idOf(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function nameOf(doc) {
  return doc?.name ?? null;
}

function compact(value) {
  if (value === null || value === undefined || value === '') return undefined;
  return value;
}

function pruneObject(value) {
  if (Array.isArray(value)) {
    const arr = value.map(pruneObject).filter(v => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const cleaned = pruneObject(child);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return compact(value);
}

function summarizeDamageContext(context = {}, extra = {}) {
  const damage = context?.damage ?? {};
  return pruneObject({
    crit: asBool(extra.isCritical ?? damage.crit ?? context.isCritical),
    hit: extra.hit ?? damage.hit ?? context.hit ?? null,
    natural1: asBool(extra.natural1 ?? damage.natural1),
    natural20: asBool(extra.natural20 ?? damage.natural20),
    areaHitState: extra.areaHitState ?? damage.areaHitState ?? null,
    critMultiplier: asNumber(extra.critMultiplier ?? context.critMultiplier ?? damage.critMultiplier, 2),
    damageType: extra.damageType ?? context.damageType ?? damage.damageType ?? null,
    packets: Array.isArray(damage.packets) ? damage.packets : []
  }) ?? {};
}

export function summarizeCombatWorkflowContext(context = null, extra = {}) {
  if (!context) return null;

  // Already summarized/transport-safe contexts should still be normalized so
  // old chat buttons and new buttons use the same shape.
  const action = context.action ?? {};
  const attack = context.attack ?? {};
  const resources = context.resources ?? {};
  const economy = context.economy ?? {};
  const target = extra.target ?? context.target ?? null;
  const actor = extra.actor ?? context.actor ?? context.sourceActor ?? null;
  const weapon = extra.weapon ?? context.weapon ?? null;

  const summary = {
    schema: 'swse.combat.workflow.v1',
    actionId: extra.actionId ?? action.id ?? context.actionId ?? null,
    actionName: extra.actionName ?? action.name ?? context.actionName ?? null,
    resolutionMode: extra.resolutionMode ?? action.resolutionMode ?? context.resolutionMode ?? null,
    actionType: extra.actionType ?? action.actionType ?? context.actionType ?? null,
    automationBoundary: extra.automationBoundary ?? context.automationBoundary ?? action.automationBoundary ?? null,
    actorId: extra.actorId ?? idOf(actor) ?? context.actorId ?? null,
    actorName: extra.actorName ?? nameOf(actor) ?? context.actorName ?? null,
    weaponId: extra.weaponId ?? idOf(weapon) ?? context.weaponId ?? null,
    weaponName: extra.weaponName ?? nameOf(weapon) ?? context.weaponName ?? null,
    targetId: extra.targetId ?? idOf(target) ?? context.targetId ?? null,
    targetName: extra.targetName ?? nameOf(target) ?? context.targetName ?? null,
    attack: {
      mode: extra.attackMode ?? attack.mode ?? context.attackMode ?? null,
      isArea: asBool(extra.isArea ?? attack.isArea ?? context.isAreaAttack ?? context.areaAttack),
      isAutofire: asBool(extra.isAutofire ?? attack.isAutofire ?? context.autofire),
      isBurstFire: asBool(extra.isBurstFire ?? attack.isBurstFire ?? context.burstFire),
      isAiming: asBool(extra.isAiming ?? attack.isAiming ?? context.aim ?? context.aiming),
      isCharging: asBool(extra.isCharging ?? attack.isCharging ?? context.charge ?? context.charging),
      isFiringIntoMelee: asBool(extra.isFiringIntoMelee ?? attack.isFiringIntoMelee ?? context.firingIntoMelee),
      maneuver: extra.maneuver ?? attack.maneuver ?? context.maneuver ?? null,
      rangeBand: extra.rangeBand ?? attack.rangeBand ?? context.rangeBand ?? context.range ?? null,
      defense: extra.defense ?? attack.defense ?? context.defense ?? null
    },
    damage: summarizeDamageContext(context, extra),
    resources: {
      ammoCost: asNumber(extra.ammoCost ?? resources.ammoCost ?? context.ammoCost, 0),
      enforceAmmo: asBool(extra.enforceAmmo ?? resources.enforceAmmo ?? context.enforceAmmo),
      reloadAvailable: asBool(extra.reloadAvailable ?? resources.reloadAvailable ?? context.reloadAvailable)
    },
    economy: {
      spendAction: (extra.spendAction ?? economy.spendAction ?? context.spendAction) !== false,
      spent: asBool(extra.economySpent ?? economy.spent ?? context.economySpent)
    },
    flags: Array.isArray(extra.flags ?? context.flags ?? context.contextFlags)
      ? [...(extra.flags ?? context.flags ?? context.contextFlags)].map(String)
      : []
  };

  return pruneObject(summary) ?? null;
}

export function encodeCombatWorkflowContext(context = null, extra = {}) {
  const summary = summarizeCombatWorkflowContext(context, extra);
  if (!summary) return '';
  try {
    return encodeURIComponent(JSON.stringify(summary));
  } catch (_err) {
    return '';
  }
}

export function decodeCombatWorkflowContext(value = '') {
  if (!value) return null;
  if (typeof value === 'object') return summarizeCombatWorkflowContext(value);
  try {
    return summarizeCombatWorkflowContext(JSON.parse(decodeURIComponent(String(value))));
  } catch (_err) {
    try {
      return summarizeCombatWorkflowContext(JSON.parse(String(value)));
    } catch (_err2) {
      return null;
    }
  }
}

export function mergeCombatWorkflowContextIntoRollOptions(options = {}, context = null) {
  const workflowContext = summarizeCombatWorkflowContext(context ?? options.combatContext ?? options.workflowContext ?? null);
  if (!workflowContext) return { ...options };

  const attack = workflowContext.attack ?? {};
  const damage = workflowContext.damage ?? {};
  const resources = workflowContext.resources ?? {};

  return {
    ...options,
    combatContext: workflowContext,
    workflowContext,
    actionId: options.actionId ?? workflowContext.actionId ?? null,
    attackMode: options.attackMode ?? attack.mode ?? null,
    aim: options.aim ?? attack.isAiming === true,
    charge: options.charge ?? attack.isCharging === true,
    autofire: options.autofire ?? attack.isAutofire === true,
    burstFire: options.burstFire ?? attack.isBurstFire === true,
    areaAttack: options.areaAttack ?? attack.isArea === true,
    isAreaAttack: options.isAreaAttack ?? attack.isArea === true,
    firingIntoMelee: options.firingIntoMelee ?? attack.isFiringIntoMelee === true,
    maneuver: options.maneuver ?? attack.maneuver ?? null,
    rangeBand: options.rangeBand ?? attack.rangeBand ?? null,
    defense: options.defense ?? attack.defense ?? null,
    isCritical: options.isCritical ?? damage.crit === true,
    critMultiplier: options.critMultiplier ?? damage.critMultiplier ?? undefined,
    ammoCost: options.ammoCost ?? resources.ammoCost ?? 0,
    enforceAmmo: options.enforceAmmo ?? resources.enforceAmmo === true
  };
}
