/**
 * Light Side Talent Macros
 * Provides macro-callable functions for Jedi/Jedi Knight talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import LightSideTalentMechanics from './light-side-talent-mechanics.js';
import { SWSELogger } from '../utils/logger.js';

export class LightSideTalentMacros {

  /**
   * Macro: Trigger Direct talent
   * Usage: game.swse.macros.triggerDirectMacro(actor)
   */
  static async triggerDirectMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Direct');
      return;
    }

    if (!LightSideTalentMechanics.hasDirect(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Direct talent`);
      return;
    }

    Hooks.callAll('directTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Consular's Wisdom
   * Usage: game.swse.macros.triggerConsularsWisdomMacro(actor)
   */
  static async triggerConsularsWisdomMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Consular\'s Wisdom');
      return;
    }

    if (!LightSideTalentMechanics.hasConsularsWisdom(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Consular's Wisdom talent`);
      return;
    }

    Hooks.callAll('consularsWisdomTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Exposing Strike
   * Usage: game.swse.macros.triggerExposingStrikeMacro(actor, targetToken, weapon)
   */
  static async triggerExposingStrikeMacro(actor = null, targetToken = null, weapon = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Exposing Strike');
      return;
    }

    if (!LightSideTalentMechanics.hasExposingStrike(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Exposing Strike talent`);
      return;
    }

    // Get target if not provided
    const selectedTarget = targetToken || game.user.targets.first();
    if (!selectedTarget) {
      ui.notifications.error('Please target an opponent for Exposing Strike');
      return;
    }

    // Get weapon if not provided
    let selectedWeapon = weapon;
    if (!selectedWeapon) {
      const lightsabers = selectedActor.items.filter(item =>
        item.type === 'weapon' && item.system?.properties?.includes('Lightsaber')
      );

      if (lightsabers.length === 0) {
        ui.notifications.error('No lightsaber equipped');
        return;
      }

      if (lightsabers.length === 1) {
        selectedWeapon = lightsabers[0];
      } else {
        // Show selection dialog
        const weaponOptions = lightsabers
          .map(w => `<option value="${w.id}">${w.name}</option>`)
          .join('');

        return new Promise((resolve) => {
          const dialog = new Dialog({
            title: 'Exposing Strike - Select Lightsaber',
            content: `
              <div class="form-group">
                <label>Select lightsaber for Exposing Strike:</label>
                <select id="weapon-select" style="width: 100%;">
                  ${weaponOptions}
                </select>
              </div>
            `,
            buttons: {
              use: {
                label: 'Use Exposing Strike',
                callback: async (html) => {
                  const weaponId = html.find('#weapon-select').val();
                  selectedWeapon = selectedActor.items.get(weaponId);
                  await LightSideTalentMechanics.triggerExposingStrike(
                    selectedActor,
                    selectedTarget,
                    selectedWeapon
                  );
                  resolve(true);
                }
              },
              cancel: {
                label: 'Cancel',
                callback: () => resolve(false)
              }
            }
          });
          dialog.render(true);
        });
      }
    }

    await LightSideTalentMechanics.triggerExposingStrike(
      selectedActor,
      selectedTarget,
      selectedWeapon
    );
  }

  /**
   * Macro: Trigger Dark Retaliation
   * Usage: game.swse.macros.triggerDarkRetaliationMacro(actor)
   */
  static async triggerDarkRetaliationMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Dark Retaliation');
      return;
    }

    if (!LightSideTalentMechanics.hasDarkRetaliation(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Dark Retaliation talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerDarkRetaliation(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      const powerOptions = result.powers
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Dark Retaliation - Select Force Power',
        content: `
          <div class="form-group">
            <label>Choose a Force Power to activate as a reaction:</label>
            <select id="power-select" style="width: 100%;">
              ${powerOptions}
            </select>
          </div>
        `,
        buttons: {
          activate: {
            label: 'Activate Power',
            callback: async (html) => {
              const powerId = html.find('#power-select').val();
              const power = selectedActor.items.get(powerId);
              await LightSideTalentMechanics.completeDarkRetaliationSelection(
                selectedActor,
                powerId,
                result.combatId,
                result.retaliationUsageFlag
              );

              // Activate the power (this would typically be handled by the power's own activation)
              ui.notifications.info(`Activate ${power.name} manually as your reaction`);
            }
          },
          cancel: {
            label: 'Cancel'
          }
        }
      });

      dialog.render(true);
    }
  }

  /**
   * Macro: Trigger Skilled Advisor
   * Usage: game.swse.macros.triggerSkilledAdvisorMacro(actor, useForcePoint)
   */
  static async triggerSkilledAdvisorMacro(actor = null, useForcePoint = false) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Skilled Advisor');
      return;
    }

    if (!LightSideTalentMechanics.hasSkilledAdvisor(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Skilled Advisor talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerSkilledAdvisor(selectedActor, useForcePoint);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      const allyOptions = result.allies
        .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
        .join('');

      // Get all skills
      const skills = Object.keys(selectedActor.system.skills || {});
      const skillOptions = skills
        .map(s => `<option value="${s}">${s}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Skilled Advisor',
        content: `
          <div class="form-group">
            <label>Choose an ally to advise:</label>
            <select id="ally-select" style="width: 100%; margin-bottom: 10px;">
              ${allyOptions}
            </select>
            <label>Choose a skill:</label>
            <select id="skill-select" style="width: 100%; margin-bottom: 10px;">
              ${skillOptions}
            </select>
            <p>Bonus: +${result.bonus} ${useForcePoint ? '(Force Point spent)' : ''}</p>
          </div>
        `,
        buttons: {
          advise: {
            label: 'Grant Bonus',
            callback: async (html) => {
              const allyId = html.find('#ally-select').val();
              const skillName = html.find('#skill-select').val();
              await LightSideTalentMechanics.completeSkilledAdvisorSelection(
                selectedActor,
                allyId,
                skillName,
                result.bonus,
                result.useForcePoint
              );
            }
          },
          cancel: {
            label: 'Cancel'
          }
        }
      });

      dialog.render(true);
    }
  }

  /**
   * Macro: Trigger Apprentice Boon
   * Usage: game.swse.macros.triggerApprenticeBoonMacro(actor)
   */
  static async triggerApprenticeBoonMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Apprentice Boon');
      return;
    }

    if (!LightSideTalentMechanics.hasApprenticeBoon(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Apprentice Boon talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerApprenticeBoon(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      const allyOptions = result.allies
        .map(t => `<option value="${t.actor.id}">${t.actor.name} (Use the Force: ${t.actor.system.skills?.useTheForce?.modifier || 0})</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Apprentice Boon',
        content: `
          <div class="form-group">
            <label>Choose an ally to grant Force Point bonus:</label>
            <select id="ally-select" style="width: 100%;">
              ${allyOptions}
            </select>
            <p class="hint-text">
              <i class="fas fa-info-circle"></i>
              You will spend a Force Point and roll 1d6. The result is added to the ally's next check.
            </p>
          </div>
        `,
        buttons: {
          grant: {
            label: 'Grant Boon',
            callback: async (html) => {
              const allyId = html.find('#ally-select').val();
              await LightSideTalentMechanics.completeApprenticeBoonSelection(
                selectedActor,
                allyId
              );
            }
          },
          cancel: {
            label: 'Cancel'
          }
        }
      });

      dialog.render(true);
    }
  }

  /**
   * Macro: Trigger Renew Vision
   * Usage: game.swse.macros.triggerRenewVisionMacro(actor)
   */
  static async triggerRenewVisionMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Renew Vision');
      return;
    }

    if (!LightSideTalentMechanics.hasRenewVision(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Renew Vision talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerRenewVision(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: Trigger Share Force Secret
   * Usage: game.swse.macros.triggerShareForceSecretMacro(actor)
   */
  static async triggerShareForceSecretMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Share Force Secret');
      return;
    }

    if (!LightSideTalentMechanics.hasShareForceSecret(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Share Force Secret talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerShareForceSecret(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      const allyOptions = result.allies
        .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
        .join('');

      const secretOptions = result.forceSecrets
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Share Force Secret',
        content: `
          <div class="form-group">
            <label>Choose an ally:</label>
            <select id="ally-select" style="width: 100%; margin-bottom: 10px;">
              ${allyOptions}
            </select>
            <label>Choose a Force Secret to share:</label>
            <select id="secret-select" style="width: 100%;">
              ${secretOptions}
            </select>
          </div>
        `,
        buttons: {
          share: {
            label: 'Share Secret',
            callback: async (html) => {
              const allyId = html.find('#ally-select').val();
              const secretId = html.find('#secret-select').val();
              await LightSideTalentMechanics.completeShareForceSecretSelection(
                selectedActor,
                allyId,
                secretId
              );
            }
          },
          cancel: {
            label: 'Cancel'
          }
        }
      });

      dialog.render(true);
    }
  }

  /**
   * Helper: Check if actor can reroll Knowledge with Scholarly Knowledge
   * Usage: game.swse.macros.canRerollKnowledgeMacro(actor, skillName)
   */
  static canRerollKnowledgeMacro(actor = null, skillName = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return false;
    }

    if (!skillName) {
      ui.notifications.error('Please specify a skill name');
      return false;
    }

    return LightSideTalentMechanics.canRerollKnowledge(selectedActor, skillName);
  }
}

// ============================================================================
// EXPORT FOR GLOBAL ACCESS
// ============================================================================

window.SWSE = window.SWSE || {};
window.SWSE.macros = window.SWSE.macros || {};
window.SWSE.macros.triggerDirectMacro = LightSideTalentMacros.triggerDirectMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerConsularsWisdomMacro = LightSideTalentMacros.triggerConsularsWisdomMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerExposingStrikeMacro = LightSideTalentMacros.triggerExposingStrikeMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerDarkRetaliationMacro = LightSideTalentMacros.triggerDarkRetaliationMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerSkilledAdvisorMacro = LightSideTalentMacros.triggerSkilledAdvisorMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerApprenticeBoonMacro = LightSideTalentMacros.triggerApprenticeBoonMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerRenewVisionMacro = LightSideTalentMacros.triggerRenewVisionMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerShareForceSecretMacro = LightSideTalentMacros.triggerShareForceSecretMacro.bind(LightSideTalentMacros);
window.SWSE.macros.canRerollKnowledgeMacro = LightSideTalentMacros.canRerollKnowledgeMacro.bind(LightSideTalentMacros);

export default LightSideTalentMacros;
