/**
 * Feat Action Listeners
 *
 * Registers Hooks.on() listeners for feats that trigger on game events
 * (combat outcomes, damage, actions, etc.)
 *
 * Registered feats:
 * - Sadistic Strike: Move opponent -1 step on CT when delivering Coup de Grace
 * - (Future) Rancor Crush: Move opponent -1 step on CT when using Crush feat
 * - (Future) Bone Crusher: Move grappled opponent -1 step on CT after damage
 * - (Future) Forceful Strike: Spend Force Point to move target -1 step on CT with Force Stun
 * - (Future) Forceful Telekinesis: Spend Force Point to move target -1 step on CT with Move Object
 */

import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class FeatActionListeners {
  /**
   * Initialize all feat action listeners.
   * Called from init-hooks during ready phase.
   */
  static initialize() {
    SWSELogger.log('[FeatActionListeners] Initializing feat action listeners');

    this._registerSadisticStrike();
    this._registerStayUp();
    // Future listeners will be registered here
    // this._registerRancorCrush();
    // this._registerBoneCrusher();
    // this._registerForcefulStrike();
    // this._registerForcefulTelekinesis();
  }

  /* ---------------------------------------- */
  /* SADISTIC STRIKE                          */
  /* ---------------------------------------- */
  /**
   * Sadistic Strike: Move opponent -1 step on CT when delivering Coup de Grace.
   * Listens for swse.coupDeGrace event emitted by CombatEngine.
   */
  static _registerSadisticStrike() {
    Hooks.on('swse.coupDeGrace', async (context) => {
      const { attacker, target, killed } = context;

      // Only apply if target was killed
      if (!killed) return;

      // Check if attacker has Sadistic Strike
      if (!MetaResourceFeatResolver.hasFeat(attacker, 'Sadistic Strike')) {
        return;
      }

      try {
        // Move target -1 step down the Condition Track
        const oldCT = target.system.conditionTrack.current ?? 0;
        await target.worsenConditionTrack();
        const newCT = target.system.conditionTrack.current ?? 0;

        SWSELogger.log(
          `[FeatActionListeners] Sadistic Strike applied by ${attacker.name}: ` +
          `${target.name} moved from CT ${oldCT} to CT ${newCT}`
        );

        // Notify players
        ui.notifications.info(
          `${attacker.name} uses Sadistic Strike: ${target.name} moved -1 step on the Condition Track.`
        );

      } catch (err) {
        SWSELogger.error('[FeatActionListeners] Sadistic Strike error:', err);
      }
    });

    SWSELogger.log('[FeatActionListeners] Sadistic Strike listener registered');
  }

  /* ---------------------------------------- */
  /* STAY UP                                  */
  /* ---------------------------------------- */
  /**
   * Stay Up: Move 1 step down Condition Track to reduce damage.
   * Listens for pre-damage hook to allow reducing damage before it's applied.
   */
  static _registerStayUp() {
    Hooks.on('swse.damage-before', async (context) => {
      const { target, damage } = context;

      if (!target || damage <= 0) {
        return;
      }

      // Check if target has Stay Up feat
      if (!MetaResourceFeatResolver.hasFeat(target, 'Stay Up')) {
        return;
      }

      // Check if target can move condition track (has capacity to worsen)
      const currentCT = target.system.conditionTrack?.current ?? 0;
      const maxCT = 5; // Helpless is step 5
      if (currentCT >= maxCT) {
        // Target is already at maximum condition track penalty
        return;
      }

      try {
        // Calculate damage reduction (10 damage per CT step, capped at total damage)
        const damageReduction = Math.min(10, damage);

        // Ask target if they want to use Stay Up
        const useStayUp = await this._confirmStayUpUsage(target, damageReduction);

        if (!useStayUp) {
          return;
        }

        // Move target -1 step down the Condition Track
        const oldCT = target.system.conditionTrack?.current ?? 0;
        await target.worsenConditionTrack();
        const newCT = target.system.conditionTrack?.current ?? 0;

        // Reduce the incoming damage by spending the CT step
        const newDamage = Math.max(0, damage - damageReduction);
        context.damage = newDamage;

        SWSELogger.log(
          `[FeatActionListeners] Stay Up used by ${target.name}: ` +
          `CT moved from ${oldCT} to ${newCT}, damage reduced from ${damage} to ${newDamage}`
        );

        // Notify players
        ui.notifications.info(
          `${target.name} uses Stay Up: Moved -1 step on CT and reduced damage by ${damageReduction} (${damage} → ${newDamage} damage).`
        );

      } catch (err) {
        SWSELogger.error('[FeatActionListeners] Stay Up error:', err);
      }
    });

    SWSELogger.log('[FeatActionListeners] Stay Up listener registered');
  }

  /**
   * Helper: Confirm Stay Up usage with the target player.
   * Returns a promise that resolves to true if the player accepts, false otherwise.
   * @private
   */
  static async _confirmStayUpUsage(actor, damageReduction) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: `${actor.name} - Stay Up`,
        content: `<p><strong>Stay Up</strong>: Move 1 step down the Condition Track to reduce damage by ${damageReduction} HP?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Use Stay Up',
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Decline',
            callback: () => resolve(false)
          }
        },
        default: 'no',
        close: () => resolve(false)
      });
      dialog.render(true);
    });
  }

  /* ---------------------------------------- */
  /* FUTURE: RANCOR CRUSH                     */
  /* ---------------------------------------- */
  // static _registerRancorCrush() {
  //   // Listen for Crush feat activation
  //   // When Crush feat is resolved:
  //   //   - Check if attacker has Rancor Crush
  //   //   - If yes: Move target -1 step on CT
  // }

  /* ---------------------------------------- */
  /* FUTURE: BONE CRUSHER                     */
  /* ---------------------------------------- */
  // static _registerBoneCrusher() {
  //   // Listen for grapple damage application
  //   // When grapple damage is applied to grappled opponent:
  //   //   - Check if attacker has Bone Crusher
  //   //   - If yes: Move target -1 step on CT
  // }

  /* ---------------------------------------- */
  /* FUTURE: FORCEFUL STRIKE                  */
  /* ---------------------------------------- */
  // static _registerForcefulStrike() {
  //   // Listen for Force Stun activation
  //   // When Force Stun is resolved:
  //   //   - Check if attacker has Forceful Strike
  //   //   - If yes: Offer to spend Force Point to move target -1 step on CT
  // }

  /* ---------------------------------------- */
  /* FUTURE: FORCEFUL TELEKINESIS             */
  /* ---------------------------------------- */
  // static _registerForcefulTelekinesis() {
  //   // Listen for Move Object activation
  //   // When Move Object is resolved:
  //   //   - Check if user has Forceful Telekinesis
  //   //   - If yes: Offer to spend Force Point to move target -1 step on CT
  // }
}
