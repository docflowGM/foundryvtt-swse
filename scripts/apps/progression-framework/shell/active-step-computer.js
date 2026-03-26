/**
 * Active-Step Computer — Phase 2
 *
 * Derives the list of active steps from:
 * 1. Candidate-node registry
 * 2. Mode and subtype
 * 3. Session state (normalized selections)
 * 4. Prerequisite/entitlement evaluation
 * 5. Invalidation/dirty state
 *
 * This replaces:
 * - Hard-coded step arrays in chargen-shell and levelup-shell
 * - Ad-hoc conditional resolver logic
 * - Manual step filtering scattered across shell code
 *
 * Usage:
 *   const computer = new ActiveStepComputer();
 *   const activeSteps = await computer.computeActiveSteps(
 *     actor,
 *     mode,
 *     progressionSession,
 *     { subtype: 'actor' }
 *   );
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  PROGRESSION_NODE_REGISTRY,
  ActivationPolicy,
  getNodesForModeAndSubtype,
  getDownstreamDependents,
} from '../registries/progression-node-registry.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';

export class ActiveStepComputer {
  /**
   * Compute the active step list for an actor in a given mode.
   *
   * @param {Actor} actor - The actor being progressed
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Object} options
   * @param {string} options.subtype - Character subtype (actor, npc, droid, etc.)
   * @param {Array<string>} options.invalidatedNodes - Nodes marked dirty/purged
   * @returns {Promise<Array<string>>} Ordered list of active nodeIds
   */
  async computeActiveSteps(actor, mode, progressionSession, options = {}) {
    const { subtype = 'actor', invalidatedNodes = [] } = options;

    try {
      // Step 1: Get candidate nodes for this mode + subtype
      const candidateNodes = getNodesForModeAndSubtype(mode, subtype);

      if (candidateNodes.length === 0) {
        swseLogger.warn(
          '[ActiveStepComputer] No candidate nodes found',
          { mode, subtype }
        );
        return [];
      }

      // Step 2: Evaluate activation policy for each candidate
      const activeNodeIds = [];

      for (const node of candidateNodes) {
        const isActive = await this._evaluateNodeActivation(
          node,
          actor,
          mode,
          progressionSession
        );

        if (isActive) {
          activeNodeIds.push(node.nodeId);
        }
      }

      // Step 3: Sort into correct sequence
      // (Registry order is canonical; we preserve it)
      const sortedActive = candidateNodes
        .filter(node => activeNodeIds.includes(node.nodeId))
        .map(node => node.nodeId);

      swseLogger.debug('[ActiveStepComputer] Computed active steps', {
        mode,
        subtype,
        count: sortedActive.length,
        steps: sortedActive,
      });

      return sortedActive;
    } catch (err) {
      swseLogger.error('[ActiveStepComputer] Error computing active steps:', err);
      return [];
    }
  }

  /**
   * Evaluate whether a single node should be active.
   *
   * @param {Object} node - Node definition from registry
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _evaluateNodeActivation(node, actor, mode, progressionSession) {
    try {
      switch (node.activationPolicy) {
        case ActivationPolicy.CANONICAL:
          // Canonical nodes are always active if they pass mode/subtype filters
          // (which they already do — they're in candidateNodes)
          return true;

        case ActivationPolicy.PREREQUISITE:
          // Conditional nodes require entitlement/legality check
          return await this._checkPrerequisiteActivation(
            node,
            actor,
            progressionSession
          );

        case ActivationPolicy.CONDITIONAL:
          // Nodes that appear only if specific state exists
          return this._checkConditionalActivation(node, actor, progressionSession);

        case ActivationPolicy.LEVEL_EVENT:
          // Level-up only: appears on specific level boundaries
          return this._checkLevelEventActivation(node, actor, mode);

        default:
          swseLogger.warn(
            `[ActiveStepComputer] Unknown activation policy: ${node.activationPolicy}`
          );
          return false;
      }
    } catch (err) {
      swseLogger.error(
        `[ActiveStepComputer] Error evaluating node ${node.nodeId}:`,
        err
      );
      return false;
    }
  }

  /**
   * Check if a prerequisite-gated node should activate.
   * (Used for force-powers, force-secrets, starship-maneuvers)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _checkPrerequisiteActivation(node, actor, progressionSession) {
    // Force powers: requires Force Sensitivity feat
    if (node.nodeId === 'force-powers') {
      const hasForceSensitivity = actor.items.some(item =>
        item.type === 'feat' && item.name?.toLowerCase().includes('force sensitivity')
      );
      return hasForceSensitivity;
    }

    // Force secrets: requires force-powers to have been selected
    if (node.nodeId === 'force-secrets') {
      const forcePowerSelection = progressionSession?.draftSelections?.forcePowers;
      return Array.isArray(forcePowerSelection) && forcePowerSelection.length > 0;
    }

    // Force techniques: requires force-secrets or force-powers
    if (node.nodeId === 'force-techniques') {
      const secretSelection = progressionSession?.draftSelections?.forceSecrets;
      const hasForceTalent = actor.items.some(item =>
        item.type === 'talent' && item.name?.toLowerCase().includes('force')
      );
      return (Array.isArray(secretSelection) && secretSelection.length > 0) || hasForceTalent;
    }

    // Starship maneuvers: requires Starship feat or piloting feat
    if (node.nodeId === 'starship-maneuvers') {
      const hasStarshipFeat = actor.items.some(item =>
        item.type === 'feat' && (
          item.name?.toLowerCase().includes('starship') ||
          item.name?.toLowerCase().includes('pilot')
        )
      );
      return hasStarshipFeat;
    }

    // Generic: if no specific rules, assume active
    return true;
  }

  /**
   * Check if a conditional node should activate.
   * (Used for final-droid-configuration, etc.)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {boolean}
   * @private
   */
  _checkConditionalActivation(node, actor, progressionSession) {
    // Final droid configuration: appears only if droid build is deferred
    if (node.nodeId === 'final-droid-configuration') {
      const droidBuild = progressionSession?.draftSelections?.droid;
      return droidBuild?.buildState?.isDeferred === true &&
             droidBuild?.buildState?.isFinalized !== true;
    }

    // Generic: no other conditional nodes yet
    return false;
  }

  /**
   * Check if a level-event node should activate.
   * (Used for level-up-specific step gating)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @returns {boolean}
   * @private
   */
  _checkLevelEventActivation(node, actor, mode) {
    // This is for future level-up gating (e.g., attributes only on even levels)
    // For now, if we're in levelup mode and the node specifies LEVEL_EVENT,
    // we'd check the specific level boundaries here.
    // Currently no nodes use LEVEL_EVENT policy.
    return mode === 'levelup';
  }

  /**
   * Determine which nodes are invalidated when an upstream node changes.
   * Returns list of nodeIds that should be marked dirty/purged.
   *
   * @param {string} changedNodeId - The node that changed
   * @returns {Array<{nodeId: string, behavior: string}>}
   */
  getInvalidatedNodes(changedNodeId) {
    const node = PROGRESSION_NODE_REGISTRY[changedNodeId];
    if (!node || !node.invalidates) return [];

    return node.invalidates.map(downstreamId => ({
      nodeId: downstreamId,
      behavior: node.invalidationBehavior?.[downstreamId] || 'dirty',
    }));
  }

  /**
   * Check if a node is currently dirty/invalidated.
   * Dirty nodes should still render but prompt user to validate.
   *
   * @param {string} nodeId
   * @param {Object} invalidationState - Map of nodeId → behavior
   * @returns {boolean}
   */
  isNodeDirty(nodeId, invalidationState) {
    return invalidationState?.[nodeId] === 'dirty';
  }

  /**
   * Check if a node's selections should be purged.
   *
   * @param {string} nodeId
   * @param {Object} invalidationState - Map of nodeId → behavior
   * @returns {boolean}
   */
  shouldPurgeNode(nodeId, invalidationState) {
    return invalidationState?.[nodeId] === 'purge';
  }
}
