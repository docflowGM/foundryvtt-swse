/**
 * AbilityEngine - Handles ability card panel models for actor sheets
 */

export class AbilityEngine {
  /**
   * Get card panel model for actor abilities
   * @param {Actor} actor - The actor to get abilities for
   * @returns {Object} Model with all, feats, talents, racialAbilities
   */
  static getCardPanelModelForActor(actor) {
    return {
      all: [],
      feats: [],
      talents: [],
      racialAbilities: []
    };
  }
}
