import { normalizeRestriction } from '/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js';

const WEIGHT_TO_OBJECT_SIZE = [
  { max: 0.999, size: 'fine' },
  { max: 1.999, size: 'diminutive' },
  { max: 4.999, size: 'tiny' },
  { max: 49.999, size: 'small' },
  { max: 499.999, size: 'medium' },
  { max: 4999.999, size: 'large' },
  { max: 49999.999, size: 'huge' },
  { max: 499999.999, size: 'gargantuan' },
  { max: Number.POSITIVE_INFINITY, size: 'colossal' }
];

const NORMALIZED_SIZES = new Set(['fine','diminutive','tiny','small','medium','large','huge','gargantuan','colossal']);
const NORMALIZED_ARMOR_CLASSES = new Set(['light','medium','heavy','shield']);

function normalizeLower(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

function parseNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export class ItemProfileResolver {
  getNormalizedProfile(item) {
    if (!item) {
      return {
        error: 'item_missing',
        itemId: null,
        itemName: 'Unknown Item',
        category: 'unknown',
        customizable: false,
        warnings: ['Item is missing']
      };
    }

    const customization = item.flags?.['foundryvtt-swse']?.customization ?? {};
    const category = this._resolveCategory(item);
    const baseCostMeta = this._resolveBaseCost(item);
    const weight = parseNonNegativeNumber(item.system?.weight, 0);
    const explicitSize = this._normalizeSize(item.system?.size);
    const objectSize = this._resolveObjectSize(item, explicitSize, weight);
    const weaponSubtype = this._resolveWeaponSubtype(item);
    const weaponSize = this._resolveWeaponSize(item, explicitSize);
    const armorWeightClass = this._resolveArmorWeightClass(item);

    return {
      itemId: item.id,
      itemName: item.name ?? 'Unnamed Item',
      category,
      weaponSubtype,
      weaponSize,
      armorWeightClass,
      objectSize,
      explicitSize,
      weight,
      baseCost: baseCostMeta.value,
      baseCostWarning: baseCostMeta.warning,
      customizable: this._isCustomizableCategory(category),
      stockSlotOverride: customization?.overrides?.stockSlotOverride ?? null,
      restriction: normalizeRestriction(item.system?.restriction),
      hasExistingCustomization: Object.keys(customization).length > 0,
      existingState: customization,
      traits: {
        hasDamage: this._checkDamageStrippable(item, category),
        hasRange: this._checkRangeStrippable(item, category, weaponSubtype),
        hasDesign: this._checkDesignStrippable(item, category),
        hasStunSetting: this._resolveStunSetting(item),
        hasAutofire: this._resolveAutofire(item),
        isExotic: !!(item.system?.isExotic || item.system?.weaponCategory === 'exotic'),
        isPoweredArmor: this._resolvePoweredArmor(item),
        armorWeightClass,
        rare: normalizeLower(item.system?.availability) === 'rare'
      },
      warnings: [baseCostMeta.warning].filter(Boolean)
    };
  }

  _resolveCategory(item) {
    const type = normalizeLower(item?.type);
    const subtype = normalizeLower(item?.system?.weaponSubtype || item?.system?.weaponType);
    if (type === 'lightsaber' || subtype === 'lightsaber') return 'lightsaber';
    if (type === 'blaster') return 'blaster';
    if (type === 'weapon') return 'weapon';
    if (type === 'armor' || type === 'bodysuit') return 'armor';
    if (type === 'gear' || type === 'equipment') return 'gear';
    if (type === 'droid') return 'droid';
    return 'unknown';
  }

  _isCustomizableCategory(category) {
    return ['weapon', 'blaster', 'armor', 'gear'].includes(category);
  }

  _normalizeSize(value) {
    const normalized = normalizeLower(value, '');
    return NORMALIZED_SIZES.has(normalized) ? normalized : null;
  }

  _resolveObjectSize(item, explicitSize, weight) {
    if (explicitSize) return explicitSize;
    for (const band of WEIGHT_TO_OBJECT_SIZE) {
      if (weight <= band.max) return band.size;
    }
    return 'tiny';
  }

  _resolveWeaponSubtype(item) {
    const raw = normalizeLower(item?.system?.weaponSubtype || item?.system?.weaponType);
    if (raw) return raw;
    const range = normalizeLower(item?.system?.range);
    if (item?.type === 'blaster') return 'ranged_energy';
    if (range && range !== 'melee') return 'ranged_generic';
    const damageType = normalizeLower(item?.system?.damageType);
    if (damageType === 'energy') return 'melee_energy';
    return item?.type === 'weapon' ? 'melee_generic' : null;
  }

  _resolveWeaponSize(item, explicitSize) {
    if (!['weapon', 'blaster'].includes(normalizeLower(item?.type))) return null;
    const raw = this._normalizeSize(item?.system?.weaponSize);
    return raw || explicitSize || 'medium';
  }

  _resolveArmorWeightClass(item) {
    if (!['armor', 'bodysuit'].includes(normalizeLower(item?.type))) return null;
    const raw = normalizeLower(item?.system?.armorType || item?.system?.weightClass, 'light');
    return NORMALIZED_ARMOR_CLASSES.has(raw) ? raw : 'light';
  }

  _resolveBaseCost(item) {
    const raw = item?.system?.cost;
    const parsed = Number(raw);
    if (raw === undefined || raw === null || raw === '') {
      return { value: 0, warning: 'base_cost_missing' };
    }
    if (!Number.isFinite(parsed)) {
      return { value: 0, warning: 'base_cost_invalid' };
    }
    if (parsed < 0) {
      return { value: 0, warning: 'base_cost_negative_clamped' };
    }
    return { value: parsed, warning: null };
  }

  _resolveStunSetting(item) {
    return !!(item?.system?.stun || item?.system?.properties?.includes?.('stun') || item?.system?.mode === 'stun');
  }

  _resolveAutofire(item) {
    return !!(item?.system?.autofire || item?.system?.properties?.includes?.('autofire') || item?.system?.fireMode === 'autofire');
  }

  _resolvePoweredArmor(item) {
    if (!['armor', 'bodysuit'].includes(normalizeLower(item?.type))) return false;
    const explicit = item?.system?.isPoweredArmor;
    if (typeof explicit === 'boolean') return explicit;
    return /power/i.test(String(item?.name ?? ''));
  }

  _checkDamageStrippable(item, category) {
    return ['weapon', 'blaster'].includes(category) && !!item?.system?.damage;
  }

  _checkRangeStrippable(item, category, weaponSubtype) {
    if (!['weapon', 'blaster'].includes(category)) return false;
    if (category === 'blaster') return true;
    const range = normalizeLower(item?.system?.range);
    return weaponSubtype?.includes?.('ranged') || (!!range && range !== 'melee');
  }

  _checkDesignStrippable(item, category) {
    if (!['weapon', 'blaster'].includes(category)) return false;
    const isExotic = !!(item?.system?.isExotic || item?.system?.weaponCategory === 'exotic');
    if (isExotic) return false;
    if (category === 'blaster') return true;
    return true;
  }
}
