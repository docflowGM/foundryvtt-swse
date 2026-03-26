/**
 * BuildAnalysisIntegration - L1 Survey Analysis Display
 *
 * Implements Phase 9 (relabeled Phase 4) of the chargen architecture gap fix sequence.
 * Addresses Gap #6: Build Analysis Not Triggered on Selections
 *
 * Architecture:
 * - Runs BuildAnalysisEngine during L1 Survey step entry
 * - Analyzes complete build state (from buildIntent)
 * - Displays conflict signals and strength signals to player
 * - Provides mentor feedback on build coherence
 * - Suggests archetype alignment based on selections
 *
 * Integration Points:
 * - L1 Survey step runs analysis on enter
 * - Results cached and displayed in mentor feedback
 * - Conflict signals shown as warnings/concerns
 * - Strength signals shown as compliments/suggestions
 * - Archetype alignment displayed if detected
 */

import { BuildAnalysisEngine } from '/systems/foundryvtt-swse/scripts/engine/analysis/build-analysis-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class BuildAnalysisIntegration {
  /**
   * Run build analysis and generate mentor feedback.
   * Called by L1 Survey step to analyze accumulated selections.
   *
   * @param {ProgressionShell} shell - The progression shell
   * @returns {Promise<Object>} Analysis result with analysis data and mentor feedback
   */
  static async analyzeAndProvideFeedback(shell) {
    if (!shell?.actor) {
      swseLogger.warn('[BuildAnalysisIntegration] Cannot analyze: no actor');
      return null;
    }

    try {
      // Run BuildAnalysisEngine on current actor state
      const analysis = await BuildAnalysisEngine.analyze(shell.actor);

      swseLogger.log('[BuildAnalysisIntegration] Build analysis complete', {
        conflictCount: analysis.conflictSignals?.length || 0,
        strengthCount: analysis.strengthSignals?.length || 0,
        hasArchetype: !!analysis.archetype,
      });

      // Generate mentor feedback based on analysis
      const feedback = this._generateMentorFeedback(analysis);

      // Detect emergent archetype if not explicitly set
      const emergentArchetype = await this._detectEmergentArchetype(shell.actor);

      return {
        analysis,
        feedback,
        emergentArchetype,
      };
    } catch (err) {
      swseLogger.error('[BuildAnalysisIntegration] Analysis failed:', err);
      return null;
    }
  }

  /**
   * Get summary of conflicts for display in details panel.
   * @param {Object} analysis - Analysis result from analyzeAndProvideFeedback
   * @returns {Object} Summary with key issues and recommendations
   */
  static getConflictSummary(analysis) {
    if (!analysis?.analysis) return null;

    const signals = analysis.analysis.conflictSignals || [];
    if (signals.length === 0) return null;

    // Group by severity
    const bySeverity = {};
    signals.forEach(signal => {
      if (!bySeverity[signal.severity]) {
        bySeverity[signal.severity] = [];
      }
      bySeverity[signal.severity].push(signal);
    });

    return {
      totalConflicts: signals.length,
      critical: bySeverity['critical'] || [],
      important: bySeverity['important'] || [],
      minor: bySeverity['minor'] || [],
      hasCritical: (bySeverity['critical']?.length || 0) > 0,
    };
  }

  /**
   * Get summary of strengths for display.
   * @param {Object} analysis - Analysis result
   * @returns {Object} Summary with key strengths
   */
  static getStrengthSummary(analysis) {
    if (!analysis?.analysis) return null;

    const signals = analysis.analysis.strengthSignals || [];
    if (signals.length === 0) return null;

    return {
      totalStrengths: signals.length,
      signals: signals.slice(0, 3), // Top 3 strengths
      hasStrengths: signals.length > 0,
    };
  }

  /**
   * Generate mentor feedback based on analysis results.
   * @private
   */
  static _generateMentorFeedback(analysis) {
    const lines = [];
    const conflicts = analysis.conflictSignals || [];
    const strengths = analysis.strengthSignals || [];

    if (conflicts.length === 0 && strengths.length > 0) {
      lines.push('✓ Your build shows strong coherence!');
      if (strengths.length > 0) {
        lines.push(`\nKey strengths:`);
        strengths.slice(0, 2).forEach(s => {
          lines.push(`  • ${s.category}: ${s.id}`);
        });
      }
      return lines.join('\n');
    }

    if (conflicts.length > 0) {
      lines.push('⚠️ Build has some considerations:');

      // Group conflicts by severity
      const critical = conflicts.filter(c => c.severity === 'critical');
      const important = conflicts.filter(c => c.severity === 'important');

      if (critical.length > 0) {
        lines.push('\nCritical issues:');
        critical.slice(0, 2).forEach(c => {
          lines.push(`  • ${c.category}: ${c.id}`);
        });
      }

      if (important.length > 0) {
        lines.push('\nConsiderations:');
        important.slice(0, 2).forEach(c => {
          lines.push(`  • ${c.category}`);
        });
      }

      if (conflicts.length > 3) {
        lines.push(`\n+ ${conflicts.length - 3} more issue(s)`);
      }

      if (strengths.length > 0) {
        lines.push('\nBuild strengths:');
        strengths.slice(0, 1).forEach(s => {
          lines.push(`  • ${s.category}`);
        });
      }

      return lines.join('\n');
    }

    // No conflicts, no strengths
    lines.push('Your build is developing. Continue making selections to see analysis.');
    return lines.join('\n');
  }

  /**
   * Detect emergent archetype from current selections.
   * @private
   */
  static async _detectEmergentArchetype(actor) {
    try {
      const result = await BuildAnalysisEngine.detectEmergentArchetype(actor, 60);

      if (result.bestMatch) {
        swseLogger.log('[BuildAnalysisIntegration] Emergent archetype detected', {
          archetypeId: result.bestMatch,
          confidence: result.confidence,
        });
      }

      return result;
    } catch (err) {
      swseLogger.warn('[BuildAnalysisIntegration] Failed to detect emergent archetype:', err);
      return null;
    }
  }

  /**
   * Format analysis for detailed display.
   * Useful for a detailed analysis modal or panel.
   * @param {Object} analysis - Analysis result
   * @returns {string} Formatted report
   */
  static formatDetailedReport(analysis) {
    if (!analysis?.analysis) return 'No analysis available';

    const lines = [];
    const a = analysis.analysis;

    lines.push(`# Build Analysis Report`);
    lines.push(`Character: ${a.actorName || 'Unknown'}`);
    lines.push(`Analyzed: ${new Date(a.timestamp).toLocaleString()}`);

    if (a.archetype) {
      lines.push(`\n## Archetype: ${a.archetype}`);
    }

    if (a.conflictSignals && a.conflictSignals.length > 0) {
      lines.push(`\n## Conflicts (${a.conflictSignals.length})`);
      a.conflictSignals.forEach(signal => {
        const severity = signal.severity ? `[${signal.severity.toUpperCase()}]` : '';
        lines.push(`- ${signal.id} ${severity}`);
        if (signal.evidence) {
          lines.push(`  Evidence: ${signal.evidence}`);
        }
      });
    }

    if (a.strengthSignals && a.strengthSignals.length > 0) {
      lines.push(`\n## Strengths (${a.strengthSignals.length})`);
      a.strengthSignals.forEach(signal => {
        lines.push(`- ${signal.id} (${signal.strength})`);
        if (signal.evidence) {
          lines.push(`  Evidence: ${signal.evidence}`);
        }
      });
    }

    if (a.summary) {
      lines.push(`\n## Summary`);
      lines.push(a.summary);
    }

    return lines.join('\n');
  }
}
