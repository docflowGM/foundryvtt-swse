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
 * - Shadow Striker: Grants 3 encounter abilities (Blinding Strike, Confusing Strike, Unexpected Attack)
 * - Swift Strider: Grants 3 encounter abilities (Blurring Burst, Sudden Assault, Weaving Stride)
 * - Close-Combat Assault: Followers gain Point Blank Shot
 * - Get Into Position: One follower gains +2 speed
 * - Reconnaissance Actions: Grant follower bonuses
 * - Reconnaissance Team Leader: Gain follower trained in Perception and Stealth
 */

import { SWSELogger } from '../utils/logger.js';
import { createEffectOnActor, createItemInActor } from '../core/document-api-v13.js';

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
   * Check if actor has Shadow Striker talent
   */
  static hasShadowStriker(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Shadow Striker'
    );
  }

  /**
   * Check if actor has Swift Strider talent
   */
  static hasSwiftStrider(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Swift Strider'
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
  // SHADOW STRIKER TALENTS (grants 3 encounter abilities)
  // ============================================================================

  /**
   * BLINDING STRIKE - Make attack, gain Total Concealment against target until next turn
   * Standard action, once per encounter
   */
  static async triggerBlindingStrike(actor, targetToken) {
    if (!this.hasShadowStriker(actor)) {
      return { success: false, message: 'Actor does not have Shadow Striker talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Blinding Strike can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `blindingStrike_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Blinding Strike has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Blinding Strike'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetToken: targetToken,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Blinding Strike - Apply effect if attack hits
   */
  static async completeBlindingStrike(actor, targetActor, attackHit, combatId, usageFlag) {
    // Mark ability as used
    await actor.setFlag('swse', usageFlag, true);

    if (!attackHit) {
      SWSELogger.log(`SWSE Talents | ${actor.name} used Blinding Strike on ${targetActor.name} but missed`);
      return { success: true, hit: false };
    }

    // If attack hits, apply Total Concealment effect until start of next turn
    await createEffectOnActor(targetActor, {
      name: 'Blinding Strike - Total Concealment',
      icon: 'icons/svg/blind.svg',
      changes: [{
        key: 'system.concealment.total',
        mode: 5, // OVERRIDE
        value: 'true',
        priority: 50
      }],
      duration: {
        rounds: 1,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'blinding-strike',
          sourceActorId: actor.id
        }
      }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Blinding Strike on ${targetActor.name}, gained Total Concealment`);
    ui.notifications.info(`${actor.name} has Total Concealment against ${targetActor.name} until the start of their next turn!`);

    return { success: true, hit: true };
  }

  /**
   * CONFUSING STRIKE - Make attack, if target denied Dex or you have concealment, target can only take Swift Action next turn
   * Standard action, once per encounter
   */
  static async triggerConfusingStrike(actor, targetToken) {
    if (!this.hasShadowStriker(actor)) {
      return { success: false, message: 'Actor does not have Shadow Striker talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Confusing Strike can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `confusingStrike_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Confusing Strike has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Confusing Strike'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    // Check if conditions are met: target denied Dex OR actor has concealment
    const targetDeniedDex = targetActor.system?.condition?.deniedDex || false;
    const actorHasConcealment = actor.system?.concealment?.any || false;

    if (!targetDeniedDex && !actorHasConcealment) {
      return {
        success: false,
        message: 'Confusing Strike requires: target denied Dexterity bonus OR you have concealment from target'
      };
    }

    return {
      success: true,
      requiresRoll: true,
      targetToken: targetToken,
      targetActor: targetActor,
      conditionMet: true,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Confusing Strike - Apply effect if attack hits
   */
  static async completeConfusingStrike(actor, targetActor, attackHit, combatId, usageFlag) {
    // Mark ability as used
    await actor.setFlag('swse', usageFlag, true);

    if (!attackHit) {
      SWSELogger.log(`SWSE Talents | ${actor.name} used Confusing Strike on ${targetActor.name} but missed`);
      return { success: true, hit: false };
    }

    // If attack hits, apply effect limiting target to Swift Action on next turn
    await createEffectOnActor(targetActor, {
      name: 'Confusing Strike - Swift Action Only',
      icon: 'icons/svg/daze.svg',
      changes: [{
        key: 'system.action.limitedToSwiftAction',
        mode: 5, // OVERRIDE
        value: 'true',
        priority: 50
      }],
      duration: {
        rounds: 1,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'confusing-strike',
          sourceActorId: actor.id
        }
      }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Confusing Strike on ${targetActor.name}, target limited to Swift Action`);
    ui.notifications.info(`${targetActor.name} can only take a Swift Action on their next turn!`);

    return { success: true, hit: true };
  }

  /**
   * UNEXPECTED ATTACK - Make attack from concealment with +2 bonus, or +5 if Total Concealment
   * Standard action, once per encounter
   * Requires: Concealment from target
   */
  static async triggerUnexpectedAttack(actor, targetToken) {
    if (!this.hasShadowStriker(actor)) {
      return { success: false, message: 'Actor does not have Shadow Striker talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Unexpected Attack can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `unexpectedAttack_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Unexpected Attack has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Unexpected Attack'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    // Check if actor has concealment from target
    const actorHasConcealment = actor.system?.concealment?.any || false;
    const hasTotal = actor.system?.concealment?.total || false;

    if (!actorHasConcealment) {
      return {
        success: false,
        message: 'Unexpected Attack requires concealment from the target'
      };
    }

    const bonus = hasTotal ? 5 : 2;

    return {
      success: true,
      requiresRoll: true,
      targetToken: targetToken,
      targetActor: targetActor,
      bonus: bonus,
      hasTotal: hasTotal,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Unexpected Attack - Mark as used and apply bonus to attack
   */
  static async completeUnexpectedAttack(actor, targetActor, attackBonus, combatId, usageFlag) {
    // Mark ability as used
    await actor.setFlag('swse', usageFlag, true);

    const bonusText = attackBonus === 5 ? '+5 (Total Concealment)' : '+2 (Concealment)';

    SWSELogger.log(`SWSE Talents | ${actor.name} used Unexpected Attack on ${targetActor.name} with ${bonusText}`);
    ui.notifications.info(`${actor.name} makes an Unexpected Attack with ${bonusText} bonus!`);

    return { success: true, bonus: attackBonus };
  }

  // ============================================================================
  // SWIFT STRIDER TALENTS (grants 3 encounter abilities)
  // ============================================================================

  /**
   * BLURRING BURST - Move action, gain +2 Reflex Defense until end of encounter
   * Move action, once per encounter
   */
  static async triggerBlurringBurst(actor) {
    if (!this.hasSwiftStrider(actor)) {
      return { success: false, message: 'Actor does not have Swift Strider talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Blurring Burst can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `blurringBurst_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Blurring Burst has already been used this encounter.'
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
   * Complete Blurring Burst - Apply Reflex Defense bonus
   */
  static async completeBlurringBurst(actor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    const movementSpeed = actor.system.movement?.groundSpeed || 30;

    // Apply +2 Reflex Defense bonus until end of encounter
    await createEffectOnActor(actor, {
      name: 'Blurring Burst - Reflex Bonus',
      icon: 'icons/svg/aura.svg',
      changes: [{
        key: 'system.defenses.reflex.bonus',
        mode: 2, // ADD
        value: 2,
        priority: 20
      }],
      duration: {
        combat: combatId
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'blurring-burst',
          sourceActorId: actor.id
        }
      }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Blurring Burst, moved ${movementSpeed} feet and gained +2 Reflex Defense`);
    ui.notifications.info(`${actor.name} blurs into action! Move ${movementSpeed} feet and gain +2 to Reflex Defense until the end of the encounter!`);

    return { success: true, movementSpeed: movementSpeed };
  }

  /**
   * SUDDEN ASSAULT - Make a charge attack without Reflex Defense penalty
   * Standard action, once per encounter
   */
  static async triggerSuddenAssault(actor, targetToken) {
    if (!this.hasSwiftStrider(actor)) {
      return { success: false, message: 'Actor does not have Swift Strider talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Sudden Assault can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `suddenAssault_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Sudden Assault has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Sudden Assault'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetToken: targetToken,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Sudden Assault - Mark as used
   */
  static async completeSuddenAssault(actor, targetActor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Sudden Assault on ${targetActor.name}`);
    ui.notifications.info(`${actor.name} makes a Sudden Assault against ${targetActor.name} with no Reflex Defense penalty!`);

    return { success: true };
  }

  /**
   * WEAVING STRIDE - Move action, gain cumulative +2 dodge bonus for each AoO made against you
   * Move action, once per encounter
   */
  static async triggerWeavingStride(actor) {
    if (!this.hasSwiftStrider(actor)) {
      return { success: false, message: 'Actor does not have Swift Strider talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Weaving Stride can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `weavingStride_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Weaving Stride has already been used this encounter.'
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
   * Complete Weaving Stride activation
   */
  static async completeWeavingStride(actor, aooCount, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    const movementSpeed = actor.system.movement?.groundSpeed || 30;
    const dodgeBonus = aooCount * 2;

    // If there were any AoOs made, apply bonus
    if (aooCount > 0) {
      await createEffectOnActor(actor, {
        name: `Weaving Stride - Dodge Bonus (${dodgeBonus})`,
        icon: 'icons/svg/daze.svg',
        changes: [{
          key: 'system.defenses.reflex.bonus',
          mode: 2, // ADD
          value: dodgeBonus,
          priority: 20
        }],
        duration: {
          rounds: 1,
          startRound: game.combat?.round,
          startTurn: game.combat?.turn
        },
        flags: {
          swse: {
            source: 'talent',
            sourceId: 'weaving-stride',
            sourceActorId: actor.id,
            aooCount: aooCount
          }
        }
      });

      SWSELogger.log(`SWSE Talents | ${actor.name} used Weaving Stride, moved ${movementSpeed} feet and gained +${dodgeBonus} dodge bonus from ${aooCount} AoO(s)`);
      ui.notifications.info(`${actor.name} weaves through combat! Move ${movementSpeed} feet and gain +${dodgeBonus} dodge bonus to Reflex Defense from ${aooCount} Attack(s) of Opportunity!`);
    } else {
      SWSELogger.log(`SWSE Talents | ${actor.name} used Weaving Stride, moved ${movementSpeed} feet (no AoOs)`);
      ui.notifications.info(`${actor.name} weaves through combat! Move ${movementSpeed} feet. No AoOs triggered, so no dodge bonus.`);
    }

    return { success: true, movementSpeed: movementSpeed, dodgeBonus: dodgeBonus };
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

    await createEffectOnActor(targetActor, {
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
    });

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
    await createEffectOnActor(ally, {
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
    });

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
    const reconCount = actor.getFlag('swse', 'reconnaissanceTeamCount') || 0;

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
      if (!token.actor || token.actor.id === actor.id) {return false;}
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
      if (!token.actor || token.actor.id === actor.id) {return false;}
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
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
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
            const followerId = (html?.[0] ?? html)?.querySelector('#follower-select')?.value;
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
 * Hook: When user initiates Blurring Burst
 */
Hooks.on('blurringBurstTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerBlurringBurst(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await ScoutTalentMechanics.completeBlurringBurst(actor, result.combatId, result.usageFlag);
});

/**
 * Hook: When user initiates Sudden Assault
 */
Hooks.on('suddenAssaultTriggered', async (actor, targetToken) => {
  const result = await ScoutTalentMechanics.triggerSuddenAssault(actor, targetToken);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresRoll) {
    const dialog = new Dialog({
      title: 'Sudden Assault - Charge Attack',
      content: `
        <div class="form-group">
          <p>Make a Charge attack against <strong>${result.targetActor.name}</strong>.</p>
          <p>You take no penalty to your Reflex Defense for this attack.</p>
          <label>Did your attack hit?</label>
          <select id="hit-select" style="width: 100%;">
            <option value="true">Yes, I hit!</option>
            <option value="false">No, I missed.</option>
          </select>
        </div>
      `,
      buttons: {
        confirm: {
          label: 'Confirm',
          callback: async (html) => {
            const hitValue = (html?.[0] ?? html)?.querySelector('#hit-select')?.value === 'true';
            await ScoutTalentMechanics.completeSuddenAssault(
              actor,
              result.targetActor,
              result.combatId,
              result.usageFlag
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
 * Hook: When user initiates Weaving Stride
 */
Hooks.on('weavingStrideTriggered', async (actor) => {
  const result = await ScoutTalentMechanics.triggerWeavingStride(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  const dialog = new Dialog({
    title: 'Weaving Stride - Movement',
    content: `
      <div class="form-group">
        <p>Move up to <strong>${result.movementSpeed} feet</strong> as a Move Action.</p>
        <p>You gain a cumulative +2 dodge bonus to your Reflex Defense for each Attack of Opportunity made against you during this movement.</p>
        <label>How many Attacks of Opportunity were made against you?</label>
        <input type="number" id="aoo-count" min="0" max="10" value="0" style="width: 100%;">
      </div>
    `,
    buttons: {
      confirm: {
        label: 'Confirm',
        callback: async (html) => {
          const aooCount = parseInt((html?.[0] ?? html)?.querySelector('#aoo-count')?.value) || 0;
          await ScoutTalentMechanics.completeWeavingStride(
            actor,
            aooCount,
            result.combatId,
            result.usageFlag
          );
        }
      },
      cancel: {
        label: 'Cancel'
      }
    }
  });

  dialog.render(true);
});

/**
 * Hook: Clear encounter-specific flags when combat ends
 */
Hooks.on('deleteCombat', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) {continue;}

    // Clear all scout talent encounter flags
    const combatId = combat.id;
    await actor.unsetFlag('swse', `quickOnYourFeet_${combatId}`);
    await actor.unsetFlag('swse', `surge_${combatId}`);
    await actor.unsetFlag('swse', `weakPoint_${combatId}`);
    await actor.unsetFlag('swse', `blindingStrike_${combatId}`);
    await actor.unsetFlag('swse', `confusingStrike_${combatId}`);
    await actor.unsetFlag('swse', `unexpectedAttack_${combatId}`);
    await actor.unsetFlag('swse', `blurringBurst_${combatId}`);
    await actor.unsetFlag('swse', `suddenAssault_${combatId}`);
    await actor.unsetFlag('swse', `weavingStride_${combatId}`);
  }
});

export default ScoutTalentMechanics;
