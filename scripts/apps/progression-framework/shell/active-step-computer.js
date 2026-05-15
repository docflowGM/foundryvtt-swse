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
import { resolveClassModel } from '../../../engine/progression/utils/class-resolution.js';
import { ClassFeatRegistry } from '../../../engine/progression/feats/class-feat-registry.js';
import { LanguageEngine } from '../../../engine/progression/engine/language-engine.js';

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

      // Step 4: Evaluate applicability — filter out steps with no actionable work
      const applicableActive = [];
      for (const nodeId of sortedActive) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        const isApplicable = await this._evaluateStepApplicability(
          node,
          actor,
          mode,
          progressionSession
        );
        if (isApplicable) {
          applicableActive.push(nodeId);
        }
      }

      // Step 5: Route through adapter seam for subtype-specific contribution
      // Phase 1: Adapter can suppress/modify active steps based on subtype rules
      const adapter = progressionSession.subtypeAdapter;
      let finalActive = applicableActive;
      if (adapter) {
        // Phase 2.8: Ensure session has mode for adapter logic (e.g., Beast level-up feat filtering)
        const sessionWithMode = { ...progressionSession, mode };
        finalActive = await adapter.contributeActiveSteps(applicableActive, sessionWithMode, actor);
      }

      swseLogger.debug('[ActiveStepComputer] Computed active steps', {
        mode,
        subtype,
        count: finalActive.length,
        steps: finalActive,
        adapterContributed: !!adapter,
      });

      return finalActive;
    } catch (err) {
      swseLogger.error('[ActiveStepComputer] Error computing active steps:', err);
      return [];
    }
  }

  /**
   * Evaluate whether a step has actionable work for current session state.
   * A step is "applicable" if the player has something to do in it.
   * Non-applicable steps are hidden and auto-skipped in navigation.
   *
   * @param {Object} node - Node definition from registry
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _evaluateStepApplicability(node, actor, mode, progressionSession) {
    try {
      switch (node.nodeId) {
        // Languages: applicable only if unallocated language slots exist
        case 'languages':
          return this._hasUnallocatedLanguageSlots(actor, progressionSession);

        // Feat steps: applicable if legal choices exist
        case 'general-feat':
        case 'class-feat':
          return this._hasFeatChoices(node.nodeId, actor, progressionSession);

        // Talent steps: applicable if legal choices exist
        case 'general-talent':
        case 'class-talent':
          return this._hasTalentChoices(node.nodeId, actor, progressionSession);

        // Force powers: applicable if entitlements > used count
        case 'force-powers':
          return this._hasForcePowerChoices(actor, progressionSession);

        // Force secrets/techniques: applicable if entitlements exist
        case 'force-secrets':
          return this._hasForceSecretChoices(actor, progressionSession);

        case 'force-techniques':
          return this._hasForceTechniqueChoices(actor, progressionSession);

        // Starship maneuvers: applicable if entitlements exist
        case 'starship-maneuvers':
          return this._hasStarshipChoices(actor, progressionSession);

        // Droid builder: normal droid subtype always needs it; organic actors only
        // need it when their selected species requires a constrained droid shell.
        case 'droid-builder':
          return this._hasDroidBuilderWork(actor, progressionSession);

        // Droid-only configuration: applicable if deferred droid build exists
        case 'final-droid-configuration':
          return this._hasDroidBuildPending(progressionSession);

        // Canonical steps are always applicable (they're always needed)
        default:
          return true;
      }
    } catch (err) {
      swseLogger.warn(
        `[ActiveStepComputer] Error evaluating applicability for ${node.nodeId}:`,
        err
      );
      // Default to applicable on error (fail-safe: don't hide steps)
      return true;
    }
  }


  _hasDroidBuilderWork(actor, progressionSession) {
    if (progressionSession?.subtype === 'droid' || actor?.type === 'droid' || actor?.system?.isDroid) {
      return true;
    }
    const context = progressionSession?.draftSelections?.pendingSpeciesContext || null;
    const droidBuilder = context?.metadata?.droidBuilder || context?.ledger?.rules?.droidBuilder || null;
    return !!droidBuilder?.required;
  }

  /**
   * Check if actor has unallocated language slots.
   * PHASE 6: Reads from pending progression state instead of committed actor
   * PHASE 7: Dynamic Linguist compatibility instead of hardcoded bonus
   * @private
   */
  _hasUnallocatedLanguageSlots(actor, progressionSession) {
    // Languages step should only appear when there are player-selectable bonus
    // language slots. Granted species/background languages are materialized
    // automatically and must not force an empty step.
    const engineSlots = Math.max(0, Number(
      LanguageEngine.calculateBonusLanguagesAvailable(actor, {
        shell: { progressionSession },
        progressionSession,
        includePending: true,
      }) || 0
    ));

    const pending = progressionSession?.draftSelections || {};
    const attrSelection = pending.attributes?.values || pending.attributes || {};
    const pendingInt = Number(
      attrSelection?.int?.score
        ?? attrSelection?.int?.base
        ?? attrSelection?.int?.value
        ?? attrSelection?.int
        ?? actor?.system?.abilities?.int?.base
        ?? actor?.system?.abilities?.int?.value
        ?? 10
    );
    const intBonusSlots = Math.max(0, Math.floor(((Number.isFinite(pendingInt) ? pendingInt : 10) - 10) / 2));
    const pendingFeats = Array.isArray(pending.feats) ? pending.feats : [];
    const pendingLinguistCount = pendingFeats.filter((feat) => {
      const name = String(feat?.name || feat?.label || feat?.id || feat || '').toLowerCase();
      return name === 'linguist' || name.includes('linguist');
    }).reduce((total, feat) => total + Math.max(1, Number(feat?.count || 1)), 0);
    const pendingSlots = intBonusSlots + (pendingLinguistCount * Math.max(1, 1 + intBonusSlots));
    const bonusSlots = Math.max(engineSlots, pendingSlots);

    const selectedLanguages = Array.isArray(progressionSession?.draftSelections?.languages)
      ? progressionSession.draftSelections.languages.length
      : 0;

    return selectedLanguages < bonusSlots;
  }

  /**
   * Check if legal feat choices exist for this feat type.
   * @private
   */
  async _hasFeatChoices(stepNodeId, actor, progressionSession) {
    if (stepNodeId !== 'class-feat') {
      return true;
    }

    try {
      const classSelection = progressionSession?.getSelection?.('class') || progressionSession?.draftSelections?.class || null;
      const classModel = resolveClassModel(classSelection);
      if (!classModel) {
        return false;
      }

      const currentLevel = Number(actor?.system?.level || actor?.system?.details?.level || 1) || 1;
      const levelEntry = Array.isArray(classModel.levelProgression)
        ? classModel.levelProgression.find(entry => Number(entry.level) === currentLevel)
        : null;
      const features = levelEntry?.features || [];
      const hasClassFeatGrant = features.some(feature => {
        const type = String(feature?.type || '').toLowerCase();
        const name = String(feature?.name || feature || '').toLowerCase();
        return type === 'feat_choice' || name.includes('bonus feat');
      });

      if (!hasClassFeatGrant) {
        return false;
      }

      const lookupKeys = [classModel.sourceId, classModel.id, classModel.name].filter(Boolean);
      const allowed = await ClassFeatRegistry.getClassBonusFeats(lookupKeys);
      return allowed.length > 0;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error evaluating class-feat applicability:', err);
      return false;
    }
  }

  /**
   * Check if legal talent choices exist for this talent type.
   * @private
   */
  _hasTalentChoices(stepNodeId, actor, progressionSession) {
    // Placeholder: would call AbilityEngine.evaluateAcquisition() for each talent
    // For now, assume applicable (step plugin filters legal choices)
    return true;
  }

  /**
   * Check if force power entitlements exist and have unfilled slots.
   * @private
   */
  _hasForcePowerChoices(actor, progressionSession) {
    // For now, assume applicable if force powers step is active
    // (prerequisite already checked by activation policy)
    return true;
  }

  /**
   * Check if force secret entitlements exist.
   * PHASE 3: Uses real class grant budget instead of proxy signals.
   * @private
   */
  async _hasForceSecretChoices(actor, progressionSession) {
    try {
      // Import the entitlement resolver
      const { resolveForceSecretEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );

      // Check the real class progression grant budget
      const entitlements = resolveForceSecretEntitlements(progressionSession, null, actor);
      const hasGrants = entitlements.total > 0;

      if (!hasGrants) {
        swseLogger.debug('[ActiveStepComputer] Force Secrets: no class grants resolved');
      }

      return hasGrants;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking force secret grants:', err);
      return false; // Fail closed
    }
  }

  /**
   * Check if force technique entitlements exist.
   * PHASE 3: Uses real class grant budget instead of proxy signals.
   * @private
   */
  async _hasForceTechniqueChoices(actor, progressionSession) {
    try {
      // Import the entitlement resolver
      const { resolveForceTechniqueEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );

      // Check the real class progression grant budget
      const entitlements = resolveForceTechniqueEntitlements(progressionSession, null, actor);
      const hasGrants = entitlements.total > 0;

      if (!hasGrants) {
        swseLogger.debug('[ActiveStepComputer] Force Techniques: no class grants resolved');
      }

      return hasGrants;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking force technique grants:', err);
      return false; // Fail closed
    }
  }

  /**
   * Check if starship maneuver entitlements exist.
   * PHASE 3: Uses real ManeuverAuthorityEngine validation instead of placeholder.
   * @private
   */
  async _hasStarshipChoices(actor, progressionSession) {
    const actorName = actor?.name || 'unknown';
    const diagnostics = {
      actorName,
      engineImport: null,
      accessValidation: null,
    };

    try {
      // Import the authority engine
      let ManeuverAuthorityEngine;
      try {
        const imported = await import(
          '/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js'
        );
        ManeuverAuthorityEngine = imported.ManeuverAuthorityEngine;
        diagnostics.engineImport = {
          success: !!ManeuverAuthorityEngine,
          message: 'ManeuverAuthorityEngine imported',
        };
      } catch (importErr) {
        diagnostics.engineImport = {
          success: false,
          error: importErr.message,
          message: 'ManeuverAuthorityEngine import failed',
        };
        swseLogger.error('[ActiveStepComputer] ManeuverAuthorityEngine import failed for starship access check', {
          actorName,
          error: importErr.message,
          diagnostics,
        });
        return false; // Fail closed
      }

      // Check real access validation: Starship Tactics feat + domain unlock
      try {
        const accessValidation = await ManeuverAuthorityEngine.validateManeuverAccess(actor);
        const hasAccess = accessValidation.valid;

        diagnostics.accessValidation = {
          success: true,
          valid: hasAccess,
          reason: accessValidation.reason || 'not specified',
        };

        if (!hasAccess) {
          swseLogger.debug('[ActiveStepComputer] Starship Maneuvers: access denied for ' + actorName, {
            reason: accessValidation.reason,
            diagnostics,
          });
        } else {
          swseLogger.debug('[ActiveStepComputer] Starship Maneuvers: access granted for ' + actorName, { diagnostics });
        }

        return hasAccess;
      } catch (validationErr) {
        diagnostics.accessValidation = {
          success: false,
          error: validationErr.message,
          message: 'validateManeuverAccess threw exception',
        };
        swseLogger.error('[ActiveStepComputer] Starship maneuver access validation exception for ' + actorName, {
          error: validationErr.message,
          diagnostics,
        });
        return false; // Fail closed
      }
    } catch (err) {
      swseLogger.error('[ActiveStepComputer] Unhandled error checking starship maneuver access for ' + actorName, {
        error: err.message,
        diagnostics,
      });
      return false; // Fail closed
    }
  }

  /**
   * Check if deferred droid build is pending finalization.
   * @private
   */
  _hasDroidBuildPending(progressionSession) {
    const droidBuild = progressionSession?.draftSelections?.droid;
    return droidBuild?.buildState?.isDeferred === true &&
           droidBuild?.buildState?.isFinalized !== true;
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
    // Force powers: requires Force Sensitivity or a pending Force Training/Force Sensitivity grant.
    if (node.nodeId === 'force-powers') {
      const pendingFeats = progressionSession?.draftSelections?.feats || [];
      const pendingGrantedFeats = progressionSession?.pendingState?.grantedFeats || [];
      const pendingNames = [
        ...pendingFeats,
        ...pendingGrantedFeats,
      ].map(entry => String(entry?.name || entry?.label || entry || '').toLowerCase());
      const hasPendingForceAccess = pendingNames.some(name =>
        name.includes('force sensitivity') || name.includes('force sensitive') || name.includes('force training')
      );
      const hasForceSensitivity = actor.items.some(item =>
        item.type === 'feat' && item.name?.toLowerCase().includes('force sensitivity')
      );
      return hasForceSensitivity || hasPendingForceAccess;
    }

    // Force secrets: PHASE 3 - check real class grant budget (not proxy signals)
    if (node.nodeId === 'force-secrets') {
      return await this._hasForceSecretChoices(actor, progressionSession);
    }

    // Force techniques: PHASE 3 - check real class grant budget (not proxy signals)
    if (node.nodeId === 'force-techniques') {
      return await this._hasForceTechniqueChoices(actor, progressionSession);
    }

    // Starship maneuvers: PHASE 3 - check real access validation (not proxy signals)
    if (node.nodeId === 'starship-maneuvers') {
      return await this._hasStarshipChoices(actor, progressionSession);
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
