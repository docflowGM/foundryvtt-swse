/**
 * Damage Component Mitigation
 *
 * Packet-layer bridge for mixed damage components. This keeps the locked
 * mitigation order intact (SR -> DR -> Temp HP), but preserves component
 * attribution so typed/contextual mitigation does not accidentally apply to an
 * entire mixed hit.
 */

import { ShieldMitigationResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/shield-mitigation-resolver.js";
import { DamageReductionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/damage-reduction-resolver.js";
import { TempHPResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/temp-hp-resolver.js";
import { expandDamageTypeAliases, uniqueDamageTypes, DamageTypeRules } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanLabel(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function componentTypes(component = {}, fallbackType = 'normal') {
  // Use the component's OWN types. Only fall back to the attack-level type when the
  // component declares none — otherwise a component (e.g. kinetic) would inherit the
  // attack's primary type (e.g. fire) and be misclassified for DR exceptions,
  // immunity, and resistance. (D3.1 correctness.)
  const own = uniqueDamageTypes([
    component.originalDamageTypes,
    component.damageTypes,
    component.type
  ]);
  const originals = own.length ? own : uniqueDamageTypes([fallbackType || 'normal']);
  return {
    original: originals,
    expanded: expandDamageTypeAliases(originals)
  };
}

function normalizeComponents(rawComponents = [], totalDamage = 0, fallbackType = 'normal') {
  const total = Math.max(0, Math.floor(asNumber(totalDamage, 0)));
  const sourceComponents = asArray(rawComponents)
    .filter(component => component && typeof component === 'object')
    .map((component, index) => {
      const amount = Math.max(0, Math.floor(asNumber(component.amount ?? component.rawAmount ?? 0, 0)));
      const rawAmount = Math.max(0, Math.floor(asNumber(component.rawAmount ?? component.amount ?? amount, amount)));
      const types = componentTypes(component, fallbackType);
      return {
        key: cleanLabel(component.key ?? component.id, `component-${index + 1}`),
        label: cleanLabel(component.label ?? component.name, `${types.original[0] || fallbackType || 'Damage'} component`),
        type: types.original[0] || fallbackType || 'normal',
        tags: Array.isArray(component.tags) ? [...component.tags] : [],
        originalDamageTypes: types.original,
        damageTypes: types.expanded,
        input: amount,
        rawAmount,
        afterShield: amount,
        afterDR: amount,
        afterTempHP: amount,
        shieldApplied: 0,
        drApplied: 0,
        tempAbsorbed: 0,
        immunityApplied: 0,
        immuneTo: null,
        resistanceApplied: 0,
        resistanceSource: '',
        resistedBy: null,
        drSource: '',
        source: component.source ?? '',
        formula: component.formula ?? '',
        originalComponent: component
      };
    })
    .filter(component => component.input > 0 || component.rawAmount > 0);

  if (!sourceComponents.length) return [];

  const current = sourceComponents.reduce((sum, component) => sum + component.input, 0);
  if (total <= 0) {
    return sourceComponents.map(component => ({ ...component, input: 0, afterShield: 0, afterDR: 0, afterTempHP: 0 }));
  }
  if (current === total) return sourceComponents;

  if (current <= 0) {
    return sourceComponents.map((component, index) => ({
      ...component,
      input: index === 0 ? total : 0,
      afterShield: index === 0 ? total : 0,
      afterDR: index === 0 ? total : 0,
      afterTempHP: index === 0 ? total : 0
    }));
  }

  let assigned = 0;
  return sourceComponents.map((component, index) => {
    const scaled = index === sourceComponents.length - 1
      ? Math.max(0, total - assigned)
      : Math.max(0, Math.floor(component.input * (total / current)));
    assigned += scaled;
    return {
      ...component,
      input: scaled,
      afterShield: scaled,
      afterDR: scaled,
      afterTempHP: scaled
    };
  });
}

function distributeReduction(components = [], field = 'afterShield', reduction = 0, appliedField = '') {
  const amount = Math.max(0, Math.floor(asNumber(reduction, 0)));
  if (!components.length || amount <= 0) return components;
  const total = components.reduce((sum, component) => sum + Math.max(0, asNumber(component[field], 0)), 0);
  if (total <= 0) return components;

  let assigned = 0;
  return components.map((component, index) => {
    const before = Math.max(0, asNumber(component[field], 0));
    const share = index === components.length - 1
      ? Math.max(0, amount - assigned)
      : Math.min(before, Math.floor(amount * (before / total)));
    const cappedShare = Math.min(before, share);
    assigned += cappedShare;
    return {
      ...component,
      [field]: Math.max(0, before - cappedShare),
      ...(appliedField ? { [appliedField]: Math.max(0, asNumber(component[appliedField], 0)) + cappedShare } : {})
    };
  });
}

function syncStage(components = [], fromField = 'afterShield', toField = 'afterDR') {
  return components.map(component => ({ ...component, [toField]: Math.max(0, asNumber(component[fromField], 0)) }));
}

function exportedComponent(component = {}) {
  return {
    key: component.key,
    label: component.label,
    type: component.type,
    tags: Array.isArray(component.tags) ? component.tags : [],
    damageTypes: component.damageTypes,
    originalDamageTypes: component.originalDamageTypes,
    rawAmount: component.rawAmount,
    amount: component.afterTempHP,
    input: component.input,
    afterShield: component.afterShield,
    afterDR: component.afterDR,
    afterResistance: component.afterResistance ?? component.afterDR,
    afterTempHP: component.afterTempHP,
    // remaining = amount that survives to HP; mitigation = amount removed per stage.
    remaining: component.afterTempHP,
    immuneTo: component.immuneTo ?? null,
    resistedBy: component.resistedBy ?? null,
    mitigation: {
      shieldApplied: component.shieldApplied,
      immunityApplied: component.immunityApplied ?? 0,
      drApplied: component.drApplied,
      drSource: component.drSource,
      resistanceApplied: component.resistanceApplied ?? 0,
      resistanceSource: component.resistanceSource ?? '',
      tempAbsorbed: component.tempAbsorbed
    },
    source: component.source,
    formula: component.formula
  };
}

function makeBreakdown({ damage, shieldResult, afterImmunityTotal, genericDRResult, afterDRTotal, resistanceAppliedTotal, afterResistanceTotal, tempResult }) {
  return [
    {
      stage: 'Shield Rating (SR)',
      input: damage,
      output: shieldResult.damageAfter,
      mitigation: shieldResult.srApplied,
      details: {
        srCurrent: shieldResult.srRemaining + shieldResult.srDegraded,
        srRemaining: shieldResult.srRemaining,
        srDegraded: shieldResult.srDegraded,
        source: 'ShieldMitigationResolver',
        componentAware: true
      }
    },
    {
      stage: 'Damage Reduction (DR)',
      input: afterImmunityTotal,
      output: afterDRTotal,
      mitigation: Math.max(0, afterImmunityTotal - afterDRTotal),
      details: {
        genericDR: genericDRResult.drApplied,
        bypassed: genericDRResult.bypassed === true,
        source: 'DamageReductionResolver',
        componentAware: true
      }
    },
    {
      stage: 'Typed Resistance',
      input: afterDRTotal,
      output: afterResistanceTotal,
      mitigation: resistanceAppliedTotal,
      details: {
        source: 'DamageTypeResistance',
        componentAware: true
      }
    },
    {
      stage: 'Temporary HP',
      input: afterResistanceTotal,
      output: tempResult.damageAfter,
      mitigation: tempResult.tempAbsorbed,
      details: {
        tempBefore: tempResult.tempBefore,
        tempAfter: tempResult.tempAfter,
        source: 'TempHPResolver',
        componentAware: true
      }
    }
  ];
}

export function resolveComponentMitigation({ damage, actor, damageType = 'normal', weapon = null, sourceActor = null, attacker = null, options = {} } = {}) {
  const damagePacket = options.damagePacket ?? {};
  const rawComponents = options.damageComponents ?? damagePacket.components ?? [];
  const components = normalizeComponents(rawComponents, damage, damageType);
  if (components.length <= 1) return null;

  const source = sourceActor ?? attacker ?? options.sourceActor ?? options.attacker ?? null;
  const baseContext = {
    ...(options && typeof options === 'object' ? options : {}),
    weapon,
    sourceActor: source,
    attacker: source,
    damageType,
    damageTypes: options.damageTypes ?? damagePacket.damageTypes ?? [damageType],
    damagePacket,
    componentMitigation: true
  };

  const shieldResult = ShieldMitigationResolver.resolve({ damage, actor, context: baseContext });
  let staged = distributeReduction(components, 'afterShield', shieldResult.srApplied, 'shieldApplied');
  staged = syncStage(staged, 'afterShield', 'afterDR');

  const afterShieldTotal = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterShield, 0)), 0);

  // ========================================================================
  // D4A: DAMAGE-TYPE IMMUNITY (after Shield Rating, before DR)
  // ========================================================================
  // SR has already resolved/depleted above. Immunity zeroes any REMAINING component
  // whose type matches a damage-type immunity, using the same DamageTypeRules.matches
  // semantics as DR exceptions. Only matching components are removed (the attack is
  // not cancelled unless every remaining component is immune). Effect/condition
  // immunities are out of scope. SR depletion stays valid.
  const immunityTypes = (actor?.system?.derived?.damageImmunities?.types
    ?? DamageTypeRules.collectDamageTypeImmunities(actor).types) || [];
  const immuneTypesHit = new Set();
  let immunityAppliedTotal = 0;
  if (immunityTypes.length) {
    staged = staged.map(component => {
      const before = Math.max(0, asNumber(component.afterDR, 0));
      if (before <= 0) return component;
      const declared = [component.type, ...(component.damageTypes || []), ...(component.originalDamageTypes || [])].filter(Boolean);
      const immuneTo = immunityTypes.find(type => DamageTypeRules.matches(declared, type)) || null;
      if (!immuneTo) return component;
      immunityAppliedTotal += before;
      immuneTypesHit.add(immuneTo);
      return {
        ...component,
        afterDR: 0,
        immunityApplied: Math.max(0, asNumber(component.immunityApplied, 0)) + before,
        immuneTo
      };
    });
  }
  const afterImmunityTotal = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterDR, 0)), 0);

  // D3: canonical Damage Reduction. DR applies ONCE per attack (RAW: it reduces
  // "the damage") to the non-excepted pool, highest-only. A DR entry's exception
  // damage type — and the lightsaber / bypass-dr component tag — remove a component
  // from the pool (it takes no DR). Generic DR (no exceptions) still applies to the
  // whole pool, so the all-applicable case is unchanged. Typed applies-to reduction
  // is handled by the typed pass below (D4), not here.
  const drWeaponBypass = DamageReductionResolver.shouldBypassDR(baseContext.weapon);
  const drEntries = drWeaponBypass ? [] : DamageReductionResolver.getCanonicalDamageReductionEntries(actor);
  let bestEntry = null;
  for (const entry of drEntries) {
    if (!bestEntry || entry.value > bestEntry.value) bestEntry = entry;
  }
  let genericDRApplied = 0;
  let genericDRSource = '';
  if (bestEntry && bestEntry.value > 0) {
    const applicableKeys = new Set(
      staged
        .filter(component => Math.max(0, asNumber(component.afterDR, 0)) > 0)
        .filter(component => !DamageReductionResolver.componentBypassesDamageReduction(component, bestEntry))
        .map(component => component.key)
    );
    const pool = staged
      .filter(component => applicableKeys.has(component.key))
      .reduce((sum, component) => sum + Math.max(0, asNumber(component.afterDR, 0)), 0);

    let drValue = bestEntry.value;
    // Attacker ability that ignores the target's DR when the attack overcomes it.
    if (drValue > 0 && pool > drValue
        && DamageReductionResolver.sourceIgnoresDamageReduction(source, baseContext.weapon, baseContext)) {
      drValue = 0;
    }
    const reduction = Math.min(pool, Math.max(0, drValue));

    if (reduction > 0) {
      const applicableList = staged.filter(component => applicableKeys.has(component.key));
      const lastKey = applicableList.length ? applicableList[applicableList.length - 1].key : null;
      let assigned = 0;
      staged = staged.map(component => {
        if (!applicableKeys.has(component.key)) return component;
        const before = Math.max(0, asNumber(component.afterDR, 0));
        const share = component.key === lastKey
          ? Math.max(0, reduction - assigned)
          : (pool > 0 ? Math.floor(reduction * (before / pool)) : 0);
        assigned += share;
        const after = Math.max(0, before - share);
        const applied = before - after;
        if (applied <= 0) return component;
        genericDRApplied += applied;
        return {
          ...component,
          afterDR: after,
          drApplied: Math.max(0, asNumber(component.drApplied, 0)) + applied,
          drSource: [component.drSource, bestEntry.source || 'Damage Reduction'].filter(Boolean).join(', ')
        };
      });
      if (genericDRApplied > 0) genericDRSource = bestEntry.source || 'Damage Reduction';
    }
  }
  const genericDRResult = {
    drApplied: genericDRApplied,
    drSource: genericDRSource,
    bypassed: drWeaponBypass,
    damageAfter: staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterDR, 0)), 0)
  };

  const afterDRTotal = genericDRResult.damageAfter;

  // ========================================================================
  // D4: TYPED RESISTANCE (after DR, before Temp HP/HP)
  // ========================================================================
  // Applies-to reduction (Energy Resistance, typed applies-to item rules) subtracts a
  // flat amount from each REMAINING component whose type matches, highest-only, using
  // the same DamageTypeRules.matches semantics as DR exceptions and immunity. This is
  // consolidated here so the DR resolver keeps only generic / DR-exception DR. An
  // immune component is already 0 (skipped), so resistance never double-counts it.
  const resistances = actor?.system?.derived?.damageResistances
    ?? DamageTypeRules.collectDamageTypeResistances(actor);
  const resistedTypesHit = new Set();
  let resistanceAppliedTotal = 0;
  if (Array.isArray(resistances?.sources) && resistances.sources.length) {
    staged = staged.map(component => {
      const before = Math.max(0, asNumber(component.afterDR, 0));
      if (before <= 0) return component;
      const declared = [component.type, ...(component.damageTypes || []), ...(component.originalDamageTypes || [])].filter(Boolean);
      const match = DamageTypeRules.resistanceForComponentTypes(declared, resistances);
      if (match.amount <= 0) return component;
      const after = Math.max(0, before - match.amount);
      const applied = before - after;
      if (applied <= 0) return component;
      resistanceAppliedTotal += applied;
      resistedTypesHit.add(match.type);
      return {
        ...component,
        afterDR: after,
        afterResistance: after,
        resistanceApplied: Math.max(0, asNumber(component.resistanceApplied, 0)) + applied,
        resistanceSource: [component.resistanceSource, match.source].filter(Boolean).join(', '),
        resistedBy: match.type
      };
    });
  }
  // Record post-resistance value for components that were not resisted, too.
  staged = staged.map(component => ({
    ...component,
    afterResistance: Math.max(0, asNumber(component.afterResistance ?? component.afterDR, 0))
  }));

  staged = syncStage(staged, 'afterDR', 'afterTempHP');
  const afterResistanceTotal = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterDR, 0)), 0);
  const tempResult = TempHPResolver.resolve({ damage: afterResistanceTotal, actor });
  staged = distributeReduction(staged, 'afterTempHP', tempResult.tempAbsorbed, 'tempAbsorbed');

  const hpDamage = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterTempHP, 0)), 0);
  // Attribute reduction to the correct stage: immunity (afterShieldTotal -
  // afterImmunityTotal), DR (afterImmunityTotal - afterDRTotal), resistance
  // (afterDRTotal - afterResistanceTotal). Never conflate them.
  const drAppliedTotal = Math.max(0, afterImmunityTotal - afterDRTotal);
  const drSources = [
    genericDRResult.drApplied > 0 ? genericDRResult.drSource : ''
  ].filter(Boolean);

  const result = {
    originalDamage: damage,
    afterShield: shieldResult.damageAfter,
    afterDR: afterDRTotal,
    afterResistance: afterResistanceTotal,
    afterTempHP: tempResult.damageAfter,
    hpDamage,
    shield: {
      applied: shieldResult.srApplied,
      degraded: shieldResult.srDegraded,
      remaining: shieldResult.srRemaining,
      source: ShieldMitigationResolver.getSRSource(actor) || 'None'
    },
    immunity: {
      applied: immunityAppliedTotal,
      types: [...immuneTypesHit]
    },
    damageReduction: {
      applied: drAppliedTotal,
      source: drSources.join(', '),
      bypassed: genericDRResult.bypassed === true,
      genericApplied: genericDRResult.drApplied
    },
    resistance: {
      applied: resistanceAppliedTotal,
      types: [...resistedTypesHit]
    },
    tempHP: {
      absorbed: tempResult.tempAbsorbed,
      before: tempResult.tempBefore,
      after: tempResult.tempAfter
    },
    breakdown: makeBreakdown({ damage, shieldResult, afterImmunityTotal, genericDRResult, afterDRTotal, resistanceAppliedTotal, afterResistanceTotal, tempResult }),
    components: staged.map(exportedComponent),
    componentMitigation: true,
    mitigated: damage > hpDamage,
    totalMitigation: Math.max(0, damage - hpDamage),
    mitigationPercent: damage > 0 ? Math.round(((damage - hpDamage) / damage) * 100) : 0
  };

  return result;
}

export const DamageComponentMitigation = {
  resolveComponentMitigation
};

export default DamageComponentMitigation;
