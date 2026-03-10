/**
 * SchemaAdapters – Canonical Read/Write Accessors
 *
 * PURPOSE:
 * Provides a single source of truth for accessing actor schema fields across multiple
 * deprecated/competing paths. Eliminates guessing about which path to use where.
 *
 * CANONICAL PATHS (source of truth):
 * - HP:                      system.hp.value (max: system.hp.max)
 * - Damage Threshold:        system.derived.damageThreshold
 * - Force Points:            system.forcePoints.value
 * - Abilities (STR/DEX/etc): system.derived.abilities[ABILITY].mod
 * - Defenses (reflex/etc):   system.derived.defenses[DEFENSE].value
 * - Condition Penalty:       system.conditionTrack.current (mapped to -1, -2, -3, -4)
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
   * Get ability modifier
   * Canonical: system.derived.abilities[ability].mod
   *
   * @param {Actor} actor
   * @param {string} ability - 'str', 'dex', 'con', 'int', 'wis', 'cha'
   * @returns {number} Modifier
   */
  static getAbilityMod(actor, ability) {
    if (!actor?.system || !ability) return 0;
    const normalized = ability.toLowerCase();
    return actor.system?.derived?.abilities?.[normalized]?.mod ?? 0;
  }

  /**
   * Get ability score (before modifiers)
   * Canonical: system.attributes[ABILITY].value (legacy location, may need migration)
   *
   * @param {Actor} actor
   * @param {string} ability - 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'
   * @returns {number} Ability score
   */
  static getAbilityScore(actor, ability) {
    if (!actor?.system || !ability) return 10;
    const normalized = ability.toUpperCase();
    return actor.system?.attributes?.[normalized]?.value ?? 10;
  }

  /**
   * ========================
   * DEFENSE ACCESSORS
   * ========================
   */

  /**
   * Get defense value
   * Canonical: system.derived.defenses[defense].value
   *
   * @param {Actor} actor
   * @param {string} defense - 'reflex', 'fortitude', 'will'
   * @returns {number} Defense value
   */
  static getDefense(actor, defense) {
    if (!actor?.system || !defense) return 10;
    const normalized = defense.toLowerCase();
    return actor.system?.derived?.defenses?.[normalized]?.value ?? 10;
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
    const currentCT = actor.system?.conditionTrack?.current ?? 0;
    // Map CT value to penalty: 0=0, 1=-1, 2=-2, 3=-3, 4=-4
    return Math.max(0, currentCT);
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

  /**
   * Validate actor schema integrity
   * Checks for inconsistent state across canonical and legacy paths
   *
   * @param {Actor} actor
   * @returns {Object} { valid: boolean, issues: [] }
   */
  static validateSchema(actor) {
    const issues = [];

    if (!actor?.system) {
      return { valid: false, issues: ['No actor.system'] };
    }

    // Check for HP inconsistency
    const hpCanonical = actor.system?.hp?.value;
    const hpLegacy = actor.system?.health?.current;
    if (hpCanonical !== undefined && hpLegacy !== undefined && hpCanonical !== hpLegacy) {
      issues.push(
        `HP mismatch: system.hp.value=${hpCanonical}, system.health.current=${hpLegacy}`
      );
    }

    // Check for Force Points inconsistency
    const fpCanonical = actor.system?.forcePoints?.value;
    const fpLegacy = actor.system?.resources?.forcePoints?.value;
    if (fpCanonical !== undefined && fpLegacy !== undefined && fpCanonical !== fpLegacy) {
      issues.push(
        `Force Points mismatch: system.forcePoints.value=${fpCanonical}, ` +
        `system.resources.forcePoints.value=${fpLegacy}`
      );
    }

    // Check for Damage Threshold inconsistency
    const dtCanonical = actor.system?.derived?.damageThreshold;
    const dtLegacy = actor.system?.traits?.damageThreshold;
    if (dtCanonical !== undefined && dtLegacy !== undefined && dtCanonical !== dtLegacy) {
      issues.push(
        `DT mismatch: system.derived.damageThreshold=${dtCanonical}, ` +
        `system.traits.damageThreshold=${dtLegacy}`
      );
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default SchemaAdapters;
