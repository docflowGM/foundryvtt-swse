import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
      if (!game.settings.get('foundryvtt-swse', 'resetResourcesOnCombat')) {return;}

      for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor) {continue;}

        if (actor.type === 'character') {
          // PHASE 3: Route through ActorEngine
          const { ActorEngine } = await import('../../actor-engine.js');
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
    const threshold = actor.system.derived?.damageThreshold ?? actor.system.damageThreshold ?? 0;

    if (damage < threshold) {return false;}

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
      <div class="swse threshold-exceeded">
        <h3>⚠ Damage Threshold Exceeded!</h3>
        <p><strong>${actor.name}</strong> takes ${damage} damage (Threshold: ${threshold})</p>
        <p>Condition worsens by one step.</p>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });

    await actor.moveConditionTrack(1);

    if (actor.system.hp.value === 0 && actor.isHelpless) {
      await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
        <div class="swse death-notification">
          <h3>☠ Character Defeated!</h3>
          <p><strong>${actor.name}</strong> is Helpless at 0 HP.</p>
        </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    }

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
      ui.notifications.warn(`${actor.name}'s condition is persistent and does not naturally recover.`);
      return;
    }

    return new Promise(resolve => {
      new SWSEDialogV2({
        title: `${actor.name} — Condition Recovery`,
        content: `
          <div class="swse condition-recovery">
            <p><strong>${actor.name}</strong> may attempt natural Condition Track recovery.</p>
            <p>Current Condition: <strong>${this._conditionLabel(ct)}</strong></p>
            <hr>
            <p>Select an option:</p>
          </div>
        `,
        buttons: {
          recover: {
            icon: '<i class="fa-solid fa-heart"></i>',
            label: 'Recover Naturally',
            callback: async () => {
              await actor.moveConditionTrack(-1);

              createChatMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `<strong>${actor.name}</strong> recovers one step on the Condition Track.`
              });

              resolve(true);
            }
          },
          secondWind: {
            icon: '<i class="fa-solid fa-wind"></i>',
            label: 'Use Second Wind',
            callback: async () => {
              if (actor.type !== 'character') {
                ui.notifications.warn('Only characters can use Second Wind.');
                return resolve(false);
              }
              const ok = await actor.useSecondWind();
              resolve(ok);
            }
          },
          skip: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Skip',
            callback: () => {
              ui.notifications.info(`${actor.name} does not attempt recovery.`);
              resolve(false);
            }
          }
        },
        default: 'recover'
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
