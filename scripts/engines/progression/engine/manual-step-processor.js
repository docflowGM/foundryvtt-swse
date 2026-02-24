/**
 * Manual Step Processor
 *
 * Thin normalization adapter for processing manual user input.
 *
 * Architecture principle:
 * - ManualStepProcessor: Normalizes UI input to canonical selections
 * - ProgressionCompiler: Owns ALL intent building, validation, and delta compilation
 * - UI layers never see or construct intent objects
 * - One pipeline: Manual and Generator both call ProgressionCompiler.compileStep()
 *
 * ManualStepProcessor is intentionally small: normalize → snapshot → compile.
 * No intent building. No prerequisite validation (compiler owns that).
 * Normalization only.
 */

import { ProgressionCompiler } from '../ProgressionCompiler.js';
import { swseLogger } from '../../../utils/logger.js';

export class ManualStepProcessor {

  /**
   * Process a manually-entered step.
   *
   * Three-phase pipeline:
   * 1. Normalize: UI input → canonical selections
   * 2. Snapshot: Read-only actor state
   * 3. Compile: Delegate to ProgressionCompiler (owns validation + intent + delta)
   *
   * @param {Actor} actor - Current actor
   * @param {string} stepId - Step identifier (background, species, feats, talents, etc.)
   * @param {Object} input - Raw user input (varies by step type)
   * @param {Object} options - Processing options
   * @param {boolean} options.freebuild - Bypass sequencing restrictions (default: false)
   * @returns {Promise<Object>} mutationPlan - Structured mutation plan { set, add, delete }
   * @throws {ProgressionStepError} If stepId unrecognized
   * @throws {ProgressionValidationError} If selections invalid or prerequisites unmet
   */
  static async processManualStep(actor, stepId, input, options = {}) {
    const { freebuild = false } = options;

    swseLogger.debug('ManualStepProcessor.processManualStep', {
      actor: actor.id,
      stepId,
      freebuild
    });

    // Phase 1: Validate step ID exists
    this._assertValidStep(stepId);

    // Phase 2: Normalize raw input to canonical selections
    const selections = await this._normalizeInput(stepId, input);

    // Phase 3: Build snapshot (read-only actor state for validation)
    const snapshot = this._buildSnapshot(actor, { freebuild });

    // Phase 4: Delegate to compiler (compiler owns intent building, validation, delta)
    const mutationPlan = ProgressionCompiler.compileStep(
      snapshot,
      stepId,
      selections,
      { freebuild }
    );

    swseLogger.debug('ManualStepProcessor.processManualStep: Complete', { mutationPlan });

    return mutationPlan;
  }

  /**
   * Validate that step ID is recognized.
   * @private
   */
  static _assertValidStep(stepId) {
    const validSteps = [
      'species',
      'background',
      'abilities',
      'class',
      'skills',
      'feats',
      'talents',
      'forceSecrets',
      'forceTechniques',
      'forcePowers'
    ];

    if (!validSteps.includes(stepId)) {
      throw new ProgressionStepError(
        `Unknown progression step: "${stepId}". Valid: ${validSteps.join(', ')}`
      );
    }
  }

  /**
   * Normalize raw user input to canonical selections form.
   * This is step-specific and handles UI → domain transformation.
   *
   * Note: Normalizers return ONLY the data needed by the compiler.
   * No intent types. No "source" field. Just selections.
   *
   * @private
   */
  static async _normalizeInput(stepId, input) {
    swseLogger.debug('ManualStepProcessor._normalizeInput', { stepId, input });

    switch (stepId) {
      case 'species':
        return this._normalizeSpecies(input);

      case 'background':
        return this._normalizeBackground(input);

      case 'abilities':
        return this._normalizeAbilities(input);

      case 'class':
        return this._normalizeClass(input);

      case 'skills':
        return this._normalizeSkills(input);

      case 'feats':
        return this._normalizeFeats(input);

      case 'talents':
        return this._normalizeTalents(input);

      case 'forceSecrets':
        return this._normalizeForceSecrets(input);

      case 'forceTechniques':
        return this._normalizeForceTechniques(input);

      case 'forcePowers':
        return this._normalizeForcePowers(input);

      default:
        throw new ProgressionStepError(`No normalizer for step: ${stepId}`);
    }
  }

  /**
   * Species normalization.
   * Input: { speciesId: "wookiee" } or { id: "wookiee" }
   * Output: { id: "wookiee" }
   * @private
   */
  static _normalizeSpecies(input) {
    if (!input) throw new ProgressionValidationError('Species input required');

    const speciesId = input.speciesId || input.id;
    if (!speciesId) {
      throw new ProgressionValidationError('Species ID required');
    }

    return { id: speciesId };
  }

  /**
   * Background normalization.
   * Input: { backgroundId: "noble" } or { name: "Noble", freeform: true }
   * Output: { id: "noble" } or { name: "Noble", freeform: true }
   * @private
   */
  static _normalizeBackground(input) {
    if (!input) throw new ProgressionValidationError('Background input required');

    // Option A: Freeform text entry
    if (input.freeform && input.name) {
      return {
        name: input.name,
        freeform: true
      };
    }

    // Option B: Select from list
    const backgroundId = input.backgroundId || input.id;
    if (backgroundId) {
      return { id: backgroundId };
    }

    throw new ProgressionValidationError(
      'Background requires either: { backgroundId } or { name, freeform: true }'
    );
  }

  /**
   * Ability scores normalization.
   * Input: { scores: { str: 14, dex: 12, ... } }
   * Output: { str: 14, dex: 12, ... }
   * @private
   */
  static _normalizeAbilities(input) {
    if (!input || !input.scores) {
      throw new ProgressionValidationError('Abilities require scores object');
    }

    const scores = input.scores;
    const required = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    for (const ability of required) {
      if (typeof scores[ability] !== 'number') {
        throw new ProgressionValidationError(
          `Ability ${ability.toUpperCase()} must be a number`
        );
      }
      if (scores[ability] < 1 || scores[ability] > 20) {
        throw new ProgressionValidationError(
          `Ability ${ability.toUpperCase()} must be 1-20, got ${scores[ability]}`
        );
      }
    }

    return { ...scores };
  }

  /**
   * Class normalization.
   * Input: { classId: "soldier" } or { name: "Custom", freeform: true }
   * @private
   */
  static _normalizeClass(input) {
    if (!input) throw new ProgressionValidationError('Class input required');

    if (input.freeform && input.name) {
      return {
        name: input.name,
        freeform: true
      };
    }

    const classId = input.classId || input.id;
    if (classId) {
      return { id: classId };
    }

    throw new ProgressionValidationError(
      'Class requires either: { classId } or { name, freeform: true }'
    );
  }

  /**
   * Skills normalization.
   * Input: { skillIds: ["acrobatics", "persuasion"] }
   * @private
   */
  static _normalizeSkills(input) {
    if (!input || !Array.isArray(input.skillIds)) {
      throw new ProgressionValidationError('Skills require skillIds array');
    }

    return {
      skillIds: input.skillIds
    };
  }

  /**
   * Feats normalization.
   * Input: { featIds: ["abc123", "def456"] } or { itemIds: [...] }
   * @private
   */
  static _normalizeFeats(input) {
    if (!input) throw new ProgressionValidationError('Feats input required');

    const featIds = input.featIds || input.itemIds || [];
    if (!Array.isArray(featIds) || featIds.length === 0) {
      throw new ProgressionValidationError('Feats require at least one feat ID');
    }

    return {
      featIds
    };
  }

  /**
   * Talents normalization.
   * Input: { talentIds: ["abc123"] }
   * @private
   */
  static _normalizeTalents(input) {
    if (!input) throw new ProgressionValidationError('Talents input required');

    const talentIds = input.talentIds || input.itemIds || [];
    if (!Array.isArray(talentIds) || talentIds.length === 0) {
      throw new ProgressionValidationError('Talents require at least one talent ID');
    }

    return {
      talentIds
    };
  }

  /**
   * Force secrets normalization.
   * Input: { secretIds: ["abc123"] }
   * @private
   */
  static _normalizeForceSecrets(input) {
    if (!input) throw new ProgressionValidationError('Force secrets input required');

    const secretIds = input.secretIds || input.itemIds || [];
    if (!Array.isArray(secretIds) || secretIds.length === 0) {
      throw new ProgressionValidationError('Force secrets require at least one ID');
    }

    return {
      secretIds
    };
  }

  /**
   * Force techniques normalization.
   * Input: { techniqueIds: ["abc123"] }
   * @private
   */
  static _normalizeForceTechniques(input) {
    if (!input) throw new ProgressionValidationError('Force techniques input required');

    const techniqueIds = input.techniqueIds || input.itemIds || [];
    if (!Array.isArray(techniqueIds) || techniqueIds.length === 0) {
      throw new ProgressionValidationError('Force techniques require at least one ID');
    }

    return {
      techniqueIds
    };
  }

  /**
   * Force powers normalization.
   * Input: { powerIds: ["abc123"] }
   * @private
   */
  static _normalizeForcePowers(input) {
    if (!input) throw new ProgressionValidationError('Force powers input required');

    const powerIds = input.powerIds || input.itemIds || [];
    if (!Array.isArray(powerIds) || powerIds.length === 0) {
      throw new ProgressionValidationError('Force powers require at least one ID');
    }

    return {
      powerIds
    };
  }

  /**
   * Build a frozen snapshot of actor state for validation.
   * This snapshot is read-only and used by PrerequisiteChecker.
   * @private
   */
  static _buildSnapshot(actor, options = {}) {
    return {
      actor,
      level: actor.system.level,
      abilities: { ...actor.system.attributes },
      classes: actor.system.classes || [],
      freebuild: options.freebuild ?? false,
      timestamp: Date.now()
    };
  }

}

/**
 * Custom error for invalid progression steps.
 */
export class ProgressionStepError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProgressionStepError';
  }
}

/**
 * Custom error for validation failures.
 */
export class ProgressionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProgressionValidationError';
  }
}
