/**
 * DARK SIDE POWERS - Comprehensive Dark Side Talent System
 *
 * Houses all mechanics and macros for:
 * - Dark Side Talents (Swift Power, Dark Side Savant, Wrath of the Dark Side)
 * - Dark Side Devotee Tree (Channel Aggression, Channel Anger, Crippling Strike, etc.)
 *
 * This consolidated module provides a unified API for all Dark Side talent functionality.
 */

import { SWSELogger } from '../utils/logger.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';
import { createChatMessage, createEffectOnActor, createItemInActor } from '../core/document-api-v13.js';

export class DarkSidePowers {

  // ========================================================================
  // DARK SIDE TALENT TREE - Swift Power, Savant, Wrath
  // ========================================================================

  /**
   * SWIFT POWER - Use Force Power as Swift Action
   * Once per day, use a Force Power that normally takes Standard/Move Action as Swift Action
   */
  static hasSwiftPower(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Swift Power'
    );
  }

  static async triggerSwiftPower(actor, forcePower) {
    if (!this.hasSwiftPower(actor)) {
      return false;
    }

    // Check if already used today
    const lastUsed = actor.getFlag('swse', 'swiftPowerUsedToday');
    const today = new Date().toDateString();

    if (lastUsed === today) {
      ui.notifications.warn('Swift Power has already been used today. It refreshes at the next dawn.');
      return false;
    }

    // Record usage
    await actor.setFlag('swse', 'swiftPowerUsedToday', today);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Swift Power on ${forcePower.name}`);
    ui.notifications.info(`${forcePower.name} is being used as a Swift Action!`);

    return true;
  }

  // ========================================================================
  // DARK SIDE SAVANT - Return Dark Side power without FP cost
  // ========================================================================

  static hasDarkSideSavant(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Savant'
    );
  }

  static async triggerDarkSideSavant(actor) {
    if (!this.hasDarkSideSavant(actor)) {
      return { success: false, message: 'Actor does not have Dark Side Savant talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Dark Side Savant can only be used during an encounter (combat active)'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const savantUsageFlag = `darkSideSavant_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', savantUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Dark Side Savant has already been used this encounter. It resets at the start of the next encounter.'
      };
    }

    // Get all Dark Side Force Powers that are spent
    const darkSidePowers = actor.items.filter(item =>
      item.type === 'forcepower' &&
      item.system?.spent === true &&
      (item.system?.discipline === 'dark-side' || item.name.toLowerCase().includes('dark'))
    );

    if (darkSidePowers.length === 0) {
      return {
        success: false,
        message: 'No spent Dark Side Force Powers available to return'
      };
    }

    // If single power, return it directly
    if (darkSidePowers.length === 1) {
      const power = darkSidePowers[0];
      await ActorEngine.updateOwnedItems(actor, [{
        _id: power.id,
        'system.spent': false
      }]);

      await actor.setFlag('swse', savantUsageFlag, true);

      SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Side Savant to return ${power.name}`);
      ui.notifications.info(`${power.name} has been returned to your Force Power Suite without spending a Force Point!`);

      return { success: true, power: power.name };
    }

    // Multiple powers - return selection data
    return {
      success: true,
      requiresSelection: true,
      powers: darkSidePowers,
      combatId: combatId,
      savantUsageFlag: savantUsageFlag
    };
  }

  static async completeDarkSideSavantSelection(actor, powerIdToReturn, combatId, savantUsageFlag) {
    const power = actor.items.get(powerIdToReturn);
    if (!power) {
      ui.notifications.error('Power not found');
      return false;
    }

    await ActorEngine.updateOwnedItems(actor, [{
      _id: power.id,
      'system.spent': false
    }]);

    await actor.setFlag('swse', savantUsageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Side Savant to return ${power.name}`);
    ui.notifications.info(`${power.name} has been returned to your Force Power Suite!`);

    return true;
  }

  // ========================================================================
  // WRATH OF THE DARK SIDE - Half damage repeat on Natural 20
  // ========================================================================

  static hasWrathOfDarkSide(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Wrath of the Dark Side'
    );
  }

  static WRATH_APPLICABLE_POWERS = [
    'Corruption',
    'Force Blast',
    'Force Grip',
    'Force Lightning',
    'Force Slam',
    'Force Thrust',
    'Repulse'
  ];

  static canUseWrath(forcePowerName) {
    return this.WRATH_APPLICABLE_POWERS.includes(forcePowerName);
  }

  static async triggerWrathOfDarkSide(actor, roll, forcePower, targetToken, damageDealt) {
    if (!this.hasWrathOfDarkSide(actor)) {
      return { success: false, message: 'Actor does not have Wrath of the Dark Side' };
    }

    if (!this.canUseWrath(forcePower.name)) {
      return {
        success: false,
        message: `Wrath of the Dark Side only applies to: ${this.WRATH_APPLICABLE_POWERS.join(', ')}`
      };
    }

    // Check for Natural 20 on the roll
    if (roll.terms?.[0]?.results?.[0]?.result !== 20) {
      return {
        success: false,
        message: 'Wrath of the Dark Side only triggers on a Natural 20'
      };
    }

    const halfDamage = Math.floor(damageDealt / 2);
    const wrathFlagId = `wrath_${Date.now()}_${targetToken.id}`;

    // Store the delayed damage on the target
    const targetActor = targetToken.actor;
    const wrathFlags = targetActor.getFlag('swse', 'wrathDamage') || [];
    wrathFlags.push({
      id: wrathFlagId,
      damage: halfDamage,
      sourceName: actor.name,
      sourceId: actor.id,
      triggerRound: game.combat?.round,
      triggeredAt: new Date().toISOString()
    });

    await targetActor.setFlag('swse', 'wrathDamage', wrathFlags);

    SWSELogger.log(`SWSE Talents | ${actor.name} triggered Wrath of the Dark Side on ${targetActor.name}. Will deal ${halfDamage} damage at start of next turn.`);
    ui.notifications.info(`${targetActor.name} will take ${halfDamage} additional damage at the start of their next turn from Wrath of the Dark Side!`);

    return {
      success: true,
      halfDamage: halfDamage,
      targetId: targetActor.id
    };
  }

  static async applyWrathDamageAtTurnStart(token) {
    const actor = token.actor;
    const wrathFlags = actor.getFlag('swse', 'wrathDamage') || [];

    if (wrathFlags.length === 0) {
      return;
    }

    // Filter to damages from this turn or earlier
    const applicableDamages = wrathFlags.filter(flag => {
      return flag.triggerRound < game.combat?.round ||
             (flag.triggerRound === game.combat?.round && game.combat?.turn > 0);
    });

    for (const dmg of applicableDamages) {
      const newHp = Math.max(0, actor.system.hp?.value - dmg.damage);
      await actor.update({ 'system.hp.value': newHp });

      const messageContent = `
        <div class="swse-wrath-damage">
          <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Wrath of the Dark Side</h3>
          <p><strong>${actor.name}</strong> takes <strong>${dmg.damage}</strong> damage from ${dmg.sourceName}'s Wrath!</p>
        </div>
      `;

      await createChatMessage({
        speaker: { actor: actor },
        content: messageContent,
        flavor: 'Wrath of the Dark Side - Delayed Damage',
        flags: { swse: { wrathDamage: true } }
      });

      SWSELogger.log(`SWSE Talents | Applied ${dmg.damage} Wrath damage to ${actor.name} from ${dmg.sourceName}`);
    }

    const remainingDamages = wrathFlags.filter(flag =>
      !(flag.triggerRound < game.combat?.round ||
        (flag.triggerRound === game.combat?.round && game.combat?.turn > 0))
    );

    if (remainingDamages.length === 0) {
      await actor.unsetFlag('swse', 'wrathDamage');
    } else {
      await actor.setFlag('swse', 'wrathDamage', remainingDamages);
    }
  }

  static async clearWrathFlagsOnCombatEnd() {
    for (const combatant of game.combat?.combatants || []) {
      const actor = combatant.actor;
      if (actor?.getFlag('swse', 'wrathDamage')) {
        await actor.unsetFlag('swse', 'wrathDamage');
      }
    }
  }

  // ========================================================================
  // DARK SIDE DEVOTEE - Channel Aggression, Anger, Crippling, etc.
  // ========================================================================

  static hasChannelAggression(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Channel Aggression'
    );
  }

  static async triggerChannelAggression(actor, targetToken, characterLevel, spendFP = true) {
    if (!this.hasChannelAggression(actor)) {
      return { success: false, message: 'Actor does not have Channel Aggression' };
    }

    const damageDice = Math.min(characterLevel, 10);

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Channel Aggression requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    const roll = new Roll(`${damageDice}d6`);
    await roll.evaluate({ async: true });
    const damageAmount = roll.total;

    const newHp = Math.max(0, targetToken.actor.system.hp.value - damageAmount);
    await targetToken.actor.update({ 'system.hp.value': newHp });

    const chatContent = `
      <div class="swse-channel-aggression">
        <h3><img src="icons/svg/blood.svg" style="width: 20px; height: 20px;"> Channel Aggression</h3>
        <p><strong>${actor.name}</strong> channels their aggression, dealing <strong>${damageAmount}</strong> additional damage to the flanked <strong>${targetToken.actor.name}</strong>!</p>
        <div class="damage-roll">${roll.result}</div>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Channel Aggression - Bonus Damage',
      rolls: [roll],
      flags: { swse: { channelAggression: true } }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Channel Aggression for ${damageAmount} damage`);

    return {
      success: true,
      damageDice: damageDice,
      damageRoll: roll,
      damageAmount: damageAmount
    };
  }

  static hasChannelAnger(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Channel Anger'
    );
  }

  static async triggerChannelAnger(actor, spendFP = true) {
    if (!this.hasChannelAnger(actor)) {
      return { success: false, message: 'Actor does not have Channel Anger' };
    }

    const isRaging = actor.getFlag('swse', 'isChannelAngerRaging');
    if (isRaging) {
      return {
        success: false,
        message: `${actor.name} is already Channeling Anger. Rage ends at the beginning of round ${isRaging.endRound}.`
      };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Channel Anger requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    const conModifier = actor.system.attributes.con?.mod || 0;
    const durationRounds = 5 + conModifier;
    const currentRound = game.combat?.round || 0;
    const endRound = currentRound + durationRounds;

    const rageInfo = {
      startRound: currentRound,
      endRound: endRound,
      durationRounds: durationRounds,
      conModifier: conModifier
    };

    await actor.setFlag('swse', 'isChannelAngerRaging', rageInfo);

    const chatContent = `
      <div class="swse-channel-anger">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Channel Anger</h3>
        <p><strong>${actor.name}</strong> channels their anger into a <strong>RAGE</strong>!</p>
        <p><strong>Bonuses:</strong> +2 to melee attacks and damage rolls</p>
        <p><strong>Duration:</strong> ${durationRounds} rounds (until end of round ${endRound})</p>
        <p><em style="color: #ff6b6b;">⚠️ Cannot use Skills requiring patience (Mechanics, Stealth, Use the Force)</em></p>
        <p><em style="color: #ff6b6b;">⚠️ Will move -1 on Condition Track when rage ends</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Channel Anger - Rage Activated'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Channel Anger for ${durationRounds} rounds`);

    return {
      success: true,
      durationRounds: durationRounds,
      endRound: endRound,
      rageBonus: 2
    };
  }

  static async endChannelAnger(actor) {
    const rageInfo = actor.getFlag('swse', 'isChannelAngerRaging');
    if (!rageInfo) {
      return { success: false, message: 'Actor is not currently raging' };
    }

    await actor.unsetFlag('swse', 'isChannelAngerRaging');

    const currentCondition = actor.system.conditionTrack?.value || 0;
    const newCondition = Math.max(0, currentCondition - 1);

    await actor.update({
      'system.conditionTrack.value': newCondition
    });

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

    SWSELogger.log(`SWSE Talents | ${actor.name}'s rage ended, moved to condition ${newCondition}`);

    return { success: true, newConditionRank: newCondition };
  }

  static isCurrentlyRaging(actor) {
    const rageInfo = actor.getFlag('swse', 'isChannelAngerRaging');
    if (!rageInfo) {return false;}

    const currentRound = game.combat?.round || 0;
    return currentRound <= rageInfo.endRound;
  }

  static hasCripplingStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Crippling Strike'
    );
  }

  static async triggerCripplingStrike(actor, targetToken, spendFP = true) {
    if (!this.hasCripplingStrike(actor)) {
      return { success: false, message: 'Actor does not have Crippling Strike' };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Crippling Strike requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    const targetActor = targetToken.actor;
    const originalSpeed = targetActor.system.speed?.base || 6;
    const crippledSpeed = Math.ceil(originalSpeed / 2);

    await targetActor.setFlag('swse', 'isCrippled', {
      sourceActor: actor.id,
      sourceName: actor.name,
      originalSpeed: originalSpeed,
      crippledSpeed: crippledSpeed,
      maxHpWhenCrippled: targetActor.system.hp.max
    });

    await targetActor.update({
      'system.speed.current': crippledSpeed
    });

    const chatContent = `
      <div class="swse-crippling-strike">
        <h3><img src="icons/svg/boot.svg" style="width: 20px; height: 20px;"> Crippling Strike</h3>
        <p><strong>${actor.name}</strong>'s critical hit leaves <strong>${targetActor.name}</strong> crippled!</p>
        <p><strong>Speed Reduced:</strong> ${originalSpeed} squares → ${crippledSpeed} squares</p>
        <p><em>Effect lasts until target is fully healed (restored to maximum HP)</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Crippling Strike - Speed Reduced'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} crippled ${targetActor.name} (speed ${originalSpeed} → ${crippledSpeed})`);

    return {
      success: true,
      originalSpeed: originalSpeed,
      crippledSpeed: crippledSpeed
    };
  }

  static checkCripplingStrikeExpiry(targetActor) {
    const crippledInfo = targetActor.getFlag('swse', 'isCrippled');
    if (!crippledInfo) {return false;}

    if (targetActor.system.hp.value >= crippledInfo.maxHpWhenCrippled) {
      return false;
    }

    return true;
  }

  static async removeCripplingStrike(targetActor) {
    const crippledInfo = targetActor.getFlag('swse', 'isCrippled');
    if (!crippledInfo) {return;}

    await targetActor.update({
      'system.speed.current': crippledInfo.originalSpeed
    });

    await targetActor.unsetFlag('swse', 'isCrippled');

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

  static hasEmbraceDarkSide(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Embrace the Dark Side'
    );
  }

  static canUseLightSidePowers(actor) {
    return !this.hasEmbraceDarkSide(actor);
  }

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

  static async createDarkSideTalisman(actor, selectedDefense, spendFP = true) {
    if (!this.hasDarkSideTalisman(actor) && !this.hasGreaterDarkSideTalisman(actor)) {
      return {
        success: false,
        message: 'Actor does not have Dark Side Talisman or Greater Dark Side Talisman'
      };
    }

    const activeTalisman = actor.getFlag('swse', 'activeDarkSideTalisman');
    if (activeTalisman) {
      return {
        success: false,
        message: `Already carrying an active Dark Side Talisman. Only one can be active at a time.`
      };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Creating a talisman requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    const isGreater = this.hasGreaterDarkSideTalisman(actor);
    const defenseText = isGreater ? 'all Defenses' : selectedDefense || 'one Defense';
    const defenseBonus = isGreater ? 'all' : selectedDefense;

    // Create the talisman item
    const talismanName = `${isGreater ? 'Greater ' : ''}Dark Side Talisman`;
    const itemData = {
      name: talismanName,
      type: 'equipment',
      system: {
        description: `A mystical talisman imbued with Dark Side energy. Grants +2 Force bonus to ${defenseText} against Light Side Force Powers.`,
        equipped: true,
        quantity: 1,
        rarity: isGreater ? 'legendary' : 'rare'
      }
    };

    // Create the item in the actor's inventory
    const createdItems = await createItemInActor(actor, itemData);
    if (!createdItems || !Array.isArray(createdItems) || createdItems.length === 0) {
      ui.notifications.error('Failed to create Dark Side Talisman item');
      return { success: false, message: 'Failed to create talisman item' };
    }
    const itemId = createdItems[0].id;

    const talismantInfo = {
      itemId: itemId,
      isGreater: isGreater,
      defense: defenseBonus,
      createdAt: new Date().toISOString(),
      createdRound: game.combat?.round || 0
    };

    await actor.setFlag('swse', 'activeDarkSideTalisman', talismantInfo);

    const chatContent = `
      <div class="swse-dark-side-talisman">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> ${talismanName} Created</h3>
        <p><strong>${actor.name}</strong> imbues an object with the Dark Side, creating a protective talisman.</p>
        <p><strong>Defense Boost:</strong> +2 Force bonus to ${defenseText} against Light Side Force Powers</p>
        <p><em>The talisman remains active until destroyed. If destroyed, you cannot create another one for 24 hours.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: `${talismanName} Created`
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} created a ${talismanName}`);

    return {
      success: true,
      itemId: itemId,
      isGreater: isGreater,
      defense: defenseBonus,
      actionTime: 'Full-Round Action'
    };
  }

  static async destroyDarkSideTalisman(actor) {
    const talisman = actor.getFlag('swse', 'activeDarkSideTalisman');
    if (!talisman) {
      return { success: false, message: 'Actor does not have an active Dark Side Talisman' };
    }

    // Delete the actual item from inventory if it exists
    if (talisman.itemId) {
      const item = actor.items.get(talisman.itemId);
      if (item) {
        await actor.deleteEmbeddedDocuments('Item', [talisman.itemId]);
      }
    }

    await actor.unsetFlag('swse', 'activeDarkSideTalisman');

    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + 24);

    await actor.setFlag('swse', 'darkSideTalismanCooldown', cooldownUntil.toISOString());

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

  static canCreateNewTalisman(actor) {
    const cooldown = actor.getFlag('swse', 'darkSideTalismanCooldown');
    if (!cooldown) {return true;}

    const cooldownTime = new Date(cooldown);
    const now = new Date();

    return now >= cooldownTime;
  }

  static getActiveTalisman(actor) {
    return actor.getFlag('swse', 'activeDarkSideTalisman');
  }

  // ========================================================================
  // SITH TALENT TREE - Dark Healing, Wicked Strike, Sith Alchemy, etc.
  // ========================================================================

  /**
   * Helper: Calculate combined Sith Apprentice + Sith Lord class levels
   * Sith talents scale off combined Sith class levels
   */
  static getSithClassLevel(actor) {
    const sithClasses = actor.items.filter(item =>
      item.type === 'class' &&
      (item.name === 'Sith Apprentice' || item.name === 'Sith Lord')
    );

    const totalSithLevel = sithClasses.reduce((sum, classItem) =>
      sum + (classItem.system.level || 0), 0
    );

    return Math.max(totalSithLevel, 1); // Minimum 1
  }

  /**
   * DARK HEALING - Ranged attack to damage enemy and heal self
   * Range 6, Standard Action, costs 1 FP
   * Must succeed on ranged attack vs Fortitude Defense
   * Damage: 1d6 per Sith class level (Sith Apprentice + Sith Lord)
   */
  static hasDarkHealing(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Healing'
    );
  }

  static async triggerDarkHealing(actor, targetToken, spendFP = true) {
    if (!this.hasDarkHealing(actor)) {
      return { success: false, message: 'Actor does not have Dark Healing' };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Dark Healing requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    // Get Sith class level (Sith Apprentice + Sith Lord)
    const sithLevel = this.getSithClassLevel(actor);

    // Roll ranged attack vs target Fortitude Defense
    const attackRoll = new Roll('1d20');
    await attackRoll.evaluate({ async: true });
    const attackTotal = attackRoll.total + (actor.system.attributes?.dex?.mod || 0);
    const targetFortitude = targetToken.actor.system.defenses?.fortitude?.value || 10;

    let damageAmount = 0;
    let success = false;

    if (attackTotal >= targetFortitude) {
      // Success: deal damage and heal
      const damageRoll = new Roll(`${sithLevel}d6`);
      await damageRoll.evaluate({ async: true });
      damageAmount = damageRoll.total;
      success = true;

      // Apply damage to target
      const newHp = Math.max(0, targetToken.actor.system.hp.value - damageAmount);
      await targetToken.actor.update({ 'system.hp.value': newHp });

      // Heal actor
      const newActorHp = Math.min(actor.system.hp.max, actor.system.hp.value + damageAmount);
      await actor.update({ 'system.hp.value': newActorHp });

      const chatContent = `
        <div class="swse-dark-healing">
          <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Dark Healing</h3>
          <p><strong>${actor.name}</strong> drains life force from <strong>${targetToken.actor.name}</strong>!</p>
          <p>Attack Roll: ${attackTotal} vs Fortitude ${targetFortitude} - <strong>SUCCESS</strong></p>
          <p><strong>${damageAmount}</strong> damage dealt | <strong>${damageAmount}</strong> HP healed</p>
        </div>
      `;

      await createChatMessage({
        speaker: { actor: actor },
        content: chatContent,
        flavor: 'Dark Healing - Life Drained',
        rolls: [attackRoll, damageRoll],
        flags: { swse: { darkHealing: true } }
      });

      SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Healing for ${damageAmount} damage/healing`);
    } else {
      // Failure: no effect
      const chatContent = `
        <div class="swse-dark-healing-fail">
          <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Dark Healing</h3>
          <p><strong>${actor.name}</strong> attempted to drain life force from <strong>${targetToken.actor.name}</strong>!</p>
          <p>Attack Roll: ${attackTotal} vs Fortitude ${targetFortitude} - <strong>MISS</strong></p>
          <p><em>No effect.</em></p>
        </div>
      `;

      await createChatMessage({
        speaker: { actor: actor },
        content: chatContent,
        flavor: 'Dark Healing - Resisted',
        rolls: [attackRoll],
        flags: { swse: { darkHealing: true } }
      });

      SWSELogger.log(`SWSE Talents | ${actor.name}'s Dark Healing attack missed`);
    }

    return {
      success: success,
      damageAmount: damageAmount,
      attackRoll: attackRoll
    };
  }

  /**
   * IMPROVED DARK HEALING - Enhanced Dark Healing
   * Range 12 (vs 6), half damage even on miss, heal equal amount
   * Damage: 1d6 per Sith class level (Sith Apprentice + Sith Lord)
   */
  static hasImprovedDarkHealing(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Improved Dark Healing'
    );
  }

  static async triggerImprovedDarkHealing(actor, targetToken, spendFP = true) {
    if (!this.hasImprovedDarkHealing(actor)) {
      return { success: false, message: 'Actor does not have Improved Dark Healing' };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Improved Dark Healing requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    // Get Sith class level (Sith Apprentice + Sith Lord)
    const sithLevel = this.getSithClassLevel(actor);

    // Roll ranged attack vs target Fortitude Defense
    const attackRoll = new Roll('1d20');
    await attackRoll.evaluate({ async: true });
    const attackTotal = attackRoll.total + (actor.system.attributes?.dex?.mod || 0);
    const targetFortitude = targetToken.actor.system.defenses?.fortitude?.value || 10;

    const damageRoll = new Roll(`${sithLevel}d6`);
    await damageRoll.evaluate({ async: true });
    const fullDamage = damageRoll.total;

    let damageDealt = fullDamage;
    let healAmount = fullDamage;

    if (attackTotal < targetFortitude) {
      // On miss: half damage
      damageDealt = Math.floor(fullDamage / 2);
      healAmount = Math.floor(fullDamage / 2);
    }

    // Apply damage to target
    const newTargetHp = Math.max(0, targetToken.actor.system.hp.value - damageDealt);
    await targetToken.actor.update({ 'system.hp.value': newTargetHp });

    // Heal actor
    const newActorHp = Math.min(actor.system.hp.max, actor.system.hp.value + healAmount);
    await actor.update({ 'system.hp.value': newActorHp });

    const chatContent = `
      <div class="swse-improved-dark-healing">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Improved Dark Healing</h3>
        <p><strong>${actor.name}</strong> drains life force from <strong>${targetToken.actor.name}</strong>!</p>
        <p>Attack Roll: ${attackTotal} vs Fortitude ${targetFortitude} - ${attackTotal >= targetFortitude ? '<strong>SUCCESS</strong>' : '<strong>MISS (half damage)</strong>'}</p>
        <p><strong>${damageDealt}</strong> damage dealt | <strong>${healAmount}</strong> HP healed</p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Improved Dark Healing - Life Drained',
      rolls: [attackRoll, damageRoll],
      flags: { swse: { improvedDarkHealing: true } }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Improved Dark Healing for ${damageDealt} damage/${healAmount} healing`);

    return {
      success: true,
      damageDealt: damageDealt,
      healAmount: healAmount,
      attackRoll: attackRoll,
      damageRoll: damageRoll
    };
  }

  /**
   * DARK HEALING FIELD - Multi-target life-force draining
   * Prerequisite: Dark Healing, Improved Dark Healing
   * Range 12, Standard Action, costs 1 FP
   * Targets up to 3 creatures, each makes Use the Force check vs Fortitude
   * Damage: 1d6 per Sith class level per target (Sith Apprentice + Sith Lord)
   * Healing: Half the total damage dealt from all targets (cumulative)
   * On miss: Target takes half damage, you heal that amount
   */
  static hasDarkHealingField(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Healing Field'
    );
  }

  static async triggerDarkHealingField(actor, targetTokens, spendFP = true) {
    // Validate actor has the talent
    if (!this.hasDarkHealingField(actor)) {
      return { success: false, message: 'Actor does not have Dark Healing Field' };
    }

    // Validate prerequisites
    if (!this.hasDarkHealing(actor) || !this.hasImprovedDarkHealing(actor)) {
      return {
        success: false,
        message: 'Dark Healing Field requires Dark Healing and Improved Dark Healing'
      };
    }

    // Validate Force Points
    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Dark Healing Field requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    // Validate targets (up to 3)
    if (!targetTokens || targetTokens.length === 0) {
      return { success: false, message: 'Please select up to 3 target tokens' };
    }

    if (targetTokens.length > 3) {
      return {
        success: false,
        message: 'Dark Healing Field can only target up to 3 creatures'
      };
    }

    // Get Sith class level
    const sithLevel = this.getSithClassLevel(actor);

    // Process each target
    let totalDamageDealt = 0;
    const targetResults = [];

    for (const targetToken of targetTokens) {
      const targetActor = targetToken.actor;

      // Roll Use the Force check vs target's Fortitude Defense
      const useForceRoll = new Roll('1d20');
      await useForceRoll.evaluate({ async: true });
      const useForceTotal = useForceRoll.total + (actor.system.skills?.useTheForce?.mod || 0);
      const targetFortitude = targetActor.system.defenses?.fortitude?.value || 10;

      // Roll damage for this target
      const damageRoll = new Roll(`${sithLevel}d6`);
      await damageRoll.evaluate({ async: true });
      const fullDamage = damageRoll.total;

      let damageDealt = fullDamage;

      if (useForceTotal < targetFortitude) {
        // On miss: half damage
        damageDealt = Math.floor(fullDamage / 2);
      }

      // Apply damage to target
      const newTargetHp = Math.max(0, targetActor.system.hp.value - damageDealt);
      await targetActor.update({ 'system.hp.value': newTargetHp });

      totalDamageDealt += damageDealt;

      targetResults.push({
        targetName: targetActor.name,
        check: useForceTotal,
        defense: targetFortitude,
        success: useForceTotal >= targetFortitude,
        damageDealt: damageDealt,
        roll: useForceRoll,
        damageRoll: damageRoll
      });
    }

    // Calculate healing as half the total damage from all targets
    const healAmount = Math.floor(totalDamageDealt / 2);
    const newActorHp = Math.min(actor.system.hp.max, actor.system.hp.value + healAmount);
    await actor.update({ 'system.hp.value': newActorHp });

    // Create chat message
    const targetSummary = targetResults
      .map(
        t =>
          `<li><strong>${t.targetName}</strong>: Check ${t.check} vs Fortitude ${t.defense} - ${t.success ? '<strong>HIT</strong>' : '<strong>MISS (half damage)</strong>'} - ${t.damageDealt} damage</li>`
      )
      .join('');

    const chatContent = `
      <div class="swse-dark-healing-field">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Dark Healing Field</h3>
        <p><strong>${actor.name}</strong> drains life energy from multiple targets!</p>
        <ul>
          ${targetSummary}
        </ul>
        <p><strong>Total Damage Dealt:</strong> ${totalDamageDealt}</p>
        <p><strong>HP Healed (50% of total):</strong> ${healAmount}</p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Dark Healing Field - Mass Life Drain',
      rolls: targetResults.map(t => t.roll).concat(targetResults.map(t => t.damageRoll)),
      flags: { swse: { darkHealingField: true } }
    });

    SWSELogger.log(
      `SWSE Talents | ${actor.name} used Dark Healing Field on ${targetTokens.length} targets for ${totalDamageDealt} total damage, healed ${healAmount}`
    );

    return {
      success: true,
      totalDamageDealt: totalDamageDealt,
      healAmount: healAmount,
      targetResults: targetResults,
      targetsAffected: targetTokens.length
    };
  }

  /**
   * WICKED STRIKE - Move enemy -2 on Condition Track on critical hit
   * Prerequisite: Weapon Focus (Lightsabers), Weapon Specialization (Lightsabers)
   */
  static hasWickedStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Wicked Strike'
    );
  }

  static async triggerWickedStrike(actor, targetToken, spendFP = true) {
    if (!this.hasWickedStrike(actor)) {
      return { success: false, message: 'Actor does not have Wicked Strike' };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Wicked Strike requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    const targetActor = targetToken.actor;
    const currentCondition = targetActor.system.conditionTrack?.value || 0;
    const newCondition = Math.max(0, currentCondition - 2); // -2 means moving down 2 steps

    await targetActor.update({
      'system.conditionTrack.value': newCondition
    });

    const chatContent = `
      <div class="swse-wicked-strike">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Wicked Strike</h3>
        <p><strong>${actor.name}</strong>'s critical lightsaber strike ravages <strong>${targetActor.name}</strong>!</p>
        <p><strong>Effect:</strong> Target moves -2 steps along the Condition Track</p>
        <p><em>Previous condition: ${currentCondition}, New condition: ${newCondition}</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Wicked Strike - Critical Blow'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Wicked Strike on ${targetActor.name}, condition ${currentCondition} → ${newCondition}`);

    return {
      success: true,
      previousCondition: currentCondition,
      newCondition: newCondition
    };
  }

  /**
   * AFFLICTION - Target takes 2d6 Force damage at start of next turn
   */
  static hasAffliction(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Affliction'
    );
  }

  static async applyAffliction(targetToken, sourceName) {
    const targetActor = targetToken.actor;
    const afflictionFlags = targetActor.getFlag('swse', 'afflictions') || [];

    afflictionFlags.push({
      sourceName: sourceName,
      createdAt: new Date().toISOString(),
      triggeredAt: false
    });

    await targetActor.setFlag('swse', 'afflictions', afflictionFlags);

    SWSELogger.log(`SWSE Talents | Applied Affliction from ${sourceName} to ${targetActor.name}`);
  }

  static async applyAfflictionDamage(targetToken) {
    const targetActor = targetToken.actor;
    const afflictions = targetActor.getFlag('swse', 'afflictions') || [];

    if (afflictions.length === 0) {return;}

    for (const affliction of afflictions) {
      const damageRoll = new Roll('2d6');
      await damageRoll.evaluate({ async: true });
      const damageAmount = damageRoll.total;

      const newHp = Math.max(0, targetActor.system.hp.value - damageAmount);
      await targetActor.update({ 'system.hp.value': newHp });

      const chatContent = `
        <div class="swse-affliction-damage">
          <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Affliction Damage</h3>
          <p><strong>${targetActor.name}</strong> suffers from dark taint!</p>
          <p><strong>Damage:</strong> ${damageAmount} (Force damage)</p>
          <p><em>Source: ${affliction.sourceName}'s Affliction</em></p>
        </div>
      `;

      await createChatMessage({
        speaker: { actor: targetActor },
        content: chatContent,
        flavor: 'Affliction - Dark Taint Damage',
        rolls: [damageRoll]
      });

      SWSELogger.log(`SWSE Talents | Applied ${damageAmount} Affliction damage to ${targetActor.name}`);
    }

    // Clear afflictions after applying
    await targetActor.unsetFlag('swse', 'afflictions');
  }

  /**
   * DRAIN FORCE - Reaction to regain spent power and drain target's FP
   * Prerequisite: Affliction
   * Once per encounter when damaging Force-sensitive opponent
   */
  static hasDrainForce(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Drain Force'
    );
  }

  static async triggerDrainForce(actor, targetToken) {
    if (!this.hasDrainForce(actor)) {
      return { success: false, message: 'Actor does not have Drain Force' };
    }

    // Check if already used this encounter
    const combatId = game.combat?.id;
    if (!combatId) {
      return {
        success: false,
        message: 'Drain Force can only be used during combat'
      };
    }

    const drainForceFlag = `drainForce_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', drainForceFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Drain Force has already been used this encounter. Resets at the start of the next encounter.'
      };
    }

    const targetActor = targetToken.actor;
    const targetFP = targetActor.system.forcePoints?.value || 0;

    if (targetFP === 0) {
      return {
        success: false,
        message: `${targetActor.name} has no Force Points to drain`
      };
    }

    // Regain one spent power from actor
    const spentPowers = actor.items.filter(item =>
      item.type === 'forcepower' && item.system?.spent === true
    );

    let regainedPowerName = null;
    if (spentPowers.length > 0) {
      const powerToRegain = spentPowers[0];
      await ActorEngine.updateOwnedItems(actor, [{
        _id: powerToRegain.id,
        'system.spent': false
      }]);
      regainedPowerName = powerToRegain.name;
    }

    // Drain target's FP
    await targetActor.update({
      'system.forcePoints.value': Math.max(0, targetFP - 1)
    });

    // Mark as used
    await actor.setFlag('swse', drainForceFlag, true);

    const chatContent = `
      <div class="swse-drain-force">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Drain Force</h3>
        <p><strong>${actor.name}</strong> drains the Force from <strong>${targetActor.name}</strong>!</p>
        ${regainedPowerName ? `<p><strong>${regainedPowerName}</strong> returned to ${actor.name}'s Force Power Suite</p>` : ''}
        <p><strong>${targetActor.name}</strong> loses 1 Force Point (${targetFP} → ${Math.max(0, targetFP - 1)})</p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Drain Force - Force Siphoned'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Drain Force. Regained: ${regainedPowerName || 'none'}. Target lost 1 FP.`);

    return {
      success: true,
      regainedPower: regainedPowerName,
      targetFPDrained: 1,
      newTargetFP: Math.max(0, targetFP - 1)
    };
  }

  /**
   * SITH ALCHEMY - Create Sith Talismans and weapons
   * Creates a talisman that adds 1d6 to Force Power/Lightsaber damage
   */
  static hasSithAlchemy(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Sith Alchemy'
    );
  }

  static async createSithTalisman(actor, spendFP = true) {
    if (!this.hasSithAlchemy(actor)) {
      return {
        success: false,
        message: 'Actor does not have Sith Alchemy'
      };
    }

    // Cooldown: if a previous talisman was destroyed, cannot create a new one for 24 hours
    if (!this.canCreateNewSithTalisman(actor)) {
      return {
        success: false,
        message: 'Cannot create a new Sith Talisman yet (24-hour cooldown after destruction).'
      };
    }


    const activeTalisman = actor.getFlag('swse', 'activeSithTalisman');
    if (activeTalisman) {
      return {
        success: false,
        message: 'Already carrying an active Sith Talisman. Only one can be active at a time.'
      };
    }

    if (spendFP) {
      const currentFP = actor.system.forcePoints?.value || 0;
      if (currentFP < 1) {
        return {
          success: false,
          message: 'Not enough Force Points. Creating a Sith Talisman requires 1 Force Point.'
        };
      }

      await actor.update({
        'system.forcePoints.value': currentFP - 1
      });
    }

    // Increase DSP by 1
    const currentDSP = actor.system.darkSideScore || 0;
    await actor.update({
      'system.darkSideScore': currentDSP + 1
    });

    // Create the talisman item
    const itemData = {
      name: 'Sith Talisman',
      type: 'equipment',
      system: {
        description: 'A dark artifact imbued with Sith sorcery. When worn, grants +1d6 to damage rolls with Force Powers.',
        equipped: true,
        quantity: 1,
        rarity: 'legendary'
      }
    };

    // Create the item in the actor's inventory
    const createdItems = await createItemInActor(actor, itemData);
    if (!createdItems || !Array.isArray(createdItems) || createdItems.length === 0) {
      ui.notifications.error('Failed to create Sith Talisman item');
      return { success: false, message: 'Failed to create talisman item' };
    }
    const itemId = createdItems[0].id;

    const talismantInfo = {
      itemId: itemId,
      createdAt: new Date().toISOString(),
      createdRound: game.combat?.round || 0,
      dspIncreaseApplied: true
    };

    await actor.setFlag('swse', 'activeSithTalisman', talismantInfo);

    const chatContent = `
      <div class="swse-sith-talisman">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> Sith Talisman Created</h3>
        <p><strong>${actor.name}</strong> imbues an object with Sith sorcery, creating a powerful talisman.</p>
        <p><strong>Effect:</strong> +1d6 to damage rolls with Force Powers</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${currentDSP + 1})</p>
        <p><em>The talisman remains active until destroyed. If destroyed, you cannot create another one for 24 hours.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Sith Talisman Created'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} created a Sith Talisman. DSP: ${currentDSP} → ${currentDSP + 1}`);

    return {
      success: true,
      itemId: itemId,
      dspIncreased: 1,
      newDSP: currentDSP + 1,
      actionTime: 'Full-Round Action'
    };
  }

  static async destroySithTalisman(actor) {
    const talisman = actor.getFlag('swse', 'activeSithTalisman');
    if (!talisman) {
      return { success: false, message: 'Actor does not have an active Sith Talisman' };
    }

    // Delete the actual item from inventory if it exists
    if (talisman.itemId) {
      const item = actor.items.get(talisman.itemId);
      if (item) {
        await actor.deleteEmbeddedDocuments('Item', [talisman.itemId]);
      }
    }

    await actor.unsetFlag('swse', 'activeSithTalisman');

    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + 24);

    await actor.setFlag('swse', 'sithTalismanCooldown', cooldownUntil.toISOString());

    const chatContent = `
      <div class="swse-sith-talisman-destroyed">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> Sith Talisman Destroyed</h3>
        <p><strong>${actor.name}</strong>'s Sith Talisman has been destroyed!</p>
        <p><em>Cannot create a new talisman for 24 hours.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Sith Talisman - Destroyed'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name}'s Sith Talisman was destroyed`);

    return { success: true, cooldownHours: 24 };
  }

  static canCreateNewSithTalisman(actor) {
    const cooldown = actor.getFlag('swse', 'sithTalismanCooldown');
    if (!cooldown) {return true;}

    const cooldownTime = new Date(cooldown);
    const now = new Date();

    return now >= cooldownTime;
  }

  static getActiveSithTalisman(actor) {
    return actor.getFlag('swse', 'activeSithTalisman');
  }

  // ========================================================================
  // SITH ALCHEMICAL WEAPON - Sith Alchemy weapon enhancement
  // ========================================================================

  /**
   * Check if actor has Sith Alchemy (create) talent
   */
  static hasSithAlchemyCreate(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Sith Alchemy (create)'
    );
  }

  /**
   * Check if a weapon is a Sith Alchemical Weapon
   */
  static isSithAlchemicalWeapon(weapon) {
    return weapon?.flags?.swse?.sithAlchemical === true;
  }

  /**
   * Create a Sith Alchemical Weapon by enhancing an existing weapon
   * Cost: 20% or 2,000 credits more (whichever is higher)
   * Applicable to: Any Advanced Melee Weapon or Simple Weapon (Melee)
   *
   * Effects:
   * - Lightsabers don't ignore Damage Reduction
   * - Treat as Lightsaber for Block, Deflect, Redirect Shot talents
   * - Swift Action: Spend FP to gain bonus to damage = Dark Side Score
   *   (applies to next attack, increases DSP by 1)
   */
  static async createSithAlchemicalWeapon(actor, weaponItem) {
    if (!this.hasSithAlchemyCreate(actor)) {
      return {
        success: false,
        message: 'Actor does not have Sith Alchemy (create) talent'
      };
    }

    // Validate weapon type
    const validWeaponTypes = ['advanced-melee', 'simple-melee'];
    if (!validWeaponTypes.includes(weaponItem.system?.weaponType)) {
      return {
        success: false,
        message: 'Sith Alchemical Weapons can only be created from melee weapons (Advanced or Simple Melee)'
      };
    }

    // Check if already enhanced
    if (this.isSithAlchemicalWeapon(weaponItem)) {
      return {
        success: false,
        message: `${weaponItem.name} is already a Sith Alchemical Weapon`
      };
    }

    // Calculate enhancement cost
    const baseCost = weaponItem.system?.cost || 0;
    const percentCost = Math.floor(baseCost * 0.2);
    const enhancementCost = Math.max(percentCost, 2000);

    // Check actor credits
    const actorCredits = actor.system.credits || 0;
    if (actorCredits < enhancementCost) {
      return {
        success: false,
        message: `Insufficient credits. Enhancement requires ${enhancementCost} credits (you have ${actorCredits})`
      };
    }

    // Spend the credits
    await actor.update({
      'system.credits': actorCredits - enhancementCost
    });

    // Update the weapon with Sith Alchemical flag and enhanced description
    const originalDescription = weaponItem.system?.description || '';
    const enhancedDescription = `${originalDescription}\n\n**Sith Alchemical Enhancement:** This weapon has been imbued with Sith sorcery. Lightsabers do not ignore its Damage Reduction. Proficient users treat it as a Lightsaber for Block, Deflect, and Redirect Shot talents.`;

    await ActorEngine.updateOwnedItems(actor, [{
      _id: weaponItem.id,
      'flags.swse.sithAlchemical': true,
      'system.description': enhancedDescription
    }]);

    const chatContent = `
      <div class="swse-sith-alchemical-weapon">
        <h3><img src="icons/svg/sword.svg" style="width: 20px; height: 20px;"> Sith Alchemical Weapon Created</h3>
        <p><strong>${actor.name}</strong> enhances ${weaponItem.name} with Sith sorcery.</p>
        <p><strong>Cost:</strong> ${enhancementCost} credits</p>
        <p><strong>Effects:</strong></p>
        <ul>
          <li>Lightsabers do not ignore this weapon's Damage Reduction</li>
          <li>Treat as Lightsaber for Block, Deflect, and Redirect Shot talents</li>
          <li><strong>Swift Action Ability:</strong> Spend a Force Point to gain a bonus to damage equal to your Dark Side Score on your next attack (increases your DSP by 1)</li>
        </ul>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Sith Alchemical Weapon Enhanced'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} created Sith Alchemical Weapon: ${weaponItem.name}`);

    return {
      success: true,
      weaponId: weaponItem.id,
      weaponName: weaponItem.name,
      costSpent: enhancementCost
    };
  }

  /**
   * Activate Sith Alchemical Weapon damage bonus
   * Spend a Force Point to gain bonus to damage = Dark Side Score
   * Applies to next attack before end of encounter
   * Increases Dark Side Score by 1
   */
  static async activateSithAlchemicalBonus(actor, weaponItem) {
    if (!this.isSithAlchemicalWeapon(weaponItem)) {
      return {
        success: false,
        message: `${weaponItem.name} is not a Sith Alchemical Weapon`
      };
    }

    // Check Force Points
    const currentFP = actor.system.forcePoints?.value || 0;
    if (currentFP < 1) {
      return {
        success: false,
        message: 'Not enough Force Points. Sith Alchemical Weapon ability requires 1 Force Point.'
      };
    }

    // Spend Force Point
    await actor.update({
      'system.forcePoints.value': currentFP - 1
    });

    // Get Dark Side Score
    const dspBonus = actor.system.darkSideScore || 0;

    // Increase DSP by 1
    const newDSP = dspBonus + 1;
    await actor.update({
      'system.darkSideScore': newDSP
    });

    // Store active bonus
    const bonusFlag = {
      weaponId: weaponItem.id,
      weaponName: weaponItem.name,
      bonusDamage: dspBonus,
      activatedAt: new Date().toISOString(),
      activatedRound: game.combat?.round || 0,
      activatedTurn: game.combat?.turn || 0
    };

    const activeBonus = actor.getFlag('swse', 'sithAlchemicalBonus');
    const bonuses = activeBonus ? [activeBonus, bonusFlag] : [bonusFlag];
    await actor.setFlag('swse', 'sithAlchemicalBonus', bonuses[0]); // Keep only the latest (one per encounter typically)

    const chatContent = `
      <div class="swse-sith-alchemical-bonus">
        <h3><img src="icons/svg/sword.svg" style="width: 20px; height: 20px;"> Sith Alchemical Weapon Activated</h3>
        <p><strong>${actor.name}</strong> channels Dark Side energy through ${weaponItem.name}.</p>
        <p><strong>Damage Bonus:</strong> +${dspBonus} on next attack</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${newDSP})</p>
        <p><em>This bonus applies to your next attack before the end of the encounter.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Sith Alchemical Power Activated'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} activated Sith Alchemical Weapon: ${weaponItem.name} (+${dspBonus} damage, DSP: ${dspBonus} → ${newDSP})`);

    return {
      success: true,
      weaponName: weaponItem.name,
      damageBonus: dspBonus,
      newDSP: newDSP
    };
  }

  /**
   * Clear Sith Alchemical bonus after attack is made
   */
  static async clearSithAlchemicalBonus(actor) {
    await actor.unsetFlag('swse', 'sithAlchemicalBonus');
  }

  /**
   * DARK SCOURGE - +1 bonus vs Jedi characters
   * Passive bonus applied to attack rolls against Jedi
   */
  static hasDarkScourge(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Scourge'
    );
  }

  static getDarkScourgeBonus(actor, targetActor) {
    if (!this.hasDarkScourge(actor)) {return 0;}

    // Check if target is a Jedi (has Jedi class)
    const isJedi = targetActor.items.some(item =>
      item.type === 'class' && item.name === 'Jedi'
    );

    return isJedi ? 1 : 0;
  }

  /**
   * DARK SIDE ADEPT - Reroll Use the Force checks for Dark Side powers
   * Must keep the result of the reroll
   */
  static hasDarkSideAdept(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Adept'
    );
  }

  /**
   * DARK SIDE MASTER - Reroll Use the Force, can spend FP to keep better
   * Prerequisite: Dark Side Adept
   */
  static hasDarkSideMaster(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Master'
    );
  }

  /**
   * FORCE DECEPTION - Use Use the Force instead of Deception
   * Considered trained in Deception
   */
  static hasForceDeception(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Force Deception'
    );
  }

  static getDeceptionModifier(actor) {
    if (!this.hasForceDeception(actor)) {
      return actor.system.skills?.deception?.mod || 0;
    }

    // Use the Force modifier instead
    return actor.system.skills?.useTheForce?.mod || 0;
  }

  /**
   * STOLEN FORM - Copy a Lightsaber Form talent
   * Prerequisites: Any One Force Technique, Weapon Focus (Lightsabers)
   */
  static hasStolenForm(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Stolen Form'
    );
  }

  static getStolenFormTalent(actor) {
    return actor.getFlag('swse', 'stolenFormTalent');
  }

  static async setStolenFormTalent(actor, talentName) {
    await actor.setFlag('swse', 'stolenFormTalent', talentName);

    const chatContent = `
      <div class="swse-stolen-form">
        <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Stolen Form</h3>
        <p><strong>${actor.name}</strong> has stolen a Jedi fighting technique!</p>
        <p><strong>Learned Form:</strong> ${talentName}</p>
        <p><em>You gain all the benefits of this talent, but still must meet its prerequisites.</em></p>
      </div>
    `;

    await createChatMessage({
      speaker: { actor: actor },
      content: chatContent,
      flavor: 'Stolen Form - Jedi Technique Acquired'
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} stole the ${talentName} form`);
  }
}


// ============================================================================
// HOOKS - Auto-trigger mechanics
// ============================================================================

Hooks.on('combatRoundChange', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    const rageInfo = actor.getFlag('swse', 'isChannelAngerRaging');

    if (rageInfo && combat.round >= rageInfo.endRound) {
      await DarkSidePowers.endChannelAnger(actor);
    }
  }
});

Hooks.on('preUpdateActor', async (actor, update, options, userId) => {
  if (update.system?.hp?.value !== undefined) {
    const crippledInfo = actor.getFlag('swse', 'isCrippled');
    if (crippledInfo && update.system.hp.value >= crippledInfo.maxHpWhenCrippled) {
      await DarkSidePowers.removeCripplingStrike(actor);
    }
  }
});

Hooks.on('combatTurnChange', async (combat, combatantData) => {
  const token = canvas.tokens.get(combatantData.tokenId);
  if (token) {
    await DarkSidePowers.applyWrathDamageAtTurnStart(token);
  }
});

Hooks.on('combatEnd', async (combat) => {
  await DarkSidePowers.clearWrathFlagsOnCombatEnd();
});

Hooks.on('darkSideSavantTriggered', async (actor) => {
  const result = await DarkSidePowers.triggerDarkSideSavant(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection && result.powers.length > 1) {
    const powerOptions = result.powers
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Dark Side Savant - Select Power to Return',
      content: `
        <div class="form-group">
          <label>Choose a Dark Side Force Power to return to your suite (no Force Point cost):</label>
          <select id="power-select" style="width: 100%;">
            ${powerOptions}
          </select>
        </div>
      `,
      buttons: {
        select: {
          label: 'Return to Suite',
          callback: async (html) => {
            const powerIdToReturn = (html?.[0] ?? html)?.querySelector('#power-select')?.value;
            await DarkSidePowers.completeDarkSideSavantSelection(
              actor,
              powerIdToReturn,
              result.combatId,
              result.savantUsageFlag
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

// ========================================================================
// SITH ALCHEMY - Extended Transformations (Amulet, Armor, Weapon)
// Implements the rules text provided by GM (stable, time-gated with flags)
// ========================================================================

export function _nowISO() {
  return new Date().toISOString();
}

export function _addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function _isComplete(isoTime) {
  if (!isoTime) { return false; }
  return new Date() >= new Date(isoTime);
}

export function _getCredits(actor) {
  return Number(actor?.system?.credits ?? 0);
}

export async function _spendCredits(actor, amount) {
  const credits = _getCredits(actor);
  if (credits < amount) {
    return { ok: false, message: `Insufficient credits. Requires ${amount} credits (you have ${credits}).` };
  }
  await actor.update({ 'system.credits': credits - amount });
  return { ok: true, before: credits, after: credits - amount };
}

export function _getFP(actor) {
  return Number(actor?.system?.forcePoints?.value ?? 0);
}

export async function _spendFP(actor, amount = 1) {
  const fp = _getFP(actor);
  if (fp < amount) {
    return { ok: false, message: `Not enough Force Points. Requires ${amount} Force Point(s).` };
  }
  await actor.update({ 'system.forcePoints.value': fp - amount });
  return { ok: true, before: fp, after: fp - amount };
}

export function _getDSP(actor) {
  return Number(actor?.system?.darkSideScore ?? 0);
}

export async function _increaseDSP(actor, amount = 1) {
  const dsp = _getDSP(actor);
  const next = dsp + amount;
  await actor.update({ 'system.darkSideScore': next });
  return { before: dsp, after: next };
}

/**
 * Start crafting a Sith Amulet.
 * - Costs 25,000 credits in materials (abstracted as credits)
 * - Takes 7 days (1 week)
 * - On completion: spend 1 FP, gain a Sith Amulet item, DSP +1
 */
export async function startSithAmuletCraft(actor) {
  if (!DarkSidePowers.hasSithAlchemy(actor)) {
    return { success: false, message: 'Actor does not have Sith Alchemy' };
  }

  const existing = actor.getFlag('swse', 'sithAmuletCraft');
  if (existing && !existing.completedAt) {
    return { success: false, message: 'A Sith Amulet craft is already in progress.' };
  }

  const cost = 25000;
  const creditSpend = await _spendCredits(actor, cost);
  if (!creditSpend.ok) { return { success: false, message: creditSpend.message }; }

  const startedAt = _nowISO();
  const completesAt = _addDays(startedAt, 7).toISOString();

  const craft = { startedAt, completesAt, cost, completedAt: null };
  await actor.setFlag('swse', 'sithAmuletCraft', craft);

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> Sith Amulet Craft Started</h3>
        <p><strong>${actor.name}</strong> begins crafting a Sith Amulet.</p>
        <p><strong>Materials:</strong> ${cost.toLocaleString()} credits</p>
        <p><strong>Time:</strong> 1 week (completes after ${new Date(completesAt).toLocaleString()})</p>
        <p><em>Completion requires spending 1 Force Point.</em></p>
      </div>
    `
  });

  return { success: true, startedAt, completesAt, cost };
}

export async function completeSithAmuletCraft(actor) {
  const craft = actor.getFlag('swse', 'sithAmuletCraft');
  if (!craft || craft.completedAt) {
    return { success: false, message: 'No Sith Amulet craft is currently in progress.' };
  }
  if (!_isComplete(craft.completesAt)) {
    return { success: false, message: 'Sith Amulet craft is not finished yet.' };
  }

  const fpSpend = await _spendFP(actor, 1);
  if (!fpSpend.ok) { return { success: false, message: fpSpend.message }; }

  const dsp = await _increaseDSP(actor, 1);

  const itemData = {
    name: 'Sith Amulet',
    type: 'equipment',
    system: {
      description: 'A powerful amulet forged through Sith Alchemy. (System note: item created via Sith Alchemy.)',
      equipped: false,
      quantity: 1,
      rarity: 'legendary'
    }
  };

  const createdItems = await createItemInActor(actor, itemData);
  if (!createdItems || !Array.isArray(createdItems) || createdItems.length === 0) {
    ui.notifications.error('Failed to create Sith Amulet item');
    return { success: false, message: 'Failed to create Sith Amulet item' };
  }

  const completedAt = _nowISO();
  await actor.setFlag('swse', 'sithAmuletCraft', { ...craft, completedAt });

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/amulet.svg" style="width: 20px; height: 20px;"> Sith Amulet Completed</h3>
        <p><strong>${actor.name}</strong> completes a Sith Amulet.</p>
        <p><strong>Force Point:</strong> -1</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${dsp.after})</p>
      </div>
    `
  });

  return { success: true, itemId: createdItems[0].id, newDSP: dsp.after };
}

/**
 * Start transforming Battle Armor into Sith Dark Armor.
 * Requires an existing Battle Armor item. Completion costs 1 FP.
 * Time: Light=1 day, Standard=2 days, Heavy=3 days
 */
export function _classifyBattleArmor(armorItem) {
  const name = (armorItem?.name || '').toLowerCase();
  if (name.includes('light battle armor')) { return { tier: 'light', days: 1, resultName: 'Light Dark Armor' }; }
  if (name.includes('heavy battle armor')) { return { tier: 'heavy', days: 3, resultName: 'Heavy Dark Armor' }; }
  if (name.includes('battle armor')) { return { tier: 'standard', days: 2, resultName: 'Dark Armor' }; }
  return null;
}

export async function startSithArmorTransform(actor, armorItem) {
  if (!DarkSidePowers.hasSithAlchemy(actor)) {
    return { success: false, message: 'Actor does not have Sith Alchemy' };
  }
  if (!armorItem || armorItem.type !== 'armor') {
    return { success: false, message: 'You must select an Armor item.' };
  }

  const info = _classifyBattleArmor(armorItem);
  if (!info) {
    return { success: false, message: 'Sith Armor can only be created from Battle Armor (Light, Standard, Heavy).' };
  }

  const pending = armorItem.getFlag('swse', 'sithArmorTransform');
  if (pending && !pending.completedAt) {
    return { success: false, message: 'This armor already has a Sith Armor transformation in progress.' };
  }

  const startedAt = _nowISO();
  const completesAt = _addDays(startedAt, info.days).toISOString();

  await armorItem.setFlag('swse', 'sithArmorTransform', {
    startedAt,
    completesAt,
    tier: info.tier,
    resultName: info.resultName,
    completedAt: null
  });

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/armor.svg" style="width: 20px; height: 20px;"> Sith Armor Transformation Started</h3>
        <p><strong>${actor.name}</strong> begins transforming <strong>${armorItem.name}</strong> into <strong>${info.resultName}</strong>.</p>
        <p><strong>Time:</strong> ${info.days} day(s) (completes after ${new Date(completesAt).toLocaleString()})</p>
        <p><em>Completion requires spending 1 Force Point.</em></p>
      </div>
    `
  });

  return { success: true, startedAt, completesAt, days: info.days };
}

export async function completeSithArmorTransform(actor, armorItem) {
  if (!armorItem || armorItem.type !== 'armor') {
    return { success: false, message: 'You must select an Armor item.' };
  }
  const pending = armorItem.getFlag('swse', 'sithArmorTransform');
  if (!pending || pending.completedAt) {
    return { success: false, message: 'No Sith Armor transformation is currently in progress for this armor.' };
  }
  if (!_isComplete(pending.completesAt)) {
    return { success: false, message: 'Sith Armor transformation is not finished yet.' };
  }

  const fpSpend = await _spendFP(actor, 1);
  if (!fpSpend.ok) { return { success: false, message: fpSpend.message }; }

  const dsp = await _increaseDSP(actor, 1);

  const originalDescription = armorItem.system?.description || '';
  const enhancedDescription = `${originalDescription}\n\n**Sith Alchemy (Sith Armor):** This armor has been transformed into ${pending.resultName} through dark alchemy.`;

  await ActorEngine.updateOwnedItems(actor, [{
    _id: armorItem.id,
    name: pending.resultName,
    'flags.swse.sithArmor': true,
    'system.description': enhancedDescription
  }]);

  await armorItem.setFlag('swse', 'sithArmorTransform', { ...pending, completedAt: _nowISO() });

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/armor.svg" style="width: 20px; height: 20px;"> Sith Armor Completed</h3>
        <p><strong>${actor.name}</strong> completes the transformation into <strong>${pending.resultName}</strong>.</p>
        <p><strong>Force Point:</strong> -1</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${dsp.after})</p>
      </div>
    `
  });

  return { success: true, newDSP: dsp.after };
}

/**
 * Start creating a Sith Weapon from a melee weapon.
 * - Takes 1 hour
 * - Completion requires spending 1 FP, DSP +1
 * - Grants special handling (flags) and enables Swift FP damage-bonus action
 */
export async function startSithWeaponCraft(actor, weaponItem) {
  if (!DarkSidePowers.hasSithAlchemy(actor)) {
    return { success: false, message: 'Actor does not have Sith Alchemy' };
  }
  if (!weaponItem || weaponItem.type !== 'weapon') {
    return { success: false, message: 'You must select a Weapon item.' };
  }

  const validWeaponTypes = ['advanced-melee', 'simple-melee'];
  if (!validWeaponTypes.includes(weaponItem.system?.weaponType)) {
    return { success: false, message: 'Sith Weapons can only be created from Simple Melee or Advanced Melee weapons.' };
  }

  const pending = weaponItem.getFlag('swse', 'sithWeaponCraft');
  if (pending && !pending.completedAt) {
    return { success: false, message: 'This weapon already has a Sith Weapon creation in progress.' };
  }

  const startedAt = _nowISO();
  const completesAt = _addHours(startedAt, 1).toISOString();

  await weaponItem.setFlag('swse', 'sithWeaponCraft', {
    startedAt,
    completesAt,
    completedAt: null
  });

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/sword.svg" style="width: 20px; height: 20px;"> Sith Weapon Imbuement Started</h3>
        <p><strong>${actor.name}</strong> begins imbuing <strong>${weaponItem.name}</strong> with Sith Alchemy.</p>
        <p><strong>Time:</strong> 1 hour (completes after ${new Date(completesAt).toLocaleString()})</p>
        <p><em>Completion requires spending 1 Force Point.</em></p>
      </div>
    `
  });

  return { success: true, startedAt, completesAt };
}

export async function completeSithWeaponCraft(actor, weaponItem) {
  if (!weaponItem || weaponItem.type !== 'weapon') {
    return { success: false, message: 'You must select a Weapon item.' };
  }
  const pending = weaponItem.getFlag('swse', 'sithWeaponCraft');
  if (!pending || pending.completedAt) {
    return { success: false, message: 'No Sith Weapon creation is currently in progress for this weapon.' };
  }
  if (!_isComplete(pending.completesAt)) {
    return { success: false, message: 'Sith Weapon creation is not finished yet.' };
  }

  const fpSpend = await _spendFP(actor, 1);
  if (!fpSpend.ok) { return { success: false, message: fpSpend.message }; }

  const dsp = await _increaseDSP(actor, 1);

  const originalDescription = weaponItem.system?.description || '';
  const enhancedDescription = `${originalDescription}\n\n**Sith Alchemy (Sith Weapon):** Lightsabers do not ignore this weapon's Damage Reduction. Proficient users treat it as a Lightsaber for Block, Deflect, and Redirect Shot.`;

  await ActorEngine.updateOwnedItems(actor, [{
    _id: weaponItem.id,
    'flags.swse.sithWeapon': true,
    'flags.swse.sithAlchemical': true,
    'system.description': enhancedDescription
  }]);

  await weaponItem.setFlag('swse', 'sithWeaponCraft', { ...pending, completedAt: _nowISO() });

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/sword.svg" style="width: 20px; height: 20px;"> Sith Weapon Completed</h3>
        <p><strong>${actor.name}</strong> completes the Sith Weapon imbuement on <strong>${weaponItem.name}</strong>.</p>
        <p><strong>Force Point:</strong> -1</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${dsp.after})</p>
        <p><em>Swift Action: spend 1 FP to add bonus damage equal to your Dark Side Score to your next attack with this weapon (DSP +1).</em></p>
      </div>
    `
  });

  return { success: true, newDSP: dsp.after };
}

/**
 * Swift Action: Spend 1 FP to gain bonus damage = current Dark Side Score on next attack with a Sith Weapon.
 * Increases Dark Side Score by 1 when activated.
 *
 * This stores a one-shot damage bonus on the actor and is consumed by the damage roller.
 */
export async function activateSithWeaponBonus(actor, weaponItem) {
  if (!weaponItem || weaponItem.type !== 'weapon' || weaponItem.getFlag('swse', 'sithWeapon') !== true) {
    return { success: false, message: 'You must select a Sith Weapon.' };
  }

  const fpSpend = await _spendFP(actor, 1);
  if (!fpSpend.ok) { return { success: false, message: fpSpend.message }; }

  const bonus = _getDSP(actor);
  const dsp = await _increaseDSP(actor, 1);

  const payload = {
    weaponId: weaponItem.id,
    bonusDamage: bonus,
    activatedAt: _nowISO(),
    encounterId: game.combat?.id ?? null,
    expiresAt: game.combat ? null : _addHours(_nowISO(), 1).toISOString()
  };

  await actor.setFlag('swse', 'sithWeaponDamageBonus', payload);

  await createChatMessage({
    speaker: { actor },
    content: `
      <div class="swse-sith-alchemy">
        <h3><img src="icons/svg/sword.svg" style="width: 20px; height: 20px;"> Sith Weapon Damage Surge</h3>
        <p><strong>${actor.name}</strong> channels the Dark Side through <strong>${weaponItem.name}</strong>.</p>
        <p><strong>Next attack bonus damage:</strong> +${bonus} (Dark Side Score)</p>
        <p><strong>Force Point:</strong> -1</p>
        <p><strong>Dark Side Score:</strong> +1 (now ${dsp.after})</p>
      </div>
    `
  });

  return { success: true, bonusDamage: bonus, newDSP: dsp.after };
}

export default DarkSidePowers;
