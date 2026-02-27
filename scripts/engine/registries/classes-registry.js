/**
 * ClassesRegistry
 *
 * Canonical enumeration authority for all classes in the system.
 *
 * Wraps ClassesDB (the de facto in-memory registry) with a public API.
 *
 * Responsibilities:
 * - Provide unified read-only API for class enumeration
 * - Load class data from compendium at startup (via ClassesDB)
 * - Index and retrieve class metadata
 *
 * Does NOT:
 * - Evaluate prerequisites (AbilityEngine responsibility)
 * - Check legality (AbilityEngine responsibility)
 * - Apply mutations (ActorEngine responsibility)
 * - Compute progression values (derived calculators responsibility)
 *
 * Architecture:
 * - Pure enumeration layer over ClassesDB
 * - Single point of access for class metadata
 * - Compatible with AbilityEngine, ProgressionEngine, UI layers
 */

import { SWSELogger } from '../../utils/logger.js';
import { ClassesDB } from '../../data/classes-db.js';

/**
 * ClassesRegistry - Enumeration authority for classes
 *
 * This is a thin wrapper around ClassesDB, which is the authoritative
 * in-memory registry for all class data. This registry provides a public
 * read-only API for accessing class metadata.
 *
 * API:
 * - getAll() - Get all class definitions
 * - getById(id) - Get class by ID (internal ID, not name)
 * - getByName(name) - Get class by display name (case-insensitive)
 * - getBaseClasses() - Get only base classes (not prestige)
 * - getPrestigeClasses() - Get only prestige classes
 * - search(predicate) - Custom search
 * - hasName(name) - Check if class exists
 * - isInitialized() - Check if registry ready
 */
export class ClassesRegistry {
  /**
   * Initialize ClassesRegistry
   * ClassesDB is initialized externally during system ready hook.
   * This method exists for API consistency with other registries.
   */
  static async initialize() {
    if (!ClassesDB.initialized) {
      SWSELogger.warn('[ClassesRegistry] ClassesDB not initialized yet');
      return false;
    }

    SWSELogger.log(
      `[ClassesRegistry] Using ClassesDB: ${ClassesDB.count()} classes loaded`
    );
    return true;
  }

  /**
   * Get all class definitions
   * @returns {Object[]} Array of class definitions
   */
  static getAll() {
    return ClassesDB.getAll();
  }

  /**
   * Get class definition by internal ID
   * @param {string} id - Class internal ID (e.g., "jedi", "bounty-hunter")
   * @returns {Object|null} Class definition or null
   */
  static getById(id) {
    if (!id) {
      return null;
    }
    return ClassesDB.get(id) || null;
  }

  /**
   * Get class definition by display name (case-insensitive)
   * @param {string} name - Class display name (e.g., "Jedi", "Bounty Hunter")
   * @returns {Object|null} Class definition or null
   */
  static getByName(name) {
    if (!name) {
      return null;
    }

    // ClassesDB stores by ID, so we need to search by name
    const all = ClassesDB.getAll();
    return (
      all.find(c => c.name && c.name.toLowerCase() === name.toLowerCase()) ||
      null
    );
  }

  /**
   * Get all base classes (not prestige)
   * @returns {Object[]} Array of base class definitions
   */
  static getBaseClasses() {
    const all = ClassesDB.getAll();
    return all.filter(c => c.baseClass !== false);
  }

  /**
   * Get all prestige classes
   * @returns {Object[]} Array of prestige class definitions
   */
  static getPrestigeClasses() {
    const all = ClassesDB.getAll();
    return all.filter(c => c.baseClass === false);
  }

  /**
   * Search classes by custom predicate
   * @param {Function} predicate - Test function (entry) => boolean
   * @returns {Object[]} Array of matching class definitions
   */
  static search(predicate) {
    if (typeof predicate !== 'function') {
      return [];
    }
    const all = ClassesDB.getAll();
    return all.filter(predicate);
  }

  /**
   * Check if a class exists by name
   * @param {string} name - Class display name
   * @returns {boolean}
   */
  static hasName(name) {
    if (!name) {
      return false;
    }
    return this.getByName(name) !== null;
  }

  /**
   * Get count of all classes
   * @returns {number}
   */
  static count() {
    return ClassesDB.count();
  }

  /**
   * Check if registry is initialized
   * @returns {boolean}
   */
  static isInitialized() {
    return ClassesDB.initialized === true;
  }

  /**
   * Get the full compendium document for a class
   * Internal method - use to fetch actual class documents from compendium
   * @private
   * @param {string} classId - Class ID
   * @returns {Promise<*>} Full class document or null
   */
  static async _getDocument(classId) {
    if (!classId) {
      return null;
    }

    const systemId = game?.system?.id || 'foundryvtt-swse';
    const packKey = `${systemId}.classes`;
    const pack = game?.packs?.get(packKey);

    if (!pack) {
      return null;
    }

    try {
      return await pack.getDocument(classId);
    } catch (err) {
      SWSELogger.warn(
        `[ClassesRegistry] Failed to fetch document ${classId} from ${packKey}:`,
        err
      );
      return null;
    }
  }
}

SWSELogger.log('[ClassesRegistry] Module loaded');
