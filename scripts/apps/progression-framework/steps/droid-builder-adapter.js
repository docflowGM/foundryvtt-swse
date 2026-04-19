/**
 * Droid Builder Adapter — Shell Integration Bridge
 *
 * WAVE 12: Bridges the droid-builder-step into the progression shell flow.
 *
 * This adapter handles the integration between the progression shell
 * and the droid builder step, ensuring:
 * - Droid characters route to the builder instead of normal species picker
 * - State flows correctly through chargen
 * - Committed droid packages are properly stored
 */

import { DroidBuilderStep } from './droid-builder-step.js';
import { swseLogger } from '../../../utils/logger.js';
import { ProgressionRules } from '../../../engine/progression/ProgressionRules.js';

export class DroidBuilderAdapter {
  /**
   * Determine if character should use droid builder.
   */
  static shouldUseDroidBuilder(characterData) {
    return characterData?.isDroid === true;
  }

  /**
   * Get the droid builder step for integration into shell.
   */
  static getDroidBuilderStep() {
    return new DroidBuilderStep();
  }

  /**
   * Initialize droid builder with character data.
   */
  static initializeDroidBuilder(characterData, actor) {
    const step = this.getDroidBuilderStep();

    // Set up initial state from character data or actor
    if (characterData.isDroid) {
      step._droidState = {
        isDroid: true,
        droidDegree: characterData.droidDegree || '1st-degree',
        droidSize: characterData.droidSize || 'medium',
        droidSystems: characterData.droidSystems || {
          locomotion: null,
          processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5 },
          appendages: [],
          accessories: [],
          locomotionEnhancements: [],
          appendageEnhancements: [],
          totalCost: 0,
          totalWeight: 0
        },
        droidCredits: {
          base: ProgressionRules.getDroidConstructionCredits(),
          spent: characterData.droidCredits?.spent || 0,
          remaining: ProgressionRules.getDroidConstructionCredits() - (characterData.droidCredits?.spent || 0)
        }
      };
    }

    return step;
  }

  /**
   * Transfer droid builder result into character data.
   */
  static commitDroidBuilderResult(characterData, stepResult) {
    if (!stepResult || !stepResult.isDroid) {
      swseLogger.warn('[DroidBuilderAdapter] Invalid droid builder result');
      return false;
    }

    // Copy entire droid package into character data
    characterData.isDroid = true;
    characterData.droidDegree = stepResult.droidDegree;
    characterData.droidSize = stepResult.droidSize;
    characterData.droidSystems = JSON.parse(JSON.stringify(stepResult.droidSystems));
    characterData.droidCredits = JSON.parse(JSON.stringify(stepResult.droidCredits));

    swseLogger.debug('[DroidBuilderAdapter] Droid build committed', {
      degree: stepResult.droidDegree,
      size: stepResult.droidSize,
      systems: stepResult.droidSystems
    });

    return true;
  }

  /**
   * Validate that droid is ready to proceed to next step.
   */
  static validateDroidBuild(droidState) {
    const issues = [];

    if (!droidState.droidSystems.locomotion) {
      issues.push('Locomotion system required');
    }

    if (!droidState.droidSystems.processor) {
      issues.push('Processor required');
    }

    if (droidState.droidSystems.appendages.length === 0) {
      issues.push('At least one appendage required');
    }

    if (droidState.droidCredits.remaining < 0) {
      issues.push('Over budget');
    }

    if (droidState.droidSystems.processor?.id !== 'heuristic') {
      issues.push('Only Heuristic processors allowed for PC droids');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate a droid build summary string.
   */
  static getDroidBuildSummary(droidState) {
    if (!droidState) return 'Droid build incomplete';

    const sys = droidState.droidSystems;
    const parts = [];

    parts.push(`${droidState.droidSize} droid`);

    if (sys.locomotion) {
      parts.push(`${sys.locomotion.name}`);
    }

    if (sys.appendages.length > 0) {
      parts.push(`${sys.appendages.length} appendage(s)`);
    }

    if (sys.accessories.length > 0) {
      parts.push(`${sys.accessories.length} accessory(ies)`);
    }

    return parts.join(', ');
  }
}
