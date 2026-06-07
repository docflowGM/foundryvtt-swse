/**
 * Talent Tree Membership Authority
 *
 * Deterministic source of truth for talent tree membership.
 *
 * The important invariant here is additive hydration: if one source resolves
 * some talents for a tree, we still merge every other known source before
 * returning. Earlier versions returned as soon as talent-side fields produced
 * any result, which made partially tagged trees silently drop valid talents.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';

let cachedRegistry = null;
let registryLoadPromise = null;
const diagnosticCache = new Set();
const auditCache = new Set();

/**
 * Normalize a tree ID to stable key format.
 */
function normalizeTreeKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTalentTreeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTalentRefKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTalentIdentity(talent) {
  return String(talent?.id || talent?._id || talent?.uuid || talent?.name || '').trim();
}

function getTreeIdentityKeys(tree) {
  return [...new Set([
    tree?.id,
    tree?.sourceId,
    tree?.key,
    tree?.name,
    tree?.displayName,
    tree?.system?.treeId,
    tree?.system?.key,
    tree?.system?.talent_tree,
  ].map(normalizeTalentTreeKey).filter(Boolean))];
}

function getClaimedTalentRefs(tree, registryEntry = null) {
  return [...new Set([
    ...(Array.isArray(registryEntry?.talents) ? registryEntry.talents : []),
    ...(Array.isArray(tree?.talentNames) ? tree.talentNames : []),
    ...(Array.isArray(tree?.talentIds) ? tree.talentIds : []),
    ...(Array.isArray(tree?.system?.talentNames) ? tree.system.talentNames : []),
    ...(Array.isArray(tree?.system?.talentIds) ? tree.system.talentIds : []),
  ].map(value => String(value ?? '').trim()).filter(Boolean))];
}

/**
 * Load the talent tree membership registry from data files.
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

      if (!data) {
        try {
          const response = await fetch('/systems/foundryvtt-swse/data/fixes/talent-trees.registry.json');
          if (response.ok) {
            data = await response.json();
            SWSELogger.debug('[TalentTreeMembershipAuthority] Loaded fixes talent-trees.registry.json fallback');
          }
        } catch (err) {
          SWSELogger.warn(`[TalentTreeMembershipAuthority] Failed to load fixes registry: ${err.message}`);
        }
      }

      cachedRegistry = new Map();
      if (Array.isArray(data)) {
        for (const tree of data) {
          if (!tree?.id || !Array.isArray(tree.talents)) continue;
          const keys = [
            tree.id,
            tree.key,
            tree.name,
            tree.displayName,
            normalizeTreeKey(tree.displayName || tree.name || tree.id),
            normalizeTalentTreeKey(tree.displayName || tree.name || tree.id),
          ].filter(Boolean);
          for (const key of keys) {
            cachedRegistry.set(key, tree);
          }
        }
        SWSELogger.debug(`[TalentTreeMembershipAuthority] Registry loaded: ${cachedRegistry.size} lookup keys`);
      } else {
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

function resolveTalentReference(ref) {
  const raw = String(ref ?? '').trim();
  if (!raw) return null;

  const direct = TalentRegistry.getById?.(raw) || TalentRegistry.getByName?.(raw);
  if (direct) return direct;

  const normalized = normalizeTalentRefKey(raw);
  if (!normalized) return null;

  return (TalentRegistry.getAll?.() || []).find(talent => {
    const candidates = [
      talent?.id,
      talent?._id,
      talent?.name,
      talent?.uuid,
      talent?.system?.slug,
      talent?.system?.id,
      talent?.system?.name,
      talent?.flags?.swse?.id,
      talent?.flags?.swse?.slug,
    ];
    return candidates.some(candidate => normalizeTalentRefKey(candidate) === normalized);
  }) || null;
}

function mergeTalentList(target, talents, source, seen, sourceStats) {
  let added = 0;
  for (const talent of talents || []) {
    const id = getTalentIdentity(talent);
    const fallbackKey = normalizeTalentRefKey(talent?.name || talent?.id || talent?._id);
    const key = id || fallbackKey;
    if (!key || seen.has(key)) continue;
    target.push(talent);
    seen.add(key);
    added += 1;
  }
  sourceStats[source] = {
    raw: Array.isArray(talents) ? talents.length : 0,
    added,
  };
}

/**
 * PRIMARY: resolve membership from talent-side tree fields.
 */
function tryTalentSideMembership(tree) {
  const keys = getTreeIdentityKeys(tree);
  if (!keys.length) return [];

  const resolved = [];
  const seenIds = new Set();

  for (const key of keys) {
    const matches = TalentRegistry.getByTree?.(key) || [];
    for (const talent of matches) {
      const id = getTalentIdentity(talent);
      if (!id || seenIds.has(id)) continue;
      resolved.push(talent);
      seenIds.add(id);
    }
  }

  const scanMatches = TalentRegistry.search?.(talent => {
    const talentKeys = [
      talent?.treeId,
      talent?.treeName,
      talent?.talentTree,
      talent?.system?.treeId,
      talent?.system?.talentTreeId,
      talent?.system?.talent_tree_id,
      talent?.system?.talent_tree,
      talent?.system?.talentTree,
      talent?.system?.tree,
    ].map(normalizeTalentTreeKey).filter(Boolean);
    return talentKeys.some(key => keys.includes(key));
  }) || [];

  for (const talent of scanMatches) {
    const id = getTalentIdentity(talent);
    if (!id || seenIds.has(id)) continue;
    resolved.push(talent);
    seenIds.add(id);
  }

  return resolved;
}

function tryRegistryLookup(registry, tree) {
  if (!tree || !registry) return null;

  const keys = [
    tree.id,
    tree.sourceId,
    tree.key,
    tree.name,
    tree.displayName,
    normalizeTreeKey(tree.name),
    normalizeTreeKey(tree.displayName),
    ...getTreeIdentityKeys(tree),
  ].filter(Boolean);

  for (const key of keys) {
    if (registry.has(key)) return registry.get(key);
  }

  return null;
}

/**
 * FALLBACK: Scan TalentRegistry by category/tree name.
 */
function tryRegistryScan(tree) {
  if (!tree || !tree.name) return [];

  const keys = getTreeIdentityKeys(tree);
  const exactNames = [...new Set([tree.name, tree.displayName, tree.id, tree.sourceId].filter(Boolean))];

  const categoryMatches = [];
  for (const name of exactNames) {
    categoryMatches.push(...(TalentRegistry.getByCategory?.(name) || []));
    categoryMatches.push(...(TalentRegistry.getByCategory?.(normalizeTreeKey(name)) || []));
  }
  if (categoryMatches.length > 0) {
    return categoryMatches;
  }

  return TalentRegistry.search?.(talent => {
    const talentKeys = [
      talent?.talentTree,
      talent?.category,
      talent?.treeName,
      talent?.treeId,
      talent?.system?.talent_tree,
      talent?.system?.talentTree,
      talent?.system?.tree,
      talent?.system?.treeId,
    ].map(normalizeTalentTreeKey).filter(Boolean);
    return talentKeys.some(key => keys.includes(key));
  }) || [];
}

/**
 * FALLBACK: Resolve talentNames/talentIds arrays directly.
 */
function tryTalentIdResolution(tree) {
  const talentRefs = getClaimedTalentRefs(tree);
  if (!talentRefs.length) return [];

  const resolved = [];
  const seenIds = new Set();
  for (const talentRef of talentRefs) {
    const talent = resolveTalentReference(talentRef);
    const id = getTalentIdentity(talent);
    if (talent && id && !seenIds.has(id)) {
      resolved.push(talent);
      seenIds.add(id);
    }
  }
  return resolved;
}

function emitDiagnostic(tree, methods) {
  const key = `zero:${tree?.id || tree?.name}`;
  if (diagnosticCache.has(key)) return;
  diagnosticCache.add(key);

  SWSELogger.warn(
    `[TalentTreeMembershipAuthority] DIAGNOSTIC: Tree "${tree?.name}" (id: ${tree?.id}, sourceId: ${tree?.sourceId || 'none'}) ` +
    `resolved 0 talents. talent refs count: ${((tree?.talentNames || []).length + (tree?.talentIds || []).length)}. ` +
    `Methods tried: ${methods.join(', ')}. ` +
    `TalentRegistry total: ${TalentRegistry.count?.() || 0} talents.`
  );
}

function emitMembershipAudit(tree, audit) {
  const expectedCount = Math.max(Number(tree?.talentCount) || 0, audit.claimedRefs.length);
  const shouldWarn = audit.missingClaimRefs.length > 0 || (expectedCount > 0 && audit.resolvedCount < expectedCount);
  const auditKey = `${shouldWarn ? 'warn' : 'debug'}:${tree?.id || tree?.name}:${audit.resolvedCount}:${audit.missingClaimRefs.join('|')}`;
  if (auditCache.has(auditKey)) return;
  auditCache.add(auditKey);

  const payload = {
    treeId: tree?.id || null,
    treeName: tree?.name || null,
    sourceStats: audit.sourceStats,
    claimedCount: audit.claimedRefs.length,
    expectedCount,
    resolvedCount: audit.resolvedCount,
    missingClaimRefs: audit.missingClaimRefs,
    resolvedTalentNames: audit.resolvedTalents.map(talent => talent?.name || talent?.id || '(unknown)'),
  };

  if (shouldWarn) {
    SWSELogger.warn('[TalentTreeMembershipAuthority] Talent tree hydration incomplete', payload);
  } else {
    SWSELogger.debug('[TalentTreeMembershipAuthority] Talent tree hydration audit', payload);
  }
}

/**
 * Get talent membership for a tree with additive source merging.
 *
 * @param {Object} tree - Talent tree object with id, name, sourceId, talentIds
 * @returns {Promise<Array>} Array of resolved talent entries
 */
export async function getTalentMembership(tree) {
  if (!tree) return [];

  if (!TalentRegistry.isInitialized?.()) {
    await TalentRegistry.initialize?.();
  }

  const registry = await loadRegistry();
  const methodsTried = [];
  const merged = [];
  const seen = new Set();
  const sourceStats = {};

  methodsTried.push('talent-side-membership');
  mergeTalentList(merged, tryTalentSideMembership(tree), 'talent-side-membership', seen, sourceStats);

  const registryEntry = tryRegistryLookup(registry, tree);
  const claimedRefs = getClaimedTalentRefs(tree, registryEntry);

  if (registryEntry && Array.isArray(registryEntry.talents)) {
    methodsTried.push('registry-lookup');
    const registryResolved = [];
    for (const talentRef of registryEntry.talents) {
      const talent = resolveTalentReference(talentRef);
      if (talent) registryResolved.push(talent);
    }
    mergeTalentList(merged, registryResolved, 'registry-lookup', seen, sourceStats);
  }

  methodsTried.push('registry-scan');
  mergeTalentList(merged, tryRegistryScan(tree), 'registry-scan', seen, sourceStats);

  methodsTried.push('talentIds-resolution');
  mergeTalentList(merged, tryTalentIdResolution(tree), 'talentIds-resolution', seen, sourceStats);

  const finalSeen = new Set(merged.map(talent => normalizeTalentRefKey(talent?.name || talent?.id || talent?._id)).filter(Boolean));
  const missingClaimRefs = claimedRefs.filter(ref => !resolveTalentReference(ref) && !finalSeen.has(normalizeTalentRefKey(ref)));

  emitMembershipAudit(tree, {
    sourceStats,
    claimedRefs,
    missingClaimRefs,
    resolvedCount: merged.length,
    resolvedTalents: merged,
  });

  if (merged.length > 0) {
    return merged;
  }

  emitDiagnostic(tree, methodsTried);
  return [];
}

/**
 * Clear the cached registry (for testing/reload).
 */
export function clearCache() {
  cachedRegistry = null;
  registryLoadPromise = null;
  diagnosticCache.clear();
  auditCache.clear();
}
