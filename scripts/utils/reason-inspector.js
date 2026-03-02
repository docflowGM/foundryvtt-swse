/**
 * Reason Inspector - Developer Utility
 *
 * Provides debugging tools for inspecting suggestions and their reasons.
 * Use in browser console: game.swse.inspector.inspect(actor, 'feats')
 *
 * Useful for understanding:
 * - Why a suggestion has a particular tier
 * - Which reasons are being shown/hidden
 * - How reason filtering and weighting works
 * - Detecting conflicts or duplicate reasons
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ReasonFactory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonFactory.js";

export class ReasonInspector {
  /**
   * Inspect suggestions for an actor in a domain
   * @param {Actor} actor
   * @param {string} domain - 'feats', 'talents', 'classes', etc.
   * @param {Object} options - { focus, verbose }
   */
  static async inspect(actor, domain = 'feats', options = {}) {
    try {
      const { focus = null, verbose = false } = options;
      const { getSuggestions } = game.swse?.suggestions || {};

      if (!getSuggestions) {
        console.error('[ReasonInspector] game.swse.suggestions not initialized');
        return null;
      }

      console.group(`=== Reason Inspector: ${actor.name} (${domain}) ===`);

      // Get suggestions
      const suggestions = await getSuggestions(actor, 'debug', {
        domain,
        focus,
        persist: false
      });

      console.log(`Found ${suggestions.length} ${domain}`);

      // Report on each suggestion
      for (const suggestion of suggestions.slice(0, 10)) {
        this._inspectSuggestion(suggestion, verbose);
      }

      console.groupEnd();
      return suggestions;
    } catch (err) {
      console.error('[ReasonInspector] Error:', err);
      return null;
    }
  }

  /**
   * Inspect a single suggestion
   * @private
   */
  static _inspectSuggestion(suggestion, verbose = false) {
    const tier = suggestion?.suggestion?.tier ?? 0;
    const name = suggestion?.name || suggestion?.label || 'Unknown';

    console.group(`${name} (Tier ${tier})`);

    // Show basic suggestion metadata
    if (suggestion?.suggestion) {
      console.log('Suggestion:', {
        tier: suggestion.suggestion.tier,
        reason: suggestion.suggestion.reason,
        confidence: suggestion.suggestion.confidence,
        isSuggested: suggestion.suggestion.isSuggested
      });
    }

    // Show reasons
    if (Array.isArray(suggestion.reasons) && suggestion.reasons.length > 0) {
      console.group(`Reasons (${suggestion.reasons.length})`);
      for (const reason of suggestion.reasons) {
        this._inspectReason(reason, verbose);
      }
      console.groupEnd();
    } else {
      console.log('Reasons: None');
    }

    // Detect conflicts
    const conflicts = ReasonFactory.detectConflicts(suggestion.reasons ?? []);
    if (conflicts.length > 0) {
      console.warn(`Conflicts detected:`, conflicts.map(c => `${c.code1} vs ${c.code2}`));
    }

    console.groupEnd();
  }

  /**
   * Inspect a single reason
   * @private
   */
  static _inspectReason(reason, verbose = false) {
    if (!reason) {
      console.log('(null reason)');
      return;
    }

    console.log(`[${reason.domain}] ${reason.code}`, {
      text: reason.text,
      safe: reason.safe,
      strength: reason.strength,
      relevanceScore: reason.relevanceScore,
      atoms: reason.atoms?.length ? reason.atoms : 'none'
    });

    if (verbose && reason.atoms?.length > 0) {
      console.log(`  Mentor atoms: ${reason.atoms.join(', ')}`);
    }
  }

  /**
   * Compare suggestions across different focus contexts
   * Shows how reasons change with different focuses
   * @param {Actor} actor
   * @param {string} domain
   */
  static async compareFocuses(actor, domain = 'feats') {
    try {
      console.group(`=== Focus Comparison: ${actor.name} (${domain}) ===`);

      const FOCUSES = ['skills', 'feats', 'classes', 'talents', 'attributes'];

      // Get one suggestion per focus to show how it changes
      const results = {};

      for (const focus of FOCUSES) {
        try {
          const sug = await game.swse.suggestions.getSuggestions(actor, 'debug', {
            domain,
            focus,
            persist: false
          });

          if (sug.length > 0) {
            const first = sug[0];
            results[focus] = {
              name: first.name,
              reasonCount: first.reasons?.length ?? 0,
              reasons: first.reasons?.map(r => ({
                code: r.code,
                domain: r.domain,
                relevance: r.relevanceScore
              })) ?? []
            };
          }
        } catch (e) {
          results[focus] = { error: e.message };
        }
      }

      console.table(results);
      console.groupEnd();
      return results;
    } catch (err) {
      console.error('[ReasonInspector] Error:', err);
    }
  }

  /**
   * Analyze reason distribution across all suggestions
   * @param {Array} suggestions
   */
  static analyzeReasonDistribution(suggestions) {
    if (!Array.isArray(suggestions)) {
      console.error('Expected array of suggestions');
      return null;
    }

    const distribution = {
      totalSuggestions: suggestions.length,
      totalReasons: 0,
      reasonsByDomain: {},
      reasonsByCode: {},
      safeCount: 0,
      unsafeCount: 0,
      strengthDistribution: { weak: 0, moderate: 0, strong: 0 }
    };

    for (const sug of suggestions) {
      const reasons = sug.reasons ?? [];
      distribution.totalReasons += reasons.length;

      for (const reason of reasons) {
        // By domain
        if (reason.domain) {
          distribution.reasonsByDomain[reason.domain] =
            (distribution.reasonsByDomain[reason.domain] ?? 0) + 1;
        }

        // By code
        if (reason.code) {
          distribution.reasonsByCode[reason.code] =
            (distribution.reasonsByCode[reason.code] ?? 0) + 1;
        }

        // Safety
        if (reason.safe !== false) {
          distribution.safeCount++;
        } else {
          distribution.unsafeCount++;
        }

        // Strength
        const str = reason.strength ?? 0;
        if (str < 0.6) {distribution.strengthDistribution.weak++;} else if (str < 0.8) {distribution.strengthDistribution.moderate++;} else {distribution.strengthDistribution.strong++;}
      }
    }

    console.group('Reason Distribution Analysis');
    console.table(distribution);
    console.groupEnd();

    return distribution;
  }

  /**
   * Export suggestions as JSON for analysis
   * @param {Array} suggestions
   * @returns {string} JSON string
   */
  static exportAsJSON(suggestions) {
    const cleaned = suggestions.map(s => ({
      name: s.name,
      tier: s.suggestion?.tier,
      reason: s.suggestion?.reason,
      reasons: s.reasons?.map(r => ({
        domain: r.domain,
        code: r.code,
        text: r.text,
        safe: r.safe,
        strength: r.strength,
        relevanceScore: r.relevanceScore
      }))
    }));

    return JSON.stringify(cleaned, null, 2);
  }
}

// Make inspector available globally for easy debugging
if (globalThis.game?.swse) {
  game.swse.inspector = ReasonInspector;
  console.log('[ReasonInspector] Available at: game.swse.inspector');
}
