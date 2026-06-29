/**
 * CompendiumResolver
 *
 * Resolves pack+id references from a (domain, name) input.
 * This is used to make suggestions and templates drift-safe.
 *
 * This module performs read-only lookups.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { BackgroundRegistry } from "/systems/foundryvtt-swse/scripts/registries/background-registry.js";

function _norm(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ');
}

export class CompendiumResolver {
  static _indexCache = new Map(); // packName -> Map(normName -> {id,name})
  static _resolveCache = new Map(); // domain|packName|normName -> resolved reference
  static _resolveCacheOrder = [];
  static _resolveCacheMax = 500;
  static _packMap = null; // domain -> packName

  static initializeFromSystemJSON(systemJSON) {
    try {
      const packMap = {};
      for (const p of systemJSON?.packs ?? []) {
        const collection = `${p.system}.${p.name}`;
        // Domain heuristics by pack "name"
        const n = String(p.name || '').toLowerCase();
        if (n === 'feats') {packMap.feat = collection;}
        if (n === 'talents') {packMap.talent = collection;}
        if (n === 'forcepowers') {packMap.forcepowers = collection;}
        if (n === 'classes') {packMap.class = collection;}
        if (n === 'species') {packMap.species = collection;}
        if (n === 'backgrounds') {packMap.background = collection;}
      }
      this._packMap = packMap;
      SWSELogger.log('[CompendiumResolver] Initialized pack map:', packMap);
    } catch (err) {
      SWSELogger.error('[CompendiumResolver] Failed to initialize pack map:', err);
      this._packMap = {};
    }
  }

  static async _getNameIndex(packName) {
    if (!packName) {return null;}
    if (this._indexCache.has(packName)) {return this._indexCache.get(packName);}

    const pack = game.packs.get(packName);
    if (!pack) {return null;}

    const index = await pack.getIndex();
    const map = new Map();
    for (const e of index) {
      if (!e?.name || !e?._id) {continue;}
      map.set(_norm(e.name), { id: e._id, name: e.name });
    }
    this._indexCache.set(packName, map);
    return map;
  }

  static _resolveCacheKey({ domain, name, packName = null }) {
    return [String(domain || '').trim().toLowerCase(), String(packName || '').trim(), _norm(name)].join('|');
  }

  static _getResolvedFromCache(cacheKey) {
    if (!cacheKey || !this._resolveCache.has(cacheKey)) return undefined;
    const value = this._resolveCache.get(cacheKey);
    return value ? { ...value } : null;
  }

  static _setResolvedCache(cacheKey, value) {
    if (!cacheKey) return value;
    this._resolveCache.set(cacheKey, value ? { ...value } : null);
    const existing = this._resolveCacheOrder.indexOf(cacheKey);
    if (existing >= 0) this._resolveCacheOrder.splice(existing, 1);
    this._resolveCacheOrder.push(cacheKey);
    while (this._resolveCacheOrder.length > this._resolveCacheMax) {
      const stale = this._resolveCacheOrder.shift();
      if (stale) this._resolveCache.delete(stale);
    }
    return value;
  }

  static clearCaches() {
    this._indexCache.clear();
    this._resolveCache.clear();
    this._resolveCacheOrder.length = 0;
  }

  static async resolveByName({ domain, name, packName = null }) {
    if (!name) {return null;}

    const normalized = _norm(name);
    const cacheKey = this._resolveCacheKey({ domain, name, packName });
    const cached = this._getResolvedFromCache(cacheKey);
    if (cached !== undefined) return cached;

    const registryEntry = (() => {
      switch (domain) {
        case 'feat':
          return FeatRegistry.getByName?.(name);
        case 'talent':
          return TalentRegistry.getByName?.(name);
        case 'forcepowers':
          return ForceRegistry.getByName?.(name);
        case 'class':
          return ClassesRegistry.getByName?.(name);
        case 'species':
          return SpeciesRegistry.getByName?.(name);
        default:
          return null;
      }
    })();

    if (registryEntry?.id || registryEntry?.sourceId) {
      return this._setResolvedCache(cacheKey, {
        pack: registryEntry.pack || packName || this._packMap?.[domain] || null,
        id: registryEntry.id || registryEntry.sourceId,
        name: registryEntry.name || name
      });
    }

    if (domain === 'background') {
      const bg = await BackgroundRegistry.getByName?.(name);
      if (bg?._id || bg?.id) {
        return this._setResolvedCache(cacheKey, {
          pack: bg.pack || packName || this._packMap?.[domain] || null,
          id: bg._id || bg.id,
          name: bg.name || name
        });
      }
    }

    const resolvedPack = packName || this._packMap?.[domain] || null;
    if (!resolvedPack) {return this._setResolvedCache(cacheKey, null);}

    const idx = await this._getNameIndex(resolvedPack);
    if (!idx) {return this._setResolvedCache(cacheKey, null);}

    const hit = idx.get(normalized);
    if (!hit) {return this._setResolvedCache(cacheKey, null);}

    return this._setResolvedCache(cacheKey, {
      pack: resolvedPack,
      id: hit.id,
      name: hit.name
    });
  }
}
