/**
 * Species Reroll Handler
 * Handles species-granted reroll abilities (like Duros Expert Pilot, Bothan Spy Network)
 *
 * PHASE 4: Now consumes durable species reroll state from Phase 3
 * Reads from: flags.swse.speciesRerolls array
 * Structure: [{scope, target, frequency, outcome, sourceTraitName, sourceTraitId}]
 */

import { SPECIES_TRAIT_TYPES } from "/systems/foundryvtt-swse/scripts/species/species-trait-types.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { registerChatInteractionBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-interaction-bridge.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

/**
 * Handler for species reroll abilities
 */
export class SpeciesRerollHandler {

  /**
   * Check if an actor has reroll traits that apply to a given skill
   * PHASE 4: Reads from canonical Phase 3 actor state
   * @param {Actor} actor - The actor to check
   * @param {string} skillKey - The skill key to check rerolls for
   * @returns {Array} Array of applicable reroll traits
   */
  static getApplicableRerolls(actor, skillKey) {
    const speciesRerolls = actor.flags?.swse?.speciesRerolls || [];
    return speciesRerolls.filter(reroll => {
      // Check if this reroll applies to the skill or 'any' roll
      if (reroll.scope !== 'skill' && reroll.scope !== 'any') {
        return false;
      }
      // Check if target matches skill name or 'any'
      if (reroll.target !== skillKey && reroll.target !== 'any') {
        return false;
      }
      return true;
    });
  }

  /**
   * Check if an actor has any reroll available (for any roll type)
   * PHASE 4: Reads from canonical Phase 3 actor state
   * @param {Actor} actor - The actor
   * @param {string} rollType - 'skill', 'attack', or 'any'
   * @returns {Array} Array of applicable reroll traits
   */
  static getAvailableRerolls(actor, rollType = 'any') {
    const speciesRerolls = actor.flags?.swse?.speciesRerolls || [];

    return speciesRerolls.filter(reroll => {
      // Check scope matches
      if (reroll.scope === 'any') {return true;}
      if (reroll.scope === rollType) {return true;}
      if (rollType === 'any') {return true;}
      return false;
    });
  }

  /**
   * Offer a reroll after a skill check
   * PHASE 4: Consumes Phase 3 canonical reroll metadata
   * @param {Actor} actor - The actor who made the roll
   * @param {string} skillKey - The skill that was rolled
   * @param {Roll} originalRoll - The original roll result
   * @param {object} options - Additional options
   * @returns {Promise<Roll|null>} The new roll if rerolled, null otherwise
   */
  static async offerReroll(actor, skillKey, originalRoll, options = {}) {
    const rerollTraits = this.getApplicableRerolls(actor, skillKey);

    if (rerollTraits.length === 0) {
      return null;
    }

    // Use first applicable reroll
    const reroll = rerollTraits[0];
    const traitName = reroll.sourceTraitName || 'Species Ability';

    // Phase 3 outcome semantics: 'keep_better' or 'must_accept'
    const mustAcceptWorse = reroll.outcome === 'must_accept';

    const content = `
      <div class="species-reroll-dialog">
        <p><strong>${traitName}</strong></p>
        <p>You may reroll this ${skillKey} check.</p>
        ${mustAcceptWorse ? '<p class="warning"><em>You must accept the new result, even if it is worse.</em></p>' : '<p><em>You keep the better result.</em></p>'}
        <p>Original roll: <strong>${originalRoll.total}</strong></p>
      </div>
    `;

    const useReroll = await SWSEDialogV2.confirm({
      title: `Reroll ${skillKey}?`,
      content: content,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (!useReroll) {
      return null;
    }

    // Perform the reroll
    const newRoll = await this._performReroll(actor, originalRoll, options);

    if (newRoll) {
      // Determine which roll to use based on outcome semantics
      let finalRoll = newRoll;
      if (reroll.outcome === 'keep_better' && newRoll.total < originalRoll.total) {
        finalRoll = originalRoll;
      }

      // Send reroll notification to chat
      await this._sendRerollMessage(actor, skillKey, originalRoll, newRoll, finalRoll, traitName, mustAcceptWorse);

      return finalRoll;
    }

    return null;
  }

  /**
   * Perform the actual reroll
   * @private
   */
  static async _performReroll(actor, originalRoll, options) {
    try {
      // Extract the formula from the original roll
      const formula = originalRoll.formula || '1d20';

      // Create and evaluate a new roll
      const newRoll = await RollEngine.safeRoll(formula);
      if (!newRoll) {
        SWSELogger.warn('SpeciesRerollHandler | Failed to perform reroll');
        return null;
      }

      return newRoll;
    } catch (err) {
      SWSELogger.error('SpeciesRerollHandler | Error performing reroll:', err);
      return null;
    }
  }

  /**
   * Mark a once-per-encounter trait as used
   * @private
   */
  static async _markTraitUsed(actor, traitId) {
    const species = SpeciesTraitEngine.getActorSpecies(actor);
    if (!species) {return;}

    // Store used traits in actor flags
    const usedTraits = actor.getFlag('foundryvtt-swse', 'usedSpeciesTraits') || [];
    if (!usedTraits.includes(traitId)) {
      usedTraits.push(traitId);
      await actor.setFlag('foundryvtt-swse', 'usedSpeciesTraits', usedTraits);
    }
  }

  /**
   * Reset all once-per-encounter species traits (call on encounter end)
   * @param {Actor} actor - The actor to reset traits for
   */
  static async resetEncounterTraits(actor) {
    await actor.unsetFlag('foundryvtt-swse', 'usedSpeciesTraits');
  }

  /**
   * Send a chat message about the reroll
   * @private
   */
  static async _sendRerollMessage(actor, skillKey, originalRoll, newRoll, finalRoll, traitName, acceptWorse) {
    const usedNew = finalRoll === newRoll;
    const skillName = this._getSkillDisplayName(skillKey);

    const content = `
      <div class="swse-species-reroll-card">
        <div class="swse-holo-header">
          <i class="fa-solid fa-dice"></i> ${traitName} - Reroll
        </div>
        <table class="swse-holo-breakdown">
          <tr><td>Skill</td><td>${skillName}</td></tr>
          <tr><td>Original Roll</td><td>${originalRoll.total}</td></tr>
          <tr><td>Reroll</td><td>${newRoll.total}</td></tr>
          <tr><td>Result</td><td><strong>${finalRoll.total}</strong> ${acceptWorse ? '(must accept)' : usedNew ? '(chose reroll)' : '(kept original)'}</td></tr>
        </table>
      </div>
    `;

    await createChatMessage({
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      flavor: `Species Reroll: ${skillName}`
    });
  }

  /**
   * Get display name for a skill key
   * @private
   */
  static _getSkillDisplayName(skillKey) {
    const displayNames = {
      acrobatics: 'Acrobatics',
      climb: 'Climb',
      deception: 'Deception',
      endurance: 'Endurance',
      gatherInformation: 'Gather Information',
      initiative: 'Initiative',
      jump: 'Jump',
      knowledgeBureaucracy: 'Knowledge (Bureaucracy)',
      knowledgeGalacticLore: 'Knowledge (Galactic Lore)',
      knowledgeLifeSciences: 'Knowledge (Life Sciences)',
      knowledgePhysicalSciences: 'Knowledge (Physical Sciences)',
      knowledgeSocialSciences: 'Knowledge (Social Sciences)',
      knowledgeTactics: 'Knowledge (Tactics)',
      knowledgeTechnology: 'Knowledge (Technology)',
      mechanics: 'Mechanics',
      perception: 'Perception',
      persuasion: 'Persuasion',
      pilot: 'Pilot',
      ride: 'Ride',
      stealth: 'Stealth',
      survival: 'Survival',
      swim: 'Swim',
      treatInjury: 'Treat Injury',
      useComputer: 'Use Computer',
      useTheForce: 'Use the Force'
    };

    return displayNames[skillKey] || skillKey;
  }

  /**
   * Add reroll button to chat card if applicable
   * This is called when creating skill check chat messages
   * @param {string} content - The chat message content
   * @param {Actor} actor - The actor who made the roll
   * @param {string} skillKey - The skill that was rolled
   * @param {Roll} roll - The roll result
   * @returns {string} Modified content with reroll button if applicable
   */
  static addRerollButton(content, actor, skillKey, roll) {
    const rerollTraits = this.getApplicableRerolls(actor, skillKey);

    if (rerollTraits.length === 0) {
      return content;
    }

    const trait = rerollTraits[0];
    const traitName = trait.name || 'Species Ability';

    // Add a reroll button to the content
    const buttonHtml = `
      <div class="species-reroll-section">
        <button class="species-reroll-btn"
                data-actor-id="${actor.id}"
                data-skill="${skillKey}"
                data-trait-id="${trait.id}"
                data-roll-total="${roll.total}">
          <i class="fa-solid fa-dice"></i> ${traitName}: Reroll
        </button>
      </div>
    `;

    // Append button before closing div
    return content + buttonHtml;
  }

  /**
   * Resolve a species reroll chat button. Chat bridge delegates here so the
   * render hook remains UI-only and this domain helper owns reroll behavior.
   */
  static async resolveChatRerollButton(button, { message = null } = {}) {
    if (!(button instanceof HTMLElement)) return null;

    const actorId = button.dataset.actorId;
    const skillKey = button.dataset.skill;
    const traitId = button.dataset.traitId;
    const originalTotal = Number.parseInt(button.dataset.rollTotal, 10);

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found');
      return null;
    }

    if (!actor.isOwner) {
      ui.notifications.warn('You do not control this actor');
      return null;
    }

    const rerollTraits = this.getApplicableRerolls(actor, skillKey);
    const trait = rerollTraits.find(t => t.id === traitId);

    if (!trait) {
      ui.notifications.warn('Reroll ability no longer available');
      return null;
    }

    const mod = actor.system.skills?.[skillKey]?.total || 0;
    const fullFormula = `1d20 + ${mod}`;
    const newRoll = await RollEngine.safeRoll(fullFormula);
    if (!newRoll) {
      ui.notifications.error('Reroll failed');
      return null;
    }

    const acceptWorse = trait.acceptWorse !== false;
    let finalRoll = newRoll;
    if (!acceptWorse && newRoll.total < originalTotal) {
      finalRoll = { total: originalTotal };
    }

    if (trait.type === SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER) {
      await this._markTraitUsed(actor, trait.id);
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Reroll Used';

    await this._sendRerollMessage(
      actor,
      skillKey,
      { total: originalTotal },
      newRoll,
      finalRoll,
      trait.name || 'Species Ability',
      acceptWorse
    );

    return { actor, skillKey, trait, message, originalTotal, newRoll, finalRoll };
  }

}

/**
 * Register chat message listeners for reroll buttons
 * Call this in system init
 */
export function registerRerollListeners() {
  // Centralized in ChatInteractionBridge. Keep this function as the public
  // compatibility entry point used by init hooks/species index.
  return registerChatInteractionBridge();
}

export default SpeciesRerollHandler;
