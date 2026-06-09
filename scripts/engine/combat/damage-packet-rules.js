function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasName(item, names = []) {
  const itemName = normalizeKey(item?.name ?? '');
  return names.some(name => itemName === normalizeKey(name));
}

function flagValue(actor, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let cur = actor?.system;
  for (const part of parts) cur = cur?.[part];
  return cur;
}

function hasOwnedTalent(actor, names = []) {
  return actor?.items?.some?.(item => item?.type === 'talent' && hasName(item, names)) === true;
}

export function getDamageTargetCategory(target = null) {
  const type = normalizeKey(target?.type ?? '');
  const systemType = normalizeKey(target?.system?.type ?? target?.system?.vehicleType ?? target?.system?.creatureType ?? target?.system?.actorType ?? '');
  const droidState = target?.system?.droidState;

  if (type === 'droid' || droidState || target?.system?.isDroid === true) return 'droid';
  if (type === 'vehicle' || ['vehicle', 'starship', 'speeder', 'walker', 'capital-ship', 'starfighter'].includes(systemType)) return 'vehicle';
  if (type === 'object' || systemType === 'object') return 'object';
  if (type === 'device' || systemType === 'device' || target?.system?.isDevice === true) return 'device';
  if (type === 'npc' || type === 'character' || type === 'beast' || ['npc', 'character', 'beast', 'organic'].includes(systemType)) return 'organic';
  return type || systemType || 'unknown';
}

export function isIonEligibleDamageTarget(target = null) {
  return ['droid', 'vehicle', 'object', 'device'].includes(getDamageTargetCategory(target));
}

export function getEvasionState(target = null) {
  const improved = asBool(target?.system?.improvedEvasion)
    || asBool(flagValue(target, 'traits.improvedEvasion'))
    || asBool(flagValue(target, 'abilities.improvedEvasion'))
    || hasOwnedTalent(target, ['Improved Evasion']);

  const evasion = improved
    || asBool(target?.system?.evasion)
    || asBool(flagValue(target, 'traits.evasion'))
    || asBool(flagValue(target, 'abilities.evasion'))
    || hasOwnedTalent(target, ['Evasion']);

  return { evasion, improved };
}

function hasContextTag(packet = {}, tag = '') {
  const tags = new Set(asArray(packet?.workflowContext?.contextTags).map(normalizeKey));
  return tags.has(normalizeKey(tag));
}

function evasionCanApply(packet = {}) {
  const flags = packet.flags ?? {};
  const context = packet.workflowContext ?? {};
  const ruleData = context.ruleData ?? {};
  const isArea = flags.areaAttack === true
    || context.attack?.isArea === true
    || ruleData.areaAttack === true
    || hasContextTag(packet, 'areaAttack');
  const isBurst = flags.burstFire === true
    || context.attack?.isBurstFire === true
    || hasContextTag(packet, 'burstFire');
  const allowedByRule = flags.evasionApplies === true || ruleData.evasionApplies === true;
  return isArea && !isBurst && allowedByRule;
}

function clonePacket(packet = {}) {
  return {
    ...packet,
    flags: { ...(packet.flags ?? {}) },
    resources: { ...(packet.resources ?? {}) },
    disposition: { ...(packet.disposition ?? {}) },
    options: { ...(packet.options ?? {}) },
    workflowContext: packet.workflowContext ?? null
  };
}

function baseDamageAmount(packet = {}) {
  const rawAmount = Math.max(0, asNumber(packet.rawAmount ?? packet.amount, 0));
  const multiplier = asNumber(packet.multiplier ?? packet.disposition?.multiplier, 1);
  return Math.max(0, Math.floor(rawAmount * multiplier));
}

export function applyTargetDamagePacketRules(packet = {}, target = null) {
  const next = clonePacket(packet);
  const rawAmount = Math.max(0, asNumber(next.rawAmount ?? next.amount, 0));
  next.targetCategory = getDamageTargetCategory(target);
  next.targetActorId = target?.id ?? target?._id ?? next.targetActorId ?? null;
  next.targetActorName = target?.name ?? next.targetActorName ?? '';

  let amount = baseDamageAmount(next);
  let multiplier = asNumber(next.multiplier ?? next.disposition?.multiplier, 1);

  if (target && evasionCanApply(next)) {
    const evasion = getEvasionState(target);
    next.flags.evasionApplies = true;
    next.flags.targetHasEvasion = evasion.evasion;
    next.flags.targetHasImprovedEvasion = evasion.improved;

    if (evasion.evasion && next.disposition?.hit === false) {
      amount = 0;
      multiplier = 0;
      next.disposition.damageAllowed = false;
      next.disposition.multiplier = 0;
      next.disposition.reason = `${target.name} takes no damage from the missed area attack because of Evasion.`;
      next.flags.evasionNegatedDamage = true;
    } else if (evasion.improved && next.disposition?.hit === true) {
      multiplier = multiplier * 0.5;
      amount = Math.max(0, Math.floor(rawAmount * multiplier));
      next.disposition.multiplier = multiplier;
      next.disposition.reason = `${target.name} takes half damage from the area attack because of Improved Evasion.`;
      next.flags.improvedEvasionHalvedDamage = true;
    }
  }

  const requestedType = normalizeKey(next.originalType ?? next.type ?? next.options?.type ?? next.options?.damageType ?? 'normal');
  if (requestedType === 'ion') {
    const eligible = target ? isIonEligibleDamageTarget(target) : undefined;
    next.originalType = 'ion';
    next.flags.ion = true;
    next.flags.ionEligible = eligible;

    if (eligible === true) {
      next.type = 'ion';
      next.options.type = 'ion';
      next.options.damageType = 'ion';
      next.options.ion = true;
      next.options.ionEligible = true;
      next.options.hpDamageMultiplier = asNumber(next.options.hpDamageMultiplier, 0.5);
      if (next.disposition?.damageAllowed !== false && amount > 0) {
        next.options.thresholdDamageOverride = Math.max(0, asNumber(next.options.thresholdDamageOverride, amount));
      }
      next.flags.ionHpHalved = true;
      next.flags.ionThresholdUsesOriginalDamage = true;
    } else if (eligible === false) {
      next.type = 'normal';
      next.options.type = 'normal';
      next.options.damageType = 'normal';
      next.options.ion = false;
      next.options.ionEligible = false;
      next.options.ionSuppressed = true;
      next.flags.ionSuppressed = true;
      next.flags.ionHpHalved = false;
      next.flags.ionThresholdUsesOriginalDamage = false;
    }
  }

  next.amount = amount;
  next.multiplier = multiplier;
  return next;
}

export const DamagePacketRules = {
  getDamageTargetCategory,
  isIonEligibleDamageTarget,
  getEvasionState,
  applyTargetDamagePacketRules
};

export default DamagePacketRules;
