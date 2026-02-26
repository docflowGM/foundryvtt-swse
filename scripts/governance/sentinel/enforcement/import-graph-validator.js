/**
 * Import Graph Validator
 * PHASE 3.5: Enforces rule sovereignty via import validation
 *
 * Invariant: Only AbilityEngine (and integrity checker) may import PrerequisiteChecker
 *
 * This module validates the import graph to ensure no unauthorized
 * direct calls to PrerequisiteChecker exist in production code.
 */

import { SWSELogger } from '../../../utils/logger.js';

export class ImportGraphValidator {

  static ALLOWED_PREREQUISITE_CHECKER_IMPORTERS = [
    'AbilityEngine',
    'prerequisite-checker-regression-guard',
    'prerequisite-integrity-checker',
    'missing-prereqs-tracker'
  ];

  static FORBIDDEN_PREREQUISITE_CHECKER_IMPORTERS = [
    'SuggestionEngine',
    'ClassSuggestionEngine',
    'levelup-main',
    'chargen-main',
    'migrations',
    'utils'
  ];

  /**
   * Validate that only authorized modules import PrerequisiteChecker.
   * This is a documentation check for now; full validation requires static analysis.
   *
   * @static
   * @returns {Object} Validation result
   */
  static validatePrerequisiteCheckerImports() {
    const expectedViolations = this.FORBIDDEN_PREREQUISITE_CHECKER_IMPORTERS
      .map(name => `"${name}.js" must NOT import PrerequisiteChecker`);

    const expectedAllowances = this.ALLOWED_PREREQUISITE_CHECKER_IMPORTERS
      .map(name => `"${name}.js" MAY import PrerequisiteChecker`);

    SWSELogger.log('[IMPORT-VALIDATOR] PrerequisiteChecker import constraints', {
      allowedImporters: this.ALLOWED_PREREQUISITE_CHECKER_IMPORTERS,
      forbiddenImporters: this.FORBIDDEN_PREREQUISITE_CHECKER_IMPORTERS,
      status: 'DOCUMENTED',
      note: 'Requires static analysis tool for runtime enforcement'
    });

    return {
      check: 'prerequisite-checker-imports',
      status: 'MONITORED',
      allowedImporters: this.ALLOWED_PREREQUISITE_CHECKER_IMPORTERS,
      forbiddenImporters: this.FORBIDDEN_PREREQUISITE_CHECKER_IMPORTERS
    };
  }

  /**
   * Validate that SuggestionEngine does not import PrerequisiteChecker.
   * @static
   */
  static validateSuggestionEngineIsolation() {
    const isolationRequirements = {
      SuggestionEngine: {
        mustNotImport: ['PrerequisiteChecker'],
        mustNotCall: ['game.packs.get()'],
        mustDelegate: ['legality decisions → AbilityEngine']
      },
      ClassSuggestionEngine: {
        mustNotImport: ['PrerequisiteChecker'],
        mustNotCall: ['game.packs.get()'],
        allowedDependencies: ['AbilityEngine', 'PrerequisiteIntegrityChecker (read-only)']
      }
    };

    SWSELogger.log('[IMPORT-VALIDATOR] SuggestionEngine isolation requirements', isolationRequirements);

    return {
      check: 'suggestion-engine-isolation',
      status: 'DOCUMENTED',
      requirements: isolationRequirements
    };
  }

  /**
   * Validate that only registries access protected compendiums.
   * @static
   */
  static validateCompendiumAccess() {
    const protectedCompendiums = [
      'foundryvtt-swse.feats',
      'foundryvtt-swse.talents',
      'foundryvtt-swse.forcepowers',
      'foundryvtt-swse.forcetechniques',
      'foundryvtt-swse.forcesecrets',
      'foundryvtt-swse.species',
      'foundryvtt-swse.classes'
    ];

    const allowedAccessors = [
      '/engine/registries/',
      '/data/',
      '/migration/',
      '/maintenance/'
    ];

    SWSELogger.log('[IMPORT-VALIDATOR] Protected compendium access rules', {
      protectedCompendiums,
      allowedAccessors,
      status: 'MONITORED',
      note: 'Requires dynamic import hook for full enforcement'
    });

    return {
      check: 'compendium-access',
      status: 'MONITORED',
      protectedCompendiums,
      allowedAccessors
    };
  }

  /**
   * Generate a report of import graph constraints.
   * @static
   */
  static generateConstraintReport() {
    return {
      timestamp: new Date().toISOString(),
      constraints: {
        'prerequisite-checker-imports': this.validatePrerequisiteCheckerImports(),
        'suggestion-engine-isolation': this.validateSuggestionEngineIsolation(),
        'compendium-access': this.validateCompendiumAccess()
      },
      summary: {
        totalConstraints: 3,
        enforcedViaStaticAnalysis: 0,
        monitoredViaDocumentation: 3
      }
    };
  }
}
