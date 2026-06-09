import { summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";

function idOf(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function nameOf(doc) {
  return doc?.name ?? null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asBool(value) {
  return value === true || value === 'true';
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniqueStrings(values = []) {
  return [...new Set(asArray(values).flatMap(asArray).map(v => String(v ?? '').trim()).filter(Boolean))];
}

function workflowTags(context = {}) {
  return new Set(uniqueStrings(context?.contextTags).map(normalizeKey));
}

function hasWorkflowTag(context = {}, tag = '') {
  return workflowTags(context).has(normalizeKey(tag));
}

function weaponDamageType(weapon = null) {
  const value = weapon?.system?.damageType
    ?? weapon?.system?.damage?.type
    ?? weapon?.system?.damageTypes
    ?? '';
  if (Array.isArray(value)) return value.find(Boolean) ?? '';
  return String(value ?? '').trim();
}

function targetCategory(target = null) {
  const type = normalizeKey(target?.type ?? '');
  const systemType = normalizeKey(target?.system?.type ?? target?.system?.vehicleType ?? target?.system?.creatureType ?? '');
  const droidState = target?.system?.droidState;
  if (type === 'droid' || droidState || target?.system?.isDroid === true) return 'droid';
  if (type === 'vehicle' || ['vehicle', 'starship', 'speeder', 'walker'].includes(systemType)) return 'vehicle';
  if (type === 'npc' || type === 'character') return 'organic';
  return type || systemType || 'unknown';
}

function isIonEligibleTarget(target = null) {
  const category = targetCategory(target);
  return category === 'droid' || category === 'vehicle';
}

export function normalizeDamageWorkflowContext(workflowContext = null, extra = {}) {
  return summarizeCombatWorkflowContext(workflowContext, extra) ?? summarizeCombatWorkflowContext(extra.combatContext ?? extra.workflowContext ?? null, extra) ?? null;
}

export function resolveDamagePacketType({ weapon = null, workflowContext = null, options = {} } = {}) {
  const context = normalizeDamageWorkflowContext(workflowContext, options) ?? {};
  const attack = context.attack ?? {};
  const damage = context.damage ?? {};
  const ruleData = context.ruleData ?? {};

  if (attack.isIon === true || hasWorkflowTag(context, 'ion') || asBool(options.ion) || asBool(ruleData.ion)) return 'ion';
  if (attack.isStun === true || attack.damageMode === 'stun' || hasWorkflowTag(context, 'stun') || asBool(options.stun) || ruleData.damageMode === 'stun') return 'stun';

  const candidate = options.damageType
    ?? damage.damageType
    ?? ruleData.damageType
    ?? weaponDamageType(weapon)
    ?? 'normal';
  if (Array.isArray(candidate)) return String(candidate.find(Boolean) ?? 'normal').trim() || 'normal';
  return String(candidate || 'normal').trim() || 'normal';
}

export function resolveDamageDisposition(workflowContext = null, options = {}) {
  const context = normalizeDamageWorkflowContext(workflowContext, options) ?? {};
  const attack = context.attack ?? {};
  const damage = context.damage ?? {};
  const ruleData = context.ruleData ?? {};
  const hit = damage.hit;
  const natural1 = damage.natural1 === true || options.natural1 === true;
  const areaAttack = attack.isArea === true || hasWorkflowTag(context, 'areaAttack') || ruleData.areaAttack === true;
  const burstFire = attack.isBurstFire === true || hasWorkflowTag(context, 'burstFire');
  const autofire = attack.isAutofire === true || hasWorkflowTag(context, 'autofire');
  const halfDamageOnMiss = ruleData.halfDamageOnMiss === true || options.halfDamageOnMiss === true;
  const damageOnMiss = ruleData.damageOnMiss === true || options.damageOnMiss === true;

  if (natural1) {
    return {
      damageAllowed: false,
      multiplier: 0,
      reason: 'Natural 1 does not deal damage.',
      hit,
      areaAttack,
      burstFire,
      autofire,
      halfDamageOnMiss,
      damageOnMiss
    };
  }

  if (hit === false) {
    if (damageOnMiss) {
      return {
        damageAllowed: true,
        multiplier: 1,
        reason: 'Miss still deals damage by rule context.',
        hit,
        areaAttack,
        burstFire,
        autofire,
        halfDamageOnMiss,
        damageOnMiss
      };
    }
    if (halfDamageOnMiss) {
      return {
        damageAllowed: true,
        multiplier: 0.5,
        reason: 'Miss deals half damage by rule context.',
        hit,
        areaAttack,
        burstFire,
        autofire,
        halfDamageOnMiss,
        damageOnMiss
      };
    }
    return {
      damageAllowed: false,
      multiplier: 0,
      reason: 'Miss does not deal damage.',
      hit,
      areaAttack,
      burstFire,
      autofire,
      halfDamageOnMiss,
      damageOnMiss
    };
  }

  return {
    damageAllowed: true,
    multiplier: 1,
    reason: hit === true ? 'Hit deals normal damage.' : 'No hit state; damage is GM/adjudication-controlled.',
    hit,
    areaAttack,
    burstFire,
    autofire,
    halfDamageOnMiss,
    damageOnMiss
  };
}

export function shouldOfferDamageRoll(workflowContext = null, options = {}) {
  const context = normalizeDamageWorkflowContext(workflowContext, options);
  if (!context) return options.defaultAllow !== false;
  const disposition = resolveDamageDisposition(context, options);
  if (disposition.damageAllowed === false) return false;
  return true;
}

export function buildDamagePacket({
  attacker = null,
  target = null,
  weapon = null,
  amount = 0,
  roll = null,
  workflowContext = null,
  options = {}
} = {}) {
  const rawAmount = Math.max(0, asNumber(amount ?? roll?.total, 0));
  const context = normalizeDamageWorkflowContext(workflowContext ?? options.combatContext ?? options.workflowContext ?? null, {
    ...options,
    actor: attacker,
    weapon,
    target,
    targetId: idOf(target) ?? options.targetId ?? null,
    targetName: nameOf(target) ?? options.targetName ?? null,
    damageType: options.damageType ?? weaponDamageType(weapon),
    hit: options.hit ?? options.isHit ?? undefined,
    isCritical: options.isCritical ?? undefined,
    critMultiplier: options.critMultiplier ?? undefined
  });
  const disposition = resolveDamageDisposition(context, options);
  const multiplier = asNumber(options.damageMultiplier ?? disposition.multiplier, disposition.multiplier);
  const appliedAmount = Math.max(0, Math.floor(rawAmount * multiplier));
  const type = resolveDamagePacketType({ weapon, workflowContext: context, options });
  const targetKind = targetCategory(target);
  const ionEligible = type === 'ion' ? isIonEligibleTarget(target) : undefined;
  const source = options.source
    ?? context?.actionId
    ?? context?.actionName
    ?? idOf(weapon)
    ?? 'combat-damage';

  return {
    schema: 'swse.damage.packet.v1',
    amount: appliedAmount,
    rawAmount,
    multiplier,
    type,
    source,
    sourceActor: attacker ?? null,
    sourceActorId: idOf(attacker) ?? context?.actorId ?? options.attackerId ?? null,
    sourceActorName: nameOf(attacker) ?? context?.actorName ?? '',
    targetActorId: idOf(target) ?? context?.targetId ?? options.targetId ?? null,
    targetActorName: nameOf(target) ?? context?.targetName ?? '',
    targetCategory: targetKind,
    weaponId: idOf(weapon) ?? context?.weaponId ?? options.weaponId ?? null,
    weaponName: nameOf(weapon) ?? context?.weaponName ?? '',
    workflowContext: context,
    disposition,
    flags: {
      areaAttack: disposition.areaAttack === true,
      burstFire: disposition.burstFire === true,
      autofire: disposition.autofire === true,
      halfDamageOnMiss: disposition.halfDamageOnMiss === true,
      damageOnMiss: disposition.damageOnMiss === true,
      stun: type === 'stun',
      ion: type === 'ion',
      ionEligible,
      evasionApplies: context?.ruleData?.evasionApplies === true
    },
    resources: {
      ammoCost: asNumber(context?.resources?.ammoCost ?? options.ammoCost, 0)
    },
    options: {
      ...(options.applyOptions ?? {}),
      combatContext: context,
      workflowContext: context,
      damageType: type,
      type,
      source,
      sourceActor: attacker ?? null,
      weapon,
      weaponId: idOf(weapon) ?? context?.weaponId ?? options.weaponId ?? null,
      areaAttack: disposition.areaAttack === true,
      burstFire: disposition.burstFire === true,
      autofire: disposition.autofire === true,
      halfDamageOnMiss: disposition.halfDamageOnMiss === true,
      damageOnMiss: disposition.damageOnMiss === true,
      stun: type === 'stun',
      ion: type === 'ion',
      ionEligible,
      evasionApplies: context?.ruleData?.evasionApplies === true,
      ammoCost: asNumber(context?.resources?.ammoCost ?? options.ammoCost, 0)
    }
  };
}

export function buildDamageApplyOptions(packet = {}) {
  const safePacket = {
    ...packet,
    sourceActor: undefined,
    options: undefined
  };
  return {
    ...(packet.options ?? {}),
    damageType: packet.type ?? packet.options?.damageType ?? 'normal',
    type: packet.type ?? packet.options?.type ?? 'normal',
    source: packet.source ?? packet.options?.source ?? 'combat-damage',
    sourceActor: packet.sourceActor ?? packet.options?.sourceActor ?? null,
    combatContext: packet.workflowContext ?? packet.options?.combatContext ?? null,
    workflowContext: packet.workflowContext ?? packet.options?.workflowContext ?? null,
    damagePacket: safePacket
  };
}

export const DamagePacketBuilder = {
  normalizeDamageWorkflowContext,
  resolveDamagePacketType,
  resolveDamageDisposition,
  shouldOfferDamageRoll,
  buildDamagePacket,
  buildDamageApplyOptions
};

export default DamagePacketBuilder;
