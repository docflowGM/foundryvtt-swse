import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

/**
 * Dark Side Score access policy — authorization only, no storage or
 * calculation concerns (those belong to DSPEngine) and no mutations.
 *
 * Combines the world setting (darkSideScoreEditPolicy), GM status, actor
 * ownership, and sheet editability into a single decision, so neither the
 * panel-context builder nor the click handler re-implements this logic
 * independently.
 */
export const DarkSideScoreAccessPolicy = {
  /**
   * @param {Actor} actor
   * @param {object} [options]
   * @param {object} [options.user] - defaults to game.user
   * @param {boolean} [options.sheetEditable=true]
   * @param {string} [options.policy] - override the world setting (for tests)
   * @returns {boolean}
   */
  canEdit(actor, { user = game?.user, sheetEditable = true, policy = null } = {}) {
    if (!actor || !user) return false;
    if (!sheetEditable) return false;
    if (user.isGM) return true;

    const resolvedPolicy = policy ?? HouseRuleService.getString('darkSideScoreEditPolicy', 'gmOnly');
    const validPolicy = resolvedPolicy === 'ownerOrGM' ? 'ownerOrGM' : 'gmOnly';
    return validPolicy === 'ownerOrGM' && actor.isOwner === true;
  },

  /**
   * @param {Actor} actor
   * @param {object} [options] - same shape as canEdit()
   * @returns {string} '' when editing is permitted, otherwise a user-facing explanation
   */
  getReadOnlyReason(actor, options = {}) {
    if (this.canEdit(actor, options)) return '';

    const resolvedPolicy = options.policy ?? HouseRuleService.getString('darkSideScoreEditPolicy', 'gmOnly');
    const validPolicy = resolvedPolicy === 'ownerOrGM' ? 'ownerOrGM' : 'gmOnly';
    return validPolicy === 'ownerOrGM'
      ? 'You do not have permission to edit this Dark Side Score.'
      : 'Only the Gamemaster can edit this Dark Side Score.';
  }
};
