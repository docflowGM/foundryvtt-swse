/**
 * Light Side Talent Mechanics
 * Implements complex game mechanics for Jedi, Jedi Knight, and Jedi Master talents:
 * - Direct: Return Force Power to ally
 * - Consular's Wisdom: Grant Wisdom bonus to ally's Will Defense
 * - Exposing Strike: Make opponent flat-footed with lightsaber
 * - Dark Retaliation: React to Dark Side powers
 * - Rebuke the Dark: Roll twice for rebuke attempts
 * - Skilled Advisor: Grant skill check bonuses
 * - Apprentice Boon: Add Force Point result to ally
 * - Renew Vision: Regain Farseeing uses
 * - Scholarly Knowledge: Reroll Knowledge checks
 * - Share Force Secret: Grant Force Secret to ally
 */

import { SWSELogger } from '../utils/logger.js';

export class LightSideTalentMechanics {

  /**
   * Check if actor has Direct talent
   */
  static hasDirect(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Direct'
    );
  }

  /**
   * Check if actor has Consular's Wisdom talent
   */
  static hasConsularsWisdom(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === "Consular's Wisdom"
    );
  }

  /**
   * Check if actor has Exposing Strike talent
   */
  static hasExposingStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Exposing Strike'
    );
  }

  /**
   * Check if actor has Dark Retaliation talent
   */
  static hasDarkRetaliation(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Retaliation'
    );
  }

  /**
   * Check if actor has Rebuke the Dark talent
   */
  static hasRebukeTheDark(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Rebuke the Dark'
    );
  }

  /**
   * Check if actor has Skilled Advisor talent
   */
  static hasSkilledAdvisor(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Skilled Advisor'
    );
  }

  /**
   * Check if actor has Apprentice Boon talent
   */
  static hasApprenticeBoon(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Apprentice Boon'
    );
  }

  /**
   * Check if actor has Renew Vision talent
   */
  static hasRenewVision(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Renew Vision'
    );
  }

  /**
   * Check if actor has Scholarly Knowledge talent
   */
  static hasScholarlyKnowledge(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Scholarly Knowledge'
    );
  }

  /**
   * Check if actor has Share Force Secret talent
   */
  static hasShareForceSecret(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Share Force Secret'
    );
  }

  /**
   * DIRECT - Return one Force power to any ally within 6 squares
   * Swift action, once per encounter
   */
  static async triggerDirect(actor) {
    if (!this.hasDirect(actor)) {
      return { success: false, message: 'Actor does not have Direct talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Direct can only be used during an encounter (combat active)'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const directUsageFlag = `direct_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', directUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Direct has already been used this encounter. It resets at the start of the next encounter.'
      };
    }

    // Get all allies within 6 squares
    const allies = this.getAlliesInRange(actor, 6);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies within 6 squares and line of sight'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: allies,
      combatId: combatId,
      directUsageFlag: directUsageFlag
    };
  }

  /**
   * Complete Direct selection after user chooses ally and power
   */
  static async completeDirectSelection(actor, allyId, powerIdToReturn, combatId, directUsageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    const power = ally.items.get(powerIdToReturn);
    if (!power) {
      ui.notifications.error('Power not found');
      return false;
    }

    await ally.updateEmbeddedDocuments('Item', [{
      _id: power.id,
      'system.spent': false
    }]);

    await actor.setFlag('swse', directUsageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Direct to return ${power.name} to ${ally.name}`);
    ui.notifications.info(`${power.name} has been returned to ${ally.name}'s Force Power Suite!`);

    return true;
  }

  /**
   * CONSULAR'S WISDOM - Grant Wisdom bonus to ally's Will Defense
   * Once per encounter, lasts until end of encounter
   */
  static async triggerConsularsWisdom(actor) {
    if (!this.hasConsularsWisdom(actor)) {
      return { success: false, message: 'Actor does not have Consular\'s Wisdom talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Consular\'s Wisdom can only be used during an encounter (combat active)'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const wisdomUsageFlag = `consularsWisdom_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', wisdomUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Consular\'s Wisdom has already been used this encounter.'
      };
    }

    // Get all allies in line of sight
    const allies = this.getAlliesInLineOfSight(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies in line of sight'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: allies,
      combatId: combatId,
      wisdomUsageFlag: wisdomUsageFlag
    };
  }

  /**
   * Complete Consular's Wisdom selection
   */
  static async completeConsularsWisdomSelection(actor, allyId, combatId, wisdomUsageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // Get actor's Wisdom bonus
    const wisdomBonus = actor.system.abilities?.wis?.modifier || 0;

    // Create effect on ally
    await ally.createEmbeddedDocuments('ActiveEffect', [{
      name: "Consular's Wisdom",
      icon: "icons/svg/angel.svg",
      changes: [{
        key: "system.defenses.will.bonus",
        mode: 2, // ADD
        value: wisdomBonus,
        priority: 20
      }],
      duration: {
        combat: game.combat?.id
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'consulars-wisdom',
          sourceActorId: actor.id
        }
      }
    }]);

    await actor.setFlag('swse', wisdomUsageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Consular's Wisdom on ${ally.name}, granting +${wisdomBonus} to Will Defense`);
    ui.notifications.info(`${ally.name} gains +${wisdomBonus} to Will Defense until the end of the encounter!`);

    return true;
  }

  /**
   * EXPOSING STRIKE - Make opponent flat-footed when damaging with lightsaber
   * Spend a Force Point to trigger
   */
  static async triggerExposingStrike(actor, targetToken, weapon) {
    if (!this.hasExposingStrike(actor)) {
      return { success: false, message: 'Actor does not have Exposing Strike talent' };
    }

    // Check if weapon is a lightsaber
    if (!weapon.system?.properties?.includes('Lightsaber')) {
      return {
        success: false,
        message: 'Exposing Strike only works with lightsabers'
      };
    }

    // Check if actor has Force Points to spend
    const forcePoints = actor.system.forcePoints?.value || 0;
    if (forcePoints <= 0) {
      return {
        success: false,
        message: 'No Force Points available to spend on Exposing Strike'
      };
    }

    // Spend Force Point
    await actor.update({ 'system.forcePoints.value': forcePoints - 1 });

    // Apply flat-footed condition to target
    const targetActor = targetToken.actor;
    const duration = {
      rounds: 1,
      startRound: game.combat?.round,
      startTurn: game.combat?.turn
    };

    await targetActor.createEmbeddedDocuments('ActiveEffect', [{
      name: "Exposing Strike - Flat-Footed",
      icon: "icons/svg/daze.svg",
      changes: [{
        key: "system.condition.flatFooted",
        mode: 5, // OVERRIDE
        value: "true",
        priority: 50
      }],
      duration: duration,
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'exposing-strike',
          sourceActorId: actor.id
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Exposing Strike on ${targetActor.name}`);
    ui.notifications.info(`${targetActor.name} is flat-footed until the end of your next turn!`);

    return { success: true };
  }

  /**
   * DARK RETALIATION - React to Dark Side power with your own Force power
   * Once per encounter
   */
  static async triggerDarkRetaliation(actor, darkSidePower) {
    if (!this.hasDarkRetaliation(actor)) {
      return { success: false, message: 'Actor does not have Dark Retaliation talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Dark Retaliation can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const retaliationUsageFlag = `darkRetaliation_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', retaliationUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Dark Retaliation has already been used this encounter.'
      };
    }

    // Get available Force Powers
    const forcePowers = actor.items.filter(item =>
      item.type === 'forcepower' && item.system?.spent === false
    );

    if (forcePowers.length === 0) {
      return {
        success: false,
        message: 'No Force Powers available to use for retaliation'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      powers: forcePowers,
      combatId: combatId,
      retaliationUsageFlag: retaliationUsageFlag
    };
  }

  /**
   * Complete Dark Retaliation selection
   */
  static async completeDarkRetaliationSelection(actor, powerIdToUse, combatId, retaliationUsageFlag) {
    const power = actor.items.get(powerIdToUse);
    if (!power) {
      ui.notifications.error('Power not found');
      return false;
    }

    await actor.setFlag('swse', retaliationUsageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Retaliation with ${power.name}`);
    ui.notifications.info(`${actor.name} activates ${power.name} as a reaction to the Dark Side power!`);

    // The actual power activation should be handled separately
    return { success: true, power: power };
  }

  /**
   * REBUKE THE DARK - Roll twice for rebuke attempts
   */
  static async applyRebukeBonus(actor, roll) {
    if (!this.hasRebukeTheDark(actor)) {
      return roll;
    }

    // Roll a second d20 and take the better result
    const secondRoll = await new Roll('1d20').evaluate({ async: true });
    const betterRoll = secondRoll.total > roll.terms[0].results[0].result ? secondRoll : roll;

    SWSELogger.log(`SWSE Talents | ${actor.name} used Rebuke the Dark. Original: ${roll.total}, Second: ${secondRoll.total}, Using: ${betterRoll.total}`);
    ui.notifications.info(`Rebuke the Dark: Rolled ${roll.total} and ${secondRoll.total}, using better result!`);

    return betterRoll;
  }

  /**
   * SKILLED ADVISOR - Grant skill check bonus to ally
   * Full-round action
   */
  static async triggerSkilledAdvisor(actor, useForcePoint = false) {
    if (!this.hasSkilledAdvisor(actor)) {
      return { success: false, message: 'Actor does not have Skilled Advisor talent' };
    }

    const bonus = useForcePoint ? 10 : 5;

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available to advise'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: allies,
      bonus: bonus,
      useForcePoint: useForcePoint
    };
  }

  /**
   * Complete Skilled Advisor selection
   */
  static async completeSkilledAdvisorSelection(actor, allyId, skillName, bonus, useForcePoint) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // If using Force Point, deduct it
    if (useForcePoint) {
      const forcePoints = actor.system.forcePoints?.value || 0;
      if (forcePoints <= 0) {
        ui.notifications.error('No Force Points available');
        return false;
      }
      await actor.update({ 'system.forcePoints.value': forcePoints - 1 });
    }

    // Create temporary effect on ally
    await ally.createEmbeddedDocuments('ActiveEffect', [{
      name: `Skilled Advisor - ${skillName}`,
      icon: "icons/svg/book.svg",
      changes: [{
        key: `system.skills.${skillName}.bonus`,
        mode: 2, // ADD
        value: bonus,
        priority: 20
      }],
      duration: {
        rounds: 1
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'skilled-advisor',
          sourceActorId: actor.id,
          oneTimeUse: true
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Skilled Advisor on ${ally.name} for ${skillName}, granting +${bonus}`);
    ui.notifications.info(`${ally.name} gains +${bonus} to their next ${skillName} check!`);

    return true;
  }

  /**
   * APPRENTICE BOON - Add Force Point result to ally's check
   * Ally must have lower Use the Force modifier and be within 12 squares
   */
  static async triggerApprenticeBoon(actor) {
    if (!this.hasApprenticeBoon(actor)) {
      return { success: false, message: 'Actor does not have Apprentice Boon talent' };
    }

    // Check if actor has Force Points
    const forcePoints = actor.system.forcePoints?.value || 0;
    if (forcePoints <= 0) {
      return {
        success: false,
        message: 'No Force Points available for Apprentice Boon'
      };
    }

    // Get actor's Use the Force modifier
    const actorUseTheForce = actor.system.skills?.useTheForce?.modifier || 0;

    // Get all allies within 12 squares
    const allies = this.getAlliesInRange(actor, 12);

    // Filter allies with lower Use the Force modifier
    const eligibleAllies = allies.filter(ally => {
      const allyUseTheForce = ally.actor.system.skills?.useTheForce?.modifier || 0;
      return allyUseTheForce < actorUseTheForce;
    });

    if (eligibleAllies.length === 0) {
      return {
        success: false,
        message: 'No eligible allies within 12 squares (must have lower Use the Force modifier)'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: eligibleAllies
    };
  }

  /**
   * Complete Apprentice Boon - Roll Force Point and apply
   */
  static async completeApprenticeBoonSelection(actor, allyId) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // Spend Force Point
    const forcePoints = actor.system.forcePoints?.value || 0;
    await actor.update({ 'system.forcePoints.value': forcePoints - 1 });

    // Roll Force Point die (1d6 by default in SWSE)
    const fpRoll = await new Roll('1d6').evaluate({ async: true });
    await fpRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `Apprentice Boon - Force Point for ${ally.name}`
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Apprentice Boon on ${ally.name}, granting +${fpRoll.total}`);
    ui.notifications.info(`${ally.name} gains +${fpRoll.total} bonus from Apprentice Boon!`);

    return { success: true, bonus: fpRoll.total, allyName: ally.name };
  }

  /**
   * RENEW VISION - Regain all expended uses of Farseeing
   * Once per encounter
   */
  static async triggerRenewVision(actor) {
    if (!this.hasRenewVision(actor)) {
      return { success: false, message: 'Actor does not have Renew Vision talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Renew Vision can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const renewUsageFlag = `renewVision_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', renewUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Renew Vision has already been used this encounter.'
      };
    }

    // Find Farseeing ability/power
    const farseeing = actor.items.find(item =>
      item.name.toLowerCase().includes('farseeing')
    );

    if (!farseeing) {
      return {
        success: false,
        message: 'Actor does not have Farseeing ability'
      };
    }

    // Restore uses if it has a uses system
    if (farseeing.system?.uses) {
      await actor.updateEmbeddedDocuments('Item', [{
        _id: farseeing.id,
        'system.uses.current': farseeing.system.uses.max
      }]);
    }

    await actor.setFlag('swse', renewUsageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Renew Vision to restore Farseeing uses`);
    ui.notifications.info(`All Farseeing uses have been restored!`);

    return { success: true };
  }

  /**
   * SCHOLARLY KNOWLEDGE - Reroll Knowledge checks
   * Must be trained in that Knowledge skill
   */
  static canRerollKnowledge(actor, skillName) {
    if (!this.hasScholarlyKnowledge(actor)) {
      return false;
    }

    // Check if skill is a Knowledge skill
    if (!skillName.toLowerCase().includes('knowledge')) {
      return false;
    }

    // Check if actor is trained in that Knowledge skill
    const skill = actor.system.skills?.[skillName];
    return skill?.trained === true;
  }

  /**
   * SHARE FORCE SECRET - Grant Force Secret to ally
   * Once per turn, ally must be within 12 squares and trained in Use the Force
   */
  static async triggerShareForceSecret(actor) {
    if (!this.hasShareForceSecret(actor)) {
      return { success: false, message: 'Actor does not have Share Force Secret talent' };
    }

    // Check if actor has Force Secrets
    const forceSecrets = actor.items.filter(item =>
      item.type === 'feat' && item.name.toLowerCase().includes('force secret')
    );

    if (forceSecrets.length === 0) {
      return {
        success: false,
        message: 'No Force Secrets available to share'
      };
    }

    // Get allies within 12 squares trained in Use the Force
    const allies = this.getAlliesInRange(actor, 12);
    const eligibleAllies = allies.filter(ally =>
      ally.actor.system.skills?.useTheForce?.trained === true
    );

    if (eligibleAllies.length === 0) {
      return {
        success: false,
        message: 'No eligible allies within 12 squares (must be trained in Use the Force)'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: eligibleAllies,
      forceSecrets: forceSecrets
    };
  }

  /**
   * Complete Share Force Secret selection
   */
  static async completeShareForceSecretSelection(actor, allyId, forceSecretId) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    const forceSecret = actor.items.get(forceSecretId);
    if (!forceSecret) {
      ui.notifications.error('Force Secret not found');
      return false;
    }

    // Create temporary effect on ally granting the Force Secret
    await ally.createEmbeddedDocuments('ActiveEffect', [{
      name: `Shared ${forceSecret.name}`,
      icon: forceSecret.img || "icons/svg/mystery-man.svg",
      changes: [], // Force Secrets might need specific effect changes
      duration: {
        rounds: 1
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'share-force-secret',
          sourceActorId: actor.id,
          sharedForceSecret: forceSecret.name
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} shared ${forceSecret.name} with ${ally.name}`);
    ui.notifications.info(`${ally.name} can use ${forceSecret.name} this turn!`);

    return true;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get all allies within specified range
   */
  static getAlliesInRange(actor, range) {
    if (!game.combat || !canvas.tokens) {
      return [];
    }

    const actorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return [];
    }

    return canvas.tokens.placeables.filter(token => {
      if (!token.actor || token.actor.id === actor.id) return false;
      if (token.document.disposition !== actorToken.document.disposition) return false;

      const distance = canvas.grid.measureDistance(actorToken, token);
      return distance <= range;
    });
  }

  /**
   * Get all allies in line of sight
   */
  static getAlliesInLineOfSight(actor) {
    if (!canvas.tokens) {
      return [];
    }

    const actorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return [];
    }

    return canvas.tokens.placeables.filter(token => {
      if (!token.actor || token.actor.id === actor.id) return false;
      if (token.document.disposition !== actorToken.document.disposition) return false;

      // Simple LOS check - in a real implementation you'd check for walls/obstacles
      return true;
    });
  }

  /**
   * Get all allies
   */
  static getAllAllies(actor) {
    if (!canvas.tokens) {
      return [];
    }

    const actorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return [];
    }

    return canvas.tokens.placeables.filter(token => {
      if (!token.actor || token.actor.id === actor.id) return false;
      return token.document.disposition === actorToken.document.disposition;
    });
  }
}

// ============================================================================
// HOOKS - Auto-trigger Light Side talent dialogs
// ============================================================================

/**
 * Hook: When user initiates Direct, show ally and power selection dialog
 */
Hooks.on('directTriggered', async (actor) => {
  const result = await LightSideTalentMechanics.triggerDirect(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    // Show dialog to select ally
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Direct - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to return a Force Power to:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        select: {
          label: 'Next',
          callback: async (html) => {
            const allyId = html.find('#ally-select').val();
            const ally = game.actors.get(allyId);

            // Get spent Force Powers from ally
            const spentPowers = ally.items.filter(item =>
              item.type === 'forcepower' && item.system?.spent === true
            );

            if (spentPowers.length === 0) {
              ui.notifications.warn(`${ally.name} has no spent Force Powers`);
              return;
            }

            // Show power selection dialog
            const powerOptions = spentPowers
              .map(p => `<option value="${p.id}">${p.name}</option>`)
              .join('');

            const powerDialog = new Dialog({
              title: 'Direct - Select Force Power',
              content: `
                <div class="form-group">
                  <label>Choose a Force Power to return to ${ally.name}:</label>
                  <select id="power-select" style="width: 100%;">
                    ${powerOptions}
                  </select>
                </div>
              `,
              buttons: {
                return: {
                  label: 'Return to Suite',
                  callback: async (html2) => {
                    const powerId = html2.find('#power-select').val();
                    await LightSideTalentMechanics.completeDirectSelection(
                      actor,
                      allyId,
                      powerId,
                      result.combatId,
                      result.directUsageFlag
                    );
                  }
                },
                cancel: {
                  label: 'Cancel'
                }
              }
            });

            powerDialog.render(true);
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    dialog.render(true);
  }
});

/**
 * Hook: When user initiates Consular's Wisdom
 */
Hooks.on('consularsWisdomTriggered', async (actor) => {
  const result = await LightSideTalentMechanics.triggerConsularsWisdom(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: "Consular's Wisdom - Select Ally",
      content: `
        <div class="form-group">
          <label>Choose an ally to grant your Wisdom bonus to Will Defense:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        grant: {
          label: 'Grant Wisdom Bonus',
          callback: async (html) => {
            const allyId = html.find('#ally-select').val();
            await LightSideTalentMechanics.completeConsularsWisdomSelection(
              actor,
              allyId,
              result.combatId,
              result.wisdomUsageFlag
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
});

/**
 * Hook: Clear encounter-specific flags when combat ends
 */
Hooks.on('deleteCombat', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    // Clear all light side talent encounter flags
    const combatId = combat.id;
    await actor.unsetFlag('swse', `direct_${combatId}`);
    await actor.unsetFlag('swse', `consularsWisdom_${combatId}`);
    await actor.unsetFlag('swse', `darkRetaliation_${combatId}`);
    await actor.unsetFlag('swse', `renewVision_${combatId}`);
  }
});

export default LightSideTalentMechanics;
