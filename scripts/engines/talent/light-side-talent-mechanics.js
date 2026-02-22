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
 * - Steel Resolve: Trade attack penalty for Will Defense bonus
 * - Adept Negotiator: Persuasion check to move opponent on Condition Track
 * - Force Persuasion: Use Force modifier for Persuasion checks
 * - Master Negotiator: Additional -1 step on Condition Track
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { TalentEffectEngine } from './talent-effect-engine.js';
import { createEffectOnActor } from '../../core/document-api-v13.js';
import { RollEngine } from '../../engine/roll-engine.js';

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
   * Check if actor has Dark Side Scourge talent
   */
  static hasDarkSideScourge(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Scourge'
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
   * Check if actor has Steel Resolve talent
   */
  static hasSteelResolve(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Steel Resolve'
    );
  }

  /**
   * Check if actor has Adept Negotiator talent
   */
  static hasAdeptNegotiator(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Adept Negotiator'
    );
  }

  /**
   * Check if actor has Force Persuasion talent
   */
  static hasForcePersuasion(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Force Persuasion'
    );
  }

  /**
   * Check if actor has Master Negotiator talent
   */
  static hasMasterNegotiator(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Master Negotiator'
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
    const alreadyUsed = actor.getFlag('foundryvtt-swse', directUsageFlag);

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

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildDirectPlan({
      sourceActor: actor,
      allyActor: ally,
      power: power,
      directUsageFlag: directUsageFlag
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Direct failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS
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
    const alreadyUsed = actor.getFlag('foundryvtt-swse', wisdomUsageFlag);

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
    const wisdomBonus = actor.system.attributes?.wis?.mod || 0;

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildConsularsWisdomPlan({
      sourceActor: actor,
      allyActor: ally,
      wisdomBonus: wisdomBonus,
      wisdomUsageFlag: wisdomUsageFlag
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Consular's Wisdom failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Effect creation and notifications)
    await createEffectOnActor(ally, {
      name: "Consular's Wisdom",
      icon: 'icons/svg/angel.svg',
      changes: [{
        key: 'system.defenses.will.bonus',
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
    });

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

    const targetActor = targetToken.actor;

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildExposingStrikePlan({
      sourceActor: actor,
      targetActor: targetActor
    });

    if (!plan.success) {
      ui.notifications.warn(plan.reason);
      return { success: false, message: plan.reason };
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.warn(`Exposing Strike failed: ${result.reason}`);
      return { success: false, message: `Exposing Strike failed: ${result.reason}` };
    }

    // PHASE 3: SIDE-EFFECTS (Effect creation and notifications)
    const duration = {
      rounds: 1,
      startRound: game.combat?.round,
      startTurn: game.combat?.turn
    };

    await createEffectOnActor(targetActor, {
      name: 'Exposing Strike - Flat-Footed',
      icon: 'icons/svg/daze.svg',
      changes: [{
        key: 'system.condition.flatFooted',
        mode: 5, // OVERRIDE
        value: 'true',
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
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Exposing Strike on ${targetActor.name}`);
    ui.notifications.info(`${targetActor.name} is flat-footed until the end of your next turn!`);

    return { success: true };
  }

  /**
   * DARK RETALIATION - React to Dark Side power with your own Force power
   * Once per encounter, spend a Force Point to activate a Force Power as a Reaction
   * Triggers when targeted by a Force Power with [Dark Side] descriptor
   */
  static async triggerDarkRetaliation(actor, darkSidePower) {
    if (!this.hasDarkRetaliation(actor)) {
      return { success: false, message: 'Actor does not have Dark Retaliation talent' };
    }

    // Check Force Points first - must have at least 1
    const forcePoints = actor.system.forcePoints?.value || 0;
    if (forcePoints <= 0) {
      return {
        success: false,
        message: 'No Force Points available for Dark Retaliation'
      };
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
    const alreadyUsed = actor.getFlag('foundryvtt-swse', retaliationUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Dark Retaliation has already been used this encounter.'
      };
    }

    // Get available Force Powers (not spent)
    const forcePowers = actor.items.filter(item =>
      item.type === 'forcepower' && item.system?.spent === false
    );

    if (forcePowers.length === 0) {
      return {
        success: false,
        message: 'No Force Powers available in your suite to use for retaliation'
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

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildDarkRetaliationPlan({
      sourceActor: actor,
      retaliationUsageFlag: retaliationUsageFlag
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Dark Retaliation failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Log and notifications)
    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Retaliation with ${power.name}, spent Force Point`);
    ui.notifications.info(`${actor.name} spends a Force Point and activates ${power.name} as a reaction to the Dark Side power!`);

    // The actual power activation should be handled separately
    return { success: true, power: power };
  }

  /**
   * DARK SIDE SCOURGE - Deal extra damage to creatures with Dark Side Score
   * Against creatures with DSP 1+, deal extra damage equal to Charisma bonus (min +1)
   * This is applied during damage calculation
   */
  static applyDarkSideScourge(actor, target, baseDamage) {
    if (!this.hasDarkSideScourge(actor)) {
      return baseDamage;
    }

    // Check if target has Dark Side Points
    const targetDSP = target.system?.darkSideScore || target.system?.dsp || 0;

    if (targetDSP < 1) {
      return baseDamage; // No bonus damage
    }

    // Get actor's Charisma bonus (minimum +1)
    const chaBonus = Math.max(1, actor.system.attributes?.cha?.mod || 1);

    const totalDamage = baseDamage + chaBonus;

    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Side Scourge against ${target.name} (DSP: ${targetDSP}), adding +${chaBonus} damage`);
    ui.notifications.info(`Dark Side Scourge: +${chaBonus} damage against dark side enemy!`);

    return totalDamage;
  }

  /**
   * Check if Dark Side Scourge should apply to this target
   */
  static shouldApplyDarkSideScourge(actor, target) {
    if (!this.hasDarkSideScourge(actor)) {
      return false;
    }

    const targetDSP = target.system?.darkSideScore || target.system?.dsp || 0;
    return targetDSP >= 1;
  }

  /**
   * REBUKE THE DARK - Roll twice for rebuke attempts
   */
  static async applyRebukeBonus(actor, roll) {
    if (!this.hasRebukeTheDark(actor)) {
      return roll;
    }

    // Roll a second d20 and take the better result
    const secondRoll = await RollEngine.safeRoll('1d20');
    if (!secondRoll) {
      return roll; // Fallback to original if reroll fails
    }
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

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildSkilledAdvisorPlan({
      sourceActor: actor,
      useForcePoint: useForcePoint
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Skilled Advisor failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Effect creation and notifications)
    await createEffectOnActor(ally, {
      name: `Skilled Advisor - ${skillName}`,
      icon: 'icons/svg/book.svg',
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
    });

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
    const actorUseTheForce = actor.system.skills?.useTheForce?.total || 0;

    // Get all allies within 12 squares
    const allies = this.getAlliesInRange(actor, 12);

    // Filter allies with lower Use the Force modifier
    const eligibleAllies = allies.filter(ally => {
      const allyUseTheForce = ally.actor.system.skills?.useTheForce?.total || 0;
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

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildApprenticeBoonPlan({
      sourceActor: actor
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Apprentice Boon failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Roll and notifications)
    const fpRoll = await RollEngine.safeRoll('1d6');
    if (!fpRoll) {
      ui.notifications.error('Force Point roll failed');
      return { success: false, message: 'Roll failed' };
    }
    await fpRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `Apprentice Boon - Force Point for ${ally.name}`
    } , { create: true });

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
    const alreadyUsed = actor.getFlag('foundryvtt-swse', renewUsageFlag);

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

    if (!farseeing.system?.uses) {
      return {
        success: false,
        message: 'Farseeing does not have uses to restore'
      };
    }

    // PHASE 1: BUILD EFFECT PLAN
    const plan = await TalentEffectEngine.buildRenewVisionPlan({
      sourceActor: actor,
      farseeing: farseeing,
      renewUsageFlag: renewUsageFlag
    });

    if (!plan.success) {
      ui.notifications.warn(plan.reason);
      return { success: false, message: plan.reason };
    }

    // PHASE 2: APPLY MUTATIONS
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.warn(`Renew Vision failed: ${result.reason}`);
      return { success: false, message: `Renew Vision failed: ${result.reason}` };
    }

    // PHASE 3: SIDE-EFFECTS (Log and notifications)
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
    await createEffectOnActor(ally, {
      name: `Shared ${forceSecret.name}`,
      icon: forceSecret.img || 'icons/svg/mystery-man.svg',
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
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} shared ${forceSecret.name} with ${ally.name}`);
    ui.notifications.info(`${ally.name} can use ${forceSecret.name} this turn!`);

    return true;
  }

  /**
   * STEEL RESOLVE - Trade attack penalty for Will Defense bonus
   * When making a melee attack (Standard Action), take -1 to -5 penalty on attack
   * Gain twice that value (+2 to +10) as insight bonus to Will Defense
   * Bonus may not exceed Base Attack Bonus
   * Lasts until start of your next turn
   */
  static async triggerSteelResolve(actor) {
    if (!this.hasSteelResolve(actor)) {
      return { success: false, message: 'Actor does not have Steel Resolve talent' };
    }

    // Get actor's BAB
    const bab = actor.system.bab || 0;

    if (bab < 1) {
      return {
        success: false,
        message: 'You need at least +1 Base Attack Bonus to use Steel Resolve'
      };
    }

    // Maximum penalty is the lesser of 5 or BAB
    const maxPenalty = Math.min(5, bab);

    return {
      success: true,
      requiresSelection: true,
      maxPenalty: maxPenalty,
      bab: bab
    };
  }

  /**
   * Complete Steel Resolve - Apply the selected penalty and bonus
   */
  static async completeSteelResolveSelection(actor, penaltyAmount) {
    // Validate penalty amount
    const bab = actor.system.bab || 0;
    const maxPenalty = Math.min(5, bab);

    if (penaltyAmount < 1 || penaltyAmount > maxPenalty) {
      ui.notifications.error(`Invalid penalty amount. Must be between 1 and ${maxPenalty}`);
      return false;
    }

    // Calculate Will Defense bonus (twice the penalty, capped by BAB)
    let willBonus = penaltyAmount * 2;
    if (willBonus > bab) {
      willBonus = bab;
    }

    // Create active effect that lasts until start of next turn
    const effectData = {
      name: `Steel Resolve (-${penaltyAmount} attack, +${willBonus} Will)`,
      icon: 'icons/svg/shield.svg',
      duration: {
        rounds: 1,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn
      },
      changes: [
        {
          key: 'system.attackPenalty',
          mode: 2, // ADD
          value: -penaltyAmount,
          priority: 20
        },
        {
          key: 'system.defenses.will.bonus',
          mode: 2, // ADD
          value: willBonus,
          priority: 20
        }
      ],
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'steel-resolve',
          sourceActorId: actor.id
        }
      }
    };

    await createEffectOnActor(actor, effectData);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Steel Resolve: -${penaltyAmount} attack, +${willBonus} Will Defense`);
    ui.notifications.info(`Steel Resolve activated: -${penaltyAmount} to attack rolls, +${willBonus} to Will Defense until start of your next turn!`);

    return { success: true, penalty: penaltyAmount, bonus: willBonus };
  }

  /**
   * ADEPT NEGOTIATOR - Weaken opponent resolve with Persuasion check
   * Standard Action, move target -1 step along Condition Track
   * Target must have Intelligence 3+, see/hear/understand you
   * Target gets +5 to Will Defense if higher level
   * If reaches end of track, target cannot attack you/allies unless attacked first
   * Mind-Affecting effect
   */
  static async triggerAdeptNegotiator(actor, targetToken) {
    if (!this.hasAdeptNegotiator(actor)) {
      return { success: false, message: 'Actor does not have Adept Negotiator talent' };
    }

    // Check if target is provided
    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target opponent for Adept Negotiator'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    // Check if target has Intelligence 3 or higher
    const targetIntelligence = targetActor.system.attributes?.int?.score || 0;
    if (targetIntelligence < 3) {
      return {
        success: false,
        message: `Target must have Intelligence 3 or higher (target has ${targetIntelligence})`
      };
    }

    // Check if this is a combat encounter
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Adept Negotiator can only be used during an encounter'
      };
    }

    // Get actor's Persuasion modifier
    let persuasionModifier = actor.system.skills?.persuasion?.total || 0;

    // Check if actor has Force Persuasion talent - if so, can use Use the Force instead
    let useForceModifier = false;
    if (this.hasForcePersuasion(actor)) {
      useForceModifier = true;
      const useTheForceModifier = actor.system.skills?.useTheForce?.total || 0;
      persuasionModifier = useTheForceModifier;
    }

    // Get target's Will Defense
    let targetWillDefense = targetActor.system.defenses?.will?.total || 10;

    // Add +5 if target is higher level than actor
    const actorLevel = actor.system.details?.level || 1;
    const targetLevel = targetActor.system.details?.level || 1;
    if (targetLevel > actorLevel) {
      targetWillDefense += 5;
    }

    return {
      success: true,
      requiresSelection: true,
      targetActor: targetActor,
      targetToken: targetToken,
      persuasionModifier: persuasionModifier,
      targetWillDefense: targetWillDefense,
      useForceModifier: useForceModifier,
      actorLevel: actorLevel,
      targetLevel: targetLevel,
      combatEncounterActive: combatEncounterActive
    };
  }

  /**
   * Complete Adept Negotiator - Roll Persuasion check and apply to Condition Track
   */
  static async completeAdeptNegotiatorSelection(actor, targetActor, persuasionRoll, targetWillDefense, useForceModifier) {
    // Determine if check succeeds
    const rollResult = persuasionRoll.total;
    const checkSucceeds = rollResult >= targetWillDefense;

    // Initialize or get current Condition Track step for this target
    const conditionTrackKey = `negotiationCondition_${targetActor.id}`;
    let currentStep = targetActor.getFlag('foundryvtt-swse', conditionTrackKey) || 0;

    let stepsMovedBack = 0;
    let conditionMessage = '';

    if (checkSucceeds) {
      // Move -1 step on Condition Track
      stepsMovedBack = 1;

      // Check if actor has Master Negotiator for additional -1
      if (this.hasMasterNegotiator(actor)) {
        stepsMovedBack += 1;
      }

      currentStep += stepsMovedBack;

      // Define condition states (following game balance - typically 4 steps)
      const conditionStates = [
        { step: 0, name: 'Normal', effect: 'none' },
        { step: 1, name: 'Shaken', effect: 'shaken' },
        { step: 2, name: 'Frightened', effect: 'frightened' },
        { step: 3, name: 'Panicked', effect: 'panicked' },
        { step: 4, name: 'Broken', effect: 'broken' }
      ];

      const currentCondition = conditionStates[Math.min(currentStep, 4)];
      const nextCondition = conditionStates[Math.min(currentStep + 1, 4)];

      // PHASE 1: BUILD EFFECT PLAN
      const plan = await TalentEffectEngine.buildAdeptNegotiatorPlan({
        sourceActor: actor,
        targetActor: targetActor,
        newConditionStep: currentStep,
        conditionTrackKey: conditionTrackKey
      });

      if (!plan.success) {
        ui.notifications.warn(plan.reason);
        return false;
      }

      // PHASE 2: APPLY MUTATIONS
      const result = await ActorEngine.applyTalentEffect(plan);
      if (!result.success) {
        ui.notifications.warn(`Adept Negotiator failed: ${result.reason}`);
        return false;
      }

      // PHASE 3: SIDE-EFFECTS (Effect creation and messages)

      // Apply effects based on condition state
      if (currentStep >= 4) {
        // Reached the end - apply "cannot attack you or allies" effect
        await createEffectOnActor(targetActor, {
          name: 'Broken Resolve - Cannot Attack',
          icon: 'icons/svg/daze.svg',
          changes: [], // This is primarily a roleplay/rules effect
          duration: {
            combat: game.combat?.id
          },
          flags: {
            swse: {
              source: 'talent',
              sourceId: 'adept-negotiator',
              sourceActorId: actor.id,
              brokenResolve: true,
              condition: 'broken'
            }
          }
        });

        conditionMessage = `${targetActor.name}'s resolve is completely broken! They cannot attack ${actor.name} or their allies for the remainder of the encounter (unless attacked first).`;
      } else {
        // Apply condition effect (shaken, frightened, etc.)
        await createEffectOnActor(targetActor, {
          name: `Negotiation - ${currentCondition.name}`,
          icon: 'icons/svg/despair.svg',
          changes: [],
          duration: {
            combat: game.combat?.id
          },
          flags: {
            swse: {
              source: 'talent',
              sourceId: 'adept-negotiator',
              sourceActorId: actor.id,
              condition: currentCondition.effect,
              conditionStep: currentStep
            }
          }
        });

        const masterNote = this.hasMasterNegotiator(actor) ? ' (Master Negotiator +1 additional step)' : '';
        conditionMessage = `${targetActor.name} moves ${stepsMovedBack} step${stepsMovedBack > 1 ? 's' : ''} back on the Condition Track${masterNote}. Current condition: ${currentCondition.name}.`;
      }

      SWSELogger.log(`SWSE Talents | ${actor.name} used Adept Negotiator on ${targetActor.name}. Check: ${rollResult} vs Will Defense: ${targetWillDefense}. Success! Moved ${stepsMovedBack} step(s) on Condition Track.`);
      ui.notifications.info(conditionMessage);

      return {
        success: true,
        checkSucceeds: true,
        rollResult: rollResult,
        targetWillDefense: targetWillDefense,
        stepsMovedBack: stepsMovedBack,
        currentStep: currentStep
      };
    } else {
      // Check failed
      conditionMessage = `${actor.name}'s persuasion attempt failed! Check: ${rollResult} vs Will Defense: ${targetWillDefense}.`;

      SWSELogger.log(`SWSE Talents | ${actor.name} used Adept Negotiator on ${targetActor.name}. Check: ${rollResult} vs Will Defense: ${targetWillDefense}. Failed.`);
      ui.notifications.warn(conditionMessage);

      return {
        success: true,
        checkSucceeds: false,
        rollResult: rollResult,
        targetWillDefense: targetWillDefense,
        stepsMovedBack: 0,
        currentStep: currentStep
      };
    }
  }

  /**
   * Helper: Get Persuasion modifier, considering Force Persuasion
   */
  static getPersuasionModifier(actor, forcePersuasion = false) {
    if (forcePersuasion && this.hasForcePersuasion(actor)) {
      return actor.system.skills?.useTheForce?.total || 0;
    }
    return actor.system.skills?.persuasion?.total || 0;
  }

  /**
   * Helper: Roll Persuasion check with appropriate modifier
   */
  static async rollPersuasionCheck(actor, modifierOverride = null) {
    const modifier = modifierOverride !== null ? modifierOverride : this.getPersuasionModifier(actor);
    const roll = await RollEngine.safeRoll(`1d20+${modifier}`);
    if (!roll) {
      SWSELogger.warn('Persuasion check roll failed');
      return null;
    }
    return roll;
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
      if (!token.actor || token.actor.id === actor.id) {return false;}
      if (token.document.disposition !== actorToken.document.disposition) {return false;}

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
      if (!token.actor || token.actor.id === actor.id) {return false;}
      if (token.document.disposition !== actorToken.document.disposition) {return false;}

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
      if (!token.actor || token.actor.id === actor.id) {return false;}
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

    const dialog = new SWSEDialogV2({
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
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
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

            const powerDialog = new SWSEDialogV2({
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
                    const powerId = html2.querySelector('#power-select').value;
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

    const dialog = new SWSEDialogV2({
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
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
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
 * Hook: When a character is targeted by a [Dark Side] Force Power
 * This should be called from the Force Power system when a dark side power is used
 *
 * Usage from Force Power activation:
 *   Hooks.callAll('darkSidePowerTargeted', targetActor, powerItem, sourceActor);
 *
 * The hook will automatically check if the target has Dark Retaliation and offer the choice
 */
Hooks.on('darkSidePowerTargeted', async (targetActor, darkSidePower, sourceActor) => {
  // Check if target has Dark Retaliation
  if (!LightSideTalentMechanics.hasDarkRetaliation(targetActor)) {
    return;
  }

  // Trigger Dark Retaliation check
  const result = await LightSideTalentMechanics.triggerDarkRetaliation(targetActor, darkSidePower);

  if (!result.success) {
    // Don't show notification if it's just because they're out of resources
    if (result.message.includes('No Force Points') || result.message.includes('No Force Powers')) {
      return; // Silently fail - they don't have the resources
    }
    // Only notify for other failures
    return;
  }

  if (result.requiresSelection) {
    // Show dialog to select Force Power to use as reaction
    const powerOptions = result.powers
      .map(p => `<option value="${p.id}">${p.name}${p.system?.spent ? ' (Spent)' : ''}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Dark Retaliation - React to Dark Side Power',
      content: `
        <div class="form-group">
          <p><strong>${sourceActor.name}</strong> is targeting you with <strong>${darkSidePower.name}</strong> [Dark Side]</p>
          <p>Use Dark Retaliation to activate a Force Power as a Reaction? (Costs 1 Force Point, once per encounter)</p>
          <label>Choose a Force Power to activate:</label>
          <select id="power-select" style="width: 100%; margin-top: 5px;">
            ${powerOptions}
          </select>
        </div>
      `,
      buttons: {
        activate: {
          label: 'Activate (Spend FP)',
          callback: async (html) => {
            const powerId = (html?.[0] ?? html)?.querySelector('#power-select')?.value;
            const power = targetActor.items.get(powerId);
            await LightSideTalentMechanics.completeDarkRetaliationSelection(
              targetActor,
              powerId,
              result.combatId,
              result.retaliationUsageFlag
            );

            // Note: The actual power activation would need to be handled by clicking the power
            // or through additional automation
            ui.notifications.info(`You may now activate ${power.name} as your reaction!`);
          }
        },
        cancel: {
          label: 'Don\'t Use',
          callback: () => {
            ui.notifications.info('Dark Retaliation not used');
          }
        }
      },
      default: 'activate'
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
    if (!actor) {continue;}

    // Clear all light side talent encounter flags
    const combatId = combat.id;
    await actor.unsetFlag('foundryvtt-swse', `direct_${combatId}`);
    await actor.unsetFlag('foundryvtt-swse', `consularsWisdom_${combatId}`);
    await actor.unsetFlag('foundryvtt-swse', `darkRetaliation_${combatId}`);
    await actor.unsetFlag('foundryvtt-swse', `renewVision_${combatId}`);

    // Clear negotiation condition track flags (across all targets)
    // These are target-specific, so we clean up all actors' negotiation conditions
    const flags = actor.getFlags('swse');
    for (const [key] of Object.entries(flags || {})) {
      if (key.startsWith('negotiationCondition_')) {
        await actor.unsetFlag('foundryvtt-swse', key);
      }
    }
  }
});

export default LightSideTalentMechanics;
