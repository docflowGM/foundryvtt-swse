/**
 * Dark Side Devotee Talent Mechanics
 * Implements complex mechanics for Dark Side Devotee talents:
 * - Channel Aggression: Bonus damage to flanked opponents
 * - Channel Anger: Rage mechanic with rounds and condition track effect
 * - Crippling Strike: Speed reduction on critical hits
 * - Embrace the Dark Side: Force Power reroll with restrictions
 * - Dark Side Talisman: Protective talisman creation
 * - Greater Dark Side Talisman: Enhanced protective talisman
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { TalentEffectEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/talent-effect-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class DarkSideDevoteeMechanics {

  // ========================================================================
  // CHANNEL AGGRESSION - Bonus damage to flanked opponents
  // ========================================================================

  static hasChannelAggression(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Channel Aggression'
    );
  }

  /**
   * Apply Channel Aggression bonus damage after successful attack on flanked enemy
   * Bonus = 1d6 per class level (max 10d6)
   *
   * NEW: Uses TalentEffectEngine (compute) + ActorEngine (execute)
   * Pattern:
   * 1. Build effect plan (pure computation)
   * 2. Apply mutations through ActorEngine
   * 3. Create side-effects (chat) after success
   */
  static async triggerChannelAggression(actor, targetToken, characterLevel, spendFP = true) {
    if (!this.hasChannelAggression(actor)) {
      return { success: false, message: 'Actor does not have Channel Aggression' };
    }

    // ========================================================================
    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    // ========================================================================
    const plan = await TalentEffectEngine.buildChannelAggressionPlan({
      sourceActor: actor,
      targetActor: targetToken.actor,
      characterLevel,
      spendFP
    });

    // If plan failed, return immediately
    if (!plan.success) {
      return {
        success: false,
        message: plan.reason
      };
    }

    // ========================================================================
    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    // ========================================================================
    const result = await ActorEngine.applyTalentEffect(plan);

    if (!result.success) {
      return {
        success: false,
        message: `Channel Aggression failed: ${result.reason}`
      };
    }

    // ========================================================================
    // PHASE 3: SIDE-EFFECTS (Chat Message)
    // ========================================================================
    const chatContent = `
      <div class="swse-channel-aggression">
        <h3><img src="icons/svg/blood.svg" style="width: 20px; height: 20px;"> Channel Aggression</h3>
        <p><strong>${actor.name}</strong> channels their aggression, dealing <strong>${result.damageAmount}</strong> additional damage to the flanked <strong>${targetToken.actor.name}</strong>!</p>
        <div class="damage-roll">${result.roll.result}</div>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Channel Aggression - Bonus Damage',
      rolls: [result.roll],
      flags: { swse: { channelAggression: true } }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Channel Aggression for ${result.damageAmount} damage`);

    return {
      success: true,
      damageDice: plan.damageDice,
      damageRoll: result.roll,
      damageAmount: result.damageAmount,
      mutationCount: result.mutationCount
    };
  }

  // ========================================================================
  // CHANNEL ANGER - Rage mechanic
  // ========================================================================

  static hasChannelAnger(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Channel Anger'
    );
  }

  /**
   * Activate Channel Anger rage
   * +2 to melee attacks/damage for 5 + CON mod rounds
   * At end, move -1 on Condition Track
   *
   * NEW: Uses TalentEffectEngine (compute) + ActorEngine (execute)
   */
  static async triggerChannelAnger(actor, spendFP = true) {
    if (!this.hasChannelAnger(actor)) {
      return { success: false, message: 'Actor does not have Channel Anger' };
    }

    // ========================================================================
    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    // ========================================================================
    const plan = await TalentEffectEngine.buildChannelAngerPlan({
      sourceActor: actor,
      spendFP
    });

    // If plan failed, return immediately
    if (!plan.success) {
      return {
        success: false,
        message: plan.reason
      };
    }

    // ========================================================================
    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    // ========================================================================
    const result = await ActorEngine.applyTalentEffect(plan);

    if (!result.success) {
      return {
        success: false,
        message: `Channel Anger failed: ${result.reason}`
      };
    }

    // ========================================================================
    // PHASE 3: SIDE-EFFECTS (Chat Message)
    // ========================================================================
    const chatContent = `
      <div class="swse-channel-anger">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Channel Anger</h3>
        <p><strong>${actor.name}</strong> channels their anger into a <strong>RAGE</strong>!</p>
        <p><strong>Bonuses:</strong> +2 to melee attacks and damage rolls</p>
        <p><strong>Duration:</strong> ${plan.durationRounds} rounds (until end of round ${plan.endRound})</p>
        <p><em style="color: #ff6b6b;">⚠️ Cannot use Skills requiring patience (Mechanics, Stealth, Use the Force)</em></p>
        <p><em style="color: #ff6b6b;">⚠️ Will move -1 on Condition Track when rage ends</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Channel Anger - Rage Activated'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Channel Anger for ${plan.durationRounds} rounds`);

    return {
      success: true,
      durationRounds: plan.durationRounds,
      endRound: plan.endRound,
      rageBonus: 2,
      mutationCount: result.mutationCount
    };
  }

  /**
   * End Channel Anger rage and apply condition track penalty
   *
   * NEW: Uses TalentEffectEngine (compute) + ActorEngine (execute)
   */
  static async endChannelAnger(actor) {
    // ========================================================================
    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    // ========================================================================
    const plan = await TalentEffectEngine.buildEndChannelAngerPlan({
      sourceActor: actor
    });

    // If plan failed, return immediately
    if (!plan.success) {
      return {
        success: false,
        message: plan.reason
      };
    }

    // ========================================================================
    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    // ========================================================================
    const result = await ActorEngine.applyTalentEffect(plan);

    if (!result.success) {
      return {
        success: false,
        message: `End Channel Anger failed: ${result.reason}`
      };
    }

    // ========================================================================
    // PHASE 3: SIDE-EFFECTS (Chat Message)
    // ========================================================================
    const chatContent = `
      <div class="swse-channel-anger-end">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Rage Ends</h3>
        <p><strong>${actor.name}</strong>'s rage subsides, but the exertion takes its toll.</p>
        <p><strong>Effect:</strong> Moves -1 step along the Condition Track</p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Channel Anger - Rage Ended'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name}'s rage ended, moved to condition ${plan.newCondition}`);

    return { success: true, newConditionRank: plan.newCondition, mutationCount: result.mutationCount };
  }

  /**
   * Check if actor is currently raging and should get +2 bonus
   */
  static isCurrentlyRaging(actor) {
    const rageInfo = actor.getFlag('foundryvtt-swse', 'isChannelAngerRaging');
    if (!rageInfo) {return false;}

    // Check if rage duration has expired
    const currentRound = game.combat?.round || 0;
    return currentRound <= rageInfo.endRound;
  }

  // ========================================================================
  // CRIPPLING STRIKE - Speed reduction on critical hits
  // ========================================================================

  static hasCripplingStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Crippling Strike'
    );
  }

  /**
   * Apply Crippling Strike effect after critical hit
   * Reduce target's speed by half until fully healed
   *
   * NEW: Uses TalentEffectEngine (compute) + ActorEngine (execute)
   */
  static async triggerCripplingStrike(actor, targetToken, spendFP = true) {
    if (!this.hasCripplingStrike(actor)) {
      return { success: false, message: 'Actor does not have Crippling Strike' };
    }

    // ========================================================================
    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    // ========================================================================
    const plan = await TalentEffectEngine.buildCripplingStrikePlan({
      sourceActor: actor,
      targetActor: targetToken.actor,
      spendFP
    });

    // If plan failed, return immediately
    if (!plan.success) {
      return {
        success: false,
        message: plan.reason
      };
    }

    // ========================================================================
    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    // ========================================================================
    const result = await ActorEngine.applyTalentEffect(plan);

    if (!result.success) {
      return {
        success: false,
        message: `Crippling Strike failed: ${result.reason}`
      };
    }

    // ========================================================================
    // PHASE 3: SIDE-EFFECTS (Chat Message)
    // ========================================================================
    const chatContent = `
      <div class="swse-crippling-strike">
        <h3><img src="icons/svg/boot.svg" style="width: 20px; height: 20px;"> Crippling Strike</h3>
        <p><strong>${actor.name}</strong>'s critical hit leaves <strong>${targetToken.actor.name}</strong> crippled!</p>
        <p><strong>Speed Reduced:</strong> ${plan.originalSpeed} squares → ${plan.crippledSpeed} squares</p>
        <p><em>Effect lasts until target is fully healed (restored to maximum HP)</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Crippling Strike - Speed Reduced'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} crippled ${targetToken.actor.name} (speed ${plan.originalSpeed} → ${plan.crippledSpeed})`);

    return {
      success: true,
      originalSpeed: plan.originalSpeed,
      crippledSpeed: plan.crippledSpeed,
      mutationCount: result.mutationCount
    };
  }

  /**
   * Check if target is crippled and maintain effect while damaged
   */
  static checkCripplingStrikeExpiry(targetActor) {
    const crippledInfo = targetActor.getFlag('foundryvtt-swse', 'isCrippled');
    if (!crippledInfo) {return false;}

    // Check if fully healed
    if (targetActor.system.hp.value >= crippledInfo.maxHpWhenCrippled) {
      // Crippling effect has expired
      return false;
    }

    return true;
  }

  /**
   * Remove Crippling Strike effect when target heals
   */
  static async removeCripplingStrike(targetActor) {
    const crippledInfo = targetActor.getFlag('foundryvtt-swse', 'isCrippled');
    if (!crippledInfo) {return;}

    // Restore original speed
    await ActorEngine.updateActor(targetActor, {
      'system.speed.current': crippledInfo.originalSpeed
    });

    // Remove flag
    await targetActor.unsetFlag('foundryvtt-swse', 'isCrippled');

    const chatContent = `
      <div class="swse-crippling-strike-end">
        <h3><img src="icons/svg/boot.svg" style="width: 20px; height: 20px;"> Crippling Effect Removed</h3>
        <p><strong>${targetActor.name}</strong> has recovered from the crippling wound.</p>
        <p><strong>Speed Restored:</strong> ${crippledInfo.crippledSpeed} squares → ${crippledInfo.originalSpeed} squares</p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: targetActor },
      content: chatContent,
      flavor: 'Crippling Strike - Effect Ended'
    });

    SWSELogger.log(`SWSE Talents | Removed crippling effect from ${targetActor.name}`);
  }

  // ========================================================================
  // EMBRACE THE DARK SIDE - Reroll Force Power check with restrictions
  // ========================================================================

  static hasEmbraceDarkSide(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Embrace the Dark Side'
    );
  }

  /**
   * Check if actor can use Light Side powers
   * Embrace the Dark Side restricts this
   */
  static canUseLightSidePowers(actor) {
    return !this.hasEmbraceDarkSide(actor);
  }

  /**
   * Allow reroll of Use the Force check for Dark Side power
   * Returns info about the reroll
   */
  static async allowDarkSidePowerReroll(actor, originalRoll) {
    if (!this.hasEmbraceDarkSide(actor)) {
      return {
        success: false,
        message: 'Actor does not have Embrace the Dark Side'
      };
    }

    return {
      success: true,
      originalRoll: originalRoll,
      canReroll: true,
      mustAccept: true,
      message: 'You may reroll your Use the Force check. You must accept the result of the reroll, even if it is worse.'
    };
  }

  // ========================================================================
  // DARK SIDE TALISMAN - Protective talisman creation
  // ========================================================================

  static hasDarkSideTalisman(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Talisman'
    );
  }

  static hasGreaterDarkSideTalisman(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Greater Dark Side Talisman'
    );
  }

  /**
   * Create a Dark Side Talisman (Full-Round Action, costs FP)
   * +2 Force bonus to one selected Defense against Light Side Force Powers
   */
  static async createDarkSideTalisman(actor, selectedDefense, spendFP = true) {
    if (!this.hasDarkSideTalisman(actor) && !this.hasGreaterDarkSideTalisman(actor)) {
      return {
        success: false,
        message: 'Actor does not have Dark Side Talisman or Greater Dark Side Talisman'
      };
    }

    // Check if already has active talisman
    const activeTalisman = actor.getFlag('foundryvtt-swse', 'activeDarkSideTalisman');
    if (activeTalisman) {
      return {
        success: false,
        message: `Already carrying an active Dark Side Talisman. Only one can be active at a time.`
      };
    }

    if (spendFP) {
      // Check Force Points
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Creating a talisman requires 1 Force Point.'
        };
      }

      // Spend Force Point
      await ActorEngine.updateActor(actor, {
        'system.forcePoints.value': currentFP - 1
      });
    }

    const isGreater = this.hasGreaterDarkSideTalisman(actor);
    const defenseText = isGreater ? 'all Defenses' : selectedDefense || 'one Defense';
    const defenseBonus = isGreater ? 'all' : selectedDefense;

    // Store talisman info
    const talismantInfo = {
      isGreater: isGreater,
      defense: defenseBonus,
      createdAt: new Date().toISOString(),
      createdRound: game.combat?.round || 0
    };

    await actor.setFlag('foundryvtt-swse', 'activeDarkSideTalisman', talismantInfo);

    const chatContent = `
      <div class="swse-dark-side-talisman">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> ${isGreater ? 'Greater Dark Side' : 'Dark Side'} Talisman Created</h3>
        <p><strong>${actor.name}</strong> imbues an object with the Dark Side, creating a protective talisman.</p>
        <p><strong>Defense Boost:</strong> +2 Force bonus to ${defenseText} against Light Side Force Powers</p>
        <p><em>The talisman remains active until destroyed. If destroyed, you cannot create another one for 24 hours.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: `${isGreater ? 'Greater ' : ''}Dark Side Talisman Created`
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} created a ${isGreater ? 'Greater ' : ''}Dark Side Talisman`);

    return {
      success: true,
      isGreater: isGreater,
      defense: defenseBonus,
      actionTime: 'Full-Round Action'
    };
  }

  /**
   * Destroy a Dark Side Talisman and set 24-hour cooldown
   */
  static async destroyDarkSideTalisman(actor) {
    const talisman = actor.getFlag('foundryvtt-swse', 'activeDarkSideTalisman');
    if (!talisman) {
      return { success: false, message: 'Actor does not have an active Dark Side Talisman' };
    }

    // Remove active talisman
    await actor.unsetFlag('foundryvtt-swse', 'activeDarkSideTalisman');

    // Set 24-hour cooldown
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + 24);

    await actor.setFlag('foundryvtt-swse', 'darkSideTalismanCooldown', cooldownUntil.toISOString());

    const chatContent = `
      <div class="swse-dark-side-talisman-destroyed">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> Talisman Destroyed</h3>
        <p><strong>${actor.name}</strong>'s Dark Side Talisman has been destroyed!</p>
        <p><em>Cannot create a new talisman for 24 hours.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Dark Side Talisman - Destroyed'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name}'s Dark Side Talisman was destroyed`);

    return { success: true, cooldownHours: 24 };
  }

  /**
   * Check if can create a new talisman (cooldown expired)
   */
  static canCreateNewTalisman(actor) {
    const cooldown = actor.getFlag('foundryvtt-swse', 'darkSideTalismanCooldown');
    if (!cooldown) {return true;}

    const cooldownTime = new Date(cooldown);
    const now = new Date();

    return now >= cooldownTime;
  }

  /**
   * Check if has active talisman and which defense it protects
   */
  static getActiveTalisman(actor) {
    return actor.getFlag('foundryvtt-swse', 'activeDarkSideTalisman');
  }
}

// ============================================================================
// HOOKS - Auto-trigger mechanics
// ============================================================================

/**
 * Hook: Check and end Channel Anger at end of turn
 */
Hooks.on('combatRoundChange', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    const rageInfo = actor.getFlag('foundryvtt-swse', 'isChannelAngerRaging');

    if (rageInfo && combat.round >= rageInfo.endRound) {
      await DarkSideDevoteeMechanics.endChannelAnger(actor);
    }
  }
});

/**
 * Hook: Check and remove Crippling Strike when actor heals
 */
Hooks.on('preUpdateActor', async (actor, update, options, userId) => {
  if (update.system?.hp?.value !== undefined) {
    const crippledInfo = actor.getFlag('foundryvtt-swse', 'isCrippled');
    if (crippledInfo && update.system.hp.value >= crippledInfo.maxHpWhenCrippled) {
      await DarkSideDevoteeMechanics.removeCripplingStrike(actor);
    }
  }
});

export default DarkSideDevoteeMechanics;
