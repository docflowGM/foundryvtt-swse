/**
 * Template Registry — Phase 5 Step 2
 *
 * Canonical loader for character templates from data/character-templates.json.
 * The single source of truth for template data in the progression engine.
 *
 * Entry points:
 *   const templates = await TemplateRegistry.getAllTemplates();
 *   const template = await TemplateRegistry.getTemplate(templateId);
 *   const report = await TemplateRegistry.validateAllTemplates();
 *
 * Design:
 *   - Loads JSON once, caches in memory
 *   - Validates on load (stale/invalid refs surfaced loudly)
 *   - Returns templates by ID as the canonical source
 *   - No fallback to PROGRESSION_RULES.templates (that's deprecated)
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class TemplateRegistry {
  static _templates = null;
  static _validationReport = null;
  static _loadPromise = null;

  /**
   * Load all templates from data/character-templates.json
   * Caches in memory after first load.
   *
   * @returns {Promise<Array<Object>>} Array of canonical template objects
   * @throws {Error} If JSON is malformed or critical templates are invalid
   */
  static async getAllTemplates() {
    if (this._templates) {
      return this._templates;
    }

    // Prevent concurrent load attempts
    if (this._loadPromise) {
      return this._loadPromise;
    }

    this._loadPromise = this._loadTemplatesInternal();
    this._templates = await this._loadPromise;
    return this._templates;
  }

  /**
   * Get a single template by ID.
   *
   * @param {string} templateId - Template ID to retrieve
   * @returns {Promise<Object|null>} Template object or null if not found
   */
  static async getTemplate(templateId) {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Get templates filtered by class.
   *
   * @param {string} className - Class name (e.g., "Jedi", "Soldier")
   * @returns {Promise<Array<Object>>} Templates for that class
   */
  static async getTemplatesByClass(className) {
    const templates = await this.getAllTemplates();
    return templates.filter(t =>
      t.classId?.name === className || t.classId?.id === className
    );
  }

  /**
   * Get templates filtered by Force user status.
   *
   * @param {boolean} forceUser - True to get Force-using templates
   * @returns {Promise<Array<Object>>} Filtered templates
   */
  static async getTemplatesByForceUser(forceUser = true) {
    const templates = await this.getAllTemplates();
    return templates.filter(t => t.forceUser === forceUser);
  }

  /**
   * Validate all templates against compendium data.
   * Does NOT throw; returns detailed report.
   *
   * @returns {Promise<Object>} Validation report
   *   {
   *     valid: boolean,
   *     total: number,
   *     validCount: number,
   *     invalidCount: number,
   *     details: [{ templateId, valid, issues: [...] }]
   *   }
   */
  static async validateAllTemplates() {
    if (this._validationReport) {
      return this._validationReport;
    }

    const templates = await this.getAllTemplates();
    const report = {
      valid: true,
      total: templates.length,
      validCount: 0,
      invalidCount: 0,
      details: []
    };

    for (const template of templates) {
      const templateReport = await this._validateSingleTemplate(template);
      const isValid = templateReport.issues.length === 0;

      if (isValid) {
        report.validCount++;
      } else {
        report.invalidCount++;
        report.valid = false;
      }

      report.details.push({
        templateId: template.id,
        valid: isValid,
        issues: templateReport.issues
      });
    }

    this._validationReport = report;
    return report;
  }

  /**
   * @private
   */
  static async _loadTemplatesInternal() {
    try {
      swseLogger.debug('[TemplateRegistry] Loading templates from JSON');

      const response = await fetch('systems/foundryvtt-swse/data/character-templates.json');
      if (!response.ok) {
        throw new Error(
          `Failed to load character-templates.json: HTTP ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Validate structure
      if (!data.templates || !Array.isArray(data.templates)) {
        throw new Error('Invalid template JSON: missing or non-array templates field');
      }

      const version = data.version || 1;
      if (version !== 2) {
        swseLogger.warn(
          `[TemplateRegistry] Template file version is ${version}, expected 2. ` +
          `This may indicate outdated template structure.`
        );
      }

      // Filter out templates with missing IDs
      const validTemplates = data.templates.filter(t => {
        if (!t.id) {
          swseLogger.warn('[TemplateRegistry] Skipping template with no ID');
          return false;
        }
        return true;
      });

      swseLogger.log('[TemplateRegistry] Loaded templates', {
        total: data.templates.length,
        valid: validTemplates.length,
        skipped: data.templates.length - validTemplates.length,
        version
      });

      // Validate templates (non-blocking; issues logged)
      const validationReport = await this._validateAllInternal(validTemplates);
      if (validationReport.invalidCount > 0) {
        swseLogger.warn('[TemplateRegistry] Template validation issues', {
          valid: validationReport.validCount,
          invalid: validationReport.invalidCount,
          details: validationReport.details.filter(d => !d.valid)
        });
      }

      return validTemplates;
    } catch (err) {
      swseLogger.error('[TemplateRegistry] Fatal error loading templates:', err);
      throw err;
    }
  }

  /**
   * Validate a single template.
   * @private
   */
  static async _validateSingleTemplate(template) {
    const issues = [];

    // Validate structure
    if (!template.id || typeof template.id !== 'string') {
      issues.push('Missing or invalid id');
    }

    if (!template.classId) {
      issues.push('Missing classId');
    } else if (typeof template.classId !== 'object') {
      issues.push('classId must be an object with pack, id, name, type');
    }

    if (!template.speciesId) {
      issues.push('Missing speciesId');
    } else if (typeof template.speciesId !== 'object') {
      issues.push('speciesId must be an object with pack, id, name, type');
    }

    if (!template.abilityScores || typeof template.abilityScores !== 'object') {
      issues.push('Missing or invalid abilityScores');
    } else {
      const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      for (const ability of requiredAbilities) {
        if (template.abilityScores[ability] === undefined) {
          issues.push(`Missing ability score: ${ability}`);
        }
      }
    }

    if (!Array.isArray(template.feats)) {
      issues.push('feats must be an array');
    }

    if (!Array.isArray(template.talents)) {
      issues.push('talents must be an array');
    }

    if (!Array.isArray(template.forcePowers)) {
      issues.push('forcePowers must be an array');
    }

    if (!Array.isArray(template.equipment)) {
      issues.push('equipment must be an array');
    }

    if (typeof template.credits !== 'number' || template.credits < 0) {
      issues.push('credits must be a non-negative number');
    }

    if (template.level !== 1) {
      issues.push(`level must be 1 (got ${template.level})`);
    }

    return { issues };
  }

  /**
   * Internal validate all without caching.
   * @private
   */
  static async _validateAllInternal(templates) {
    const report = {
      validCount: 0,
      invalidCount: 0,
      details: []
    };

    for (const template of templates) {
      const result = await this._validateSingleTemplate(template);
      const isValid = result.issues.length === 0;

      if (isValid) {
        report.validCount++;
      } else {
        report.invalidCount++;
      }

      report.details.push({
        templateId: template.id,
        valid: isValid,
        issues: result.issues
      });
    }

    return report;
  }

  /**
   * Clear cached templates (for testing/reloading).
   * @private
   */
  static _clearCache() {
    this._templates = null;
    this._validationReport = null;
    this._loadPromise = null;
  }
}
