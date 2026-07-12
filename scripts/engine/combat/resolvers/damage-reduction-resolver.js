/**
 * DamageReductionResolver — Pure DR (Damage Reduction) Application
 *
 * Responsibility:
 * - Extract DR from actor (ModifierEngine domain: "damageReduction")
 * - Apply highest valid DR only (no stacking)
 * - Handle bypass rules (lightsabers, special weapons)
 * - Return structured result
 *
 * Contract:
 * - Pure: No side effects, no mutations
 * - Stateless: All data passed as parameters
 * - Returns: { damageBefore, damageAfter, drApplied, drSource, bypassed }
 *
 * RAW Rules:
 * - Highest source applies only (no stacking)
 * - Lightsabers ignore DR
 * - Other energy weapons may bypass DR based on source
 * - DR applied after SR, before Temp HP
 */

import { isLightsaberWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";


function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function contextDamageText(context = {}) {
  const weapon = context.weapon ?? context.sourceWeapon ?? null;
  const weaponSystem = weapon?.system ?? {};
  const fields = [
    context.damageType,
    context.damageTypes,
    context.energyType,
    context.attackType,
    weaponSystem.damageType,
    weaponSystem.damage?.type,
    weaponSystem.damageTypes,
    weaponSystem.traits,
    weaponSystem.properties,
    weapon?.name
  ];
  const flat = [];
  for (const field of fields) {
    if (Array.isArray(field)) flat.push(...field);
    else if (field && typeof field === 'object') flat.push(...Object.values(field));
    else if (field !== undefined && field !== null) flat.push(field);
  }
  return flat.map(normalizeKey).filter(Boolean).join(' ');
}

function weaponContextText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.source,
    system.sourceType,
    system.naturalWeaponType,
    system.traits,
    system.properties
  ];
  const flat = [];
  for (const field of fields) {
    if (Array.isArray(field)) flat.push(...field);
    else if (field && typeof field === 'object') flat.push(...Object.values(field));
    else if (field !== undefined && field !== null) flat.push(field);
  }
  return flat.map(normalizeKey).filter(Boolean).join(' ');
}

function isUnarmedOrNaturalWeapon(weapon, context = {}) {
  if (context.unarmed === true || context.attackFamily === 'unarmed' || context.naturalWeapon === true) return true;
  if (!weapon) return false;
  if (weapon?.flags?.swse?.unarmed === true || weapon?.flags?.swse?.isNaturalWeapon === true || weapon?.flags?.swse?.naturalWeapon === true) return true;
  const system = weapon?.system ?? {};
  if (system.isUnarmed === true || system.naturalWeapon === true || system.isNaturalWeapon === true) return true;
  if (normalizeKey(system.source) === 'species-natural-weapon') return true;
  const text = weaponContextText(weapon);
  return /unarmed|natural-weapon|claw|bite|talon|tusk|horn|tail|slam|gore/.test(text);
}

function ruleAllowsIgnoreDR(rule, weapon, context = {}) {
  const type = String(rule?.type ?? '').toUpperCase();
  if (type !== 'IGNORE_DAMAGE_REDUCTION_IF_OVERCOME') return false;
  if (rule.requiresUnarmed === true && !isUnarmedOrNaturalWeapon(weapon, context)) return false;
  return true;
}

function actorHasIgnoreDRIfOvercome(actor, weapon, context = {}) {
  if (!actor) return false;
  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
    if (rules.some(rule => ruleAllowsIgnoreDR(rule, weapon, context))) return true;
  }
  return false;
}

function ruleDamageTypes(rule) {
  return asArray(rule.damageTypes ?? rule.damageType ?? rule.types)
    .map(normalizeKey)
    .filter(Boolean);
}

function ruleMatchesDamageContext(rule, context = {}, { typedOnly = false, genericOnly = false } = {}) {
  const damageTypes = ruleDamageTypes(rule);
  if (typedOnly && !damageTypes.length) return false;
  if (genericOnly && damageTypes.length) return false;
  if (!damageTypes.length) return true;
  const text = contextDamageText(context);
  if (!text) return false;
  return damageTypes.some(type => text.includes(type));
}

function collectItemDamageReduction(actor, context = {}, filters = {}) {
  let value = 0;
  let source = '';

  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      const type = String(rule?.type ?? '').toUpperCase();
      if (type !== 'DAMAGE_REDUCTION' && type !== 'CONTEXTUAL_DAMAGE_REDUCTION') continue;
      if (!ruleMatchesDamageContext(rule, context, filters)) continue;

      const amount = Number(rule.value ?? rule.amount ?? rule.damageReduction ?? 0);
      if (!Number.isFinite(amount) || amount <= value) continue;
      value = amount;
      source = rule.label || item.name || `Item DR (${amount})`;
    }
  }

  return { value, source };
}

export class DamageReductionResolver {
  /**
   * Apply damage reduction mitigation.
   *
   * @param {number} damage - Incoming damage (after SR)
   * @param {Actor} actor - Target actor (read-only, for DR lookup)
   * @param {Object} context - Context object
   * @param {Item} context.weapon - Attacking weapon (for bypass checks)
   * @param {string} context.damageType - Damage type (energy, kinetic, etc.)
   * @returns {{
   *   damageBefore: number,
   *   damageAfter: number,
   *   drApplied: number,
   *   drSource: string,
   *   bypassed: boolean,
   *   mitigated: boolean
   * }}
   */
  static resolve({ damage, actor, context = {} }) {
    if (!actor || typeof damage !== 'number' || damage < 0) {
      return this._emptyResult(damage);
    }

    // ========================================
    // CHECK BYPASS RULES
    // ========================================

    const weapon = context.weapon;
    // Lightsaber / bypass-dr from the weapon OR the damage component tags (canonical
    // packet). RAW: lightsabers ignore DR regardless of the attack's damage type.
    const damageTags = (context.damageTags ?? context.damageComponents?.[0]?.tags ?? [])
      .map(tag => String(tag).toLowerCase());
    if (this._shouldBypassDR(weapon) || damageTags.includes('lightsaber') || damageTags.includes('bypass-dr')) {
      return {
        damageBefore: damage,
        damageAfter: damage,
        drApplied: 0,
        drSource: 'Lightsaber/Bypass',
        bypassed: true,
        mitigated: false
      };
    }

    // ========================================
    // EXTRACT DR (highest source only)
    // ========================================

    let drValue = 0;
    let drSource = '';

    const skipGenericDR = context.skipGenericDamageReduction === true || context.skipGenericDR === true;
    const onlyTypedDR = context.onlyTypedDamageReduction === true || context.typedOnlyDamageReduction === true;
    const onlyGenericDR = context.onlyGenericDamageReduction === true || context.genericOnlyDamageReduction === true;

    // D3: generic DR via canonical entries { value, exceptions[] }. A DR entry is
    // bypassed when the incoming damage type matches one of its exceptions
    // (DR X/exception). Highest-only. Generic item DR is included in the entries;
    // typed applies-to item DR (resistance-style) is handled separately below.
    if (!skipGenericDR && !onlyTypedDR) {
      const pseudoComponent = {
        type: context.damageType,
        damageTypes: context.damageTypes ?? [],
        originalDamageTypes: context.originalDamageTypes ?? [],
        tags: damageTags
      };
      for (const entry of this.getCanonicalDamageReductionEntries(actor)) {
        if (this.componentBypassesDamageReduction(pseudoComponent, entry)) continue;
        if (entry.value > drValue) {
          drValue = entry.value;
          drSource = entry.source || `DR ${entry.value}`;
        }
      }
    }

    // Typed applies-to item DR (resistance-style) — unchanged (D4 territory). Generic
    // item DR already came through the canonical entries above, so restrict to typed
    // here to avoid double-reading it (and to preserve exception handling).
    const itemDR = collectItemDamageReduction(actor, context, { typedOnly: !onlyGenericDR, genericOnly: onlyGenericDR });
    if (itemDR.value > drValue) {
      drValue = itemDR.value;
      drSource = itemDR.source || `Item DR (${drValue})`;
    }

    if (drValue <= 0) {
      return this._emptyResult(damage);
    }

    const sourceActor = context.sourceActor ?? context.attacker ?? context.source ?? null;
    if (damage > drValue && actorHasIgnoreDRIfOvercome(sourceActor, weapon, context)) {
      return {
        damageBefore: damage,
        damageAfter: damage,
        drApplied: 0,
        drSource: 'Ignore Damage Reduction',
        bypassed: true,
        mitigated: false
      };
    }

    // ========================================
    // APPLY DR
    // ========================================

    const damageAfter = Math.max(0, damage - drValue);
    const drApplied = damage - damageAfter;

    return {
      damageBefore: damage,
      damageAfter: damageAfter,
      drApplied: drApplied,
      drSource: drSource,
      bypassed: false,
      mitigated: drApplied > 0
    };
  }

  /**
   * Check if weapon bypasses DR (lightsabers, etc.)
   * @private
   */
  static _shouldBypassDR(weapon) {
    if (!weapon) return false;
    if (isLightsaberWeapon(weapon)) return true;
    if (weapon.system?.bypassDR === true) return true;
    return false;
  }

  /**
   * Empty result (no DR available)
   * @private
   */
  static _emptyResult(damage) {
    return {
      damageBefore: damage,
      damageAfter: damage,
      drApplied: 0,
      drSource: '',
      bypassed: false,
      mitigated: false
    };
  }

  /**
   * Get actor's current DR (for informational use)
   *
   * @param {Actor} actor
   * @returns {number} Current DR (0 if none)
   */
  static getCurrentDR(actor, context = {}) {
    if (!actor) return 0;
    const derived = Number(actor.system?.derived?.damageReduction?.highestValue ?? actor.system?.derived?.damageReduction?.all ?? actor.system?.derived?.damageReduction?.value ?? 0);
    const actorDR = Number(actor.system?.damageReduction ?? 0);
    const itemDR = collectItemDamageReduction(actor, context).value;
    return Math.max(derived || 0, actorDR || 0, itemDR || 0);
  }

  /**
   * D3: Collect canonical Damage Reduction entries { value, exceptions[], source }.
   *
   * Generic DR is `{ value, exceptions: [] }`; qualified DR is `DR X / exception`
   * where the exception damage type BYPASSES the DR. This covers the generic DR
   * sources only (base field, derived, and item DR rules). Item rules that express
   * APPLIES-TO typed reduction (damageTypes with no exceptions) are NOT DR — they
   * are typed resistance (D4) and remain in the resolver's typed pass.
   *
   * @param {Actor} actor
   * @returns {Array<{value:number, exceptions:string[], source:string}>}
   */
  static getCanonicalDamageReductionEntries(actor) {
    const entries = [];
    const norm = (v) => asArray(v).map(normalizeKey).filter(Boolean);

    const d = actor?.system?.derived?.damageReduction;
    if (Array.isArray(d?.entries)) {
      for (const e of d.entries) {
        const value = Number(e?.value ?? 0) || 0;
        if (value > 0) entries.push({ value, exceptions: norm(e?.exceptions), source: e?.source || 'Derived DR' });
      }
    } else {
      const value = Number(d?.highestValue ?? d?.all ?? d?.value ?? 0) || 0;
      if (value > 0) entries.push({ value, exceptions: norm(d?.exceptions), source: 'Derived DR' });
    }

    const base = actor?.system?.damageReduction;
    if (base && typeof base === 'object' && !Array.isArray(base)) {
      const value = Number(base.value ?? base.amount ?? 0) || 0;
      if (value > 0) entries.push({ value, exceptions: norm(base.exceptions ?? base.except ?? base.bypassedBy), source: 'Actor DR' });
    } else {
      const value = Number(base ?? 0) || 0;
      if (value > 0) entries.push({ value, exceptions: [], source: 'Actor DR' });
    }

    for (const item of actorItems(actor)) {
      const rules = item?.system?.abilityMeta?.rules;
      if (!Array.isArray(rules)) continue;
      for (const rule of rules) {
        const type = String(rule?.type ?? '').toUpperCase();
        if (type !== 'DAMAGE_REDUCTION' && type !== 'CONTEXTUAL_DAMAGE_REDUCTION') continue;
        const value = Number(rule.value ?? rule.amount ?? rule.damageReduction ?? 0) || 0;
        if (value <= 0) continue;
        const exceptions = norm(rule.exceptions ?? rule.except ?? rule.bypassedBy);
        // APPLIES-TO typed reduction (damageTypes, no exceptions) = typed resistance (D4), skip.
        if (ruleDamageTypes(rule).length && !exceptions.length) continue;
        entries.push({ value, exceptions, source: rule.label || item.name || 'Item DR' });
      }
    }

    return entries;
  }

  /** Public: does the weapon bypass DR (lightsaber / bypassDR)? */
  static shouldBypassDR(weapon) {
    return this._shouldBypassDR(weapon);
  }

  /** Public: does the attacker ignore the target's DR when it is overcome? */
  static sourceIgnoresDamageReduction(sourceActor, weapon, context = {}) {
    try {
      return actorHasIgnoreDRIfOvercome(sourceActor, weapon, context);
    } catch (_err) {
      return false;
    }
  }

  /**
   * D3: is a single damage component subject to a DR entry?
   * A component is bypassed if it carries a lightsaber / bypass-dr tag, or if its
   * damage type (expanded) matches one of the entry's exceptions.
   */
  static componentBypassesDamageReduction(component, entry) {
    const tags = (component?.tags || []).map(t => String(t).toLowerCase());
    if (tags.includes('lightsaber') || tags.includes('bypass-dr')) return true;
    const exceptions = new Set((entry?.exceptions || []).map(normalizeKey));
    if (!exceptions.size) return false;
    const compTypes = [component?.type, ...(component?.damageTypes || []), ...(component?.originalDamageTypes || [])]
      .map(normalizeKey)
      .filter(Boolean);
    return compTypes.some(t => exceptions.has(t));
  }
}
