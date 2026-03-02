/**
 * Healing Skill Integration - Treat Injury Skill Hooks
 * Connects the HealingMechanics to the skill system for use in combat and roleplay
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HealingMechanics } from "/systems/foundryvtt-swse/scripts/houserules/houserule-healing.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";

const NS = 'foundryvtt-swse';

export class HealingSkillIntegration {
  /**
   * Initialize healing skill integration hooks
   */
  static initialize() {
    // Hook into skill rolls to detect Treat Injury healing applications
    Hooks.on('rollSkill', (actor, skillKey, rollResult) => {
      this.onSkillRoll(actor, skillKey, rollResult);
    });

    SWSELogger.debug('Healing skill integration initialized');
  }

  /**
   * Handle skill roll event - check if it's a Treat Injury healing application
   */
  static async onSkillRoll(actor, skillKey, rollResult) {
    if (!game.settings.get(NS, 'healingSkillEnabled')) {return;}
    if (skillKey !== 'treatInjury') {return;}

    // Store the roll result for use in skill action dialogs
    await actor.setFlag(NS, 'lastTreatInjuryRoll', {
      result: rollResult.total,
      timestamp: Date.now()
    });
  }

  /**
   * Execute a healing skill action
   * Called when player clicks a healing action on the character sheet
   */
  static async executeHealingAction(actor, application, targetActor, rollResult) {
    if (!game.settings.get(NS, 'healingSkillEnabled')) {
      ui.notifications.error('Healing skill integration is not enabled');
      return null;
    }

    const applicationLower = application.toLowerCase();

    try {
      // Route to appropriate healing function
      if (applicationLower.includes('first aid')) {
        return await HealingMechanics.performFirstAid(actor, targetActor, rollResult);
      } else if (applicationLower.includes('long-term care')) {
        return await HealingMechanics.performLongTermCare(actor, [targetActor]);
      } else if (applicationLower.includes('perform surgery') || applicationLower.includes('surgery')) {
        return await HealingMechanics.performSurgery(actor, targetActor, rollResult);
      } else if (applicationLower.includes('revivify')) {
        return await HealingMechanics.performRevivify(actor, targetActor, rollResult);
      } else if (applicationLower.includes('critical care')) {
        return await HealingMechanics.performCriticalCare(actor, targetActor, rollResult);
      }

      SWSELogger.warn(`Unknown healing application: ${application}`);
      return null;
    } catch (err) {
      SWSELogger.error(`Healing action failed: ${application}`, err);
      ui.notifications.error(`Healing action failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Create a healing skill action dialog
   * Displays options for the medic to choose healing target and apply healing
   */
  static async createHealingDialog(actor, application) {
    if (!game.settings.get(NS, 'healingSkillEnabled')) {return;}

    const lastRoll = actor.getFlag(NS, 'lastTreatInjuryRoll');
    if (!lastRoll) {
      ui.notifications.warn('Please roll Treat Injury first before applying healing');
      return;
    }

    const rollResult = lastRoll.result;

    // Get all available targets
    const targets = game.actors.filter(a => a.type === 'character' && a.id !== actor.id);

    return new SWSEDialogV2({
      title: `${application} - Select Target`,
      content: `
        <form>
          <div class="form-group">
            <label>Target Character:</label>
            <select name="targetId">
              ${targets.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
          </div>
          <p class="notes">
            <strong>Your Check Result:</strong> ${rollResult}<br>
            <strong>Application:</strong> ${application}
          </p>
        </form>
      `,
      buttons: {
        apply: {
          label: 'Apply Healing',
          callback: async (html) => {
            const targetId = html[0].querySelector("[name='targetId']").value;
            const targetActor = game.actors.get(targetId);

            if (!targetActor) {
              ui.notifications.error('Target not found');
              return;
            }

            const result = await this.executeHealingAction(actor, application, targetActor, rollResult);

            if (result?.success) {
              // Display success message
              const message = this.createHealingMessage(actor, targetActor, application, result);
              createChatMessage(message);
            } else if (result) {
              // Display failure or partial result
              const message = this.createFailureMessage(actor, targetActor, application, result);
              createChatMessage(message);
            }
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    }).render(true);
  }

  /**
   * Create a chat message for successful healing
   */
  static createHealingMessage(healer, target, application, result) {
    let content = `<div class="swse-healing-message">`;
    content += `<h3>${healer.name} uses ${application}</h3>`;

    if (result.healing !== undefined) {
      content += `<p><strong>${target.name}</strong> regains <strong>${result.healing} HP</strong></p>`;
      content += `<p>New HP: ${result.newHP}/${result.maxHP}</p>`;
    }

    if (result.revived) {
      content += `<p><strong>${target.name} has been revived!</strong> They regain consciousness with 1 HP.</p>`;
    }

    content += `</div>`;

    return {
      user: game.user.id,
      speaker: {
        actor: healer.id,
        token: healer.token?.id,
        alias: healer.name
      },
      content,
      type: 'rp'
    };
  }

  /**
   * Create a chat message for failed healing
   */
  static createFailureMessage(healer, target, application, result) {
    let content = `<div class="swse-healing-failure">`;
    content += `<h3>${healer.name} attempts ${application}</h3>`;

    if (result.failure) {
      content += `<p style="color: red;"><strong>Check Failed!</strong></p>`;

      if (result.overdose) {
        content += `<p>${target.name} suffers an <strong>overdose</strong>! They take ${result.damageFromOverdose} damage.</p>`;
        content += `<p>New HP: ${result.newHP}</p>`;
      } else if (result.damageFromFailure) {
        content += `<p>${target.name} suffers complications and takes ${result.damageFromFailure} damage.</p>`;
        content += `<p>New HP: ${result.newHP}</p>`;
      } else {
        content += `<p>${target.name} does not benefit from the healing attempt.</p>`;
      }
    } else {
      content += `<p style="color: orange;"><strong>Healing Unavailable:</strong> ${result.message}</p>`;
    }

    content += `</div>`;

    return {
      user: game.user.id,
      speaker: {
        actor: healer.id,
        token: healer.token?.id,
        alias: healer.name
      },
      content,
      type: 'rp'
    };
  }

  /**
   * Get available healing uses for an actor
   * Filters based on training and settings
   */
  static getAvailableHealingUses(actor) {
    if (!game.settings.get(NS, 'healingSkillEnabled')) {return [];}

    const uses = [];
    const treatInjury = actor.system?.skills?.treatInjury;
    const isTrained = treatInjury?.trained || false;

    // First Aid - everyone
    if (game.settings.get(NS, 'firstAidEnabled')) {
      uses.push({
        name: 'First Aid (requires medpac)',
        dc: 15,
        available: true,
        trained: false
      });
    }

    // Long-Term Care - everyone
    if (game.settings.get(NS, 'longTermCareEnabled')) {
      uses.push({
        name: 'Long-Term Care (8 hours per day max)',
        dc: '—',
        available: true,
        trained: false
      });
    }

    // Surgery - trained only
    if (game.settings.get(NS, 'performSurgeryEnabled') && isTrained) {
      uses.push({
        name: 'Perform Surgery (trained, surgery kit, 1 hour)',
        dc: 20,
        available: true,
        trained: true
      });
    }

    // Revivify - trained only
    if (game.settings.get(NS, 'revivifyEnabled') && isTrained) {
      uses.push({
        name: 'Revivify (trained, medkit, within 1 round of death)',
        dc: 25,
        available: true,
        trained: true
      });
    }

    // Critical Care - optional
    if (game.settings.get(NS, 'criticalCareEnabled') && isTrained) {
      uses.push({
        name: 'Critical Care (multiple medpacs in 24 hours)',
        dc: 20,
        available: true,
        trained: true
      });
    }

    return uses;
  }

  /**
   * Display healing cooldown info for a target
   */
  static getHealingCooldownInfo(targetActor) {
    const info = [];

    // First Aid cooldown
    const lastFirstAid = targetActor.getFlag(NS, 'lastFirstAid') || 0;
    const firstAidCooldown = Date.now() - lastFirstAid;
    const firstAidReady = firstAidCooldown >= (24 * 60 * 60 * 1000);

    info.push({
      type: 'First Aid',
      ready: firstAidReady,
      timeRemaining: firstAidReady ? 0 : (24 * 60 * 60 * 1000) - firstAidCooldown
    });

    // Long-Term Care cooldown
    const lastLongTermCare = targetActor.getFlag(NS, 'lastLongTermCare') || 0;
    const longTermCooldown = Date.now() - lastLongTermCare;
    const longTermReady = longTermCooldown >= (24 * 60 * 60 * 1000);

    info.push({
      type: 'Long-Term Care',
      ready: longTermReady,
      timeRemaining: longTermReady ? 0 : (24 * 60 * 60 * 1000) - longTermCooldown
    });

    return info;
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(ms) {
    if (ms <= 0) {return 'Ready';}

    const hours = Math.ceil(ms / (60 * 60 * 1000));
    if (hours >= 24) {return `${Math.ceil(hours / 24)}d`;}
    return `${hours}h`;
  }
}
