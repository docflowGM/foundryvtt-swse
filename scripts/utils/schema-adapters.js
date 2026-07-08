/**
 * SchemaAdapters – Canonical Read/Write Accessors
 *
 * PURPOSE:
 * Provides a single source of truth for accessing actor schema fields across multiple
 * deprecated/competing paths. Eliminates guessing about which path to use where.
 *
 * CANONICAL PATHS (source of truth):
 * - HP:                      system.hp.value (max: system.hp.max) — ONLY ActorEngine.recomputeHP() writes .max
 * - Damage Threshold:        system.derived.damageThreshold
 * - Force Points:            system.forcePoints.value
 * - Ability Score (Persistent): system.abilities[ABILITY].base (writable by progression/actor engine)
 * - Ability Score (Computed): system.derived.attributes[ABILITY].total (read-only, computed by DerivedCalculator)
 * - Ability Modifier:        system.derived.attributes[ABILITY].mod (read-only, computed by DerivedCalculator)
 * - Defense Total:           system.derived.defenses[DEFENSE].total
 * - BAB:                     system.derived.bab
 * - Skill Total:             system.derived.skills[SKILL].total
 * - Initiative Total:        system.derived.initiative.total (NOT skills.initiative)
 * - Condition Penalty:       system.derived.modifiers.conditionPenalty (fallback: system.conditionTrack.current → -1 to -4)
 *
 * FALLBACK PATHS (legacy, read-only, deprecated):
 * - HP (OLD):                system.health.current / system.health.max
 * - Archetype Affinity:      actor.flags.swse.archetypeAffinity (NOT system.flags.swse)
 * - Force Points (OLD):      system.resources.forcePoints.value
 *
 * USAGE:
 * Read: const hp = SchemaAdapters.getHP(actor);
 * Write: await SchemaAdapters.setHP(actor, newHP);  // Routes through ActorEngine
 *
 * DEPRECATION:
 * All reads from legacy paths log a warning with dev context info.
 * Callers should migrate to canonical paths when possible.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const ABILITY_KEYS = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha']);

function numeric(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function scoreToMod(value) {
  const score = numeric(value, null);
  return score === null ? null : Math.floor((score - 10) / 2);
}

function normalizeAbilityKey(ability = '') {
  const raw = String(ability || '').toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha'
  };
  const key = aliases[raw] ?? raw.slice(0, 3);
  return ABILITY_KEYS.has(key) ? key : '';
}

function firstFinite(values = []) {
  for (const value of values) {
    const n = numeric(value, null);
    if (n !== null) return n;
  }
  return null;
}

function normalizeClassKey(value = '') {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function estimateBabForClass(className, level) {
  const key = normalizeClassKey(className);
  const lvl = Math.max(0, Number(level) || 0);
  if (!lvl) return 0;
  if (key === 'nonheroic') {
    const table = [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15];
    return table[Math.min(table.length, lvl) - 1] ?? 0;
  }
  if (/soldier|jedi|elite|gunslinger|weaponmaster|duelist|martialarts|brawler|enforcer|bodyguard|knight|master|ace|officer|vanguard/.test(key)) return lvl;
  return Math.floor(lvl * 0.75);
}

function classLevelsFromActor(actor) {
  const out = [];
  const push = (name, level) => {
    const className = String(name ?? '').trim();
    const lvl = Number(level ?? 0) || 0;
    if (className && lvl > 0) out.push({ className, level: lvl });
  };

  const progression = actor?.system?.progression?.classLevels;
  if (Array.isArray(progression)) {
    for (const entry of progression) push(entry?.className ?? entry?.name ?? entry?.class ?? entry?.id ?? entry?.classId, entry?.level ?? entry?.levels ?? entry?.value);
  } else if (progression && typeof progression === 'object') {
    for (const [key, entry] of Object.entries(progression)) {
      if (entry && typeof entry === 'object') push(entry.className ?? entry.name ?? entry.class ?? key, entry.level ?? entry.levels ?? entry.value);
      else push(key, entry);
    }
  }

  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (item?.type !== 'class') continue;
      const system = item.system ?? {};
      push(system.className ?? system.name ?? system.classId ?? item.name, system.level ?? system.levels ?? system.classLevel ?? system.value);
    }
  } catch (_err) {
    // Ignore collection failures; schema accessors must be fail-safe.
  }

  const merged = new Map();
  for (const entry of out) {
    const key = normalizeClassKey(entry.className);
    if (!key) continue;
    merged.set(key, { className: entry.className, level: Math.max(merged.get(key)?.level ?? 0, entry.level) });
  }
  return [...merged.values()];
}

function estimatedBabFromClasses(actor) {
  const rows = classLevelsFromActor(actor);
  return rows.reduce((sum, row) => sum + estimateBabForClass(row.className, row.level), 0);
}

export class SchemaAdapters {
  /**
   * ========================
   * HP ACCESSORS
   * ========================
   */

  /**
   * Get current HP value
   * Canonical: system.hp.value
   * Fallback: system.health.current (deprecated)
   *
   * @param {Actor} actor
   * @returns {number} Current HP
   */
  static getHP(actor) {
    if (!actor?.system) return 0;

    const canonical = actor.system?.hp?.value;
    if (canonical !== undefined) {
      return canonical;
    }

    // Fallback: legacy path (should not happen in v13+)
    const legacy = actor.system?.health?.current;
    if (legacy !== undefined) {
      this._logDeprecatedRead('system.health.current', 'system.hp.value', actor);
      return legacy;
    }

    return 0;
  }

  /**
   * Get max HP
   * Canonical: system.hp.max
   *
   * @param {Actor} actor
   * @returns {number} Max HP
   */
  static getMaxHP(actor) {
    if (!actor?.system) return 1;
    return actor.system?.hp?.max ?? 1;
  }

  /**
   * Set HP (returns update object; caller must apply via ActorEngine)
   *
   * @param {number} newHP
   * @returns {Object} { 'system.hp.value': newHP }
   */
  static setHPUpdate(newHP) {
    if (typeof newHP !== 'number') {
      throw new Error(`setHPUpdate: expected number, got ${typeof newHP}`);
    }
    return { 'system.hp.value': newHP };
  }

  /**
   * ========================
   * DAMAGE THRESHOLD ACCESSORS
   * ========================
   */

  /**
   * Get Damage Threshold
   * Canonical: system.derived.damageThreshold
   * Fallback: system.traits.damageThreshold (legacy)
   *
   * @param {Actor} actor
   * @returns {number} Damage threshold
   */
  static getDamageThreshold(actor) {
    if (!actor?.system) return 10;

    const canonical = actor.system?.derived?.damageThreshold;
    if (canonical !== undefined) {
      return canonical;
    }

    // Fallback: legacy path (should not happen)
    const legacy = actor.system?.traits?.damageThreshold;
    if (legacy !== undefined) {
      this._logDeprecatedRead('system.traits.damageThreshold', 'system.derived.damageThreshold', actor);
      return legacy;
    }

    return 10; // Default per RAW
  }

  /**
   * ========================
   * FORCE POINTS ACCESSORS
   * ========================
   */

  /**
   * Get current Force Points
   * Canonical: system.forcePoints.value
   * Fallback: system.resources.forcePoints.value (legacy)
   *
   * @param {Actor} actor
   * @returns {number} Current Force Points
   */
  static getForcePoints(actor) {
    if (!actor?.system) return 0;

    const canonical = actor.system?.forcePoints?.value;
    if (canonical !== undefined) {
      return canonical;
    }

    // Fallback: legacy path
    const legacy = actor.system?.resources?.forcePoints?.value;
    if (legacy !== undefined) {
      this._logDeprecatedRead('system.resources.forcePoints.value', 'system.forcePoints.value', actor);
      return legacy;
    }

    return 0;
  }

  /**
   * Get max Force Points
   * Canonical: system.forcePoints.max
   *
   * @param {Actor} actor
   * @returns {number} Max Force Points
   */
  static getMaxForcePoints(actor) {
    if (!actor?.system) return 0;
    return actor.system?.forcePoints?.max ?? 0;
  }

  /**
   * Set Force Points (returns update object)
   *
   * @param {number} newValue
   * @returns {Object} { 'system.forcePoints.value': newValue }
   */
  static setForcePointsUpdate(newValue) {
    if (typeof newValue !== 'number') {
      throw new Error(`setForcePointsUpdate: expected number, got ${typeof newValue}`);
    }
    return { 'system.forcePoints.value': newValue };
  }

  /**
   * ========================
   * ABILITY ACCESSORS (Modifiers)
   * ========================
   */

  /**
   * Get ability modifier.
   * Canonical: system.derived.attributes[ability].mod.
   * Fallbacks intentionally cover actor sheets while derived hydration is stale.
   *
   * @param {Actor} actor
   * @param {string} ability - 'str', 'dex', 'con', 'int', 'wis', 'cha'
   * @returns {number} Modifier
   */
  static getAbilityMod(actor, ability) {
    if (!actor?.system || !ability) return 0;
    const normalized = normalizeAbilityKey(ability);
    if (!normalized) return 0;

    const attrs = actor.system?.attributes?.[normalized] ?? {};
    const abilityData = actor.system?.abilities?.[normalized] ?? {};
    const derivedAttr = actor.system?.derived?.attributes?.[normalized] ?? {};
    const derivedAbility = actor.system?.derived?.abilities?.[normalized] ?? {};

    const direct = firstFinite([
      derivedAttr.mod,
      derivedAttr.modifier,
      derivedAbility.mod,
      derivedAbility.modifier,
      attrs.mod,
      attrs.modifier,
      abilityData.mod,
      abilityData.modifier
    ]);
    if (direct !== null) return direct;

    const score = firstFinite([
      derivedAttr.total,
      derivedAbility.total,
      attrs.total,
      attrs.score,
      attrs.value,
      abilityData.total,
      abilityData.score,
      abilityData.value,
      abilityData.base,
      attrs.base
    ]);
    const fromScore = scoreToMod(score);
    if (fromScore !== null) return fromScore;

    const rebuiltScore = Number(attrs.base ?? abilityData.base ?? 10)
      + Number(attrs.species ?? attrs.racial ?? abilityData.species ?? abilityData.racial ?? 0)
      + Number(attrs.enhancement ?? attrs.misc ?? abilityData.enhancement ?? abilityData.misc ?? 0)
      + Number(attrs.temp ?? abilityData.temp ?? 0);
    return scoreToMod(rebuiltScore) ?? 0;
  }

  /**
   * Get ability score total (with all bonuses)
   * Canonical: system.derived.attributes[ABILITY].total (computed, read-only)
   *
   * @param {Actor} actor
   * @param {string} ability - 'str', 'dex', 'con', 'int', 'wis', 'cha'
   * @returns {number} Ability score
   */
  static getAbilityScore(actor, ability) {
    if (!actor?.system || !ability) return 10;
    const normalized = normalizeAbilityKey(ability);
    if (!normalized) return 10;

    const attrs = actor.system?.attributes?.[normalized] ?? {};
    const abilityData = actor.system?.abilities?.[normalized] ?? {};
    const derivedAttr = actor.system?.derived?.attributes?.[normalized] ?? {};
    const derivedAbility = actor.system?.derived?.abilities?.[normalized] ?? {};

    const score = firstFinite([
      derivedAttr.total,
      derivedAbility.total,
      attrs.total,
      attrs.score,
      attrs.value,
      abilityData.total,
      abilityData.score,
      abilityData.value,
      abilityData.base,
      attrs.base
    ]);
    if (score !== null) return score;

    return Number(attrs.base ?? abilityData.base ?? 10)
      + Number(attrs.species ?? attrs.racial ?? abilityData.species ?? abilityData.racial ?? 0)
      + Number(attrs.enhancement ?? attrs.misc ?? abilityData.enhancement ?? abilityData.misc ?? 0)
      + Number(attrs.temp ?? abilityData.temp ?? 0);
  }

  /**
   * ========================
   * DEFENSE ACCESSORS
   * ========================
   */

  /**
   * Get defense total (canonical)
   * Canonical: system.derived.defenses[defense].total (phase 1B reconciliation)
   * NOT .value — use .total for derived defenses
   *
   * @param {Actor} actor
   * @param {string} defense - 'reflex', 'fortitude', 'will'
   * @returns {number} Defense total
   */
  static getDefenseTotal(actor, defense) {
    if (!actor?.system || !defense) return 10;
    const normalized = defense.toLowerCase();
    return actor.system?.derived?.defenses?.[normalized]?.total ?? 10;
  }

  /**
   * Alias for getDefenseTotal (backward compatibility)
   * @deprecated Use getDefenseTotal() instead
   */
  static getDefense(actor, defense) {
    if (globalThis.SWSE?.DEBUG_MODE) {
      SWSELogger.warn('[DEPRECATED] SchemaAdapters.getDefense() → use getDefenseTotal() instead');
    }
    return this.getDefenseTotal(actor, defense);
  }

  /**
   * Get Base Attack Bonus
   * Canonical: system.derived.bab
   *
   * @param {Actor} actor
   * @returns {number} BAB value
   */
  static getBAB(actor) {
    if (!actor?.system) return 0;
    const system = actor.system;
    const direct = firstFinite([
      system.derived?.bab,
      system.derived?.bab?.total,
      system.derived?.bab?.value,
      system.derived?.combat?.bab,
      system.bab,
      system.bab?.total,
      system.bab?.value,
      system.baseAttackBonus,
      system.baseAttack,
      system.attributes?.bab?.value,
      system.combat?.bab
    ]);
    if (direct !== null) return direct;
    return estimatedBabFromClasses(actor);
  }

  /**
   * Get skill total
   * Canonical: system.derived.skills[skillKey].total
   *
   * @param {Actor} actor
   * @param {string} skillKey - e.g., 'acrobatics', 'perception'
   * @returns {number} Skill total
   */
  static getSkillTotal(actor, skillKey) {
    if (!actor?.system || !skillKey) return 0;
    return actor.system?.derived?.skills?.[skillKey]?.total ?? 0;
  }

  /**
   * Get initiative total (combat canonical)
   * Canonical: system.derived.initiative.total (NOT skills.initiative)
   *
   * @param {Actor} actor
   * @returns {number} Initiative total
   */
  static getInitiativeTotal(actor) {
    if (!actor?.system) return 0;
    return actor.system?.derived?.initiative?.total ?? 0;
  }

  /**
   * ========================
   * CONDITION & PENALTIES
   * ========================
   */

  /**
   * Get condition track current value and convert to penalty
   * Canonical: system.conditionTrack.current (0-4 scale)
   * Returns penalty: 0 = no penalty, 1 = -1, 2 = -2, 3 = -3, 4 = -4
   *
   * @param {Actor} actor
   * @returns {number} Condition penalty
   */
  static getConditionPenalty(actor) {
    if (!actor?.system) return 0;
    const derivedPenalty = actor.system?.derived?.damage?.conditionPenalty;
    if (typeof derivedPenalty === 'number') return derivedPenalty;
    const currentCT = Number(actor.system?.conditionTrack?.current ?? 0);
    const penalties = { 0: 0, 1: -1, 2: -2, 3: -5, 4: -10, 5: 0 };
    return penalties[currentCT] ?? 0;
  }

  /**
   * ========================
   * FLAG ACCESSORS
   * ========================
   */

  /**
   * Get actor flags safely
   * Note: Flags are on actor.flags, NOT actor.system.flags
   *
   * @param {Actor} actor
   * @param {string} scope - namespace (e.g., 'swse')
   * @param {string} key - flag key
   * @param {any} defaultValue
   * @returns {any}
   */
  static getFlag(actor, scope, key, defaultValue = undefined) {
    if (!actor) return defaultValue;
    return actor.getFlag?.(scope, key) ?? defaultValue;
  }

  /**
   * Get archetype affinity snapshot
   * Canonical: actor.flags.swse.archetypeAffinity
   *
   * @param {Actor} actor
   * @returns {Object|null}
   */
  static getArchetypeAffinity(actor) {
    if (!actor?.flags) return null;
    return actor.flags?.swse?.archetypeAffinity ?? null;
  }

  /**
   * ========================
   * DEBUG UTILITIES
   * ========================
   */

  /**
   * Log deprecated read with context
   * @private
   */
  static _logDeprecatedRead(legacyPath, canonicalPath, actor) {
    if (globalThis.SWSE?.DEBUG_MODE) {
      SWSELogger.warn(
        `[SchemaAdapters] Deprecated read from ${legacyPath}. ` +
        `Canonical path is ${canonicalPath}. Actor: ${actor?.name ?? 'unknown'}`,
        { actorId: actor?.id, legacyPath, canonicalPath }
      );
    }
  }
}
