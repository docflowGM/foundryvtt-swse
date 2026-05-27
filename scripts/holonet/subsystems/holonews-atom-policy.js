/**
 * GM controls for the atomized HoloNews wire generator.
 *
 * This does not mutate the generator pools. It stores campaign suppression
 * policy that filters generated stories at the GM desk and auto-publisher.
 */

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'holonewsAtomPolicy';

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

export class HolonewsAtomPolicy {
  static SETTING_KEY = SETTING_KEY;

  static defaultPolicy() {
    return {
      disabledCategories: [],
      disabledSectors: [],
      disabledPriorities: [],
      blockedAtomIds: [],
      blockedKeywords: [],
      updatedAt: null
    };
  }

  static normalize(raw = {}) {
    const base = this.defaultPolicy();
    return {
      ...base,
      ...(raw && typeof raw === 'object' ? raw : {}),
      disabledCategories: uniqueStrings(raw.disabledCategories),
      disabledSectors: uniqueStrings(raw.disabledSectors),
      disabledPriorities: uniqueStrings(raw.disabledPriorities),
      blockedAtomIds: uniqueStrings(raw.blockedAtomIds),
      blockedKeywords: uniqueStrings(raw.blockedKeywords),
      updatedAt: raw.updatedAt || null
    };
  }

  static async getPolicy() {
    let raw = {};
    try {
      raw = await game.settings.get(SYSTEM_ID, SETTING_KEY) ?? {};
    } catch (err) {
      console.warn('[HolonewsAtomPolicy] Could not read atom policy:', err);
    }
    return this.normalize(raw);
  }

  static async savePolicy(patch = {}) {
    if (!game.user?.isGM) return this.getPolicy();
    const previous = await this.getPolicy();
    const next = this.normalize({ ...previous, ...patch, updatedAt: new Date().toISOString() });
    await game.settings.set(SYSTEM_ID, SETTING_KEY, next);
    return next;
  }

  static async resetPolicy() {
    if (!game.user?.isGM) return this.getPolicy();
    const next = this.normalize({ updatedAt: new Date().toISOString() });
    await game.settings.set(SYSTEM_ID, SETTING_KEY, next);
    return next;
  }

  static toGeneratorFilters(policy = {}) {
    const normalized = this.normalize(policy);
    return {
      excludeCategories: normalized.disabledCategories,
      excludeSectors: normalized.disabledSectors,
      excludePriorities: normalized.disabledPriorities,
      excludeAtomIds: normalized.blockedAtomIds,
      excludeKeywords: normalized.blockedKeywords
    };
  }

  static summary(policy = {}) {
    const normalized = this.normalize(policy);
    return {
      disabledCategoryCount: normalized.disabledCategories.length,
      disabledSectorCount: normalized.disabledSectors.length,
      disabledPriorityCount: normalized.disabledPriorities.length,
      blockedAtomCount: normalized.blockedAtomIds.length,
      blockedKeywordCount: normalized.blockedKeywords.length,
      hasSuppression: Boolean(
        normalized.disabledCategories.length ||
        normalized.disabledSectors.length ||
        normalized.disabledPriorities.length ||
        normalized.blockedAtomIds.length ||
        normalized.blockedKeywords.length
      )
    };
  }
}
