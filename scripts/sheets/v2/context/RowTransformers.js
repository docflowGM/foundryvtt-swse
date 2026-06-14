import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";


function safeNumber(value, fallback = 0) {
  let candidate = value;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    for (const key of ['value', 'current', 'total', 'amount', 'credits', 'base']) {
      if (candidate[key] !== undefined && candidate[key] !== null && candidate[key] !== '') {
        candidate = candidate[key];
        break;
      }
    }
  }
  const numeric = Number(candidate);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeText(value, fallback = '') {
  let candidate = value;
  if (Array.isArray(candidate)) {
    candidate = '';
    for (let i = value.length - 1; i >= 0; i -= 1) {
      const entry = value[i];
      if (entry !== undefined && entry !== null && String(entry).trim() !== '') {
        candidate = entry;
        break;
      }
    }
  }
  if (candidate && typeof candidate === 'object') {
    for (const key of ['label', 'name', 'value', 'id', 'slug']) {
      if (candidate[key] !== undefined && candidate[key] !== null && String(candidate[key]).trim() !== '') {
        candidate = candidate[key];
        break;
      }
    }
  }
  const text = String(candidate ?? '').trim();
  return text || fallback;
}

function cssSlug(value, fallback = 'general') {
  const text = safeText(value, fallback).toLowerCase();
  return text.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

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
    // PHASE 5: Natural weapons with autoEquipped flag are always equipped.
    // Keep this in sync with combat attack hydration: the Gear tab and Combat tab
    // must agree about what is equipped/readied/active.
    const truthy = (value) => {
      if (value === true || Number(value) === 1) return true;
      if (value && typeof value === 'object') {
        return truthy(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
      }
      return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active', 'natural'].includes(String(value || '').toLowerCase());
    };
    const isNaturalWeapon = item.flags?.swse?.autoEquipped === true;
    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor: item.actor });
    const isLightsaber = visualProfile.isLightsaber;
    const armorStats = item.type === 'armor' ? resolveArmorData(item) : null;
    const isEnergyShield = armorStats?.isEnergyShield === true;
    const canToggleActivated = isLightsaber || isEnergyShield || typeof item.system?.activated === 'boolean';
    const activated = visualProfile.active || item.system?.activated === true || item.system?.active === true || (isEnergyShield && armorStats?.activated === true);
    const equipped = truthy(item.system?.equipped)
      || truthy(item.system?.isEquipped)
      || truthy(item.system?.readied)
      || truthy(item.system?.equippable?.equipped)
      || truthy(item.flags?.swse?.equipped)
      || isNaturalWeapon;

    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Item',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: item.type,
      typeLabel: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      label: item.name,
      value: safeNumber(item.system?.value ?? item.system?.cost, 0),
      quantity: safeNumber(item.system?.quantity, 1) || 1,
      weight: safeNumber(item.system?.weight, 0),
      rarity: item.system?.rarity || 'common',
      equipped,
      activated,
      isLightsaber,
      isEnergyShield,
      shieldRating: armorStats?.shieldRating ?? safeNumber(item.system?.shieldRating, 0),
      currentSR: armorStats?.currentSR ?? safeNumber(item.system?.currentSR, 0),
      armorStats,
      canToggleActivated,
      activationLabel: activated ? "Deactivate" : "Activate",
      activationTitle: activated
        ? (isEnergyShield ? "Deactivate energy shield" : "Deactivate lightsaber blade")
        : (isEnergyShield ? "Activate energy shield" : "Activate lightsaber blade"),
      activationStateLabel: activated
        ? (isEnergyShield ? "Shield Active" : "Blade Active")
        : (isEnergyShield ? "Shield Inactive" : "Blade Inactive"),
      visualProfile,
      visualKind: visualProfile.kind,
      visualColorKey: visualProfile.primaryColor,
      visualColorHex: visualProfile.primaryHex,
      isNaturalWeapon,
      tags: this._extractTags(item),
      cssClass: [
        `item-${item.type}`,
        isLightsaber ? 'lightsaber' : '',
        activated ? 'active' : 'inactive',
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
    const armor = resolveArmorData(item);
    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Armor',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'armor',
      armorType: armor.armorTypeLabel,
      armorTypeKey: armor.armorType,
      weight: safeNumber(item.system?.weight, 0),
      isPowered: Boolean(item.system?.isPowered),
      isEnergyShield: armor.isEnergyShield,
      upgradeSlots: safeNumber(item.system?.upgradeSlots, 0),
      reflexBonus: armor.reflexBonus,
      fortBonus: armor.fortitudeBonus,
      maxDexBonus: armor.maxDexBonus,
      maxDexLabel: armor.maxDexLabel,
      armorCheckPenalty: armor.armorCheckPenalty,
      speedPenalty: armor.speedPenalty,
      shieldRating: armor.shieldRating,
      currentSR: armor.currentSR,
      armorStats: armor
    };
  }

  /**
   * Transform a talent item into a ledger row
   */
  static toTalentRow(item, isEditable) {
    const tree = safeText(item.system?.tree ?? item.system?.talentTree ?? item.system?.talent_tree, 'General');

    return {
      id: item.id,
      uuid: item.uuid,
      name: item.name || 'Unnamed Talent',
      img: item.img || '/images/icons/svg/mystery-man.svg',
      type: 'talent',
      label: item.name,
      source: safeText(item.system?.source, 'Unknown'),
      sourceType: safeText(item.system?.sourceType, 'talent'),
      tree,
      group: tree,
      cost: safeNumber(item.system?.cost, 1),
      prerequisites: safeText(item.system?.prerequisites ?? item.system?.prerequisite, ''),
      description: safeText(item.system?.description ?? item.system?.benefit, ''),
      tags: this._extractTags(item),
      cssClass: [
        'talent-row',
        `tree-${cssSlug(tree)}`
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
