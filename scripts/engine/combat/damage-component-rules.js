/**
 * Damage Component Rules
 *
 * A thin packet-layer helper for mixed damage. It keeps ActorEngine as the
 * mutation authority and DamageResolutionEngine as the mitigation authority,
 * but lets a packet describe separate typed chunks before they are aggregated
 * for the existing applyDamage() call.
 */

import {
  collectDamageProtections,
  damageTypesFromContext,
  damageTypesMatch,
  isDamageProtectionBypassed,
  expandDamageTypeAliases,
  isForceTypedDamageContext,
  isYuuzhanVongActor,
  normalizeDamageTypeKey,
  uniqueDamageTypes
} from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function idFor(prefix = 'component', index = 0) {
  return `${String(prefix || 'component').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'component'}-${index + 1}`;
}

function decodeJsonMaybe(value) {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (_err2) {
      return value;
    }
  }
}

function flattenComponentSpecs(value) {
  const decoded = decodeJsonMaybe(value);
  if (Array.isArray(decoded)) return decoded.flatMap(flattenComponentSpecs);
  if (!decoded) return [];
  if (typeof decoded === 'object') {
    if (Array.isArray(decoded.components)) return decoded.components.flatMap(flattenComponentSpecs);
    if (Array.isArray(decoded.damageComponents)) return decoded.damageComponents.flatMap(flattenComponentSpecs);
    return [decoded];
  }
  return [];
}

function componentTypeContext({ component = {}, fallbackTypes = [], fallbackType = 'normal', weapon = null, workflowContext = null, options = {} } = {}) {
  const componentTypes = uniqueDamageTypes([
    component.damageTypes,
    component.originalDamageTypes,
    component.type,
    component.damageType,
    component.energyType,
    component.tags
  ]);
  if (componentTypes.length) {
    return {
      primary: componentTypes[0] || fallbackType || 'normal',
      original: componentTypes,
      expanded: expandDamageTypeAliases(componentTypes)
    };
  }

  const inferred = damageTypesFromContext({
    weapon,
    workflowContext,
    options: {
      ...options,
      damageType: fallbackType,
      damageTypes: fallbackTypes
    }
  });
  return inferred;
}

function normalizeDamageComponent(component = {}, index = 0, env = {}) {
  const rawTotal = Math.max(0, asNumber(env.rawAmount, 0));
  const appliedTotal = Math.max(0, asNumber(env.amount, rawTotal));
  const fallbackType = env.type || env.damageType || 'normal';
  const typeContext = componentTypeContext({
    component,
    fallbackType,
    fallbackTypes: env.damageTypes ?? env.originalDamageTypes ?? [],
    weapon: env.weapon,
    workflowContext: env.workflowContext,
    options: env.options
  });
  const componentRaw = component.rawAmount ?? component.raw ?? component.total ?? component.amount ?? component.value ?? null;
  const fraction = component.fraction ?? component.ratio ?? component.multiplier ?? null;
  const percent = component.percent ?? component.percentage ?? null;

  let rawAmount;
  if (componentRaw !== null && componentRaw !== undefined && componentRaw !== '') rawAmount = Math.max(0, asNumber(componentRaw, 0));
  else if (fraction !== null && fraction !== undefined && fraction !== '') rawAmount = Math.max(0, Math.floor(rawTotal * asNumber(fraction, 0)));
  else if (percent !== null && percent !== undefined && percent !== '') rawAmount = Math.max(0, Math.floor(rawTotal * (asNumber(percent, 0) / 100)));
  else rawAmount = 0;

  const amountSource = component.amount ?? component.appliedAmount ?? null;
  let amount;
  if (amountSource !== null && amountSource !== undefined && amountSource !== '') amount = Math.max(0, asNumber(amountSource, 0));
  else if (rawTotal > 0 && appliedTotal !== rawTotal) amount = Math.max(0, Math.floor(rawAmount * (appliedTotal / rawTotal)));
  else amount = rawAmount;

  const key = String(component.key ?? component.id ?? idFor(typeContext.primary || 'component', index)).trim();
  const label = String(component.label ?? component.name ?? `${typeContext.primary || 'Damage'} component`).trim();
  return {
    key,
    label,
    rawAmount,
    amount,
    type: typeContext.primary || normalizeDamageTypeKey(fallbackType) || 'normal',
    damageTypes: typeContext.expanded,
    originalDamageTypes: typeContext.original,
    formula: component.formula ?? component.damageFormula ?? '',
    source: component.source ?? component.sourceName ?? env.source ?? '',
    sourceId: component.sourceId ?? component.itemId ?? '',
    critical: asBool(component.critical ?? component.isCritical ?? false),
    bonus: asBool(component.bonus ?? component.isBonus ?? false),
    suppressed: false,
    suppressionReason: '',
    notes: asArray(component.notes).map(String).filter(Boolean)
  };
}

function componentSources({ weapon = null, workflowContext = null, options = {} } = {}) {
  const damage = workflowContext?.damage ?? {};
  const ruleData = workflowContext?.ruleData ?? {};
  const system = weapon?.system ?? {};
  return [
    options.damageComponents,
    options.components,
    options.componentDamage,
    damage.damageComponents,
    damage.components,
    ruleData.damageComponents,
    ruleData.components,
    ruleData.componentDamage,
    system.damageComponents,
    system.components,
    system.componentDamage,
    system.typedDamageComponents,
    system.bonusDamageComponents,
    system.damage?.components,
    system.damage?.damageComponents,
    system.damage?.componentDamage,
    system.damage?.typedComponents,
    system.damage?.bonusComponents,
    system.damage?.extraComponents,
    weapon?.flags?.swse?.damageComponents,
    weapon?.flags?.swse?.damage?.components,
    weapon?.flags?.swse?.typedDamageComponents,
    weapon?.flags?.swse?.bonusDamageComponents
  ];
}

function addRemainderComponent(components = [], env = {}) {
  const rawTotal = Math.max(0, asNumber(env.rawAmount, 0));
  const appliedTotal = Math.max(0, asNumber(env.amount, rawTotal));
  const rawUsed = components.reduce((sum, component) => sum + Math.max(0, asNumber(component.rawAmount, 0)), 0);
  const amountUsed = components.reduce((sum, component) => sum + Math.max(0, asNumber(component.amount, 0)), 0);
  const rawRemainder = Math.max(0, rawTotal - rawUsed);
  const amountRemainder = Math.max(0, appliedTotal - amountUsed);
  if (rawRemainder <= 0 && amountRemainder <= 0) return components;
  const fallback = normalizeDamageComponent({
    key: 'base-damage-remainder',
    label: 'Base damage',
    rawAmount: rawRemainder,
    amount: amountRemainder,
    damageType: env.type ?? env.damageType ?? 'normal'
  }, components.length, env);
  return [...components, fallback];
}

export function buildDamageComponents({
  rawAmount = 0,
  amount = null,
  type = 'normal',
  damageTypes = [],
  originalDamageTypes = [],
  source = '',
  weapon = null,
  workflowContext = null,
  options = {}
} = {}) {
  const appliedAmount = Math.max(0, asNumber(amount, rawAmount));
  const env = {
    rawAmount: Math.max(0, asNumber(rawAmount, 0)),
    amount: appliedAmount,
    type,
    damageType: type,
    damageTypes,
    originalDamageTypes,
    source,
    weapon,
    workflowContext,
    options
  };

  const specs = componentSources({ weapon, workflowContext, options }).flatMap(flattenComponentSpecs);
  if (!specs.length) {
    return [normalizeDamageComponent({
      key: 'base-damage',
      label: 'Base damage',
      rawAmount: env.rawAmount,
      amount: appliedAmount,
      damageType: type,
      damageTypes: originalDamageTypes.length ? originalDamageTypes : damageTypes
    }, 0, env)];
  }

  const components = specs
    .map((component, index) => normalizeDamageComponent(component, index, env))
    .filter(component => component.rawAmount > 0 || component.amount > 0 || component.formula);

  return addRemainderComponent(components, env);
}

function protectionMatchesComponent(entry = {}, component = {}) {
  const types = component.damageTypes?.length ? component.damageTypes : [component.type];
  return damageTypesMatch(types, [entry.type]);
}

function resistanceAmountForComponent(component = {}, protections = []) {
  const matches = protections.filter(entry => entry.kind === 'resistance' && protectionMatchesComponent(entry, component));
  if (!matches.length) return null;
  return matches.reduce((best, entry) => Math.max(best, asNumber(entry.amount, 0)), 0);
}

function immunityForComponent(component = {}, protections = []) {
  return protections.find(entry => entry.kind === 'immunity' && protectionMatchesComponent(entry, component)) ?? null;
}

function forceSuppressesComponent(packet = {}, component = {}, target = null) {
  if (!target || !isYuuzhanVongActor(target)) return false;
  if (component.damageTypes?.includes?.('force') || component.originalDamageTypes?.includes?.('force') || normalizeDamageTypeKey(component.type) === 'force') return true;
  const singleComponent = asArray(packet.components).length <= 1;
  return singleComponent && isForceTypedDamageContext(packet);
}

export function applyTargetComponentProtections(packet = {}, target = null) {
  const components = asArray(packet.components).map(component => ({ ...component }));
  if (!components.length) return packet;

  const protections = collectDamageProtections(target);
  let suppressedCount = 0;
  let reducedTotal = 0;
  const finalized = components.map(component => {
    const next = {
      ...component,
      amount: Math.max(0, asNumber(component.amount, 0)),
      rawAmount: Math.max(0, asNumber(component.rawAmount, component.amount ?? 0)),
      damageTypes: expandDamageTypeAliases(component.damageTypes?.length ? component.damageTypes : [component.type]),
      originalDamageTypes: uniqueDamageTypes(component.originalDamageTypes?.length ? component.originalDamageTypes : [component.type]),
      suppressed: component.suppressed === true,
      suppressionReason: component.suppressionReason || ''
    };

    if (target && forceSuppressesComponent(packet, next, target)) {
      next.amountBeforeProtection = next.amount;
      next.amount = 0;
      next.suppressed = true;
      next.suppressionReason = `${target.name} is immune to Force-originated damage/effects.`;
      next.protection = { kind: 'immunity', type: 'force', source: 'Yuuzhan Vong Force Immunity' };
    }

    if (target && !next.suppressed) {
      const immunity = immunityForComponent(next, protections);
      if (immunity && !isDamageProtectionBypassed(packet, immunity, 'immunity')) {
        next.amountBeforeProtection = next.amount;
        next.amount = 0;
        next.suppressed = true;
        next.suppressionReason = `${target.name} is immune to ${immunity.type} damage.`;
        next.protection = { kind: 'immunity', type: immunity.type, source: immunity.source || 'Immunity' };
      }
    }

    if (target && !next.suppressed) {
      const resistanceEntries = protections.filter(entry => entry.kind === 'resistance' && protectionMatchesComponent(entry, next) && !isDamageProtectionBypassed(packet, entry, 'resistance'));
      const resistance = resistanceEntries.length ? resistanceEntries.reduce((best, entry) => Math.max(best, asNumber(entry.amount, 0)), 0) : null;
      if (resistance && resistance > 0) {
        const resistanceSource = resistanceEntries.find(entry => asNumber(entry.amount, 0) === resistance)?.source || 'Typed Resistance';
        next.amountBeforeProtection = next.amount;
        next.amount = Math.max(0, next.amount - resistance);
        next.protection = { kind: 'resistance', amount: resistance, source: resistanceSource };
        if (next.amount <= 0) {
          next.suppressed = true;
          next.suppressionReason = `${target.name}'s resistance absorbs ${next.label}.`;
        }
      }
    }

    if (next.suppressed) suppressedCount += 1;
    reducedTotal += Math.max(0, asNumber(next.amount, 0));
    return next;
  });

  const remainingTypes = uniqueDamageTypes(finalized.filter(component => !component.suppressed && component.amount > 0).flatMap(component => component.originalDamageTypes?.length ? component.originalDamageTypes : component.type));
  const expandedRemainingTypes = expandDamageTypeAliases(remainingTypes.length ? remainingTypes : finalized.flatMap(component => component.originalDamageTypes?.length ? component.originalDamageTypes : component.type));
  const nextPacket = {
    ...packet,
    amount: Math.max(0, Math.floor(reducedTotal)),
    components: finalized,
    damageTypes: expandedRemainingTypes,
    originalDamageTypes: remainingTypes.length ? remainingTypes : uniqueDamageTypes(finalized.flatMap(component => component.originalDamageTypes?.length ? component.originalDamageTypes : component.type)),
    flags: {
      ...(packet.flags ?? {}),
      damageComponents: finalized.length > 1,
      componentProtectionApplied: suppressedCount > 0 || finalized.some(component => component.amountBeforeProtection !== undefined),
      componentSuppressedCount: suppressedCount,
      componentCount: finalized.length,
      mixedDamage: finalized.length > 1,
      damageTypes: expandedRemainingTypes,
      originalDamageTypes: remainingTypes.length ? remainingTypes : uniqueDamageTypes(finalized.flatMap(component => component.originalDamageTypes?.length ? component.originalDamageTypes : component.type))
    },
    options: {
      ...(packet.options ?? {}),
      damageComponents: finalized,
      damageTypes: expandedRemainingTypes,
      originalDamageTypes: remainingTypes.length ? remainingTypes : uniqueDamageTypes(finalized.flatMap(component => component.originalDamageTypes?.length ? component.originalDamageTypes : component.type))
    }
  };

  if (nextPacket.amount <= 0) {
    nextPacket.multiplier = 0;
    nextPacket.disposition = {
      ...(packet.disposition ?? {}),
      damageAllowed: false,
      multiplier: 0,
      reason: finalized.find(component => component.suppressionReason)?.suppressionReason || 'All damage components were suppressed.'
    };
  }

  const thresholdOverride = Number(nextPacket.options?.thresholdDamageOverride ?? nextPacket.options?.thresholdMeasuredDamage);
  if (Number.isFinite(thresholdOverride)) {
    const protectedRaw = finalized
      .filter(component => !component.suppressed && component.amount > 0)
      .reduce((sum, component) => sum + Math.max(0, asNumber(component.rawAmount, component.amount)), 0);
    nextPacket.options.thresholdDamageOverride = Math.max(0, protectedRaw);
  }

  return nextPacket;
}

export function encodeDamageComponents(components = []) {
  try {
    return encodeURIComponent(JSON.stringify(asArray(components).map(component => ({
      key: component.key,
      label: component.label,
      rawAmount: component.rawAmount,
      amount: component.amount,
      type: component.type,
      damageTypes: component.damageTypes,
      originalDamageTypes: component.originalDamageTypes,
      formula: component.formula,
      source: component.source,
      critical: component.critical === true,
      bonus: component.bonus === true
    }))));
  } catch (_err) {
    return '';
  }
}

export function decodeDamageComponents(value) {
  return flattenComponentSpecs(value);
}

export const DamageComponentRules = {
  buildDamageComponents,
  applyTargetComponentProtections,
  encodeDamageComponents,
  decodeDamageComponents
};

export default DamageComponentRules;
