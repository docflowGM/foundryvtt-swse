/**
 * Manual Step Processor
 *
 * Thin adapter for processing manual user input through the standard progression pipeline.
 *
 * Key principle: Manual input is converted to canonical form, then processed through
 * the SAME validation and compilation pipeline as generator-sourced input.
 *
 * No special logic. No duplicate compilers. One pipeline.
 */

import { PrerequisiteChecker } from '../../../data/prerequisite-checker.js';
import { ProgressionCompiler } from '../ProgressionCompiler.js';
import { swseLogger } from '../../../utils/logger.js';

export class ManualStepProcessor {

  /**
   * Process a manually-entered step.
   *
   * @param {Actor} actor - Current actor
   * @param {string} stepId - Step identifier (background, species, feats, talents, etc.)
   * @param {Object} input - Raw user input (varies by step type)
   * @param {Object} options - Processing options
   * @param {boolean} options.freebuild - Bypass sequencing restrictions (default: false)
   * @param {boolean} options.suppressWarnings - Suppress validation warnings (default: false)
   * @returns {Promise<Object>} mutationPlan - Structured mutation plan { set, add, delete }
   * @throws {ProgressionStepError} If stepId unrecognized
   * @throws {ProgressionValidationError} If prerequisites unmet
   */
  static async processManualStep(actor, stepId, input, options = {}) {
    const { freebuild = false, suppressWarnings = false } = options;

    swseLogger.debug('ManualStepProcessor.processManualStep', {
      actor: actor.id,
      stepId,
      freebuild,
      suppressWarnings
    });

    // Phase 1: Validate step ID
    this._assertValidStep(stepId);

    // Phase 2: Normalize input to canonical form
    const normalizedInput = await this._normalizeInput(stepId, input, actor);

    // Phase 3: Build snapshot (read-only state)
    const snapshot = this._buildSnapshot(actor, { freebuild });

    // Phase 4: Validate prerequisites
    await this._validatePrerequisites(
      snapshot,
      stepId,
      normalizedInput,
      { freebuild, suppressWarnings }
    );

    // Phase 5: Compile using standard pipeline
    const mutationPlan = this._compileStep(
      snapshot,
      stepId,
      normalizedInput,
      { source: 'manual', freebuild }
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
   * Normalize raw user input to canonical internal form.
   * This is step-specific and handles UI → domain transformation.
   * @private
   */
  static async _normalizeInput(stepId, input, actor) {
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
   * Input: { speciesId: "wookiee" } or { name: "Wookiee" }
   * Output: { id: "wookiee" }
   * @private
   */
  static _normalizeSpecies(input) {
    if (!input) throw new ProgressionValidationError('Species input required');

    const speciesId = input.speciesId || input.id;
    if (!speciesId) {
      throw new ProgressionValidationError('Species ID required');
    }

    return { id: speciesId, source: 'manual' };
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
        freeform: true,
        source: 'manual'
      };
    }

    // Option B: Select from list
    const backgroundId = input.backgroundId || input.id;
    if (backgroundId) {
      return { id: backgroundId, source: 'manual' };
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

    return { ...scores, source: 'manual' };
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
        freeform: true,
        source: 'manual'
      };
    }

    const classId = input.classId || input.id;
    if (classId) {
      return { id: classId, source: 'manual' };
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
      skillIds: input.skillIds,
      source: 'manual'
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
      featIds,
      source: 'manual'
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
      talentIds,
      source: 'manual'
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
      secretIds,
      source: 'manual'
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
      techniqueIds,
      source: 'manual'
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
      powerIds,
      source: 'manual'
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

  /**
   * Validate prerequisites for this step.
   * Reuses PrerequisiteChecker used by ProgressionCompiler.
   * @private
   */
  static async _validatePrerequisites(snapshot, stepId, normalizedInput, options = {}) {
    swseLogger.debug('ManualStepProcessor._validatePrerequisites', {
      stepId,
      freebuild: options.freebuild
    });

    // For each item being added, validate prerequisites
    const itemIds = normalizedInput.featIds || normalizedInput.talentIds ||
                    normalizedInput.powerIds || normalizedInput.secretIds ||
                    normalizedInput.techniqueIds || [];

    for (const itemId of itemIds) {
      const prereq = PrerequisiteChecker.checkPrerequisites(
        snapshot,
        this._mapStepToType(stepId),
        itemId
      );

      if (!prereq.met) {
        if (options.freebuild) {
          // Freebuild: warn but allow
          if (!options.suppressWarnings) {
            swseLogger.warn(
              `ManualStepProcessor: Prerequisites unmet (freebuild allowed): ${prereq.missing.join(', ')}`
            );
          }
        } else {
          // Normal mode: enforce
          throw new ProgressionValidationError(
            `Prerequisites unmet for ${itemId}: ${prereq.missing.join(', ')}`
          );
        }
      }
    }
  }

  /**
   * Map step ID to item type for PrerequisiteChecker.
   * @private
   */
  static _mapStepToType(stepId) {
    const typeMap = {
      'feats': 'feat',
      'talents': 'talent',
      'forcePowers': 'forcePower',
      'forceSecrets': 'forceSecret',
      'forceTechniques': 'forceTechnique'
    };
    return typeMap[stepId] || stepId;
  }

  /**
   * Compile step using standard ProgressionCompiler.
   * This is where the actual mutationPlan is built.
   * @private
   */
  static _compileStep(snapshot, stepId, normalizedInput, metadata = {}) {
    // Build intent object for ProgressionCompiler
    const intent = this._buildIntent(stepId, normalizedInput);

    // Use standard compiler — same pipeline as generator
    return ProgressionCompiler.compile(snapshot, intent);
  }

  /**
   * Build intent object for ProgressionCompiler.
   * @private
   */
  static _buildIntent(stepId, normalizedInput) {
    // Map steps to compiler intent types
    switch (stepId) {
      case 'feats':
        return {
          type: 'chooseFeat',
          featId: normalizedInput.featIds[0] // Compiler handles one at a time
        };

      case 'talents':
        return {
          type: 'chooseTalent',
          talentId: normalizedInput.talentIds[0]
        };

      case 'class':
        return {
          type: 'confirmClass',
          classId: normalizedInput.id || normalizedInput.classId
        };

      // Future: Add other step compilers as they're added to ProgressionCompiler
      default:
        throw new ProgressionStepError(
          `No compiler intent builder for step: ${stepId}`
        );
    }
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
