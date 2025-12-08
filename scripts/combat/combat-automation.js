import { SWSELogger } from '../utils/logger.js';
import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
/**
 * Combat Automation
 * Handles automatic damage threshold checks, condition track, etc.
 */

export class SWSECombatAutomation {

    static getSelectedActor() {
        return canvas.tokens.controlled[0]?.actor;
    }


  static init() {
    // Register combat hooks
    this._registerHooks();
  }

  static _registerHooks() {
    // Hook for turn start - prompt condition recovery
    Hooks.on('combatTurn', async (combat, updateData, updateOptions) => {
      const combatant = combat.combatant;
      if (!combatant || !combatant.actor) return;

      const actor = combatant.actor;

      // Check if actor has condition track damage
      if (actor.system.conditionTrack?.current > 0) {
        await this.promptConditionRecovery(actor);
      }
    });

    // Hook for combat start - optionally reset resources
    Hooks.on('combatStart', async (combat) => {
      if (!game.settings.get('swse', 'resetResourcesOnCombat')) return;

      for (const combatant of combat.combatants) {
        if (!combatant.actor) continue;

        // Reset temporary resources like Second Wind
        if (combatant.actor.type === 'character') {
          await combatant.// AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, {'system.secondWind.used': false});
globalThis.SWSE.ActorEngine.updateActor(actor, {'system.secondWind.used': false});
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, {'system.secondWind.used': false}); */

        }
      }
    });

    // Hook for combat end - cleanup
    Hooks.on('combatEnd', async (combat) => {
      // Log combat end
      SWSELogger.log('SWSE | Combat ended');
    });
  }

  static async checkDamageThreshold(actor, damage) {
    // This is handled in actor.applyDamage() method
    // Just ensure threshold checking is enabled
    const threshold = actor.system.damageThreshold;

    if (damage >= threshold) {
      // Create chat message about threshold
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `<div class="swse threshold-exceeded">
          <h3>Damage Threshold Exceeded!</h3>
          <p><strong>${actor.name}</strong> takes ${damage} damage (Threshold: ${threshold})</p>
          <p>Condition worsens by one step.</p>
        </div>`,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      // Move condition track (handled in applyDamage)
      await actor.moveConditionTrack(1);

      // Check for death
      if (// AUTO-CONVERT actor.system.* assignment -> ProgressionEngine (confidence=0.50)
// Auto-converted: update derived attributes via ProgressionEngine
ProgressionEngine.applyChargenStep(actor, 'abilities', { values: { /* migrated value for hp.value */ hp_value: == 0 && actor.isHelpless) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor}),
          content: `<div class="swse death-notification">
            <h3>⚠️ Character Defeated!</h3>
            <p><strong>${actor.name}</strong> is at 0 HP and Helpless!</p>
          </div>`,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER
        }) } });
/* ORIGINAL: actor.system.hp.value === 0 && actor.isHelpless) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor}),
          content: `<div class="swse death-notification">
            <h3>⚠️ Character Defeated!</h3>
            <p><strong>${actor.name}</strong> is at 0 HP and Helpless!</p>
          </div>`,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER
        }); */

      }
    }
  }

  static async promptConditionRecovery(actor) {
    // Check if persistent
    const isPersistent = actor.system.conditionTrack?.persistent;
    const current = actor.system.conditionTrack?.current || 0;

    if (current === 0) return; // No condition to recover from

    if (isPersistent) {
      ui.notifications.warn(`${actor.name}'s condition is persistent and cannot naturally recover.`);
      return;
    }

    // Prompt for recovery
    return new Promise((resolve) => {
      new Dialog({
        title: `${actor.name} - Condition Recovery`,
        content: `
          <div class="swse condition-recovery">
            <p><strong>${actor.name}</strong> can attempt to recover from the Condition Track.</p>
            <p>Current Condition: <strong>${this._getConditionLabel(current)}</strong></p>
            <hr>
            <p>Would you like to:</p>
          </div>
        `,
        buttons: {
          improve: {
            icon: '<i class="fas fa-heart"></i>',
            label: 'Recover Naturally',
            callback: async () => {
              await actor.moveConditionTrack(-1);
              await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({actor}),
                content: `<p><strong>${actor.name}</strong> recovers one step on the Condition Track.</p>`
              });
              resolve(true);
            }
          },
          secondWind: {
            icon: '<i class="fas fa-wind"></i>',
            label: 'Use Second Wind',
            callback: async () => {
              if (actor.type !== 'character') {
                ui.notifications.warn('Only characters can use Second Wind');
                resolve(false);
                return;
              }
              const success = await actor.useSecondWind();
              resolve(success);
            }
          },
          skip: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Skip Recovery',
            callback: () => {
              ui.notifications.info(`${actor.name} does not attempt recovery.`);
              resolve(false);
            }
          }
        },
        default: 'improve'
      }).render(true);
    });
  }

  static _getConditionLabel(step) {
    const labels = ['Normal', '-1 Penalty', '-2 Penalty', '-5 Penalty', '-10 Penalty', 'Helpless'];
    return labels[step] || 'Unknown';
  }
}
