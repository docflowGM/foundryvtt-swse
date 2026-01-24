/**
 * Developer Mode Validation
 * Comprehensive checks for bugs and data integrity
 * Only active when Dev Mode is enabled
 */

import { SWSELogger, swseLogger } from '../utils/logger.js';

export class DevModeValidator {
  constructor() {
    this._devMode = false;
    this._validationResults = [];
  }

  /**
   * Initialize validator
   */
  initialize() {
    this._devMode = game.settings?.get('foundryvtt-swse', 'devMode') ?? false;
    if (this._devMode) {
      SWSELogger.log('SWSE | Dev Mode Validator initialized');
    }
  }

  /**
   * Validate house rules configuration
   */
  validateHouseRules() {
    if (!this._devMode) return [];

    const issues = [];
    const namespace = 'foundryvtt-swse';

    // Check critical house rules are registered
    const criticalRules = [
      'enableBackgrounds',
      'bannedSpecies',
      'abilityScoreMethod',
      'hpGeneration',
      'deathSystem'
    ];

    for (const rule of criticalRules) {
      try {
        const value = game.settings.get(namespace, rule);
        // Setting exists and is readable
      } catch (e) {
        issues.push({
          severity: 'warn',
          area: 'houserules',
          message: `House rule "${rule}" not properly registered or readable`
        });
      }
    }

    return issues;
  }

  /**
   * Validate character generation data
   */
  validateChargenData(characterData) {
    if (!this._devMode || !characterData) return [];

    const issues = [];

    // Check required fields
    const required = ['name', 'isDroid'];
    for (const field of required) {
      if (!(field in characterData)) {
        issues.push({
          severity: 'error',
          area: 'chargen',
          message: `Character data missing required field: "${field}"`
        });
      }
    }

    // Check abilities
    if (characterData.abilities) {
      const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      for (const ability of abilities) {
        if (!characterData.abilities[ability]) {
          issues.push({
            severity: 'warn',
            area: 'chargen',
            message: `Character missing ability: ${ability}`
          });
        }
      }
    }

    // Check species/droid consistency
    if (!characterData.isDroid && !characterData.species) {
      issues.push({
        severity: 'warn',
        area: 'chargen',
        message: 'Non-droid character has no species selected'
      });
    }

    // Check for negative values where inappropriate
    if (characterData.hp?.value < 0) {
      issues.push({
        severity: 'error',
        area: 'chargen',
        message: 'Character HP is negative'
      });
    }

    return issues;
  }

  /**
   * Validate species list for bans
   */
  validateSpeciesList(allSpecies, bannedSpecies) {
    if (!this._devMode || !allSpecies || !bannedSpecies) return [];

    const issues = [];

    // Check banned species actually exist
    const speciesNames = new Set(allSpecies.map(s => s.name));
    for (const banned of bannedSpecies) {
      if (!speciesNames.has(banned)) {
        issues.push({
          severity: 'warn',
          area: 'species',
          message: `Banned species "${banned}" not found in species list`
        });
      }
    }

    return issues;
  }

  /**
   * Run all validation checks
   */
  runValidation(context = {}) {
    if (!this._devMode) return;

    const allIssues = [];

    // House rules validation
    allIssues.push(...this.validateHouseRules());

    // Character data validation
    if (context.characterData) {
      allIssues.push(...this.validateChargenData(context.characterData));
    }

    // Species list validation
    if (context.allSpecies && context.bannedSpecies) {
      allIssues.push(...this.validateSpeciesList(context.allSpecies, context.bannedSpecies));
    }

    // Log results if any issues found
    if (allIssues.length > 0) {
      this._logValidationResults(allIssues);
    }

    return allIssues;
  }

  /**
   * Log validation results
   * @private
   */
  _logValidationResults(issues) {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warn');

    console.group('%c🔍 DEV MODE VALIDATION REPORT', 'color: #2196F3; font-weight: bold; font-size: 14px');

    if (errors.length > 0) {
      console.group('%c❌ ERRORS (' + errors.length + ')', 'color: red; font-weight: bold');
      errors.forEach(issue => {
        swseLogger.error(`[${issue.area.toUpperCase()}]`, issue.message);
      });
      console.groupEnd();
    }

    if (warnings.length > 0) {
      console.group('%c⚠️  WARNINGS (' + warnings.length + ')', 'color: orange; font-weight: bold');
      warnings.forEach(issue => {
        swseLogger.warn(`[${issue.area.toUpperCase()}]`, issue.message);
      });
      console.groupEnd();
    }

    if (errors.length === 0 && warnings.length === 0) {
      swseLogger.log('%c✅ No validation issues found', 'color: green; font-weight: bold');
    }

    console.groupEnd();
  }

  /**
   * Validate that a setting value is reasonable
   */
  validateSettingValue(settingKey, value) {
    if (!this._devMode) return true;

    // Type checking for numeric settings
    const numericSettings = [
      'pointBuyPool', 'maxStartingCredits', 'droidPointBuyPool',
      'deathSaveDC', 'conditionTrackCap', 'maxHPLevels'
    ];

    if (numericSettings.includes(settingKey) && typeof value !== 'number') {
      swseLogger.warn(`Dev Mode | Setting "${settingKey}" should be numeric but is ${typeof value}`);
      return false;
    }

    // Range checking
    const rangeChecks = {
      'pointBuyPool': { min: 10, max: 50 },
      'deathSaveDC': { min: 5, max: 20 },
      'maxHPLevels': { min: 1, max: 10 }
    };

    if (rangeChecks[settingKey]) {
      const range = rangeChecks[settingKey];
      if (value < range.min || value > range.max) {
        swseLogger.warn(`Dev Mode | Setting "${settingKey}" value ${value} outside recommended range [${range.min}-${range.max}]`);
        return false;
      }
    }

    return true;
  }
}

// Global instance
export const devModeValidator = new DevModeValidator();
