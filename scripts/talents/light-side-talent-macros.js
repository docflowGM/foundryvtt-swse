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
          const dialog = new SWSEDialogV2({
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
                  const weaponId = (html?.[0] ?? html)?.querySelector('#weapon-select')?.value;
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

      const dialog = new SWSEDialogV2({
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
              const powerId = (html?.[0] ?? html)?.querySelector('#power-select')?.value;
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

      const dialog = new SWSEDialogV2({
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
              const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
              const skillName = (html?.[0] ?? html)?.querySelector('#skill-select')?.value;
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
        .map(t => `<option value="${t.actor.id}">${t.actor.name} (Use the Force: ${t.actor.system.skills?.useTheForce?.total || 0})</option>`)
        .join('');

      const dialog = new SWSEDialogV2({
        title: 'Apprentice Boon',
        content: `
          <div class="form-group">
            <label>Choose an ally to grant Force Point bonus:</label>
            <select id="ally-select" style="width: 100%;">
              ${allyOptions}
            </select>
            <p class="hint-text">
              <i class="fas fa-circle-info"></i>
              You will spend a Force Point and roll 1d6. The result is added to the ally's next check.
            </p>
          </div>
        `,
        buttons: {
          grant: {
            label: 'Grant Boon',
            callback: async (html) => {
              const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
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

      const dialog = new SWSEDialogV2({
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
              const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
              const secretId = (html?.[0] ?? html)?.querySelector('#secret-select')?.value;
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
   * Macro: Trigger Steel Resolve
   * Usage: game.swse.macros.triggerSteelResolveMacro(actor)
   */
  static async triggerSteelResolveMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Steel Resolve');
      return;
    }

    if (!LightSideTalentMechanics.hasSteelResolve(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Steel Resolve talent`);
      return;
    }

    const result = await LightSideTalentMechanics.triggerSteelResolve(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      // Build options for penalty selection (1 to maxPenalty)
      const penaltyOptions = [];
      for (let i = 1; i <= result.maxPenalty; i++) {
        const willBonus = Math.min(i * 2, result.bab);
        penaltyOptions.push(`<option value="${i}">-${i} attack / +${willBonus} Will Defense</option>`);
      }

      const dialog = new SWSEDialogV2({
        title: 'Steel Resolve',
        content: `
          <div class="form-group">
            <label>Choose attack penalty (gains twice that as Will Defense bonus, max +${result.bab}):</label>
            <select id="penalty-select" style="width: 100%; font-size: 14px; padding: 5px;">
              ${penaltyOptions.join('')}
            </select>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              <i class="fas fa-circle-info"></i>
              Effect lasts until the start of your next turn.
            </p>
          </div>
        `,
        buttons: {
          activate: {
            label: 'Activate Steel Resolve',
            callback: async (html) => {
              const penalty = parseInt((html?.[0] ?? html)?.querySelector('#penalty-select')?.value);
              await LightSideTalentMechanics.completeSteelResolveSelection(
                selectedActor,
                penalty
              );
            }
          },
          cancel: {
            label: 'Cancel'
          }
        },
        default: 'activate'
      });

      dialog.render(true);
    }
  }

  /**
   * Macro: Trigger Adept Negotiator
   * Usage: game.swse.macros.triggerAdeptNegotiatorMacro(actor, targetToken)
   */
  static async triggerAdeptNegotiatorMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Adept Negotiator');
      return;
    }

    if (!LightSideTalentMechanics.hasAdeptNegotiator(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Adept Negotiator talent`);
      return;
    }

    // Get target if not provided
    const selectedTarget = targetToken || game.user.targets.first();
    if (!selectedTarget) {
      ui.notifications.error('Please target an opponent for Adept Negotiator');
      return;
    }

    const result = await LightSideTalentMechanics.triggerAdeptNegotiator(selectedActor, selectedTarget);

    if (!result.success) {
      ui.notifications.warn(result.message);
      return;
    }

    if (result.requiresSelection) {
      // Build dialog with information
      const hasForcePersuasion = LightSideTalentMechanics.hasForcePersuasion(selectedActor);
      const hasMasterNegotiator = LightSideTalentMechanics.hasMasterNegotiator(selectedActor);

      const modifierType = hasForcePersuasion ? 'Use the Force' : 'Persuasion';
      const levelNote = result.targetLevel > result.actorLevel
        ? `<p style="color: #cc6644;"><i class="fas fa-circle-exclamation"></i> Target is higher level. Will Defense increased by +5.</p>`
        : '';

      const masterNote = hasMasterNegotiator
        ? `<p style="color: #88cc44;"><i class="fas fa-star"></i> Master Negotiator: On success, target moves 2 steps instead of 1.</p>`
        : '';

      const dialogContent = `
        <div class="form-group">
          <h3>Adept Negotiator</h3>
          <p><strong>Target:</strong> ${result.targetActor.name}</p>
          <p><strong>Check Type:</strong> ${modifierType} (+${result.persuasionModifier >= 0 ? '+' : ''}${result.persuasionModifier})</p>
          <p><strong>Target Will Defense:</strong> ${result.targetWillDefense}</p>
          ${levelNote}
          ${masterNote}
          <p style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-left: 3px solid #4488cc;">
            <i class="fas fa-circle-info"></i> Rolling 1d20 + ${result.persuasionModifier} vs DC ${result.targetWillDefense}
          </p>
        </div>
      `;

      const dialog = new SWSEDialogV2({
        title: 'Adept Negotiator - Weaken Resolve',
        content: dialogContent,
        buttons: {
          makeCheck: {
            label: 'Roll Persuasion Check',
            callback: async () => {
              // Roll the check
              const roll = await LightSideTalentMechanics.rollPersuasionCheck(selectedActor, result.persuasionModifier);

              // Post roll to chat
              await roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: selectedActor }),
                flavor: `Adept Negotiator - Persuasion Check vs ${result.targetActor.name}'s Will Defense (${result.targetWillDefense})`
              } , { create: true });

              // Apply the result
              await LightSideTalentMechanics.completeAdeptNegotiatorSelection(
                selectedActor,
                result.targetActor,
                roll,
                result.targetWillDefense,
                result.useForceModifier
              );
            }
          },
          cancel: {
            label: 'Cancel'
          }
        },
        default: 'makeCheck'
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

  /**
   * Helper: Apply Dark Side Scourge damage bonus
   * This should be called during damage calculation for melee attacks
   * Usage: game.swse.macros.applyDarkSideScourge(actor, target, baseDamage)
   */
  static applyDarkSideScourge(actor = null, target = null, baseDamage = 0) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character for Dark Side Scourge');
      return baseDamage;
    }

    if (!target) {
      ui.notifications.error('Please select a target for Dark Side Scourge');
      return baseDamage;
    }

    return LightSideTalentMechanics.applyDarkSideScourge(selectedActor, target, baseDamage);
  }

  /**
   * Helper: Check if Dark Side Scourge should apply
   * Usage: game.swse.macros.shouldApplyDarkSideScourge(actor, target)
   */
  static shouldApplyDarkSideScourge(actor = null, target = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor || !target) {
      return false;
    }

    return LightSideTalentMechanics.shouldApplyDarkSideScourge(selectedActor, target);
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
window.SWSE.macros.triggerSteelResolveMacro = LightSideTalentMacros.triggerSteelResolveMacro.bind(LightSideTalentMacros);
window.SWSE.macros.triggerAdeptNegotiatorMacro = LightSideTalentMacros.triggerAdeptNegotiatorMacro.bind(LightSideTalentMacros);
window.SWSE.macros.canRerollKnowledgeMacro = LightSideTalentMacros.canRerollKnowledgeMacro.bind(LightSideTalentMacros);
window.SWSE.macros.applyDarkSideScourge = LightSideTalentMacros.applyDarkSideScourge.bind(LightSideTalentMacros);
window.SWSE.macros.shouldApplyDarkSideScourge = LightSideTalentMacros.shouldApplyDarkSideScourge.bind(LightSideTalentMacros);

export default LightSideTalentMacros;
