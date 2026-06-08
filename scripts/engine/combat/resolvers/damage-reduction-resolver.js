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

function ruleMatchesDamageContext(rule, context = {}) {
  const damageTypes = asArray(rule.damageTypes ?? rule.damageType ?? rule.types)
    .map(normalizeKey)
    .filter(Boolean);
  if (!damageTypes.length) return true;
  const text = contextDamageText(context);
  if (!text) return false;
  return damageTypes.some(type => text.includes(type));
}

function collectItemDamageReduction(actor, context = {}) {
  let value = 0;
  let source = '';

  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      const type = String(rule?.type ?? '').toUpperCase();
      if (type !== 'DAMAGE_REDUCTION' && type !== 'CONTEXTUAL_DAMAGE_REDUCTION') continue;
      if (!ruleMatchesDamageContext(rule, context)) continue;

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
    if (this._shouldBypassDR(weapon)) {
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

    // DR can come from derived character/item aggregation or raw actor storage.
    const derivedDR = Number(actor.system?.derived?.damageReduction?.highestValue ?? actor.system?.derived?.damageReduction?.all ?? actor.system?.derived?.damageReduction?.value ?? 0);
    if (derivedDR > drValue) {
      drValue = derivedDR;
      drSource = `Derived DR (${drValue})`;
    }

    const actorDR = Number(actor.system?.damageReduction ?? 0);
    if (actorDR > drValue) {
      drValue = actorDR;
      drSource = `Actor DR (${drValue})`;
    }

    const itemDR = collectItemDamageReduction(actor, context);
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

    const name = (weapon.name || '').toLowerCase();
    const type = (weapon.system?.weaponType || '').toLowerCase();

    // Lightsabers bypass DR
    if (name.includes('lightsaber') || type.includes('lightsaber')) {
      return true;
    }

    // Check for explicit bypass flag
    if (weapon.system?.bypassDR === true) {
      return true;
    }

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
}
