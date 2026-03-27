/**
 * User Explainability — Phase 7 Step 1
 *
 * Wraps ProgressionDebugHelpers to provide concise, actionable explanations
 * for players and GMs without overwhelming technical traces.
 *
 * Goals:
 * - Answer "why is this step here?"
 * - Answer "why did this step disappear or become dirty?"
 * - Answer "why is this suggestion recommended?"
 * - Answer "where did this template content come from?"
 *
 * Separation of concerns:
 * - Player-facing explanations: concise, actionable, no jargon
 * - GM/admin explanations: detailed, with references to rules and metadata
 * - Developer explanations: full debug traces (delegated to ProgressionDebugHelpers)
 */

import { ProgressionDebugHelpers } from '/systems/foundryvtt-swse/scripts/engine/progression/debugging/progression-debug-helpers.js';
import { PROGRESSION_NODE_REGISTRY } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/registries/progression-node-registry.js';

export class UserExplainability {
  /**
   * Explain why a node is currently active to a player.
   *
   * @param {ProgressionSession} session - Current session
   * @param {string} nodeId - Node to explain
   * @returns {Object} Player-friendly explanation
   */
  static explainNodePresence(session, nodeId) {
    const debug = ProgressionDebugHelpers.debugNodeActivation(session, nodeId);
    if (debug.error) {
      return { error: debug.error };
    }

    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    const explanation = {
      nodeId,
      label: node.label,
      isActive: debug.isActive,
    };

    // Why is this step here?
    if (debug.isActive) {
      const reasons = [];

      // Required for progression type
      if (node.modes?.includes(session.mode) && session.mode === 'chargen') {
        reasons.push('required for character creation');
      } else if (session.mode === 'levelup' && node.modes?.includes('levelup')) {
        reasons.push(`required for level ${session.currentLevel}`);
      }

      // Unlocked by prior choice
      if (debug.dependencies.dependenciesMet && node.dependsOn?.length > 0) {
        const unlockedBy = node.dependsOn
          .map(depId => PROGRESSION_NODE_REGISTRY[depId]?.label || depId)
          .join(', ');
        reasons.push(`unlocked by: ${unlockedBy}`);
      }

      // Selection needs resolution
      if (node.selectionKey && !debug.selection.isResolved) {
        reasons.push('awaiting your choice');
      }

      explanation.reasons = reasons.length > 0 ? reasons : ['required for progression'];
    }

    return explanation;
  }

  /**
   * Explain why a node became dirty or disappeared.
   *
   * @param {ProgressionSession} session - Current session
   * @param {string} nodeId - Node that changed state
   * @param {Object} previousState - Prior activation state
   * @returns {Object} Player-friendly explanation
   */
  static explainNodeStateChange(session, nodeId, previousState) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node) return { error: `Unknown node: ${nodeId}` };

    const currentDebug = ProgressionDebugHelpers.debugNodeActivation(session, nodeId);
    const explanation = {
      nodeId,
      label: node.label,
      previousState: previousState?.state || 'UNKNOWN',
      currentState: currentDebug.state,
    };

    // Why did it disappear or become dirty?
    if (previousState?.isActive && !currentDebug.isActive) {
      const reasons = [];

      // Class changed and this node requires a different class
      if (previousState.activation?.sessionSubtype !== currentDebug.activation.sessionSubtype) {
        reasons.push('no longer compatible with your class');
      }

      // Attribute changed and this node has attribute prerequisites
      if (previousState.activation?.sessionMode !== currentDebug.activation.sessionMode) {
        reasons.push('no longer available in this mode');
      }

      // Dependency became unmet
      if (previousState.dependencies?.dependenciesMet && !currentDebug.dependencies.dependenciesMet) {
        const failedDeps = (node.dependsOn || [])
          .filter(depId => !currentDebug.dependencies.dependenciesMet.includes(depId))
          .map(depId => PROGRESSION_NODE_REGISTRY[depId]?.label || depId);
        if (failedDeps.length > 0) {
          reasons.push(`dependency failed: ${failedDeps.join(', ')}`);
        }
      }

      explanation.reasons = reasons.length > 0 ? reasons : ['no longer required'];
    }

    if (currentDebug.isDirty) {
      explanation.isDirty = true;
      explanation.dirtyReason = 'This step needs your attention due to a recent change. Review and confirm your choice.';
    }

    return explanation;
  }

  /**
   * Explain why a suggestion is ranked where it is, in player-friendly terms.
   *
   * @param {Object} context - Suggestion context (from coordinator)
   * @param {Object} option - The option being explained
   * @param {number} rank - Its position in ranking (0 = first)
   * @returns {Object} Player-friendly explanation
   */
  static explainSuggestionRationale(context, option, rank) {
    const debug = ProgressionDebugHelpers.debugSuggestionRanking(context, option, rank);

    const explanation = {
      option: option.name || option.id,
      rank,
      isRecommended: rank === 0,
    };

    // If illegal, explain why
    if (!debug.legal) {
      explanation.legal = false;
      explanation.whyNotLegal = this._playerFriendlyLegalityReasons(debug.reasonsNotLegal);
      return explanation;
    }

    explanation.legal = true;

    // Top reasons for recommendation
    const topReasons = [];

    // Signal alignment
    if (debug.signalMatches && Object.keys(debug.signalMatches).length > 0) {
      const matches = Object.entries(debug.signalMatches)
        .filter(([, score]) => score > 0)
        .map(([signal]) => signal)
        .slice(0, 2);
      if (matches.length > 0) {
        topReasons.push(`aligns with: ${matches.join(', ')}`);
      }
    }

    // Mentor preference
    if (debug.mentorBias && debug.mentorBias.preference) {
      topReasons.push(`${context.mentorContext?.mentorName || 'Mentor'} recommends this`);
    }

    // Synergy
    if (debug.synergies && debug.synergies.length > 0) {
      const topSynergies = debug.synergies.slice(0, 1).map(s => s.name);
      if (topSynergies.length > 0) {
        topReasons.push(`works well with: ${topSynergies.join(', ')}`);
      }
    }

    // Target alignment
    if (debug.targetAlignment && debug.targetAlignment.aligned) {
      topReasons.push(`supports your build path: ${debug.targetAlignment.targetName}`);
    }

    explanation.reasons = topReasons.length > 0 ? topReasons : ['good fit for your character'];

    // Notable tradeoffs (if any)
    if (debug.tradeoffs && debug.tradeoffs.length > 0) {
      explanation.tradeoffs = debug.tradeoffs
        .slice(0, 1)
        .map(t => `${t.label}: ${t.impact}`);
    }

    return explanation;
  }

  /**
   * Explain template provenance in player terms.
   *
   * @param {Object} selectionInfo - Info about how this selection came from template
   * @returns {Object} Explanation of source
   */
  static explainTemplateProvenance(selectionInfo) {
    const { source, templateName, templateId, overridden } = selectionInfo;

    const explanation = {
      selection: selectionInfo.selection,
      templateName,
    };

    if (overridden) {
      explanation.source = `You changed ${templateName}'s choice`;
      explanation.hint = `You can restore the original choice if needed`;
    } else if (source === 'TEMPLATE_LOCKED') {
      explanation.source = `Locked by ${templateName} template`;
      explanation.hint = 'This choice is fundamental to the template. Change the template if you want to change this.';
    } else if (source === 'TEMPLATE_SUGGESTED') {
      explanation.source = `Suggested by ${templateName} template`;
      explanation.hint = 'You can change this to something else.';
    } else if (source === 'TEMPLATE_AUTO_RESOLVED') {
      explanation.source = `Automatically selected from ${templateName} options`;
      explanation.hint = 'Only one valid option was available.';
    } else if (source === 'UNRESOLVED') {
      explanation.source = `Waiting for resolution (from ${templateName})`;
      explanation.hint = 'The template did not provide this option. You must choose.';
    } else {
      explanation.source = 'Your choice';
    }

    return explanation;
  }

  /**
   * Explain template validation failures in player terms.
   *
   * @param {Object} validationReport - From TemplateValidator
   * @returns {Object[]} Array of player-friendly issue descriptions
   */
  static explainTemplateIssues(validationReport) {
    if (!validationReport || validationReport.valid) {
      return [];
    }

    const issues = [];

    // Conflicts (can't apply these choices due to game rules)
    if (validationReport.conflicts && validationReport.conflicts.length > 0) {
      issues.push(
        ...validationReport.conflicts.map(c => ({
          severity: 'blocking',
          issue: `${c.node} conflicts with your current build`,
          reason: `You already chose: ${c.current}`,
          actionNeeded: true,
        }))
      );
    }

    // Unresolved (choices not made)
    if (validationReport.unresolved && validationReport.unresolved.length > 0) {
      issues.push(
        ...validationReport.unresolved.map(u => ({
          severity: 'incomplete',
          issue: `${u.node} needs your choice`,
          reason: 'The template did not fill in this option.',
          actionNeeded: true,
        }))
      );
    }

    // Warnings (suboptimal but valid)
    if (validationReport.warnings && validationReport.warnings.length > 0) {
      issues.push(
        ...validationReport.warnings.map(w => ({
          severity: 'caution',
          issue: w.message,
          reason: w.details || '',
          actionNeeded: false,
        }))
      );
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  static _playerFriendlyLegalityReasons(debugReasons) {
    if (!debugReasons) return 'Not compatible with your character.';

    const reasons = [];

    // Translate technical legality reasons into player language
    if (debugReasons.includes('class_requirement_not_met')) {
      reasons.push('only available to specific classes');
    }
    if (debugReasons.includes('level_requirement_not_met')) {
      reasons.push('requires a higher level');
    }
    if (debugReasons.includes('prerequisite_not_met')) {
      reasons.push('requires other choices first');
    }
    if (debugReasons.includes('attribute_requirement_not_met')) {
      reasons.push('requires higher ability scores');
    }
    if (debugReasons.includes('already_selected')) {
      reasons.push('already chosen');
    }

    return reasons.length > 0
      ? reasons.join('; ')
      : 'Not available for your character.';
  }
}
