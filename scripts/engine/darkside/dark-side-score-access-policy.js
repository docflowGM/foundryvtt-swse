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

/**
 * Determine ownership for the given user. Prefers Foundry's real
 * permission check (actor.testUserPermission(user, 'OWNER')), which
 * respects a caller-supplied `user` rather than the current client
 * session; falls back to actor.isOwner for lightweight test doubles that
 * don't implement testUserPermission.
 */
function isOwnerFor(actor, user) {
  if (typeof actor?.testUserPermission === 'function' && user) {
    return actor.testUserPermission(user, 'OWNER') === true;
  }
  return actor?.isOwner === true;
}

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
    return validPolicy === 'ownerOrGM' && isOwnerFor(actor, user);
  },

  /**
   * @param {Actor} actor
   * @param {object} [options] - same shape as canEdit()
   * @returns {string} '' when editing is permitted, otherwise a user-facing explanation
   */
  getReadOnlyReason(actor, options = {}) {
    if (this.canEdit(actor, options)) return '';

    if (options.sheetEditable === false) {
      return 'This sheet is read-only.';
    }

    const resolvedPolicy = options.policy ?? HouseRuleService.getString('darkSideScoreEditPolicy', 'gmOnly');
    const validPolicy = resolvedPolicy === 'ownerOrGM' ? 'ownerOrGM' : 'gmOnly';
    return validPolicy === 'ownerOrGM'
      ? 'You do not have permission to edit this Dark Side Score.'
      : 'Only the Gamemaster can edit this Dark Side Score.';
  }
};
