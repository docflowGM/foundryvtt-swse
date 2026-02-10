/**
 * Gear Templates Engine - Contract Restoration
 *
 * Pure data normalization and template resolution for gear.
 * No UI side-effects. No implicit mutations.
 * Returns structured objects only.
 *
 * NOTE: Full implementation pending. Currently provides safe stubs that:
 * - Allow the app to boot without errors
 * - Return valid contract structures
 * - Disable template features (all validations return unsupported)
 * - Will be layered in later when feature rules are finalized
 */

export class GearTemplatesEngine {
  // Internal template registry (empty for now - will be populated via rules later)
  static #templates = {};

  /**
   * Get a template by its key
   * @param {string} key - Template key
   * @returns {Object|null} Template object or null: { name, manufacturer, description, ... }
   * @private
   */
  static _getTemplateByKey(key) {
    if (!key) {
      return null;
    }

    // Check internal registry
    const template = this.#templates[key];
    if (template) {
      return template;
    }

    // TODO: Implement template lookup when template library is available
    // Currently returns null to indicate unsupported template
    return null;
  }

  /**
   * Get templates available for a specific item
   * @param {Object} item - The item to get templates for
   * @returns {Array} Array of template objects
   */
  static getAvailableTemplates(item) {
    // TODO: Implement template compatibility checking when rules are finalized
    // This would check item type, rarity, prerequisites, etc.
    // For now, return empty array (no templates available)
    return [];
  }

  /**
   * Calculate the cost to apply a template to an item
   * @param {Object} item - The item
   * @param {Object} template - The template to apply
   * @returns {number} Cost in credits
   */
  static calculateTemplateCost(item, template) {
    if (!item || !template) {
      return 0;
    }

    // TODO: Implement cost calculation based on:
    // - Base template cost
    // - Item rarity/quality modifiers
    // - Character perks/discounts
    // For now, return template's base cost if defined
    return Number(template.cost ?? 0);
  }

  /**
   * Validate whether a template can be applied to an item
   * @param {Object} item - The item to apply template to
   * @param {string} templateKey - The template key
   * @returns {Object} Validation result: { valid, reason }
   */
  static canApplyTemplate(item, templateKey) {
    if (!item || !templateKey) {
      return {
        valid: false,
        reason: 'Item or template key missing'
      };
    }

    // TODO: Implement template validation:
    // - Check item type compatibility
    // - Check for existing template
    // - Check for conflicting upgrades/templates
    // - Verify item rarity allows template
    // For now, always return unsupported (feature not yet implemented)
    return {
      valid: false,
      reason: 'Gear templates are not yet implemented in this version'
    };
  }

  /**
   * Apply a template to an item
   * @param {Object} item - The item to modify
   * @param {string} templateKey - The template to apply
   * @returns {Promise} Resolves when template is applied
   */
  static async applyTemplate(item, templateKey) {
    if (!item || !templateKey) {
      return;
    }

    // TODO: Implement template application:
    // - Update item.system.gearTemplate
    // - Store template cost in item.system.templateCost
    // - Update any derived stats
    // - Trigger any rule engine updates
    // For now: safely do nothing (feature not yet implemented)
  }

  /**
   * Remove a template from an item
   * @param {Object} item - The item to modify
   * @returns {Promise} Resolves when template is removed
   */
  static async removeTemplate(item) {
    if (!item) {
      return;
    }

    // TODO: Implement template removal:
    // - Clear item.system.gearTemplate
    // - Clear item.system.templateCost
    // - Revert any derived stat changes
    // For now: safely do nothing (feature not yet implemented)
  }

  /**
   * Register a template in the engine
   * Used internally to load templates from rules/compendium
   * @param {string} key - Template key
   * @param {Object} template - Template definition
   * @internal
   */
  static _registerTemplate(key, template) {
    if (key && template) {
      this.#templates[key] = template;
    }
  }

  /**
   * Clear all registered templates
   * @internal
   */
  static _clearTemplates() {
    this.#templates = {};
  }
}
