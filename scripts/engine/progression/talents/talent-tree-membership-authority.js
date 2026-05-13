/**
 * Talent Tree Membership Authority
 *
 * Deterministic source of truth for talent tree membership.
 * Loads from generated/fixes registry instead of relying on stale packs/talent_trees.db.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';

let cachedRegistry = null;
let registryLoadPromise = null;

/**
 * Normalize a talent name for matching
 */
function normalizeTalentName(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim();
}

/**
 * Load the talent tree membership registry from data files
 */
async function loadRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  if (registryLoadPromise) {
    return registryLoadPromise;
  }

  registryLoadPromise = (async () => {
    try {
      // Try generated registry first
      let data = null;
      try {
        const response = await fetch('/systems/foundryvtt-swse/data/generated/talent-trees.registry.json');
        if (response.ok) {
          data = await response.json();
          SWSELogger.debug('[TalentTreeMembershipAuthority] Loaded generated talent-trees.registry.json');
        }
      } catch (err) {
        SWSELogger.warn(`[TalentTreeMembershipAuthority] Failed to load generated registry: ${err.message}`);
      }

      // Fall back to fixes registry if needed
      if (!data) {
        try {
          const response = await fetch('/systems/foundryvtt-swse/data/fixes/talent-trees.registry.json');
          if (response.ok) {
            data = await response.json();
            SWSELogger.debug('[TalentTreeMembershipAuthority] Loaded fixes talent-trees.registry.json (fallback)');
          }
        } catch (err) {
          SWSELogger.warn(`[TalentTreeMembershipAuthority] Failed to load fixes registry: ${err.message}`);
        }
      }

      // Convert array to map keyed by tree id
      if (Array.isArray(data)) {
        cachedRegistry = new Map();
        for (const tree of data) {
          if (tree.id && Array.isArray(tree.talents)) {
            cachedRegistry.set(tree.id, tree);
          }
        }
        SWSELogger.debug(
          `[TalentTreeMembershipAuthority] Registry loaded: ${cachedRegistry.size} trees`
        );
      } else {
        cachedRegistry = new Map();
        SWSELogger.warn('[TalentTreeMembershipAuthority] Registry data is not an array');
      }

      return cachedRegistry;
    } catch (err) {
      SWSELogger.error(`[TalentTreeMembershipAuthority] Failed to load registry: ${err.message}`);
      cachedRegistry = new Map();
      return cachedRegistry;
    } finally {
      registryLoadPromise = null;
    }
  })();

  return registryLoadPromise;
}

/**
 * Get corrected talent membership for a tree
 *
 * @param {Object} tree - Talent tree object with id and name
 * @returns {Promise<Array>} Array of talent objects in the correct order
 */
export async function getTalentMembership(tree) {
  if (!tree) {
    return [];
  }

  // Ensure TalentRegistry is initialized
  if (!TalentRegistry.isInitialized?.()) {
    await TalentRegistry.initialize?.();
  }

  // Load the registry
  const registry = await loadRegistry();
  const treeEntry = registry.get(tree.id);

  if (!treeEntry || !Array.isArray(treeEntry.talents)) {
    SWSELogger.debug(
      `[TalentTreeMembershipAuthority] No registry entry for tree "${tree.name}" (${tree.id})`
    );
    return [];
  }

  const resolvedTalents = [];
  const missingNames = [];
  const seenIds = new Set();

  // Resolve each talent name through TalentRegistry
  for (const talentName of treeEntry.talents) {
    const talent = TalentRegistry.getByName?.(talentName);

    if (talent) {
      const talentId = talent.id || talent._id;
      // De-dupe by talent id
      if (talentId && !seenIds.has(talentId)) {
        resolvedTalents.push(talent);
        seenIds.add(talentId);
      }
    } else {
      missingNames.push(talentName);
    }
  }

  // Emit diagnostic once per tree
  if (missingNames.length > 0) {
    SWSELogger.debug(
      `[TalentTreeMembershipAuthority] Tree "${tree.name}" (${tree.id}): ` +
      `${treeEntry.talents.length} registry talents → ${resolvedTalents.length} resolved ` +
      `(${missingNames.length} missing: ${missingNames.join(', ')})`
    );
  }

  return resolvedTalents;
}

/**
 * Clear the cached registry (for testing/reload)
 */
export function clearCache() {
  cachedRegistry = null;
  registryLoadPromise = null;
}
