/**
 * MENTOR ADVISORY BRIDGE
 *
 * Transforms BuildAnalysisEngine signals into mentor-ready format.
 * Creates the clean interface between analysis layer and mentor system.
 *
 * NOT integrated into mentor yet—design only.
 * Mentor integration deferred until explicit request.
 */

export class MentorAdvisoryBridge {
  /**
   * Severity level to mentor intensity mapping
   */
  static SEVERITY_TO_INTENSITY = {
    high: 'CRITICAL',    // High priority, immediate attention needed
    medium: 'IMPORTANT',  // Core issue, should be addressed
    low: 'SUBTLE'         // Optimization, nice-to-have
  };

  /**
   * Signal category to mentor reason atom mapping
   * Maps BuildAnalysis trends → mentor narrative atoms
   */
  static SIGNAL_TO_REASON_ATOM = {
    // Attribute Priority
    'ATTR_PRIORITY_priority_STR': 'STAT_MISMATCH',
    'ATTR_PRIORITY_priority_DEX': 'STAT_MISMATCH',
    'ATTR_PRIORITY_priority_CON': 'STAT_MISMATCH',
    'ATTR_PRIORITY_priority_INT': 'STAT_MISMATCH',
    'ATTR_PRIORITY_priority_WIS': 'STAT_MISMATCH',
    'ATTR_PRIORITY_priority_CHA': 'STAT_MISMATCH',

    // Role Expectation
    'ROLE_EXPECTATION_offense': 'ROLE_DEVIATION',
    'ROLE_EXPECTATION_defense': 'ROLE_DEVIATION',
    'ROLE_EXPECTATION_support': 'ROLE_DEVIATION',
    'ROLE_EXPECTATION_utility': 'ROLE_DEVIATION',

    // Prestige Preparation
    'PRESTIGE_PREP_*': 'PRESTIGE_STALL',

    // Recommended Features
    'RECOMMENDED_FEATURE_MISSING': 'FEAT_TALENT_GAP',

    // Skill Investment
    'SKILL_INVESTMENT_ALIGNMENT': 'SKILL_MISALIGNMENT',
    'SKILL_FOCUS_VS_BREADTH': 'SKILL_PATTERN',

    // Role-Stat Consistency
    'ROLE_STAT_CONSISTENCY': 'BUILD_INCOHERENCE',

    // Specialization
    'SPECIALIZATION_*': 'FOCUS_DRIFT',

    // Feature Chains
    'FEATURE_CHAIN_PROGRESSION': 'CHAIN_INCOMPLETE',

    // Force Engagement
    'FORCE_ENGAGEMENT_EXPECTATION': 'FORCE_UNDERINVESTMENT',
    'NON_FORCE_FOCUS_CONSISTENCY': 'FORCE_OVERINVESTMENT',

    // Defense/Offense
    'DEFENSE_ROLE_CONSISTENCY': 'DEFENSE_INADEQUATE',
    'OFFENSE_ROLE_CONSISTENCY': 'OFFENSE_WEAK'
  };

  /**
   * Convert BuildAnalysisEngine signal to mentor-ready payload
   * @param {Object} signal - ConflictSignal or StrengthSignal from BuildAnalysisEngine
   * @returns {Object} Mentor advisory payload
   */
  static signalToAdvisory(signal) {
    const intensity = this.SEVERITY_TO_INTENSITY[signal.severity] || 'IMPORTANT';
    const reasonAtom = this._resolveReasonAtom(signal.id);

    return {
      id: `advisory_${signal.id}`,
      type: 'build-analysis',
      intensity,
      reasonAtom,
      evidence: signal.evidence,
      category: signal.category,
      originalSignalId: signal.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Convert analysis result to mentor decision input
   * @param {Object} analysisResult - Output from BuildAnalysisEngine.analyze()
   * @returns {Object} Mentor input object
   */
  static analysisToMentorInput(analysisResult) {
    const advisories = [];

    // Convert conflict signals
    for (const conflict of analysisResult.conflictSignals) {
      advisories.push(
        this.signalToAdvisory({
          ...conflict,
          severity: conflict.severity
        })
      );
    }

    // Strength signals could be used for positive reinforcement
    // Currently deferred—mentor doesn't need strength signals yet
    const strengths = analysisResult.strengthSignals.map(s => ({
      type: 'strength',
      category: s.category,
      evidence: s.evidence
    }));

    return {
      source: 'BuildAnalysisEngine',
      actor: {
        id: analysisResult.actorId,
        name: analysisResult.actorName,
        archetype: analysisResult.archetype
      },
      metrics: analysisResult.metrics,
      advisories,
      strengths,
      buildCohesion: this._assessCohesion(analysisResult.metrics),
      timestamp: analysisResult.timestamp
    };
  }

  /**
   * Assess overall build cohesion from metrics
   * @private
   */
  static _assessCohesion(metrics) {
    const avgScore =
      (metrics.archetypeAlignmentScore +
        metrics.statFocusConsistencyScore +
        metrics.buildCoherence) /
      3;

    if (avgScore >= 80) return 'EXCELLENT';
    if (avgScore >= 65) return 'GOOD';
    if (avgScore >= 50) return 'FAIR';
    return 'POOR';
  }

  /**
   * Resolve reason atom from signal ID
   * Handles wildcard patterns for dynamic trends
   * @private
   */
  static _resolveReasonAtom(signalId) {
    // Direct match
    if (this.SIGNAL_TO_REASON_ATOM[signalId]) {
      return this.SIGNAL_TO_REASON_ATOM[signalId];
    }

    // Pattern match: SPECIALIZATION_*
    if (signalId.startsWith('SPECIALIZATION_')) {
      return this.SIGNAL_TO_REASON_ATOM['SPECIALIZATION_*'];
    }

    // Pattern match: ROLE_EXPECTATION_*
    if (signalId.startsWith('ROLE_EXPECTATION_')) {
      return this.SIGNAL_TO_REASON_ATOM['ROLE_EXPECTATION_offense'];
    }

    // Pattern match: PRESTIGE_PREP_*
    if (signalId.startsWith('PRESTIGE_PREP_')) {
      return this.SIGNAL_TO_REASON_ATOM['PRESTIGE_PREP_*'];
    }

    // Fallback
    return 'BUILD_DRIFT';
  }

  /**
   * Design reference: How mentor would invoke analysis
   * (NOT implemented yet—for documentation)
   */
  static MENTOR_INVOCATION_DESIGN = {
    phase: 'Character Progression Evaluation',
    trigger: 'When mentor evaluates character after level-up or major change',
    pseudocode: `
      // In MentorResolver or similar decision point:
      async function evaluateCharacterCohesion(actor) {
        // Call analysis engine
        const analysis = await BuildAnalysisEngine.analyze(actor);

        // Convert to mentor input
        const mentorInput = MentorAdvisoryBridge.analysisToMentorInput(analysis);

        // Add to mentor decision context
        mentorContext.buildAnalysis = mentorInput;

        // Mentor decision logic then considers:
        // - mentorContext.buildAnalysis.advisories
        // - mentorContext.buildAnalysis.metrics
        // - mentorContext.buildAnalysis.buildCohesion

        // Mentor generates appropriate dialogue based on cohesion level
      }
    `,
    constraints: [
      'Analysis is read-only—no state mutation',
      'Mentor can decide to use or ignore analysis',
      'Analysis never directly influences suggestion engine',
      'Analysis serves advisory/narrative purpose only'
    ]
  };

  /**
   * Validation helper: Verify all signal IDs are mapped
   */
  static validateMapping(signalIds) {
    const unmapped = [];
    for (const id of signalIds) {
      if (!this.SIGNAL_TO_REASON_ATOM[id] &&
          !id.startsWith('SPECIALIZATION_') &&
          !id.startsWith('ROLE_EXPECTATION_') &&
          !id.startsWith('PRESTIGE_PREP_') &&
          !id.startsWith('ATTR_PRIORITY_')) {
        unmapped.push(id);
      }
    }

    return {
      complete: unmapped.length === 0,
      unmapped
    };
  }

  /**
   * Provide mapping statistics
   */
  static getMappingStats() {
    return {
      directMappings: Object.keys(this.SIGNAL_TO_REASON_ATOM).filter(
        k => !k.includes('*')
      ).length,
      patternMappings: Object.keys(this.SIGNAL_TO_REASON_ATOM).filter(
        k => k.includes('*')
      ).length,
      severityLevels: Object.keys(this.SEVERITY_TO_INTENSITY).length,
      readiness: 'DESIGN COMPLETE - AWAITING MENTOR SYSTEM INTEGRATION'
    };
  }
}
