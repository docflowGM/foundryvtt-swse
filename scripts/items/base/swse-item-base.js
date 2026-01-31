/**
 * Base Item Class for SWSE System
 * Extends Foundry's Item class with SWSE-specific functionality
 *
 * v2 contract:
 * - Items are passive data documents.
 * - Items do not mutate actors, perform rolls, or post chat output.
 * - Actors and engines interpret item data and produce outcomes.
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
   * Use this item.
   *
   * Items do not roll or post chat output in v2. This delegates to the owning actor.
   * @param {Object} options - Use options
   * @returns {Promise<any>}
   */
  async roll(options = {}) {
    if (!this.actor) {
      ui.notifications.warn('This item must be owned by an actor to be used.');
      return null;
    }

    if (typeof this.actor.useItem !== 'function') {
      ui.notifications.warn('This actor cannot use items yet.');
      return null;
    }

    return this.actor.useItem(this, options);
  }

  /**
   * Get roll data for this item
   * @returns {Object}
   */
  getRollData() {
    const rollData = { ...this.system };
    
    // Add actor data if available
    if (this.actor) {
      rollData.actor = this.actor.getRollData?.() ?? {};
    }
    
    return rollData;
  }
}