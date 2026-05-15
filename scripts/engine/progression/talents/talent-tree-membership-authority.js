/**
 * Talent Tree Membership Authority
 *
 * Deterministic source of truth for talent tree membership.
 * Implements robust fallback chain:
 * 1. Registry lookup by normalized ID/key
 * 2. TalentRegistry category scanning (if registry returns 0)
 * 3. Direct talentIds resolution (if scanning returns 0)
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';

let cachedRegistry = null;
let registryLoadPromise = null;
let diagnosticCache = new Set(); // Prevent duplicate diagnostics

/**
 * Normalize a tree ID to stable key format
 */
function normalizeTreeKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

      // Convert array to map keyed by tree id and normalized key
      if (Array.isArray(data)) {
        cachedRegistry = new Map();
        for (const tree of data) {
          if (tree.id && Array.isArray(tree.talents)) {
            cachedRegistry.set(tree.id, tree);
            // Also index by normalized key if available
            const key = tree.key || normalizeTreeKey(tree.displayName || tree.name || tree.id);
            if (key && key !== tree.id) {
              cachedRegistry.set(key, tree);
            }
          }
        }
        SWSELogger.debug(
          `[TalentTreeMembershipAuthority] Registry loaded: ${cachedRegistry.size} entries`
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
 * FALLBACK 1: Try registry lookup by ID and normalized key
 */
function tryRegistryLookup(registry, tree) {
  if (!tree || !registry) return null;

  // Try by ID first
  if (tree.id && registry.has(tree.id)) {
    return registry.get(tree.id);
  }

  // Try by normalized key from name
  if (tree.name) {
    const normalizedKey = normalizeTreeKey(tree.name);
    if (registry.has(normalizedKey)) {
      return registry.get(normalizedKey);
    }
  }

  // Try by sourceId if present
  if (tree.sourceId && registry.has(tree.sourceId)) {
    return registry.get(tree.sourceId);
  }

  return null;
}

/**
 * FALLBACK 2: Scan TalentRegistry by category/tree name
 */
function tryRegistryScan(tree) {
  if (!tree || !tree.name) return [];

  // Try exact tree name as category
  let talents = TalentRegistry.getByCategory?.(tree.name) || [];
  if (talents.length > 0) {
    return talents;
  }

  // Try normalized name as category
  const normalized = normalizeTreeKey(tree.name);
  talents = TalentRegistry.getByCategory?.(normalized) || [];
  if (talents.length > 0) {
    return talents;
  }

  // Scan all talents for talentTree field matching
  talents = TalentRegistry.search?.(talent => {
    const treeField = talent.talentTree || talent.category || '';
    const treeName = String(treeField).toLowerCase();
    const targetName = String(tree.name).toLowerCase();
    return treeName === targetName || treeName.includes(targetName);
  }) || [];

  return talents;
}

/**
 * FALLBACK 3: Resolve talentIds array directly
 */
function tryTalentIdResolution(tree) {
  if (!tree) return [];

  const talentRefs = [
    ...(Array.isArray(tree.talentNames) ? tree.talentNames : []),
    ...(Array.isArray(tree.talentIds) ? tree.talentIds : []),
    ...(Array.isArray(tree.system?.talentNames) ? tree.system.talentNames : []),
    ...(Array.isArray(tree.system?.talentIds) ? tree.system.talentIds : []),
  ].filter(Boolean);

  if (!talentRefs.length) return [];

  const resolved = [];
  const seenIds = new Set();

  for (const talentId of talentRefs) {
    if (!talentId) continue;

    // Try by ID
    const talent = TalentRegistry.getById?.(talentId);
    if (talent) {
      const id = talent.id || talent._id;
      if (id && !seenIds.has(id)) {
        resolved.push(talent);
        seenIds.add(id);
      }
      continue;
    }

    // Try by name (if talentId looks like a name)
    const talentByName = TalentRegistry.getByName?.(talentId);
    if (talentByName) {
      const id = talentByName.id || talentByName._id;
      if (id && !seenIds.has(id)) {
        resolved.push(talentByName);
        seenIds.add(id);
      }
    }
  }

  return resolved;
}

/**
 * Emit diagnostic for zero-talent trees (once per tree)
 */
function emitDiagnostic(tree, methods) {
  const key = `${tree.id || tree.name}`;
  if (diagnosticCache.has(key)) {
    return; // Already logged
  }
  diagnosticCache.add(key);

  SWSELogger.warn(
    `[TalentTreeMembershipAuthority] DIAGNOSTIC: Tree "${tree.name}" (id: ${tree.id}, sourceId: ${tree.sourceId || 'none'}) ` +
    `resolved 0 talents. talent refs count: ${((tree.talentNames || []).length + (tree.talentIds || []).length)}. ` +
    `Methods tried: ${methods.join(', ')}. ` +
    `TalentRegistry total: ${TalentRegistry.count?.() || 0} talents.`
  );
}

/**
 * Get talent membership for a tree with robust fallback chain
 *
 * @param {Object} tree - Talent tree object with id, name, sourceId, talentIds
 * @returns {Promise<Array>} Array of resolved talent entries
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
  const methodsTried = [];

  // FALLBACK 1: Try registry lookup
  const registryEntry = tryRegistryLookup(registry, tree);
  if (registryEntry && Array.isArray(registryEntry.talents)) {
    methodsTried.push('registry-lookup');
    const resolved = [];
    const seenIds = new Set();
    const missingNames = [];

    for (const talentName of registryEntry.talents) {
      const talent = TalentRegistry.getByName?.(talentName);
      if (talent) {
        const talentId = talent.id || talent._id;
        if (talentId && !seenIds.has(talentId)) {
          resolved.push(talent);
          seenIds.add(talentId);
        }
      } else {
        missingNames.push(talentName);
      }
    }

    if (resolved.length > 0) {
      SWSELogger.debug(
        `[TalentTreeMembershipAuthority] Tree "${tree.name}" (${tree.id}): ` +
        `${registryEntry.talents.length} registry talents → ${resolved.length} resolved` +
        (missingNames.length > 0 ? ` (${missingNames.length} missing)` : '')
      );
      return resolved;
    }
  }

  // FALLBACK 2: Scan TalentRegistry by category
  methodsTried.push('registry-scan');
  let resolved = tryRegistryScan(tree);
  if (resolved.length > 0) {
    SWSELogger.debug(
      `[TalentTreeMembershipAuthority] Tree "${tree.name}" (${tree.id}): ` +
      `${resolved.length} talents found via registry category scan`
    );
    return resolved;
  }

  // FALLBACK 3: Resolve talentIds directly
  methodsTried.push('talentIds-resolution');
  resolved = tryTalentIdResolution(tree);
  if (resolved.length > 0) {
    SWSELogger.debug(
      `[TalentTreeMembershipAuthority] Tree "${tree.name}" (${tree.id}): ` +
      `${resolved.length} talents resolved from talentIds array`
    );
    return resolved;
  }

  // ZERO TALENT RESOLUTION - emit diagnostic
  emitDiagnostic(tree, methodsTried);
  return [];
}

/**
 * Clear the cached registry (for testing/reload)
 */
export function clearCache() {
  cachedRegistry = null;
  registryLoadPromise = null;
}
