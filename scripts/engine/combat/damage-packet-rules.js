import { applyDamageTypeProtectionToPacket, damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";
import { applyTargetComponentProtections } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-component-rules.js";

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

function hasOwnedFeat(actor, names = []) {
  return actor?.items?.some?.(item => item?.type === 'feat' && hasName(item, names)) === true;
}

function targetId(target = null) {
  return target?.id ?? target?._id ?? null;
}

function packetTargetId(packet = {}, target = null) {
  return targetId(target) ?? packet.targetActorId ?? packet.workflowContext?.targetId ?? packet.options?.targetId ?? null;
}

function selectedCombatValue(options = {}, id) {
  const combat = options?.combatOptions ?? options?.attackOptions ?? options?.workflowContext?.combatOptions ?? options?.combatContext?.combatOptions ?? {};
  const value = combat?.[id];
  if (value === true) return 1;
  if (value === false || value === undefined || value === null || value === '') return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function hasContextTag(packet = {}, tag = '') {
  const tags = new Set(asArray(packet?.workflowContext?.contextTags).map(normalizeKey));
  return tags.has(normalizeKey(tag));
}

function contextValue(packet = {}, key, fallback = undefined) {
  const context = packet.workflowContext ?? {};
  const options = packet.options ?? {};
  const ruleData = context.ruleData ?? {};
  const combatContext = options.combatContext ?? options.workflowContext ?? {};
  const damage = context.damage ?? {};
  return options[key]
    ?? ruleData[key]
    ?? damage[key]
    ?? context[key]
    ?? combatContext?.ruleData?.[key]
    ?? combatContext?.damage?.[key]
    ?? fallback;
}

function selectedTargetedAreaTargetId(packet = {}) {
  const explicit = contextValue(packet, 'targetedAreaTargetId')
    ?? contextValue(packet, 'targetedAreaSelectedTargetId')
    ?? contextValue(packet, 'selectedTargetedAreaTargetId')
    ?? contextValue(packet, 'selectedAreaTargetId');
  if (explicit) return String(explicit);
  const data = contextValue(packet, 'targetedArea') ?? contextValue(packet, 'targetedAreaSelection');
  if (data && typeof data === 'object') {
    return data.targetId ?? data.targetActorId ?? data.id ?? null;
  }
  return null;
}

function weaponIsProficient(packet = {}) {
  const weapon = packet.options?.weapon ?? null;
  if (!weapon) return true;
  const candidates = [
    weapon?.system?.proficient,
    weapon?.system?.isProficient,
    weapon?.flags?.swse?.proficient,
    packet.options?.weaponProficient,
    packet.workflowContext?.ruleData?.weaponProficient
  ];
  for (const value of candidates) {
    if (value === false || value === 'false') return false;
    if (value === true || value === 'true') return true;
  }
  return true;
}

function targetedAreaSelected(packet = {}) {
  return selectedCombatValue(packet.options, 'targetedArea') > 0
    || asBool(contextValue(packet, 'targetedArea'))
    || asBool(contextValue(packet, 'targetedAreaActive'))
    || hasContextTag(packet, 'targetedArea');
}

function targetedAreaCanApply(packet = {}, target = null) {
  if (!targetedAreaSelected(packet)) return false;
  if (packet.flags?.targetedAreaPreEvasionApplied === true) return false;
  if (!packet.sourceActor || !hasOwnedFeat(packet.sourceActor, ['Targeted Area'])) return false;
  if (weaponIsProficient(packet) === false) return false;
  const context = packet.workflowContext ?? {};
  const ruleData = context.ruleData ?? {};
  const isArea = packet.flags?.areaAttack === true
    || context.attack?.isArea === true
    || ruleData.areaAttack === true
    || hasContextTag(packet, 'areaAttack');
  if (!isArea) return false;
  if (packet.disposition?.hit !== true) return false;
  const selectedTargetId = selectedTargetedAreaTargetId(packet);
  if (!selectedTargetId) return false;
  return String(selectedTargetId) === String(packetTargetId(packet, target));
}

function applyTargetedAreaPreEvasion(packet = {}, target = null) {
  if (!targetedAreaCanApply(packet, target)) return packet;
  const bonus = 5;
  packet.rawAmount = Math.max(0, asNumber(packet.rawAmount ?? packet.amount, 0)) + bonus;
  packet.amount = Math.max(0, asNumber(packet.amount, 0)) + bonus;
  packet.flags.targetedAreaPreEvasionApplied = true;
  packet.flags.targetedAreaDamageBonus = bonus;
  packet.flags.targetedAreaTiming = 'preEvasion';
  packet.breakdown = Array.isArray(packet.breakdown) ? packet.breakdown : [];
  packet.breakdown.push({ label: 'Targeted Area', value: bonus, type: 'damage', timing: 'preEvasion' });
  if (Array.isArray(packet.components) && packet.components.length) {
    const index = packet.components.findIndex(component => normalizeKey(component?.source ?? component?.label ?? '') === 'targeted-area');
    if (index >= 0) {
      packet.components[index] = {
        ...packet.components[index],
        amount: Math.max(0, asNumber(packet.components[index].amount, 0)) + bonus
      };
    } else {
      packet.components.push({
        amount: bonus,
        type: packet.type ?? 'normal',
        damageTypes: asArray(packet.damageTypes ?? packet.flags?.damageTypes),
        originalDamageTypes: asArray(packet.originalDamageTypes ?? packet.flags?.originalDamageTypes),
        source: 'Targeted Area',
        flags: { targetedArea: true, timing: 'preEvasion' }
      });
    }
  }
  return packet;
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

export function isStunEligibleDamageTarget(target = null) {
  return getDamageTargetCategory(target) === 'organic';
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

function syncComponentAmounts(packet = {}, targetAmount = 0) {
  if (!Array.isArray(packet.components) || !packet.components.length) return packet;
  const amount = Math.max(0, asNumber(targetAmount, packet.amount ?? 0));
  const current = packet.components.reduce((sum, component) => sum + Math.max(0, asNumber(component.amount, 0)), 0);
  if (current === amount) return packet;

  if (current <= 0) {
    packet.components = packet.components.map((component, index) => ({
      ...component,
      amount: index === 0 ? amount : 0
    }));
    return packet;
  }

  let assigned = 0;
  packet.components = packet.components.map((component, index) => {
    const nextAmount = index === packet.components.length - 1
      ? Math.max(0, amount - assigned)
      : Math.max(0, Math.floor(asNumber(component.amount, 0) * (amount / current)));
    assigned += nextAmount;
    return { ...component, amount: nextAmount };
  });
  return packet;
}

export function applyTargetDamagePacketRules(packet = {}, target = null) {
  const next = clonePacket(packet);
  const rawAmount = Math.max(0, asNumber(next.rawAmount ?? next.amount, 0));
  next.targetCategory = getDamageTargetCategory(target);
  next.targetActorId = target?.id ?? target?._id ?? next.targetActorId ?? null;
  next.targetActorName = target?.name ?? next.targetActorName ?? '';

  const typeContext = damageTypesFromContext({
    weapon: next.options?.weapon ?? null,
    workflowContext: next.workflowContext,
    options: { ...(next.options ?? {}), damageType: next.type, damageTypes: next.damageTypes ?? next.flags?.damageTypes }
  });
  next.damageTypes = typeContext.expanded;
  next.originalDamageTypes = typeContext.original;
  next.flags.damageTypes = typeContext.expanded;
  next.flags.originalDamageTypes = typeContext.original;
  next.flags.sonic = typeContext.original.includes('sonic');
  next.flags.energy = typeContext.expanded.includes('energy');
  next.flags.force = typeContext.expanded.includes('force');
  next.options.damageTypes = typeContext.expanded;

  applyTargetedAreaPreEvasion(next, target);

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
      amount = Math.max(0, Math.floor(asNumber(next.rawAmount ?? rawAmount, rawAmount) * multiplier));
      next.disposition.multiplier = multiplier;
      next.disposition.reason = `${target.name} takes half damage from the area attack because of Improved Evasion.`;
      next.flags.improvedEvasionHalvedDamage = true;
    }
  }

  const requestedType = normalizeKey(next.originalType ?? next.type ?? next.options?.type ?? next.options?.damageType ?? 'normal');

  if (requestedType === 'stun') {
    const eligible = target ? isStunEligibleDamageTarget(target) : undefined;
    next.originalType = 'stun';
    next.type = 'stun';
    next.options.type = 'stun';
    next.options.damageType = 'stun';
    next.options.stun = true;
    next.options.stunEligible = eligible;
    next.flags.stun = true;
    next.flags.stunEligible = eligible;

    if (eligible === true || eligible === undefined) {
      next.options.hpDamageMultiplier = asNumber(next.options.hpDamageMultiplier, 0.5);
      if (next.disposition?.damageAllowed !== false && amount > 0) {
        next.options.thresholdDamageOverride = Math.max(0, asNumber(next.options.thresholdDamageOverride, amount));
      }
      next.options.stunNonlethal = true;
      next.flags.stunHpHalved = true;
      next.flags.stunThresholdUsesOriginalDamage = true;
    } else {
      amount = 0;
      multiplier = 0;
      next.disposition.damageAllowed = false;
      next.disposition.multiplier = 0;
      next.disposition.reason = `${target?.name ?? 'Target'} is immune to stun damage.`;
      next.options.stunSuppressed = true;
      next.flags.stunSuppressed = true;
      next.flags.stunHpHalved = false;
      next.flags.stunThresholdUsesOriginalDamage = false;
    }
  }

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
  syncComponentAmounts(next, amount);
  const protectedPacket = applyDamageTypeProtectionToPacket(next, target);
  if (Array.isArray(protectedPacket.components) && protectedPacket.components.length > 1) {
    return applyTargetComponentProtections(protectedPacket, target);
  }
  return protectedPacket;
}

export const DamagePacketRules = {
  getDamageTargetCategory,
  isIonEligibleDamageTarget,
  isStunEligibleDamageTarget,
  getEvasionState,
  applyTargetDamagePacketRules
};

export default DamagePacketRules;
