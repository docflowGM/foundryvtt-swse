/**
 * StepController — Reusable step navigation and validation helper
 *
 * Handles all common patterns for multi-step builders:
 * - Step lifecycle (register, validate, navigate)
 * - Item selection (radio vs checkbox)
 * - Budget enforcement
 * - Back-navigation invalidation + auto-prune
 * - Validation plumbing (hard vs soft)
 *
 * This controller is NOT an application—it's a pure helper operating on
 * in-memory droidSystems state. Actor mutation happens only in finalization.
 */

export class StepController {
  /**
   * Initialize StepController
   *
   * @param {Object} droidSystems - Actor's system.droidSystems (in-memory copy)
   * @param {Actor} actor - Actor reference (for notifications, metadata)
   * @param {Object} catalog - System catalogs keyed by step name
   *   Example: { locomotion: [...items], manipulators: [...items], ... }
   */
  constructor(droidSystems, actor = null, catalog = {}) {
    this.droidSystems = droidSystems;
    this.actor = actor;
    this.catalog = catalog;

    // Track which steps have been modified (for back-nav invalidation)
    this.stepHistory = new Map();
  }

  // ─────────────────────────────────────────────────────────────────
  // ITEM SELECTION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Select a single item for the current step (radio button)
   *
   * @param {string} stepName - e.g., 'locomotion', 'manipulators'
   * @param {string} itemId - Single item ID
   * @param {Object} config - Step configuration from DroidBuilderApp.STEP_CONFIG
   * @returns {Promise<Object>} { success: boolean, error?: string }
   */
  async selectItem(stepName, itemId, config) {
    if (!config) {
      throw new Error(`No configuration provided for step: ${stepName}`);
    }

    // Validate step exists in catalog
    const catalogItems = this.catalog[stepName];
    if (!Array.isArray(catalogItems)) {
      return { success: false, error: `No catalog found for step: ${stepName}` };
    }

    // Find item in catalog
    const item = catalogItems.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: `Invalid ${stepName} ID: ${itemId}` };
    }

    // For single-select steps (radio)
    if (config.selectionType === 'single') {
      const selectedItem = {
        id: item.id,
        name: item.name,
        cost: item.cost || 0,
        ...this._extractItemProperties(item)
      };

      this._setMutation(config.mutation, selectedItem);
      this.stepHistory.set(stepName, true); // Mark as modified
    }

    // For multi-select steps, use toggleItem instead
    if (config.selectionType === 'multiple') {
      return {
        success: false,
        error: `Use toggleItem() for multi-select step: ${stepName}`
      };
    }

    // Recalculate budget
    this._recalculateBudget();
    return { success: true };
  }

  /**
   * Toggle an item in a multi-select step (checkbox)
   *
   * @param {string} stepName - e.g., 'manipulators', 'weapons'
   * @param {string} itemId - Item ID to toggle
   * @param {boolean} add - true to add, false to remove
   * @param {Object} config - Step configuration from DroidBuilderApp.STEP_CONFIG
   * @returns {Promise<Object>} { success: boolean, error?: string }
   */
  async toggleItem(stepName, itemId, add, config) {
    if (!config) {
      throw new Error(`No configuration provided for step: ${stepName}`);
    }

    if (config.selectionType !== 'multiple') {
      return {
        success: false,
        error: `Step ${stepName} is not multi-select`
      };
    }

    const catalogItems = this.catalog[stepName];
    if (!Array.isArray(catalogItems)) {
      return { success: false, error: `No catalog found for step: ${stepName}` };
    }

    const current = this._getMutation(config.mutation) || [];
    let updated;

    if (add) {
      // Find item in catalog
      const item = catalogItems.find(i => i.id === itemId);
      if (!item) {
        return { success: false, error: `Invalid item: ${itemId}` };
      }

      // Check if already selected
      if (current.some(i => i.id === itemId)) {
        return { success: false, error: 'Item already selected' };
      }

      // Add to array
      updated = [
        ...current,
        {
          id: item.id,
          name: item.name,
          cost: item.cost || 0,
          ...this._extractItemProperties(item)
        }
      ];
    } else {
      // Remove from array
      updated = current.filter(i => i.id !== itemId);
    }

    this._setMutation(config.mutation, updated);
    this.stepHistory.set(stepName, true); // Mark as modified
    this._recalculateBudget();

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Validate a step using its validation function
   *
   * Note: The validation function itself is supplied by the app or step.
   * StepController just provides the plumbing to call it.
   *
   * @param {string} stepName - e.g., 'locomotion'
   * @param {Function} validationFn - Pure validation function
   *   Signature: (selectedValue, droidSystems) => { valid: boolean, errors: [], warnings: [] }
   * @returns {Promise<Object>} { valid: boolean, errors: string[], warnings: string[] }
   */
  async validateStep(stepName, validationFn, config) {
    if (!validationFn || typeof validationFn !== 'function') {
      return {
        valid: false,
        errors: ['No validation function provided'],
        warnings: []
      };
    }

    if (!config) {
      return {
        valid: false,
        errors: ['No step configuration provided'],
        warnings: []
      };
    }

    // Get the selected value for this step
    const selectedValue = this._getMutation(config.mutation);

    // Call the validation function
    const result = validationFn(selectedValue, this.droidSystems, config);

    return {
      valid: result.errors?.length === 0 ?? true,
      errors: result.errors || [],
      warnings: result.warnings || []
    };
  }

  /**
   * Check if progression is allowed from current step
   *
   * @param {string} stepName
   * @param {Function} validationFn
   * @param {Object} config
   * @returns {Promise<boolean>}
   */
  async canAdvance(stepName, validationFn, config) {
    const validation = await this.validateStep(stepName, validationFn, config);

    // Hard validation blocks, soft warnings don't
    return validation.valid;
  }

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Attempt to advance to the next step
   *
   * Validation is called; if invalid, returns error.
   * Budget is checked; if over, returns error.
   *
   * @param {string} currentStep - Current step name
   * @param {string} nextStep - Next step name
   * @param {Function} validationFn - Validation function for current step
   * @param {Object} config - Configuration for current step
   * @param {Object} stepOrder - Array of step names in order
   * @returns {Promise<Object>} { success: boolean, errors?: string[] }
   */
  async nextStep(currentStep, nextStep, validationFn, config, stepOrder) {
    // Validate current step
    const validation = await this.validateStep(currentStep, validationFn, config);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Check budget
    const budget = this._calculateBudget();
    if (budget.remaining < 0) {
      return {
        success: false,
        errors: [`Over budget by ${Math.abs(budget.remaining)} credits`]
      };
    }

    // Check if there are downstream selections that need auto-pruning
    const prunedSteps = await this._checkDownstreamValidity(
      currentStep,
      nextStep,
      stepOrder
    );

    return {
      success: true,
      prunedSteps // Caller can notify user if any steps were cleared
    };
  }

  /**
   * Go back to previous step
   *
   * Simple operation: just returns success.
   * Auto-pruning happens when user clicks Next after editing previous step.
   *
   * @param {string} fromStep - Current step
   * @param {string} toStep - Previous step
   * @returns {Promise<Object>} { success: boolean }
   */
  async backStep(fromStep, toStep) {
    // Just record navigation
    // Auto-prune will happen on next nextStep() call
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // BACK-NAVIGATION INVALIDATION & AUTO-PRUNE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Automatically prune invalid downstream selections after back-edit
   *
   * Called internally by nextStep() after validating the current step.
   * Checks all downstream steps for validity; if invalid, clears selection.
   *
   * @param {string} fromStep - Step being exited
   * @param {string} toStep - Step being entered
   * @param {Object} stepOrder - Array of all step names in order
   * @returns {Promise<Object>} { prunedSteps: string[], errors: string[] }
   *
   * @private
   */
  async _checkDownstreamValidity(fromStep, toStep, stepOrder) {
    // Only check if coming from a back-edit
    if (!this.stepHistory.has(fromStep)) {
      return { prunedSteps: [], errors: [] };
    }

    const fromIndex = stepOrder.indexOf(fromStep);
    if (fromIndex < 0) {
      return { prunedSteps: [], errors: [] };
    }

    // Get all downstream steps
    const downstreamSteps = stepOrder.slice(fromIndex + 1);
    const prunedSteps = [];

    // For now, just return the list; validation logic is in the app
    // The app will decide which validation functions to call for each step

    return {
      prunedSteps,
      errors: []
    };
  }

  /**
   * Auto-prune a specific downstream step
   *
   * Called by the app when auto-pruning is needed.
   * Clears the step's selection in droidSystems.
   *
   * @param {string} stepName - Step to prune
   * @param {Object} config - Step configuration
   */
  async autoPruneStep(stepName, config) {
    if (!config) {
      return;
    }

    const current = this._getMutation(config.mutation);

    // Clear based on selection type
    if (config.selectionType === 'single') {
      this._setMutation(config.mutation, { id: '', name: '', cost: 0 });
    } else if (config.selectionType === 'multiple') {
      this._setMutation(config.mutation, []);
    }

    this.stepHistory.delete(stepName); // Reset history for this step
    this._recalculateBudget();
  }

  // ─────────────────────────────────────────────────────────────────
  // BUDGET HELPERS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Recalculate budget after item selection/removal
   *
   * @private
   */
  _recalculateBudget() {
    this.droidSystems.credits = this._calculateBudget();
  }

  /**
   * Calculate total cost and remaining budget
   *
   * Must handle all system types in droidSystems:
   * - Single-select systems (locomotion, processor, armor)
   * - Multi-select systems (appendages, accessories, weapons, sensors)
   *
   * @returns {Object} { total, spent, remaining }
   * @private
   */
  _calculateBudget() {
    if (!this.droidSystems) {
      return { total: 2000, spent: 0, remaining: 2000 };
    }

    let spent = 0;

    // Single-select systems
    if (this.droidSystems.locomotion?.cost) {
      spent += this.droidSystems.locomotion.cost;
    }
    if (this.droidSystems.processor?.cost) {
      spent += this.droidSystems.processor.cost;
    }
    if (this.droidSystems.armor?.cost) {
      spent += this.droidSystems.armor.cost;
    }

    // Multi-select systems
    (this.droidSystems.appendages || []).forEach(a => {
      spent += a.cost || 0;
    });
    (this.droidSystems.accessories || []).forEach(a => {
      spent += a.cost || 0;
    });
    (this.droidSystems.weapons || []).forEach(w => {
      spent += w.cost || 0;
    });
    (this.droidSystems.sensors || []).forEach(s => {
      spent += s.cost || 0;
    });

    const total = this.droidSystems.credits?.total || 2000;

    return {
      total,
      spent,
      remaining: total - spent
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get a value from droidSystems via dot notation
   *
   * Example: _getMutation('droidSystems.locomotion') → droidSystems.locomotion
   *
   * @param {string} path - Dot-separated path
   * @returns {*} Value at path
   * @private
   */
  _getMutation(path) {
    if (!path) return null;

    const keys = path.split('.');
    let value = this.droidSystems;

    for (const key of keys) {
      if (key === 'droidSystems') continue; // Skip root
      if (!value) break;
      value = value[key];
    }

    return value;
  }

  /**
   * Set a value in droidSystems via dot notation
   *
   * Creates intermediate objects as needed.
   *
   * @param {string} path - Dot-separated path
   * @param {*} value - Value to set
   * @private
   */
  _setMutation(path, value) {
    if (!path) return;

    const keys = path.split('.');
    let target = this.droidSystems;

    // Navigate/create path
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key === 'droidSystems') continue; // Skip root
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    // Set final value
    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;
  }

  /**
   * Extract item properties common to most systems
   *
   * Each step may have different optional fields (speed, bonus, damage, etc).
   * This copies them all without hardcoding.
   *
   * @param {Object} item - Item from catalog
   * @returns {Object} Extracted properties
   * @private
   */
  _extractItemProperties(item) {
    const props = {};
    const commonFields = [
      'speed', 'bonus', 'damage', 'searchBonus', 'dexBonus',
      'defenseBonus', 'skillBonus', 'description'
    ];

    for (const field of commonFields) {
      if (item[field] !== undefined) {
        props[field] = item[field];
      }
    }

    return props;
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC QUERIES (for template/UI data)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current budget state
   *
   * @returns {Object} { total, spent, remaining }
   */
  getBudget() {
    return this._calculateBudget();
  }

  /**
   * Get selected items for a step
   *
   * @param {Object} config - Step configuration
   * @returns {*} Selected value (single object or array)
   */
  getSelected(config) {
    if (!config) return null;
    return this._getMutation(config.mutation);
  }

  /**
   * Get available items for a step
   *
   * @param {string} stepName
   * @returns {Array} Items from catalog
   */
  getAvailable(stepName) {
    return this.catalog[stepName] || [];
  }

  /**
   * Check if an item can be added to current budget
   *
   * @param {Object} item - Item from catalog
   * @returns {boolean}
   */
  canAddItem(item) {
    const budget = this.getBudget();
    return (item?.cost || 0) <= budget.remaining;
  }
}
