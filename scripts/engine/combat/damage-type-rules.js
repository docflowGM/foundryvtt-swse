/**
 * Damage Type Rules
 *
 * Thin normalization/protection layer for packet and reaction code. This does
 * not replace the mitigation manager; it gives existing systems a shared,
 * predictable vocabulary for energy/sonic/force/typed damage context.
 */

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeDamageTypeKey(value = '') {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const aliases = {
    '': '',
    none: '',
    normal: 'normal',
    untyped: 'normal',
    physical: 'kinetic',
    weapon: 'kinetic',
    ballistic: 'kinetic',
    piercing: 'kinetic',
    slashing: 'kinetic',
    bludgeoning: 'kinetic',
    electricity: 'electricity',
    electrical: 'electricity',
    electric: 'electricity',
    cold: 'cold',
    frost: 'cold',
    heat: 'fire',
    flame: 'fire',
    flames: 'fire',
    burning: 'fire',
    corrosive: 'acid',
    corrosion: 'acid',
    forcepower: 'force',
    'force-power': 'force',
    'use-the-force': 'force',
    utf: 'force',
    darkside: 'force',
    'dark-side': 'force',
    lightsaber: 'energy',
    laser: 'energy',
    blaster: 'energy',
    ion: 'ion',
    stun: 'stun',
    sonic: 'sonic',
    sound: 'sonic'
  };

  if (aliases[key] !== undefined) return aliases[key];

  // Weapon names/groups often arrive here when item data lacks an explicit
  // damage type. Infer only known SWSE damage descriptors and discard common
  // non-damage weapon taxonomy so it does not pollute reaction/mitigation context.
  if (key.includes('sonic') || key.includes('sound')) return 'sonic';
  if (key.includes('ion')) return 'ion';
  if (key.includes('stun')) return 'stun';
  if (key.includes('blaster') || key.includes('laser') || key.includes('lightsaber')) return 'energy';
  if (key.includes('fire') || key.includes('flame') || key.includes('burn')) return 'fire';
  if (key.includes('acid') || key.includes('corros')) return 'acid';
  if (key.includes('electric')) return 'electricity';
  if (key.includes('force')) return 'force';

  const nonDamageTaxonomy = new Set([
    'ranged', 'melee', 'simple', 'advanced', 'exotic', 'heavy',
    'pistol', 'pistols', 'rifle', 'rifles', 'weapon', 'weapons',
    'simple-weapons', 'advanced-melee-weapons', 'exotic-weapons',
    'heavy-weapons', 'lightsabers'
  ]);
  if (nonDamageTaxonomy.has(key)) return '';

  return key;
}

function splitDamageTypeValues(value) {
  if (Array.isArray(value)) return value.flatMap(splitDamageTypeValues);
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'object') return Object.values(value).flatMap(splitDamageTypeValues);
  return String(value)
    .split(/[;,/|]+|\band\b/i)
    .map(part => part.trim())
    .filter(Boolean);
}

export function uniqueDamageTypes(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of asArray(values).flatMap(splitDamageTypeValues)) {
    const key = normalizeDamageTypeKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function valuesFromObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter(([, enabled]) => enabled === true || enabled === 1 || enabled === 'true' || Number(enabled) > 0)
    .map(([key, enabled]) => Number(enabled) > 0 ? `${key} ${Number(enabled)}` : key);
}

function splitTypedText(value = '') {
  if (!value) return [];
  return String(value)
    .split(/[;,/|]+|\band\b/i)
    .map(part => part.trim())
    .filter(Boolean);
}

function weaponSystemDamageTypes(weapon = null) {
  const system = weapon?.system ?? {};
  return [
    system.damageType,
    system.damage?.type,
    system.damageTypes,
    system.energyType,
    system.damage?.types,
    system.traits,
    system.properties,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category
  ];
}

export function expandDamageTypeAliases(types = []) {
  const base = uniqueDamageTypes(types);
  const expanded = new Set(base);

  for (const type of base) {
    if (type === 'sonic') expanded.add('energy');
    if (['fire', 'cold', 'electricity', 'acid', 'sonic', 'ion', 'stun'].includes(type)) expanded.add('energy');
    if (type === 'lightsaber' || type === 'blaster') expanded.add('energy');
  }

  return [...expanded].filter(Boolean);
}

export function damageTypesFromContext({ weapon = null, workflowContext = null, options = {} } = {}) {
  const context = workflowContext ?? options.combatContext ?? options.workflowContext ?? {};
  const attack = context.attack ?? {};
  const damage = context.damage ?? {};
  const ruleData = context.ruleData ?? {};
  const tags = Array.isArray(context.contextTags) ? context.contextTags : [];

  const originals = uniqueDamageTypes([
    options.damageTypes,
    options.damageType,
    damage.damageTypes,
    damage.damageType,
    ruleData.damageTypes,
    ruleData.damageType,
    ruleData.primaryDamageType,
    ruleData.energyType,
    attack.damageType,
    attack.damageTypes,
    tags,
    ...weaponSystemDamageTypes(weapon)
  ]);

  if (attack.isIon === true || options.ion === true || ruleData.ion === true) originals.push('ion');
  if (attack.isStun === true || attack.damageMode === 'stun' || options.stun === true || ruleData.damageMode === 'stun') originals.push('stun');
  if (ruleData.forcePower === true || ruleData.forceEffect === true || options.forcePower === true) originals.push('force');

  const normalizedOriginals = uniqueDamageTypes(originals);
  return {
    primary: normalizedOriginals[0] || 'normal',
    original: normalizedOriginals,
    expanded: expandDamageTypeAliases(normalizedOriginals)
  };
}

export function hasDamageType(types = [], wanted = '') {
  const normalizedWanted = normalizeDamageTypeKey(wanted);
  if (!normalizedWanted) return false;
  return expandDamageTypeAliases(types).includes(normalizedWanted);
}

export function damageTypesMatch(candidateTypes = [], wantedTypes = []) {
  const candidate = new Set(expandDamageTypeAliases(candidateTypes));
  return uniqueDamageTypes(wantedTypes).some(type => candidate.has(type));
}

export function damageContextForReaction({ weapon = null, workflowContext = null, options = {} } = {}) {
  const damage = damageTypesFromContext({ weapon, workflowContext, options });
  const mode = String(weapon?.system?.meleeOrRanged ?? weapon?.system?.weaponRangeType ?? weapon?.system?.category ?? options.attackType ?? '').toLowerCase();
  const attackType = mode.includes('range') || mode.includes('ranged') ? 'ranged' : 'melee';
  return {
    attackType,
    damageType: damage.primary,
    damageTypes: damage.expanded,
    originalDamageTypes: damage.original,
    sonic: damage.original.includes('sonic'),
    energy: damage.expanded.includes('energy'),
    force: damage.expanded.includes('force'),
    sonicCannotBeDeflected: attackType === 'ranged' && damage.original.includes('sonic')
  };
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function lowerText(value = '') {
  return String(value ?? '').toLowerCase();
}

function actorTextBlob(actor = null) {
  const fields = [
    actor?.name,
    actor?.type,
    actor?.system?.species,
    actor?.system?.speciesName,
    actor?.system?.race,
    actor?.system?.creatureType,
    actor?.system?.type,
    actor?.system?.actorType,
    actor?.system?.immunities,
    actor?.system?.resistances
  ];
  return fields.map(lowerText).filter(Boolean).join(' ');
}

function normalizeProtectionKind(value = '', fallback = 'immunity') {
  const key = String(value || fallback || 'immunity').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (['resistance', 'resist', 'damage-resistance', 'typed-resistance'].includes(key)) return 'resistance';
  if (['immunity', 'immune', 'damage-immunity', 'typed-immunity'].includes(key)) return 'immunity';
  return fallback || 'immunity';
}

function protectionEntriesFromStructuredValue(value, fallbackKind = 'immunity', source = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  const directTypes = uniqueDamageTypes(
    value.damageTypes
      ?? value.damageType
      ?? value.types
      ?? value.typeKey
      ?? value.type
      ?? value.key
      ?? value.element
      ?? value.elements
      ?? []
  );

  if (directTypes.length) {
    const kind = normalizeProtectionKind(value.kind ?? value.protectionKind ?? value.mode ?? value.protectionType, fallbackKind);
    const amount = asNumber(value.amount ?? value.value ?? value.resistance ?? value.dr ?? value.rating, 0);
    const entrySource = String(value.source ?? value.sourceName ?? value.label ?? source ?? '').trim();
    return directTypes.map(type => ({ kind, type, amount, source: entrySource }));
  }

  const entries = [];
  if (value.immunities !== undefined) entries.push(...protectionEntriesFromValue(value.immunities, 'immunity', source));
  if (value.immunity !== undefined) entries.push(...protectionEntriesFromValue(value.immunity, 'immunity', source));
  if (value.damageImmunities !== undefined) entries.push(...protectionEntriesFromValue(value.damageImmunities, 'immunity', source));
  if (value.resistances !== undefined) entries.push(...protectionEntriesFromValue(value.resistances, 'resistance', source));
  if (value.resistance !== undefined) entries.push(...protectionEntriesFromValue(value.resistance, 'resistance', source));
  if (value.damageResistances !== undefined) entries.push(...protectionEntriesFromValue(value.damageResistances, 'resistance', source));
  return entries;
}

function protectionEntriesFromValue(value, kind = 'immunity', source = '') {
  const entries = [];
  if (Array.isArray(value)) {
    for (const part of value) entries.push(...protectionEntriesFromValue(part, kind, source));
    return entries;
  }
  if (value && typeof value === 'object') {
    const structured = protectionEntriesFromStructuredValue(value, kind, source);
    if (structured.length) return structured;
    for (const part of valuesFromObject(value)) entries.push(...protectionEntriesFromValue(part, kind, source));
    return entries;
  }
  for (const part of splitTypedText(value)) {
    const match = String(part).match(/^(.+?)\s+(-?\d+)$/);
    const typeText = match ? match[1] : part;
    const amount = match ? asNumber(match[2], 0) : 0;
    const type = normalizeDamageTypeKey(typeText.replace(/\b(immunity|immune|resistance|resistant|damage|effects?|to|against|from)\b/gi, '').trim());
    if (!type) continue;
    entries.push({ kind: normalizeProtectionKind(kind), type, amount, source });
  }
  return entries;
}

function collectFlagDamageProtections(actor = null) {
  const flags = actor?.flags?.swse ?? actor?.flags?.['foundryvtt-swse'] ?? {};
  const entries = [];
  entries.push(...protectionEntriesFromValue(flags.damageProtections, 'immunity', 'Actor Flag'));
  entries.push(...protectionEntriesFromValue(flags.damageImmunities, 'immunity', 'Actor Flag'));
  entries.push(...protectionEntriesFromValue(flags.damageImmunity, 'immunity', 'Actor Flag'));
  entries.push(...protectionEntriesFromValue(flags.damageResistances, 'resistance', 'Actor Flag'));
  entries.push(...protectionEntriesFromValue(flags.damageResistance, 'resistance', 'Actor Flag'));
  entries.push(...protectionEntriesFromValue(flags.typedDamageProtections, 'immunity', 'Actor Flag'));
  return entries;
}

function collectActiveEffectDamageProtections(actor = null) {
  const entries = [];
  for (const effect of asArray(actor?.effects)) {
    if (!effect || effect.disabled === true) continue;
    const source = effect.name ?? effect.label ?? 'Active Effect';
    const swse = effect.flags?.swse ?? effect.flags?.['foundryvtt-swse'] ?? {};
    entries.push(...protectionEntriesFromValue(swse.damageProtections, 'immunity', source));
    entries.push(...protectionEntriesFromValue(swse.damageImmunities ?? swse.damageImmunity, 'immunity', source));
    entries.push(...protectionEntriesFromValue(swse.damageResistances ?? swse.damageResistance, 'resistance', source));
    if ((swse.effectType === 'damageReduction' || swse.drType) && swse.drType) {
      entries.push(...protectionEntriesFromValue({ damageType: swse.drType, amount: swse.drValue ?? swse.amount ?? swse.value, kind: 'resistance', source }, 'resistance', source));
    }
  }
  return entries;
}


export function collectDamageProtections(actor = null) {
  const entries = [];
  if (!actor) return entries;

  entries.push(...protectionEntriesFromValue(actor.system?.derived?.speciesImmunities, 'immunity', 'Species'));
  entries.push(...protectionEntriesFromValue(actor.system?.derived?.speciesResistances, 'resistance', 'Species'));
  entries.push(...protectionEntriesFromValue(actor.system?.immunities, 'immunity', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.resistances, 'resistance', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.damageImmunities, 'immunity', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.damageImmunity, 'immunity', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.damageResistances, 'resistance', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.damageResistance, 'resistance', 'Actor'));
  entries.push(...protectionEntriesFromValue(actor.system?.damageProtections, 'immunity', 'Actor'));
  entries.push(...collectFlagDamageProtections(actor));
  entries.push(...collectActiveEffectDamageProtections(actor));

  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      const type = String(rule?.type ?? '').toUpperCase();
      if (type === 'IMMUNITY' || type === 'DAMAGE_IMMUNITY') {
        for (const damageType of uniqueDamageTypes(rule.damageTypes ?? rule.damageType ?? rule.types ?? rule.typeKey)) {
          entries.push({ kind: 'immunity', type: damageType, amount: 0, source: item.name || rule.label || 'Item' });
        }
      }
      if (type === 'RESISTANCE' || type === 'DAMAGE_RESISTANCE') {
        const amount = asNumber(rule.value ?? rule.amount ?? rule.resistance, 0);
        for (const damageType of uniqueDamageTypes(rule.damageTypes ?? rule.damageType ?? rule.types ?? rule.typeKey)) {
          entries.push({ kind: 'resistance', type: damageType, amount, source: item.name || rule.label || 'Item' });
        }
      }
    }
  }

  return entries;
}

export function targetHasDamageImmunity(actor = null, damageTypes = []) {
  const expanded = expandDamageTypeAliases(damageTypes);
  const protections = collectDamageProtections(actor).filter(entry => entry.kind === 'immunity');
  const match = protections.find(entry => damageTypesMatch(expanded, [entry.type]));
  return match ?? null;
}

function bypassListMatches(value, entry = {}) {
  const list = uniqueDamageTypes(value);
  if (!list.length) return false;
  return damageTypesMatch([entry.type], list);
}

export function isDamageProtectionBypassed(packetOrOptions = {}, entry = {}, kind = null) {
  const packet = packetOrOptions?.damagePacket ? packetOrOptions.damagePacket : packetOrOptions;
  const options = packet?.options ?? packetOrOptions ?? {};
  const workflow = packet?.workflowContext ?? options?.workflowContext ?? options?.combatContext ?? {};
  const ruleData = workflow?.ruleData ?? options?.ruleData ?? {};
  const protectionKind = normalizeProtectionKind(kind ?? entry.kind, 'immunity');

  if (options.bypassDamageProtections === true || options.ignoreDamageProtections === true) return true;
  if (ruleData.bypassDamageProtections === true || ruleData.ignoreDamageProtections === true) return true;
  if (bypassListMatches(options.bypassDamageProtectionTypes ?? ruleData.bypassDamageProtectionTypes, entry)) return true;

  if (protectionKind === 'immunity') {
    if (options.bypassDamageImmunity === true || options.ignoreDamageImmunity === true) return true;
    if (ruleData.bypassDamageImmunity === true || ruleData.ignoreDamageImmunity === true) return true;
    if (bypassListMatches(options.bypassDamageImmunityTypes ?? ruleData.bypassDamageImmunityTypes, entry)) return true;
  }

  if (protectionKind === 'resistance') {
    if (options.bypassDamageResistance === true || options.ignoreDamageResistance === true) return true;
    if (ruleData.bypassDamageResistance === true || ruleData.ignoreDamageResistance === true) return true;
    if (bypassListMatches(options.bypassDamageResistanceTypes ?? ruleData.bypassDamageResistanceTypes, entry)) return true;
  }

  return false;
}

export function isYuuzhanVongActor(actor = null) {
  const text = actorTextBlob(actor);
  return /yuuzhan\s+vong|yuuzhan-vong|vong/.test(text) || actor?.system?.speciesKey === 'yuuzhan-vong';
}

export function isForceTypedDamageContext(packetOrContext = {}) {
  const context = packetOrContext.workflowContext ?? packetOrContext.combatContext ?? packetOrContext;
  const ruleData = context?.ruleData ?? {};
  const tags = Array.isArray(context?.contextTags) ? context.contextTags : [];
  const packetTypes = packetOrContext.damageTypes ?? packetOrContext.flags?.damageTypes ?? [];
  const sourceItem = packetOrContext.sourceItem ?? packetOrContext.item ?? context?.item ?? context?.sourceItem ?? null;
  const sourceTags = uniqueDamageTypes([
    sourceItem?.type === 'force-power' ? 'force' : '',
    sourceItem?.system?.tags,
    sourceItem?.system?.descriptors,
    sourceItem?.system?.descriptor,
    sourceItem?.system?.discipline
  ]);
  return ruleData.forcePower === true
    || ruleData.forceEffect === true
    || context?.forcePower === true
    || context?.type === 'force-power'
    || context?.attack?.sourceType === 'force'
    || tags.map(normalizeDamageTypeKey).includes('force')
    || hasDamageType(packetTypes, 'force')
    || sourceTags.includes('force')
    || sourceItem?.type === 'force-power'
    || normalizeDamageTypeKey(packetOrContext.type) === 'force'
    || normalizeDamageTypeKey(packetOrContext.originalType) === 'force';
}

export function targetSuppressesForceEffect({ target = null, sourceItem = null, context = {}, packet = null } = {}) {
  if (!target || !isYuuzhanVongActor(target)) return { suppressed: false };
  const forceContext = isForceTypedDamageContext({ ...(packet ?? context ?? {}), sourceItem, item: sourceItem, forcePower: sourceItem?.type === 'force-power' || context?.forcePower === true });
  if (!forceContext) return { suppressed: false };
  return {
    suppressed: true,
    reason: `${target.name} is immune to Force-originated damage/effects.`,
    source: 'Yuuzhan Vong Force Immunity',
    targetId: target.id ?? target._id ?? null,
    targetName: target.name ?? ''
  };
}

export function applyDamageTypeProtectionToPacket(packet = {}, target = null) {
  const next = {
    ...packet,
    flags: { ...(packet.flags ?? {}) },
    options: { ...(packet.options ?? {}) },
    disposition: { ...(packet.disposition ?? {}) }
  };
  const damageTypes = uniqueDamageTypes([
    next.damageTypes,
    next.flags.damageTypes,
    next.type,
    next.originalType,
    next.workflowContext?.damage?.damageTypes,
    next.workflowContext?.damage?.damageType
  ]);
  const expanded = expandDamageTypeAliases(damageTypes);

  next.damageTypes = expanded;
  next.flags.damageTypes = expanded;
  next.options.damageTypes = expanded;

  if (!target) return next;

  const hasMixedComponents = Array.isArray(next.components) && next.components.length > 1;
  if (hasMixedComponents) {
    next.flags.mixedDamage = true;
    next.flags.damageComponents = true;
    return next;
  }

  if (isForceTypedDamageContext(next) && isYuuzhanVongActor(target)) {
    next.amount = 0;
    next.multiplier = 0;
    next.disposition.damageAllowed = false;
    next.disposition.multiplier = 0;
    next.disposition.reason = `${target.name} is immune to Force-originated damage/effects.`;
    next.flags.forceImmuneTarget = true;
    next.flags.yuuzhanVongForceImmunity = true;
    next.options.forceSuppressed = true;
    return next;
  }

  const immunity = targetHasDamageImmunity(target, expanded);
  if (immunity && !isDamageProtectionBypassed(next, immunity, 'immunity')) {
    next.amount = 0;
    next.multiplier = 0;
    next.disposition.damageAllowed = false;
    next.disposition.multiplier = 0;
    next.disposition.reason = `${target.name} is immune to ${immunity.type} damage.`;
    next.flags.damageImmunitySuppressed = true;
    next.flags.damageImmunitySource = immunity.source || 'Immunity';
    next.options.damageImmunitySuppressed = true;
  }

  return next;
}

export const DamageTypeRules = {
  normalizeDamageTypeKey,
  uniqueDamageTypes,
  expandDamageTypeAliases,
  // Canonical damage-type matcher (D3.1). `expand` returns the alias-expanded
  // types for a component; `matches` answers "does this component count as
  // <ruleType>?" using one-way aliasing (fire/cold/ion/stun → energy, etc.).
  // Shared by DR exceptions, immunity (D4A), and typed resistance (D4) so they
  // never diverge. componentTypes may be a single type or an array.
  expand: (componentTypes = []) => expandDamageTypeAliases(asArray(componentTypes)),
  matches: (componentTypes, ruleType) => hasDamageType(asArray(componentTypes), ruleType),
  damageTypesFromContext,
  hasDamageType,
  damageTypesMatch,
  damageContextForReaction,
  collectDamageProtections,
  targetHasDamageImmunity,
  isDamageProtectionBypassed,
  isYuuzhanVongActor,
  isForceTypedDamageContext,
  targetSuppressesForceEffect,
  applyDamageTypeProtectionToPacket
};

export default DamageTypeRules;
