/**
 * ForceRegistry
 *
 * Canonical enumeration authority for all Force-related items in the system.
 *
 * Covers three force domains:
 * - Force Powers (combat abilities)
 * - Force Techniques (advanced methods)
 * - Force Secrets (restricted knowledge)
 *
 * Responsibilities:
 * - Load all force domains from compendiums at startup
 * - Normalize force data into stable schema
 * - Index by id, name, type, tags
 * - Provide clean read-only API
 *
 * Does NOT:
 * - Evaluate prerequisites (AbilityEngine responsibility)
 * - Check legality (AbilityEngine responsibility)
 * - Filter by actor state
 * - Perform selection logic
 * - Contain UI code
 *
 * Architecture:
 * - Single registry handles all three force domains via type field
 * - Pure enumeration, no rule logic
 * - Acts as SSOT for force item inventory
 * - Compatible with AbilityEngine, SuggestionEngine, UI layers
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Internal normalized force entry
 * @typedef {Object} ForceRegistryEntry
 * @property {string} id - Stable identifier (usually _id from compendium)
 * @property {string} uuid - Compendium UUID
 * @property {string} name - Human-readable name
 * @property {string} type - Type: "power", "technique", or "secret"
 * @property {string|null} category - Force category (universal, jedi, sith, etc.)
 * @property {string[]} tags - Normalized tags array
 * @property {Object} prerequisites - Prerequisite metadata (NOT evaluated)
 * @property {*} prerequisites.raw - Raw prerequisite data from compendium
 * @property {string} [description] - Short description
 * @property {string} [source] - Content source (book, UA, etc.)
 * @property {string} pack - Compendium pack origin
 */

export class ForceRegistry {
  // Static state - all methods are class methods
  static _initialized = false;
  static _entries = [];                    // Flat array of all entries
  static _byId = new Map();                // id -> entry
  static _byName = new Map();              // lowercase name -> entry
  static _byType = new Map();              // type -> entry[]
  static _byCategory = new Map();          // category -> entry[]
  static _byTag = new Map();               // tag -> entry[]

  /**
   * Initialize ForceRegistry from compendiums
   * Call once during system ready hook
   */
  static async initialize() {
    if (this._initialized) {
      SWSELogger.log('[ForceRegistry] Already initialized, skipping');
      return;
    }

    try {
      const startTime = performance.now();
      await this._loadFromCompendiums();
      const duration = (performance.now() - startTime).toFixed(2);

      this._initialized = true;
      const countByType = {};
      for (const entry of this._entries) {
        countByType[entry.type] = (countByType[entry.type] || 0) + 1;
      }

      SWSELogger.log(
        `[ForceRegistry] Initialized: ${this._entries.length} items ` +
        `(${countByType.power || 0} powers, ${countByType.technique || 0} techniques, ` +
        `${countByType.secret || 0} secrets) (${duration}ms)`
      );
    } catch (err) {
      SWSELogger.error('[ForceRegistry] Initialization failed:', err);
      this._initialized = false;
      throw err;
    }
  }

  /**
   * Load all force domains from compendiums and normalize
   * @private
   */
  static async _loadFromCompendiums() {
    const systemId = game?.system?.id || 'foundryvtt-swse';

    // Define all force domain packs
    const packs = [
      { key: `${systemId}.forcepowers`, type: 'power' },
      { key: `${systemId}.forcetechniques`, type: 'technique' },
      { key: `${systemId}.forcesecrets`, type: 'secret' }
    ];

    for (const { key, type } of packs) {
      await this._loadFromPack(key, type);
    }
  }

  /**
   * Load a single force compendium pack
   * @private
   * @param {string} packKey - Compendium pack key
   * @param {string} type - Force item type (power, technique, secret)
   */
  static async _loadFromPack(packKey, type) {
    const pack = game?.packs?.get(packKey);
    if (!pack) {
      SWSELogger.warn(
        `[ForceRegistry] Compendium pack "${packKey}" not found. Skipping.`
      );
      return;
    }

    try {
      const docs = await pack.getDocuments();

      for (const doc of docs) {
        if (!doc || !doc.name) {
          continue;
        }

        const entry = this._normalizeEntry(doc, type);
        this._entries.push(entry);

        // Index by id
        this._byId.set(entry.id, entry);

        // Index by name (lowercase for case-insensitive lookup)
        this._byName.set(entry.name.toLowerCase(), entry);

        // Index by type
        if (!this._byType.has(type)) {
          this._byType.set(type, []);
        }
        this._byType.get(type).push(entry);

        // Index by category
        if (entry.category) {
          if (!this._byCategory.has(entry.category)) {
            this._byCategory.set(entry.category, []);
          }
          this._byCategory.get(entry.category).push(entry);
        }

        // Index by tags
        for (const tag of entry.tags) {
          if (!this._byTag.has(tag)) {
            this._byTag.set(tag, []);
          }
          this._byTag.get(tag).push(entry);
        }
      }
    } catch (err) {
      SWSELogger.error(`[ForceRegistry] Failed to load from pack "${packKey}":`, err);
      throw err;
    }
  }

  /**
   * Normalize a compendium force document into registry entry
   * @private
   * @param {*} doc - Compendium document
   * @param {string} type - Force item type (power, technique, secret)
   * @returns {ForceRegistryEntry}
   */
  static _normalizeEntry(doc, type) {
    const system = doc.system || {};

    // Extract and normalize category
    let category = system.category || system.forceCategory || null;
    if (category) {
      category = String(category).toLowerCase().trim() || null;
    }

    // Extract and normalize tags (ensure always array)
    let tags = system.tags || [];
    if (!Array.isArray(tags)) {
      tags = [];
    }
    tags = tags.map(t => String(t).toLowerCase().trim()).filter(t => t);

    // Normalize prerequisite block
    const prerequisites = {
      raw: system.prerequisites || null
    };

    // Create normalized entry
    return {
      id: doc._id,
      uuid: doc.uuid || null,
      name: doc.name,
      type: type, // power, technique, or secret
      category: category,
      tags: tags,
      prerequisites: prerequisites,
      description: system.description?.value || system.description || '',
      source: system.source || null,
      pack: doc.pack || 'unknown'
    };
  }

  /**
   * Get all force entries
   * @returns {ForceRegistryEntry[]}
   */
  static getAll() {
    return [...this._entries];
  }

  /**
   * Get force entry by ID
   * @param {string} id - Force item ID (usually compendium _id)
   * @returns {ForceRegistryEntry|null}
   */
  static getById(id) {
    if (!id) {
      return null;
    }
    return this._byId.get(id) || null;
  }

  /**
   * Get force entry by name (case-insensitive)
   * @param {string} name - Force item name
   * @returns {ForceRegistryEntry|null}
   */
  static getByName(name) {
    if (!name) {
      return null;
    }
    return this._byName.get(String(name).toLowerCase()) || null;
  }

  /**
   * Get all force entries of a specific type
   * @param {string} type - Type: "power", "technique", or "secret"
   * @returns {ForceRegistryEntry[]}
   */
  static getByType(type) {
    if (!type) {
      return [];
    }
    const normalized = String(type).toLowerCase().trim();
    return [...(this._byType.get(normalized) || [])];
  }

  /**
   * Get all force entries in a category
   * @param {string} category - Category (e.g., "universal", "jedi", "sith")
   * @returns {ForceRegistryEntry[]}
   */
  static getByCategory(category) {
    if (!category) {
      return [];
    }
    const normalized = String(category).toLowerCase().trim();
    return [...(this._byCategory.get(normalized) || [])];
  }

  /**
   * Get all force entries with a specific tag
   * @param {string} tag - Tag name
   * @returns {ForceRegistryEntry[]}
   */
  static getByTag(tag) {
    if (!tag) {
      return [];
    }
    const normalized = String(tag).toLowerCase().trim();
    return [...(this._byTag.get(normalized) || [])];
  }

  /**
   * Search force entries by custom predicate
   * @param {Function} predicate - Test function (entry) => boolean
   * @returns {ForceRegistryEntry[]}
   */
  static search(predicate) {
    if (typeof predicate !== 'function') {
      return [];
    }
    return this._entries.filter(predicate);
  }

  /**
   * Check if a force entry exists by ID
   * @param {string} id - Force item ID
   * @returns {boolean}
   */
  static hasId(id) {
    return this._byId.has(id);
  }

  /**
   * Check if a force entry exists by name
   * @param {string} name - Force item name
   * @returns {boolean}
   */
  static hasName(name) {
    if (!name) {
      return false;
    }
    return this._byName.has(String(name).toLowerCase());
  }

  /**
   * Get count of all registered force entries
   * @returns {number}
   */
  static count() {
    return this._entries.length;
  }

  /**
   * Get count by type
   * @returns {Object} { power, technique, secret }
   */
  static countByType() {
    const counts = { power: 0, technique: 0, secret: 0 };
    for (const entry of this._entries) {
      if (entry.type in counts) {
        counts[entry.type]++;
      }
    }
    return counts;
  }

  /**
   * Get all unique categories
   * @returns {string[]}
   */
  static getCategories() {
    return Array.from(this._byCategory.keys()).sort();
  }

  /**
   * Get all unique tags
   * @returns {string[]}
   */
  static getTags() {
    return Array.from(this._byTag.keys()).sort();
  }

  /**
   * Get all unique types
   * @returns {string[]}
   */
  static getTypes() {
    return Array.from(this._byType.keys()).sort();
  }

  /**
   * Check if registry is initialized
   * @returns {boolean}
   */
  static isInitialized() {
    return this._initialized;
  }

  /**
   * Get the full compendium document for a force entry (for mutations/applications)
   * Internal method - use to fetch actual item documents from compendium
   * @private
   * @param {string} id - Force item ID
   * @returns {Promise<*>} Full item document or null
   */
  static async _getDocument(id) {
    if (!id) {
      return null;
    }

    const entry = this._byId.get(id);
    if (!entry) {
      return null;
    }

    // Determine which pack this entry came from
    const packMap = {
      'power': 'forcepowers',
      'technique': 'forcetechniques',
      'secret': 'forcesecrets'
    };

    const packSuffix = packMap[entry.type];
    if (!packSuffix) {
      return null;
    }

    const systemId = game?.system?.id || 'foundryvtt-swse';
    const packKey = `${systemId}.${packSuffix}`;
    const pack = game?.packs?.get(packKey);

    if (!pack) {
      return null;
    }

    try {
      return await pack.getDocument(id);
    } catch (err) {
      SWSELogger.warn(`[ForceRegistry] Failed to fetch document ${id} from ${packKey}:`, err);
      return null;
    }
  }
}

SWSELogger.log('[ForceRegistry] Module loaded');
