/**
 * RowTransformers
 *
 * Shared functions to normalize collection rows (inventory, talents, feats, maneuvers)
 * into consistent shapes before Handlebars rendering.
 *
 * Every row gets the same contract:
 * - id, name, img, type, label, value, tags
 * - canEdit, canDelete
 * - cssClass, statusClass (for styling)
 * - type-specific extended fields
 *
 * This prevents partials from guessing fallback paths or inventing custom
 * data shapes for each ledger.
 */

export class RowTransformers {
  /**
   * Transform an item into a generic inventory ledger row
   * PHASE 5: Include natural weapons as auto-equipped
   */
  static toInventoryRow(item, isEditable) {
    // PHASE 5: Natural weapons with autoEquipped flag are always equipped
    const isNaturalWeapon = item.flags?.swse?.autoEquipped === true;
    const equipped = Boolean(item.system?.equipped) || isNaturalWeapon;

    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Item',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: item.type,
      typeLabel: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      label: item.name,
      value: item.system?.value || 0,
      quantity: Number(item.system?.quantity) || 1,
      weight: Number(item.system?.weight) || 0,
      rarity: item.system?.rarity || 'common',
      equipped,
      isNaturalWeapon,
      tags: this._extractTags(item),
      cssClass: [
        `item-${item.type}`,
        equipped ? 'equipped' : 'unequipped',
        isNaturalWeapon ? 'natural-weapon' : '',
        item.system?.rarity ? `rarity-${item.system.rarity}` : ''
      ].filter(Boolean).join(' '),
      canEdit: isEditable,
      canDelete: isEditable
    };
  }

  /**
   * Transform armor item into summary display
   */
  static toArmorSummaryRow(item) {
    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Armor',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'armor',
      armorType: item.system?.armorType || 'Light Armor',
      weight: Number(item.system?.weight) || 0,
      isPowered: Boolean(item.system?.isPowered),
      upgradeSlots: Number(item.system?.upgradeSlots) || 0,
      reflexBonus: Number(item.system?.reflex) || 0,
      fortBonus: Number(item.system?.fort) || 0,
      maxDexBonus: Number(item.system?.maxDex) || 0,
      armorCheckPenalty: Number(item.system?.acp) || 0,
      speedPenalty: Number(item.system?.speedPenalty) || 0
    };
  }

  /**
   * Transform a talent item into a ledger row
   */
  static toTalentRow(item, isEditable) {
    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Talent',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'talent',
      label: item.name,
      source: item.system?.source || 'Unknown',
      sourceType: item.system?.sourceType || 'talent',
      tree: item.system?.tree || 'General',
      group: item.system?.tree || 'General',
      cost: Number(item.system?.cost) || 1,
      prerequisites: item.system?.prerequisites || '',
      description: item.system?.description || '',
      tags: this._extractTags(item),
      cssClass: [
        'talent-row',
        item.system?.tree ? `tree-${item.system.tree.toLowerCase()}` : 'tree-general'
      ].filter(Boolean).join(' '),
      canEdit: isEditable,
      canDelete: isEditable
    };
  }

  /**
   * Transform a feat item into a ledger row
   */
  static toFeatRow(item, isEditable) {
    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Feat',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'feat',
      label: item.name,
      source: item.system?.source || 'Unknown',
      category: item.system?.category || 'General',
      requirements: item.system?.requirements || '',
      description: item.system?.description || '',
      tags: this._extractTags(item),
      cssClass: [
        'feat-row',
        item.system?.category ? `category-${item.system.category.toLowerCase()}` : 'category-general'
      ].filter(Boolean).join(' '),
      canEdit: isEditable,
      canDelete: isEditable
    };
  }

  /**
   * Transform a maneuver item into a ledger row
   */
  static toManeuverRow(item, isEditable) {
    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Maneuver',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'maneuver',
      label: item.name,
      source: item.system?.source || 'Unknown',
      difficulty: item.system?.difficulty || 'DC 15',
      actionType: item.system?.actionType || 'standard',
      description: item.system?.description || '',
      tags: this._extractTags(item),
      cssClass: [
        'maneuver-row',
        item.system?.actionType ? `action-${item.system.actionType.toLowerCase()}` : 'action-standard'
      ].filter(Boolean).join(' '),
      canEdit: isEditable,
      canDelete: isEditable
    };
  }

  /**
   * Extract tags from item (for consistent display)
   *
   * @private
   */
  static _extractTags(item) {
    const tags = [];

    if (item.system?.rare) tags.push('Rare');
    if (item.system?.unique) tags.push('Unique');
    if (item.system?.exotic) tags.push('Exotic');
    if (item.system?.restricted) tags.push('Restricted');

    return tags;
  }
}
