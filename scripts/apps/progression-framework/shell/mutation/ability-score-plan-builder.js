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
  static buildLevelUpSet({ actor, attr = {}, manifest = null, getAllocationMode = null, source = 'progression-finalizer' } = {}) {
    const set = {};
    const increases = attr?.increases || {};
    const allocationMode = typeof getAllocationMode === 'function' ? getAllocationMode() : null;
    const maxPerAbility = allocationMode === 'allow_stacked_two' ? 2 : 1;
    const normalizedIncreases = {};

    for (const key of ABILITY_KEYS) {
      const delta = Math.max(0, Math.min(maxPerAbility, numeric(increases?.[key], 0) || 0));
      if (delta <= 0) continue;
      set[`system.attributes.${key}.base`] = abilityBase(actor, key) + delta;
      normalizedIncreases[key] = delta;
    }

    if (!Object.keys(normalizedIncreases).length) return set;

    const level = numeric(manifest?.characterLevel, null);
    const record = {
      level,
      characterLevel: level,
      increases: normalizedIncreases,
      timestamp: new Date().toISOString(),
      source,
    };

    const history = Array.isArray(actor?.system?.progression?.abilityIncreaseHistory)
      ? actor.system.progression.abilityIncreaseHistory
      : [];
    const filteredHistory = level
      ? history.filter(entry => Number(entry?.level ?? entry?.characterLevel ?? 0) !== Number(level))
      : history;

    set['system.progression.lastAbilityIncrease'] = record;
    set['system.progression.abilityIncreaseHistory'] = [
      ...filteredHistory,
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
  static buildSet({ mode, actor, attr = {}, attrValues = {}, manifest = null, getAllocationMode = null, source } = {}) {
    if (mode === 'levelup' && attr?.mode === 'levelup-ability-increase') {
      return this.buildLevelUpSet({ actor, attr, manifest, getAllocationMode, source });
    }
    return this.buildChargenSet({ attr, attrValues });
  }
}
