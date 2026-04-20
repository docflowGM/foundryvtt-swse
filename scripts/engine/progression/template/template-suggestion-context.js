/**
 * Template Suggestion Context — Phase 5 Work Package F
 *
 * Integrates template package metadata into the advisory system.
 * Extends SuggestionContextAdapter to incorporate template signals.
 *
 * Addresses audit finding: "No advisory for template conflicts — templates bypass
 * suggestion/mentor system. Phase 5 solution: Feed template packages into advisory context."
 *
 * Entry point:
 *   const context = TemplateSuggestionContext.buildTemplateContext(
 *     shell, availableOptions, templateSession
 *   );
 *
 * What It Does:
 * 1. Extracts template signals (archetype, role, mentor, targets)
 * 2. Merges with normal build signals from projection
 * 3. Marks unresolved template nodes as needing suggestions
 * 4. Weights suggestions toward template coherence
 * 5. Includes template package context in mentor output
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { BuildSignalsNormalizer } from '/systems/foundryvtt-swse/scripts/engine/progression/forecast/build-signals-normalizer.js';

export class TemplateSuggestionContext {
  /**
   * Build suggestion context for template mode.
   * Incorporates template signals into the advisory system.
   *
   * @param {ProgressionShell} shell - Current progression shell
   * @param {Array<Object>} availableOptions - Legal options for current node
   * @param {ProgressionSession} templateSession - Template session with signals
   * @returns {Object} Context ready for suggestion engines
   */
  static buildTemplateContext(shell, availableOptions, templateSession) {
    const context = {
      mode: templateSession.mode || 'chargen',
      subtype: templateSession.subtype || 'actor',
      currentStepId: shell.currentStepId || null,
      currentNodeId: null, // Will be mapped from step ID

      progressionSession: templateSession,
      projectedCharacter: shell.projectionEngine?.buildProjection?.(
        templateSession,
        shell.actor
      ) || null,

      // Template-specific context
      isTemplateMode: true,
      templateId: templateSession.templateId,
      templateName: templateSession.templateName,
      templateSignals: templateSession.templateSignals || {
        explicit: { archetypeTags: [], roleTags: [], mentorTags: [] },
        inferred: { archetypeTags: [], roleTags: [] },
      },

      // Legal options and visibility
      legalOptions: availableOptions || [],
      visibleOptions: availableOptions || [],

      // Forecast map (will be populated by ForecastEngine)
      forecastByOption: {},

      // Build signals (merged from template + projection)
      buildSignals: this._extractTemplateSignals(templateSession),

      // Constraints specific to template nodes
      constraints: this._extractTemplateConstraints(templateSession),

      // Mentor context enhanced with template metadata
      mentorContext: {
        templateId: templateSession.templateId,
        templateName: templateSession.templateName,
        mentorId: templateSession.advisoryContext?.mentorId || 'ol-salty',
        templateMentor: this._getTemplateMentorContext(templateSession),
        packageContext: this._buildTemplatePackageContext(templateSession),
      },
    };

    swseLogger.debug('[TemplateSuggestionContext] Built template context', {
      templateId: context.templateId,
      legalCount: context.legalOptions.length,
      mentorId: context.mentorContext.mentorId,
    });

    return context;
  }

  /**
   * Extract build signals from template, merged with projection-inferred signals.
   *
   * @private
   */
  static _extractTemplateSignals(templateSession) {
    // Start with existing template signals
    const explicit = templateSession.templateSignals?.explicit || {
      archetypeTags: [],
      roleTags: [],
      mentorTags: [],
      targetTags: [],
    };

    const inferred = templateSession.templateSignals?.inferred || {
      archetypeTags: [],
      roleTags: [],
      combatStyleTags: [],
    };

    // Build normalized signals object
    return {
      explicit: {
        archetypeTags: explicit.archetypeTags || [],
        roleTags: explicit.roleTags || [],
        targetTags: explicit.targetTags || [],
        mentorTags: explicit.mentorTags || [],
        surveyAnswers: {},
      },
      inferred: {
        archetypeTags: inferred.archetypeTags || [],
        roleTags: inferred.roleTags || [],
        combatStyleTags: inferred.combatStyleTags || [],
        forceTags: inferred.forceTags || [],
        shipTags: inferred.shipTags || [],
        droidTags: inferred.droidTags || [],
        socialTags: inferred.socialTags || [],
      },
      targets: {
        prestige: explicit.targetTags || [],
        talentTrees: [],
        forceDomains: [],
        shipSpecialties: [],
      },
    };
  }

  /**
   * Extract constraints specific to template mode.
   *
   * @private
   */
  static _extractTemplateConstraints(templateSession) {
    return {
      // Unresolved nodes (null selections from template)
      unresolvedNodes: this._findUnresolvedNodes(templateSession),

      // Dirty nodes (marked by validation)
      dirtyNodes: Array.from(templateSession.dirtyNodes || new Set()),

      // Locked nodes (cannot be changed)
      lockedNodes: Array.from(templateSession.lockedNodes || new Set()),

      // Nodes with validation conflicts
      conflictNodes: this._findConflictNodes(templateSession),

      // Nodes requiring reconciliation
      reconciliationNeeded: templateSession.reconciliationNeeded || false,
    };
  }

  /**
   * Find unresolved nodes (null draftSelections).
   * These are where player needs to make decisions or accept template suggestions.
   *
   * @private
   */
  static _findUnresolvedNodes(templateSession) {
    const unresolved = [];

    for (const [key, value] of Object.entries(templateSession.draftSelections || {})) {
      // Null or empty array = unresolved
      if (value === null || (Array.isArray(value) && value.length === 0)) {
        unresolved.push(key);
      }
    }

    return unresolved;
  }

  /**
   * Find nodes with validation conflicts.
   * From validator report (if available).
   *
   * @private
   */
  static _findConflictNodes(templateSession) {
    if (!templateSession.validationReport) {
      return [];
    }

    const conflictMap = {};
    for (const conflict of templateSession.validationReport.conflicts || []) {
      conflictMap[conflict.node] = conflict.reason;
    }

    return Object.keys(conflictMap);
  }

  /**
   * Get mentor context from template.
   * Mentor may be specified in template metadata.
   *
   * @private
   */
  static _getTemplateMentorContext(templateSession) {
    const mentorId = templateSession.advisoryContext?.mentorId ||
      templateSession.templateSignals?.explicit?.mentorTags?.[0] ||
      'ol-salty';

    return {
      mentorId,
      mentorName: this._getMentorName(mentorId),
      packageContext: `Guiding your ${templateSession.templateName || 'character'} build`,
    };
  }

  /**
   * Map mentor ID to display name.
   * planned: Wire to mentor registry.
   *
   * @private
   */
  static _getMentorName(mentorId) {
    const names = {
      'miraj': 'Miraj',
      'obi-wan': 'Obi-Wan Kenobi',
      'yoda': 'Yoda',
      'palpatine': 'Palpatine',
      'ol-salty': 'Ol Salty',
    };

    return names[mentorId] || 'Mentor';
  }

  /**
   * Build template package context for mentor output.
   *
   * @private
   */
  static _buildTemplatePackageContext(templateSession) {
    return {
      templateId: templateSession.templateId,
      templateName: templateSession.templateName,
      archetypeFromTemplate: templateSession.templateSignals?.explicit?.archetypeTags?.[0] || null,
      roleFromTemplate: templateSession.templateSignals?.explicit?.roleTags?.[0] || null,
      prestigeTarget: templateSession.templateSignals?.explicit?.targetTags?.[0] || null,
      summary: this._buildTemplateSummary(templateSession),
    };
  }

  /**
   * Build human-readable template summary for mentor.
   *
   * @private
   */
  static _buildTemplateSummary(templateSession) {
    const parts = [];

    if (templateSession.templateName) {
      parts.push(`This is the ${templateSession.templateName} template`);
    }

    const archetype = templateSession.templateSignals?.explicit?.archetypeTags?.[0];
    if (archetype) {
      parts.push(`designed for a ${archetype}`);
    }

    const role = templateSession.templateSignals?.explicit?.roleTags?.[0];
    if (role) {
      parts.push(`with a ${role} role`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Custom template build';
  }

  /**
   * Generate suggestions for unresolved template nodes.
   * Called when an unresolved node is reached during traversal.
   *
   * @param {ProgressionSession} templateSession - Template session
   * @param {string} nodeId - Current unresolved node
   * @param {Array<Object>} availableOptions - Legal options
   * @returns {Object} Suggestion context for this node
   */
  static buildSuggestionForUnresolvedNode(templateSession, nodeId, availableOptions) {
    return {
      nodeId,
      unresolvedReason: `This choice is not specified by the ${templateSession.templateName || 'template'}`,
      suggestion: `Choose an option that fits your build style`,
      context: {
        templateName: templateSession.templateName,
        templateArchetype: templateSession.templateSignals?.explicit?.archetypeTags?.[0],
        templateRole: templateSession.templateSignals?.explicit?.roleTags?.[0],
        availableOptions,
      },
    };
  }

  /**
   * Generate reconciliation suggestion for dirty/conflicted nodes.
   * Called when a dirty node is reached.
   *
   * @param {ProgressionSession} templateSession - Template session
   * @param {string} nodeId - Dirty node
   * @param {Object} conflict - Conflict details (from validator)
   * @returns {Object} Reconciliation context
   */
  static buildReconciliationSuggestion(templateSession, nodeId, conflict) {
    return {
      nodeId,
      conflictReason: conflict?.reason || 'This template selection may not be compatible',
      options: [
        {
          action: 'accept',
          text: `Accept the template suggestion anyway`,
          consequence: 'May cause issues downstream',
        },
        {
          action: 'override',
          text: `Choose something different`,
          consequence: 'Will mark downstream nodes for review',
        },
        {
          action: 'skip',
          text: `Skip this for now`,
          consequence: 'Unresolved (must resolve before completion)',
        },
      ],
    };
  }

  /**
   * Score how well an option fits the template.
   * Used to weight suggestions toward template coherence.
   *
   * @param {ProgressionSession} templateSession - Template session
   * @param {Object} option - Option to score
   * @param {string} nodeId - Node context
   * @returns {number} Fit score (0-10)
   */
  static scoreOptionFitForTemplate(templateSession, option, nodeId) {
    let score = 0;

    // Bonus if option matches template archetype
    const archetype = templateSession.templateSignals?.explicit?.archetypeTags?.[0];
    if (archetype && this._optionMatchesArchetype(option, archetype)) {
      score += 3;
    }

    // Bonus if option matches template role
    const role = templateSession.templateSignals?.explicit?.roleTags?.[0];
    if (role && this._optionMatchesRole(option, role)) {
      score += 2;
    }

    // Bonus if option matches template prestige target
    const target = templateSession.templateSignals?.explicit?.targetTags?.[0];
    if (target && this._optionUnlocksTarget(option, target)) {
      score += 5;
    }

    return Math.min(10, score);
  }

  /**
   * Check if option matches archetype.
   * @private
   */
  static _optionMatchesArchetype(option, archetype) {
    // planned: Wire to archetype matching logic
    // For now, just check option tags
    return option.tags?.includes(archetype) || false;
  }

  /**
   * Check if option matches role.
   * @private
   */
  static _optionMatchesRole(option, role) {
    // planned: Wire to role matching logic
    return option.tags?.includes(role) || false;
  }

  /**
   * Check if option unlocks prestige target.
   * @private
   */
  static _optionUnlocksTarget(option, target) {
    // planned: Wire to prestige path logic
    return option.prestigePath?.includes(target) || false;
  }
}
