/**
 * LocalizationFormatters
 *
 * Provide localized display formatting for normalized panel context values.
 * Consumes pre-normalized context objects (not raw items, actor, system data).
 *
 * Each formatter:
 * - Takes normalized values from panel context
 * - Returns localized, display-ready strings
 * - Handles number formatting, text translation, and unit conversion
 * - Integrates with game.i18n system when available
 *
 * Usage in partials:
 * {{LocalizationFormatters.formatWeight healthPanel.totalWeight}}
 * {{LocalizationFormatters.formatConditionLabel slot.label}}
 */

export class LocalizationFormatters {
  /**
   * Format weight value with unit (lbs, kg, etc.)
   * @param {number} weight - Weight in system units
   * @returns {string} Formatted weight string
   */
  static formatWeight(weight) {
    const num = Number(weight) || 0;
    const unit = game.i18n?.localize('SWSE.UNITS.WEIGHT') || 'lbs';
    return `${num.toFixed(1)} ${unit}`;
  }

  /**
   * Format HP display as "current / max"
   * @param {number} current - Current HP
   * @param {number} max - Maximum HP
   * @returns {string} Formatted HP string
   */
  static formatHP(current, max) {
    return `${Number(current) || 0} / ${Number(max) || 1}`;
  }

  /**
   * Format defense total with modifier breakdown
   * @param {number} total - Total defense value
   * @param {number} armor - Armor bonus component
   * @param {number} ability - Ability modifier component
   * @param {number} classBonus - Class feature component
   * @returns {string} Formatted breakdown (optional, mainly for tooltips)
   */
  static formatDefenseBreakdown(total, armor = 0, ability = 0, classBonus = 0) {
    const parts = ['10'];
    if (armor !== 0) parts.push(`A${armor >= 0 ? '+' : ''}${armor}`);
    if (ability !== 0) parts.push(`Abil${ability >= 0 ? '+' : ''}${ability}`);
    if (classBonus !== 0) parts.push(`C${classBonus >= 0 ? '+' : ''}${classBonus}`);
    return parts.join(' ');
  }

  /**
   * Format health state label with localization
   * @param {string} stateLabel - State label key or text ("Healthy", "Wounded", etc.)
   * @returns {string} Localized health state
   */
  static formatHealthState(stateLabel) {
    const key = `SWSE.HEALTH.STATE.${stateLabel.toUpperCase()}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : stateLabel;
  }

  /**
   * Format condition level label
   * @param {number} step - Condition step (0-5)
   * @param {string} label - Default label
   * @returns {string} Localized condition label
   */
  static formatConditionLabel(step, label) {
    const key = `SWSE.CONDITION.LEVEL.${step}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : label;
  }

  /**
   * Format quantity display (singular/plural)
   * @param {number} qty - Quantity
   * @param {string} itemName - Item name for pluralization
   * @returns {string} Formatted quantity string
   */
  static formatQuantity(qty, itemName = '') {
    const q = Number(qty) || 1;
    if (q === 1) return itemName || '1 item';
    return `${q} ${itemName}${itemName && !itemName.endsWith('s') ? 's' : ''}`;
  }

  /**
   * Format rarity with color/styling cues
   * @param {string} rarity - Rarity level (common, uncommon, rare, artifact, etc.)
   * @returns {string} Localized rarity label
   */
  static formatRarity(rarity) {
    const key = `SWSE.RARITY.${rarity?.toUpperCase() || 'COMMON'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : rarity || 'Common';
  }

  /**
   * Format item type label
   * @param {string} type - Item type (weapon, equipment, armor, talent, feat, etc.)
   * @returns {string} Localized type label
   */
  static formatItemType(type) {
    const key = `SWSE.ITEM.TYPE.${type?.toUpperCase() || 'ITEM'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : (type?.charAt(0).toUpperCase() + type?.slice(1) || 'Item');
  }

  /**
   * Format talent tree/group label
   * @param {string} tree - Talent tree name
   * @returns {string} Localized tree label
   */
  static formatTalentTree(tree) {
    const key = `SWSE.TALENT.TREE.${tree?.toUpperCase().replace(/\s/g, '_') || 'GENERAL'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : tree || 'General';
  }

  /**
   * Format feat category label
   * @param {string} category - Feat category
   * @returns {string} Localized category label
   */
  static formatFeatCategory(category) {
    const key = `SWSE.FEAT.CATEGORY.${category?.toUpperCase().replace(/\s/g, '_') || 'GENERAL'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : category || 'General';
  }

  /**
   * Format maneuver action type
   * @param {string} actionType - Action type (standard, move, free, reaction, etc.)
   * @returns {string} Localized action type
   */
  static formatActionType(actionType) {
    const key = `SWSE.ACTION.TYPE.${actionType?.toUpperCase() || 'STANDARD'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : actionType || 'Standard';
  }

  /**
   * Format difficulty check
   * @param {string} difficulty - Difficulty string (e.g. "DC 15")
   * @returns {string} Localized difficulty
   */
  static formatDifficulty(difficulty) {
    // Simple format check for "DC NN"
    const match = difficulty?.match(/^DC\s*(\d+)$/i);
    if (match) {
      const dcLabel = game.i18n?.localize('SWSE.DIFFICULTY.LABEL') || 'DC';
      return `${dcLabel} ${match[1]}`;
    }
    return difficulty || 'DC 15';
  }

  /**
   * Format modifier sign (+/-/blank for 0)
   * @param {number} mod - Modifier value
   * @returns {string} Formatted modifier with sign
   */
  static formatModifier(mod) {
    const m = Number(mod) || 0;
    if (m === 0) return '0';
    return m > 0 ? `+${m}` : `${m}`;
  }

  /**
   * Format armor type label
   * @param {string} armorType - Armor type (Light Armor, Medium Armor, Heavy Armor, Power Suit)
   * @returns {string} Localized armor type
   */
  static formatArmorType(armorType) {
    const key = `SWSE.ARMOR.TYPE.${armorType?.toUpperCase().replace(/\s/g, '_') || 'LIGHT'}`;
    return game.i18n?.has(key) ? game.i18n.localize(key) : armorType || 'Light Armor';
  }

  /**
   * Format item cost/value
   * @param {number} value - Item value in credits
   * @returns {string} Formatted currency string
   */
  static formatCurrency(value) {
    const val = Number(value) || 0;
    const symbol = game.i18n?.localize('SWSE.CURRENCY.SYMBOL') || 'cr';
    return `${val} ${symbol}`;
  }

  /**
   * Format ability modifier with label
   * @param {number} mod - Modifier value
   * @param {string} abilityName - Ability short code (str, dex, con, etc.)
   * @returns {string} Formatted ability modifier
   */
  static formatAbilityMod(mod, abilityName = 'Abil') {
    const m = this.formatModifier(mod);
    const label = game.i18n?.localize(`SWSE.ABILITY.${abilityName?.toUpperCase()}`) || abilityName;
    return `${label} ${m}`;
  }

  /**
   * Format tag list for display
   * @param {Array<string>} tags - Array of tag strings
   * @returns {string} Comma-separated, localized tags
   */
  static formatTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return '';
    return tags.map(tag => {
      const key = `SWSE.TAG.${tag?.toUpperCase()}`;
      return game.i18n?.has(key) ? game.i18n.localize(key) : tag;
    }).join(', ');
  }

  /**
   * Format shield rating display
   * @param {number} max - Maximum shield rating
   * @param {number} current - Current shield remaining
   * @returns {string} Formatted shield display
   */
  static formatShield(max, current) {
    if (max <= 0) return 'None';
    const c = Number(current) || 0;
    const m = Number(max) || 0;
    return `${c}/${m}`;
  }

  /**
   * Format damage reduction
   * @param {number} value - DR value
   * @returns {string} Formatted DR string
   */
  static formatDamageReduction(value) {
    const v = Number(value) || 0;
    if (v <= 0) return 'None';
    return `${v}`;
  }
}
