import { SWSELogger } from "../utils/logger.js";
import { SWSEActiveEffectsManager } from "./active-effects-manager.js";

/**
 * SWSE Combat Integration (v13+)
 * - RAW Condition Track behavior with UI-assisted "Recover Action"
 * - Turn-start prompts only when appropriate
 * - Skip turn / skip encounter / never show again options
 * - Handles Second Wind availability
 * - Fully compatible with SWSEActorBase + new Active Effects engine
 */
export class SWSECombatIntegration {

  static init() {
    SWSELogger.log("SWSE | Initializing combat integration…");

    Hooks.on("createCombat", this._onCombatStart.bind(this));
    Hooks.on("deleteCombat", this._onCombatEnd.bind(this));
    Hooks.on("combatRound", this._onCombatRound.bind(this));
    Hooks.on("combatTurn", this._onCombatTurn.bind(this));

    SWSELogger.log("SWSE | Combat integration ready.");
  }

  /* -------------------------------------------------------------------------- */
  /* COMBAT START                                                               */
  /* -------------------------------------------------------------------------- */

  static async _onCombatStart(combat) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | Combat '${combat.id}' started.`);

    // Reset encounter-only CT prompt opt-outs
    for (const c of combat.combatants) {
      await c.setFlag("foundryvtt-swse", "skipCtPromptsEncounter", false);
    }

    // Message
    ChatMessage.create({
      content: `<div class="swse-combat-start">
        <h2><i class="fas fa-swords"></i> Combat Started!</h2>
        <p>Roll initiative!</p>
      </div>`,
      speaker: { alias: "System" }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* COMBAT END                                                                 */
  /* -------------------------------------------------------------------------- */

  static async _onCombatEnd(combat) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | Combat '${combat.id}' ended.`);

    ChatMessage.create({
      content: `<div class="swse-combat-end">
        <h2><i class="fas fa-flag-checkered"></i> Combat Ended</h2>
      </div>`,
      speaker: { alias: "System" }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* NEW ROUND                                                                  */
  /* -------------------------------------------------------------------------- */

  static async _onCombatRound(combat) {
    if (!game.user.isGM) return;

    const round = combat.round;
    SWSELogger.log(`SWSE | Round ${round}`);

    if (game.settings.get("foundryvtt-swse", "announceRounds")) {
      ChatMessage.create({
        content: `<div class="swse-round-start">
          <h3><i class="fas fa-circle-notch"></i> Round ${round}</h3>
        </div>`,
        speaker: { alias: "System" }
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* TURN START                                                                 */
  /* -------------------------------------------------------------------------- */

  static async _onCombatTurn(combat) {
    const c = combat.combatant;
    const actor = c?.actor;
    if (!actor) return;

    SWSELogger.log(`SWSE | Turn Start: ${actor.name}`);

    // GM turn announcements
    if (game.settings.get("foundryvtt-swse", "announceTurns")) {
      ChatMessage.create({
        content: `<div class="swse-turn-start"><h3>${actor.name}'s Turn</h3></div>`,
        speaker: { alias: "System" }
      });
    }

    // Only prompt for PCs (owned by players)
    const isPlayerOwned = actor.hasPlayerOwner;
    if (!isPlayerOwned && !game.user.isGM) return;

    // Check if CT > 0
    const ct = actor.system.conditionTrack.current ?? 0;
    if (ct === 0) return;

    // Check persistent condition
    const persistent = actor.system.conditionTrack.persistent === true;
    if (persistent) {
      ui.notifications.warn(`${actor.name} has a Persistent Condition and cannot Recover naturally.`);
      return;
    }

    // Skip prompt if user opted out for this actor permanently
    const skipForever = await actor.getFlag("foundryvtt-swse", "skipCtPromptsForever");
    if (skipForever) return;

    // Skip prompt if user opted out for this encounter
    const skipEncounter = await c.getFlag("foundryvtt-swse", "skipCtPromptsEncounter");
    if (skipEncounter) return;

    // Check if the actor has any Second Wind uses left
    const canSecondWind =
      actor.type === "character" &&
      actor.system.secondWind &&
      actor.system.secondWind.used === false;

    // Build options list dynamically
    const buttons = {
      recover: {
        icon: '<i class="fas fa-heart"></i>',
        label: "Recover (3 Swift Actions)",
        callback: async () => {
          await actor.moveConditionTrack(-1);
          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<strong>${actor.name}</strong> spends 3 swift actions to Recover and improves 1 step on the Condition Track.`
          });
        }
      },
      skip: {
        icon: '<i class="fas fa-times"></i>',
        label: "Skip",
        callback: () => {
          this._promptSkipOptions(actor, c);
        }
      }
    };

    if (canSecondWind) {
      buttons.secondWind = {
        icon: '<i class="fas fa-wind"></i>',
        label: "Use Second Wind",
        callback: async () => await actor.useSecondWind()
      };
    }

    // CT labels
    const ctLabels = ["Normal", "-1", "-2", "-5", "-10", "Helpless"];

    new Dialog({
      title: `${actor.name} — Condition Recovery`,
      content: `
        <div class="swse condition-recovery">
          <p><strong>${actor.name}</strong> may Recover from the Condition Track.</p>
          <p>Current Condition: <strong>${ctLabels[ct]}</strong></p>
        </div>
      `,
      buttons,
      default: "recover"
    }).render(true);
  }

  /* -------------------------------------------------------------------------- */
  /* SKIP OPTIONS POPUP                                                         */
  /* -------------------------------------------------------------------------- */

  static async _promptSkipOptions(actor, combatant) {
    return new Dialog({
      title: "Skip Condition Recovery",
      content: `
        <p>Choose how long to skip Condition Track recovery prompts:</p>
      `,
      buttons: {
        skipTurn: {
          icon: '<i class="fas fa-angle-right"></i>',
          label: "Skip This Turn Only",
          callback: () => {
            ui.notifications.info("Skipping recovery for this turn.");
          }
        },
        skipEncounter: {
          icon: '<i class="fas fa-flag"></i>',
          label: "Skip For This Encounter",
          callback: async () => {
            await combatant.setFlag("foundryvtt-swse", "skipCtPromptsEncounter", true);
            ui.notifications.info("Skipping CT prompts for the rest of this encounter.");
          }
        },
        skipForever: {
          icon: '<i class="fas fa-ban"></i>',
          label: "Never Show Again",
          callback: async () => {
            await actor.setFlag("foundryvtt-swse", "skipCtPromptsForever", true);
            ui.notifications.info(`${actor.name} will never show CT recovery prompts again.`);
          }
        }
      },
      default: "skipTurn"
    }).render(true);
  }
}
