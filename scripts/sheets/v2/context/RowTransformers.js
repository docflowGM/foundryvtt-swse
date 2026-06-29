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

function asTextList(...values) {
  const out = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      out.push(...value.map((entry) => safeText(entry)).filter(Boolean));
    } else if (value && typeof value === 'object') {
      out.push(...Object.values(value).map((entry) => safeText(entry)).filter(Boolean));
    } else {
      const text = safeText(value);
      if (text) out.push(text);
    }
  }
  return out;
}

function isNaturalWeaponItem(item) {
  const system = item?.system ?? {};
  const swseFlags = item?.flags?.swse ?? {};

  if (swseFlags.isNaturalWeapon === true || swseFlags.alwaysArmed === true) return true;

  const naturalFields = asTextList(
    system.category,
    system.subcategory,
    system.proficiency,
    system.weaponCategory,
    system.weaponType,
    system.source
  );
  if (naturalFields.some((value) => value.toLowerCase() === 'natural')) return true;

  const descriptors = asTextList(system.properties, system.traits, system.tags);
  return descriptors.some((value) => /natural\s+weapon/i.test(value));
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
  static _rowCache = new Map();
  static _rowCacheOrder = [];
  static _rowCacheMax = 600;

  static _duplicateRow(row) {
    try {
      if (typeof foundry?.utils?.duplicate === 'function') return foundry.utils.duplicate(row);
    } catch (_err) {
      // fall through
    }
    try {
      return structuredClone(row);
    } catch (_err) {
      try {
        return JSON.parse(JSON.stringify(row));
      } catch (_jsonErr) {
        return row;
      }
    }
  }

  static _itemRevisionSignature(item) {
    if (!item) return 'no-item';
    const actor = item.actor ?? null;
    const actorRevision = actor?._stats?.modifiedTime
      ?? actor?._source?._stats?.modifiedTime
      ?? actor?.system?._version
      ?? '';
    const itemRevision = item?._stats?.modifiedTime
      ?? item?._source?._stats?.modifiedTime
      ?? item?.system?._version
      ?? '';
    return [
      actor?.id ?? actor?._id ?? '',
      actorRevision,
      item?.id ?? item?._id ?? '',
      item?.uuid ?? '',
      item?.type ?? '',
      itemRevision,
      item?.name ?? '',
      item?.img ?? '',
      item?.system?.equipped ?? '',
      item?.system?.quantity ?? '',
      item?.system?.uses?.value ?? '',
      item?.system?.ammo?.value ?? item?.system?.ammunition?.value ?? '',
      item?.system?.activated ?? item?.system?.active ?? '',
      item?.flags?.swse?.equipped ?? '',
      item?.flags?.swse?.autoEquipped ?? '',
      item?.flags?.swse?.isNaturalWeapon ?? ''
    ].join('::');
  }

  static _buildRowCacheKey(kind, item, isEditable = false) {
    return [kind, isEditable === true ? 'editable' : 'readonly', this._itemRevisionSignature(item)].join('||');
  }

  static _getCachedRow(kind, item, isEditable = false) {
    const key = this._buildRowCacheKey(kind, item, isEditable);
    const row = this._rowCache.get(key);
    return row ? this._duplicateRow(row) : null;
  }

  static _storeCachedRow(kind, item, isEditable = false, row = null) {
    if (!row) return row;
    const key = this._buildRowCacheKey(kind, item, isEditable);
    this._rowCache.set(key, this._duplicateRow(row));
    const existing = this._rowCacheOrder.indexOf(key);
    if (existing >= 0) this._rowCacheOrder.splice(existing, 1);
    this._rowCacheOrder.push(key);
    while (this._rowCacheOrder.length > this._rowCacheMax) {
      const stale = this._rowCacheOrder.shift();
      if (stale) this._rowCache.delete(stale);
    }
    return this._duplicateRow(row);
  }

  static clearRowCache() {
    this._rowCache.clear();
    this._rowCacheOrder.length = 0;
  }
  /**
   * Transform an item into a generic inventory ledger row
   * PHASE 5: Include natural weapons as auto-equipped
   */
  static toInventoryRow(item, isEditable) {
    const cached = this._getCachedRow('inventory', item, isEditable);
    if (cached) return cached;

    // Natural weapons are always armed, but class starter equipment that carries
    // flags.swse.autoEquipped remains a normal item that can be unequipped.
    // Keep this in sync with combat attack hydration: the Gear tab and Combat tab
    // must agree about what is equipped/readied/active.
    const truthy = (value) => {
      if (value === true || Number(value) === 1) return true;
      if (value && typeof value === 'object') {
        return truthy(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
      }
      return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active', 'natural'].includes(String(value || '').toLowerCase());
    };
    const isNaturalWeapon = isNaturalWeaponItem(item);
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
      || (isNaturalWeapon && truthy(item.flags?.swse?.autoEquipped))
      || isNaturalWeapon;

    const row = {
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
      canToggleEquip: !isNaturalWeapon,
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
    return this._storeCachedRow('inventory', item, isEditable, row);
  }

  /**
   * Transform armor item into summary display
   */
  static toArmorSummaryRow(item) {
    const cached = this._getCachedRow('armor-summary', item, false);
    if (cached) return cached;
    const armor = resolveArmorData(item);
    const row = {
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
    return this._storeCachedRow('armor-summary', item, false, row);
  }

  /**
   * Transform a talent item into a ledger row
   */
  static toTalentRow(item, isEditable) {
    const cached = this._getCachedRow('talent', item, isEditable);
    if (cached) return cached;
    const tree = safeText(item.system?.tree ?? item.system?.talentTree ?? item.system?.talent_tree, 'General');

    const row = {
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
    return this._storeCachedRow('talent', item, isEditable, row);
  }

  /**
   * Transform a feat item into a ledger row
   */
  static toFeatRow(item, isEditable) {
    const cached = this._getCachedRow('feat', item, isEditable);
    if (cached) return cached;
    const row = {
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
    return this._storeCachedRow('feat', item, isEditable, row);
  }

  /**
   * Transform a maneuver item into a ledger row
   */
  static toManeuverRow(item, isEditable) {
    const cached = this._getCachedRow('maneuver', item, isEditable);
    if (cached) return cached;
    const row = {
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
    return this._storeCachedRow('maneuver', item, isEditable, row);
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
