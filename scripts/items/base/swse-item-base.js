/**
 * Base Item Class for SWSE System
 * Extends Foundry's Item class with SWSE-specific functionality
 */

import { getWeaponRangeInfo } from '../weapon-ranges.js';

export class SWSEItemBase extends Item {
  
  /**
   * Prepare derived data for the item
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Ensure weight is always a valid finite number
    const typesWithWeight = ['weapon', 'armor', 'equipment'];
    if (typesWithWeight.includes(this.type)) {
      const weight = this.system?.weight;
      if (!Number.isFinite(weight) || weight < 0) {
        this.system.weight = 1;
      }
    }

    // Item type-specific preparation
    switch (this.type) {
      case 'weapon':
        this._prepareWeaponData();
        break;
      case 'armor':
        this._prepareArmorData();
        break;
      case 'feat':
        this._prepareFeatData();
        break;
      case 'talent':
        this._prepareTalentData();
        break;
      case 'forcepower':
        this._prepareForcePowerData();
        break;
    }
  }

  /**
   * Prepare weapon-specific data
   * @private
   */
  _prepareWeaponData() {
    const data = this.system;

    // Get weapon range information based on weapon type
    const rangeInfo = getWeaponRangeInfo(this);

    // Store range brackets for use in combat
    data.rangeInfo = rangeInfo;

    // If range is just a simple string (like "Melee" or a single number),
    // replace it with the formatted range string
    if (rangeInfo.type !== 'melee' && rangeInfo.brackets) {
      data.rangeFormatted = rangeInfo.rangeString;
      data.rangeBrackets = rangeInfo.brackets;
    }

    // Apply weapon range multiplier from houserules
    if (game.settings && game.settings.get) {
      const multiplier = game.settings.get('foundryvtt-swse', 'weaponRangeMultiplier') || 1.0;
      if (data.range?.value) {
        data.range.modified = Math.round(data.range.value * multiplier);
      }
    }
  }

  /**
   * Prepare armor-specific data
   * @private
   */
  _prepareArmorData() {
    const data = this.system;
    
    // Calculate total armor bonus (reflex defense bonus)
    if (data.armorBonus !== undefined && data.equipBonus !== undefined) {
      data.totalBonus = (data.armorBonus || 0) + (data.equipBonus || 0);
    }
  }

  /**
   * Prepare feat-specific data
   * @private
   */
  _prepareFeatData() {
    // Feat data preparation if needed
  }

  /**
   * Prepare talent-specific data
   * @private
   */
  _prepareTalentData() {
    // Talent data preparation if needed
  }

  /**
   * Prepare force power-specific data
   * @private
   */
  _prepareForcePowerData() {
    // Force power data preparation if needed
  }

  /**
   * Get item chat data for display
   * @returns {Object} Chat data object
   */
  getChatData() {
    const data = this.system;
    const labels = {};

    // Weapon labels
    if (this.type === 'weapon') {
      labels.damage = data.damage || '';
      labels.range = data.range?.value || 'Melee';
      labels.type = data.weaponType || 'Simple';
    }

    // Armor labels
    if (this.type === 'armor') {
      labels.bonus = `+${data.armorBonus || 0}`;
      labels.type = data.armorType || 'Light';
      labels.maxDex = data.maxDexBonus !== undefined ? data.maxDexBonus : '∞';
    }

    // Force power labels
    if (this.type === 'forcepower') {
      labels.level = data.level || 1;
      labels.darkSide = data.darkSide ? 'Dark Side' : '';
    }

    return {
      ...data,
      labels
    };
  }

  /**
   * Roll the item (attack, activation, etc.)
   * @param {Object} options - Roll options
   * @returns {Promise<Roll|null>}
   */
  async roll(options = {}) {
    if (!this.actor) {
      ui.notifications.warn("This item must be owned by an actor to be rolled.");
      return null;
    }

    switch (this.type) {
      case 'weapon':
        return this._rollWeapon(options);
      case 'forcepower':
        return this._rollForcePower(options);
      default:
        return this._displayInChat();
    }
  }

  /**
   * Roll weapon attack
   * @private
   */
  async _rollWeapon(options = {}) {
    if (!this.actor.rollAttack) {
      ui.notifications.error("Actor does not have rollAttack method.");
      return null;
    }

    return this.actor.rollAttack(this, options);
  }

  /**
   * Roll force power
   * @private
   */
  async _rollForcePower(options = {}) {
    const data = this.system;
    
    // Create chat message for force power use
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.name} (Force Power)`,
      content: `
        <div class="swse force-power-card">
          <h3>${this.name}</h3>
          <p><strong>Level:</strong> ${data.level || 1}</p>
          ${data.darkSide ? '<p><em>Dark Side Power</em></p>' : ''}
          <p>${data.description || ''}</p>
        </div>
      `
    };

    return ChatMessage.create(messageData);
  }

  /**
   * Display item in chat
   * @private
   */
  async _displayInChat() {
    const chatData = this.getChatData();
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: this.name,
      content: `
        <div class="swse item-card">
          <h3>${this.name}</h3>
          <p>${this.system.description || ''}</p>
        </div>
      `
    };

    return ChatMessage.create(messageData);
  }

  /**
   * Handle item updates
   * @param {Object} changed - Changed data
   * @param {Object} options - Update options
   * @param {string} userId - User ID making the update
   * @override
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    
    // Trigger actor recalculation if this item affects stats
    if (this.actor && this._affectsActorStats(changed)) {
      this.actor.prepareData();
    }
  }

  /**
   * Check if item update affects actor stats
   * @private
   */
  _affectsActorStats(changed) {
    // Items that affect stats when equipped/updated
    const statAffectingTypes = ['armor', 'species', 'class', 'feat', 'talent'];
    
    if (!statAffectingTypes.includes(this.type)) return false;
    
    // Check if equipped state changed
    if (changed.system?.equipped !== undefined) return true;
    
    // Check if bonuses changed
    if (changed.system?.bonuses !== undefined) return true;
    if (changed.system?.armorBonus !== undefined) return true;
    
    return false;
  }

  /**
   * Get roll data for this item
   * @returns {Object}
   */
  getRollData() {
    const rollData = { ...this.system };
    
    // Add actor data if available
    if (this.actor) {
      rollData.actor = this.actor.getRollData();
    }
    
    return rollData;
  }
}