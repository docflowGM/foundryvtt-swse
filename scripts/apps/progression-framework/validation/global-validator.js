/**
 * GlobalValidator - Cross-Step Constraint Checking
 *
 * Implements Phase 7 (relabeled Phase 2) of the chargen architecture gap fix sequence.
 * Addresses Gap #3: No Global Validation of State Consistency
 *
 * Architecture:
 * - Single source of truth for validation rules
 * - Checks constraints ACROSS steps, not just within a single step
 * - Uses buildIntent to query other steps' choices
 * - Provides detailed feedback (errors, warnings, suggestions)
 *
 * Validation Categories:
 * 1. Background Compatibility - background matches species/class
 * 2. Feat Legality - feats match class restrictions and prerequisites
 * 3. Talent Coherence - talents match class and don't conflict
 * 4. Skill Entitlements - skills allocation doesn't exceed class limits
 * 5. Attribute Validity - ability distribution is mathematically valid
 * 6. Language Constraints - languages match background/species bonuses
 * 7. Ability Scores - point buy or standard array is within bounds
 */

import { swseLogger } from '../../../utils/logger.js';

export class GlobalValidator {
  /**
   * Validate the entire build state against global constraints.
   *
   * @param {ProgressionShell} shell - The progression shell with buildIntent
   * @param {Object} options - Validation options
   *   - mode: 'chargen' | 'levelup' - Skip certain checks in levelup
   *   - strict: boolean - Treat warnings as errors
   * @returns {Object} Validation result:
   *   {
   *     isValid: boolean,
   *     errors: string[],       // Must fix to proceed
   *     warnings: string[],     // Should fix but can proceed
   *     conflicts: string[],    // Build coherence issues
   *     suggestions: string[]   // Recommendations
   *   }
   */
  static validate(shell, options = {}) {
    const { mode = 'chargen', strict = false } = options;

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      conflicts: [],
      suggestions: [],
    };

    // Guard: ensure buildIntent exists
    if (!shell?.buildIntent) {
      result.errors.push('Build intent not available for validation');
      result.isValid = false;
      return result;
    }

    const buildIntent = shell.buildIntent;

    // Run all validation checks
    this._validateBackgroundCompatibility(buildIntent, result);
    this._validateFeatLegality(buildIntent, result);
    this._validateTalentCoherence(buildIntent, result);
    this._validateSkillEntitlements(buildIntent, result, shell.actor);
    this._validateAttributeValidity(buildIntent, result);
    this._validateLanguageConstraints(buildIntent, result);

    // Determine overall validity
    if (strict) {
      result.isValid = result.errors.length === 0 && result.warnings.length === 0;
    } else {
      result.isValid = result.errors.length === 0;
    }

    swseLogger.debug('[GlobalValidator] Validation complete', {
      mode,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      conflictCount: result.conflicts.length,
    });

    return result;
  }

  /**
   * Validate that background matches species and class.
   * @private
   */
  static _validateBackgroundCompatibility(buildIntent, result) {
    const species = buildIntent.getSelection('species');
    const charClass = buildIntent.getSelection('class');
    const background = buildIntent.getSelection('background');

    // Background is optional in some chargen flows, but warn if missing when species/class set
    if ((species || charClass) && !background) {
      result.warnings.push('Background not yet selected. This provides important mechanical benefits.');
      return;
    }

    if (!background) return; // Nothing to validate

    // Validate background structure
    if (background.backgroundIds && background.backgroundIds.length === 0) {
      result.errors.push('Background selection is empty. Choose at least one background.');
      return;
    }

    // Practical checks without needing full system data
    // These will be enhanced when background compatibility rules are available
    const hasValidBackgroundData = background.backgroundIds || background.backgrounds;
    if (!hasValidBackgroundData) {
      result.warnings.push('Background data is incomplete. Ensure background is properly selected.');
    }

    // TODO: In future, load background compatibility rules from system data
    // Future rules to implement:
    // - Some backgrounds locked by species choice (e.g., tribal backgrounds for specific species)
    // - Some backgrounds give bonus feats incompatible with class
    // - Some backgrounds provide class-specific skills (e.g., military background + soldier class synergy)
    // - Background provides trained skills that count toward class allocation
  }

  /**
   * Validate that feat selections match class restrictions and prerequisites.
   * @private
   */
  static _validateFeatLegality(buildIntent, result) {
    const charClass = buildIntent.getSelection('class');
    const feats = buildIntent.getSelection('feats') || [];

    if (!charClass) {
      if (feats.length > 0) {
        result.warnings.push('Feats selected but class not yet chosen. Class may restrict feat selection.');
      }
      return;
    }

    if (feats.length === 0) {
      result.suggestions.push('Consider selecting feats to enhance your build.');
      return;
    }

    // TODO: Load class-specific feat restrictions
    // Rules to check:
    // - Class feat slots must use class-specific feats
    // - General feat slots must not use restricted feats
    // - Feat prerequisites must be met (requires other feats, specific attributes, etc.)
    // - Feat prerequisites (species, level, abilities) must be met

    // Placeholder validation
    // Example:
    // - Soldier class doesn't allow Weak Point Exploitations for non-Scoundrels
    // - Some feats require minimum ability scores
  }

  /**
   * Validate that talent selections match class and don't conflict.
   * @private
   */
  static _validateTalentCoherence(buildIntent, result) {
    const charClass = buildIntent.getSelection('class');
    const talents = buildIntent.getSelection('talents') || [];

    if (!charClass) {
      if (talents.length > 0) {
        result.warnings.push('Talents selected but class not yet chosen. Class determines talent availability.');
      }
      return;
    }

    if (talents.length === 0) {
      result.suggestions.push('Consider selecting talents to define your character\'s expertise.');
      return;
    }

    // TODO: Load class-specific talent trees
    // Rules to check:
    // - Talent must be available from selected class talent tree
    // - Talent prerequisites (other talents, feats) must be met
    // - Exclusive talents (can't pick both) must be detected
    // - Prestige class talent requirements must be checked

    // Placeholder validation
  }

  /**
   * Validate that skill allocations don't exceed class entitlements.
   * @private
   */
  static _validateSkillEntitlements(buildIntent, result, actor) {
    const charClass = buildIntent.getSelection('class');
    const skills = buildIntent.getSelection('skills') || {};

    if (!charClass) {
      if (Object.keys(skills).length > 0) {
        result.warnings.push('Skills selected but class not yet chosen. Class determines skill entitlements.');
      }
      return;
    }

    const allocatedCount = Object.keys(skills).length;

    // Practical checks without full system integration
    if (allocatedCount === 0) {
      result.suggestions.push('Consider selecting skills to develop your character\'s expertise.');
      return;
    }

    // Sanity check: don't exceed 10 skills (reasonable upper bound)
    if (allocatedCount > 10) {
      result.warnings.push(`Many skills trained (${allocatedCount}). Class limits may apply.`);
    }

    // TODO: Get class skill entitlements from system data
    // Future rules to implement:
    // - Total skill points allocated <= class entitlements
    // - Trained skills match class skill list (or cross-class with penalty)
    // - Skill ranks don't exceed maximum per skill (typically 5-10)
    // - Background bonus skills are included in count
    // - Cross-class skill training penalties apply
  }

  /**
   * Validate that ability score distribution is mathematically valid.
   * @private
   */
  static _validateAttributeValidity(buildIntent, result) {
    const attributes = buildIntent.getSelection('attributes') || {};
    const species = buildIntent.getSelection('species');

    if (Object.keys(attributes).length === 0) {
      result.errors.push('Attributes not yet distributed. This is required before finalization.');
      return;
    }

    // Check for all 6 core abilities
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const presentAbilities = abilityKeys.filter(key => key in attributes && attributes[key] !== undefined && attributes[key] !== null);
    const missingAbilities = abilityKeys.filter(key => !(key in attributes) || attributes[key] === undefined || attributes[key] === null);

    if (presentAbilities.length < abilityKeys.length) {
      result.errors.push(
        `Attributes incomplete. Missing: ${missingAbilities.join(', ')}`
      );
      return;
    }

    // Validate scores are in reasonable range
    const invalidScores = [];
    for (const [key, value] of Object.entries(attributes)) {
      const score = parseInt(value, 10);
      if (isNaN(score)) {
        invalidScores.push(`${key}: non-numeric value`);
      } else if (score < 3 || score > 20) {
        invalidScores.push(`${key}: ${score} (typically 3-20)`);
      }
    }

    if (invalidScores.length > 0) {
      result.warnings.push(`Unusual ability scores: ${invalidScores.join(', ')}`);
    }

    // TODO: Validate based on chargen method
    // Future rules to implement:
    // - Point buy total equals available points (usually 25-27)
    // - Each ability between 8-15 for point buy
    // - Standard array scores are correct (15, 14, 13, 12, 10, 8)
    // - Species modifiers are applied correctly
    // - Final scores with modifiers are within game limits
  }

  /**
   * Validate language selections against background/species bonuses.
   * @private
   */
  static _validateLanguageConstraints(buildIntent, result) {
    const languages = buildIntent.getSelection('languages');
    const background = buildIntent.getSelection('background');
    const species = buildIntent.getSelection('species');

    // Languages are optional but suggested
    if (!languages || (typeof languages === 'object' && Object.keys(languages).length === 0)) {
      result.suggestions.push('Consider selecting bonus languages to expand your character\'s background.');
      return;
    }

    // Practical checks without full system integration
    const languageList = Array.isArray(languages) ? languages : Object.keys(languages);

    if (languageList.length > 0) {
      // Sanity check: don't exceed 10 languages (reasonable upper bound)
      if (languageList.length > 10) {
        result.warnings.push(`Many languages known (${languageList.length}). Background/species bonus limits may apply.`);
      }

      // Suggest at least knowing one bonus language beyond starting language
      if (languageList.length < 2) {
        result.suggestions.push('Consider learning at least one additional language to expand roleplay opportunities.');
      }
    }

    // TODO: Validate against bonuses when language system is accessible
    // Future rules to implement:
    // - Bonus languages from background are already included in allocation
    // - Species bonus languages are already included
    // - Selected languages don't exceed available slots for bonus languages
    // - Exotic/restricted languages require appropriate feats or species
  }

  /**
   * Get a human-readable validation report.
   * Useful for mentor feedback and UI display.
   *
   * @param {Object} validationResult - Result from validate()
   * @returns {string} Formatted validation report
   */
  static formatReport(validationResult) {
    const lines = [];

    if (validationResult.isValid) {
      lines.push('✓ Your build is valid!');
    } else {
      lines.push('✗ Build has issues that must be fixed:');
    }

    if (validationResult.errors.length > 0) {
      lines.push('\n**Errors (must fix):**');
      validationResult.errors.forEach(err => {
        lines.push(`  • ${err}`);
      });
    }

    if (validationResult.warnings.length > 0) {
      lines.push('\n**Warnings (should fix):**');
      validationResult.warnings.forEach(warn => {
        lines.push(`  • ${warn}`);
      });
    }

    if (validationResult.conflicts.length > 0) {
      lines.push('\n**Build Concerns:**');
      validationResult.conflicts.forEach(conflict => {
        lines.push(`  • ${conflict}`);
      });
    }

    if (validationResult.suggestions.length > 0) {
      lines.push('\n**Suggestions:**');
      validationResult.suggestions.forEach(sugg => {
        lines.push(`  • ${sugg}`);
      });
    }

    return lines.join('\n');
  }
}
