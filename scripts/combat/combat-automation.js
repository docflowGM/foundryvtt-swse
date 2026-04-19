import { ThresholdEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { CombatRules } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatRules.js";

/**
 * SWSE Combat Automation (v13+)
 * - Clean, modern hook registration
 * - Uses refactored SWSEActorBase condition & damage logic
 * - Safe asynchronous turn-handling
 * - Optional resource reset on combat start
 * - Updated for structured Active Effects (B3 format)
 */

export class SWSECombatAutomation {

  static init() {
    SWSELogger.log('SWSE | Initializing Combat Automation');
    this._registerHooks();
  }

  /* -------------------------------------------------------------------------- */
  /* HOOK REGISTRATION                                                           */
  /* -------------------------------------------------------------------------- */

  static _registerHooks() {

    /**
     * 🕒 Turn Start — Natural Condition Recovery
     * If an actor has taken Condition Track steps, prompt them at the start
     * of their turn unless Persistent.
     */
    Hooks.on('combatTurn', async combat => {
      const combatant = combat?.combatant;
      const actor = combatant?.actor;
      if (!actor) {return;}

      const ct = actor.system.conditionTrack?.current ?? 0;
      if (ct > 0) {await this._promptConditionRecovery(actor);}
    });

    /**
     * ⚔ Combat Start — Reset Resources
     * Controlled by SWSE system setting: resetResourcesOnCombat
     */
    Hooks.on('combatStart', async combat => {
      if (!CombatRules.resetResourcesOnCombatEnabled()) {return;}

      for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor) {continue;}

        if (actor.type === 'character') {
          // PHASE 3: Route through ActorEngine
          const { ActorEngine } = await import("/systems/foundryvtt-swse/actor-engine.js");
          await ActorEngine.resetSecondWind(actor);
        }
      }
    });

    /**
     * 🧹 Combat End — Cleanup & Logging
     */
    Hooks.on('combatEnd', () => {
      SWSELogger.log('SWSE | Combat ended.');
    });
  }

  /* -------------------------------------------------------------------------- */
  /* DAMAGE THRESHOLD CHECKING (Legacy Hook)                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * This method remains available for external modules/macros,
   * but threshold logic is already handled inside Actor.applyDamage().
   */
  static async checkDamageThreshold(actor, damage) {
    const result = ThresholdEngine.evaluateThreshold({ target: actor, damage });
    if (!result?.thresholdExceeded) {return false;}
    await ThresholdEngine.applyResult(result);
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION RECOVERY PROMPT                                                  */
  /* -------------------------------------------------------------------------- */

  static async _promptConditionRecovery(actor) {
    const ct = actor.system.conditionTrack?.current ?? 0;
    const persistent = actor.system.conditionTrack?.persistent === true;

    if (ct === 0) {return;}
    if (persistent) {
      ui.notifications.warn(`${actor.name}'s condition is persistent and cannot be removed by the Recover Action.`);
      return;
    }

    return new Promise(resolve => {
      new SWSEDialogV2({
        title: `${actor.name} — Recover Action`,
        content: `
          <div class="swse condition-recovery">
            <p><strong>${actor.name}</strong> may spend <strong>3 Swift Actions</strong> to move <strong>+1 step</strong> on the Condition Track.</p>
            <p>These Swift Actions can be spent in one round or spread across consecutive rounds.</p>
            <p>Current Condition: <strong>${this._conditionLabel(ct)}</strong></p>
          </div>
        `,
        buttons: {
          recover: {
            icon: '<i class="fa-solid fa-heart"></i>',
            label: 'Spend Swift Toward Recovery',
            callback: async () => {
              const result = await globalThis.SWSE.ActorEngine.recoverConditionStep(actor, 'recover-action');
              if (result?.complete) {
                createChatMessage({
                  speaker: ChatMessage.getSpeaker({ actor }),
                  content: `<strong>${actor.name}</strong> completes the Recover Action and moves +1 step on the Condition Track.`
                });
              } else if (typeof result?.remaining === 'number') {
                createChatMessage({
                  speaker: ChatMessage.getSpeaker({ actor }),
                  content: `<strong>${actor.name}</strong> spends a Swift Action toward recovery (${3 - result.remaining}/3).`
                });
              }
              resolve(true);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-ban"></i>',
            label: 'Cancel',
            callback: () => resolve(false)
          }
        }
      }).render(true);
    });
  }

  static _conditionLabel(step) {
    return (
      ['Normal', '-1 Penalty', '-2 Penalty', '-5 Penalty', '-10 Penalty', 'Helpless'][step] ??
      'Unknown'
    );
  }

  /* -------------------------------------------------------------------------- */
  /* UTILITY                                                                    */
  /* -------------------------------------------------------------------------- */

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }
}
