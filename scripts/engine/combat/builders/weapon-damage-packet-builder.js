/**
 * Character Weapon Damage Packet Builder (Phase 2)
 *
 * Runtime bridge from character weapon-backed damage rolls into the canonical
 * damage packet v2 axes introduced by the damage profile registry. This module
 * is intentionally additive: it enriches the existing v1 packet produced by
 * damage-packet-builder.js and falls back to that packet unchanged whenever a
 * weapon/profile is not safely wireable.
 */

import { damageProfileRegistry } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-profile-registry.js";
import {
  damageTypesFromContext,
  expandDamageTypeAliases,
  normalizeDamageTypeKey,
  uniqueDamageTypes
} from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

const EMPTY_ATTACK = Object.freeze({
  isArea: false,
  isAutofire: false,
  isBurstFire: false,
  isSplash: false,
  halfDamageOnMiss: false,
  noCriticalDouble: false,
  coverCanNegateMissDamage: false,
  defense: null
});

const EMPTY_AREA = Object.freeze({
  shape: null,
  radius: null,
  size: null,
  originMode: null,
  targetPolicy: null
});

const MANUAL_REQUIRED_WEAPON_SLUGS = new Set([
  'adhesive-grenade',
  'concealed-dart-launcher',
  'concussion-missile-launcher',
  'electro-net',
  'flash-canister',
  'gas-grenade',
  'grenade-launcher',
  'heavy-variable-blaster',
  'interchangeable-weapon-system',
  'micro-grenade-launcher',
  'miniature-missile-launcher',
  'mortar-launcher',
  'net',
  'proton-torpedo-launcher',
  'smoke-grenade',
  'snare-rifle',
  'tactical-tractor-beam',
  'targeting-laser',
  'variable-blaster',
  'wrist-rocket-launcher'
]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeText(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of asArray(values).flatMap(asArray)) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function uniqueRiders(values = []) {
  const out = [];
  const seen = new Set();
  for (const rider of asArray(values).flatMap(asArray)) {
    if (!rider) continue;
    const key = typeof rider === 'object'
      ? `${rider.kind ?? rider.type ?? 'rider'}:${JSON.stringify(rider)}`
      : String(rider);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rider);
  }
  return out;
}

function idOf(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function nameOf(doc) {
  return doc?.name ?? null;
}

function weaponSystem(weapon = null) {
  return weapon?.system ?? {};
}

function weaponTextBlob(weapon = null) {
  const system = weaponSystem(weapon);
  return [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.subtype,
    system.category,
    system.properties,
    system.traits,
    system.description
  ]
    .flatMap(asArray)
    .map(value => typeof value === 'object' ? Object.keys(value).join(' ') : String(value ?? ''))
    .join(' ')
    .toLowerCase();
}

function weaponDamageFormula(weapon = null) {
  const system = weaponSystem(weapon);
  return String(system.damage ?? system.damageFormula ?? system.damage?.formula ?? '').trim();
}

function formulaLooksLikeDirectDamage(formula = '') {
  const text = String(formula ?? '').trim();
  if (!text || text === '-' || /^special$/i.test(text) || /^by weapon$/i.test(text)) return false;
  return /\d*d\d+/i.test(text) || /^\d+$/i.test(text);
}

function readWeaponDamageType(weapon = null) {
  const system = weaponSystem(weapon);
  const value = system.damageType
    ?? system.damage?.type
    ?? (Array.isArray(system.damageTypes) ? system.damageTypes.find(Boolean) : system.damageTypes)
    ?? '';
  return normalizeDamageTypeKey(value);
}

function isLightsaberish(weapon = null) {
  const system = weaponSystem(weapon);
  if (system.isLightsaber === true || system.lightsaber === true) return true;
  if (weapon?.flags?.swse?.lightsaber === true) return true;
  return /light\s*saber|lightsaber|lightfoil|light\s*foil/.test(weaponTextBlob(weapon));
}

function isAutofireCapable(weapon = null) {
  const system = weaponSystem(weapon);
  if (system.autofire === true || system.isAutofire === true) return true;
  const properties = [system.properties, system.traits, system.weaponProperties].flatMap(asArray);
  if (properties.some(prop => normalizeText(prop) === 'autofire')) return true;
  return /\bautofire\b/.test(weaponTextBlob(weapon));
}

function isGrenadeLike(weapon = null) {
  const slug = normalizeText(nameOf(weapon));
  const text = weaponTextBlob(weapon);
  return slug.includes('grenade') || /\bgrenade\b|\bexplosive\b/.test(text);
}

function contextTags(context = {}, options = {}) {
  return uniqueStrings([
    context?.contextTags,
    context?.tags,
    context?.attack?.tags,
    context?.damage?.tags,
    options.contextTags,
    options.tags,
    options.combatOptions?.tags,
    options.attackOptions?.tags
  ]).map(normalizeText);
}

function contextHaystack(context = {}, options = {}) {
  return [
    context?.workflowId,
    context?.actionId,
    context?.actionKey,
    context?.actionName,
    context?.attack?.mode,
    context?.attack?.attackMode,
    context?.attack?.attackType,
    context?.damage?.mode,
    context?.damage?.damageMode,
    context?.ruleData?.attackShape,
    context?.ruleData?.areaShape,
    context?.ruleData?.shape,
    options.workflowId,
    options.actionId,
    options.actionKey,
    options.actionName,
    options.attackMode,
    options.attackType,
    options.areaShape,
    options.shape,
    options.autofireRiderMutation,
    options.combatOptions?.autofireRiderMutation,
    options.attackOptions?.autofireRiderMutation,
    ...contextTags(context, options)
  ].map(v => normalizeText(v)).filter(Boolean).join(' ');
}

function hasContextMarker(context = {}, options = {}, markers = []) {
  const haystack = contextHaystack(context, options);
  return asArray(markers).some(marker => haystack.includes(normalizeText(marker)));
}

function contextFlag(context = {}, options = {}, keys = []) {
  const attack = context?.attack ?? {};
  const damage = context?.damage ?? {};
  const ruleData = context?.ruleData ?? {};
  const combatOptions = options.combatOptions ?? {};
  const attackOptions = options.attackOptions ?? {};
  return asArray(keys).some(key => asBool(attack[key]) || asBool(damage[key]) || asBool(ruleData[key]) || asBool(options[key]) || asBool(combatOptions[key]) || asBool(attackOptions[key]));
}

function readAreaShape(context = {}, options = {}) {
  const attack = context?.attack ?? {};
  const area = context?.area ?? attack.area ?? context?.ruleData?.area ?? {};
  const value = options.areaShape
    ?? options.shape
    ?? options.combatOptions?.areaShape
    ?? options.attackOptions?.areaShape
    ?? attack.areaShape
    ?? attack.shape
    ?? context?.ruleData?.areaShape
    ?? context?.ruleData?.shape
    ?? area.shape
    ?? '';
  return normalizeText(value);
}

function hasWorkflowMode(context = {}, options = {}, mode = '') {
  const wanted = normalizeText(mode);
  if (wanted === 'ion') return contextFlag(context, options, ['isIon', 'ion']) || hasContextMarker(context, options, ['ion']);
  if (wanted === 'stun') return contextFlag(context, options, ['isStun', 'stun']) || context?.attack?.damageMode === 'stun' || options.damageMode === 'stun' || context?.ruleData?.damageMode === 'stun' || hasContextMarker(context, options, ['stun']);
  return false;
}

function isWireableWeapon({ weapon = null, packet = {}, context = {}, options = {} } = {}) {
  if (!weapon) return false;
  const slug = normalizeText(nameOf(weapon));
  if (MANUAL_REQUIRED_WEAPON_SLUGS.has(slug)) return false;

  const formula = weaponDamageFormula(weapon);
  const directDamage = formulaLooksLikeDirectDamage(formula) || asNumber(packet.rawAmount ?? packet.amount, 0) > 0;
  if (!directDamage) return false;

  const resolvedType = normalizeDamageTypeKey(packet.type ?? options.damageType ?? context?.damage?.damageType ?? '');
  const weaponType = readWeaponDamageType(weapon);
  if (!resolvedType && !weaponType) return false;

  return true;
}

function getWireableWeaponProfile(slug) {
  return damageProfileRegistry.getWireable('weapon', slug);
}

function getWireableAreaProfile(slug) {
  return damageProfileRegistry.getWireable('areaProfile', slug);
}

function selectWeaponProfile({ weapon = null, packet = {}, context = {}, options = {} } = {}) {
  const resolvedType = normalizeDamageTypeKey(packet.type ?? options.damageType ?? context?.damage?.damageType ?? '');

  if (resolvedType === 'stun' || hasWorkflowMode(context, options, 'stun')) {
    return getWireableWeaponProfile('stun-mode');
  }
  if (resolvedType === 'ion' || hasWorkflowMode(context, options, 'ion')) {
    return getWireableWeaponProfile('ion-weapon');
  }
  if (isLightsaberish(weapon)) return getWireableWeaponProfile('lightsaber');
  if (isGrenadeLike(weapon)) return getWireableWeaponProfile('grenade') ?? getWireableWeaponProfile('weapon-single-target');
  if (isAutofireCapable(weapon)) return getWireableWeaponProfile('autofire-capable-weapon') ?? getWireableWeaponProfile('weapon-single-target');
  return getWireableWeaponProfile('weapon-single-target');
}

function selectAreaProfile({ weapon = null, context = {}, options = {} } = {}) {
  const shape = readAreaShape(context, options);

  if (contextFlag(context, options, ['isAutofire', 'autofire']) || hasContextMarker(context, options, ['autofire'])) {
    return getWireableAreaProfile('autofire');
  }
  if (contextFlag(context, options, ['isBurstFire', 'burstFire']) || hasContextMarker(context, options, ['burst-fire', 'burstfire'])) {
    return getWireableAreaProfile('burst-fire');
  }
  if (contextFlag(context, options, ['isSplash', 'splash']) || shape === 'splash' || hasContextMarker(context, options, ['splash'])) {
    return getWireableAreaProfile('splash');
  }
  if (shape === 'cone' || contextFlag(context, options, ['isCone', 'cone']) || hasContextMarker(context, options, ['cone'])) {
    return getWireableAreaProfile('cone');
  }
  if (shape === 'line' || contextFlag(context, options, ['isLine', 'line']) || hasContextMarker(context, options, ['line'])) {
    return getWireableAreaProfile('line');
  }
  if (isGrenadeLike(weapon) || shape === 'burst' || hasContextMarker(context, options, ['grenade-burst'])) {
    return getWireableAreaProfile('grenade-burst');
  }

  return null;
}

function mergedAttackBlock(packet = {}, profiles = []) {
  return Object.assign(
    {},
    EMPTY_ATTACK,
    packet.attack ?? {},
    ...asArray(profiles).filter(Boolean).map(profile => profile.attack ?? {})
  );
}

function mergedAreaBlock(packet = {}, profiles = []) {
  return Object.assign(
    {},
    EMPTY_AREA,
    packet.area ?? {},
    ...asArray(profiles).filter(Boolean).map(profile => profile.area ?? {})
  );
}

function reconcileDisposition(packet = {}, attack = {}, rawAmount = 0, currentAmount = 0) {
  const disposition = {
    ...(packet.disposition ?? {}),
    areaAttack: attack.isArea === true,
    burstFire: attack.isBurstFire === true,
    autofire: attack.isAutofire === true,
    halfDamageOnMiss: attack.halfDamageOnMiss === true,
    damageOnMiss: packet.disposition?.damageOnMiss === true,
    advantageousCover: packet.disposition?.advantageousCover === true
  };

  const profileHalfOnMiss = attack.halfDamageOnMiss === true && disposition.hit === false;
  const coverNegated = disposition.advantageousCover === true || packet.flags?.advantageousCover === true;
  const ordinaryMissBlockedDamage = disposition.damageAllowed === false
    && profileHalfOnMiss
    && !coverNegated
    && (!disposition.reason || disposition.reason === 'Miss does not deal damage.');

  if (ordinaryMissBlockedDamage) {
    disposition.damageAllowed = true;
    disposition.multiplier = 0.5;
    disposition.reason = 'Miss deals half damage by area attack profile.';
  }

  const multiplier = Number.isFinite(Number(disposition.multiplier)) ? Number(disposition.multiplier) : 1;
  const amount = Math.max(0, Math.floor(Math.max(0, asNumber(rawAmount, 0)) * multiplier));
  return {
    disposition,
    amount: ordinaryMissBlockedDamage ? amount : Math.max(0, asNumber(currentAmount, amount)),
    amountOverride: ordinaryMissBlockedDamage
  };
}

function normalizeWeaponComponent(component = {}, index = 0, env = {}) {
  const componentType = normalizeDamageTypeKey(component.type ?? component.damageType ?? env.type) || env.type || 'normal';
  const originalDamageTypes = uniqueDamageTypes([
    component.originalDamageTypes,
    component.damageTypes,
    componentType,
    env.originalDamageTypes
  ]);
  const damageTypes = uniqueDamageTypes([
    component.damageTypes,
    env.damageTypes,
    expandDamageTypeAliases(originalDamageTypes.length ? originalDamageTypes : [componentType])
  ]);

  const rawAmount = Math.max(0, asNumber(component.rawAmount ?? component.raw ?? component.total ?? env.rawAmount, env.rawAmount));
  const amount = Math.max(0, asNumber(component.amount ?? component.appliedAmount ?? env.amount, env.amount));

  return {
    ...component,
    key: String(component.key ?? component.id ?? (index === 0 ? 'base-damage' : `weapon-damage-${index + 1}`)),
    label: String(component.label ?? component.name ?? (index === 0 ? 'Base damage' : 'Weapon damage')),
    formula: component.formula ?? component.damageFormula ?? env.formula ?? null,
    rawAmount,
    amount,
    type: componentType,
    damageTypes,
    originalDamageTypes,
    tags: uniqueStrings([component.tags, env.tags]),
    source: component.source ?? env.source,
    sourceId: component.sourceId ?? env.sourceId
  };
}

export function enhanceWeaponDamagePacket(packet = {}, {
  actor = null,
  attacker = null,
  target = null,
  weapon = null,
  roll = null,
  workflowContext = null,
  options = {}
} = {}) {
  if (!packet || typeof packet !== 'object') return packet;

  const context = workflowContext ?? options.combatContext ?? options.workflowContext ?? packet.workflowContext ?? {};
  if (!isWireableWeapon({ weapon, packet, context, options })) return packet;

  const profile = selectWeaponProfile({ weapon, packet, context, options });
  if (!profile) return packet;

  const areaProfile = selectAreaProfile({ weapon, context, options });
  const profiles = [profile, areaProfile].filter(Boolean);
  const attack = mergedAttackBlock(packet, profiles);
  const area = mergedAreaBlock(packet, profiles);

  const weaponType = readWeaponDamageType(weapon);
  const resolvedType = normalizeDamageTypeKey(packet.type ?? profile.primaryType ?? weaponType ?? options.damageType ?? 'normal') || 'normal';
  const sourceId = packet.sourceId ?? idOf(weapon) ?? packet.weaponId ?? null;
  const sourceName = packet.sourceName ?? nameOf(weapon) ?? packet.weaponName ?? 'Weapon damage';
  const source = packet.source ?? sourceId ?? sourceName;

  const typeContext = damageTypesFromContext({
    weapon,
    workflowContext: context,
    options: {
      ...options,
      damageType: resolvedType,
      damageTypes: uniqueDamageTypes([packet.damageTypes, packet.originalDamageTypes, options.damageTypes, weaponType])
    }
  });

  const originalDamageTypes = uniqueDamageTypes([
    packet.originalDamageTypes,
    typeContext.original,
    weaponType,
    resolvedType
  ]);
  const damageTypes = uniqueDamageTypes([
    packet.damageTypes,
    typeContext.expanded,
    expandDamageTypeAliases(originalDamageTypes)
  ]);

  const tags = uniqueStrings([
    packet.tags,
    profiles.map(p => p.tags),
    'weapon',
    isLightsaberish(weapon) ? 'lightsaber' : null,
    isAutofireCapable(weapon) ? 'autofire-capable' : null
  ]);

  const rawAmount = Math.max(0, asNumber(packet.rawAmount ?? roll?.total ?? packet.amount, 0));
  const reconciled = reconcileDisposition(packet, attack, rawAmount, packet.amount);
  const amount = reconciled.amount;
  const disposition = reconciled.disposition;
  const formula = roll?.swseDamageFormula ?? roll?.formula ?? weaponDamageFormula(weapon) ?? null;
  const components = asArray(packet.components).length
    ? packet.components.map((component, index) => {
      const componentInput = reconciled.amountOverride === true ? { ...component, amount, appliedAmount: amount } : component;
      return normalizeWeaponComponent(componentInput, index, {
        type: resolvedType,
        damageTypes,
        originalDamageTypes,
        tags,
        rawAmount,
        amount,
        formula,
        source,
        sourceId
      });
    })
    : [normalizeWeaponComponent({}, 0, {
      type: resolvedType,
      damageTypes,
      originalDamageTypes,
      tags,
      rawAmount,
      amount,
      formula,
      source,
      sourceId
    })];

  return {
    ...packet,
    schema: 'swse.damage.packet.v2',
    amount,
    rawAmount,
    type: resolvedType,
    originalType: packet.originalType ?? weaponType ?? resolvedType,
    primaryType: resolvedType,
    delivery: areaProfile?.delivery ?? profile.delivery ?? 'weapon',
    attackShape: areaProfile?.attackShape ?? profile.attackShape ?? 'single-target',
    scale: areaProfile?.scale ?? profile.scale ?? 'character',
    source,
    sourceId,
    sourceName,
    sourceActor: packet.sourceActor ?? attacker ?? actor ?? null,
    sourceActorId: packet.sourceActorId ?? idOf(attacker ?? actor) ?? context?.actorId ?? options.attackerId ?? null,
    sourceActorName: packet.sourceActorName ?? nameOf(attacker ?? actor) ?? context?.actorName ?? '',
    targetActorId: packet.targetActorId ?? idOf(target) ?? context?.targetId ?? options.targetId ?? null,
    targetActorName: packet.targetActorName ?? nameOf(target) ?? context?.targetName ?? '',
    weaponId: packet.weaponId ?? idOf(weapon) ?? context?.weaponId ?? options.weaponId ?? null,
    weaponName: packet.weaponName ?? nameOf(weapon) ?? context?.weaponName ?? '',
    damageTypes,
    originalDamageTypes,
    tags,
    attack,
    area,
    disposition,
    components,
    riders: uniqueRiders([packet.riders, profiles.map(p => p.riders)]),
    flags: {
      ...(packet.flags ?? {}),
      areaAttack: attack.isArea === true,
      burstFire: attack.isBurstFire === true,
      autofire: attack.isAutofire === true,
      halfDamageOnMiss: attack.halfDamageOnMiss === true,
      evasionApplies: packet.flags?.evasionApplies === true || attack.isArea === true
    },
    options: {
      ...(packet.options ?? {}),
      areaAttack: attack.isArea === true,
      isAreaAttack: attack.isArea === true,
      burstFire: attack.isBurstFire === true,
      autofire: attack.isAutofire === true,
      splash: attack.isSplash === true,
      halfDamageOnMiss: attack.halfDamageOnMiss === true,
      noCriticalDouble: attack.noCriticalDouble === true,
      coverCanNegateMissDamage: attack.coverCanNegateMissDamage === true,
      attackShape: areaProfile?.attackShape ?? profile.attackShape ?? packet.options?.attackShape ?? null,
      areaShape: area.shape ?? packet.options?.areaShape ?? null
    }
  };
}

export function buildWeaponDamagePacket({ basePacket = null, basePacketBuilder = null, ...args } = {}) {
  const packet = basePacket ?? (typeof basePacketBuilder === 'function' ? basePacketBuilder(args) : null);
  if (!packet) {
    throw new Error('buildWeaponDamagePacket requires basePacket or basePacketBuilder.');
  }
  return enhanceWeaponDamagePacket(packet, args);
}

export const WeaponDamagePacketBuilder = {
  enhanceWeaponDamagePacket,
  buildWeaponDamagePacket
};

export default WeaponDamagePacketBuilder;
