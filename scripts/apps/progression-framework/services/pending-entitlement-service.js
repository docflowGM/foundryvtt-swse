/**
 * PendingEntitlementService
 *
 * Generalized framework for managing pending entitlements and immediate choices
 * in the progression engine.
 *
 * Two families:
 * 1. Pending Entitlements — Subsystem picks resolved elsewhere
 *    - skill_training_slot → consumed in Skills step
 *    - language_pick → consumed in Languages subsystem
 *    - force_power_pick → consumed in Force step
 *    - maneuver_pick → consumed in Starship Maneuver step
 *
 * 2. Immediate Choices — Resolved immediately in owning step
 *    - skill_focus_choice → resolved in Feat step
 *    - weapon_proficiency_choice → resolved in Feat step
 *    - weapon_focus_choice → resolved in Feat step
 *    - weapon_specialization_choice → resolved in Talent step
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class PendingEntitlementService {
  /**
   * Create a new pending entitlement.
   * @param {string} type - Entitlement type (skill_training_slot, language_pick, force_power_pick, maneuver_pick)
   * @param {Object} source - { stepId, featId/talentId, classFeatureId }
   * @param {number} quantity - How many picks this entitlement grants
   * @param {Object} options - { allowedOptions, validation }
   * @returns {Object} Entitlement object
   */
  static createEntitlement(type, source, quantity, options = {}) {
    if (!type || !source) {
      throw new Error('[PendingEntitlementService] Missing type or source');
    }

    const validTypes = [
      'skill_training_slot',
      'language_pick',
      'force_power_pick',
      'maneuver_pick',
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`[PendingEntitlementService] Invalid entitlement type: ${type}`);
    }

    return {
      id: `entitlement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      source: { ...source },
      quantity: Math.max(1, quantity || 1),
      spent: 0,
      spentSelections: [],
      allowedOptions: options.allowedOptions || [],
      validation: options.validation || {},
      createdAt: Date.now(),
    };
  }

  /**
   * Create an immediate choice entry.
   * @param {string} type - Choice type (skill_focus_choice, weapon_proficiency_choice, etc.)
   * @param {Object} source - { stepId, featId/talentId }
   * @param {Object} options - { allowedOptions, required, validation }
   * @returns {Object} Choice object
   */
  static createImmediateChoice(type, source, options = {}) {
    if (!type || !source) {
      throw new Error('[PendingEntitlementService] Missing type or source');
    }

    const validTypes = [
      'skill_focus_choice',
      'weapon_proficiency_choice',
      'weapon_focus_choice',
      'weapon_specialization_choice',
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`[PendingEntitlementService] Invalid choice type: ${type}`);
    }

    return {
      id: `choice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      source: { ...source },
      required: options.required !== false,
      resolved: false,
      value: null,
      allowedOptions: options.allowedOptions || [],
      validation: options.validation || {},
      createdAt: Date.now(),
    };
  }

  /**
   * Spend an entitlement.
   * @param {Object} entitlement - Entitlement to spend from
   * @param {number} count - How many to spend
   * @param {Array} selections - What was selected
   * @returns {Object} Updated entitlement
   */
  static spendEntitlement(entitlement, count = 1, selections = []) {
    if (!entitlement) {
      throw new Error('[PendingEntitlementService] Missing entitlement');
    }

    const newSpent = Math.min(entitlement.quantity, entitlement.spent + count);
    const updated = { ...entitlement };
    updated.spent = newSpent;
    updated.spentSelections = [...(entitlement.spentSelections || []), ...selections];

    return updated;
  }

  /**
   * Resolve an immediate choice.
   * @param {Object} choice - Choice to resolve
   * @param {*} value - Selected value
   * @returns {Object} Updated choice
   */
  static resolveImmediateChoice(choice, value) {
    if (!choice) {
      throw new Error('[PendingEntitlementService] Missing choice');
    }

    if (value === null || value === undefined) {
      throw new Error('[PendingEntitlementService] Cannot resolve choice with null/undefined value');
    }

    return {
      ...choice,
      resolved: true,
      value,
    };
  }

  /**
   * Get unspent count for an entitlement.
   * @param {Object} entitlement
   * @returns {number}
   */
  static getUnspentCount(entitlement) {
    if (!entitlement) return 0;
    return Math.max(0, entitlement.quantity - entitlement.spent);
  }

  /**
   * Check if all unresolved choices are actually required.
   * @param {Array} choices
   * @returns {Array} Only required unresolved choices
   */
  static getUnresolvedRequiredChoices(choices = []) {
    return choices.filter(c => c.required && !c.resolved);
  }

  /**
   * Check if any entitlements remain unspent.
   * @param {Array} entitlements
   * @returns {Array} Unspent entitlements
   */
  static getUnspentEntitlements(entitlements = []) {
    return entitlements.filter(e => PendingEntitlementService.getUnspentCount(e) > 0);
  }

  /**
   * Summary: Are all required items resolved/spent?
   * @param {Object} params - { pendingEntitlements, immediateChoices }
   * @returns {Object} { isComplete: boolean, blockers: [] }
   */
  static getCompletionStatus(params = {}) {
    const { pendingEntitlements = [], immediateChoices = [] } = params;

    const blockers = [];

    // Check for unresolved required immediate choices
    const unresolvedChoices = PendingEntitlementService.getUnresolvedRequiredChoices(immediateChoices);
    if (unresolvedChoices.length > 0) {
      blockers.push({
        type: 'unresolved_choices',
        count: unresolvedChoices.length,
        items: unresolvedChoices,
      });
    }

    // Check for unspent entitlements
    const unspent = PendingEntitlementService.getUnspentEntitlements(pendingEntitlements);
    if (unspent.length > 0) {
      blockers.push({
        type: 'unspent_entitlements',
        count: unspent.length,
        items: unspent,
      });
    }

    return {
      isComplete: blockers.length === 0,
      blockers,
    };
  }

  /**
   * Find entitlements of a specific type.
   * @param {Array} entitlements
   * @param {string} type
   * @returns {Array}
   */
  static findByType(entitlements = [], type) {
    return entitlements.filter(e => e.type === type);
  }

  /**
   * Find choices of a specific type.
   * @param {Array} choices
   * @param {string} type
   * @returns {Array}
   */
  static findChoicesByType(choices = [], type) {
    return choices.filter(c => c.type === type);
  }

  /**
   * Remove an entitlement by ID.
   * @param {Array} entitlements
   * @param {string} id
   * @returns {Array} Updated array
   */
  static removeEntitlementById(entitlements = [], id) {
    return entitlements.filter(e => e.id !== id);
  }

  /**
   * Remove a choice by ID.
   * @param {Array} choices
   * @param {string} id
   * @returns {Array} Updated array
   */
  static removeChoiceById(choices = [], id) {
    return choices.filter(c => c.id !== id);
  }

  /**
   * Log for debugging.
   * @param {string} label
   * @param {Object} data
   */
  static debug(label, data = {}) {
    swseLogger.debug(`[PendingEntitlementService] ${label}`, data);
  }
}

export default PendingEntitlementService;
