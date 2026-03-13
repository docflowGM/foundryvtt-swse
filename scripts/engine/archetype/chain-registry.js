/**
 * ChainRegistry — Feat/Talent Chain DAG Validator
 *
 * Builds a directed acyclic graph of feat/talent chains at boot time.
 * Enables O(1) chain validation and tier-weighted continuation detection during scoring.
 *
 * Chains are defined by:
 * - system.chainTheme: string (e.g., "dualWield")
 * - system.chainTier: number (1..n)
 * - system.upgradeOf: string (canonical parent item ID)
 *
 * DAG validation ensures no circular dependencies.
 * Invalid chains are marked and logged; continuation bonuses disabled.
 *
 * No Foundry globals. Registry-based architecture.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ChainRegistry {
  /**
   * Internal state
   * @private
   */
  static #chainsByTheme = new Map();
  static #nodeIndex = new Map();
  static #initialized = false;

  /**
   * Initialize ChainRegistry from feat/talent registries
   *
   * @param {Map} featIndex - Map of all feats { id → feat }
   * @param {Map} talentIndex - Map of all talents { id → talent }
   * @returns {void}
   */
  static initialize(featIndex, talentIndex) {
    if (this.#initialized) {
      SWSELogger.log("[ChainRegistry] Already initialized, skipping");
      return;
    }

    try {
      this._buildChains(featIndex, talentIndex);
      this._validateDAG();
      this.#initialized = true;
      SWSELogger.log(
        `[ChainRegistry] Initialization complete. Themes: ${this.#chainsByTheme.size}`
      );
    } catch (err) {
      SWSELogger.error("[ChainRegistry] Initialization failed:", err);
      this.#initialized = false;
    }
  }

  /**
   * Build internal chain graph from feat/talent registries
   *
   * @private
   * @param {Map} featIndex
   * @param {Map} talentIndex
   */
  static _buildChains(featIndex, talentIndex) {
    const allItems = [];

    // Collect all feat items with chainTheme
    if (featIndex) {
      for (const feat of featIndex.values()) {
        if (feat.system?.chainTheme) {
          allItems.push({ ...feat, type: "feat" });
        }
      }
    }

    // Collect all talent items with chainTheme
    if (talentIndex) {
      for (const talent of talentIndex.values()) {
        if (talent.system?.chainTheme) {
          allItems.push({ ...talent, type: "talent" });
        }
      }
    }

    SWSELogger.log(`[ChainRegistry] Processing ${allItems.length} chained items`);

    // Build nodes and organize by theme
    for (const item of allItems) {
      const theme = item.system.chainTheme;
      const node = {
        id: item.id,
        type: item.type,
        tier: Math.max(1, item.system.chainTier || 1),
        parentId: item.system.upgradeOf || null,
        name: item.name
      };

      this.#nodeIndex.set(node.id, node);

      // Create theme graph if needed
      if (!this.#chainsByTheme.has(theme)) {
        this.#chainsByTheme.set(theme, {
          theme,
          nodes: new Map(),
          childrenByParent: new Map(),
          rootIds: new Set(),
          isValidDAG: true,
          errors: []
        });
      }

      const graph = this.#chainsByTheme.get(theme);
      graph.nodes.set(node.id, node);
    }

    // Build edges and identify roots
    for (const [theme, graph] of this.#chainsByTheme.entries()) {
      for (const node of graph.nodes.values()) {
        if (!node.parentId) {
          // This is a root node
          graph.rootIds.add(node.id);
          continue;
        }

        // Parent must exist in same theme
        const parent = graph.nodes.get(node.parentId);
        if (!parent) {
          graph.errors.push(
            `Missing parent ${node.parentId} for ${node.name} (${node.id}) in chain ${theme}`
          );
          graph.isValidDAG = false;
          continue;
        }

        // Add child edge
        if (!graph.childrenByParent.has(node.parentId)) {
          graph.childrenByParent.set(node.parentId, new Set());
        }
        graph.childrenByParent.get(node.parentId).add(node.id);
      }
    }
  }

  /**
   * Validate all chains are DAGs (no cycles)
   *
   * @private
   */
  static _validateDAG() {
    for (const [theme, graph] of this.#chainsByTheme.entries()) {
      if (!graph.isValidDAG) {
        continue; // Skip if already marked invalid
      }

      const visited = new Set();
      const stack = new Set();

      const hasCycleFrom = (nodeId) => {
        if (stack.has(nodeId)) {
          // Back edge = cycle
          return true;
        }
        if (visited.has(nodeId)) {
          // Already processed
          return false;
        }

        visited.add(nodeId);
        stack.add(nodeId);

        const children = graph.childrenByParent.get(nodeId) || new Set();
        for (const childId of children) {
          if (hasCycleFrom(childId)) {
            return true;
          }
        }

        stack.delete(nodeId);
        return false;
      };

      // Check each root for cycles
      for (const rootId of graph.rootIds) {
        if (hasCycleFrom(rootId)) {
          graph.isValidDAG = false;
          graph.errors.push(`Cycle detected in chain theme "${theme}"`);
          break;
        }
      }

      if (!graph.isValidDAG) {
        SWSELogger.error(
          `[ChainRegistry] Chain theme "${theme}" is invalid:`,
          graph.errors
        );
      }
    }
  }

  /**
   * Check if a chain theme is valid (DAG + no errors)
   *
   * @param {string} theme - Chain theme name
   * @returns {boolean}
   */
  static isValidTheme(theme) {
    const graph = this.#chainsByTheme.get(theme);
    return !!graph && graph.isValidDAG;
  }

  /**
   * Get a chain node by item ID
   *
   * @param {string} itemId - Canonical item ID
   * @returns {Object|null}
   */
  static getNode(itemId) {
    return this.#nodeIndex.get(itemId) || null;
  }

  /**
   * Get parent ID for a chained item
   *
   * @param {string} itemId
   * @returns {string|null}
   */
  static getParentId(itemId) {
    const node = this.#nodeIndex.get(itemId);
    return node?.parentId || null;
  }

  /**
   * Get tier for a chained item
   *
   * @param {string} itemId
   * @returns {number}
   */
  static getTier(itemId) {
    const node = this.#nodeIndex.get(itemId);
    return node?.tier || 1;
  }

  /**
   * Get all themes in registry
   *
   * @returns {Set<string>}
   */
  static getThemes() {
    return new Set(this.#chainsByTheme.keys());
  }

  /**
   * Get all nodes in a theme
   *
   * @param {string} theme
   * @returns {Map<string, Object>|null}
   */
  static getThemeNodes(theme) {
    const graph = this.#chainsByTheme.get(theme);
    return graph?.nodes || null;
  }

  /**
   * Reset registry (for testing)
   *
   * @private
   */
  static _reset() {
    this.#chainsByTheme.clear();
    this.#nodeIndex.clear();
    this.#initialized = false;
  }
}
