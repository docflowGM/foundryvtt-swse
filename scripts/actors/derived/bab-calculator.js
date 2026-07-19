/**
 * BAB Calculator — Derived Layer
 *
 * Base Attack Bonus calculation from class levels.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula: Sum of BAB from each class at its current level.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isClassDataAuthorityReady } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-readiness.js";

const NONHEROIC_BAB_PROGRESSION = [
  0, 1, 2, 3, 3, 4, 5, 6, 6, 7,
  8, 9, 9, 10, 11, 12, 12, 13, 14, 15
];

export class BABCalculator {
  static _babCache = new Map();
  static _babCacheOrder = [];
  static _babCacheMax = 160;
  static _classDataLoaderPromise = null;
  static _startupDeferralLogged = false;

  static clearCaches() {
    this._babCache.clear();
    this._babCacheOrder.length = 0;
  }

  static _rememberBab(key, value) {
    if (!key) return;
    this._babCache.set(key, value);
    const existing = this._babCacheOrder.indexOf(key);
    if (existing >= 0) this._babCacheOrder.splice(existing, 1);
    this._babCacheOrder.push(key);
    while (this._babCacheOrder.length > this._babCacheMax) {
      const stale = this._babCacheOrder.shift();
      if (stale) this._babCache.delete(stale);
    }
  }

  static _classLevelsSignature(classLevels = [], adjustment = 0) {
    if (!Array.isArray(classLevels) || classLevels.length === 0) return null;
    const levels = classLevels
      .map(entry => [
        String(entry?.class || '').trim().toLowerCase(),
        Number(entry?.level || 1) || 1
      ])
      .filter(([className]) => !!className)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([className, level]) => `${className}:${level}`)
      .join('|');
    if (!levels) return null;
    return `${levels}|adj:${Number(adjustment) || 0}`;
  }

  static async _getClassDataLoader() {
    if (!this._classDataLoaderPromise) {
      this._classDataLoaderPromise = import("/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js");
    }
    return this._classDataLoaderPromise;
  }

  static _requiresClassAuthority(classLevels = []) {
    return Array.isArray(classLevels) && classLevels.some(entry => {
      const className = String(entry?.class || '').trim().toLowerCase();
      return className && className !== 'nonheroic';
    });
  }

  static _startupSafeBab(classLevels = [], adjustment = 0) {
    let total = Number(adjustment) || 0;
    for (const entry of classLevels) {
      const className = String(entry?.class || '').trim().toLowerCase();
      if (className !== 'nonheroic') continue;
      const level = Math.max(1, Number(entry?.level || 1) || 1);
      total += NONHEROIC_BAB_PROGRESSION[Math.min(level, NONHEROIC_BAB_PROGRESSION.length) - 1] ?? 0;
    }
    return total;
  }

  static _resolveLevelProgression(classData) {
    if (Array.isArray(classData?._raw?.level_progression)) return classData._raw.level_progression;
    if (Array.isArray(classData?.levelProgressionArray)) return classData.levelProgressionArray;
    if (Array.isArray(classData?._canonical?.levelProgression)) return classData._canonical.levelProgression;
    if (Array.isArray(classData?.levelProgression)) return classData.levelProgression;

    if (classData?.levelProgression && typeof classData.levelProgression === 'object') {
      return Object.entries(classData.levelProgression)
        .map(([level, value]) => ({ level: Number(level), ...(value || {}) }))
        .sort((a, b) => (a.level || 0) - (b.level || 0));
    }

    return [];
  }

  static _estimateBabFromProgression(classData, level) {
    const rate = classData?.babProgression || classData?.baseAttackBonus;
    if (!rate || !Number.isFinite(level) || level <= 0) return null;
    if (rate === 'fast' || rate === 'high') return level;
    if (rate === 'slow' || rate === 'medium' || rate === 'low') return Math.floor(level * 0.75);
    return null;
  }

  /**
   * Calculate total BAB from class levels.
   *
   * Foundry prepares actors before the ready hook and before compendium-backed
   * registries are guaranteed to exist. Waiting for a ready-phase hook from
   * prepareDerivedData deadlocks startup, so that early pass must be nonblocking.
   * SystemInitHooks performs authoritative actor reconciliation after registries
   * initialize, at which point this method uses exact class progression data.
   */
  static async calculate(classLevels, options = {}) {
    if (!classLevels || classLevels.length === 0) return 0;

    const adjustment = Number(options?.adjustment || 0) || 0;
    const cacheKey = this._classLevelsSignature(classLevels, adjustment);
    if (cacheKey && this._babCache.has(cacheKey)) return this._babCache.get(cacheKey);

    if (this._requiresClassAuthority(classLevels) && !isClassDataAuthorityReady()) {
      if (!this._startupDeferralLogged) {
        this._startupDeferralLogged = true;
        swseLogger.debug('[BABCalculator] Deferring heroic BAB authority during initializeDocuments; authoritative recalculation will run after progression initialization.');
      }
      return this._startupSafeBab(classLevels, adjustment);
    }

    const { getClassData } = await this._getClassDataLoader();
    let totalBAB = 0;

    for (const classLevel of classLevels) {
      const classData = await getClassData(classLevel.class);
      if (!classData) {
        throw new Error(
          `BABCalculator: Unknown class "${classLevel.class}". ` +
          `Verify class exists in compendium or hardcoded progression data.`
        );
      }

      const levelsInClass = classLevel.level || 1;
      if (classData.isNonheroic === true) {
        if (levelsInClass > 0 && levelsInClass <= NONHEROIC_BAB_PROGRESSION.length) {
          totalBAB += NONHEROIC_BAB_PROGRESSION[levelsInClass - 1];
        }
        continue;
      }

      const levelProgression = this._resolveLevelProgression(classData);
      if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
        const finalLevelData = levelProgression[levelsInClass - 1];
        if (Number.isFinite(Number(finalLevelData?.bab))) {
          totalBAB += Number(finalLevelData.bab);
          continue;
        }
      }

      const estimatedBab = this._estimateBabFromProgression(classData, levelsInClass);
      if (estimatedBab !== null) {
        swseLogger.warn(
          `[BABCalculator] Estimated BAB for "${classLevel.class}" level ${levelsInClass} because exact level_progression data was unavailable`
        );
        totalBAB += estimatedBab;
        continue;
      }

      throw new Error(
        `BABCalculator: Class "${classLevel.class}" has no usable level_progression data. ` +
        `Verify class definition includes level progression.`
      );
    }

    const result = totalBAB + adjustment;
    if (cacheKey) this._rememberBab(cacheKey, result);
    return result;
  }
}
