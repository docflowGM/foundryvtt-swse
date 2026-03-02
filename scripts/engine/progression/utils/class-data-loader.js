/**
 * Class Data Loader
 *
 * PHASE 2C: Migration to Canonical ClassModel
 *
 * This module now loads class data through the canonical SSOT normalizer
 * and adapts it for progression engine consumption.
 *
 * Entry point: getClassData(className) → Loader-compatible format
 *
 * This bridges old loader-dependent code to the canonical model without
 * requiring immediate refactoring of all consumers.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeClass } from "/systems/foundryvtt-swse/scripts/data/class-normalizer.js";
import { adaptClassForLoaderCompatibility } from "/systems/foundryvtt-swse/scripts/data/adapters/ClassModelAdapters.js";

/**
 * Cache for loaded class data
 * @type {Map<string, Object>}
 */
let classDataCache = null;
let loadPromise = null;

/**
 * Load all class data from compendium
 * @returns {Promise<Map<string, Object>>} Map of class name to class data
 */
export async function loadClassData() {
  // Return cached data if available
  if (classDataCache) {
    swseLogger.log(`[CLASS-DATA-LOADER] Returning cached class data: ${classDataCache.size} classes`);
    return classDataCache;
  }

  // If already loading, wait for that promise
  if (loadPromise) {
    swseLogger.log('[CLASS-DATA-LOADER] Load already in progress, waiting...');
    return loadPromise;
  }

  // Start loading
  swseLogger.log('[CLASS-DATA-LOADER] Starting fresh class data load...');
  loadPromise = _loadFromCompendium();

  try {
    classDataCache = await loadPromise;
    swseLogger.log(`[CLASS-DATA-LOADER] Load complete with ${classDataCache.size} classes`);
    return classDataCache;
  } finally {
    loadPromise = null;
  }
}

/**
 * Load class data from foundryvtt-swse.classes compendium
 * Uses canonical SSOT normalizer, adapted for loader compatibility
 * @private
 */
async function _loadFromCompendium() {
  const cache = new Map();
  const errors = [];

  try {
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Attempting to load from registry...');

    if (!ClassesRegistry.isInitialized()) {
      const errorMsg = 'Class Data Loader: ClassesRegistry not initialized!';
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errorMsg}`);
      ui.notifications?.error(`${errorMsg} Character progression features will not work correctly. Please ensure the SWSE system is properly installed.`, { permanent: true });
      return cache;
    }

    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Fetching classes from registry...');
    const docs = ClassesRegistry.getAll();
    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Retrieved ${docs ? docs.length : 'null/undefined'} documents`);

    if (!docs || docs.length === 0) {
      const errorMsg = 'Class Data Loader: Classes compendium is empty!';
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errorMsg}`);
      ui.notifications?.error(`${errorMsg} No classes available for character creation.`, { permanent: true });
      return cache;
    }

    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Loaded ${docs.length} raw documents from compendium`);
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Class names:', docs.map(d => d.name));

    for (const doc of docs) {
      try {
        swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Processing class "${doc.name}"...`);

        // Phase 2C: Use canonical SSOT normalizer
        const canonicalModel = normalizeClass(doc);

        // Adapt for loader compatibility (maintains backward compatibility)
        const classData = adaptClassForLoaderCompatibility(canonicalModel);

        cache.set(doc.name, classData);
        swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Successfully normalized "${doc.name}" via canonical model`);
      } catch (normalizeErr) {
        errors.push({ class: doc.name, error: normalizeErr.message });
        swseLogger.error(`[CLASS-DATA-LOADER] ERROR normalizing class "${doc.name}": ${normalizeErr.message}`, normalizeErr);
      }
    }

    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Normalization complete. ${cache.size}/${docs.length} classes successfully loaded`);
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Successfully normalized classes:', Array.from(cache.keys()));

    // Report normalization errors if any occurred
    if (errors.length > 0) {
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errors.length} class(es) had normalization issues:`, errors);
      if (errors.length <= 3) {
        ui.notifications?.warn(`Some classes may not work correctly: ${errors.map(e => e.class).join(', ')}`);
      } else {
        ui.notifications?.warn(`${errors.length} classes had loading issues. Check console for details.`);
      }
    }

  } catch (err) {
    swseLogger.error('[CLASS-DATA-LOADER] CRITICAL ERROR in _loadFromCompendium:', err);
    swseLogger.error('[CLASS-DATA-LOADER] Error stack:', err.stack);
    ui.notifications?.error('Failed to load class data. Character progression may not work correctly.', { permanent: true });
  }

  swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Returning cache with ${cache.size} classes`);
  return cache;
}

/**
 * DEPRECATED: _normalizeClassData
 *
 * This function has been replaced by the canonical ClassModel + adapter pattern.
 *
 * Previously:
 * - Raw compendium doc → custom schema with duplicated logic
 * - Inferred prestigeClass/forceSensitive locally
 * - Converted BAB terminology locally
 * - Built object keyed by level
 *
 * Now (Phase 2C):
 * - Raw doc → normalizeClass(doc) → ClassModel (canonical)
 * - adaptClassForLoaderCompatibility(model) → same output
 * - All inference logic now in SSOT normalizer
 * - All adaption logic centralized in adapters
 *
 * This keeps old consumers working while moving logic to canonical layer.
 */

/**
 * Get class data for a specific class
 * @param {string} className - Name of the class
 * @returns {Promise<Object|null>} Class data or null if not found
 */
export async function getClassData(className) {
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Looking for class "${className}"`);
  const cache = await loadClassData();
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Cache loaded with ${cache.size} classes`);
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Available classes:`, Array.from(cache.keys()));

  const classData = cache.get(className);

  if (!classData) {
    swseLogger.error(`[CLASS-DATA-LOADER] ERROR: Class not found: "${className}". Available classes:`, Array.from(cache.keys()));
    return null;
  }

  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Successfully retrieved class "${className}"`, classData);
  return classData;
}

/**
 * Invalidate cache (force reload on next access)
 */
export function invalidateClassDataCache() {
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Clearing cache');
  swseLogger.log(`[CLASS-DATA-LOADER] invalidateClassDataCache: Was cached: ${classDataCache !== null}, Load in progress: ${loadPromise !== null}`);
  classDataCache = null;
  loadPromise = null;
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Cache cleared successfully');
}

/**
 * Check if cache is populated
 * @returns {boolean}
 */
export function isClassDataCached() {
  const isCached = classDataCache !== null;
  swseLogger.log(`[CLASS-DATA-LOADER] isClassDataCached: ${isCached}, size: ${isCached ? classDataCache.size : 0}`);
  return isCached;
}
