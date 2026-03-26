/**
 * DroidSuggestionEngine — Phase D
 *
 * Provides grounded droid system recommendations based on:
 * - Class/archetype compatibility (soldier droids need heavy locomotion, scholars need processors)
 * - Available budget (don't suggest expensive systems if budget is low)
 * - Role coherence (scout droids prefer speed, tank droids prefer weight/armor)
 * - Droid degree constraints (1st-degree has limited budget, 4th-degree has more)
 * - Mentor bias and player history
 *
 * Features:
 * - Two modes: 'preview' (provisional) and 'final' (finalized)
 * - Preview mode: Suggests optimal systems within budget
 * - Final mode: Suggests budget-efficiency and overflow handling
 * - Returns suggestions with confidence scores and reasons
 * - Grounded in real droid constraints (size, degree, budget)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";

/**
 * Confidence scoring tiers for droid system suggestions
 */
const DROID_CONFIDENCE_TIERS = {
  OPTIMAL_BUDGET: 0.90,          // System uses remaining budget well
  CLASS_SYNERGY: 0.85,            // Aligns with class role
  ROLE_COHERENCE: 0.80,           // Supports chosen droid archetype
  WEIGHT_EFFICIENT: 0.75,         // Good weight-to-cost ratio
  FUNCTIONAL_OPTION: 0.65,        // Valid but not optimized
  BUDGET_OVERFLOW_MANAGED: 0.60,  // Overflow setting allows it
  FALLBACK: 0.50,                 // Last resort option
};

/**
 * Class-to-droid-role mapping
 * Maps character classes to preferred droid system characteristics
 */
const CLASS_DROID_SYNERGIES = {
  'soldier': { locomotion: 'heavy', speed: 'low', chassis: 'tank' },
  'scout': { locomotion: 'fast', speed: 'high', chassis: 'swift' },
  'scoundrel': { locomotion: 'agile', speed: 'medium', chassis: 'stealth' },
  'jedi': { locomotion: 'balanced', speed: 'medium', chassis: 'balanced' },
  'noble': { locomotion: 'balanced', speed: 'medium', chassis: 'support' },
  'force-adept': { locomotion: 'balanced', speed: 'medium', chassis: 'balanced' },
  'tech-specialist': { locomotion: 'balanced', speed: 'medium', chassis: 'utility' },
};

export class DroidSuggestionEngine {
  /**
   * Suggest droid systems based on class, budget, and character context.
   *
   * @param {Array} availableSystems - Droid systems from DROID_SYSTEMS
   * @param {Actor} actor - Character actor (droid)
   * @param {Object} pendingData - Accumulated selections: {selectedClass, selectedDroidDegree, droidBudget, ...}
   * @param {Object} options - Engine options: {mode: 'preview'|'final', debug, allowOverflow}
   * @returns {Promise<Array>} Suggestions for systems in different categories
   */
  static async suggestDroidSystems(availableSystems = {}, actor, pendingData = {}, options = {}) {
    try {
      if (!actor || !actor.system?.isDroid) return [];

      const mode = options.mode || 'preview';  // 'preview' for provisional, 'final' for finalized
      const trace = options.debug ?? false;
      const allowOverflow = options.allowOverflow ?? false;

      // Extract droid context
      const selectedClass = pendingData.selectedClass || this._getCurrentClass(actor);
      const className = selectedClass?.name;
      const droidDegree = pendingData.droidDegree || actor.system?.droidDegree || '1st-degree';
      const droidSize = pendingData.droidSize || actor.system?.droidSize || 'medium';
      const budgetInfo = pendingData.droidBudget || {
        base: 1000,
        spent: 0,
        remaining: 1000,
        allowOverflow: allowOverflow
      };

      if (trace) {
        SWSELogger.log('[DroidSuggestionEngine] Suggestions requested', {
          actor: actor.name,
          className,
          degree: droidDegree,
          size: droidSize,
          budget: budgetInfo,
          mode,
        });
      }

      // Get class synergy data
      const classSynergy = CLASS_DROID_SYNERGIES[className?.toLowerCase()] || CLASS_DROID_SYNERGIES['soldier'];

      // Suggest for each system category
      const suggestions = {
        locomotion: this._suggestLocomotion(availableSystems.locomotion || [], classSynergy, budgetInfo, { trace, mode }),
        processor: this._suggestProcessor(availableSystems.processors || [], budgetInfo, { trace, mode }),
        appendages: this._suggestAppendages(availableSystems.appendages || [], budgetInfo, { trace, mode }),
        accessories: this._suggestAccessories(availableSystems.accessories || {}, budgetInfo, { trace, mode }),
      };

      if (trace) {
        SWSELogger.log('[DroidSuggestionEngine] Suggestions computed', {
          locomotionCount: suggestions.locomotion.length,
          processorCount: suggestions.processor.length,
          appendageCount: suggestions.appendages.length,
          accessoryCount: Object.values(suggestions.accessories || {}).reduce((sum, arr) => sum + arr.length, 0),
        });
      }

      return suggestions;
    } catch (err) {
      SWSELogger.error('[DroidSuggestionEngine] Error:', err);
      return {};
    }
  }

  /**
   * Suggest locomotion systems based on class role and budget.
   * @private
   */
  static _suggestLocomotion(systems = [], classSynergy, budgetInfo, options = {}) {
    const suggestions = [];
    const trace = options.debug ?? false;
    const mode = options.mode || 'preview';

    // Score each locomotion system
    systems.forEach(system => {
      const cost = this._estimateSystemCost(system, 'locomotion');

      // Can afford this system?
      const canAfford = cost <= budgetInfo.remaining;
      if (!canAfford && !budgetInfo.allowOverflow) return;

      let confidence = DROID_CONFIDENCE_TIERS.FALLBACK;
      const reasons = [];

      // Class synergy check
      if (classSynergy.locomotion) {
        if (system.name?.toLowerCase().includes(classSynergy.locomotion)) {
          confidence = Math.max(confidence, DROID_CONFIDENCE_TIERS.CLASS_SYNERGY);
          reasons.push(`Aligns with ${classSynergy.locomotion} droid archetype`);
        }
      }

      // Speed vs role
      const speeds = system.speeds || {};
      const systemSpeed = speeds.medium || 6;
      if (classSynergy.speed === 'high' && systemSpeed >= 8) {
        confidence = Math.max(confidence, DROID_CONFIDENCE_TIERS.ROLE_COHERENCE);
        reasons.push(`High speed (${systemSpeed}) suits scout archetype`);
      } else if (classSynergy.speed === 'low' && systemSpeed <= 6) {
        confidence = Math.max(confidence, DROID_CONFIDENCE_TIERS.ROLE_COHERENCE);
        reasons.push(`Stable speed supports tank role`);
      }

      // Budget efficiency (final mode consideration)
      if (mode === 'final' && budgetInfo.remaining - cost >= -100) {
        confidence = Math.max(confidence, DROID_CONFIDENCE_TIERS.BUDGET_OVERFLOW_MANAGED);
        reasons.push(`Fits within remaining budget`);
      }

      // Cannot afford with overflow warning
      if (!canAfford && budgetInfo.allowOverflow) {
        confidence = Math.max(confidence, DROID_CONFIDENCE_TIERS.BUDGET_OVERFLOW_MANAGED);
        reasons.push(`⚠️ Exceeds remaining budget (requires general credits)`);
      }

      suggestions.push({
        id: system.id,
        name: system.name,
        suggestion: {
          confidence: confidence,
          reason: reasons[0] || `${system.name} is available`,
          reasons,
          cost,
          canAfford,
        },
      });
    });

    return suggestions
      .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence)
      .slice(0, 3);  // Top 3 suggestions
  }

  /**
   * Suggest processor systems.
   * @private
   */
  static _suggestProcessor(systems = [], budgetInfo, options = {}) {
    const suggestions = [];

    systems.forEach(system => {
      // Heuristic is free and always preferred for playable droids
      if (system.id === 'heuristic') {
        suggestions.push({
          id: system.id,
          name: system.name,
          suggestion: {
            confidence: 0.95,  // Highest - always recommended
            reason: 'Heuristic Processor required for playable droids (free)',
            reasons: ['Required for playable characters', 'No cost to budget'],
            cost: 0,
            canAfford: true,
            isRequired: true,
          },
        });
        return;
      }

      // Other processors (rare in chargen)
      const cost = system.cost || 0;
      const canAfford = cost <= budgetInfo.remaining || budgetInfo.allowOverflow;

      if (!canAfford && !budgetInfo.allowOverflow) return;

      suggestions.push({
        id: system.id,
        name: system.name,
        suggestion: {
          confidence: 0.50,  // Low - not recommended unless free
          reason: `${system.name} (${cost} credits)`,
          reasons: ['Advanced processor available but expensive'],
          cost,
          canAfford,
        },
      });
    });

    return suggestions.sort((a, b) => b.suggestion.confidence - a.suggestion.confidence);
  }

  /**
   * Suggest appendages (hands, tools, etc.).
   * @private
   */
  static _suggestAppendages(systems = [], budgetInfo, options = {}) {
    const suggestions = [];

    systems.forEach(system => {
      const cost = this._estimateSystemCost(system, 'appendage');
      const isFreeHand = system.id === 'hand' && cost === 0;

      let confidence = DROID_CONFIDENCE_TIERS.FALLBACK;
      const reasons = [];

      if (isFreeHand) {
        confidence = DROID_CONFIDENCE_TIERS.OPTIMAL_BUDGET;
        reasons.push('First 2 hands are free');
      } else if (cost <= budgetInfo.remaining) {
        confidence = DROID_CONFIDENCE_TIERS.WEIGHT_EFFICIENT;
        reasons.push(`Useful appendage (${cost} credits)`);
      } else if (budgetInfo.allowOverflow) {
        confidence = DROID_CONFIDENCE_TIERS.BUDGET_OVERFLOW_MANAGED;
        reasons.push(`⚠️ Exceeds budget (requires overflow)`);
      } else {
        return;  // Can't afford and no overflow allowed
      }

      suggestions.push({
        id: system.id,
        name: system.name,
        suggestion: {
          confidence,
          reason: reasons[0] || system.name,
          reasons,
          cost,
          canAfford: cost <= budgetInfo.remaining || budgetInfo.allowOverflow,
          isFree: cost === 0,
        },
      });
    });

    return suggestions.sort((a, b) => b.suggestion.confidence - a.suggestion.confidence).slice(0, 5);
  }

  /**
   * Suggest accessories by category.
   * @private
   */
  static _suggestAccessories(accessories = {}, budgetInfo, options = {}) {
    const suggestions = {};

    Object.entries(accessories).forEach(([category, items]) => {
      suggestions[category] = [];

      items.forEach(system => {
        const cost = this._estimateSystemCost(system, 'accessory');
        const canAfford = cost <= budgetInfo.remaining || budgetInfo.allowOverflow;

        if (!canAfford && !budgetInfo.allowOverflow) return;

        let confidence = DROID_CONFIDENCE_TIERS.FALLBACK;
        const reasons = [];

        if (cost <= budgetInfo.remaining) {
          confidence = DROID_CONFIDENCE_TIERS.FUNCTIONAL_OPTION;
          reasons.push(`Optional accessory (${cost} credits)`);
        } else if (budgetInfo.allowOverflow) {
          confidence = DROID_CONFIDENCE_TIERS.BUDGET_OVERFLOW_MANAGED;
          reasons.push(`⚠️ Exceeds budget`);
        }

        suggestions[category].push({
          id: system.id,
          name: system.name,
          suggestion: {
            confidence,
            reason: reasons[0] || system.name,
            reasons,
            cost,
            canAfford,
            category,
          },
        });
      });

      suggestions[category].sort((a, b) => b.suggestion.confidence - a.suggestion.confidence).slice(0, 3);
    });

    return suggestions;
  }

  /**
   * Estimate system cost (simplified; actual calculation uses droid size factor).
   * @private
   */
  static _estimateSystemCost(system, category) {
    if (!system) return 0;
    if (system.id === 'heuristic') return 0;  // Always free

    // For now, return the system's cost field if available
    // In real use, would factor in droid size
    return system.cost || 0;
  }

  /**
   * Get current class from actor.
   * @private
   */
  static _getCurrentClass(actor) {
    if (!actor) return null;
    const classes = actor.system?.classes || actor.classes || [];
    return classes[0] || null;
  }
}
