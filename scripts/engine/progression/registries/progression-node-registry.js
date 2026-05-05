/**
 * Progression Node Registry — Phase 2
 *
 * Single authoritative source for all candidate nodes in the progression spine.
 * Registry is consulted by:
 * - Active-step computation (which nodes are owed?)
 * - Dependency analysis (what invalidates what?)
 * - Reconciliation (what must be rechecked after upstream changes?)
 * - Activation filtering (should this node appear in this mode?)
 *
 * This is NOT a runtime step list. This is the specification of what COULD run.
 * The shell derives active steps from this registry by filtering through:
 * 1. Mode/subtype rules
 * 2. Prerequisite/entitlement activation
 * 3. Dependency invalidation state
 *
 * Locked for Phase 2:
 * - All nodes documented
 * - Dependencies specified
 * - Invalidation behavior defined
 * - Mode/subtype coverage declared
 *
 * Static data extracted into:
 * - progression-node-types.js (ActivationPolicy, InvalidationBehavior)
 * - progression-node-definitions.js (PROGRESSION_NODE_REGISTRY)
 */

export { ActivationPolicy, InvalidationBehavior } from './progression-node-types.js';
export { PROGRESSION_NODE_REGISTRY } from './progression-node-definitions.js';

import { PROGRESSION_NODE_REGISTRY } from './progression-node-definitions.js';

/**
 * Get a node from the registry by ID
 * @param {string} nodeId
 * @returns {Object|null}
 */
export function getNode(nodeId) {
  return PROGRESSION_NODE_REGISTRY[nodeId] || null;
}

/**
 * Get all nodes that apply to a given mode + subtype
 * @param {'chargen' | 'levelup'} mode
 * @param {'actor' | 'npc' | 'droid' | 'follower' | 'nonheroic'} subtype
 * @returns {Array<{nodeId: string, ...}>}
 */
export function getNodesForModeAndSubtype(mode, subtype) {
  return Object.values(PROGRESSION_NODE_REGISTRY).filter(node =>
    node.modes.includes(mode) && node.subtypes.includes(subtype)
  );
}

/**
 * Get nodes that depend on a given node
 * (for invalidation analysis)
 * @param {string} nodeId
 * @returns {Array<{nodeId: string, ...}>}
 */
export function getDownstreamDependents(nodeId) {
  return Object.values(PROGRESSION_NODE_REGISTRY).filter(node =>
    node.dependsOn.includes(nodeId)
  );
}

/**
 * Get nodes that a given node depends on
 * (for prerequisite analysis)
 * @param {string} nodeId
 * @returns {Array<{nodeId: string, ...}>}
 */
export function getUpstreamDependencies(nodeId) {
  const node = PROGRESSION_NODE_REGISTRY[nodeId];
  if (!node) return [];
  return node.dependsOn.map(id => PROGRESSION_NODE_REGISTRY[id]).filter(Boolean);
}
