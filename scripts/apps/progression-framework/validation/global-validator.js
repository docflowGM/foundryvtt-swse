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

    // TODO: In future, load background compatibility rules from system data
    // For now, just ensure a background is selected
    // Example rules to implement:
    // - Some backgrounds locked by species choice
    // - Some backgrounds give bonus feats incompatible with class
    // - Some backgrounds provide class-specific skills

    // Placeholder validation
    if (background.backgroundIds && background.backgroundIds.length === 0) {
      result.errors.push('Background selection is empty');
    }
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

    // TODO: Get class skill entitlements from system data
    // Rules to check:
    // - Total skill points allocated <= class entitlements
    // - Trained skills match class skill list (or cross-class with penalty)
    // - Skill ranks don't exceed maximum per skill
    // - Background bonus skills are included in count

    const allocatedCount = Object.values(skills).reduce((sum, val) => {
      return sum + (typeof val === 'number' ? val : 1);
    }, 0);

    // Placeholder: assume 3 base skill slots per level 1
    const availableSlots = 3; // TODO: derive from class data
    if (allocatedCount > availableSlots) {
      result.errors.push(
        `Too many skills trained (${allocatedCount}/${availableSlots}). Remove ${allocatedCount - availableSlots} skill(s).`
      );
    }
  }

  /**
   * Validate that ability score distribution is mathematically valid.
   * @private
   */
  static _validateAttributeValidity(buildIntent, result) {
    const attributes = buildIntent.getSelection('attributes') || {};
    const species = buildIntent.getSelection('species');

    if (Object.keys(attributes).length === 0) {
      result.warnings.push('Attributes not yet distributed. This is required before finalization.');
      return;
    }

    // TODO: Validate based on chargen method
    // Rules to check:
    // - Point buy total equals available points (usually 25-27)
    // - Each ability between 8-15 for point buy
    // - Standard array scores are correct
    // - Species modifiers are applied correctly
    // - Final scores are within game limits (usually 3-20+)

    // Placeholder: just ensure we have all 6 abilities
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const missingAbilities = abilityKeys.filter(key => !(key in attributes));

    if (missingAbilities.length > 0) {
      result.warnings.push(
        `Abilities not fully distributed. Missing: ${missingAbilities.join(', ')}`
      );
    }
  }

  /**
   * Validate language selections against background/species bonuses.
   * @private
   */
  static _validateLanguageConstraints(buildIntent, result) {
    const languages = buildIntent.getSelection('languages');
    const background = buildIntent.getSelection('background');
    const species = buildIntent.getSelection('species');

    if (!languages || (typeof languages === 'object' && Object.keys(languages).length === 0)) {
      result.suggestions.push('Consider selecting bonus languages to expand your character\'s background.');
      return;
    }

    // TODO: Validate against bonuses
    // Rules to check:
    // - Bonus languages from background are already included
    // - Species bonus languages are already included
    // - Selected languages don't exceed available slots
    // - Exotic languages require appropriate feats

    // Placeholder validation
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
