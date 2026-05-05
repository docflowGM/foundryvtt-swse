/**
 * Progression Debug Helpers — Phase 6 Work Package F
 *
 * Tools for developers and content authors to inspect:
 * - Why a node appeared or disappeared
 * - Why a node was invalidated
 * - Why a suggestion ranked first
 * - Why a template conflicted
 * - Why a mutation plan differs from expectation
 *
 * Usage: Developers call these during development or testing.
 * Output: Structured debug data suitable for logging, UI display, or reports.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { PROGRESSION_NODE_REGISTRY } from '/systems/foundryvtt-swse/scripts/engine/progression/registries/progression-node-registry.js';

export class ProgressionDebugHelpers {
  /**
   * Debug why a node is or isn't active.
   *
   * @param {ProgressionSession} session - Current session
   * @param {string} nodeId - Node to inspect
   * @returns {Object} Debug context
   */
  static debugNodeActivation(session, nodeId) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node) {
      return {
        nodeId,
        error: `Unknown node: ${nodeId}`,
      };
    }

    const isActive = session.activeSteps?.includes(nodeId);
    const isLocked = session.lockedNodes?.has(nodeId);
    const isDirty = session.dirtyNodes?.has(nodeId);
    const isCompleted = session.completedStepIds?.includes(nodeId);
    const isInvalidated = session.invalidatedStepIds?.includes(nodeId);

    return {
      nodeId,
      label: node.label,
      isActive,
      isLocked,
      isDirty,
      isCompleted,
      isInvalidated,
      state: isActive ? 'ACTIVE' : isDirty ? 'DIRTY' : isLocked ? 'LOCKED' : 'INACTIVE',

      // Dependency context
      dependencies: {
        dependsOn: node.dependsOn,
        dependenciesMet: this._checkDependencies(session, node.dependsOn),
        invalidates: node.invalidates,
        downstreamActive: this._getDownstreamActive(session, nodeId),
      },

      // Activation context
      activation: {
        policy: node.activationPolicy,
        modes: node.modes,
        subtypes: node.subtypes,
        sessionMode: session.mode,
        sessionSubtype: session.subtype,
        modeMatches: node.modes.includes(session.mode),
        subtypeMatches: node.subtypes.includes(session.subtype),
      },

      // Selection context
      selection: {
        selectionKey: node.selectionKey,
        currentValue: node.selectionKey ? session.draftSelections[node.selectionKey] : null,
        isResolved: node.selectionKey ? session.draftSelections[node.selectionKey] !== null : true,
      },

      // Audit trail
      history: this._getNodeHistory(session, nodeId),
    };
  }

  /**
   * Debug why a suggestion ranked in a certain position.
   *
   * @param {Object} context - Suggestion context (from SuggestionContextAdapter)
   * @param {Object} option - The option being ranked
   * @param {number} rank - Its position in ranking
   * @returns {Object} Debug context
   */
  static debugSuggestionRanking(context, option, rank) {
    return {
      option: option.name || option.id,
      rank,
      category: option.type || 'unknown',

      // Legality
      legal: context.legalOptions?.includes(option.id),
      visible: context.visibleOptions?.includes(option.id),
      reasonsNotLegal: this._findLegalityReasons(context, option),

      // Forecast context
      forecast: context.forecastByOption?.[option.id],

      // Signal matching
      signalMatches: this._scoreSignalMatches(context.buildSignals, option),

      // Synergy analysis
      synergies: this._analyzeSynergies(context.projectedCharacter, option),

      // Target alignment
      targetAlignment: this._analyzeTargetAlignment(context, option),

      // Mentor context
      mentorBias: this._getMentorBias(context.mentorContext?.mentorId, option),

      // Tradeoffs
      tradeoffs: this._analyzeTradeoffs(context, option),

      // Debug notes
      debugNotes: this._generateSuggestionNotes(context, option, rank),
    };
  }

  /**
   * Debug why a template conflicted.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} validationReport - From TemplateValidator
   * @returns {Object} Debug context
   */
  static debugTemplateConflict(session, validationReport) {
    if (!validationReport) {
      return { conflict: false, issues: [] };
    }

    const debug = {
      templateId: session.templateId,
      templateName: session.templateName,
      valid: validationReport.valid,

      conflicts: validationReport.conflicts?.map((c) => ({
        node: c.node,
        current: c.current,
        reason: c.reason,
        analysis: this._analyzeConflictReason(c.reason),
      })) || [],

      invalid: validationReport.invalid?.map((i) => ({
        selection: i.selection,
        reason: i.reason,
        suggestion: i.suggestion,
      })) || [],

      warnings: validationReport.warnings || [],

      // Reconciliation context
      reconciliation: {
        needed: validationReport.reconciliationNeeded,
        dirtyNodes: validationReport.dirtyNodes,
        affectedNodes: this._getAffectedByReconciliation(session),
      },

      // Override history
      overrides: session.auditTrail?.filter((e) => e.type === 'override') || [],

      // Resolution guide
      resolutionGuide: this._generateConflictResolution(validationReport),
    };

    return debug;
  }

  /**
   * Debug why a mutation plan differs from expectation.
   *
   * @param {Object} plan - Mutation plan (from MutationPlan.compile())
   * @param {Object} projection - Projection used (from ProjectionEngine)
   * @param {Actor} baseActor - Original actor
   * @returns {Object} Debug context
   */
  static debugMutationPlan(plan, projection, baseActor) {
    if (!plan) {
      return { error: 'No mutation plan provided' };
    }

    const debug = {
      compiledAt: new Date(plan.compiledAt).toLocaleString(),
      valid: plan.validated,
      validationStatus: plan.validationErrors?.length === 0 ? 'VALID' : 'INVALID',

      // Identity mutations
      identity: {
        species: this._compareMutation(baseActor?.system?.details?.species, plan.mutations?.identity?.species),
        class: this._compareMutation(baseActor?.system?.details?.class, plan.mutations?.identity?.class),
        background: this._compareMutation(baseActor?.system?.details?.background, plan.mutations?.identity?.background),
      },

      // Attribute mutations
      attributes: {
        str: this._compareMutation(baseActor?.system?.attributes?.str?.value, plan.mutations?.attributes?.str),
        dex: this._compareMutation(baseActor?.system?.attributes?.dex?.value, plan.mutations?.attributes?.dex),
        con: this._compareMutation(baseActor?.system?.attributes?.con?.value, plan.mutations?.attributes?.con),
        int: this._compareMutation(baseActor?.system?.attributes?.int?.value, plan.mutations?.attributes?.int),
        wis: this._compareMutation(baseActor?.system?.attributes?.wis?.value, plan.mutations?.attributes?.wis),
        cha: this._compareMutation(baseActor?.system?.attributes?.cha?.value, plan.mutations?.attributes?.cha),
      },

      // Item mutations
      items: {
        totalChanges: plan.mutations?.items?.length || 0,
        additions: plan.mutations?.items?.filter((i) => i.action === 'add') || [],
        updates: plan.mutations?.items?.filter((i) => i.action === 'update') || [],
        removals: plan.mutations?.items?.filter((i) => i.action === 'remove') || [],
      },

      // System mutations
      system: {
        changes: Object.keys(plan.mutations?.system || {}),
        values: plan.mutations?.system || {},
      },

      // Validation status
      validation: {
        errors: plan.validationErrors || [],
        warnings: plan.validationWarnings || [],
      },

      // Parity analysis
      parity: {
        projectionLoaded: !!projection,
        projectionMatches: this._checkProjectionMutationParity(projection, plan),
        projectionDiffs: projection ? this._findProjectionMutationDiffs(projection, plan) : [],
      },
    };

    return debug;
  }

  /**
   * Generate a complete progression debug dump.
   * Useful for comprehensive troubleshooting.
   *
   * @param {ProgressionSession} session - Current session
   * @param {ProgressionShell} shell - Progression shell
   * @returns {string} Formatted debug dump
   */
  static generateCompleteDump(session, shell) {
    const lines = [];

    lines.push('=== COMPLETE PROGRESSION DEBUG DUMP ===');
    lines.push('');

    // Session info
    lines.push('## SESSION STATE');
    lines.push(`Mode: ${session.mode}`);
    lines.push(`Subtype: ${session.subtype}`);
    lines.push(`Current Step: ${session.currentStepId}`);
    lines.push('');

    // Draft selections
    lines.push('## DRAFT SELECTIONS');
    for (const [key, value] of Object.entries(session.draftSelections || {})) {
      const status = value === null ? '❌ UNRESOLVED' : '✅ SET';
      lines.push(`${status} ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
    lines.push('');

    // Active steps
    lines.push('## ACTIVE STEPS');
    lines.push(`Total: ${session.activeSteps?.length || 0}`);
    for (const nodeId of session.activeSteps || []) {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      const label = node?.label || nodeId;
      lines.push(`- ${nodeId} (${label})`);
    }
    lines.push('');

    // Dirty/invalidated nodes
    if (session.dirtyNodes?.size > 0) {
      lines.push('## DIRTY NODES');
      for (const nodeId of session.dirtyNodes) {
        lines.push(`- ${nodeId}`);
      }
      lines.push('');
    }

    // Locked nodes (template)
    if (session.lockedNodes?.size > 0) {
      lines.push('## LOCKED NODES (TEMPLATE)');
      for (const nodeId of session.lockedNodes) {
        lines.push(`- ${nodeId}`);
      }
      lines.push('');
    }

    // Audit trail
    if (session.auditTrail?.length > 0) {
      lines.push('## AUDIT TRAIL');
      for (const event of session.auditTrail) {
        const time = new Date(event.timestamp).toLocaleTimeString();
        lines.push(`${time}: ${event.type} ${event.nodeId}`);
      }
      lines.push('');
    }

    lines.push('=== END DEBUG DUMP ===');

    return lines.join('\n');
  }

  // ========== Private Helper Methods ==========

  static _checkDependencies(session, dependsOn) {
    const completed = new Set(session.completedStepIds || []);
    return dependsOn.every((nodeId) => completed.has(nodeId));
  }

  static _getDownstreamActive(session, nodeId) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node) return [];

    return session.activeSteps?.filter(
      (id) => node.invalidates && id in node.invalidates
    ) || [];
  }

  static _getNodeHistory(session, nodeId) {
    return session.auditTrail?.filter((e) => e.nodeId === nodeId) || [];
  }

  static _findLegalityReasons(context, option) {
    // planned: Check PrerequisiteChecker results
    return [];
  }

  static _scoreSignalMatches(buildSignals, option) {
    // planned: Score how well option matches build signals
    return { score: 0, matches: [] };
  }

  static _analyzeSynergies(projectedCharacter, option) {
    // planned: Check synergies with current selections
    return [];
  }

  static _analyzeTargetAlignment(context, option) {
    // planned: Check alignment with target path
    return { target: null, alignment: 'neutral' };
  }

  static _getMentorBias(mentorId, option) {
    // planned: Look up mentor bias for this option
    return 'neutral';
  }

  static _analyzeTradeoffs(context, option) {
    // planned: Find tradeoffs
    return [];
  }

  static _generateSuggestionNotes(context, option, rank) {
    // planned: Generate human-readable notes
    return [];
  }

  static _analyzeConflictReason(reason) {
    // Parse and categorize conflict reason
    return { category: 'unknown', severity: 'warning', resolution: 'override' };
  }

  static _getAffectedByReconciliation(session) {
    return session.auditTrail
      ?.filter((e) => e.reconciliationApplied)
      .flatMap((e) => e.affectedNodes) || [];
  }

  static _generateConflictResolution(validationReport) {
    // planned: Generate step-by-step resolution guide
    return [];
  }

  static _compareMutation(before, after) {
    return {
      before: before || 'unset',
      after: after || 'unset',
      changed: before !== after,
    };
  }

  static _checkProjectionMutationParity(projection, plan) {
    // planned: Check if projection and plan match
    return true;
  }

  static _findProjectionMutationDiffs(projection, plan) {
    // planned: Find differences
    return [];
  }
}
