/**
 * Class Feat Registry
 *
 * Resolves class bonus feat pools from the class-owned feat_choice.list key first.
 * The legacy feat-side system.bonus_feat_for tag remains a fallback/diagnostic path,
 * but it is not the primary authority for class bonus feat membership.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { loadClassData } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js";

const CLASS_FEAT_LIST_BINDINGS_PATH = 'systems/foundryvtt-swse/data/generated/class-feat-list-bindings.json';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getLevelProgression(classData) {
  if (Array.isArray(classData?.levelProgression)) return classData.levelProgression;
  if (Array.isArray(classData?.levelProgressionArray)) return classData.levelProgressionArray;
  if (Array.isArray(classData?._raw?.level_progression)) return classData._raw.level_progression;
  if (Array.isArray(classData?.system?.level_progression)) return classData.system.level_progression;
  return [];
}

function getFeatureListKey(feature) {
  if (!feature || typeof feature !== 'object') return null;

  const type = normalizeKey(feature.type || feature.featureType || feature.kind);
  const name = normalizeKey(feature.name || feature.feature || '');
  if (type !== 'feat_choice' && !name.includes('bonus feat')) return null;

  const listKey = String(feature.list || feature.optionsList || feature.choiceList || '').trim();
  return listKey || null;
}

export class ClassFeatRegistry {
  // Cache: class lookup key set -> [feat IDs]
  static _bonusFeatsCache = new Map();

  // Cache: all feats from compendium (loaded once)
  static _featsLoaded = false;
  static _allFeatsData = [];

  // Cache: class-owned list bindings loaded from data/generated/class-feat-list-bindings.json
  static _listBindingsLoaded = false;
  static _listBindings = new Map();

  /**
   * Get all allowed bonus feats for a given class lookup key set.
   *
   * Primary path:
   *   class -> level_progression feat_choice.list -> generated class-feat list binding -> feat IDs
   * Fallback path:
   *   feat.system.bonus_feat_for contains one of the class lookup keys
   *
   * @param {string|string[]} classKeyOrKeys - Class id/source id/name/list key lookup values
   * @returns {Promise<Array<string>>} Array of feat IDs allowed for this class bonus
   */
  static async getClassBonusFeats(classKeyOrKeys) {
    const lookupKeys = Array.isArray(classKeyOrKeys)
      ? classKeyOrKeys.map(value => String(value).trim()).filter(Boolean)
      : [String(classKeyOrKeys || '').trim()].filter(Boolean);

    if (lookupKeys.length === 0) {
      return [];
    }

    const cacheKey = lookupKeys.slice().sort().join('|');
    if (this._bonusFeatsCache.has(cacheKey)) {
      return this._bonusFeatsCache.get(cacheKey);
    }

    if (!this._featsLoaded) {
      await this._loadFeatsCache();
    }
    if (!this._listBindingsLoaded) {
      await this._loadListBindings();
    }

    const classOwnedFeats = await this._getClassOwnedBonusFeats(lookupKeys);
    const bonusFeats = classOwnedFeats.length > 0
      ? classOwnedFeats
      : this._getLegacyFeatSideBonusFeats(lookupKeys);

    this._bonusFeatsCache.set(cacheKey, bonusFeats);

    SWSELogger.log(
      `[ClassFeatRegistry] Found ${bonusFeats.length} bonus feats for class keys ${lookupKeys.join(', ')} ` +
      `via ${classOwnedFeats.length > 0 ? 'class-owned list' : 'legacy feat-side fallback'}`
    );

    return bonusFeats;
  }

  /**
   * Check if a feat is allowed for a class bonus slot.
   * @param {string} featId - Feat ID to check
   * @param {string|string[]} classId - Class ID or lookup keys
   * @returns {Promise<boolean>} True if feat is allowed
   */
  static async isFeatsAllowedForClass(featId, classId) {
    const allowed = await this.getClassBonusFeats(classId);
    return allowed.includes(featId);
  }

  static async _getClassOwnedBonusFeats(lookupKeys) {
    const listKeys = await this._resolveClassOwnedListKeys(lookupKeys);
    if (!listKeys.length) return [];

    const featIds = [];
    for (const listKey of listKeys) {
      const binding = this._listBindings.get(normalizeKey(listKey));
      if (!binding) {
        SWSELogger.warn(`[ClassFeatRegistry] Class-owned feat list "${listKey}" has no generated binding`);
        continue;
      }
      featIds.push(...(binding.featIds || []));
    }

    return unique(featIds);
  }

  static async _resolveClassOwnedListKeys(lookupKeys) {
    const lookupSet = new Set(lookupKeys.map(normalizeKey));
    const directListKeys = lookupKeys.filter(key => this._listBindings.has(normalizeKey(key)));

    const listKeys = [...directListKeys];

    try {
      const classCache = await loadClassData();
      const visitedClassIds = new Set();

      for (const classData of classCache.values()) {
        const classKeys = [
          classData?.id,
          classData?._id,
          classData?.sourceId,
          classData?.name,
          classData?.className,
          classData?.system?.class_name,
          classData?._canonical?.id,
          classData?._canonical?.sourceId,
          classData?._canonical?.name
        ].map(normalizeKey).filter(Boolean);

        if (!classKeys.some(key => lookupSet.has(key))) continue;

        const stableClassId = classData?.id || classData?.sourceId || classData?.name;
        if (stableClassId && visitedClassIds.has(stableClassId)) continue;
        if (stableClassId) visitedClassIds.add(stableClassId);

        for (const levelEntry of getLevelProgression(classData)) {
          for (const feature of (levelEntry?.features || [])) {
            const listKey = getFeatureListKey(feature);
            if (listKey) listKeys.push(listKey);
          }
        }
      }
    } catch (err) {
      SWSELogger.warn('[ClassFeatRegistry] Failed to resolve class-owned feat list keys; legacy fallback will be used', err);
    }

    return unique(listKeys);
  }

  static _getLegacyFeatSideBonusFeats(lookupKeys) {
    const lookupSet = new Set(lookupKeys.map(normalizeKey));

    return this._allFeatsData
      .filter(feat => {
        const bonusFor = feat.system?.bonus_feat_for || [];
        const values = Array.isArray(bonusFor) ? bonusFor : [bonusFor];
        return values.some(value => lookupSet.has(normalizeKey(value)));
      })
      .map(feat => feat._id);
  }

  /**
   * Load and cache all feats from registry.
   * @private
   */
  static async _loadFeatsCache() {
    try {
      this._allFeatsData = (FeatRegistry.getAll?.() || []).map((entry) => ({
        _id: entry.id,
        id: entry.id,
        name: entry.name,
        type: 'feat',
        system: entry.system || {}
      }));
      this._featsLoaded = true;

      SWSELogger.log(
        `[ClassFeatRegistry] Loaded ${this._allFeatsData.length} feats from registry`
      );
    } catch (err) {
      SWSELogger.error('[ClassFeatRegistry] Failed to load feats cache:', err);
      this._featsLoaded = true;
    }
  }

  static async _loadListBindings() {
    try {
      const response = await fetch(CLASS_FEAT_LIST_BINDINGS_PATH);
      if (!response?.ok) {
        throw new Error(`HTTP ${response?.status || 'unknown'}`);
      }
      const payload = await response.json();
      const lists = payload?.lists || {};
      this._listBindings = new Map(
        Object.entries(lists).map(([key, value]) => [normalizeKey(key), value])
      );
      SWSELogger.log(`[ClassFeatRegistry] Loaded ${this._listBindings.size} class-owned feat list bindings`);
    } catch (err) {
      this._listBindings = new Map();
      SWSELogger.warn('[ClassFeatRegistry] Failed to load class-owned feat list bindings; legacy feat-side fallback remains active', err);
    } finally {
      this._listBindingsLoaded = true;
    }
  }

  /**
   * Clear caches (useful for testing or after compendium updates)
   * @static
   */
  static clearCaches() {
    this._bonusFeatsCache.clear();
    this._featsLoaded = false;
    this._allFeatsData = [];
    this._listBindingsLoaded = false;
    this._listBindings = new Map();
    SWSELogger.log('[ClassFeatRegistry] Caches cleared');
  }
}

export default ClassFeatRegistry;
