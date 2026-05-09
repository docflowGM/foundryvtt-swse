/**
 * Capability Registry
 *
 * Unified facade over PrerequisiteChecker for all capability queries.
 * This is the single point of access for asking "does actor have X?"
 *
 * Internal implementation routes to PrerequisiteChecker as canonical authority.
 * No state mutation. Read-only query interface.
 *
 * Entry point for:
 * - PASSIVE ability checks
 * - ACTIVE ability checks
 * - ATTACK_OPTION ability checks
 * - UNLOCK ability checks
 * - Any system querying actor capabilities
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisite-checker.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

export class CapabilityRegistry {

  /**
   * === FEATURE OWNERSHIP ===
   * Query whether actor owns a specific feat or talent
   */

  /**
   * Check if actor has a feat by slug or UUID.
   *
   * @param {Object} actor
   * @param {string} slugOrUuid - Feat slug (e.g., 'force-sensitivity') or UUID
   * @returns {boolean}
   */
  static hasFeat(actor, slugOrUuid) {
    return PrerequisiteChecker.checkFeatOwnership(actor, slugOrUuid);
  }

  /**
   * Check if actor has a talent by slug or UUID.
   *
   * @param {Object} actor
   * @param {string} slugOrUuid - Talent slug (e.g., 'armored-defense') or UUID
   * @returns {boolean}
   */
  static hasTalent(actor, slugOrUuid) {
    return PrerequisiteChecker.checkTalentOwnership(actor, slugOrUuid);
  }

  /**
   * Check if actor has a feature (feat OR talent).
   *
   * @param {Object} actor
   * @param {string} slugOrUuid
   * @returns {boolean}
   */
  static hasFeature(actor, slugOrUuid) {
    return this.hasFeat(actor, slugOrUuid) || this.hasTalent(actor, slugOrUuid);
  }

  /**
   * === PROFICIENCIES ===
   * Query proficiency state
   */

  /**
   * Check if actor has weapon proficiency.
   *
   * @param {Object} actor
   * @param {string} weaponCategory - e.g., 'simple', 'martial', 'exotic'
   * @returns {boolean}
   */
  static hasWeaponProficiency(actor, weaponCategory) {
    const normalized = String(weaponCategory || '').trim();
    if (!normalized) return false;

    const systemProficiencies = actor.system?.weaponProficiencies || [];
    if (systemProficiencies.includes(normalized)) return true;

    const unlockWeapon = actor._unlockGrants?.proficiencies?.weapon;
    if (unlockWeapon instanceof Set && unlockWeapon.has(normalized)) return true;
    if (Array.isArray(unlockWeapon) && unlockWeapon.includes(normalized)) return true;

    const unlockExotic = actor._unlockGrants?.proficiencies?.exotic;
    if (normalized === 'exotic') {
      if (unlockExotic instanceof Set && unlockExotic.size > 0) return true;
      if (Array.isArray(unlockExotic) && unlockExotic.length > 0) return true;
    }

    return false;
  }

  /**
   * Check if actor has armor proficiency.
   *
   * @param {Object} actor
   * @param {string} armorCategory - e.g., 'light', 'medium', 'heavy'
   * @returns {boolean}
   */
  static hasArmorProficiency(actor, armorCategory) {
    const normalized = String(armorCategory || '').trim();
    if (!normalized) return false;

    const systemProficiencies = actor.system?.armorProficiencies || [];
    if (systemProficiencies.includes(normalized)) return true;

    const unlockArmor = actor._unlockGrants?.proficiencies?.armor;
    if (unlockArmor instanceof Set && unlockArmor.has(normalized)) return true;
    if (Array.isArray(unlockArmor) && unlockArmor.includes(normalized)) return true;

    return false;
  }

  /**
   * === SYSTEM ACCESS ===
   * Query system-level capabilities
   */

  /**
   * Check if actor is Force Sensitive.
   *
   * @param {Object} actor
   * @returns {boolean}
   */
  static isForceSensitive(actor) {
    const unlockAccess = actor?._unlockGrants?.systemAccess;
    if (unlockAccess instanceof Set && unlockAccess.has('force_sensitivity')) return true;
    if (Array.isArray(unlockAccess) && unlockAccess.includes('force_sensitivity')) return true;
    return this.hasFeat(actor, 'force-sensitivity');
  }

  /**
   * Check if actor has access to a Force domain.
   *
   * @param {Object} actor
   * @param {string} domain - Domain slug (e.g., 'universal', 'control', 'sense')
   * @returns {boolean}
   */
  static hasForceDomain(actor, domain) {
    return PrerequisiteChecker.checkForceDomain(actor, domain);
  }

  /**
   * === UTILITIES ===
   * Retrieve capability data
   */

  /**
   * Get all feats owned by actor (as slug array).
   *
   * @param {Object} actor
   * @returns {string[]} Array of feat slugs
   */
  static getOwnedFeats(actor) {
    const feats = ActorAbilityBridge.getFeats(actor);
    return feats.map(f => (f.system?.slug || f.name.toLowerCase().replace(/\s+/g, '-')));
  }

  /**
   * Get all talents owned by actor (as slug array).
   *
   * @param {Object} actor
   * @returns {string[]} Array of talent slugs
   */
  static getOwnedTalents(actor) {
    const talents = actor.items.filter(i => i.type === 'talent') || [];
    return talents.map(t => (t.system?.slug || t.name.toLowerCase().replace(/\s+/g, '-')));
  }

  /**
   * Get feat level if feat is repeatable (e.g., Weapon Focus III).
   *
   * @param {Object} actor
   * @param {string} slug - Feat slug
   * @returns {number} Level/rank, or -1 if not owned
   */
  static getFeatLevel(actor, slug) {
    return PrerequisiteChecker.getFeatLevel(actor, slug);
  }

  /**
   * === INTERNAL ===
   * Access to underlying authority
   */

  /**
   * Get reference to PrerequisiteChecker (for advanced queries).
   *
   * @internal
   * @returns {class}
   */
  static _getPrerequisiteChecker() {
    return PrerequisiteChecker;
  }
}
