/**
 * FEAT REGISTRY
 * Progression-facing facade over the canonical FeatRegistry.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";
import { loadFeatBucketsMapping, normalizeFeatRuntime, normalizeFeatTypeKey, resolveFeatBonusFeatFor } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-shape.js";
import { FeatRegistry as CanonicalFeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";

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

      for (const entry of CanonicalFeatRegistry.getAll?.() || []) {
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
        const normalizedFeat = normalizeFeatRuntime(docLike, { mapping });
        this.feats.set(normalizedFeat.name.toLowerCase(), normalizedFeat);
        const key = entry.system?.key ?? toStableKey(normalizedFeat.name);
        if (key) this._byKey.set(key, normalizedFeat);
      }

      this.isBuilt = true;
      SWSELogger.log(`FeatRegistry built: ${this.feats.size} feats loaded from canonical registry`);
      return true;
    } catch (err) {
      SWSELogger.error('Failed to build FeatRegistry:', err);
      return false;
    }
  },

  get(name) { return name ? this.feats.get(String(name).toLowerCase()) ?? null : null; },
  byKey(key) { return key ? this._byKey.get(key) ?? null : null; },
  has(name) { return !!name && this.feats.has(String(name).toLowerCase()); },
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
