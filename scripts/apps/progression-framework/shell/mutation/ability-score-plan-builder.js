/**
 * AbilityScorePlanBuilder
 *
 * Domain compiler for progression ability-score mutations.
 *
 * This module is intentionally side-effect free: it does not mutate actors, create
 * items, or call ActorEngine. It only converts a normalized progression selection
 * into a mutation-plan `set` fragment. ProgressionFinalizer remains responsible
 * for orchestration, validation, merge order, and applying the final plan.
 *
 * Canonical ability contract:
 * - Persistent/editable scores: system.attributes.<ability>.base
 * - Computed totals/modifiers: system.derived.attributes.<ability>.*
 * - system.abilities is legacy read fallback only
 */

import { resolveEntitlementLevel, assertEntitlementOpen, AbilityIncreaseError, newTransactionId, strictCount, validateAbilitySelection } from './ability-increase-guard.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const ABILITY_ALIASES = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
  str: 'str',
  dex: 'dex',
  con: 'con',
  int: 'int',
  wis: 'wis',
  cha: 'cha',
};

function canonicalAbilityKey(value) {
  return ABILITY_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

function numeric(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function abilityBase(actor, key) {
  return numeric(
    actor?.system?.attributes?.[key]?.base
      ?? actor?.system?.abilities?.[key]?.base
      ?? actor?.system?.abilities?.[key]?.value,
    10
  ) || 10;
}

function readSelectedScore(entry) {
  if (entry && typeof entry === 'object') {
    return numeric(entry.score ?? entry.base ?? entry.value ?? entry.total, null);
  }
  return numeric(entry, null);
}

function normalizeFinalValues(attr = {}, attrValues = {}) {
  if (attr?.finalValues && typeof attr.finalValues === 'object') return attr.finalValues;
  if (attr?.values && typeof attr.values === 'object') return attr.values;
  if (attrValues && typeof attrValues === 'object') return attrValues;
  return {};
}

export class AbilityScorePlanBuilder {
  /**
   * Build chargen ability-score set fragment.
   * @param {Object} params
   * @param {Object} params.attr - progression selection object
   * @param {Object} params.attrValues - normalized attribute value object
   * @returns {Object} mutation-plan set fragment
   */
  static buildChargenSet({ attr = {}, attrValues = {} } = {}) {
    const set = {};
    const values = normalizeFinalValues(attr, attrValues);

    for (const [rawKey, rawValue] of Object.entries(values || {})) {
      const key = canonicalAbilityKey(rawKey);
      const score = readSelectedScore(rawValue);
      if (!key || !Number.isFinite(score) || score <= 0) continue;
      set[`system.attributes.${key}.base`] = Math.floor(score);
    }

    return set;
  }

  /**
   * Build level-up ability increase set fragment.
   * @param {Object} params
   * @param {Actor} params.actor
   * @param {Object} params.attr - progression selection object
   * @param {Object|null} params.manifest - level-up entitlement manifest
   * @param {Function} params.getAllocationMode - returns allocation mode string
   * @param {string} params.source - audit/source label
   * @returns {Object} mutation-plan set fragment
   */
  static buildLevelUpSet({ actor, attr = {}, manifest = null, getAllocationMode = null, source = 'progression-finalizer', entitlementCheck = null } = {}) {
    const set = {};
    const allocationMode = typeof getAllocationMode === 'function' ? getAllocationMode() : null;
    if (!allocationMode) throw new AbilityIncreaseError('ALLOCATION_RULE_UNKNOWN', 'The ability-increase allocation rule could not be determined; nothing was changed.');
    const maxPerAbility = allocationMode === 'allow_stacked_two' ? 2 : 1;
    const rawIncreases = attr?.increases;
    // An empty selection is "nothing to apply" (not a transaction).
    if (rawIncreases && typeof rawIncreases === 'object' && !Object.values(rawIncreases).some(v => v !== undefined && v !== 0)) return set;

    // Identity first, before any score is computed. The level comes from the ENTITLEMENT being resolved (attribute step level / slot id /
    // manifest) and fails closed when missing, invalid or ambiguous - never the actor's current level, never null / 0.
    const { level, entitlementId } = resolveEntitlementLevel({ attr, manifest });
    // EVD-02: the entitlement must actually EXIST before anything is awarded, with a KNOWN count (EVD-01) that is not a pending rules question.
    if (typeof entitlementCheck !== 'function') throw new AbilityIncreaseError('ENTITLEMENT_UNVALIDATED', `The level ${level} ability-increase entitlement could not be validated; nothing was changed.`);
    const entitlement = entitlementCheck(level) || {};
    if (!entitlement.exists) throw new AbilityIncreaseError('ENTITLEMENT_NOT_FOUND', `No level ${level} ability-increase entitlement exists for this character${entitlement.reason ? ` (${entitlement.reason})` : ''}; nothing was changed.`);
    if (entitlement.rulesDeferred) throw new AbilityIncreaseError('ENTITLEMENT_COUNT_DEFERRED', `The number of level ${level} ability increases for this character is a pending rules question; nothing was changed.`);
    const entitledCount = strictCount(entitlement.count);
    if (entitledCount === null) throw new AbilityIncreaseError('ENTITLEMENT_COUNT_UNKNOWN', `The number of level ${level} ability increases is not established; nothing was changed.`);
    // EVR-04: the submitted selection is validated AS SUBMITTED. It is never clamped, rounded or altered into a different legal selection.
    const { increases: normalizedIncreases } = validateAbilitySelection(rawIncreases, { maxPerAbility, entitledCount });
    const history = Array.isArray(actor?.system?.progression?.abilityIncreaseHistory)
      ? actor.system.progression.abilityIncreaseHistory
      : [];
    // One active record per entitlement (C1 / C2): an existing entry blocks a second additive application.
    assertEntitlementOpen(history, level);

    for (const [key, delta] of Object.entries(normalizedIncreases)) {
      set[`system.attributes.${key}.base`] = abilityBase(actor, key) + delta;
    }

    const record = {
      level,
      characterLevel: level,
      entitlementId,
      transactionId: newTransactionId(),
      entitledCount,
      allocationMode,
      increases: normalizedIncreases,
      timestamp: new Date().toISOString(),
      source,
    };

    set['system.progression.lastAbilityIncrease'] = record;
    set['system.progression.abilityIncreaseHistory'] = [
      ...history,
      record,
    ].sort((a, b) => Number(a?.level ?? a?.characterLevel ?? 0) - Number(b?.level ?? b?.characterLevel ?? 0));

    return set;
  }

  /**
   * Build the proper ability-score set fragment for a progression mode.
   * @param {Object} params
   * @param {string} params.mode - chargen | levelup | reconcile
   * @returns {Object} mutation-plan set fragment
   */
  static buildSet({ mode, actor, attr = {}, attrValues = {}, manifest = null, getAllocationMode = null, source, entitlementCheck = null } = {}) {
    if (mode === 'levelup' && attr?.mode === 'levelup-ability-increase') {
      return this.buildLevelUpSet({ actor, attr, manifest, getAllocationMode, source, entitlementCheck });
    }
    return this.buildChargenSet({ attr, attrValues });
  }
}
