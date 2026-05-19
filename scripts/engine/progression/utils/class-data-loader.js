/**
 * Class Data Loader
 *
 * PHASE 2C: Migration to Canonical ClassModel
 *
 * This module loads class data through the canonical SSOT normalizer and adapts it
 * for legacy progression/derived consumers.
 *
 * Important startup hardening:
 * Foundry can prepare actor documents before system registries finish building.
 * Derived calculators may ask for class data during that window. This loader must
 * never cache an empty result just because ClassesRegistry is not ready yet.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeClass } from "/systems/foundryvtt-swse/scripts/data/class-normalizer.js";
import { adaptClassForLoaderCompatibility } from "/systems/foundryvtt-swse/scripts/data/adapters/ClassModelAdapters.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";

/** @type {Map<string, Object>|null} */
let classDataCache = null;
let loadPromise = null;
let warnedUnavailable = false;

function _cacheKey(name) {
  return String(name || '').trim().toLowerCase();
}

function _isCanonicalClassModel(entry) {
  return !!entry && !entry.system && Array.isArray(entry.levelProgression) && typeof entry.name === 'string';
}

function _storeClass(cache, classData) {
  if (!classData?.name) {
    return;
  }

  // Keep the display-name key for older callers and a lower-case key for robust lookup.
  cache.set(classData.name, classData);
  cache.set(_cacheKey(classData.name), classData);
}

function _adaptEntryForLoader(entry) {
  const canonicalModel = _isCanonicalClassModel(entry) ? entry : normalizeClass(entry);
  const classData = adaptClassForLoaderCompatibility(canonicalModel);

  // Belt-and-suspenders for legacy derived calculators. The adapter also sets
  // these fields, but keeping them here protects older repo snapshots or future
  // adapter drift.
  classData.babProgression = canonicalModel.babProgression;
  classData.levelProgressionArray = canonicalModel.levelProgression || [];
  classData._raw = {
    ...(classData._raw || {}),
    level_progression: canonicalModel.levelProgression || []
  };
  classData._canonical = canonicalModel;

  return classData;
}

async function _loadDirectlyFromPack() {
  const systemId = game?.system?.id || 'foundryvtt-swse';
  const packKey = `${systemId}.classes`;
  const pack = game?.packs?.get(packKey) || game?.packs?.get('foundryvtt-swse.classes');

  if (!pack) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      swseLogger.warn(`[CLASS-DATA-LOADER] Classes pack not available yet (${packKey}); class cache not populated`);
    }
    return [];
  }

  // Use getIndex instead of getDocuments. Foundry can safely return indexed
  // compendium data during early setup without instantiating custom Item sheets.
  const index = await pack.getIndex({ fields: ['system', 'name', 'img'] });
  return Array.from(index || []);
}

/**
 * Load all class data from compendium/registry.
 * @returns {Promise<Map<string, Object>>} Map of class name / normalized name to class data
 */
export async function loadClassData() {
  if (classDataCache && classDataCache.size > 0) {
    swseLogger.log(`[CLASS-DATA-LOADER] Returning cached class data: ${classDataCache.size} keys`);
    return classDataCache;
  }

  if (loadPromise) {
    swseLogger.log('[CLASS-DATA-LOADER] Load already in progress, waiting...');
    return loadPromise;
  }

  swseLogger.log('[CLASS-DATA-LOADER] Starting fresh class data load...');
  loadPromise = _loadFromCompendium();

  try {
    const loaded = await loadPromise;

    // Do not poison the cache with an empty map during Foundry startup. A later
    // registry/pack pass should be allowed to populate class data successfully.
    if (loaded.size > 0) {
      classDataCache = loaded;
      swseLogger.log(`[CLASS-DATA-LOADER] Load complete with ${classDataCache.size} keys`);
      return classDataCache;
    }

    swseLogger.warn('[CLASS-DATA-LOADER] Load returned no classes; leaving cache empty for retry');
    return loaded;
  } finally {
    loadPromise = null;
  }
}

/**
 * Load class data from canonical registry or directly from foundryvtt-swse.classes.
 * Uses canonical SSOT normalizer, adapted for loader compatibility.
 * @private
 */
async function _loadFromCompendium() {
  const cache = new Map();
  const errors = [];

  try {
    let entries = [];
    let source = 'unknown';

    if (ClassesRegistry.isInitialized()) {
      entries = ClassesRegistry.getAll() || [];
      source = 'ClassesRegistry';
      swseLogger.log(`[CLASS-DATA-LOADER] Loading from initialized ClassesRegistry (${entries.length} classes)`);
    }

    if (!entries.length) {
      source = 'classes pack index';
      swseLogger.log('[CLASS-DATA-LOADER] ClassesRegistry not ready; loading directly from classes pack index');
      entries = await _loadDirectlyFromPack();
    }

    if (!entries.length) {
      swseLogger.warn('[CLASS-DATA-LOADER] No class entries available from registry or pack index');
      return cache;
    }

    swseLogger.log(`[CLASS-DATA-LOADER] Loaded ${entries.length} class entries from ${source}`);

    for (const entry of entries) {
      try {
        const classData = _adaptEntryForLoader(entry);
        _storeClass(cache, classData);
      } catch (normalizeErr) {
        errors.push({ class: entry?.name || entry?._id || 'unknown', error: normalizeErr.message });
        swseLogger.error(`[CLASS-DATA-LOADER] Error normalizing class "${entry?.name || entry?._id || 'unknown'}": ${normalizeErr.message}`, normalizeErr);
      }
    }

    swseLogger.log(`[CLASS-DATA-LOADER] Normalization complete. ${cache.size} lookup keys created for ${entries.length} classes`);

    if (errors.length > 0) {
      swseLogger.warn(`[CLASS-DATA-LOADER] ${errors.length} class(es) had normalization issues`, errors);
      if (game?.ready) {
        ui.notifications?.warn(`${errors.length} classes had loading issues. Check console for details.`);
      }
    }
  } catch (err) {
    swseLogger.error('[CLASS-DATA-LOADER] Critical error in _loadFromCompendium:', err);
    swseLogger.error('[CLASS-DATA-LOADER] Error stack:', err.stack);
    if (game?.ready) {
      ui.notifications?.error('Failed to load class data. Character progression may not work correctly.', { permanent: true });
    }
  }

  swseLogger.log(`[CLASS-DATA-LOADER] Returning cache with ${cache.size} keys`);
  return cache;
}

/**
 * Get class data for a specific class.
 * @param {string} className - Name of the class
 * @returns {Promise<Object|null>} Class data or null if not found
 */
export async function getClassData(className) {
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Looking for class "${className}"`);
  const cache = await loadClassData();
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Cache loaded with ${cache.size} keys`);

  const classData = cache.get(className) || cache.get(_cacheKey(className));

  if (!classData) {
    swseLogger.error(`[CLASS-DATA-LOADER] Class not found: "${className}". Available classes:`, Array.from(cache.keys()).filter(k => k && !String(k).includes(' ')).slice(0, 50));
    return null;
  }

  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Successfully retrieved class "${className}"`, classData);
  return classData;
}

/**
 * Invalidate cache (force reload on next access).
 */
export function invalidateClassDataCache() {
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Clearing cache');
  classDataCache = null;
  loadPromise = null;
  warnedUnavailable = false;
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Cache cleared successfully');
}

/**
 * Check if cache is populated.
 * @returns {boolean}
 */
export function isClassDataCached() {
  const isCached = classDataCache !== null && classDataCache.size > 0;
  swseLogger.log(`[CLASS-DATA-LOADER] isClassDataCached: ${isCached}, size: ${isCached ? classDataCache.size : 0}`);
  return isCached;
}
