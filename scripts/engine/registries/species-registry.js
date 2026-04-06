/**
 * SpeciesRegistry
 *
 * Canonical enumeration authority for all species in the system.
 *
 * Responsibilities:
 * - Load species from compendium at startup
 * - Normalize species data into stable schema
 * - Index by id, name, category
 * - Provide clean read-only API
 * - Aggregate species with their abilities (for future item granting)
 *
 * Does NOT:
 * - Evaluate prerequisites (AbilityEngine responsibility)
 * - Check legality (AbilityEngine responsibility)
 * - Apply mutations (ActorEngine responsibility)
 * - Filter based on actor state
 * - Grant items (ActorEngine responsibility)
 *
 * Architecture:
 * - Pure enumeration, no rule logic
 * - Explicit structure for species abilities (prepared for item granting)
 * - Acts as SSOT for species inventory
 * - Compatible with AbilityEngine, ActorEngine, UI layers
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Internal normalized species entry
 * @typedef {Object} SpeciesRegistryEntry
 * @property {string} id - Stable identifier (usually _id from compendium)
 * @property {string} uuid - Compendium UUID
 * @property {string} name - Human-readable name
 * @property {string} type - Always "species"
 * @property {string|null} category - Species category (humanoid, droid, etc.)
 * @property {string[]} tags - Normalized tags array
 * @property {Object} abilityScores - Ability score modifiers
 * @property {number} abilityScores.str - STR modifier
 * @property {number} abilityScores.dex - DEX modifier
 * @property {number} abilityScores.con - CON modifier
 * @property {number} abilityScores.int - INT modifier
 * @property {number} abilityScores.wis - WIS modifier
 * @property {number} abilityScores.cha - CHA modifier
 * @property {number} speed - Base speed (in squares)
 * @property {string|null} size - Size category (Small, Medium, Large, etc.)
 * @property {string[]} abilities - Special ability names/descriptions
 * @property {string[]} languages - Known languages
 * @property {string} [description] - Short description
 * @property {string} [source] - Content source (book, UA, etc.)
 * @property {string} pack - Compendium pack origin
 */

export class SpeciesRegistry {
  // Static state - all methods are class methods
  static _initialized = false;
  static _entries = [];                    // Flat array of all entries
  static _byId = new Map();                // id -> entry
  static _byName = new Map();              // lowercase name -> entry
  static _byCategory = new Map();          // category -> entry[]
  static _normalizeCount = 0;              // Counter for diagnostic logging

  /**
   * Initialize SpeciesRegistry from compendium
   * Call once during system ready hook
   */
  static async initialize() {
    if (this._initialized) {
      SWSELogger.log('[SpeciesRegistry] Already initialized: ' + this._entries.length + ' species cached');
      return;
    }

    try {
      const startTime = performance.now();
      SWSELogger.log('[SpeciesRegistry] initialize() called, starting load...');
      await this._loadFromCompendium();
      const duration = (performance.now() - startTime).toFixed(2);

      this._initialized = true;
      SWSELogger.log(
        `[SpeciesRegistry] ✓ Initialized: ${this._entries.length} species loaded (${duration}ms)`
      );
    } catch (err) {
      SWSELogger.error('[SpeciesRegistry] Initialization failed:', err);
      this._initialized = false;
      throw err;
    }
  }

  /**
   * Load all species from compendium and normalize
   * @private
   */
  static async _loadFromCompendium() {
    const systemId = game?.system?.id || 'foundryvtt-swse';
    const packKey = `${systemId}.species`;
    SWSELogger.log(`[SpeciesRegistry] _loadFromCompendium() STARTING. Using pack key: "${packKey}"`);

    const pack = game?.packs?.get(packKey);
    if (!pack) {
      SWSELogger.error(
        `[SpeciesRegistry] ✗ Compendium pack "${packKey}" NOT FOUND. Registry will be empty.`
      );
      return;
    }
    SWSELogger.log(`[SpeciesRegistry] ✓ Pack found: "${packKey}"`);

    try {
      const docs = await pack.getDocuments();
      SWSELogger.log(`[SpeciesRegistry] Loaded ${docs.length} raw documents from compendium. Starting normalization...`);

      let normalized = 0;
      let nullIdCount = 0;
      for (const doc of docs) {
        if (!doc || !doc.name) {
          continue;
        }

        const entry = this._normalizeEntry(doc);
        this._entries.push(entry);
        normalized++;
        if (!entry.id) {
          nullIdCount++;
        }

        // Index by id - only if we have a valid id
        if (entry.id) {
          this._byId.set(entry.id, entry);
        } else {
          SWSELogger.warn('[SpeciesRegistry] Skipping _byId index for species with missing id', {
            name: entry.name,
            uuid: entry.uuid ?? null
          });
        }

        // Index by name (lowercase for case-insensitive lookup)
        this._byName.set(entry.name.toLowerCase(), entry);

        // Index by category
        if (entry.category) {
          if (!this._byCategory.has(entry.category)) {
            this._byCategory.set(entry.category, []);
          }
          this._byCategory.get(entry.category).push(entry);
        }
      }
      SWSELogger.log(`[SpeciesRegistry] ✓ Normalized ${normalized} species entries (${nullIdCount} have NULL id)`);
    } catch (err) {
      SWSELogger.error(`[SpeciesRegistry] Failed to load from pack "${packKey}":`, err);
      throw err;
    }
  }

  /**
   * Parse ability string supporting both formats:
   * - "STR +2, DEX -1, CON +3" (ability name first)
   * - "+2 Con, -2 Dex" (value first)
   * @private
   * @param {string} abilityString - Ability modifier string
   * @returns {Object} { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
   */
  static _parseAbilityString(abilityString) {
    const defaults = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    if (!abilityString || abilityString.toLowerCase() === 'none') {
      return defaults;
    }

    const abilityMap = {
      'str': 'str', 'strength': 'str',
      'dex': 'dex', 'dexterity': 'dex',
      'con': 'con', 'constitution': 'con',
      'int': 'int', 'intelligence': 'int',
      'wis': 'wis', 'wisdom': 'wis',
      'cha': 'cha', 'charisma': 'cha'
    };

    try {
      const parts = abilityString.split(',');
      for (const part of parts) {
        const trimmed = part.trim();

        // Try format 1: "STR +2" or "Strength -1" (ability name first)
        let match = trimmed.match(/^([A-Za-z]+)\s*([+-]?\d+)$/);
        if (match) {
          const abilityName = match[1].toLowerCase();
          const bonus = parseInt(match[2], 10);
          const key = abilityMap[abilityName];
          if (key) {
            defaults[key] = bonus;
          }
          continue;
        }

        // Try format 2: "+2 Con" or "-1 Dex" (value first)
        match = trimmed.match(/^([+-]?\d+)\s*([A-Za-z]+)$/);
        if (match) {
          const bonus = parseInt(match[1], 10);
          const abilityName = match[2].toLowerCase();
          const key = abilityMap[abilityName];
          if (key) {
            defaults[key] = bonus;
          }
          continue;
        }
      }
    } catch (err) {
      SWSELogger.warn(`[SpeciesRegistry] Failed to parse ability string: "${abilityString}"`, err);
    }

    return defaults;
  }

  /**
   * Normalize a compendium species document into registry entry
   * @private
   * @param {*} doc - Compendium document
   * @returns {SpeciesRegistryEntry}
   */
  static _normalizeEntry(doc) {
    // DIAGNOSTICS: Log document structure for first few species to understand ID location
    this._normalizeCount = (this._normalizeCount ?? 0) + 1;
    if (this._normalizeCount <= 3) {
      SWSELogger.log('[SpeciesRegistry._normalizeEntry] DEBUG (count=' + this._normalizeCount + ') - Document structure:', {
        name: doc.name,
        docKeys: Object.keys(doc ?? {}).sort(),
        hasId: !!doc.id,
        has_Id: !!doc._id,
        has_uuid: !!doc.uuid,
        docType: doc.constructor?.name,
        // Actual values from each potential ID location
        'doc.id': doc.id,
        'doc._id': doc._id,
        'doc._source._id': doc._source?._id,
        'doc.toObject()._id': doc.toObject?.()._id,
        'doc.uuid': doc.uuid,
      });
    }

    const system = doc.system || {};

    // Extract and normalize category
    let category = system.category || null;
    if (category) {
      category = String(category).toLowerCase().trim() || null;
    }

    // Extract and normalize tags (ensure always array)
    let tags = system.tags || [];
    if (!Array.isArray(tags)) {
      tags = [];
    }
    tags = tags.map(t => String(t).toLowerCase().trim()).filter(t => t);

    // Extract ability score modifiers
    // Pack data stored in system.abilities (string format like "+2 Wis, -2 Cha")
    // Fall back to system.abilityMods for alternative data sources
    const defaults = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const rawAbilityData = system.abilities ?? system.abilityMods ?? null;

    let abilityScores = defaults;
    if (typeof rawAbilityData === 'string') {
      // Parse string format: "+2 Con, -2 Dex" or "STR +2, DEX -1"
      abilityScores = this._parseAbilityString(rawAbilityData);
    } else if (rawAbilityData && typeof rawAbilityData === 'object') {
      // Merge object format: { str: 2, con: -2, ... }
      abilityScores = { ...defaults, ...rawAbilityData };
    }

    // Extract speed (default to 6 if not specified)
    const speed = system.speed ? Number(system.speed) : 6;

    // Extract size
    const size = system.size ? String(system.size).trim() : null;

    // Extract special abilities (ensure always array)
    let abilities = system.special || [];
    if (!Array.isArray(abilities)) {
      abilities = abilities ? [abilities] : [];
    }
    abilities = abilities
      .map(a => String(a).trim())
      .filter(a => a && a.toLowerCase() !== 'none');

    // Extract languages
    let languages = system.languages || [];
    if (!Array.isArray(languages)) {
      languages = languages ? [languages] : [];
    }
    languages = languages
      .map(l => String(l).trim())
      .filter(l => l);

    // Extract stable ID with comprehensive fallback chain
    // Handles different compendium document structures in Foundry
    let stableId =
      doc.id ??
      doc._id ??
      doc._source?._id ??
      doc.uuid ??
      doc.toObject?.()._id ??
      null;

    // If we still don't have an ID, generate one deterministically from the species name
    // This ensures consistent IDs across sessions for the same species
    if (!stableId && doc.name) {
      // Use Foundry's slugify to create a URL-safe ID from the species name
      const slugified = foundry.utils?.slugify?.(doc.name) ??
                       doc.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      stableId = slugified;
      SWSELogger.log('[SpeciesRegistry] Generated deterministic id for "' + doc.name + '": ' + stableId);
    }

    if (!stableId) {
      SWSELogger.warn('[SpeciesRegistry] Species normalized without stable id', {
        name: doc.name,
        uuid: doc.uuid ?? null,
        docId: doc.id ?? null,
        doc_Id: doc._id ?? null,
        sourceId: doc._source?._id ?? null,
        pack: doc.pack ?? null,
        keys: Object.keys(doc ?? {}).slice(0, 20)
      });
    }

    // Log result for first few species
    if (this._normalizeCount <= 3) {
      SWSELogger.log('[SpeciesRegistry._normalizeEntry] Created entry for "' + doc.name + '" with id=' + (stableId || 'NULL'));
    }

    // Create normalized entry
    return {
      id: stableId,
      uuid: doc.uuid || null,
      name: doc.name,
      type: 'species',
      category: category,
      tags: tags,
      abilityScores: abilityScores,
      speed: speed,
      size: size,
      abilities: abilities,
      languages: languages,
      description: system.description?.value || system.description || '',
      source: system.source || null,
      pack: doc.pack || 'unknown'
    };
  }

  /**
   * Get all species entries
   * @returns {SpeciesRegistryEntry[]}
   */
  static getAll() {
    return [...this._entries];
  }

  /**
   * Get species entry by ID
   * @param {string} id - Species ID (usually compendium _id)
   * @returns {SpeciesRegistryEntry|null}
   */
  static getById(id) {
    if (!id) {
      return null;
    }
    return this._byId.get(id) || null;
  }

  /**
   * Get species entry by name (case-insensitive)
   * @param {string} name - Species name
   * @returns {SpeciesRegistryEntry|null}
   */
  static getByName(name) {
    if (!name) {
      return null;
    }
    return this._byName.get(String(name).toLowerCase()) || null;
  }

  /**
   * Get all species in a category
   * @param {string} category - Category (e.g., "humanoid", "droid")
   * @returns {SpeciesRegistryEntry[]}
   */
  static getByCategory(category) {
    if (!category) {
      return [];
    }
    const normalized = String(category).toLowerCase().trim();
    return [...(this._byCategory.get(normalized) || [])];
  }

  /**
   * Search species by custom predicate
   * @param {Function} predicate - Test function (entry) => boolean
   * @returns {SpeciesRegistryEntry[]}
   */
  static search(predicate) {
    if (typeof predicate !== 'function') {
      return [];
    }
    return this._entries.filter(predicate);
  }

  /**
   * Check if a species exists by ID
   * @param {string} id - Species ID
   * @returns {boolean}
   */
  static hasId(id) {
    return this._byId.has(id);
  }

  /**
   * Check if a species exists by name
   * @param {string} name - Species name
   * @returns {boolean}
   */
  static hasName(name) {
    if (!name) {
      return false;
    }
    return this._byName.has(String(name).toLowerCase());
  }

  /**
   * Get count of registered species
   * @returns {number}
   */
  static count() {
    return this._entries.length;
  }

  /**
   * Get all unique categories
   * @returns {string[]}
   */
  static getCategories() {
    return Array.from(this._byCategory.keys()).sort();
  }

  /**
   * Check if registry is initialized
   * @returns {boolean}
   */
  static isInitialized() {
    return this._initialized;
  }

  /**
   * Get the full compendium document for a species (for mutations/applications)
   * Internal method - use to fetch actual species documents from compendium
   * @private
   * @param {string} id - Species ID
   * @returns {Promise<*>} Full species document or null
   */
  static async _getDocument(id) {
    if (!id) {
      return null;
    }

    const entry = this._byId.get(id);
    if (!entry) {
      return null;
    }

    const systemId = game?.system?.id || 'foundryvtt-swse';
    const packKey = `${systemId}.species`;
    const pack = game?.packs?.get(packKey);

    if (!pack) {
      return null;
    }

    try {
      return await pack.getDocument(id);
    } catch (err) {
      SWSELogger.warn(`[SpeciesRegistry] Failed to fetch document ${id} from ${packKey}:`, err);
      return null;
    }
  }
}

SWSELogger.log('[SpeciesRegistry] Module loaded');
