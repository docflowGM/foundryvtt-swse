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
import { expandDamageTypeAliases, uniqueDamageTypes } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

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

function sourceKey(source = '') {
  return String(source || 'typed-dr')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'typed-dr';
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
    afterTempHP: component.afterTempHP,
    // remaining = amount that survives to HP; mitigation = amount removed per stage.
    remaining: component.afterTempHP,
    mitigation: {
      shieldApplied: component.shieldApplied,
      drApplied: component.drApplied,
      drSource: component.drSource,
      tempAbsorbed: component.tempAbsorbed
    },
    source: component.source,
    formula: component.formula
  };
}

function makeBreakdown({ damage, shieldResult, genericDRResult, typedDRResults, tempResult }) {
  const afterTypedDR = typedDRResults.reduce((value, result) => Math.max(0, value - Math.max(0, asNumber(result.applied, 0))), genericDRResult.damageAfter);
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
      input: shieldResult.damageAfter,
      output: afterTypedDR,
      mitigation: Math.max(0, shieldResult.damageAfter - afterTypedDR),
      details: {
        genericDR: genericDRResult.drApplied,
        typedDR: typedDRResults,
        bypassed: genericDRResult.bypassed === true || typedDRResults.some(result => result.bypassed === true),
        source: 'DamageReductionResolver',
        componentAware: true
      }
    },
    {
      stage: 'Temporary HP',
      input: afterTypedDR,
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

  const usedTypedSources = new Set();
  const typedDRResults = [];
  staged = staged.map(component => {
    const current = Math.max(0, asNumber(component.afterDR, 0));
    if (current <= 0) return component;

    const typedContext = {
      ...baseContext,
      damageType: component.type,
      damageTypes: component.damageTypes,
      originalDamageTypes: component.originalDamageTypes,
      component,
      onlyTypedDamageReduction: true,
      skipGenericDamageReduction: true
    };
    const result = DamageReductionResolver.resolve({ damage: current, actor, context: typedContext });
    const applied = Math.max(0, asNumber(result.drApplied, 0));
    if (applied <= 0) return component;

    const key = sourceKey(result.drSource || `typed-${component.type}`);
    if (usedTypedSources.has(key)) {
      typedDRResults.push({
        component: component.key,
        label: component.label,
        type: component.type,
        source: result.drSource,
        applied: 0,
        skipped: true,
        reason: 'Typed DR source already applied to this mixed hit.'
      });
      return component;
    }
    usedTypedSources.add(key);
    typedDRResults.push({
      component: component.key,
      label: component.label,
      type: component.type,
      source: result.drSource,
      applied,
      bypassed: result.bypassed === true
    });
    return {
      ...component,
      afterDR: Math.max(0, result.damageAfter),
      drApplied: Math.max(0, asNumber(component.drApplied, 0)) + applied,
      drSource: [component.drSource, result.drSource].filter(Boolean).join(', ')
    };
  });

  staged = syncStage(staged, 'afterDR', 'afterTempHP');
  const afterDRTotal = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterDR, 0)), 0);
  const tempResult = TempHPResolver.resolve({ damage: afterDRTotal, actor });
  staged = distributeReduction(staged, 'afterTempHP', tempResult.tempAbsorbed, 'tempAbsorbed');

  const hpDamage = staged.reduce((sum, component) => sum + Math.max(0, asNumber(component.afterTempHP, 0)), 0);
  const drAppliedTotal = Math.max(0, afterShieldTotal - afterDRTotal);
  const drSources = [
    genericDRResult.drApplied > 0 ? genericDRResult.drSource : '',
    ...typedDRResults.filter(result => result.applied > 0).map(result => result.source)
  ].filter(Boolean);

  const result = {
    originalDamage: damage,
    afterShield: shieldResult.damageAfter,
    afterDR: afterDRTotal,
    afterTempHP: tempResult.damageAfter,
    hpDamage,
    shield: {
      applied: shieldResult.srApplied,
      degraded: shieldResult.srDegraded,
      remaining: shieldResult.srRemaining,
      source: ShieldMitigationResolver.getSRSource(actor) || 'None'
    },
    damageReduction: {
      applied: drAppliedTotal,
      source: drSources.join(', '),
      bypassed: genericDRResult.bypassed === true || typedDRResults.some(entry => entry.bypassed === true),
      genericApplied: genericDRResult.drApplied,
      typedApplied: typedDRResults.reduce((sum, entry) => sum + Math.max(0, asNumber(entry.applied, 0)), 0),
      typedResults: typedDRResults
    },
    tempHP: {
      absorbed: tempResult.tempAbsorbed,
      before: tempResult.tempBefore,
      after: tempResult.tempAfter
    },
    breakdown: makeBreakdown({ damage, shieldResult, genericDRResult, typedDRResults, tempResult }),
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
