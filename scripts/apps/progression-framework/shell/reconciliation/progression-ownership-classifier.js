/**
 * Progression Ownership Classifier
 *
 * Phase 2 layer split for actor-wide progression reconciliation.
 * This layer answers: "What does this actor currently own, and where did it
 * probably come from?"
 *
 * This initial skeleton exposes normalized pools for report builders and future
 * remediation UI. Existing slot-filling still runs through the delegated helper
 * path during Phase 1 to avoid behavior regressions.
 */
export class ProgressionOwnershipClassifier {
  constructor({ helpers = {} } = {}) {
    this.helpers = helpers;
  }

  classify(actor, entitlementPlan = {}, _options = {}) {
    const readActorItems = this.helpers.readActorItems;
    const buildFeatPools = this.helpers.buildFeatPools;
    const buildTalentPools = this.helpers.buildTalentPools;

    const items = typeof readActorItems === 'function'
      ? readActorItems(actor)
      : Array.from(actor?.items ?? []);
    const featPools = typeof buildFeatPools === 'function'
      ? buildFeatPools(actor)
      : { general: [], class: [], unknown: [] };
    const talentPools = typeof buildTalentPools === 'function'
      ? buildTalentPools(actor)
      : { heroic: [], class: [], unknown: [] };

    const byType = items.reduce((acc, item) => {
      const type = item?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      kind: 'swse-progression-ownership-classification',
      version: 2,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel: Number(entitlementPlan?.totalLevel || 0) || 0,
      totalHeroicLevel: Number(entitlementPlan?.totalHeroicLevel || 0) || 0,
      items: {
        total: items.length,
        byType,
      },
      featPools: {
        general: this._summarizeItems(featPools.general),
        class: this._summarizeItems(featPools.class),
        unknown: this._summarizeItems(featPools.unknown),
      },
      talentPools: {
        heroic: this._summarizeItems(talentPools.heroic),
        class: this._summarizeItems(talentPools.class),
        unknown: this._summarizeItems(talentPools.unknown),
      },
      unclassified: {
        feats: this._summarizeItems(featPools.unknown),
        talents: this._summarizeItems(talentPools.unknown),
      },
      rawPools: {
        featPools,
        talentPools,
      },
      diagnostics: {
        layer: 'ownership-classifier',
        delegated: true,
        phase: 2,
        unclassifiedFeatCount: Array.isArray(featPools.unknown) ? featPools.unknown.length : 0,
        unclassifiedTalentCount: Array.isArray(talentPools.unknown) ? talentPools.unknown.length : 0,
      },
    };
  }

  _summarizeItems(items = []) {
    return (Array.isArray(items) ? items : []).map(item => ({
      id: item?.id || item?._id || null,
      name: item?.name || 'Unnamed',
      type: item?.type || 'unknown',
      slotType: item?.system?.slotType || item?.flags?.swse?.slotType || item?.flags?.swse?.progression?.slotType || '',
      source: item?.system?.source || item?.system?.sourceType || item?.flags?.swse?.source || item?.flags?.swse?.progression?.source || '',
      selectionKey: item?.flags?.swse?.progression?.selectionKey || item?.system?.progression?.selectionKey || '',
    }));
  }
}

export default ProgressionOwnershipClassifier;
