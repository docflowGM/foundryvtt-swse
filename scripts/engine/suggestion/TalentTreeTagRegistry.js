/**
 * TalentTreeTagRegistry - Phase 2F: Tag Inheritance
 *
 * Loads and caches talent tree metadata (tags, names, descriptors) at boot time.
 * Serves as the single source of truth (SSOT) for tree-level tag associations.
 *
 * Design:
 * - Boot-time loading: No runtime parsing, pure lookup
 * - UUID-keyed: Matches talent item UUID structure
 * - Fallback to name-based lookup: For backward compatibility
 * - Minimal footprint: ~10KB for full system
 *
 * Usage:
 *   const treeMeta = TalentTreeTagRegistry.getByTreeId(treeUuid);
 *   // => { tags: [...], name: "Lightsaber Combat", descriptor: "..." }
 *
 *   const treeMeta = TalentTreeTagRegistry.getByTreeName("Lightsaber Combat");
 *   // => same structure
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TalentTreeTagRegistry {
  static #registry = new Map(); // treeId (UUID) → { tags, name, descriptor }
  static #nameIndex = new Map(); // treeName → treeId (reverse lookup)
  static initialized = false;

  /**
   * Initialize the registry at boot time
   * Loads metadata from generated JSON file
   * @returns {Promise<boolean>} True if successful
   */
  static async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      SWSELogger.log("[TalentTreeTagRegistry] Initializing...");

      // Load metadata from generated file
      const response = await fetch("systems/foundryvtt-swse/data/metadata/talent-tree-tags.json");
      if (!response.ok) {
        SWSELogger.warn("[TalentTreeTagRegistry] Metadata file not found, using fallback");
        return this._initializeFallback();
      }

      const metadata = await response.json();

      // Index by tree ID (UUID)
      if (metadata.treeMetadata && typeof metadata.treeMetadata === "object") {
        for (const [treeId, treeMeta] of Object.entries(metadata.treeMetadata)) {
          this.#registry.set(treeId, treeMeta);

          // Build reverse index by name
          if (treeMeta.name) {
            this.#nameIndex.set(treeMeta.name, treeId);
          }
        }

        SWSELogger.log(
          `[TalentTreeTagRegistry] Loaded ${this.#registry.size} tree metadata entries`
        );
      }

      this.initialized = true;
      return true;
    } catch (err) {
      SWSELogger.warn("[TalentTreeTagRegistry] Failed to load metadata, using fallback:", err);
      return this._initializeFallback();
    }
  }

  /**
   * Initialize with fallback hardcoded mapping (if JSON not available)
   * @private
   */
  static _initializeFallback() {
    // Placeholder fallback data - extend as needed
    const fallbackTrees = {
      "lightsaber-combat": {
        name: "Lightsaber Combat",
        tags: ["lightsaber", "melee", "accuracy", "damage", "defense"],
        descriptor: "Core lightsaber mastery"
      },
      "armor-specialist": {
        name: "Armor Specialist",
        tags: ["armor", "defender", "durability", "defense"],
        descriptor: "Armor and defense mastery"
      },
      "force-control": {
        name: "Force Control",
        tags: ["force", "control", "utility", "mind"],
        descriptor: "Force control and precision"
      }
    };

    for (const [treeId, treeMeta] of Object.entries(fallbackTrees)) {
      this.#registry.set(treeId, treeMeta);
      if (treeMeta.name) {
        this.#nameIndex.set(treeMeta.name, treeId);
      }
    }

    SWSELogger.log(`[TalentTreeTagRegistry] Initialized with ${this.#registry.size} fallback trees`);
    this.initialized = true;
    return true;
  }

  /**
   * Get tree metadata by UUID
   * @param {string} treeId - Tree UUID
   * @returns {Object|null} { tags: [...], name: "...", descriptor: "..." } or null
   */
  static getByTreeId(treeId) {
    if (!treeId) return null;
    return this.#registry.get(treeId) || null;
  }

  /**
   * Get tree metadata by name (case-insensitive)
   * @param {string} treeName - Human-readable tree name
   * @returns {Object|null} Metadata object or null
   */
  static getByTreeName(treeName) {
    if (!treeName) return null;

    // Exact match first
    const treeId = this.#nameIndex.get(treeName);
    if (treeId) {
      return this.#registry.get(treeId);
    }

    // Case-insensitive fallback
    const normalizedName = String(treeName).toLowerCase().trim();
    for (const [name, id] of this.#nameIndex.entries()) {
      if (String(name).toLowerCase().trim() === normalizedName) {
        return this.#registry.get(id);
      }
    }

    return null;
  }

  /**
   * Get all registered trees
   * @returns {Array} Array of { treeId, ...metadata } objects
   */
  static getAllTrees() {
    const result = [];
    for (const [treeId, meta] of this.#registry.entries()) {
      result.push({ treeId, ...meta });
    }
    return result;
  }

  /**
   * Get tags for a tree (the primary use case)
   * @param {string} treeId - Tree UUID
   * @returns {Array<string>} Array of tags or empty array
   */
  static getTreeTags(treeId) {
    const meta = this.getByTreeId(treeId);
    return meta?.tags || [];
  }

  /**
   * Check if a tree is registered
   * @param {string} treeId - Tree UUID
   * @returns {boolean}
   */
  static hasTree(treeId) {
    return this.#registry.has(treeId);
  }

  /**
   * Manual registration (useful for testing or runtime updates)
   * @param {string} treeId - Tree UUID
   * @param {Object} metadata - { tags: [...], name: "...", descriptor: "..." }
   */
  static register(treeId, metadata) {
    this.#registry.set(treeId, metadata);
    if (metadata.name) {
      this.#nameIndex.set(metadata.name, treeId);
    }
    SWSELogger.log(`[TalentTreeTagRegistry] Registered tree: ${metadata.name}`);
  }

  /**
   * Clear registry (mainly for testing)
   */
  static clear() {
    this.#registry.clear();
    this.#nameIndex.clear();
    this.initialized = false;
  }
}

export default TalentTreeTagRegistry;
