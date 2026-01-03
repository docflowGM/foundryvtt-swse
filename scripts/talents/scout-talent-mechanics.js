/**
 * Scout Talent Mechanics
 * Implements complex game mechanics for Scout talents:
 * - Aggressive Surge: Free charge when using Second Wind
 * - Quick on Your Feet: Once per encounter, move your speed
 * - Surge: Once per encounter, move up to your speed
 * - Weak Point: Once per encounter, ignore target's DR for rest of turn
 * - Advanced Intel: Use Spotter in surprise round if not surprised
 * - Guidance: Ally ignores difficult terrain until next turn
 * - Ready and Willing: Take readied action after opponent acts
 * - Sprint: Run up to five times your speed
 * - Surefooted: Speed not reduced by difficult terrain
 * - Close-Combat Assault: Followers gain Point Blank Shot
 * - Get Into Position: One follower gains +2 speed
 * - Reconnaissance Actions: Grant follower bonuses
 * - Reconnaissance Team Leader: Gain follower trained in Perception and Stealth
 */

import { SWSELogger } from '../utils/logger.js';

export class ScoutTalentMechanics {

  /**
   * Check if actor has Aggressive Surge talent
   */
  static hasAggressiveSurge(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Aggressive Surge'
    );
  }

  /**
   * Check if actor has Quick on Your Feet talent
   */
  static hasQuickOnYourFeet(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Quick on Your Feet'
    );
  }

  /**
   * Check if actor has Surge talent
   */
  static hasSurge(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Surge'
    );
  }

  /**
   * Check if actor has Weak Point talent
   */
  static hasWeakPoint(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Weak Point'
    );
  }

  /**
   * Check if actor has Advanced Intel talent
   */
  static hasAdvancedIntel(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Advanced Intel'
    );
  }

  /**
   * Check if actor has Guidance talent
   */
  static hasGuidance(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Guidance'
    );
  }

  /**
   * Check if actor has Ready and Willing talent
   */
  static hasReadyAndWilling(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Ready and Willing'
    );
  }

  /**
   * Check if actor has Sprint talent
   */
  static hasSprint(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Sprint'
    );
  }

  /**
   * Check if actor has Surefooted talent
   */
  static hasSurefooted(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Surefooted'
    );
  }

  /**
   * Check if actor has Close-Combat Assault talent
   */
  static hasCloseCombatAssault(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Close-Combat Assault'
    );
  }

  /**
   * Check if actor has Get Into Position talent
   */
  static hasGetIntoPosition(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Get Into Position'
    );
  }

  /**
   * Check if actor has Reconnaissance Actions talent
   */
  static hasReconnaissanceActions(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Reconnaissance Actions'
    );
  }

  /**
   * Check if actor has Reconnaissance Team Leader talent
   */
  static hasReconnaissanceTeamLeader(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Reconnaissance Team Leader'
    );
  }

  // ============================================================================
  // MOVEMENT TALENTS
  // ============================================================================

  /**
   * QUICK ON YOUR FEET - Once per encounter, move your speed
   * Free action
   */
  static async triggerQuickOnYourFeet(actor) {
    if (!this.hasQuickOnYourFeet(actor)) {
      return { success: false, message: 'Actor does not have Quick on Your Feet talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Quick on Your Feet can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `quickOnYourFeet_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Quick on Your Feet has already been used this encounter.'
      };
    }

    const movementSpeed = actor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      movementSpeed: movementSpeed,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Quick on Your Feet activation
   */
  static async completeQuickOnYourFeet(actor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    const movementSpeed = actor.system.movement?.groundSpeed || 30;

    SWSELogger.log(`SWSE Talents | ${actor.name} used Quick on Your Feet to move ${movementSpeed} feet`);
    ui.notifications.info(`${actor.name} moves ${movementSpeed} feet as a free action!`);

    return { success: true, movementSpeed: movementSpeed };
  }

  /**
   * SURGE - Once per encounter, move up to your speed
   * Free action (same as Quick on Your Feet but slightly different flavor)
   */
  static async triggerSurge(actor) {
    if (!this.hasSurge(actor)) {
      return { success: false, message: 'Actor does not have Surge talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Surge can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `surge_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Surge has already been used this encounter.'
      };
    }

    const movementSpeed = actor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      movementSpeed: movementSpeed,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Surge activation
   */
  static async completeSurge(actor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    const movementSpeed = actor.system.movement?.groundSpeed || 30;

    SWSELogger.log(`SWSE Talents | ${actor.name} used Surge to move up to ${movementSpeed} feet`);
    ui.notifications.info(`${actor.name} surges forward up to ${movementSpeed} feet as a free action!`);

    return { success: true, movementSpeed: movementSpeed };
  }

  /**
   * SPRINT - Run up to five times your speed
   * Full-round action
   */
  static async triggerSprint(actor) {
    if (!this.hasSprint(actor)) {
      return { success: false, message: 'Actor does not have Sprint talent' };
    }

    const groundSpeed = actor.system.movement?.groundSpeed || 30;
    const sprintDistance = groundSpeed * 5;

    return {
      success: true,
      sprintDistance: sprintDistance,
      groundSpeed: groundSpeed
    };
  }

  /**
   * SUREFOOTED - Speed not reduced by difficult terrain
   * This is a passive talent that applies automatically as an Active Effect
   */
  static applySurefooted(actor) {
    if (!this.hasSurefooted(actor)) {
      return false;
    }

    // This talent works best as an active effect on the actor
    // It prevents the typical terrain movement penalty
    return true;
  }

  // ============================================================================
  // COMBAT TALENTS
  // ============================================================================

  /**
   * AGGRESSIVE SURGE - Free charge action when using Second Wind
   * Triggered when actor uses Second Wind
   */
  static async triggerAggressiveSurge(actor) {
    if (!this.hasAggressiveSurge(actor)) {
      return { success: false, message: 'Actor does not have Aggressive Surge talent' };
    }

    // Check if actor can make a charge (within combat)
    if (!game.combat?.active) {
      return {
        success: false,
        message: 'Aggressive Surge can only be used during combat'
      };
    }

    return {
      success: true,
      message: 'You may immediately make a free charge action!'
    };
  }

  /**
   * WEAK POINT - Once per encounter, ignore target's DR for rest of turn
   * Passive trigger ability
   */
  static async triggerWeakPoint(actor, targetToken) {
    if (!this.hasWeakPoint(actor)) {
      return { success: false, message: 'Actor does not have Weak Point talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Weak Point can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `weakPoint_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Weak Point has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target to use Weak Point on'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresSelection: false,
      targetToken: targetToken,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Weak Point activation
   */
  static async completeWeakPoint(actor, targetActor, combatId, usageFlag) {
    // Apply effect that ignores DR until end of turn
    const currentRound = game.combat?.round;
    const currentTurn = game.combat?.turn;

    await targetActor.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Weak Point - DR Ignored',
      icon: 'icons/svg/target.svg',
      changes: [{
        key: 'system.damageReduction.ignoreUntilEndOfTurn',
        mode: 5, // OVERRIDE
        value: 'true',
        priority: 50
      }],
      duration: {
        rounds: 1,
        startRound: currentRound,
        startTurn: currentTurn
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'weak-point',
          sourceActorId: actor.id
        }
      }
    }]);

    await actor.setFlag('swse', usageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Weak Point on ${targetActor.name}, ignoring DR for rest of turn`);
    ui.notifications.info(`${targetActor.name}'s Damage Reduction is ignored for the rest of your turn!`);

    return { success: true };
  }

  // ============================================================================
  // UTILITY TALENTS
  // ============================================================================

  /**
   * ADVANCED INTEL - If not surprised, may use Spotter in surprise round
   * Passive talent
   */
  static hasAdvancedIntelEffect(actor) {
    if (!this.hasAdvancedIntel(actor)) {
      return false;
    }

    // Check if actor is surprised in current combat
    const actorToken = canvas.tokens?.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return false;
    }

    const isSurprised = actorToken.actor?.system?.condition?.surprised || false;
    return !isSurprised; // Returns true if NOT surprised
  }

  /**
   * GUIDANCE - Ally ignores difficult terrain until next turn
   * Standard action
   */
  static async triggerGuidance(actor) {
    if (!this.hasGuidance(actor)) {
      return { success: false, message: 'Actor does not have Guidance talent' };
    }

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available to guide'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: allies
    };
  }

  /**
   * Complete Guidance selection
   */
  static async completeGuidanceSelection(actor, allyId) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // Create effect for ignoring difficult terrain
    await ally.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Guidance - Ignore Difficult Terrain',
      icon: 'icons/svg/light.svg',
      changes: [{
        key: 'system.movement.ignoreDifficultTerrain',
        mode: 5, // OVERRIDE
        value: 'true',
        priority: 20
      }],
      duration: {
        rounds: 1
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'guidance',
          sourceActorId: actor.id
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Guidance on ${ally.name}`);
    ui.notifications.info(`${ally.name} ignores difficult terrain until the start of their next turn!`);

    return true;
  }

  /**
   * READY AND WILLING - Take readied action at end of current turn after opponent acts
   * Passive talent
   */
  static async triggerReadyAndWilling(actor) {
    if (!this.hasReadyAndWilling(actor)) {
      return { success: false, message: 'Actor does not have Ready and Willing talent' };
    }

    // This is a special passive ability that allows readied actions at end of turn
    return {
      success: true,
      message: 'You may take a readied action at the end of the current turn after an opponent takes its action.'
    };
  }

  // ============================================================================
  // FOLLOWER TALENTS
  // ============================================================================

  /**
   * CLOSE-COMBAT ASSAULT - Each follower gains Point Blank Shot
   * Follower enhancement
   */
  static applyCloseCombatAssault(actor, follower) {
    if (!this.hasCloseCombatAssault(actor)) {
      return false;
    }

    // Grant follower the Point Blank Shot feat
    // This would typically be handled through active effects or item grants
    return true;
  }

  /**
   * GET INTO POSITION - One follower gains +2 speed
   * Follower enhancement
   */
  static async triggerGetIntoPosition(actor) {
    if (!this.hasGetIntoPosition(actor)) {
      return { success: false, message: 'Actor does not have Get Into Position talent' };
    }

    // Get followers
    const followers = this.getFollowers(actor);

    if (followers.length === 0) {
      return {
        success: false,
        message: 'No followers available to position'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      followers: followers
    };
  }

  /**
   * Complete Get Into Position selection
   */
  static async completeGetIntoPosition(actor, followerId) {
    const follower = game.actors.get(followerId);
    if (!follower) {
      ui.notifications.error('Follower not found');
      return false;
    }

    // Apply +2 speed bonus
    const currentSpeed = follower.system.movement?.groundSpeed || 30;
    const newSpeed = currentSpeed + 2;

    await follower.update({ 'system.movement.groundSpeed': newSpeed });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Get Into Position on ${follower.name}, +2 speed`);
    ui.notifications.info(`${follower.name} gains +2 to their speed!`);

    return true;
  }

  /**
   * RECONNAISSANCE ACTIONS - Grant follower bonuses
   * When you attack: grant +2 ranged attack to each follower, or +1 Stealth, or +1 Perception
   */
  static async triggerReconnaissanceActions(actor, bonusType = 'ranged') {
    if (!this.hasReconnaissanceActions(actor)) {
      return { success: false, message: 'Actor does not have Reconnaissance Actions talent' };
    }

    const followers = this.getFollowers(actor);

    if (followers.length === 0) {
      return {
        success: false,
        message: 'No followers to apply bonuses to'
      };
    }

    return {
      success: true,
      followers: followers,
      bonusType: bonusType
    };
  }

  /**
   * RECONNAISSANCE TEAM LEADER - Gain follower trained in Perception and Stealth (max 3x)
   * Passive - triggers follower generation
   */
  static async triggerReconnaissanceTeamLeader(actor) {
    if (!this.hasReconnaissanceTeamLeader(actor)) {
      return { success: false, message: 'Actor does not have Reconnaissance Team Leader talent' };
    }

    // Count existing reconnaissance team members
    const recon Flag = actor.getFlag('swse', 'reconnaissanceTeamCount') || 0;

    if (reconCount >= 3) {
      return {
        success: false,
        message: 'You can only have a maximum of 3 Reconnaissance Team members'
      };
    }

    return {
      success: true,
      currentCount: reconCount,
      maxCount: 3,
      triggerFollowerGenerator: true
    };
  }

  /**
   * Record addition of Reconnaissance Team member
   */
  static async recordReconnaissanceTeamMember(actor) {
    const currentCount = actor.getFlag('swse', 'reconnaissanceTeamCount') || 0;
    await actor.setFlag('swse', 'reconnaissanceTeamCount', currentCount + 1);

    SWSELogger.log(`SWSE Talents | ${actor.name} added Reconnaissance Team member (${currentCount + 1}/3)`);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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

  /**
   * Get actor's followers
   */
  static getFollowers(actor) {
    if (!canvas.tokens) {
      return [];
    }

    const actorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return [];
    }

    // Followers are typically marked with a specific flag or relationship
    // This is a simplified implementation
    return canvas.tokens.placeables.filter(token => {
      if (!token.actor || token.actor.id === actor.id) return false;
      // Check if this is a follower of the actor
      const followerFlag = token.actor.getFlag('swse', 'followerOfActor');
      return followerFlag === actor.id;
    });
  }
}

// ============================================================================
// HOOKS - Auto-trigger Scout talent dialogs
// ============================================================================

/**
 * Hook: When user initiates Quick on Your Feet
 */
Hooks.on('quickOnYourFeetTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerQuickOnYourFeet(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await ScoutTalentMechanics.completeQuickOnYourFeet(actor, result.combatId, result.usageFlag);
});

/**
 * Hook: When user initiates Surge
 */
Hooks.on('surgeTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerSurge(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await ScoutTalentMechanics.completeSurge(actor, result.combatId, result.usageFlag);
});

/**
 * Hook: When user initiates Weak Point
 */
Hooks.on('weakPointTriggered', async (actor, targetToken) => {
  const result = await ScoutTalentMechanics.triggerWeakPoint(actor, targetToken);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await ScoutTalentMechanics.completeWeakPoint(actor, result.targetActor, result.combatId, result.usageFlag);
});

/**
 * Hook: When user initiates Guidance
 */
Hooks.on('guidanceTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerGuidance(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Guidance - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to guide:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        guide: {
          label: 'Grant Guidance',
          callback: async (html) => {
            const allyId = html.find('#ally-select').val();
            await ScoutTalentMechanics.completeGuidanceSelection(actor, allyId);
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
 * Hook: When user initiates Get Into Position
 */
Hooks.on('getIntoPosTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerGetIntoPosition(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const followerOptions = result.followers
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Get Into Position - Select Follower',
      content: `
        <div class="form-group">
          <label>Choose a follower to position:</label>
          <select id="follower-select" style="width: 100%;">
            ${followerOptions}
          </select>
        </div>
      `,
      buttons: {
        position: {
          label: 'Position',
          callback: async (html) => {
            const followerId = html.find('#follower-select').val();
            await ScoutTalentMechanics.completeGetIntoPosition(actor, followerId);
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

    // Clear all scout talent encounter flags
    const combatId = combat.id;
    await actor.unsetFlag('swse', `quickOnYourFeet_${combatId}`);
    await actor.unsetFlag('swse', `surge_${combatId}`);
    await actor.unsetFlag('swse', `weakPoint_${combatId}`);
  }
});

export default ScoutTalentMechanics;
