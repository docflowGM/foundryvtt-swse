/**
 * FEAT REGISTRY
 * Progression-facing facade over the canonical FeatRegistry.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";
import { loadFeatBucketsMapping, normalizeFeatRuntime, normalizeFeatTypeKey, resolveFeatBonusFeatFor } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-shape.js";
import { FeatRegistry as CanonicalFeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { isTalentOnlyFeatContaminant } from "/systems/foundryvtt-swse/scripts/data/feat-domain-guard.js";

const CANONICAL_FEAT_DISPLAY_NAMES = new Map([
  ['point blank shot', 'Point-Blank Shot'],
]);

function normalizeFeatRegistryKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreFeatCompleteness(feat) {
  const system = feat?.system || {};
  const modifiers = Array.isArray(system?.abilityMeta?.modifiers) ? system.abilityMeta.modifiers.length : 0;
  const bonusFeatFor = Array.isArray(system?.bonus_feat_for) ? system.bonus_feat_for.length : 0;
  const tags = Array.isArray(system?.tags) ? system.tags.length : 0;
  const descriptionLength = String(system?.description?.value || system?.description || feat?.description || '').length;
  return (modifiers * 100) + (bonusFeatFor * 25) + tags + Math.min(descriptionLength, 250) / 250;
}

function preferFeatEntry(existing, candidate) {
  if (!existing) return candidate;
  if (!candidate) return existing;
  return scoreFeatCompleteness(candidate) > scoreFeatCompleteness(existing) ? candidate : existing;
}

function applyCanonicalDisplayName(feat) {
  const key = normalizeFeatRegistryKey(feat?.name);
  const displayName = CANONICAL_FEAT_DISPLAY_NAMES.get(key);
  return displayName ? { ...feat, name: displayName } : feat;
}

export const FeatRegistry = {
  feats: new Map(),
  _byKey: new Map(),
  isBuilt: false,

  async build() {
    try {
      await CanonicalFeatRegistry.initialize?.();
      const mapping = await loadFeatBucketsMapping();
      this.feats.clear();
      this._byKey.clear();

      let skippedTalentContaminants = 0;
      for (const entry of CanonicalFeatRegistry.getAll?.() || []) {
        if (isTalentOnlyFeatContaminant(entry)) {
          skippedTalentContaminants += 1;
          continue;
        }
        const docLike = {
          ...entry,
          _id: entry.id,
          id: entry.id,
          type: 'feat',
          system: entry.system || {
            featType: entry.category,
            tags: entry.tags,
            prerequisites: entry.prerequisites?.raw,
            description: entry.description,
            source: entry.source,
          },
        };
        const normalizedFeat = applyCanonicalDisplayName(normalizeFeatRuntime(docLike, { mapping }));
        const registryKey = normalizeFeatRegistryKey(normalizedFeat.name) || normalizedFeat.name.toLowerCase();
        const preferredFeat = preferFeatEntry(this.feats.get(registryKey), normalizedFeat);
        this.feats.set(registryKey, preferredFeat);
        const key = entry.system?.key ?? toStableKey(normalizedFeat.name);
        if (key) this._byKey.set(key, normalizedFeat);
      }

      this.isBuilt = true;
      if (skippedTalentContaminants > 0) {
        SWSELogger.warn(`[FeatRegistry] Skipped ${skippedTalentContaminants} talent-only contaminant rows while building progression feat registry.`);
      }
      SWSELogger.log(`FeatRegistry built: ${this.feats.size} feats loaded from canonical registry`);
      return true;
    } catch (err) {
      SWSELogger.error('Failed to build FeatRegistry:', err);
      return false;
    }
  },

  get(name) { return name ? this.feats.get(normalizeFeatRegistryKey(name) || String(name).toLowerCase()) ?? null : null; },
  byKey(key) { return key ? this._byKey.get(key) ?? null : null; },
  has(name) { return !!name && this.feats.has(normalizeFeatRegistryKey(name) || String(name).toLowerCase()); },
  list() { return Array.from(this.feats.values()); },
  count() { return this.feats.size; },
  getByType(featType) { const normalized = normalizeFeatTypeKey(featType); return this.list().filter((feat) => feat.featType === normalized); },
  getNames() { return this.list().map((feat) => feat.name); },
  getBonusFeats() { return this.list().filter((feat) => feat.bonusFeatFor.length > 0); },
  canBeBonusFeatFor(featDoc, className) { return resolveFeatBonusFeatFor(featDoc).includes(className); },
  async rebuild() { this.feats.clear(); this._byKey.clear(); this.isBuilt = false; return this.build(); },
  getStatus() { return { isBuilt: this.isBuilt, count: this.feats.size, feats: this.getNames() }; }
};

export default FeatRegistry;
