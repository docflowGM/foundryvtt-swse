/* ============================================================================
   UPDATE PIPELINE
   Central control for all actor data mutations
   Ensures consistency: UI action → validation → actor update → UI reflect
   ============================================================================ */

import { SWSELogger } from '../../utils/logger.js';

export class UpdatePipeline {
  /**
   * Apply a single update to an actor
   * @param {Actor} actor - The actor to update
   * @param {string} path - Dot-notation path (e.g., "system.skills.acrobatics.trained")
   * @param {*} value - The value to set
   * @returns {Promise<Actor>} - Updated actor
   */
  static async apply(actor, path, value) {
    if (!actor || !path) {
      throw new Error('[UpdatePipeline] Actor and path required');
    }

    const update = {};
    update[path] = value;

    try {
      await actor.update(update);
      SWSELogger.debug(`[UpdatePipeline] Updated ${path}`, value);
      return actor;
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to update ${path}:`, err);
      throw err;
    }
  }

  /**
   * Apply multiple updates in a single operation
   * @param {Actor} actor - The actor to update
   * @param {Object} updates - Object of path: value pairs
   * @returns {Promise<Actor>} - Updated actor
   */
  static async applyBatch(actor, updates) {
    if (!actor || !updates || typeof updates !== 'object') {
      throw new Error('[UpdatePipeline] Actor and updates object required');
    }

    try {
      await actor.update(updates);
      SWSELogger.debug('[UpdatePipeline] Batch update applied', Object.keys(updates));
      return actor;
    } catch (err) {
      SWSELogger.error('[UpdatePipeline] Batch update failed:', err);
      throw err;
    }
  }

  /**
   * Set a flag (actor-scoped setting)
   * @param {Actor} actor - The actor
   * @param {string} scope - Scope (usually "swse")
   * @param {string} key - Flag key
   * @param {*} value - Flag value
   * @returns {Promise<*>} - The set value
   */
  static async setFlag(actor, scope, key, value) {
    if (!actor || !scope || !key) {
      throw new Error('[UpdatePipeline] Actor, scope, and key required');
    }

    try {
      const result = await actor.setFlag(scope, key, value);
      SWSELogger.debug(`[UpdatePipeline] Set flag ${scope}.${key}`, value);
      return result;
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to set flag ${scope}.${key}:`, err);
      throw err;
    }
  }

  /**
   * Get a flag (actor-scoped setting)
   * @param {Actor} actor - The actor
   * @param {string} scope - Scope (usually "swse")
   * @param {string} key - Flag key
   * @returns {*} - The flag value
   */
  static getFlag(actor, scope, key) {
    if (!actor) {
      throw new Error('[UpdatePipeline] Actor required');
    }

    try {
      return actor.getFlag(scope, key);
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to get flag ${scope}.${key}:`, err);
      return null;
    }
  }

  /**
   * Array operation: add item to array
   * @param {Actor} actor - The actor
   * @param {string} path - Path to array (e.g., "system.feats")
   * @param {*} item - Item to add
   * @returns {Promise<Actor>} - Updated actor
   */
  static async addToArray(actor, path, item) {
    if (!actor || !path) {
      throw new Error('[UpdatePipeline] Actor and path required');
    }

    try {
      const array = this._getNestedValue(actor, path) || [];
      if (!Array.isArray(array)) {
        throw new Error(`[UpdatePipeline] Path ${path} is not an array`);
      }

      const updated = [...array, item];
      return this.apply(actor, path, updated);
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to add to array ${path}:`, err);
      throw err;
    }
  }

  /**
   * Array operation: remove item from array
   * @param {Actor} actor - The actor
   * @param {string} path - Path to array
   * @param {Function} predicate - Predicate to match items to remove
   * @returns {Promise<Actor>} - Updated actor
   */
  static async removeFromArray(actor, path, predicate) {
    if (!actor || !path || typeof predicate !== 'function') {
      throw new Error('[UpdatePipeline] Actor, path, and predicate required');
    }

    try {
      const array = this._getNestedValue(actor, path) || [];
      if (!Array.isArray(array)) {
        throw new Error(`[UpdatePipeline] Path ${path} is not an array`);
      }

      const updated = array.filter(item => !predicate(item));
      return this.apply(actor, path, updated);
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to remove from array ${path}:`, err);
      throw err;
    }
  }

  /**
   * Boolean toggle operation
   * @param {Actor} actor - The actor
   * @param {string} path - Path to boolean value
   * @returns {Promise<Actor>} - Updated actor
   */
  static async toggle(actor, path) {
    if (!actor || !path) {
      throw new Error('[UpdatePipeline] Actor and path required');
    }

    try {
      const current = this._getNestedValue(actor, path);
      return this.apply(actor, path, !current);
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to toggle ${path}:`, err);
      throw err;
    }
  }

  /**
   * Increment numeric value
   * @param {Actor} actor - The actor
   * @param {string} path - Path to numeric value
   * @param {number} amount - Amount to add (default 1)
   * @returns {Promise<Actor>} - Updated actor
   */
  static async increment(actor, path, amount = 1) {
    if (!actor || !path) {
      throw new Error('[UpdatePipeline] Actor and path required');
    }

    try {
      const current = Number(this._getNestedValue(actor, path)) || 0;
      return this.apply(actor, path, current + amount);
    } catch (err) {
      SWSELogger.error(`[UpdatePipeline] Failed to increment ${path}:`, err);
      throw err;
    }
  }

  /**
   * Get nested value using dot notation
   * @private
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot notation path
   * @returns {*} - The value at path
   */
  static _getNestedValue(obj, path) {
    return path.split('.').reduce((current, part) => {
      return current?.[part];
    }, obj);
  }

  /**
   * Get nested value and set default if missing
   * @private
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot notation path
   * @param {*} defaultValue - Default if missing
   * @returns {*} - The value at path or default
   */
  static _getNestedValueWithDefault(obj, path, defaultValue) {
    const val = this._getNestedValue(obj, path);
    return val !== undefined ? val : defaultValue;
  }
}
