/**
 * scripts/progression/engine/attribute-increase-handler.js
 *
 * Handles attribute increases at levels 4, 8, 12, 16, and 20
 * Implements automatic adjustments for:
 * - Intelligence modifier increase: adds trained skill + language (+ linguist bonus)
 * - Wisdom modifier increase: adds Force Powers based on Force Training feat count
 * - Constitution modifier increase: adds HP equal to heroic level
 */

import { swseLogger } from '../../utils/logger.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { SWSELanguageModule } from '../modules/language-module.js';

export class AttributeIncreaseHandler {
  /**
   * Calculate modifier from ability score
   */
  static getModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Check if level qualifies for attribute increase
   */
  static qualifiesForIncrease(level) {
    return [4, 8, 12, 16, 20].includes(level);
  }

  /**
   * Handle attribute increase and apply secondary effects
   * @param {Actor} actor - The actor receiving the attribute increase
   * @param {string} attribute - The attribute being increased ('str', 'dex', 'con', 'int', 'wis', 'cha')
   * @param {number} previousScore - The previous attribute score
   * @param {number} newScore - The new attribute score
   */
  static async handleAttributeIncrease(actor, attribute, previousScore, newScore) {
    const previousMod = this.getModifier(previousScore);
    const newMod = this.getModifier(newScore);

    // Only proceed if modifier actually changed
    if (newMod === previousMod) {
      return;
    }

    const modIncrease = newMod - previousMod;
    swseLogger.log(`SWSE | Attribute Increase: ${attribute.toUpperCase()} modifier changed from ${previousMod} to ${newMod}`);

    // Handle attribute-specific effects
    switch (attribute.toLowerCase()) {
      case 'int':
        await this._handleIntelligenceIncrease(actor, modIncrease);
        break;
      case 'wis':
        await this._handleWisdomIncrease(actor, modIncrease);
        break;
      case 'con':
        await this._handleConstitutionIncrease(actor, modIncrease);
        break;
    }

    Hooks.call('swse:attributeModifierChanged', {
      actor,
      attribute,
      previousMod,
      newMod,
      modIncrease
    });
  }

  /**
   * Handle Intelligence modifier increase
   * Grants: 1 trained skill + 1 language (+ additional language per Linguist feat)
   */
  static async _handleIntelligenceIncrease(actor, modIncrease) {
    if (modIncrease <= 0) {return;}

    // Count Linguist feats
    const linguistCount = actor.items.filter(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('linguist')
    ).length;

    const skillsToGain = modIncrease;
    const languagesToGain = modIncrease * (1 + linguistCount);

    swseLogger.log(`SWSE | Intelligence increase: Gain ${skillsToGain} trained skill(s) and ${languagesToGain} language(s)`);

    ui.notifications?.info(
      `Intelligence modifier increased! Gain ${skillsToGain} trained skill(s) and ${languagesToGain} language(s).`,
      { permanent: false }
    );

    // Store pending selections in flags
    const currentPending = actor.getFlag('foundryvtt-swse', 'pendingAttributeGains') || {};
    currentPending.trainedSkills = (currentPending.trainedSkills || 0) + skillsToGain;
    currentPending.languages = (currentPending.languages || 0) + languagesToGain;

    await actor.setFlag('foundryvtt-swse', 'pendingAttributeGains', currentPending);

    // Add language choice tokens via language module
    if (SWSELanguageModule && languagesToGain > 0) {
      const langs = SWSELanguageModule._normalizeLanguages(actor.system.languages || []);
      for (let i = 0; i < languagesToGain; i++) {
        langs.push(SWSELanguageModule.CHOICE_TOKEN);
      }
      const deduped = SWSELanguageModule._dedupe(langs);
      // PHASE 3: Route through ActorEngine
      await ActorEngine.updateActor(actor, { 'system.languages': deduped }).catch(e => {
        swseLogger.warn('SWSE | Failed to add language choice tokens:', e);
      });
    }

    // Emit hook for UI to handle selections
    Hooks.call('swse:intelligenceIncreased', {
      actor,
      skillsToGain,
      languagesToGain,
      linguistCount
    });
  }

  /**
   * Handle Wisdom modifier increase for Force users
   * Grants: Force Powers based on Force Training feat count
   */
  static async _handleWisdomIncrease(actor, modIncrease) {
    if (modIncrease <= 0) {return;}

    // Check if using Charisma instead of Wisdom for Force Powers (houserule)
    const useCharisma = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || false;
    if (useCharisma) {
      swseLogger.log('SWSE | Wisdom increase skipped: Force Powers use Charisma (houserule)');
      return;
    }

    // Count Force Training feats
    const forceTrainingCount = actor.items.filter(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('force training')
    ).length;

    if (forceTrainingCount === 0) {
      swseLogger.log('SWSE | Wisdom increase: No Force Training feats, skipping Force Power gains');
      return;
    }

    const forcePowersToGain = modIncrease * forceTrainingCount;

    swseLogger.log(`SWSE | Wisdom increase: Gain ${forcePowersToGain} Force Power(s) or additional uses`);

    ui.notifications?.info(
      `Wisdom modifier increased! Gain ${forcePowersToGain} Force Power(s) or additional uses.`,
      { permanent: false }
    );

    // Store pending selections in flags
    const currentPending = actor.getFlag('foundryvtt-swse', 'pendingAttributeGains') || {};
    currentPending.forcePowers = (currentPending.forcePowers || 0) + forcePowersToGain;

    await actor.setFlag('foundryvtt-swse', 'pendingAttributeGains', currentPending);

    // Emit hook for UI to handle selections
    Hooks.call('swse:wisdomIncreased', {
      actor,
      forcePowersToGain,
      forceTrainingCount
    });
  }

  /**
   * Handle Constitution modifier increase
   * Grants: HP equal to heroic level
   */
  static async _handleConstitutionIncrease(actor, modIncrease) {
    if (modIncrease <= 0) {return;}

    // Droids don't have Constitution, skip HP gain
    const isDroid = actor.system.isDroid || false;
    if (isDroid) {
      swseLogger.log('SWSE | Constitution increase: Skipped for droid (no CON)');
      return;
    }

    // Get heroic level (character levels, not including non-heroic levels)
    const heroicLevel = this._getHeroicLevel(actor);
    const hpGain = modIncrease * heroicLevel;

    if (hpGain <= 0) {
      swseLogger.log('SWSE | Constitution increase: No heroic levels, no HP gained');
      return;
    }

    swseLogger.log(`SWSE | Constitution increase: Gain ${hpGain} HP (${modIncrease} × ${heroicLevel} heroic levels)`);

    // Apply HP increase
    const currentMaxHP = actor.system?.attributes?.hp?.max || 0;
    const newMaxHP = currentMaxHP + hpGain;

    // PHASE 3: Route through ActorEngine
    await ActorEngine.updateActor(actor, {
      'system.attributes.hp.max': newMaxHP
    });

    ui.notifications?.info(
      `Constitution modifier increased! Gained ${hpGain} maximum HP.`,
      { permanent: false }
    );

    Hooks.call('swse:constitutionIncreased', {
      actor,
      hpGain,
      heroicLevel,
      modIncrease
    });
  }

  /**
   * Get the character's heroic level (sum of character class levels)
   */
  static _getHeroicLevel(actor) {
    const progression = actor.system?.progression || {};
    const classLevels = progression.classLevels || [];

    // Sum all class levels (excluding non-heroic classes if you have them)
    return classLevels.reduce((total, classLevel) => {
      return total + (classLevel.level || 0);
    }, 0);
  }

  /**
   * Check for pending attribute gains that need player selection
   */
  static async checkPendingGains(actor) {
    const pending = actor.getFlag('foundryvtt-swse', 'pendingAttributeGains') || {};

    if (pending.trainedSkills > 0 || pending.languages > 0 || pending.forcePowers > 0) {
      swseLogger.log('SWSE | Pending attribute gains detected:', pending);
      Hooks.call('swse:pendingAttributeGains', { actor, pending });
      return true;
    }

    return false;
  }

  /**
   * Clear pending gains after player makes selections
   */
  static async clearPendingGains(actor, type = null) {
    const pending = actor.getFlag('foundryvtt-swse', 'pendingAttributeGains') || {};

    if (type) {
      delete pending[type];
      await actor.setFlag('foundryvtt-swse', 'pendingAttributeGains', pending);
    } else {
      await actor.unsetFlag('foundryvtt-swse', 'pendingAttributeGains');
    }
  }
}
